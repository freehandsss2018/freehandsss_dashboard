-- RPC: get_financial_kpis
-- Purpose: Dashboard Finance Mode — KPI cards data (Revenue, Cost, Profit, Orders, Margin, AOV)
--          Returns current period + comparison period for % change calculation
-- Caller: n8n Finance Webhook → Dashboard financeModeContainer
--
-- Parameters:
--   tab_mode   : 'current' | 'monthly' | 'yearly'
--   category   : 'all' | 'handmodel' | 'metal'
--   ref_date   : reference date (default: today)
--
-- Usage:
--   SELECT * FROM get_financial_kpis('current', 'all', CURRENT_DATE);
--   SELECT * FROM get_financial_kpis('monthly', 'handmodel', '2026-05-01');

CREATE OR REPLACE FUNCTION get_financial_kpis(
  tab_mode  TEXT    DEFAULT 'current',
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
  prev_start  DATE;
  prev_end    DATE;
  result      JSON;
BEGIN
  -- Determine date ranges based on tab_mode
  CASE tab_mode
    WHEN 'current' THEN
      cur_start  := DATE_TRUNC('month', ref_date)::DATE;
      cur_end    := ref_date;
      prev_start := DATE_TRUNC('month', ref_date - INTERVAL '1 year')::DATE;
      prev_end   := (ref_date - INTERVAL '1 year')::DATE;
    WHEN 'monthly' THEN
      cur_start  := DATE_TRUNC('month', ref_date)::DATE;
      cur_end    := (DATE_TRUNC('month', ref_date) + INTERVAL '1 month - 1 day')::DATE;
      prev_start := DATE_TRUNC('month', ref_date - INTERVAL '1 month')::DATE;
      prev_end   := (DATE_TRUNC('month', ref_date) - INTERVAL '1 day')::DATE;
    WHEN 'yearly' THEN
      cur_start  := DATE_TRUNC('year', ref_date)::DATE;
      cur_end    := ref_date;
      prev_start := DATE_TRUNC('year', ref_date - INTERVAL '1 year')::DATE;
      prev_end   := (ref_date - INTERVAL '1 year')::DATE;
    ELSE
      RAISE EXCEPTION 'Invalid tab_mode: %. Expected: current | monthly | yearly', tab_mode;
  END CASE;

  SELECT json_build_object(
    'period', json_build_object(
      'tab',        tab_mode,
      'category',   category,
      'cur_start',  cur_start,
      'cur_end',    cur_end,
      'prev_start', prev_start,
      'prev_end',   prev_end
    ),
    'current', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(final_sale_price), 0),
        'cost',    COALESCE(SUM(total_cost), 0),
        'profit',  COALESCE(SUM(net_profit), 0),
        'orders',  COUNT(*),
        -- orders_inclusive: actual count of orders containing that product type (allows overlap for mixed orders)
        'orders_inclusive', CASE
          WHEN category = 'handmodel' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND (o2.keychain_cost > 0 OR o2.necklace_cost > 0)
          )
          ELSE COUNT(*) END,
        'margin',  CASE WHEN SUM(final_sale_price) > 0
                        THEN ROUND(SUM(net_profit) / SUM(final_sale_price) * 100, 1)
                        ELSE 0 END,
        'aov',     CASE WHEN COUNT(*) > 0
                        THEN ROUND(SUM(final_sale_price) / COUNT(*), 0)
                        ELSE 0 END,
        'metal_qty', json_build_object(
          'keychain', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND (o.keychain_cost > 0)
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND (o.necklace_cost > 0)
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.handmodel_cost > 0
              AND oi.item_key ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.handmodel_cost > 0
              AND oi.item_key ILIKE '%玻璃瓶%'
          ), 0)
        )
      )
      FROM orders
      WHERE confirmed_at BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
        AND (
          category = 'all'
          OR (category = 'handmodel' AND handmodel_cost > 0)
          OR (category = 'metal'     AND handmodel_cost = 0 AND (keychain_cost > 0 OR necklace_cost > 0))
        )
    ),
    'previous', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(final_sale_price), 0),
        'cost',    COALESCE(SUM(total_cost), 0),
        'profit',  COALESCE(SUM(net_profit), 0),
        'orders',  COUNT(*),
        'orders_inclusive', CASE
          WHEN category = 'handmodel' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE o2.confirmed_at BETWEEN prev_start AND prev_end
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE o2.confirmed_at BETWEEN prev_start AND prev_end
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND (o2.keychain_cost > 0 OR o2.necklace_cost > 0)
          )
          ELSE COUNT(*) END,
        'margin',  CASE WHEN SUM(final_sale_price) > 0
                        THEN ROUND(SUM(net_profit) / SUM(final_sale_price) * 100, 1)
                        ELSE 0 END,
        'aov',     CASE WHEN COUNT(*) > 0
                        THEN ROUND(SUM(final_sale_price) / COUNT(*), 0)
                        ELSE 0 END,
        'metal_qty', json_build_object(
          'keychain', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND (o.keychain_cost > 0)
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND (o.necklace_cost > 0)
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.handmodel_cost > 0
              AND oi.item_key ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.handmodel_cost > 0
              AND oi.item_key ILIKE '%玻璃瓶%'
          ), 0)
        )
      )
      FROM orders
      WHERE confirmed_at BETWEEN prev_start AND prev_end
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
        AND (
          category = 'all'
          OR (category = 'handmodel' AND handmodel_cost > 0)
          OR (category = 'metal'     AND handmodel_cost = 0 AND (keychain_cost > 0 OR necklace_cost > 0))
        )
    ),
    'last_sync', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_financial_kpis IS
  'Finance Mode KPI aggregation. Returns current + previous period for all 6 KPI cards. '
  'Called by n8n Finance Webhook, not directly from frontend. '
  'tab_mode: current=MTD vs last year same MTD | monthly=this month vs last month | yearly=YTD vs last year YTD';
