-- ============================================================================
-- 0101_correct_accessory_cost_and_0600803_split_4_orders.sql
-- 2026-10-03 — 補計早期漏計嘅羊毛氈／燈飾成本 $30，並更正 0600803 鎖匙扣／吊飾分類
--
-- 【授權】Fat Mo 2026-10-03「授權四單，兩單燈的 $80 都未收」（0696216／0600803／0600106／0600800）。
--   Layer-2 快照不可變死線 2：只有 Fat Mo 明確授權先可改；授權範圍僅此 4 張單。
--
-- 【根因】
--   • 羊毛氈／燈飾成本一直係 $30（Fat Mo 2026-10-03 親述），早期 cost seed 為 0（migration 0022b
--     2026-05-28 前）所以歷史單冇計入。0696216 羊毛氈行建於 2026-05-22 仍為 0；
--     0600106／0600800 當年有出燈（Fat Mo 確認）但系統冇旗標、冇配件行、accessory_cost=0。
--   • 0600803：0076 把同部位畫圖豁免 $220 錯記喺 K_LH（鎖匙扣），實際應豁免嘅係吊飾 M_LF／M_LH
--     （鎖匙扣優先慣例，Cost Schema v2 §10.4）。total／net 因兩邊互相抵銷而一直正確，只係分類放錯。
--
-- 【證據】finance-auditor 2026-10-03「0076 全 23 單複核」＋「羊毛氈／燈飾全庫漏計掃描」
--   （全庫確認漏計只有 0696216；0600106／0600800 經 Fat Mo 確認有燈）。
--
-- 【重算式】（Finance Bible §四 G1/G2/G5；Cost Schema v2 §2.1/§7）
--   0696216：手模 210 + 鎖匙扣 560 + 配件(羊毛氈) 30 = 800
--   0600106：手模 210 + 鎖匙扣 980 + 配件(燈飾) 30 = 1220
--   0600800：手模 210 + 鎖匙扣 350 + 吊飾 995 + 配件(燈飾) 30 = 1585
--   0600803：鎖匙扣 660 + 吊飾 995 = 1655（total 不變，只互換分類）
--
-- 【改動範圍】
--   orders：total_cost／keychain_cost／necklace_cost／accessory_cost／net_profit（net = final_sale_price − 新 total_cost）。
--   order_items：0696216_W_WOOL 補 30；0600106／0600800 新增「燈飾 - 加購」行（30／30／30，格式同 0600804）。
--   不碰：final_sale_price／deposit／balance（兩單燈 $80 未收，收款不動）、raw_form_state、
--         其他訂單、0600803 品項層（0078 已定品項層為毛額語義）。
--   n8n_adjustment_notes：各追加 amount=0 manual_correction；0600803 舊 dedup note 標註「已被更正取代」（只改 desc，金額不變）。
--
-- 【安全閘】預期現值守衛（只改仍為現值嘅單）、cost_override_locked 非 true、分量和＝total、
--   恰好行數守衛，任何不符 RAISE EXCEPTION 令整個 migration 回滾；audit_logs 全記改前後。
--
-- 【套用後】必須派 finance-auditor 驗收；0696216／0600106／0600800／0600803 暫勿由 Dashboard 重存
--   （舊單重存會無聲轉 V2 並覆蓋 Layer-2，見 D104 後續 5）。
-- ============================================================================

CREATE TEMP TABLE _m0101_fix (
    order_id          text PRIMARY KEY,
    exp_total         numeric NOT NULL,
    exp_keychain      numeric NOT NULL,
    exp_necklace      numeric NOT NULL,
    exp_accessory     numeric NOT NULL,
    new_total         numeric NOT NULL,
    new_keychain      numeric NOT NULL,
    new_necklace      numeric NOT NULL,
    new_accessory     numeric NOT NULL,
    basis             text NOT NULL
);

