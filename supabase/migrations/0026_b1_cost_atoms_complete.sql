-- ============================================================
-- Migration 0026 — B1 成本引擎補完：吊飾/鎖匙扣打印費 + 環扣原子
-- ============================================================
-- Purpose:
--   B1「前端顯示權威化」：補完 calculatePricing() 所需原子成本 key。
--   不建表，不改表結構，ON CONFLICT(config_key) DO UPDATE 安全冪等。
--
-- 本 migration 執行：
--   PART 1: UPDATE necklace_silver/gold 由 0 → 260/316
--   PART 2: INSERT 鎖匙扣成人打印費（stainless/alloy _adult = 135）
--   PART 3: INSERT 鎖匙扣環扣成本（keychain_clasp_cost = 10）
--   PART 4: UPDATE 既有 stainless/alloy display_name 補「（嬰兒）」
--   PART 5: Smoke tests（每 PART 獨立驗收）
--
-- 注意：
--   - base shipping 不新增 key（C2 裁定）：引擎複用
--     charm_shipping_deduction_per_extra($35) / keychain_shipping_deduction_per_extra($20)
--   - material→printing 語義命名 deferred 至 PRM v2 P2
--   - 三端一致（n8n 信任前端）deferred 至 B2
--
-- Rollback:
--   UPDATE cost_configurations SET config_value='0'
--     WHERE config_key IN ('material_cost_necklace_silver','material_cost_necklace_gold');
--   DELETE FROM cost_configurations
--     WHERE config_key IN ('material_cost_keychain_stainless_adult',
--                          'material_cost_keychain_alloy_adult',
--                          'keychain_clasp_cost');
--   UPDATE cost_configurations
--     SET display_name = REPLACE(REPLACE(display_name,'（嬰兒）',''),' （嬰兒）','')
--     WHERE config_key IN ('material_cost_keychain_stainless','material_cost_keychain_alloy');
-- ============================================================


-- ============================================================
-- PART 1: UPDATE 吊飾打印費 0 → 260 / 316
-- ============================================================

UPDATE cost_configurations
SET
  config_value   = '260',
  description    = '吊飾（925銀）打印/鑄造費，跨所有對象一致（嬰兒/成人/家庭均為 $260）。'
                   || 'Airtable Base_Costs Printing_Cost 銀吊飾基準。',
  schema_version = 'v2',
  is_deprecated  = false
WHERE config_key = 'material_cost_necklace_silver';

UPDATE cost_configurations
SET
  config_value   = '316',
  description    = '吊飾（925金）打印/鑄造費，跨所有對象一致（嬰兒/成人/家庭均為 $316）。'
                   || '比銀吊飾多 $56（鍍金工序）。Airtable Base_Costs Printing_Cost 金吊飾基準。',
  schema_version = 'v2',
  is_deprecated  = false
WHERE config_key = 'material_cost_necklace_gold';


-- ============================================================
-- PART 2: INSERT 鎖匙扣成人打印費（家庭/成人層 = $135，兩材質相同）
-- ============================================================

INSERT INTO cost_configurations
  (config_key, config_value, display_name, data_type, description, display_group, schema_version)
VALUES
  ('material_cost_keychain_stainless_adult', '135',
   '鎖匙扣 - 不銹鋼物料（成人）',
   'number',
   '鎖匙扣（不銹鋼）成人/家庭層打印/鑄造費 = $135。'
   || '對應 Airtable Base_Costs 家庭(S/P) 不銹鋼 Printing_Cost。'
   || '嬰兒層另見 material_cost_keychain_stainless（$95）。',
   'material_jewelry', 'v2'),

  ('material_cost_keychain_alloy_adult', '135',
   '鎖匙扣 - 鋁合金物料（成人）',
   'number',
   '鎖匙扣（鋁合金）成人/家庭層打印/鑄造費 = $135。'
   || '對應 Airtable Base_Costs 家庭(S/P) 鋁合金 Printing_Cost。'
   || '嬰兒層另見 material_cost_keychain_alloy（$122）。',
   'material_jewelry', 'v2')
ON CONFLICT (config_key) DO UPDATE
  SET config_value   = EXCLUDED.config_value,
      display_name   = EXCLUDED.display_name,
      description    = EXCLUDED.description,
      display_group  = EXCLUDED.display_group,
      schema_version = EXCLUDED.schema_version,
      is_deprecated  = false;


-- ============================================================
-- PART 3: INSERT 鎖匙扣環扣成本（keychain_clasp_cost = 10）
-- ============================================================

INSERT INTO cost_configurations
  (config_key, config_value, display_name, data_type, description, display_group, schema_version)
