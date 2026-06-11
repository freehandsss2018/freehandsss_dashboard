-- ============================================================
-- Migration 0036: B3 qty 子查詢補 deleted_at IS NULL 守衛
-- ============================================================
-- 問題：get_financial_kpis 的 8 條 qty 子查詢（metal_qty + handmodel_qty，
--       current + previous 各 4 條）缺少 o.deleted_at IS NULL 守衛，
--       導致軟刪訂單的品項數量仍被計入，與主查詢口徑不一致。
-- 修法：在所有 qty 子查詢的 JOIN orders 後補 AND o.deleted_at IS NULL
-- 範圍：僅改 get_financial_kpis，get_financial_charts qty 無此問題
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_financial_kpis(
  tab_mode text DEFAULT 'current',
  category text DEFAULT 'all',
  ref_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  cur_start   DATE;
  cur_end     DATE;
  prev_start  DATE;
  prev_end    DATE;
  result      JSON;
BEGIN
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
        'cost',    COALESCE(SUM(total_cost), 0) + COALESCE(SUM(adjustment_amount), 0),
        'profit',  COALESCE(SUM(net_profit), 0) - COALESCE(SUM(adjustment_amount), 0),
        'orders',  COUNT(*),
        'orders_inclusive', CASE
          WHEN category = 'handmodel' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE (o2.confirmed_at BETWEEN cur_start AND cur_end OR o2.confirmed_at IS NULL)
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.deleted_at IS NULL
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE (o2.confirmed_at BETWEEN cur_start AND cur_end OR o2.confirmed_at IS NULL)
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.deleted_at IS NULL
              AND (o2.keychain_cost > 0 OR o2.necklace_cost > 0)
          )
          ELSE COUNT(*) END,
        'margin',  CASE WHEN SUM(final_sale_price) > 0
                        THEN ROUND((SUM(net_profit) - COALESCE(SUM(adjustment_amount), 0)) / SUM(final_sale_price) * 100, 1)
                        ELSE 0 END,
        'aov',     CASE WHEN COUNT(*) > 0
                        THEN ROUND(SUM(final_sale_price) / COUNT(*), 0)
                        ELSE 0 END,
        'metal_qty', json_build_object(
          -- B3 fix: 補 o.deleted_at IS NULL（與主查詢口徑一致）
          'keychain', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND (o.keychain_cost > 0)
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND (o.necklace_cost > 0)
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          -- B3 fix: 補 o.deleted_at IS NULL（與主查詢口徑一致）
          'frame', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%玻璃瓶%'
          ), 0)
        )
      )
      FROM orders
      WHERE (confirmed_at BETWEEN cur_start AND cur_end OR confirmed_at IS NULL)
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
        AND deleted_at IS NULL
        AND (
          category = 'all'
          OR (category = 'handmodel' AND handmodel_cost > 0)
          OR (category = 'metal'     AND handmodel_cost = 0 AND (keychain_cost > 0 OR necklace_cost > 0))
        )
    ),
    'previous', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(final_sale_price), 0),
        'cost',    COALESCE(SUM(total_cost), 0) + COALESCE(SUM(adjustment_amount), 0),
        'profit',  COALESCE(SUM(net_profit), 0) - COALESCE(SUM(adjustment_amount), 0),
        'orders',  COUNT(*),
        'orders_inclusive', CASE
          WHEN category = 'handmodel' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE (o2.confirmed_at BETWEEN prev_start AND prev_end OR o2.confirmed_at IS NULL)
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.deleted_at IS NULL
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE (o2.confirmed_at BETWEEN prev_start AND prev_end OR o2.confirmed_at IS NULL)
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.deleted_at IS NULL
              AND (o2.keychain_cost > 0 OR o2.necklace_cost > 0)
          )
          ELSE COUNT(*) END,
        'margin',  CASE WHEN SUM(final_sale_price) > 0
                        THEN ROUND((SUM(net_profit) - COALESCE(SUM(adjustment_amount), 0)) / SUM(final_sale_price) * 100, 1)
                        ELSE 0 END,
        'aov',     CASE WHEN COUNT(*) > 0
                        THEN ROUND(SUM(final_sale_price) / COUNT(*), 0)
                        ELSE 0 END,
        'metal_qty', json_build_object(
          -- B3 fix: 補 o.deleted_at IS NULL（與主查詢口徑一致）
          'keychain', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND (o.keychain_cost > 0)
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND (o.necklace_cost > 0)
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          -- B3 fix: 補 o.deleted_at IS NULL（與主查詢口徑一致）
          'frame', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%玻璃瓶%'
          ), 0)
        )
      )
      FROM orders
      WHERE (confirmed_at BETWEEN prev_start AND prev_end OR confirmed_at IS NULL)
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
        AND deleted_at IS NULL
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
$function$;

-- ── Smoke Test ──────────────────────────────────────────────
DO $$
DECLARE
  v_kpis  json;
  v_frame numeric;
  v_bottle numeric;
BEGIN
  SELECT get_financial_kpis('yearly', 'all', CURRENT_DATE) INTO v_kpis;
  ASSERT v_kpis IS NOT NULL, 'get_financial_kpis returned NULL';

  v_frame  := (v_kpis->'current'->'handmodel_qty'->>'frame')::numeric;
  v_bottle := (v_kpis->'current'->'handmodel_qty'->>'bottle')::numeric;
  ASSERT v_frame  > 0, 'B3: handmodel_qty.frame=0';
  ASSERT v_bottle > 0, 'B3: handmodel_qty.bottle=0';

  RAISE NOTICE '0036 smoke PASS — frame=%, bottle=%', v_frame, v_bottle;
END $$;