CREATE TEMP TABLE _m0101_updated (order_id text PRIMARY KEY);
CREATE TEMP TABLE _m0101_items (n int);

INSERT INTO _m0101_fix VALUES
 ('0696216', 770, 560, 0, 0,    800, 560, 0, 30,
  '羊毛氈成本一直 $30，早期 seed 為 0 漏計：手模210+鎖匙扣560+配件30＝800'),
 ('0600106', 1190, 980, 0, 0,   1220, 980, 0, 30,
  '單有燈飾（Fat Mo 確認，$80 未收）漏計成本 $30：手模210+鎖匙扣980+配件30＝1220'),
 ('0600800', 1555, 350, 995, 0, 1585, 350, 995, 30,
  '單有燈飾（Fat Mo 確認，$80 未收）漏計成本 $30：手模210+鎖匙扣350+吊飾995+配件30＝1585'),
 ('0600803', 1655, 440, 1215, 0, 1655, 660, 995, 0,
  '0076 把同部位畫圖豁免 $220 錯記於鎖匙扣；按鎖匙扣優先慣例應豁免吊飾 M_LF／M_LH：鎖匙扣660、吊飾995，total 不變');

-- Preflight
DO $$
DECLARE
    v_eligible integer;
BEGIN
    PERFORM 1 FROM orders o JOIN _m0101_fix f ON f.order_id = o.order_id FOR UPDATE OF o;

    SELECT count(*) INTO v_eligible
    FROM orders o
    JOIN _m0101_fix f ON f.order_id = o.order_id
    WHERE o.total_cost = f.exp_total
      AND o.keychain_cost = f.exp_keychain
      AND o.necklace_cost = f.exp_necklace
      AND COALESCE(o.accessory_cost, 0) = f.exp_accessory
      AND f.new_total = f.new_keychain + f.new_necklace + f.new_accessory + o.handmodel_cost
      AND o.cost_override_locked IS NOT TRUE
      AND jsonb_typeof(o.n8n_adjustment_notes) = 'array';

    IF (SELECT count(*) FROM _m0101_fix) <> 4 OR v_eligible <> 4
       OR EXISTS (SELECT 1 FROM audit_logs WHERE source = 'migration_0101')
       OR NOT EXISTS (SELECT 1 FROM order_items
                       WHERE order_fhs_id = '0696216' AND item_key = '0696216_W_WOOL'
                         AND COALESCE(item_base_cost,0) = 0 AND COALESCE(subtotal_cost,0) = 0
                         AND COALESCE(accessory_cost,0) = 0)
       OR EXISTS (SELECT 1 FROM order_items
                   WHERE item_key IN ('0600106_L_LIGHTS','0600800_L_LIGHTS')) THEN
        RAISE EXCEPTION 'migration 0101 preflight failed: eligible orders=% (expected 4), or item/audit precondition not met', v_eligible;
    END IF;
END $$;

