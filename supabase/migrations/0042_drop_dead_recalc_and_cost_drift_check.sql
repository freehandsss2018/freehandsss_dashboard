-- Migration 0042: 移除死碼 recalculate_product_costs + 新增唯讀 drift 比對函式
--
-- 背景（Session 112，訂單 06001008 誤判事故）：
--   Fat Mo 將 cost_configurations.material_cost_keychain_stainless 改為 115，
--   懷疑 order_items/products 成本未同步。經 live 查證：
--   - 185（嬰兒S不銹鋼鎖匙扣 base）= drawing_baby_s(60) + material_stainless(115) + keychain_clasp_cost(10)，數字正確
--   - 但 products.total_base_cost 確實「無傳播機制」：cost_configurations 變更後沒有任何 RPC
--     會回算 products 表，這次數字剛好對是巧合（seed 本來就用 115 算的）
--   - recalculate_product_costs(text) 是 v1 schema 遺留死碼：引用 cc.id/cc.drawing_cost/
--     cc.clasp_cost 等已不存在的欄位（現行 cost_configurations 是 key-value schema），
--     呼叫必定報錯，從未也不可能正常工作
--
-- 本次範圍（v2 Phase 1，止血 + 可觀測，故意不蓋第二個成本組裝引擎）：
--   1. DROP 死碼 recalculate_product_costs，避免誤用
--   2. CREATE fhs_check_product_cost_drift()：唯讀比對 products.total_base_cost 與
--      atom 組裝值是否一致，僅覆蓋本次已用 live 數據數學驗證過的「嬰兒 S/P 不銹鋼鎖匙扣」
--      兩個 tier。其餘 tier（家庭 S1/S2/P1/P2、成人、鋁合金、吊飾、立體擺設等）公式
--      未驗證，刻意不覆蓋，避免重蹈「recipe 脆弱、靜默算錯」風險——已確認
--      material_cost_keychain_alloy（嬰兒鋁合金材質原子）在 live cost_configurations
--      根本不存在 key，無法安全擴大範圍。
--   完整覆蓋規劃見 Phase 2（另開 /cl-flow 成本組裝單一真源重構）。

-- ============================================================
-- PART 1: 移除死碼
-- ============================================================
DROP FUNCTION IF EXISTS public.recalculate_product_costs(text);

-- ============================================================
-- PART 2: 唯讀 drift 比對函式（不覆蓋的 tier 一律不出現在結果中，不假裝完整）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_check_product_cost_drift()
RETURNS TABLE (
  sku                TEXT,
  tier               TEXT,
  current_base_cost  NUMERIC,
  expected_base_cost NUMERIC,
  drift              NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH atoms AS (
    SELECT
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')          AS drawing_baby_s,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')          AS drawing_baby_p,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_keychain_stainless') AS material_stainless,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'keychain_clasp_cost')          AS clasp_cost
  )
  SELECT
    p.sku,
    CASE
      WHEN p.sku LIKE '嬰兒(P)鎖匙扣 - 不銹鋼%' THEN 'baby_P_stainless'
      ELSE 'baby_S_stainless'
    END AS tier,
    p.total_base_cost,
    CASE
      WHEN p.sku LIKE '嬰兒(P)鎖匙扣 - 不銹鋼%'
        THEN a.drawing_baby_p + a.material_stainless + a.clasp_cost
      ELSE a.drawing_baby_s + a.material_stainless + a.clasp_cost
    END AS expected_base_cost,
    p.total_base_cost - CASE
      WHEN p.sku LIKE '嬰兒(P)鎖匙扣 - 不銹鋼%'
        THEN a.drawing_baby_p + a.material_stainless + a.clasp_cost
      ELSE a.drawing_baby_s + a.material_stainless + a.clasp_cost
    END AS drift
  FROM products p, atoms a
  WHERE (p.sku LIKE '嬰兒鎖匙扣 - 不銹鋼%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 不銹鋼%')
    AND p.cost_config_id IS NOT NULL  -- 排除無「N飾」後綴的範本佔位列（total_base_cost=0，非真實可售品項）
    AND a.drawing_baby_s IS NOT NULL
    AND a.drawing_baby_p IS NOT NULL
    AND a.material_stainless IS NOT NULL
    AND a.clasp_cost IS NOT NULL
  ORDER BY p.sku;
$$;

COMMENT ON FUNCTION public.fhs_check_product_cost_drift() IS
  'Session 112: 唯讀比對 products.total_base_cost 與 cost_configurations atom 組裝值。'
  '範圍限定：僅嬰兒 S/P 不銹鋼鎖匙扣（已用 live 數據數學驗證之公式）。'
  '其餘 tier（家庭/成人/鋁合金/吊飾/立體擺設）刻意不覆蓋，避免未驗證公式造成誤導性 drift 判定。'
  '若回傳 0 列且預期應有資料，檢查 atoms CTE 的 4 個 config_key 是否仍存在於 cost_configurations。'
  'Phase 2（完整覆蓋）另開 /cl-flow 規劃。';

-- ============================================================
-- PART 3: Smoke Test
-- ============================================================
DO $$
DECLARE
  _drift_count INTEGER;
  _bad_drift_count INTEGER;
  _dead_fn_exists BOOLEAN;
BEGIN
  -- 3a: 死碼已移除
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'recalculate_product_costs'
  ) INTO _dead_fn_exists;
  IF _dead_fn_exists THEN
    RAISE EXCEPTION '0042 Smoke FAIL PART1: recalculate_product_costs 仍存在，DROP 失敗';
  END IF;
  RAISE NOTICE '0042 PART1 PASS: recalculate_product_costs 已移除';

  -- 3b: drift 函式可執行且本次已知案例（185/235）應為 0 drift
  SELECT COUNT(*) INTO _drift_count FROM fhs_check_product_cost_drift();
  IF _drift_count = 0 THEN
    RAISE EXCEPTION '0042 Smoke FAIL PART2: fhs_check_product_cost_drift() 回傳 0 列，預期應覆蓋嬰兒 S/P 不銹鋼鎖匙扣 SKU';
  END IF;

  SELECT COUNT(*) INTO _bad_drift_count FROM fhs_check_product_cost_drift() WHERE drift <> 0;
  IF _bad_drift_count > 0 THEN
    RAISE EXCEPTION '0042 Smoke FAIL PART2: 發現 % 筆 drift<>0，預期本次驗證範圍應為 0（185/235 已人工核實正確）', _bad_drift_count;
  END IF;
  RAISE NOTICE '0042 PART2 PASS: fhs_check_product_cost_drift() 回傳 % 筆，全數 drift=0', _drift_count;
END $$;