VALUES
  ('keychain_clasp_cost', '10',
   '鎖匙扣環扣成本 / 件',
   'number',
   '每個鎖匙扣的金屬環扣配件費 = $10/件，兩種材質（不銹鋼/鋁合金）一致。'
   || '對應 Airtable Base_Costs Clasp_Cost（鎖匙扣）。'
   || '注意：吊飾的 Clasp 欄位代表頸鏈（$100），由 necklace_chain_cost 管理，非本 key。',
   'material_jewelry', 'v2')
ON CONFLICT (config_key) DO UPDATE
  SET config_value   = EXCLUDED.config_value,
      display_name   = EXCLUDED.display_name,
      description    = EXCLUDED.description,
      display_group  = EXCLUDED.display_group,
      schema_version = EXCLUDED.schema_version,
      is_deprecated  = false;


-- ============================================================
-- PART 4: UPDATE 既有嬰兒層 display_name 補「（嬰兒）」
-- ============================================================

UPDATE cost_configurations
SET display_name = '鎖匙扣 - 不銹鋼物料（嬰兒）'
WHERE config_key = 'material_cost_keychain_stainless'
  AND display_name NOT LIKE '%（嬰兒）%';

UPDATE cost_configurations
SET display_name = '鎖匙扣 - 鋁合金物料（嬰兒）'
WHERE config_key = 'material_cost_keychain_alloy'
  AND display_name NOT LIKE '%（嬰兒）%';


-- ============================================================
-- PART 5: Smoke Tests（每 PART 獨立，防靜默失敗）
-- ============================================================

DO $$
DECLARE
  _v TEXT;
BEGIN
  -- PART 1a: silver = 260
  SELECT config_value INTO _v FROM cost_configurations
    WHERE config_key = 'material_cost_necklace_silver';
  IF _v::numeric != 260 THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART1: necklace_silver = %, 預期 260', _v;
  END IF;
  RAISE NOTICE '0026 PART1a PASS: material_cost_necklace_silver = 260';

  -- PART 1b: gold = 316
  SELECT config_value INTO _v FROM cost_configurations
    WHERE config_key = 'material_cost_necklace_gold';
  IF _v::numeric != 316 THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART1: necklace_gold = %, 預期 316', _v;
  END IF;
  RAISE NOTICE '0026 PART1b PASS: material_cost_necklace_gold = 316';

  -- PART 2a: stainless_adult = 135
  SELECT config_value INTO _v FROM cost_configurations
    WHERE config_key = 'material_cost_keychain_stainless_adult';
  IF _v::numeric != 135 THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART2: stainless_adult = %, 預期 135', _v;
  END IF;
  RAISE NOTICE '0026 PART2a PASS: material_cost_keychain_stainless_adult = 135';

  -- PART 2b: alloy_adult = 135
  SELECT config_value INTO _v FROM cost_configurations
    WHERE config_key = 'material_cost_keychain_alloy_adult';
  IF _v::numeric != 135 THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART2: alloy_adult = %, 預期 135', _v;
  END IF;
  RAISE NOTICE '0026 PART2b PASS: material_cost_keychain_alloy_adult = 135';

  -- PART 3: clasp = 10
  SELECT config_value INTO _v FROM cost_configurations
    WHERE config_key = 'keychain_clasp_cost';
  IF _v::numeric != 10 THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART3: keychain_clasp_cost = %, 預期 10', _v;
  END IF;
  RAISE NOTICE '0026 PART3 PASS: keychain_clasp_cost = 10';

  -- PART 4a: stainless display_name contains (嬰兒)
  SELECT display_name INTO _v FROM cost_configurations
    WHERE config_key = 'material_cost_keychain_stainless';
  IF _v NOT LIKE '%嬰兒%' THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART4a: stainless display_name = %, 預期含嬰兒', _v;
  END IF;
  RAISE NOTICE '0026 PART4a PASS: stainless display_name 已補（嬰兒）';

  -- PART 4b: alloy display_name contains (嬰兒)
  SELECT display_name INTO _v FROM cost_configurations
    WHERE config_key = 'material_cost_keychain_alloy';
  IF _v NOT LIKE '%嬰兒%' THEN
    RAISE EXCEPTION '0026 Smoke FAIL PART4b: alloy display_name = %, 預期含嬰兒', _v;
  END IF;
  RAISE NOTICE '0026 PART4b PASS: alloy display_name 已補（嬰兒）';

  RAISE NOTICE '0026 ALL SMOKE TESTS PASSED';
END $$;
