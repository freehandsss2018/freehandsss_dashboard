-- 0059_drift_check_full_category_coverage.sql
-- Phase 2 成本架構全品類漂移偵測網（Fat Mo 拍板 2026-07-18，flow_id 2026-07-18-2105）
--
-- 擴充 fhs_check_product_cost_drift() 覆蓋範圍：
--   舊版（migration 0057）僅覆蓋：嬰兒不銹鋼鎖匙扣 + 吊飾全 tier（惟家庭吊飾用單一成人式，
--   經本次 Phase 2 證實為錯，已於 migration 0058 修復為 composite，本檔同步修正 drift 判斷式）
--   新增：嬰兒鋁合金鎖匙扣、成人/家庭鎖匙扣（不銹鋼+鋁合金，composite）、立體擺設、配件、
--   base_row 監測（佔位 row 若被誤填非零值即報 drift）
--
-- Reference: artifacts/2026-07-18-2105/cl-final-plan.md

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

  -- 既有：嬰兒不銹鋼鎖匙扣（S124 v2 終態，不變）
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

  -- 新增（Phase 2）：嬰兒鋁合金鎖匙扣
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

  -- 新增（Phase 2）：成人/家庭鎖匙扣（不銹鋼+鋁合金，composite 畫圖式）
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

  -- 既有（修正）：吊飾全 tier，家庭系列改用 composite 畫圖式（Phase 2 修正，原單一成人式已證錯）
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
      AND a.drawing_baby_s IS NOT NULL AND a.drawing_baby_p IS NOT NULL
      AND a.drawing_adult_s IS NOT NULL AND a.drawing_adult_p IS NOT NULL
      AND a.material_silver IS NOT NULL AND a.material_gold IS NOT NULL
  ),

  -- 新增（Phase 2）：立體擺設（木框/玻璃瓶，2肢/4肢同價，migration 0030 已定案）
  handmodel_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      (CASE WHEN p.sku LIKE '%木框%' THEN a.material_woodframe ELSE a.material_glassjar END) AS expected
    FROM products p, atoms a
    WHERE (p.sku LIKE '%木框套裝%' OR p.sku LIKE '%玻璃瓶套裝%')
      AND a.material_woodframe IS NOT NULL AND a.material_glassjar IS NOT NULL
  ),

  -- 新增（Phase 2）：配件（羊毛氈/燈飾加購）
  addon_expected AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      (CASE WHEN p.sku LIKE '%羊毛氈%' THEN a.addon_wool_felt ELSE a.addon_light END) AS expected
    FROM products p, atoms a
    WHERE (p.sku LIKE '%羊毛氈公仔%' OR p.sku LIKE '%燈飾%')
      AND a.addon_wool_felt IS NOT NULL AND a.addon_light IS NOT NULL
  ),

  -- 新增（Phase 2）：零成本佔位 row 監測——若日後被誤填非零值即報 drift（expected 固定=0）
  -- 修正（apply 後即時發現）：初版誤將立體擺設（mode='無'）同家庭吊飾 3飾(加貼)（mode='無'）
  -- 呢啲合法非加購/單購產品當做應為 0 嘅佔位 row，令兩者出現假陽性 drift。
  -- 收窄為只監測未被 handmodel/charm/addon/keychain_family_adult 分支驗證過嘅孤兒 row。
  base_row_monitor AS (
    SELECT
      p.sku::TEXT AS sku, p.mode::TEXT AS mode, p.item_per_set, p.total_base_cost,
      0::NUMERIC AS expected
    FROM products p
    WHERE p.mode NOT IN ('加購', '單購')
      AND p.total_base_cost <> 0
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
