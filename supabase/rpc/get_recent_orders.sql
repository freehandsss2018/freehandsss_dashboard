-- RPC: get_recent_orders
-- Purpose: Dashboard order history list (latest N orders)
-- Token saving: excludes raw_form_state JSONB blob (large, not needed for display)
-- Caller: Dashboard order history panel
--
-- Usage: SELECT * FROM get_recent_orders(50);

CREATE OR REPLACE FUNCTION get_recent_orders(
  row_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  order_id          VARCHAR,
  customer_name     TEXT,
  confirmed_at      DATE,
  appointment_at    DATE,
  final_sale_price  NUMERIC,
  net_profit        NUMERIC,
  process_status    TEXT,
  batch_number      VARCHAR,
  admin_notes       TEXT,
  item_count        BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    o.order_id,
    o.customer_name,
    o.confirmed_at,
    o.appointment_at,
    o.final_sale_price,
    o.net_profit,
    o.process_status::TEXT,
    o.batch_number,
    o.admin_notes,
    COUNT(oi.id) AS item_count
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_fhs_id = o.order_id
  GROUP BY o.id
  ORDER BY o.confirmed_at DESC NULLS LAST
  LIMIT row_limit;
$$;

COMMENT ON FUNCTION get_recent_orders IS
  'Returns recent orders with item count. Excludes raw_form_state to save tokens. '
  'Use raw SELECT with explicit raw_form_state column only when order restore is needed.';
