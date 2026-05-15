-- 0004_cost_infrastructure.sql
-- FHS Supabase: Cost infrastructure for complete migration
-- Run AFTER: migration script populates cost_configurations + products.cost_config_id
-- Date: 2026-05-15
-- Author: Fat Mo / Claude Code (Supabase-First Phase 2)

-- ── Part A: Recompute products.total_base_cost from cost_configurations ──────

-- Run AFTER migration script populates cost_configurations + cost_config_id
UPDATE products p
SET total_base_cost = cc.drawing_cost + cc.printing_cost + cc.clasp_cost + cc.shipping_cost
FROM cost_configurations cc
WHERE p.cost_config_id = cc.id
  AND cc.drawing_cost IS NOT NULL
  AND cc.printing_cost IS NOT NULL
  AND cc.clasp_cost IS NOT NULL
  AND cc.shipping_cost IS NOT NULL;

-- ── Part B: recalculate_product_costs() function ─────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_product_costs(p_config_name TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE products p
  SET total_base_cost = cc.drawing_cost + cc.printing_cost + cc.clasp_cost + cc.shipping_cost
  FROM cost_configurations cc
  WHERE p.cost_config_id = cc.id
    AND (p_config_name IS NULL OR cc.config_name = p_config_name)
    AND cc.drawing_cost IS NOT NULL
    AND cc.printing_cost IS NOT NULL
    AND cc.clasp_cost IS NOT NULL
    AND cc.shipping_cost IS NOT NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION recalculate_product_costs IS
  'Recomputes products.total_base_cost from cost_configurations components. '
  'Call with no args to update all, or pass config_name to update one config group. '
  'Usage: SELECT recalculate_product_costs(); or SELECT recalculate_product_costs(''嬰兒-鎖匙扣-不銹鋼'');';

-- ── Part C: v_order_cost_breakdown VIEW (financial audit main view) ───────────

CREATE OR REPLACE VIEW v_order_cost_breakdown AS
SELECT
  -- Order level
  o.order_id,
  o.customer_name,
  o.confirmed_at,
  o.appointment_at,
  o.process_status        AS order_status,
  o.batch_number,
  o.final_sale_price,
  o.total_cost            AS order_total_cost,
  o.net_profit,
  -- Item level
  oi.item_key,
  oi.item_category,
  oi.quantity,
  oi.item_base_cost,
  oi.subtotal_cost,
  oi.handmodel_cost,
  oi.keychain_cost,
  oi.necklace_cost,
  oi.specification,
  oi.engraving_text,
  -- Product level
  p.sku                   AS product_sku,
  p.main_category,
  p.material,
  p.mode,
  p.item_per_set,
  p.suggested_price,
  -- Cost breakdown (Base_Costs layer)
  cc.config_name          AS cost_config,
  cc.drawing_cost,
  cc.printing_cost,
  cc.clasp_cost,
  cc.shipping_cost,
  (cc.drawing_cost + cc.printing_cost + cc.clasp_cost + cc.shipping_cost) AS config_unit_cost,
  -- Data integrity check
  CASE
    WHEN p.total_base_cost IS NULL THEN '⚠ no product'
    WHEN cc.id IS NULL THEN '⚠ no config'
    WHEN p.total_base_cost = (cc.drawing_cost + cc.printing_cost + cc.clasp_cost + cc.shipping_cost) THEN '✓ matched'
    ELSE '⚠ mismatch'
  END                     AS cost_integrity
FROM order_items oi
JOIN orders o     ON o.order_id = oi.order_fhs_id
LEFT JOIN products p ON p.sku = oi.product_sku
LEFT JOIN cost_configurations cc ON cc.id = p.cost_config_id
WHERE o.deleted_at IS NULL
ORDER BY o.confirmed_at DESC NULLS LAST, oi.item_key;

COMMENT ON VIEW v_order_cost_breakdown IS
  'Financial audit view: full cost traceability from order → item → product → Base_Costs components. '
  'cost_integrity: ✓ matched = total_base_cost equals computed sum; ⚠ = data gap. '
  'Usage: SELECT * FROM v_order_cost_breakdown WHERE order_id = ''FHS-001'';';

-- ── Part D: Verification queries (run after migration script + this migration) ─

-- 1. Confirm cost_configurations populated
-- SELECT COUNT(*) FROM cost_configurations; -- expect ~29
-- 2. Confirm products linked to configs
-- SELECT COUNT(*) FROM products WHERE cost_config_id IS NOT NULL; -- expect ~489
-- 3. Confirm total_base_cost recomputed
-- SELECT COUNT(*) FROM products WHERE total_base_cost IS NULL; -- expect 0
-- 4. Confirm order_items product_sku fixed
-- SELECT COUNT(*) FROM order_items WHERE product_sku IS NULL; -- expect 0
-- 5. Financial integrity check
-- SELECT cost_integrity, COUNT(*) FROM v_order_cost_breakdown GROUP BY cost_integrity;
