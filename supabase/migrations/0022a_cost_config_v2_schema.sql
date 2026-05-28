-- ============================================================
-- Migration 0022a — cost_configurations v2.1 Schema Upgrade
-- ============================================================
-- Purpose:
--   1. Add 4 new columns to cost_configurations
--      (version / schema_version / display_group / is_deprecated)
--   2. Rename 3 v1 keys to v2.1 naming convention
--   3. Update display_group for 6 inherited v1 keys
--   4. INSERT 11 new v2 keys
--
-- Design decisions:
--   - v1 keys renamed in-place (no data loss, ON CONFLICT safe)
--   - keychain_shipping_deduction_per_extra = 20 (Product Bible §2.5)
--   - drawing/material/jewelry costs default 0 except known values
--
-- Rollback: see .fhs/ai/FHS_Product_Cost_Operations.md §OP-5.1
-- ============================================================


-- ============================================================
-- PART 1: Add columns
-- ============================================================

ALTER TABLE cost_configurations
  ADD COLUMN IF NOT EXISTS version          INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schema_version   TEXT        DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS display_group    TEXT        DEFAULT 'misc',
  ADD COLUMN IF NOT EXISTS is_deprecated    BOOLEAN     DEFAULT FALSE;

-- CHECK constraint on display_group
ALTER TABLE cost_configurations
  DROP CONSTRAINT IF EXISTS cost_config_display_group_check;

ALTER TABLE cost_configurations
  ADD CONSTRAINT cost_config_display_group_check
  CHECK (display_group IN ('drawing','material_3d','material_jewelry','shipping','addon','misc'));

COMMENT ON COLUMN cost_configurations.version IS
  'v2.1 樂觀鎖版本號，每次 upsert 遞增。前端儲存時帶此值做衝突偵測。';
COMMENT ON COLUMN cost_configurations.display_group IS
  'UI 分組：drawing/material_3d/material_jewelry/shipping/addon/misc';
COMMENT ON COLUMN cost_configurations.is_deprecated IS
  '已棄用 key 標記。TRUE = UI 隱藏但保留歷史記錄，禁止 DELETE。';


-- ============================================================
-- PART 2: Rename v1 keys → v2.1 naming convention
-- ============================================================

UPDATE cost_configurations
SET config_key = 'drawing_cost_fixed_per_order',
    display_name = '繪圖固定費 / 單',
    description = '每單一次性固定繪圖成本（v1: drawing_cost_per_order）',
    schema_version = 'v2',
    display_group = 'misc',
    updated_at = NOW()
WHERE config_key = 'drawing_cost_per_order';

UPDATE cost_configurations
SET config_key = 'addon_cost_wool_felt',
    display_name = '羊毛氈加購配件成本',
    description = '羊毛氈公仔加購件成本（v1: wool_felt_addon_cost）',
    schema_version = 'v2',
    display_group = 'addon',
    updated_at = NOW()
WHERE config_key = 'wool_felt_addon_cost';

UPDATE cost_configurations
SET config_key = 'addon_cost_light',
    display_name = '燈飾加購配件成本',
    description = '燈飾加購件成本（v1: light_addon_cost）',
    schema_version = 'v2',
    display_group = 'addon',
    updated_at = NOW()
WHERE config_key = 'light_addon_cost';


-- ============================================================
-- PART 3: Update display_group for 3 inherited v1 keys
-- ============================================================

UPDATE cost_configurations
SET display_group = 'misc', schema_version = 'v2', updated_at = NOW()
WHERE config_key = 'printing_cost_per_cm2';

UPDATE cost_configurations
SET display_group = 'shipping', schema_version = 'v2', updated_at = NOW()
WHERE config_key = 'shipping_cost_standard';

UPDATE cost_configurations
SET display_group = 'shipping', schema_version = 'v2', updated_at = NOW()
WHERE config_key = 'shipping_cost_sf';


-- ============================================================
-- PART 4: INSERT 11 new v2 keys
-- ============================================================

INSERT INTO cost_configurations
  (config_key, config_value, display_name, data_type, description, display_group, schema_version)
