-- RPC: get_financial_charts
-- Purpose: Dashboard Finance Mode — chart data (Line trend + Bar breakdown + Pie cost composition)
-- Caller: n8n Finance Webhook → Dashboard financeModeContainer
--
-- Parameters:
--   tab_mode   : 'current' | 'monthly' | 'yearly'
--   category   : 'all' | 'handmodel' | 'metal'
--   ref_date   : reference date (default: today)
--
-- Usage:
--   SELECT * FROM get_financial_charts('monthly', 'all', CURRENT_DATE);

CREATE OR REPLACE FUNCTION get_financial_charts(
  tab_mode  TEXT    DEFAULT 'monthly',
  category  TEXT    DEFAULT 'all',
  ref_date  DATE    DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  cur_start   DATE;
  cur_end     DATE;
  result      JSON;
BEGIN
  -- Date range
  CASE tab_mode
    WHEN 'current' THEN
      cur_start := DATE_TRUNC('month', ref_date)::DATE;
      cur_end   := ref_date;
    WHEN 'monthly' THEN
      cur_start := (ref_date - INTERVAL '5 months')::DATE;
      cur_end   := ref_date;
    WHEN 'yearly' THEN
      cur_start := DATE_TRUNC('year', ref_date)::DATE;
      cur_end   := ref_date;
    ELSE
      cur_start := DATE_TRUNC('month', ref_date)::DATE;
      cur_end   := ref_date;
  END CASE;

  SELECT json_build_object(

    -- Line Chart: Revenue vs Profit trend (by month)
    'trend', (
      SELECT json_agg(row ORDER BY row.period)
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('month', confirmed_at), 'YYYY-MM') AS period,
          COALESCE(SUM(final_sale_price), 0)                    AS revenue,
          COALESCE(SUM(net_profit), 0)                          AS profit,
          COALESCE(SUM(total_cost), 0)                          AS cost
        FROM orders
        WHERE confirmed_at BETWEEN cur_start AND cur_end
          AND process_status::TEXT NOT IN ('cancelled', 'refunded')
          AND (
            category = 'all'
            OR (category = 'handmodel' AND handmodel_cost > 0)
            OR (category = 'metal'     AND (keychain_cost > 0 OR necklace_cost > 0))
          )
        GROUP BY DATE_TRUNC('month', confirmed_at)
      ) row
    ),

    -- Bar Chart: Revenue by product category
    -- FIXED: Use primary category logic (handmodel > keychain > necklace) to avoid double-counting mixed orders
    'category_revenue', (
      SELECT json_build_object(
        'handmodel', COALESCE(SUM(CASE WHEN handmodel_cost > 0 THEN final_sale_price ELSE 0 END), 0),
        'keychain',  COALESCE(SUM(CASE WHEN handmodel_cost = 0 AND keychain_cost > 0 THEN final_sale_price ELSE 0 END), 0),
        'necklace',  COALESCE(SUM(CASE WHEN handmodel_cost = 0 AND keychain_cost = 0 AND necklace_cost > 0 THEN final_sale_price ELSE 0 END), 0),
        'handmodel_profit', COALESCE(SUM(CASE WHEN handmodel_cost > 0 THEN net_profit ELSE 0 END), 0),
        'keychain_profit',  COALESCE(SUM(CASE WHEN handmodel_cost = 0 AND keychain_cost > 0 THEN net_profit ELSE 0 END), 0),
        'necklace_profit',  COALESCE(SUM(CASE WHEN handmodel_cost = 0 AND keychain_cost = 0 AND necklace_cost > 0 THEN net_profit ELSE 0 END), 0),
        'handmodel_orders', COUNT(CASE WHEN handmodel_cost > 0 THEN 1 END),
        'keychain_orders',  COUNT(CASE WHEN keychain_cost > 0 THEN 1 END),
        'necklace_orders',  COUNT(CASE WHEN necklace_cost > 0 THEN 1 END),
        'handmodel_frame', COALESCE((
          SELECT SUM(o2.final_sale_price) FROM orders o2
          WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
            AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
            AND o2.handmodel_cost > 0
            AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_fhs_id = o2.order_id AND oi.item_key ILIKE '%木框%')
        ), 0),
        'handmodel_bottle', COALESCE((
          SELECT SUM(o2.final_sale_price) FROM orders o2
          WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
            AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
            AND o2.handmodel_cost > 0
            AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_fhs_id = o2.order_id AND oi.item_key ILIKE '%玻璃瓶%')
        ), 0)
      )
      FROM orders
      WHERE confirmed_at BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
    ),

    -- Pie/Donut Chart: Cost composition
    'cost_breakdown', (
      SELECT json_build_object(
        'handmodel', COALESCE(SUM(handmodel_cost), 0),
        'keychain',  COALESCE(SUM(keychain_cost), 0),
        'necklace',  COALESCE(SUM(necklace_cost), 0),
        'other',     COALESCE(SUM(total_cost - COALESCE(handmodel_cost,0) - COALESCE(keychain_cost,0) - COALESCE(necklace_cost,0)), 0)
      )
      FROM orders
      WHERE confirmed_at BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
        AND (
          category = 'all'
          OR (category = 'handmodel' AND handmodel_cost > 0)
          OR (category = 'metal'     AND (keychain_cost > 0 OR necklace_cost > 0))
        )
    )

  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_financial_charts IS
  'Finance Mode chart data. Returns trend (line), category_revenue (bar), cost_breakdown (pie). Called by n8n Finance Webhook after get_financial_kpis. monthly mode returns 6-month trend; yearly returns month-by-month YTD. FIXED 2026-05-17: category_revenue uses primary category logic to prevent double-counting mixed orders.';
