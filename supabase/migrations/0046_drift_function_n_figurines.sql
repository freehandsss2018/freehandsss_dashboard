-- Migration 0046: fhs_check_product_cost_drift() N飾維度擴充
-- S124 v2 後續：0042 的 drift 函式用舊平值公式（全 N飾同一 drawing+material+clasp），
-- S124 v2 已將 products.total_base_cost 改為 per-set 動態值（fhs_compute_keychain_cost）。
-- 本次更新 drift 函式，使比對公式對齊 0045 RPC 的 N飾維度計算。
-- Created: 2026-06-26

-- ============================================================
-- 更新 fhs_check_product_cost_drift()：引入 item_per_set 維度
-- 覆蓋範圍維持：嬰兒 S/P 不銹鋼鎖匙扣（其餘 tier 未驗證，刻意不納）
-- 回傳欄位結構變更（新增 mode, item_per_set），須先 DROP 再建
-- ============================================================
DROP FUNCTION IF EXISTS public.fhs_check_product_cost_drift();

CREATE OR REPLACE FUNCTION public.fhs_check_product_cost_drift()
RETURNS TABLE (
  sku                TEXT,
  mode               TEXT,
  item_per_set       INTEGER,
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
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')             AS drawing_baby_s,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')             AS drawing_baby_p,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_keychain_stainless') AS material_stainless,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'keychain_clasp_cost')             AS clasp_cost
  )
  SELECT
    p.sku::TEXT,
    p.mode::TEXT,
    p.item_per_set,
    p.total_base_cost,
    fhs_compute_keychain_cost(
      a.material_stainless,
      p.item_per_set,
      CASE
        WHEN p.mode = '加購' THEN 0
        WHEN p.mode = '單購' AND p.sku LIKE '嬰兒(P)%' THEN a.drawing_baby_p
        WHEN p.mode = '單購' THEN a.drawing_baby_s
        ELSE 0
      END
    ) AS expected_base_cost,
    p.total_base_cost - fhs_compute_keychain_cost(
      a.material_stainless,
      p.item_per_set,
      CASE
        WHEN p.mode = '加購' THEN 0
        WHEN p.mode = '單購' AND p.sku LIKE '嬰兒(P)%' THEN a.drawing_baby_p
        WHEN p.mode = '單購' THEN a.drawing_baby_s
        ELSE 0
      END
    ) AS drift
  FROM products p, atoms a
  WHERE (p.sku LIKE '嬰兒鎖匙扣 - 不銹鋼%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 不銹鋼%')
    AND p.mode IN ('加購', '單購')
    AND p.item_per_set > 0
    AND a.drawing_baby_s IS NOT NULL
    AND a.drawing_baby_p IS NOT NULL
    AND a.material_stainless IS NOT NULL
    AND a.clasp_cost IS NOT NULL
  ORDER BY p.sku, p.mode;
$$;

COMMENT ON FUNCTION public.fhs_check_product_cost_drift() IS
  'S124 v2 (0046): 唯讀比對 products.total_base_cost 與 fhs_compute_keychain_cost() 期望值。'
  '範圍：嬰兒 S/P 不銹鋼鎖匙扣，支援 N飾（item_per_set）維度。'
  '加購：drawing_fee=0；單購 S：drawing_fee=drawing_cost_baby_s；單購 P：drawing_fee=drawing_cost_baby_p。'
  'drift=0 = 一致；drift≠0 = products 成本未同步至 cost_configurations atom 組裝值。'
  '其餘 tier（家庭/成人/鋁合金/吊飾/立體擺設）刻意不覆蓋（公式未驗證）。';

-- ============================================================
-- Smoke Test：S124 v2 後所有嬰兒不銹鋼 S/P N飾 rows 應 drift=0
-- ============================================================
DO $$
DECLARE
  _total_count    INTEGER;
  _bad_drift_count INTEGER;
BEGIN
  -- 函式可執行且覆蓋到嬰兒 S/P 不銹鋼 rows
  SELECT COUNT(*) INTO _total_count FROM fhs_check_product_cost_drift();
  IF _total_count = 0 THEN
    RAISE EXCEPTION '0046 Smoke FAIL: fhs_check_product_cost_drift() 回傳 0 列，預期有嬰兒 S/P 不銹鋼 N飾 rows';
  END IF;
  RAISE NOTICE '0046 Smoke: fhs_check_product_cost_drift() 覆蓋 % 筆', _total_count;

  -- S124 v2 products UPDATE 後，全部應 drift=0
  SELECT COUNT(*) INTO _bad_drift_count
  FROM fhs_check_product_cost_drift()
  WHERE drift <> 0;

  IF _bad_drift_count > 0 THEN
    RAISE EXCEPTION '0046 Smoke FAIL: 發現 % 筆 drift<>0。請確認 S124 v2 線B (products UPDATE) 已完成。', _bad_drift_count;
  END IF;

  RAISE NOTICE '[0046] fhs_check_product_cost_drift() N飾擴充 Smoke PASS (% 筆全 drift=0)', _total_count;
END $$;
