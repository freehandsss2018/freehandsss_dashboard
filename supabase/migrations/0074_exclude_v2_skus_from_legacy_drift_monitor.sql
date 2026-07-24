-- Migration 0074: 舊 fhs_check_product_cost_drift() 嘅 base_row_monitor（孤兒row監測器）
-- 誤將 Phase1 新增嘅 16 個 (V2) 統一SKU 當成「未知mode孤兒row」，全部標記假陽性漂移。
-- 根因：base_row_monitor 監測「mode NOT IN ('加購','單購')」嘅非零成本row，
--       新SKU用 mode='S'/'P'（新語意），撞入呢個catch-all，expected強制當0。
-- 修正：base_row_monitor 明確排除 sku LIKE '%(V2)' 嘅row——呢批已經有專屬監測器
--       fhs_verify_new_sku_costs()（migration 0073），兩個監測範圍從此不重疊。
-- 純 WHERE 子句新增排除條件，冇改動任何其他分支/定價邏輯。

CREATE OR REPLACE FUNCTION public.fhs_check_product_cost_drift()
 RETURNS TABLE(sku text, mode text, item_per_set integer, current_base_cost numeric, expected_base_cost numeric, drift numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH atoms AS (
    SELECT
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_baby_s')                    AS drawing_baby_s,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_baby_p')                    AS drawing_baby_p,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_adult_s')                   AS drawing_adult_s,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'drawing_cost_adult_p')                   AS drawing_adult_p,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_keychain_stainless')       AS material_stainless,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_keychain_alloy')          AS material_alloy,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_keychain_stainless_adult') AS material_stainless_adult,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_keychain_alloy_adult')     AS material_alloy_adult,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'keychain_clasp_cost')                    AS clasp_cost,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_necklace_silver')          AS material_silver,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_necklace_gold')            AS material_gold,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_woodframe')                AS material_woodframe,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'material_cost_glassjar')                 AS material_glassjar,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'addon_cost_wool_felt')                   AS addon_wool_felt,
      (SELECT config_value::NUMERIC FROM cost_configurations WHERE config_key = 'addon_cost_light')                       AS addon_light
  ),

  keychain_baby_stainless_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      fhs_compute_keychain_cost(
        a.material_stainless,
        p.item_per_set,
        CASE
          WHEN p.mode = '加購' THEN 0
          WHEN p.mode = '單購' AND p.sku LIKE '嬰兒(P)%' THEN a.drawing_baby_p
          WHEN p.mode = '單購' THEN a.drawing_baby_s
          ELSE 0
        END
      ) AS expected
    FROM products p, atoms a
    WHERE (p.sku LIKE '嬰兒鎖匙扣 - 不銹鋼%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 不銹鋼%')
      AND p.mode IN ('加購', '單購')
      AND p.item_per_set > 0
      AND a.drawing_baby_s IS NOT NULL AND a.drawing_baby_p IS NOT NULL
      AND a.material_stainless IS NOT NULL AND a.clasp_cost IS NOT NULL
  ),

  keychain_baby_alloy_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      fhs_compute_keychain_cost(
        a.material_alloy,
        p.item_per_set,
        CASE
          WHEN p.mode = '加購' THEN 0
          WHEN p.mode = '單購' AND p.sku LIKE '嬰兒(P)%' THEN a.drawing_baby_p
          WHEN p.mode = '單購' THEN a.drawing_baby_s
          ELSE 0
        END
      ) AS expected
    FROM products p, atoms a
    WHERE (p.sku LIKE '嬰兒鎖匙扣 - 鋁合金%' OR p.sku LIKE '嬰兒(P)鎖匙扣 - 鋁合金%')
      AND p.mode IN ('加購', '單購')
      AND p.item_per_set > 0
      AND a.material_alloy IS NOT NULL AND a.clasp_cost IS NOT NULL
  ),

  keychain_family_adult_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      fhs_compute_keychain_cost(
        CASE WHEN p.sku LIKE '%鋁合金%' THEN a.material_alloy_adult ELSE a.material_stainless_adult END,
        p.item_per_set,
        CASE
          WHEN p.mode = '加購' THEN 0
          WHEN p.sku LIKE '成人(P)%' THEN a.drawing_adult_p
          WHEN p.sku LIKE '家庭(S1)%' THEN a.drawing_adult_s + 1 * a.drawing_baby_s
          WHEN p.sku LIKE '家庭(S2)%' THEN a.drawing_adult_s + 2 * a.drawing_baby_s
          WHEN p.sku LIKE '家庭(P1)%' THEN a.drawing_adult_p + 1 * a.drawing_baby_p
          WHEN p.sku LIKE '家庭(P2)%' THEN a.drawing_adult_p + 2 * a.drawing_baby_p
          ELSE 0
        END
      ) AS expected
    FROM products p, atoms a
    WHERE p.sku LIKE '%鎖匙扣%'
      AND (p.sku LIKE '%成人%' OR p.sku LIKE '%家庭%')
      AND p.mode IN ('加購', '單購')
      AND p.item_per_set > 0
      AND a.material_stainless_adult IS NOT NULL AND a.material_alloy_adult IS NOT NULL
  ),

  charm_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      fhs_compute_charm_cost(
        CASE
          WHEN p.sku LIKE '%加購%' OR p.sku LIKE '%加貼%' THEN 0
          WHEN p.sku LIKE '嬰兒(P)%' THEN a.drawing_baby_p
          WHEN p.sku LIKE '嬰兒%' THEN a.drawing_baby_s
          WHEN p.sku LIKE '成人(P)%' THEN a.drawing_adult_p
          WHEN p.sku LIKE '家庭(S1)%' THEN a.drawing_adult_s + 1 * a.drawing_baby_s
          WHEN p.sku LIKE '家庭(S2)%' THEN a.drawing_adult_s + 2 * a.drawing_baby_s
          WHEN p.sku LIKE '家庭(P1)%' THEN a.drawing_adult_p + 1 * a.drawing_baby_p
          WHEN p.sku LIKE '家庭(P2)%' THEN a.drawing_adult_p + 2 * a.drawing_baby_p
          ELSE 0
        END,
        CASE WHEN p.sku LIKE '%925金%' THEN a.material_gold ELSE a.material_silver END,
        p.item_per_set
      ) AS expected
    FROM products p, atoms a
    WHERE p.sku LIKE '%吊飾%'
      AND (p.sku LIKE '%925銀%' OR p.sku LIKE '%925金%')
      AND p.total_base_cost > 0
      AND p.item_per_set > 0
      AND p.sku NOT LIKE '%(V2)'  -- ★0074修正：新統一SKU排除，改用 fhs_verify_new_sku_costs() 監測
      AND a.drawing_baby_s IS NOT NULL AND a.drawing_baby_p IS NOT NULL
      AND a.drawing_adult_s IS NOT NULL AND a.drawing_adult_p IS NOT NULL
      AND a.material_silver IS NOT NULL AND a.material_gold IS NOT NULL
  ),

  handmodel_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      (CASE WHEN p.sku LIKE '%木框%' THEN a.material_woodframe ELSE a.material_glassjar END) AS expected
    FROM products p, atoms a
    WHERE (p.sku LIKE '%木框套裝%' OR p.sku LIKE '%玻璃瓶套裝%')
      AND a.material_woodframe IS NOT NULL AND a.material_glassjar IS NOT NULL
  ),

  addon_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      (CASE WHEN p.sku LIKE '%羊毛氈%' THEN a.addon_wool_felt ELSE a.addon_light END) AS expected
    FROM products p, atoms a
    WHERE (p.sku LIKE '%羊毛氈公仔%' OR p.sku LIKE '%燈飾%')
      AND a.addon_wool_felt IS NOT NULL AND a.addon_light IS NOT NULL
  ),

  -- 修正版：只監測未被上述任何分支驗證過嘅孤兒 row（真正無主的非加購/單購非零成本）
  -- ★0074修正：明確排除 (V2) 新統一SKU（改由 fhs_verify_new_sku_costs() 專屬監測，見 migration 0073）
  base_row_monitor AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      0::NUMERIC AS expected
    FROM products p
    WHERE p.mode NOT IN ('加購', '單購')
      AND p.total_base_cost <> 0
      AND p.sku NOT LIKE '%(V2)'  -- ★0074修正：新統一SKU（mode='S'/'P'）不屬呢個「未知孤兒」監測範圍
      AND NOT EXISTS (SELECT 1 FROM handmodel_expected h WHERE h.sku = p.sku AND h.mode = p.mode)
      AND NOT EXISTS (SELECT 1 FROM charm_expected c WHERE c.sku = p.sku AND c.mode = p.mode)
      AND NOT EXISTS (SELECT 1 FROM addon_expected ad WHERE ad.sku = p.sku AND ad.mode = p.mode)
      AND NOT EXISTS (SELECT 1 FROM keychain_family_adult_expected k WHERE k.sku = p.sku AND k.mode = p.mode)
  )

  SELECT sku, mode, item_per_set, total_base_cost AS current_base_cost, expected AS expected_base_cost,
         total_base_cost - expected AS drift
  FROM keychain_baby_stainless_expected
  UNION ALL
  SELECT sku, mode, item_per_set, total_base_cost, expected, total_base_cost - expected
  FROM keychain_baby_alloy_expected
  UNION ALL
  SELECT sku, mode, item_per_set, total_base_cost, expected, total_base_cost - expected
  FROM keychain_family_adult_expected
  UNION ALL
  SELECT sku, mode, item_per_set, total_base_cost, expected, total_base_cost - expected
  FROM charm_expected
  UNION ALL
  SELECT sku, mode, item_per_set, total_base_cost, expected, total_base_cost - expected
  FROM handmodel_expected
  UNION ALL
  SELECT sku, mode, item_per_set, total_base_cost, expected, total_base_cost - expected
  FROM addon_expected
  UNION ALL
  SELECT sku, mode, item_per_set, total_base_cost, expected, total_base_cost - expected
  FROM base_row_monitor
  ORDER BY sku, mode;
$function$;

-- Smoke test：舊SKU零漂移 + 新SKU (V2) 完全唔再出現喺呢個函式嘅結果入面
DO $$
DECLARE
    v_total_drift INTEGER;
    v_v2_leak INTEGER;
BEGIN
    SELECT count(*) INTO v_total_drift FROM fhs_check_product_cost_drift() WHERE drift <> 0;
    IF v_total_drift <> 0 THEN
        RAISE EXCEPTION '修正後仍有 % 行漂移，未達零漂移', v_total_drift;
    END IF;

    SELECT count(*) INTO v_v2_leak FROM fhs_check_product_cost_drift() WHERE sku LIKE '%(V2)';
    IF v_v2_leak <> 0 THEN
        RAISE EXCEPTION '(V2) 新SKU仍然滲入舊drift監測範圍，排除條件失效';
    END IF;
END $$;
