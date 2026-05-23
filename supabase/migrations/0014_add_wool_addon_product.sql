-- ============================================================
-- Migration 0014 — Wool Felt Doll Add-on Product
-- ============================================================
-- Purpose:
--   Register「羊毛氈公仔 - 加購」($680 selling, $0 service cost)
--   as a first-class product so that:
--     1. n8n Supabase Mirror Prep can write product_sku without FK 23503
--     2. Smart Cache Strategist can lookup cost via products table
--     3. Future financial reporting can include wool felt revenue/cost
--
-- Background:
--   Diagnosis: execution 3685 (2026-05-23) — Order containing W_WOOL
--   triggered FK 23503 on order_items.product_sku → sync_order_to_mirror
--   RPC rollback → HTTP 500 → 20.145s workflow Error.
--
-- Decision (Fat Mo 2026-05-23):
--   - main_category = '配件' (new value, was: 純銀頸鏈吊飾/金屬鎖匙扣/立體擺設)
--   - target_object = '羊毛氈公仔'
--   - mode = '加購'
--   - total_base_cost = 0 (service product, no material cost)
--   - suggested_price = 680
--
-- Rollback: DELETE FROM products WHERE sku = '羊毛氈公仔 - 加購';
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
  '羊毛氈公仔 - 加購',
  '配件',
  '羊毛氈公仔',
  NULL,
  '加購',
  1,
  0,
  680,
  NULL
)
ON CONFLICT (sku) DO UPDATE SET
  main_category   = EXCLUDED.main_category,
  target_object   = EXCLUDED.target_object,
  mode            = EXCLUDED.mode,
  total_base_cost = EXCLUDED.total_base_cost,
  suggested_price = EXCLUDED.suggested_price,
  updated_at      = NOW();

COMMENT ON COLUMN products.main_category IS
  'Product family. Values: 純銀頸鏈吊飾 / 金屬鎖匙扣 / 立體擺設 / 配件 (v0014).';
