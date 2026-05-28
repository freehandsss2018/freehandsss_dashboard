-- ============================================================
-- Migration 0022b — cost_configurations v2.1 RPC Upgrade
-- ============================================================
-- Purpose:
--   1. Upgrade fhs_upsert_cost_config to 4-param (optimistic lock)
--   2. Keep 3-param overload for backward compatibility
--   3. Create fhs_sync_products_from_config (addon cost mirror)
--   4. Immediate sync call to push addon costs to products table
--
-- Depends on: 0022a (version column must exist)
--
-- Design decisions:
--   - SELECT FOR UPDATE eliminates TOCTOU race in optimistic lock
--   - fhs_sync GRANT TO service_role (not anon — writes products)
--   - 3-param overload forwards to 4-param with NULL version (no lock check)
--
-- Rollback: see .fhs/ai/FHS_Product_Cost_Operations.md §OP-5.2
-- ============================================================


-- ============================================================
-- PART 1: Upgrade fhs_upsert_cost_config (4-param, optimistic lock)
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_upsert_cost_config(
  p_key              TEXT,
  p_value            TEXT,
  p_expected_version INTEGER DEFAULT NULL,
  p_updated_by       TEXT    DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
  v_rows_updated    INTEGER;
BEGIN
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RAISE EXCEPTION 'config_key 不可為空';
  END IF;

  -- SELECT FOR UPDATE: 鎖定此 row，消除 TOCTOU 競爭窗口
  SELECT version INTO v_current_version
  FROM cost_configurations
  WHERE config_key = p_key
  FOR UPDATE;

  -- 樂觀鎖衝突偵測（row 存在 AND 呼叫方提供了 expected version）
  IF v_current_version IS NOT NULL
     AND p_expected_version IS NOT NULL
     AND v_current_version <> p_expected_version THEN
    RAISE EXCEPTION 'version_conflict: expected % but got %',
      p_expected_version, v_current_version
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO cost_configurations (config_key, config_value, version, updated_at, updated_by)
  VALUES (p_key, p_value, 1, NOW(), p_updated_by)
  ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    version      = cost_configurations.version + 1,
    updated_at   = NOW(),
    updated_by   = EXCLUDED.updated_by;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',      true,
    'config_key',   p_key,
    'config_value', p_value,
    'new_version',  COALESCE(v_current_version, 0) + 1,
    'rows',         v_rows_updated
  );
END;
$$;

COMMENT ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, INTEGER, TEXT) IS
  'v2.1 帶樂觀鎖的成本設定寫入。SELECT FOR UPDATE 消除 TOCTOU 競爭。
   p_expected_version = NULL 時跳過版本檢查（強制覆寫模式）。';

GRANT EXECUTE ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, INTEGER, TEXT) TO anon;


-- ============================================================
-- PART 2: 3-param overload（向後相容）
-- 既有呼叫 fhs_upsert_cost_config(key, value, 'dashboard') 繼續有效
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_upsert_cost_config(
  p_key        TEXT,
  p_value      TEXT,
  p_updated_by TEXT DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 轉發至 4-param 版本，不帶 version check（向後相容行為）
  RETURN fhs_upsert_cost_config(p_key, p_value, NULL::INTEGER, p_updated_by);
END;
$$;

COMMENT ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, TEXT) IS
  'v2.1 向後相容重載（3 param）。轉發至 4-param 版本，p_expected_version = NULL。';

GRANT EXECUTE ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, TEXT) TO anon;


-- ============================================================
-- PART 3: fhs_sync_products_from_config
-- 將 addon cost_configurations 值鏡像至 products.total_base_cost
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_sync_products_from_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated    INTEGER := 0;
  v_rows       INTEGER := 0;
  v_wool_cost  NUMERIC;
  v_light_cost NUMERIC;
BEGIN
  -- Advisory lock（transaction 作用域）：避免與 n8n Mirror Prep 並發衝突
  IF NOT pg_try_advisory_xact_lock(hashtext('cost_sync')) THEN
    RAISE EXCEPTION 'sync_in_progress: 另一個 sync 正在執行，請稍後重試';
  END IF;

  -- 取加購成本值（若 key 不存在則 fail-fast，避免靜默清零）
  SELECT config_value::NUMERIC INTO v_wool_cost
  FROM cost_configurations
  WHERE config_key = 'addon_cost_wool_felt' AND is_deprecated = FALSE;

  SELECT config_value::NUMERIC INTO v_light_cost
  FROM cost_configurations
  WHERE config_key = 'addon_cost_light' AND is_deprecated = FALSE;

  IF v_wool_cost IS NULL THEN
    RAISE EXCEPTION 'sync_config_missing: addon_cost_wool_felt key 不存在或已棄用';
  END IF;
  IF v_light_cost IS NULL THEN
    RAISE EXCEPTION 'sync_config_missing: addon_cost_light key 不存在或已棄用';
  END IF;

  -- 更新羊毛氈（0014 已建立此 SKU）
  UPDATE products
  SET total_base_cost = v_wool_cost,
      updated_at      = NOW()
  WHERE sku = '羊毛氈公仔 - 加購';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE WARNING 'sync: sku 羊毛氈公仔 - 加購 not found in products (0014 migration missing?)';
  END IF;
  v_updated := v_updated + v_rows;

  -- 更新燈飾（0019 已建立此 SKU）
  UPDATE products
  SET total_base_cost = v_light_cost,
      updated_at      = NOW()
  WHERE sku = '燈飾 - 加購';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE WARNING 'sync: sku 燈飾 - 加購 not found in products (0019 migration missing?)';
  END IF;
  v_updated := v_updated + v_rows;

  RETURN jsonb_build_object(
    'success',      true,
    'updated_rows', v_updated,
    'wool_cost',    v_wool_cost,
    'light_cost',   v_light_cost
  );
END;
$$;

COMMENT ON FUNCTION fhs_sync_products_from_config IS
  'v2.1 加購配件成本同步：cost_configurations → products.total_base_cost。
   Advisory lock 防並發。兩個 addon SKU 若不存在則 RAISE WARNING（不 fail）。
   GRANT TO service_role（此函式可寫 products，不開放 anon）。
   前端透過 service key 呼叫，或由 n8n 定期觸發。';

-- 限 service_role（SECURITY DEFINER 可寫 products）
GRANT EXECUTE ON FUNCTION fhs_sync_products_from_config() TO service_role;


-- ============================================================
-- PART 4: 立即同步 addon 成本（$30 → products）
-- 0020 seed 的 addon_cost_wool_felt / addon_cost_light 已更名（0022a），值仍為 '0'
-- 此處先設定為 $30，再呼叫 sync
-- ============================================================

SELECT fhs_upsert_cost_config('addon_cost_wool_felt', '30', 'migration_0022b');
SELECT fhs_upsert_cost_config('addon_cost_light',     '30', 'migration_0022b');

-- 直接 UPDATE（sync RPC 需 service_role，migration 以超級用戶身份執行可直接更新）
UPDATE products SET total_base_cost = 30, updated_at = NOW()
WHERE sku IN ('羊毛氈公仔 - 加購', '燈飾 - 加購');
