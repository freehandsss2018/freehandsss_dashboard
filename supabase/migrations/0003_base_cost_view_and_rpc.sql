-- Migration: 0003_base_cost_view_and_rpc
-- Purpose: Supabase-First Phase 1 — replace Airtable Product_Database cost lookup
-- Date: 2026-05-15
--
-- Context:
--   n8n node "Fetch Exact Base Cost" currently reads from Airtable tblC3HDJAz9W0OF6R
--   using batchFormula OR({Product_Name}='sku1',{Product_Name}='sku2',...)
--   This migration creates the Supabase equivalent so n8n can switch to REST API.
--
-- Downstream node "Local Data Mapper" expects fields: id, Product_Name, Total_Base_Cost
--   (exact case preserved via quoted identifiers for PostgREST JSON compatibility)
--
-- AGENTS.md compliance:
--   [1] No trigger on financial fields
--   [2] total_base_cost read-only from this VIEW — write path remains n8n → products
--   [3] No generated columns

-- ============================================================
-- VIEW: v_products_with_costs
-- PostgREST endpoint: GET /rest/v1/v_products_with_costs
-- Filter example: ?Product_Name=in.("sku1","sku2")
-- ============================================================

CREATE OR REPLACE VIEW v_products_with_costs AS
SELECT
  id::TEXT          AS id,
  sku               AS "Product_Name",
  total_base_cost   AS "Total_Base_Cost",
  main_category,
  material,
  item_per_set
FROM products
WHERE sku IS NOT NULL;

COMMENT ON VIEW v_products_with_costs IS
  'Supabase-First: replaces Airtable Product_Database cost lookup (tblC3HDJAz9W0OF6R). '
  'Field names Product_Name and Total_Base_Cost match Airtable convention — '
  'n8n Local Data Mapper reads these exact keys without code change. '
  'Write path: n8n still writes total_base_cost to products table directly. '
  'Query: GET /rest/v1/v_products_with_costs?Product_Name=in.("sku1","sku2")';

-- ============================================================
-- RPC: get_base_cost_by_skus
-- PostgREST endpoint: POST /rest/v1/rpc/get_base_cost_by_skus
-- Body: {"sku_list": ["sku1", "sku2"]}
-- Returns same shape as Airtable Fetch Exact Base Cost response
-- ============================================================

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
