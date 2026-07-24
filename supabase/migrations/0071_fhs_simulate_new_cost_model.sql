-- Migration 0071: cl-flow 2026-07-24-0213 Phase 0 — 唯讀模擬新成本模型
-- 目的：對比「現行單購/加購SKU模型」vs「新三層模型（S/P tier全費+n8n訂單層扣減）」
--       對全庫鎖匙扣/吊飾 order_items 的 subtotal 差異，供 Fat Mo 拍板 Q1/Q4 之數據依據。
-- 性質：純唯讀函式，不 INSERT/UPDATE/DELETE 任何資料，零風險。
-- 對齊先例：S124v2(migration 0045)、D40(migration 0046)、D41(migrations 0058/0059)、D42(V47.20)

CREATE OR REPLACE FUNCTION public.fhs_simulate_new_cost_model()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH parsed AS (
        SELECT
            oi.id,
            oi.order_fhs_id,
            oi.product_sku,
            oi.item_category,
            oi.quantity,
            oi.drawing_cost   AS old_drawing_cost,
            oi.printing_cost  AS old_printing_cost,
            oi.chain_cost     AS old_chain_cost,
            oi.shipping_cost  AS old_shipping_cost,
            oi.item_base_cost AS old_item_base_cost,
            oi.subtotal_cost  AS old_subtotal_cost,

            CASE
                WHEN oi.product_sku LIKE '%家庭%' THEN 'family'
                WHEN oi.product_sku LIKE '%成人%' THEN 'adult'
                WHEN oi.product_sku LIKE '%嬰兒%' OR oi.product_sku LIKE '%大寶%' THEN 'baby'
                ELSE 'unknown'
            END AS obj_tier,

            CASE
                WHEN oi.product_sku LIKE '%(P)%' THEN 'P'
                WHEN oi.product_sku LIKE '%(S)%' THEN 'S'
                WHEN EXISTS (
                    SELECT 1 FROM order_items mp
                    WHERE mp.order_fhs_id = oi.order_fhs_id
                      AND mp.item_category = '立體擺設'
                ) THEN 'S'
                ELSE 'P'
            END AS mode,

            (oi.product_sku LIKE '%單購%') AS is_old_single_purchase,

            CASE
                WHEN oi.item_category = '金屬鎖匙扣' AND oi.product_sku LIKE '%鋁合金%' THEN 'alloy'
                WHEN oi.item_category = '金屬鎖匙扣' THEN 'stainless'
                ELSE NULL
            END AS material

        FROM order_items oi
        WHERE oi.item_category IN ('金屬鎖匙扣', '純銀頸鏈吊飾')
          AND oi.product_sku NOT LIKE '%家庭%'
    ),
    priced AS (
        SELECT
            p.*,
            CASE
                WHEN p.item_category = '金屬鎖匙扣' THEN
                    (CASE WHEN p.obj_tier='adult' THEN
                        (CASE WHEN p.mode='S' THEN 110 ELSE 240 END)
                     ELSE
                        (CASE WHEN p.mode='S' THEN 60 ELSE 110 END)
                     END)
                    + (CASE WHEN p.obj_tier='adult' THEN 125 ELSE 115 END)
                    + 10
                    + 20
                WHEN p.item_category = '純銀頸鏈吊飾' THEN
                    (CASE WHEN p.obj_tier='adult' THEN
                        (CASE WHEN p.mode='S' THEN 110 ELSE 240 END)
                     ELSE
                        (CASE WHEN p.mode='S' THEN 60 ELSE 110 END)
                     END)
                    + 465
                    + 35
                ELSE NULL
            END AS new_unit_full_cost
        FROM parsed p
    ),
    computed AS (
        SELECT
            priced.*,
            (new_unit_full_cost * quantity) AS new_gross_subtotal,
            (CASE WHEN obj_tier='adult' THEN (CASE WHEN mode='S' THEN 110 ELSE 240 END)
                  ELSE (CASE WHEN mode='S' THEN 60 ELSE 110 END) END)
                * GREATEST(quantity-1,0) AS drawing_dedup_deduction,
            (CASE WHEN item_category='金屬鎖匙扣' THEN 20 ELSE 35 END) * GREATEST(quantity-1,0) AS shipping_subsidy_deduction
        FROM priced
    ),
    net AS (
        SELECT
            c.*,
            (c.new_gross_subtotal - c.drawing_dedup_deduction - c.shipping_subsidy_deduction) AS new_net_subtotal
        FROM computed c
    )
    SELECT jsonb_build_object(
        'summary', (
            SELECT jsonb_build_object(
                '受影響行數', count(*),
                '受影響訂單數', count(DISTINCT order_fhs_id),
                '現行總subtotal', sum(old_subtotal_cost),
                '新模型總subtotal_net', sum(new_net_subtotal),
                '差額總計', sum(new_net_subtotal - old_subtotal_cost),
                '按tier分佈', (
                    SELECT jsonb_agg(t)
                    FROM (
                        SELECT obj_tier, mode, item_category,
                               count(*) AS 行數,
                               sum(old_subtotal_cost) AS 現行總額,
                               sum(new_net_subtotal) AS 新模型總額,
                               sum(new_net_subtotal - old_subtotal_cost) AS 差額
                        FROM net
                        GROUP BY obj_tier, mode, item_category
                        ORDER BY obj_tier, mode, item_category
                    ) t
                )
            )
            FROM net
        ),
        'uncovered_scope', jsonb_build_object(
            '家庭composite未覆蓋行數', (
                SELECT count(*) FROM order_items
                WHERE item_category IN ('金屬鎖匙扣','純銀頸鏈吊飾') AND product_sku LIKE '%家庭%'
            ),
            '說明', '家庭 composite SKU（S1/S2/P1/P2）畫圖公式為 D41 專屬 composite_drawing（成人份+每嬰兒肢），未納入本輪模擬，需獨立驗證（Q3待辦）。跨行同部位彙總扣減（跨SKU行,如同單右手+左腳分開兩行）本模擬亦未做，僅模擬單行內quantity>1嘅扣減；真實 n8n Phase 2 邏輯需彙總全單同部位。'
        ),
        'rows', (
            SELECT COALESCE(jsonb_agg(row_to_json(x.*) ORDER BY x.order_fhs_id), '[]'::jsonb)
            FROM (
                SELECT
                    order_fhs_id, product_sku, item_category, quantity, obj_tier, mode, material,
                    is_old_single_purchase,
                    old_drawing_cost, old_item_base_cost, old_subtotal_cost,
                    new_unit_full_cost, new_gross_subtotal,
                    drawing_dedup_deduction, shipping_subsidy_deduction,
                    new_net_subtotal,
                    (new_net_subtotal - old_subtotal_cost) AS delta
                FROM net
            ) x
        )
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fhs_simulate_new_cost_model() IS
  '【cl-flow 2026-07-24-0213 Phase 0】唯讀模擬新三層成本模型 vs 現行單購/加購模型嘅 subtotal 差異。零寫入，供決策 Q1/Q4 之數據依據。已知未覆蓋範圍見回傳值 uncovered_scope。';

GRANT EXECUTE ON FUNCTION public.fhs_simulate_new_cost_model() TO anon, authenticated;

-- Smoke test：函式存在 + 可執行不報錯
DO $$
DECLARE
    v_test JSONB;
BEGIN
    SELECT public.fhs_simulate_new_cost_model() INTO v_test;
    IF v_test IS NULL THEN
        RAISE EXCEPTION 'fhs_simulate_new_cost_model() 回傳 NULL，異常';
    END IF;
    IF NOT (v_test ? 'summary') THEN
        RAISE EXCEPTION 'fhs_simulate_new_cost_model() 回傳缺 summary 欄位';
    END IF;
END $$;
