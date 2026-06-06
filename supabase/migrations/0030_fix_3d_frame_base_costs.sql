-- ============================================================
-- Migration 0030 — 立體擺設 products.total_base_cost 修正
-- ============================================================
-- Purpose:
--   Migration 0023 seeded all 4 立體擺設 SKUs with total_base_cost = 0
--   (placeholder). No subsequent migration or RPC updated these values.
--   fhs_sync_products_from_config() only covers addon products (wool/lights).
--
--   This migration sets the correct total_base_cost = $210 for all 4 SKUs,
--   consistent with:
--     - Airtable Base_Costs: Drawing($60) + Printing($150) = $210
--     - Supabase cost_configurations: material_cost_woodframe = 210
--     - V41 Dashboard UI confirmation text: "立體擺設成本 $210 已計入"
--
-- Root Cause (Session 65 diagnosis):
--   Symptom: orders.handmodel_cost = 0 for ALL 立體擺設 orders.
--   Cause: Smart Cache Strategist reads products.total_base_cost = 0
--          → Calculate Profit packs itemCost = 0 for 立體擺設 items
--          → Mirror Prep writes handmodel_cost = 0 to Supabase/Airtable.
--
-- Cost Basis:
--   $210 = Drawing_Cost($60 per set, flat regardless of limb count)
--          + Printing_Cost($150 material/production cost)
--          (matches material_cost_woodframe AND material_cost_glassjar in
--           cost_configurations, both = 210)
--   Note: 2肢 and 4肢 have identical cost ($210); price difference
--         ($2,080 vs $2,380 木框; $1,380 vs $1,680 玻璃瓶) is in pricing,
--         not production cost. Ref: FHS_Product_Cost_Schema_v2.md §4.2
--
-- Deferred (Task A scope):
--   - Dynamic roll-up from cost_configurations to products via RPC
--   - 四分量 convergence: P_MAIN currently sends Drawing_Cost=$60 but
--     Printing_Cost=$0 in payload. After this fix, convergence check will
--     show delta=$150 (four-col gross $60 vs products.total_base_cost $210).
--     This fires n8nAdjustmentNotes warning (NOT Has_Cost_Error) since
--     V47.17 fix. Acceptable until Task A completes full four-col sync.
--   - chargedPositions overlap: P_MAIN limbs not tracked in chargedPositions
--     Set → K/M items on same limbs charged drawing cost again in front-end
--     display. Deferred investigation: see learnings.md [2026-06-07].
--
-- Rollback:
--   UPDATE products
--   SET total_base_cost = 0, updated_at = NOW()
--   WHERE sku IN (
--     '木框套裝 (4肢)', '木框套裝 (2肢)',
--     '玻璃瓶套裝 (4肢)', '玻璃瓶套裝 (2肢)'
--   );
-- ============================================================


-- ============================================================
-- PART 1: UPDATE 立體擺設 products.total_base_cost: 0 → 210
-- ============================================================

UPDATE products
SET
  total_base_cost = 210,
  updated_at      = NOW()
WHERE sku IN (
  '木框套裝 (4肢)',
  '木框套裝 (2肢)',
  '玻璃瓶套裝 (4肢)',
  '玻璃瓶套裝 (2肢)'
);


-- ============================================================
-- PART 2: Smoke Tests（4 SKU 各自獨立驗收，防靜默失敗）
-- ============================================================

DO $$
DECLARE
  _cost NUMERIC;
  _sku  TEXT;
BEGIN
  -- 逐 SKU 驗收
  FOREACH _sku IN ARRAY ARRAY[
    '木框套裝 (4肢)',
    '木框套裝 (2肢)',
    '玻璃瓶套裝 (4肢)',
    '玻璃瓶套裝 (2肢)'
  ] LOOP
    SELECT total_base_cost INTO _cost
    FROM products
    WHERE sku = _sku;

    IF _cost IS NULL THEN
      RAISE EXCEPTION '0030 Smoke FAIL: SKU "%" not found in products table '
        '(0023 migration may not have run)', _sku;
    END IF;

    IF _cost <> 210 THEN
      RAISE EXCEPTION '0030 Smoke FAIL: SKU "%" total_base_cost = %, 預期 210',
        _sku, _cost;
    END IF;

    RAISE NOTICE '0030 PASS: % total_base_cost = 210', _sku;
  END LOOP;

  RAISE NOTICE '0030 ALL SMOKE TESTS PASSED — 4 立體擺設 SKUs total_base_cost = 210';
END $$;