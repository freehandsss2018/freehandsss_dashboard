-- RPC: get_order_summary
-- Purpose: Pre-aggregated order summary for Dashboard Financial Overview
-- Token saving: avoids SELECT * FROM orders with JOIN — returns only needed fields
-- Caller: Dashboard Financial Overview / finance-auditor subagent
--
-- Usage: SELECT * FROM get_order_summary('2026-05-01', '2026-05-31');

CREATE OR REPLACE FUNCTION get_order_summary(
  date_from DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  date_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  order_id          VARCHAR,
  customer_name     TEXT,
  confirmed_at      DATE,
  final_sale_price  NUMERIC,
  total_cost        NUMERIC,
  net_profit        NUMERIC,
  process_status    TEXT,
  batch_number      VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    order_id,
    customer_name,
    confirmed_at,
    final_sale_price,
    total_cost,
    net_profit,
    process_status::TEXT,
    batch_number
  FROM orders
  WHERE confirmed_at BETWEEN date_from AND date_to
  ORDER BY confirmed_at DESC;
$$;

COMMENT ON FUNCTION get_order_summary IS
  'Pre-aggregated order summary. Use this instead of raw SELECT on orders table '
  'to minimize token consumption per AGENTS.md Token Rule §5.5.';
