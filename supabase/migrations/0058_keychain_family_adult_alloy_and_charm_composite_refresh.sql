-- 0058_keychain_family_adult_alloy_and_charm_composite_refresh.sql
-- Phase 2 成本架構全品類漂移修復（Fat Mo 拍板 2026-07-18，flow_id 2026-07-18-2105）
--
-- 背景：opus 對抗審查揪出 A3 原定案兩個 BLOCKER：
--   (1) 家庭鎖匙扣 SKU 普查遺漏 N=2..10 梯階（~152 個 SKU 全部 flat，未按式）
--   (2) composite 畫圖式（成人+每個嬰兒肢各計一次）一開始被誤判方向；
--       實測 Dashboard 前端 calculatePricing()（isFamily 分支，freehandsss_dashboardV42.html:7099-7110）
--       證實 composite 才是 Fat Mo 現行實際業務邏輯（0600107 訂單 drawing_cost=230=110+2×60 為活證據）。
--       Fat Mo 已直接確認：composite 正確。
--
-- 本次修復範圍（Fat Mo 逐條拍板）：
--   A. material_cost_keychain_alloy_adult：135 → 125（對齊不銹鋼同價，證據：嬰兒層兩材質已於 6-23 收斂同價，
--      成人層 135 定於 6-03 收斂動作之前，其後兩次調價均未追改，判定為漏改而非有意差價）
--   B. 嬰兒鎖匙扣-鋁合金（S/P，1-10飾，加購/單購）：用現行原子重算，不再 flat（185/245 → 按 N 遞增）
--   C. 成人/家庭鎖匙扣（不銹鋼+鋁合金，S1/S2/P1/P2/成人(P)，1-10飾，加購/單購）：composite 畫圖式重算，
--      不再 flat（275/405 → 按 N + tier 遞增）
--   D. 家庭吊飾（S1/S2/P1/P2，單購 1-10飾）：composite 畫圖式重算（原單一成人式，零歷史單受影響）；
--      加購維持不變（原本已正確 = 材料×N，無畫圖分量）
--   E. 刪除零成本佔位 row（mode 非加購/單購，total_base_cost=0）：核實僅 3 張已取消測試單
--      （test1001/test1004/未命名，2026-07-16 created，process_status=已取消）引用，安全刪除
--
-- 歷史單影響：僅 0600107（家庭(S2)鎖匙扣加購，2026-05-22）需二次 resync（見 Step 4，經 Dashboard 真 UI）；
--   家庭吊飾全線 0 張歷史單，純 catalog 修正。
--
-- Reference: artifacts/2026-07-18-2105/cl-final-plan.md；.fhs/notes/decisions.md D41（待補）

-- 注意：不使用 explicit BEGIN/COMMIT——Supabase apply_migration 工具本身已用交易包住整檔，
-- 內嵌交易語句會與工具交易嵌套產生 WARNING/提早 COMMIT 風險（opus 對抗審查 #2 發現，MINOR）。

-- ============================================================
-- STEP A: 修正 alloy_adult 原子（Fat Mo 拍板：對齊 125）
-- ============================================================
UPDATE cost_configurations
SET config_value  = '125',
    description   = '鎖匙扣 - 鋁合金物料（成人/家庭層）。2026-07-18 Phase 2 修正：原值 135 定於 2026-06-03，'
                  || '其後 2026-06-16/06-23 兩次材質收斂動作（嬰兒層已同價）均未追改此原子，判定為漏改，'
                  || 'Fat Mo 確認對齊不銹鋼同價 125（cl-flow 2026-07-18-2105）。'
WHERE config_key = 'material_cost_keychain_alloy_adult';

-- ============================================================
-- STEP B: audit_logs BEFORE 快照（本次修復範圍全部 SKU）
-- ============================================================
INSERT INTO audit_logs (id, created_at, log_type, action, actor, entity_type, entity_id, before_val, summary, source)
SELECT gen_random_uuid(), now(), 'cost_migration', 'phase2_cost_refresh_before', 'claude_code_0058',
       'products', p.id::text,
       jsonb_build_object('sku', p.sku, 'mode', p.mode, 'item_per_set', p.item_per_set, 'total_base_cost', p.total_base_cost),
       'Phase 2（家庭/成人鎖匙扣+鋁合金嬰兒層+家庭吊飾 composite 修復）改動前快照',
       'migration_0058'
FROM products p
WHERE (p.sku LIKE '嬰兒鎖匙扣 - 鋁合金%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 鋁合金%')
   OR (p.sku LIKE '%鎖匙扣%' AND (p.sku LIKE '%成人%' OR p.sku LIKE '%家庭%') AND p.mode IN ('加購','單購'))
   OR (p.sku LIKE '家庭%吊飾%' AND p.mode = '單購');

