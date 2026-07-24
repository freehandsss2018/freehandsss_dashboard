-- Migration 0072: 修正 0071 吊飾類別漏計 D42 頸鏈成本
-- 根因（finance-auditor 獨立覆核揪出）：0071 fhs_simulate_new_cost_model() 吊飾
-- new_unit_full_cost 冇加返 necklace_chain_cost（$100/件，D42機制），導致吊飾類差額數字唔可信
-- （抽查 0600107/0600710/0600721 等單，真實 subtotal_cost 含$100頸鏈，模擬漏計）。
-- 修正：吊飾 unit_full_cost 加 +100（品項層對稱摺入，符合 D42 記帳格式）；
--       扣減新增 chain_shared_discount = floor(quantity/2)×100（D42 公式，本行內近似，
--       跨行同單彙總仍未覆蓋——同鎖匙扣畫圖/運費扣減一樣局限，已於 uncovered_scope 聲明）。

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
                    + 100  -- ★修正：necklace_chain_cost（D42，品項層對稱摺入）
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
            (CASE WHEN item_category='金屬鎖匙扣' THEN 20 ELSE 35 END) * GREATEST(quantity-1,0) AS shipping_subsidy_deduction,
            (CASE WHEN item_category='純銀頸鏈吊飾' THEN FLOOR(quantity/2.0)*100 ELSE 0 END) AS chain_shared_discount  -- ★新增：D42 floor(N/2)×100 共用折扣
        FROM priced
    ),
    net AS (
        SELECT
            c.*,
            (c.new_gross_subtotal - c.drawing_dedup_deduction - c.shipping_subsidy_deduction - c.chain_shared_discount) AS new_net_subtotal
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
            '單購拆解欄位qty相乘bug已知污染行數', (
                SELECT count(*) FROM order_items
                WHERE item_category IN ('金屬鎖匙扣','純銀頸鏈吊飾')
                  AND drawing_cost > 0 AND quantity > 1
            ),
            '說明', '家庭 composite SKU（S1/S2/P1/P2）畫圖公式為 D41 專屬 composite_drawing（成人份+每嬰兒肢），未納入本輪模擬，需獨立驗證（Q3待辦）。跨行同部位/同單吊飾總件數彙總扣減（跨SKU行，如同單右手+左腳分開兩行，或吊飾+鎖匙扣混單）本模擬亦未做，僅模擬單行內quantity嘅扣減；真實 n8n Phase 2 邏輯需彙總全單同部位/同類別。另：少量「單購」SKU 行因已知 drawing_cost 拆解欄位 qty 相乘 bug（見 FHS_System_Logic_Overview.md §5.4.6），其 old_subtotal_cost 比較基準可能受污染，已於 uncovered_scope 標記行數供交叉排除。'
        ),
        'rows', (
            SELECT COALESCE(jsonb_agg(row_to_json(x.*) ORDER BY x.order_fhs_id), '[]'::jsonb)
            FROM (
                SELECT
                    order_fhs_id, product_sku, item_category, quantity, obj_tier, mode, material,
                    is_old_single_purchase,
                    old_drawing_cost, old_item_base_cost, old_subtotal_cost,
                    new_unit_full_cost, new_gross_subtotal,
                    drawing_dedup_deduction, shipping_subsidy_deduction, chain_shared_discount,
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
  '【cl-flow 2026-07-24-0213 Phase 0，migration 0072 修正版】唯讀模擬新三層成本模型 vs 現行單購/加購模型嘅 subtotal 差異，已修正吊飾漏計 D42 頸鏈成本嘅bug（finance-auditor 覆核揪出）。零寫入，供決策 Q1/Q4 之數據依據。已知未覆蓋範圍見回傳值 uncovered_scope。';

-- Smoke test：函式存在 + 可執行不報錯 + 吊飾單件全費含頸鏈（$60+465+100+35=660,baby S mode）
DO $$
DECLARE
    v_test JSONB;
    v_necklace_sample JSONB;
BEGIN
    SELECT public.fhs_simulate_new_cost_model() INTO v_test;
    IF v_test IS NULL THEN
        RAISE EXCEPTION 'fhs_simulate_new_cost_model() 回傳 NULL，異常';
    END IF;
    IF NOT (v_test ? 'summary') THEN
        RAISE EXCEPTION 'fhs_simulate_new_cost_model() 回傳缺 summary 欄位';
    END IF;

    SELECT r INTO v_necklace_sample
    FROM jsonb_array_elements(v_test->'rows') r
    WHERE r->>'item_category' = '純銀頸鏈吊飾' AND r->>'mode' = 'S' AND r->>'obj_tier' = 'baby'
    LIMIT 1;

    IF v_necklace_sample IS NOT NULL AND (v_necklace_sample->>'new_unit_full_cost')::numeric <> 660 THEN
        RAISE EXCEPTION '吊飾 unit_full_cost 修正後仍不等於預期660（實得 %），公式仍有誤', v_necklace_sample->>'new_unit_full_cost';
    END IF;
END $$;
