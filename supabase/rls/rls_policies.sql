-- FHS Supabase RLS Policies
-- Apply after 0001_initial_schema.sql
-- Created: 2026-05-10
--
-- Access model:
--   service_role  — n8n full read/write (bypasses RLS by default in Supabase)
--   anon          — Dashboard read-only on orders/order_items/products
--   anon          — NO access to cost_configurations or error_logs

-- Enable RLS on all tables
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline     ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- orders
-- ============================================================
-- anon: SELECT only (Dashboard reads order history)
CREATE POLICY "orders_anon_read"
  ON orders FOR SELECT
  TO anon
  USING (true);

-- service_role: full access (bypasses RLS, no policy needed, but explicit for clarity)
CREATE POLICY "orders_service_full"
  ON orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- order_items
-- ============================================================
CREATE POLICY "order_items_anon_read"
  ON order_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "order_items_service_full"
  ON order_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- products
-- ============================================================
-- anon: SELECT (Dashboard shows product list / pricing)
-- service_role: SELECT + UPDATE (n8n updates cost/price fields)
CREATE POLICY "products_anon_read"
  ON products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "products_service_full"
  ON products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- cost_configurations  — internal only, anon has NO access
-- ============================================================
CREATE POLICY "cost_config_service_only"
  ON cost_configurations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- No anon policy = anon cannot access cost data

-- ============================================================
-- sales_pipeline
-- ============================================================
CREATE POLICY "pipeline_anon_read"
  ON sales_pipeline FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "pipeline_service_full"
  ON sales_pipeline FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- error_logs  — no anon access
-- ============================================================
-- n8n inserts via service_role (bypasses RLS)
-- No anon read policy = error logs are internal only
CREATE POLICY "error_logs_service_insert"
  ON error_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