VALUES
  -- GROUP A: 繪圖成本（4 tier, Product Bible V3.7 §1）
  ('drawing_cost_baby_s',    '60',  '嬰兒/大寶 掃描建模 (S) 繪圖費',     'number',
   'Bible §1: 嬰兒/大寶 S = $60。大寶（4歲+）與嬰兒共享此成本。', 'drawing', 'v2'),

  ('drawing_cost_baby_p',    '110', '嬰兒/大寶 照片建模 (P) 繪圖費',     'number',
   'Bible §1: 嬰兒/大寶 P = $110。照片建模，無需現場製模。', 'drawing', 'v2'),

  ('drawing_cost_adult_s',   '110', '成人 掃描建模 (S) 繪圖費（限玻璃瓶）', 'number',
   'Bible §1: 成人 S = $110，僅限玻璃瓶套裝使用，不單獨銷售。', 'drawing', 'v2'),

  ('drawing_cost_adult_p',   '240', '成人 照片建模 (P) 繪圖費',           'number',
   'Bible §1: 成人 P = $240（頂級成本）。適用 成人(P)鎖匙扣/吊飾。', 'drawing', 'v2'),

  -- GROUP B: 立體擺設物料（2肢/4肢 同成本）
  ('material_cost_woodframe', '210', '木框套裝物料成本',                   'number',
   '木框套裝 2肢 及 4肢 物料成本相同（售價不同）。無繪圖費，繪圖由各肢 drawing key 承擔。', 'material_3d', 'v2'),

  ('material_cost_glassjar',  '210', '玻璃瓶套裝物料成本',                 'number',
   '玻璃瓶套裝 2肢 及 4肢 物料成本相同（售價不同）。', 'material_3d', 'v2'),

  -- GROUP C: 飾品物料（4 材質，Fat Mo 後續更新實際值）
  ('material_cost_keychain_stainless', '0', '鎖匙扣 - 不銹鋼物料',        'number',
   '適用 SKU 含「鎖匙扣 - 不銹鋼」。飾數增加時金屬用量倍增，需 Fat Mo 確認單飾成本。', 'material_jewelry', 'v2'),

  ('material_cost_keychain_alloy',     '0', '鎖匙扣 - 鋁合金物料',        'number',
   '適用 SKU 含「鎖匙扣 - 鋁合金」。鋁合金通常低於不銹鋼。', 'material_jewelry', 'v2'),

  ('material_cost_necklace_silver',    '0', '吊飾 - 925銀物料',            'number',
   '適用 SKU 含「吊飾 - 925銀」。Bible §3: 金銀同價。', 'material_jewelry', 'v2'),

  ('material_cost_necklace_gold',      '0', '吊飾 - 925金物料',            'number',
   '適用 SKU 含「吊飾 - 925金」。Bible §3: 金銀同價，與 necklace_silver 相同值。', 'material_jewelry', 'v2'),

  -- MISC: 鎖匙扣多件運費扣減（Product Bible §2.5）
  ('keychain_shipping_deduction_per_extra', '20', '鎖匙扣多件運費扣減 / 件', 'number',
   'Bible §2.5: (N-1) × $20，N = 同訂單鎖匙扣 order_items 總數。計算在訂單層級。', 'misc', 'v2')

ON CONFLICT (config_key) DO NOTHING;
-- DO NOTHING：保護已有值（首次部署後 Fat Mo 更新）


-- ============================================================
-- PART 5: Set schema_version = 'v2' on addon keys (inserted in 0020 seed)
-- (already renamed in PART 2 above; this is for any edge case where rename failed)
-- ============================================================

UPDATE cost_configurations
SET schema_version = 'v2'
WHERE schema_version = 'v1' OR schema_version IS NULL;


COMMENT ON TABLE cost_configurations IS
  '集中式成本參數設定表 v2.1（17 keys, 5 groups）。
   所有寫入通過 fhs_upsert_cost_config RPC（帶樂觀鎖）。禁止前端直接 INSERT/UPDATE。
   Key 命名規範：GROUP_NOUN_QUALIFIER，如 drawing_cost_baby_s。
   參考：.fhs/ai/FHS_Product_Cost_Schema_v2.md';
