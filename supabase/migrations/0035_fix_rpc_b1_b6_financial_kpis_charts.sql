-- ============================================================
-- Migration 0035: B1 手模利潤比例分攤 + B6 手倒數量 product_sku
-- ============================================================
-- B6: handmodel_qty frame/bottle 子查詢 item_key → product_sku
--     item_key 格式 "{order_id}_{suffix}"，品名在 product_sku，
--     原 oi.item_key ILIKE '%木框%' 永遠不命中（frame=3,bottle=0 vs 實際 11/7）
-- B1: category_revenue 改成本比例分攤
--     原邏輯：混合單整筆利潤歸 handmodel（虛高 ~12×）
--     新邏輯：revenue/profit × (item_cost / total_cost)，消除混合單雙計
--     方案(a)，order_items 無 item 級售價欄位，成本比例為唯一技術選項
-- ============================================================

-- ── Part 1: get_financial_kpis (B6 only) ──────────────────
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
        -- B6 fix: oi.item_key → oi.product_sku（item_key 不含品名，永遠不命中）
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
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
        -- B6 fix (prev): oi.item_key → oi.product_sku
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
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

-- ── Part 2: get_financial_charts (B1 + B6) ────────────────
CREATE OR REPLACE FUNCTION public.get_financial_charts(
  tab_mode text DEFAULT 'monthly',
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
  result      JSON;
BEGIN
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

    -- B1 fix: 成本比例分攤消除混合單雙計
    -- 原：混合單整筆 net_profit 歸入 handmodel（虛高 ~12×）
    -- 新：revenue/profit × (item_cost / NULLIF(total_cost,0))
    --     混合單中各分類依成本占比分攤，總和不變
    'category_revenue', (
      SELECT json_build_object(
        'handmodel', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN final_sale_price * handmodel_cost / NULLIF(total_cost, 0) ELSE 0 END), 0),
        'keychain',  COALESCE(SUM(CASE WHEN keychain_cost > 0
          THEN final_sale_price * keychain_cost / NULLIF(total_cost, 0) ELSE 0 END), 0),
        'necklace',  COALESCE(SUM(CASE WHEN necklace_cost > 0
          THEN final_sale_price * necklace_cost / NULLIF(total_cost, 0) ELSE 0 END), 0),
        'handmodel_profit', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN net_profit * handmodel_cost / NULLIF(total_cost, 0) ELSE 0 END), 0),
        'keychain_profit',  COALESCE(SUM(CASE WHEN keychain_cost > 0
          THEN net_profit * keychain_cost / NULLIF(total_cost, 0) ELSE 0 END), 0),
        'necklace_profit',  COALESCE(SUM(CASE WHEN necklace_cost > 0
          THEN net_profit * necklace_cost / NULLIF(total_cost, 0) ELSE 0 END), 0),
        'handmodel_orders', COUNT(CASE WHEN handmodel_cost > 0 THEN 1 END),
        'keychain_orders',  COUNT(CASE WHEN keychain_cost > 0 THEN 1 END),
        'necklace_orders',  COUNT(CASE WHEN necklace_cost > 0 THEN 1 END),
        -- B6 fix: item_key → product_sku
        -- B1 fix: SUM(final_sale_price) → SUM(final_sale_price * handmodel_cost / total_cost)
        'handmodel_frame', COALESCE((
          SELECT SUM(o2.final_sale_price * o2.handmodel_cost / NULLIF(o2.total_cost, 0))
          FROM orders o2
          WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
            AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
            AND o2.handmodel_cost > 0
            AND EXISTS (
              SELECT 1 FROM order_items oi
              WHERE oi.order_fhs_id = o2.order_id AND oi.product_sku ILIKE '%木框%'
            )
        ), 0),
        'handmodel_bottle', COALESCE((
          SELECT SUM(o2.final_sale_price * o2.handmodel_cost / NULLIF(o2.total_cost, 0))
          FROM orders o2
          WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
            AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
            AND o2.handmodel_cost > 0
            AND EXISTS (
              SELECT 1 FROM order_items oi
              WHERE oi.order_fhs_id = o2.order_id AND oi.product_sku ILIKE '%玻璃瓶%'
            )
        ), 0)
      )
      FROM orders
      WHERE confirmed_at BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
    ),

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
$function$;

-- ── Smoke Test ──────────────────────────────────────────────
DO $$
DECLARE
  v_kpis   json;
  v_charts json;
  v_frame  numeric;
  v_bottle numeric;
BEGIN
  SELECT get_financial_kpis('yearly', 'all', CURRENT_DATE) INTO v_kpis;
  ASSERT v_kpis IS NOT NULL, 'get_financial_kpis returned NULL';

  v_frame  := (v_kpis->'current'->'handmodel_qty'->>'frame')::numeric;
  v_bottle := (v_kpis->'current'->'handmodel_qty'->>'bottle')::numeric;
  ASSERT v_frame  > 0, 'B6 KPIs: handmodel_qty.frame=0，product_sku fix 未命中';
  ASSERT v_bottle > 0, 'B6 KPIs: handmodel_qty.bottle=0，product_sku fix 未命中';

  SELECT get_financial_charts('yearly', 'all', CURRENT_DATE) INTO v_charts;
  ASSERT v_charts IS NOT NULL, 'get_financial_charts returned NULL';

  RAISE NOTICE '0035 smoke PASS — B6 frame=%, bottle=%', v_frame, v_bottle;
END $$;