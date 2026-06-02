-- ============================================================
-- Migration 0025 — cost_configurations 原子成本補完
-- ============================================================
-- Purpose:
--   P1 成本邏輯憲法化：在既有 cost_configurations v2.1（17 keys）
--   基礎上補入缺失的原子成本 key，並修正 keychain 運費語義。
--   不建表，不改表結構，ON CONFLICT DO NOTHING 安全補種。
--
-- 背景：
--   0022a 已有 drawing_cost_* / material_cost_* / shipping（deduction）
--   本 migration 補入：
--     1. necklace_chain_cost       = 100  (吊飾頸鏈，奇偶規則：ceil(N/2)×$100)
--     2. charm_shipping_deduction  = 35   (吊飾多件運費扣減 / 件)
--     3. mixed_member_surcharge    = 300  (混合成人+嬰兒附加費)
--   修正：keychain_shipping_deduction_per_extra COMMENT 語義
--         （舊：order_items 行數；正確：SUM(quantity) 件數總和）
--
-- Rollback: DROP TABLE IF EXISTS 不適用（補種，非建表）
--           手動刪除：DELETE FROM cost_configurations
--             WHERE config_key IN (
--               'necklace_chain_cost',
--               'charm_shipping_deduction_per_extra',
--               'mixed_member_surcharge');
--
-- Post-deploy smoke tests: see PART 3 below
-- ============================================================


-- ============================================================
-- PART 1: INSERT 3 missing atom cost keys
-- ============================================================

INSERT INTO cost_configurations
  (config_key, config_value, display_name, data_type, description, display_group, schema_version)
VALUES
  -- 頸鏈成本：每條頸鏈 $100（吊飾奇偶規則：Math.ceil(N/2) 條）
  ('necklace_chain_cost', '100',
   '吊飾頸鏈成本 / 條',
   'number',
   'P0 規則：每 2 個吊飾共用 1 條頸鏈（$100）；奇數件多 1 條。'
   || 'formula: Math.ceil(totalCharms/2) × $100。'
   || '對應前端 calculatePricing necklaces 變數。',
   'material_jewelry', 'v2'),

  -- 吊飾多件運費扣減
  ('charm_shipping_deduction_per_extra', '35',
   '吊飾多件運費扣減 / 件',
   'number',
   'P0 規則：(吊飾總件數-1) × $35。'
   || '吊飾總件數 = SUM(quantity) across all 吊飾 order_items（件數非行數）。'
   || '對應 keychain_shipping_deduction_per_extra 的吊飾版本。',
   'shipping', 'v2'),

  -- 混合成員附加費（成人+嬰兒同訂單）
  ('mixed_member_surcharge', '300',
   '混合成員附加費（成人+嬰兒）',
   'number',
   '立體擺設訂單同時含成人+嬰兒成員時加收。'
   || '前端 calculatePricing hasAdultInSet && hasBabyInSet 觸發。'
   || '計入 System_Additional_Fee，亦計入 totalSuggestedPrice。',
   'misc', 'v2')

ON CONFLICT (config_key) DO NOTHING;


-- ============================================================
-- PART 2: 修正 keychain_shipping_deduction 語義 COMMENT
--   舊語義（bug）：N = order_items 行數
--   正確語義（P0）：N = SUM(quantity) 件數總和
--   僅更新 description，不更新 value（$20 值正確）
-- ============================================================

UPDATE cost_configurations
SET description = 'P0 規則（Session 52 修正）：(鎖匙扣總件數-1) × $20。'
               || '鎖匙扣總件數 = SUM(quantity) across all 鎖匙扣 order_items（件數非行數）。'
               || '例：左手×1+右手×2=3件，扣減=(3-1)×$20=$40（舊Bug為$20）。',
    updated_at = NOW()
WHERE config_key = 'keychain_shipping_deduction_per_extra';


-- ============================================================
-- PART 3: Smoke tests（每 PART 執行後驗證，防靜默失敗）
-- ============================================================

-- 3.1 驗證 3 個新 key 已存在
DO $$
DECLARE
  _count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _count
  FROM cost_configurations
  WHERE config_key IN (
    'necklace_chain_cost',
    'charm_shipping_deduction_per_extra',
    'mixed_member_surcharge'
  );
  IF _count < 3 THEN
    RAISE EXCEPTION '0025 Smoke Test FAIL: 預期 3 個新 key，實際找到 %', _count;
  END IF;
  RAISE NOTICE '0025 PART 1 Smoke Test PASS: 3 個新 key 已存在';
END $$;

-- 3.2 驗證頸鏈成本值 = 100
DO $$
DECLARE _val TEXT;
BEGIN
  SELECT config_value INTO _val FROM cost_configurations
  WHERE config_key = 'necklace_chain_cost';
  IF _val != '100' THEN
    RAISE EXCEPTION '0025 Smoke Test FAIL: necklace_chain_cost = %, 預期 100', _val;
  END IF;
  RAISE NOTICE '0025 PART 1b Smoke Test PASS: necklace_chain_cost = 100';
END $$;

-- 3.3 驗證 keychain deduction description 已更新（含 P0 規則字樣）
DO $$
DECLARE _desc TEXT;
BEGIN
  SELECT description INTO _desc FROM cost_configurations
  WHERE config_key = 'keychain_shipping_deduction_per_extra';
  IF _desc NOT LIKE '%P0 規則%' THEN
    RAISE EXCEPTION '0025 Smoke Test FAIL: keychain_shipping_deduction description 未更新';
  END IF;
  RAISE NOTICE '0025 PART 2 Smoke Test PASS: keychain deduction description 已修正';
END $$;

-- 3.4 總 key 數確認（應為 17 舊 + 3 新 = 20）
DO $$
DECLARE _count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _count FROM cost_configurations WHERE is_deprecated = FALSE;
  RAISE NOTICE '0025 Final: 現有 active cost_configurations keys = %（預期 ≥ 20）', _count;
END $$;