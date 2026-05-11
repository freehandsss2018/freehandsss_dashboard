-- RPC: get_profit_audit
-- Purpose: Financial audit comparison — Supabase vs expected values
-- Used by: finance-auditor subagent (Quadruple_Sync verification)
-- Token saving: returns only audit-relevant fields, no raw_form_state blob
--
-- Usage: SELECT * FROM get_profit_audit('2026-05-01', '2026-05-31');

CREATE OR REPLACE FUNCTION get_profit_audit(
  date_from DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  date_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  order_id          VARCHAR,
  confirmed_at      DATE,
  final_sale_price  NUMERIC,
  total_cost        NUMERIC,
  net_profit        NUMERIC,
  computed_profit   NUMERIC,   -- final_sale_price - total_cost (for drift detection)
  profit_drift      NUMERIC,   -- net_profit - (final_sale_price - total_cost)
  handmodel_cost    NUMERIC,
  keychain_cost     NUMERIC,
  necklace_cost     NUMERIC,
  process_status    TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    order_id,
    confirmed_at,
    final_sale_price,
    total_cost,
    net_profit,
    (final_sale_price - COALESCE(total_cost, 0))           AS computed_profit,
    net_profit - (final_sale_price - COALESCE(total_cost, 0)) AS profit_drift,
    handmodel_cost,
    keychain_cost,
    necklace_cost,
    process_status::TEXT
  FROM orders
  WHERE confirmed_at BETWEEN date_from AND date_to
  ORDER BY ABS(net_profit - (final_sale_price - COALESCE(total_cost, 0))) DESC NULLS LAST;
$$;

COMMENT ON FUNCTION get_profit_audit IS
  'Returns orders with profit drift detection. '
  'profit_drift != 0 indicates Supabase data inconsistency or n8n write error. '
  'Used by finance-auditor subagent for Quadruple_Sync verification.';
