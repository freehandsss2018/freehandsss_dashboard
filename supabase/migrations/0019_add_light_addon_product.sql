-- ============================================================
-- Migration 0019 — Light Add-on Product
-- ============================================================
-- Purpose:
--   Register「燈飾 - 加購」($80 selling, $0 service cost)
--   as a first-class product so that:
--     1. n8n Supabase Mirror Prep can write product_sku without FK 23503
--     2. Smart Cache Strategist can lookup cost via products table
--     3. Future financial reporting can include light addon revenue/cost
--
-- Background:
--   Pattern: same FK 23503 risk as migration 0014 (羊毛氈公仔 - 加購).
--   C1 Fix: A2 plan used wrong column names (name/category/price/is_active).
--   Correct schema from migration 0014: main_category / target_object / mode etc.
--
-- Decision (Fat Mo 2026-05-27):
--   - main_category = '配件'
--   - target_object = '燈飾'
--   - mode = '加購'
--   - total_base_cost = 0 (service product, no material cost)
--   - suggested_price = 80
--
-- Rollback: DELETE FROM products WHERE sku = '燈飾 - 加購';
-- ============================================================

INSERT INTO products (
  sku,
  main_category,
  target_object,
  material,
  mode,
  item_per_set,
  total_base_cost,
  suggested_price,
  markup_factor
) VALUES (
  '燈飾 - 加購',
  '配件',
  '燈飾',
  NULL,
  '加購',
  1,
  0,
  80,
  NULL
)
ON CONFLICT (sku) DO UPDATE SET
  main_category   = EXCLUDED.main_category,
  target_object   = EXCLUDED.target_object,
  mode            = EXCLUDED.mode,
  total_base_cost = EXCLUDED.total_base_cost,
  suggested_price = EXCLUDED.suggested_price,
  updated_at      = NOW();
