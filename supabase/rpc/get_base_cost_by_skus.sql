-- RPC: get_base_cost_by_skus
-- Purpose: Batch SKU cost lookup for n8n Supabase-First migration
-- Replaces: Airtable "Fetch Exact Base Cost" node (tblC3HDJAz9W0OF6R batchFormula)
-- Caller: n8n HTTP Request node (Phase 2 migration from Airtable node)
--
-- Usage:
--   POST /rest/v1/rpc/get_base_cost_by_skus
--   Body: {"sku_list": ["手扣鎖匙扣-不銹鋼", "純銀鎖匙扣-純銀"]}
--
-- Response shape (matches Airtable field names for Local Data Mapper compatibility):
--   [{"id": "...", "Product_Name": "...", "Total_Base_Cost": 25.00}]

CREATE OR REPLACE FUNCTION get_base_cost_by_skus(sku_list TEXT[])
RETURNS TABLE (
  id               TEXT,
  "Product_Name"   TEXT,
  "Total_Base_Cost" NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id::TEXT,
    p.sku           AS "Product_Name",
    p.total_base_cost AS "Total_Base_Cost"
  FROM products p
  WHERE p.sku = ANY(sku_list)
    AND p.total_base_cost IS NOT NULL
  ORDER BY p.sku;
$$;

COMMENT ON FUNCTION get_base_cost_by_skus IS
  'Supabase-First: batch SKU cost lookup replacing Airtable batchFormula. '
  'Input: TEXT[] of SKU strings matching n8n Search_SKU output. '
  'Output: matches Fetch Exact Base Cost Airtable response shape. '
  'Usage: POST /rest/v1/rpc/get_base_cost_by_skus with body {"sku_list":["sku1","sku2"]}. '
  'SECURITY DEFINER: runs as table owner, bypasses RLS for n8n service calls.';