-- Step 1: audit_logs（改前快照）
INSERT INTO audit_logs
    (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
SELECT
    'order_cost_adjust',
    'correct_accessory_cost_and_split',
    'AI_migration_0101',
    'order',
    o.order_id,
    jsonb_build_object(
        'total_cost', o.total_cost, 'keychain_cost', o.keychain_cost,
        'necklace_cost', o.necklace_cost, 'accessory_cost', o.accessory_cost,
        'handmodel_cost', o.handmodel_cost, 'net_profit', o.net_profit,
        'final_sale_price', o.final_sale_price,
        'n8n_adjustment_notes', o.n8n_adjustment_notes),
    jsonb_build_object(
        'total_cost', f.new_total, 'keychain_cost', f.new_keychain,
        'necklace_cost', f.new_necklace, 'accessory_cost', f.new_accessory,
        'handmodel_cost', o.handmodel_cost, 'net_profit', o.final_sale_price - f.new_total,
        'final_sale_price', o.final_sale_price,
        'order_items', CASE o.order_id
            WHEN '0696216' THEN 'UPDATE 0696216_W_WOOL 成本 0→30'
            WHEN '0600106' THEN 'INSERT 0600106_L_LIGHTS 燈飾 - 加購 30'
            WHEN '0600800' THEN 'INSERT 0600800_L_LIGHTS 燈飾 - 加購 30'
            ELSE '不變' END),
    '補計配件成本／更正分類（Fat Mo 2026-10-03 授權）：' || f.basis,
    'migration_0101'
FROM orders o
JOIN _m0101_fix f ON f.order_id = o.order_id
WHERE o.total_cost = f.exp_total
  AND o.keychain_cost = f.exp_keychain
  AND o.necklace_cost = f.exp_necklace
  AND COALESCE(o.accessory_cost, 0) = f.exp_accessory
  AND f.new_total = f.new_keychain + f.new_necklace + f.new_accessory + o.handmodel_cost
  AND o.cost_override_locked IS NOT TRUE
  AND jsonb_typeof(o.n8n_adjustment_notes) = 'array';

-- Step 2: orders（final_sale_price／deposit／balance 絕不觸碰）
WITH upd AS (
    UPDATE orders o
    SET total_cost    = f.new_total,
        keychain_cost = f.new_keychain,
        necklace_cost = f.new_necklace,
        accessory_cost = f.new_accessory,
        net_profit    = o.final_sale_price - f.new_total,
        n8n_adjustment_notes =
            CASE WHEN o.order_id = '0600803' THEN
                (SELECT COALESCE(jsonb_agg(
                    CASE WHEN e->>'type' = 'drawing_position_dedup_deduction'
                         THEN jsonb_set(e, '{desc}', to_jsonb((e->>'desc')
                              || '［2026-10-03 migration 0101：此註記把 K_LH $220 當豁免，分類已更正（鎖匙扣660／吊飾995），金額以 orders 分量欄為準］'))
                         ELSE e END ORDER BY ord), '[]'::jsonb)
                   FROM jsonb_array_elements(o.n8n_adjustment_notes) WITH ORDINALITY AS t(e, ord))
            ELSE o.n8n_adjustment_notes END
            || jsonb_build_array(jsonb_build_object(
                'type', 'manual_correction', 'amount', 0, 'source', 'migration_0101',
                'desc', '2026-10-03 migration 0101：' || f.basis || '（Fat Mo 授權；僅審計說明，不入金額）'))
    FROM _m0101_fix f
    WHERE o.order_id = f.order_id
      AND o.total_cost = f.exp_total
      AND o.keychain_cost = f.exp_keychain
      AND o.necklace_cost = f.exp_necklace
      AND COALESCE(o.accessory_cost, 0) = f.exp_accessory
      AND f.new_total = f.new_keychain + f.new_necklace + f.new_accessory + o.handmodel_cost
      AND o.cost_override_locked IS NOT TRUE
      AND jsonb_typeof(o.n8n_adjustment_notes) = 'array'
    RETURNING o.order_id
)
INSERT INTO _m0101_updated (order_id) SELECT order_id FROM upd;

-- Step 3: order_items（0696216 羊毛氈補 30；0600106／0600800 新增燈飾行，格式同 0600804_L_LIGHTS；
--         item_sale_price 留 NULL＝$80 未收；process_status 留 NULL）
WITH w AS (
    UPDATE order_items
    SET item_base_cost = 30, subtotal_cost = 30, accessory_cost = 30, updated_at = now()
    WHERE order_fhs_id = '0696216' AND item_key = '0696216_W_WOOL'
      AND COALESCE(item_base_cost,0) = 0 AND COALESCE(subtotal_cost,0) = 0 AND COALESCE(accessory_cost,0) = 0
    RETURNING 1
)
INSERT INTO _m0101_items (n) SELECT 1 FROM w;

WITH ins AS (
    INSERT INTO order_items
        (item_key, order_fhs_id, product_sku, item_category, quantity,
         item_base_cost, subtotal_cost, accessory_cost,
         handmodel_cost, keychain_cost, necklace_cost,
         drawing_cost, printing_cost, chain_cost, shipping_cost,
         specification, process_status)
    SELECT v.item_key, v.order_fhs_id, '燈飾 - 加購', '配件', 1,
           30, 30, 30,
           0, 0, 0,
           0, 0, 0, 0,
           '', NULL
    FROM (VALUES ('0600106_L_LIGHTS','0600106'), ('0600800_L_LIGHTS','0600800')) AS v(item_key, order_fhs_id)
    RETURNING 1
)
INSERT INTO _m0101_items (n) SELECT 1 FROM ins;

-- Step 4: 守衛（任何不符整個 migration 回滾）
DO $$
DECLARE
    v_audit integer; v_updated integer; v_fixed integer; v_items integer; v_acc_sum integer;
BEGIN
    SELECT count(*) INTO v_updated FROM _m0101_updated;
    SELECT count(*) INTO v_items FROM _m0101_items;
    SELECT count(*) INTO v_audit FROM audit_logs
     WHERE action = 'correct_accessory_cost_and_split' AND source = 'migration_0101'
       AND actor = 'AI_migration_0101';

    SELECT count(*) INTO v_fixed
    FROM orders o JOIN _m0101_fix f ON f.order_id = o.order_id
    WHERE o.total_cost = f.new_total AND o.keychain_cost = f.new_keychain
      AND o.necklace_cost = f.new_necklace AND o.accessory_cost = f.new_accessory
      AND o.total_cost = o.handmodel_cost + o.keychain_cost + o.necklace_cost + o.accessory_cost
      AND o.net_profit = o.final_sale_price - o.total_cost
      AND o.n8n_adjustment_notes @> jsonb_build_array(
          jsonb_build_object('type','manual_correction','amount',0,'source','migration_0101'));

    -- orders.accessory_cost 須等於其配件品項行之和（驗證 4）
    SELECT count(*) INTO v_acc_sum
    FROM orders o JOIN _m0101_fix f ON f.order_id = o.order_id
    WHERE o.accessory_cost = COALESCE((SELECT sum(i.accessory_cost) FROM order_items i
                                        WHERE i.order_fhs_id = o.order_id AND i.item_category = '配件'), 0);

    IF v_audit <> 4 OR v_updated <> 4 OR v_fixed <> 4 OR v_items <> 3 OR v_acc_sum <> 4 THEN
        RAISE EXCEPTION 'migration 0101 守衛失敗：audit=%, updated=%, fixed=%, items=%, acc_sum_ok=%（預期 4/4/4/3/4）',
            v_audit, v_updated, v_fixed, v_items, v_acc_sum;
    END IF;
END $$;

DROP TABLE _m0101_fix;
DROP TABLE _m0101_updated;
DROP TABLE _m0101_items;

-- ============================================================================
-- Smoke test（套用後；之後派 finance-auditor 驗收）：
-- SELECT order_id, final_sale_price, total_cost, keychain_cost, necklace_cost, handmodel_cost, accessory_cost,
--        net_profit, final_sale_price - total_cost AS expected_net
--   FROM orders WHERE order_id IN ('0696216','0600803','0600106','0600800');
-- 預期：0696216 800/560/0/210/30 net 4120；0600803 1655/660/995/0/0 net 4485；
--       0600106 1220/980/0/210/30 net 5360；0600800 1585/350/995/210/30 net 4705。
-- SELECT entity_id FROM audit_logs WHERE source='migration_0101';  -- 4 行
-- 回滾：按 audit_logs before_val 還原 orders 五欄與 n8n_adjustment_notes，刪 0600106_L_LIGHTS／0600800_L_LIGHTS，
--       0696216_W_WOOL 還原 0／0／0（需 Fat Mo 授權）。
-- ============================================================================
