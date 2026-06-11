-- SQL Reconciliation Script for 9 Historical Orders
-- Target: Supabase Dual-System Database
-- Purpose: Correct historical n8n calculation drift and align with Airtable source of truth.
-- Verified via compare_supabase_airtable script.

BEGIN;

-- 1. Order 0600100 (Jasmine)
-- Supabase before: final_sale_price = 3980, total_cost = 395, net_profit = 3585
-- Airtable:         final_sale_price = 4380, total_cost = 710, net_profit = 3670
UPDATE orders
SET 
  final_sale_price = 4380.00,
  total_cost = 710.00,
  net_profit = 3670.00
WHERE order_id = '0600100';

-- 2. Order 0600101 (Katkat)
-- Supabase before: final_sale_price = 1190, total_cost = 500, net_profit = 690 (already matches Airtable)
UPDATE orders
SET 
  final_sale_price = 1190.00,
  total_cost = 500.00,
  net_profit = 690.00
WHERE order_id = '0600101';

-- 3. Order 0600102 (nam.kaaa)
-- Supabase before: final_sale_price = 2380, total_cost = 210, net_profit = 2170
-- Airtable:         final_sale_price = 4940, total_cost = 1400, net_profit = 3540
UPDATE orders
SET 
  final_sale_price = 4940.00,
  total_cost = 1400.00,
  net_profit = 3540.00
WHERE order_id = '0600102';

-- 4. Order 0600103 (Bu)
-- Supabase before: final_sale_price = 0, total_cost = 395, net_profit = -395
-- Airtable:         final_sale_price = 2880, total_cost = 395, net_profit = 2485
UPDATE orders
SET 
  final_sale_price = 2880.00,
  total_cost = 395.00,
  net_profit = 2485.00
WHERE order_id = '0600103';

-- 5. Order 0600104 (Ivy)
-- Supabase before: final_sale_price = 2160, total_cost = 450, net_profit = 1710 (already matches Airtable)
UPDATE orders
SET 
  final_sale_price = 2160.00,
  total_cost = 450.00,
  net_profit = 1710.00
WHERE order_id = '0600104';

-- 6. Order 0600105 (Kathy)
-- Supabase before: final_sale_price = 3200, total_cost = 450, net_profit = 2750
-- Airtable:         final_sale_price = 3200, total_cost = 870, net_profit = 2330
UPDATE orders
SET 
  final_sale_price = 3200.00,
  total_cost = 870.00,
  net_profit = 2330.00
WHERE order_id = '0600105';

-- 7. Order 0600710 (Kathleen)
-- Supabase before: final_sale_price = 5560, total_cost = 985, net_profit = 4575
-- Airtable:         final_sale_price = 6360, total_cost = 1195, net_profit = 5165
UPDATE orders
SET 
  final_sale_price = 6360.00,
  total_cost = 1195.00,
  net_profit = 5165.00
WHERE order_id = '0600710';

-- 8. Order 0600721 (Akira)
-- Supabase before: final_sale_price = 4630, total_cost = 890, net_profit = 3740
-- Airtable:         final_sale_price = 5720, total_cost = 890, net_profit = 4830
UPDATE orders
SET 
  final_sale_price = 5720.00,
  total_cost = 890.00,
  net_profit = 4830.00
WHERE order_id = '0600721';

-- 9. Order 0600722 (KateSo)
-- Supabase before: final_sale_price = 5440, total_cost = 920, net_profit = 4520
-- Airtable:         final_sale_price = 5380, total_cost = 920, net_profit = 4460
UPDATE orders
SET 
  final_sale_price = 5380.00,
  total_cost = 920.00,
  net_profit = 4460.00
WHERE order_id = '0600722';

COMMIT;
