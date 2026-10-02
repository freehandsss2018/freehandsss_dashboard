-- ============================================================================
-- 0097_correct_0076_overcorrection_07001007_0600105.sql
-- 2026-10-02 — 更正 migration 0076（S189）對 2 張單造成嘅訂單層成本錯誤
--
-- 【授權】Fat Mo 2026-10-02 指示「07001007 同 0600105 照改」。
--   （Layer-2 快照不可變死線 2：只有 Fat Mo 明確授權先可改；授權範圍僅此 2 張單。）
--
-- 【根因】0076 以 order_items.drawing_cost 當「已入帳畫圖費」計 delta，但舊單呢個欄位不可靠：
--   • 07001007：單購 SKU「嬰兒(P)鎖匙扣-不銹鋼-2飾(單購)」products 成本 $360 已含一次畫圖費 $110，
--     但 drawing_cost 被舊 bug 寫成 220（×數量）。0076 見「多收」每行扣 $110，兩行誤扣 $220。
--   • 0600105：0076 前品項每行為 1飾單購價 $235（冇乘數量），0076 見 drawing_cost=0 每行重複加 $110；
--     另 n8n 運費扣減只按「行數」扣 $20（實際 6 件應扣 $100）。
--
-- 【證據鏈】
--   • finance-auditor 2026-10-02「0076-follow 唯讀覆核23單」：兩單由零重算＝660／870。
--   • A4(Codex) 2026-10-02 獨立覆核（A3 代跑，級別＝A4 未獨立驗證）：同得 660／870，信心「高」。
--     見 artifacts/2026-10-02-0076-follow-a4/gpt-review.md（artifacts/ 不入 git，結論已複述於此）。
--   • 07001007 另有佐證：n8n 當時 convergence_note「products成本660」、0076 前快照亦為 660。
--
-- 【重算式】（Finance Bible §四 G2／跨部位運費扣減；Cost Schema v2 §2.1；gatekeeper §三B）
--   07001007：左手2＋右手2，嬰兒(P)：畫圖 2部位×$110＝220；物料+環扣 4×(115+10)＝500；
--             運費共享扣減 (4−1)×20＝60  →  660
--   0600105 ：左腳2＋左手4，嬰兒(P)：畫圖 2部位×$110＝220；物料+環扣 6×125＝750；
--             運費共享扣減 (6−1)×20＝100 →  870
--
-- 【改動範圍】（精準最小改動）
--   只改 orders：total_cost／keychain_cost／net_profit（net_profit = final_sale_price − 新 total_cost）。
--   不碰：final_sale_price/deposit/balance（確收真理）、handmodel/necklace/accessory_cost（本來就 0）、
--         order_items（0078 已定品項層為毛額語義；品項層 NULL/毛額唔入訂單層驗證，見 Finance Bible §二）、
--         raw_form_state、n8n_cost_adjustments。
--   另外喺 n8n_adjustment_notes 追加一條 amount=0 嘅 manual_correction 說明（同 convergence_note 一樣唔入金額）。
--
-- 【安全閘】
--   • WHERE 帶「預期現值」：只有仍係 0076 後嘅現值（440/670）先會改，重跑／已被改過則 0 行，唔會雙改。
--   • cost_override_locked 必須非 true。
--   • DO 區塊末尾核對：必須恰好更新 2 行，否則 RAISE EXCEPTION 令整個 migration 回滾。
--   • 不使用 trigger／generated column（死線 3）；只寫 audit_logs（before/after 全記錄，可回滾）。
--
-- 【預期結果】
--   07001007：total_cost 440→660、keychain_cost 440→660、net_profit 1930→1710
--   0600105 ：total_cost 670→870、keychain_cost 670→870、net_profit 2530→2330
--   合計成本 +$420，淨利 −$420（對照 0076 當年：07001007 −220、0600105 +220，其後 0600105 本身另有舊快照錯 −$200 未解）。
--
-- 【套用後】必須派 finance-auditor 驗收（Finance Bible §九 驗證 1/2：四分類和＝total_cost、net_profit＝售價−成本）。
--   Smoke test 見檔尾。
-- ============================================================================

-- 回滾用：先把改前值寫入 audit_logs（before_val）
CREATE TEMP TABLE _m0097_fix (
    order_id          text PRIMARY KEY,
    expected_total    numeric NOT NULL,   -- 預期現值（0076 後）
    new_total         numeric NOT NULL,   -- 更正後值
    basis             text    NOT NULL
);