-- ============================================================
-- STEP C: 嬰兒鎖匙扣-鋁合金 recompute（加購/單購，N=1..10）
-- ============================================================
UPDATE products p
SET total_base_cost = fhs_compute_keychain_cost(
      (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'material_cost_keychain_alloy'),
      p.item_per_set,
      CASE
        WHEN p.mode = '加購' THEN 0
        WHEN p.mode = '單購' AND p.sku LIKE '嬰兒(P)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')
        WHEN p.mode = '單購' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')
        ELSE 0
      END
    )
WHERE (p.sku LIKE '嬰兒鎖匙扣 - 鋁合金%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 鋁合金%')
  AND p.mode IN ('加購','單購');

-- ============================================================
-- STEP D: 成人/家庭鎖匙扣（不銹鋼+鋁合金）composite recompute
-- ============================================================
UPDATE products p
SET total_base_cost = fhs_compute_keychain_cost(
      CASE
        WHEN p.sku LIKE '%鋁合金%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'material_cost_keychain_alloy_adult')
        ELSE
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'material_cost_keychain_stainless_adult')
      END,
      p.item_per_set,
      CASE
        WHEN p.mode = '加購' THEN 0
        WHEN p.sku LIKE '成人(P)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_p')
        WHEN p.sku LIKE '家庭(S1)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_s')
          + 1 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')
        WHEN p.sku LIKE '家庭(S2)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_s')
          + 2 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')
        WHEN p.sku LIKE '家庭(P1)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_p')
          + 1 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')
        WHEN p.sku LIKE '家庭(P2)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_p')
          + 2 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')
        ELSE 0
      END
    )
WHERE p.sku LIKE '%鎖匙扣%'
  AND (p.sku LIKE '%成人%' OR p.sku LIKE '%家庭%')
  AND p.mode IN ('加購','單購');

-- ============================================================
-- STEP E: 家庭吊飾（單購）composite recompute（加購維持不變，本身已正確）
-- ============================================================
UPDATE products p
SET total_base_cost = fhs_compute_charm_cost(
      CASE
        WHEN p.sku LIKE '家庭(S1)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_s')
          + 1 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')
        WHEN p.sku LIKE '家庭(S2)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_s')
          + 2 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')
        WHEN p.sku LIKE '家庭(P1)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_p')
          + 1 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')
        WHEN p.sku LIKE '家庭(P2)%' THEN
          (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_adult_p')
          + 2 * (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')
        ELSE 0
      END,
      CASE WHEN p.sku LIKE '%925金%' THEN
             (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'material_cost_necklace_gold')
           ELSE
             (SELECT config_value::numeric FROM cost_configurations WHERE config_key = 'material_cost_necklace_silver')
      END,
      p.item_per_set
    )
WHERE p.sku LIKE '家庭%吊飾%'
  AND p.mode = '單購';

-- ============================================================
-- STEP F: audit_logs AFTER 快照
-- ============================================================
INSERT INTO audit_logs (id, created_at, log_type, action, actor, entity_type, entity_id, after_val, summary, source)
SELECT gen_random_uuid(), now(), 'cost_migration', 'phase2_cost_refresh_after', 'claude_code_0058',
       'products', p.id::text,
       jsonb_build_object('sku', p.sku, 'mode', p.mode, 'item_per_set', p.item_per_set, 'total_base_cost', p.total_base_cost),
       'Phase 2（家庭/成人鎖匙扣+鋁合金嬰兒層+家庭吊飾 composite 修復）改動後結果',
       'migration_0058'
FROM products p
WHERE (p.sku LIKE '嬰兒鎖匙扣 - 鋁合金%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 鋁合金%')
   OR (p.sku LIKE '%鎖匙扣%' AND (p.sku LIKE '%成人%' OR p.sku LIKE '%家庭%') AND p.mode IN ('加購','單購'))
   OR (p.sku LIKE '家庭%吊飾%' AND p.mode = '單購');

-- ============================================================
-- STEP G: 刪除零成本佔位 row
-- 核實：21/23 行完全無 order_items 引用；2 行（嬰兒吊飾-925銀、嬰兒鎖匙扣-不銹鋼）
-- 仍被 test1001/test1004/未命名 三張已取消測試單引用，order_items.product_sku 對
-- products.sku 有 FK（NO ACTION），直接 DELETE 會違反約束令全 migration 回滾
-- （opus 對抗審查 #2 揪出嘅 BLOCKER，2026-07-18）。
-- 修法：動態排除任何仍被 order_items 引用嘅 row（不限定死 SKU 名，防日後有其他引用漏網），
-- 而非清 orders/order_items（超出 Fat Mo 本次授權範圍）。
-- ============================================================
DELETE FROM products p
WHERE p.total_base_cost = 0
  AND p.mode NOT IN ('加購','單購')
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_sku = p.sku);
