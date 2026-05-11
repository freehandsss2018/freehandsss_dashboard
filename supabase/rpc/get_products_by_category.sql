-- RPC: get_products_by_category
-- Purpose: Dashboard product selector / n8n SKU lookup
-- Token saving: returns only pricing-relevant fields, no linked cost breakdown
-- Caller: Dashboard product selector, n8n cache warm-up
--
-- Usage:
--   SELECT * FROM get_products_by_category();               -- all products
--   SELECT * FROM get_products_by_category('金屬鎖匙扣');   -- by category

CREATE OR REPLACE FUNCTION get_products_by_category(
  category_filter VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  sku             VARCHAR,
  main_category   VARCHAR,
  target_object   VARCHAR,
  material        VARCHAR,
  mode            VARCHAR,
  item_per_set    INTEGER,
  total_base_cost NUMERIC,
  suggested_price NUMERIC,
  markup_factor   NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    sku,
    main_category,
    target_object,
    material,
    mode,
    item_per_set,
    total_base_cost,
    suggested_price,
    markup_factor
  FROM products
  WHERE (category_filter IS NULL OR main_category = category_filter)
  ORDER BY main_category, sku;
$$;

COMMENT ON FUNCTION get_products_by_category IS
  'Pre-filtered product list. Pass NULL for all 104 SKUs. '
  'Token-efficient alternative to SELECT * FROM products for Dashboard display.';