INSERT INTO _m0097_fix (order_id, expected_total, new_total, basis) VALUES
 ('07001007', 440, 660, '嬰兒(P)鎖匙扣 左手2+右手2：畫圖2×110+(115+10)×4−運費(4−1)×20=660；0076 誤扣 $220'),
 ('0600105',  670, 870, '嬰兒(P)鎖匙扣 左腳2+左手4：畫圖2×110+(115+10)×6−運費(6−1)×20=870；0076 重複加 $110×2 且舊運費只按行數扣');

-- Step 1: audit_logs（改前快照，同一語句內讀取尚未更新嘅 orders）
INSERT INTO audit_logs (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
SELECT
    'order_cost_adjust',
    'correct_0076_overcorrection',
    'AI_migration_0097',
    'order',
    o.order_id,
    jsonb_build_object('total_cost', o.total_cost, 'keychain_cost', o.keychain_cost,
                       'necklace_cost', o.necklace_cost, 'net_profit', o.net_profit),
    jsonb_build_object('total_cost', f.new_total, 'keychain_cost', o.keychain_cost + (f.new_total - o.total_cost),
                       'necklace_cost', o.necklace_cost, 'net_profit', o.final_sale_price - f.new_total),
    '更正 0076 錯誤回填（Fat Mo 2026-10-02 授權）：' || f.basis
        || '；delta=$' || (f.new_total - o.total_cost),
    'migration_0097'
FROM orders o
JOIN _m0097_fix f ON f.order_id = o.order_id
WHERE o.total_cost = f.expected_total
  AND COALESCE(o.cost_override_locked, false) = false;

-- Step 2: 更新 orders（final_sale_price 絕不觸碰）
WITH upd AS (
    UPDATE orders o
    SET keychain_cost = o.keychain_cost + (f.new_total - o.total_cost),
        total_cost    = f.new_total,
        net_profit    = o.final_sale_price - f.new_total,
        n8n_adjustment_notes = COALESCE(o.n8n_adjustment_notes, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'type',   'manual_correction',
                'amount', 0,
                'desc',   '2026-10-02 migration 0097 更正 0076 錯誤回填：total_cost ' || o.total_cost || '→' || f.new_total
                          || '（Fat Mo 授權；僅審計說明，不入金額）',
                'basis',  f.basis))
    FROM _m0097_fix f
    WHERE o.order_id = f.order_id
      AND o.total_cost = f.expected_total
      AND COALESCE(o.cost_override_locked, false) = false
    RETURNING o.order_id
)
SELECT count(*) AS updated_rows FROM upd;

-- Step 3: 守衛——必須恰好 2 行被更新，否則整個 migration 回滾
DO $$
DECLARE
    v_audit int;
    v_fixed int;
BEGIN
    SELECT count(*) INTO v_audit FROM audit_logs
     WHERE action = 'correct_0076_overcorrection' AND source = 'migration_0097';
    SELECT count(*) INTO v_fixed FROM orders
     WHERE (order_id = '07001007' AND total_cost = 660 AND keychain_cost = 660 AND net_profit = final_sale_price - 660)
        OR (order_id = '0600105'  AND total_cost = 870 AND keychain_cost = 870 AND net_profit = final_sale_price - 870);
    IF v_audit <> 2 OR v_fixed <> 2 THEN
        RAISE EXCEPTION 'migration 0097 守衛失敗：audit_logs=%, 已更正訂單=%（預期各 2）——回滾', v_audit, v_fixed;
    END IF;
END $$;

DROP TABLE _m0097_fix;

-- ============================================================================
-- Smoke test（套用後手動執行；之後派 finance-auditor 驗收）：
-- SELECT order_id, final_sale_price, total_cost, keychain_cost, necklace_cost, handmodel_cost,
--        net_profit, final_sale_price - total_cost AS expected_net
--   FROM orders WHERE order_id IN ('07001007','0600105');
-- 預期：07001007 → 660/660/net 1710；0600105 → 870/870/net 2330；net_profit = expected_net。
-- SELECT entity_id, before_val, after_val FROM audit_logs WHERE source = 'migration_0097';  -- 2 行
--
-- 回滾（如需）：按 audit_logs before_val 把 total_cost/keychain_cost/net_profit 設返原值（需 Fat Mo 授權）。
-- ============================================================================
