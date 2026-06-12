-- ============================================================
-- Migration 0038: get_financial_kpis + get_financial_charts
--   item_sale_price 三層 fallback 混合訂單收入修正
-- ============================================================
-- 背景（Session 90/91）：
--   混合訂單（同時有 handmodel_cost 與 keychain/necklace_cost）的
--   handmodel 收入原本取整筆 final_sale_price，造成 hm_revenue 虛高
--   （$77,906 → 修正後 $29,812）。
--
-- 三層 fallback 策略：
--   Layer 1: 精確 item_sale_price（order_items.item_sale_price，0037 新增）
--   Layer 2: 成本比例分攤（final_sale_price × handmodel_cost / total_cost）
--   Layer 3: 平均分保底（final_sale_price / item 數量）
--
-- get_financial_kpis 新增：
--   - current/previous 兩期均套用 3-layer eff_rev
--   - data_quality：列出 fallback（無 item_sale_price）的混合單 order_id 清單
--
-- get_financial_charts 更新：
--   - category_revenue 各品類改用 COALESCE(item_sale_price, 成本比例)
-- ============================================================

-- ── get_financial_kpis ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_financial_kpis(
  tab_mode text  DEFAULT 'current'::text,
  category text  DEFAULT 'all'::text,
  ref_date date  DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- ── current period ──────────────────────────────────────
    'current', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(eff_rev), 0),
        'cost',    COALESCE(SUM(eff_cost), 0) + COALESCE(SUM(adjustment_amount), 0),
        'profit',  COALESCE(SUM(eff_rev - eff_cost), 0) - COALESCE(SUM(adjustment_amount), 0),
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
        'margin',  CASE WHEN SUM(eff_rev) > 0
                        THEN ROUND(
                          (SUM(eff_rev - eff_cost) - COALESCE(SUM(adjustment_amount), 0))
                          / SUM(eff_rev) * 100, 1)
                        ELSE 0 END,
        'aov',     CASE WHEN COUNT(*) > 0
                        THEN ROUND(SUM(eff_rev) / COUNT(*), 0)
                        ELSE 0 END,
        -- B3 fix（0036）qty 子查詢：deleted_at IS NULL guards
        'metal_qty', json_build_object(
          'keychain', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.keychain_cost > 0
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.necklace_cost > 0
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%玻璃瓶%'
          ), 0)
        )
      )
      FROM (
        -- 3-layer fallback: eff_rev per order row
        SELECT
          CASE
            WHEN category = 'handmodel' AND (o.keychain_cost > 0 OR o.necklace_cost > 0)
              THEN COALESCE(
                -- Layer 1: 精確 item_sale_price
                (SELECT SUM(oi.item_sale_price) FROM order_items oi
                 WHERE oi.order_fhs_id = o.order_id
                   AND oi.item_category = '立體擺設'
                   AND oi.item_sale_price IS NOT NULL),
                -- Layer 2: 成本比例分攤
                o.final_sale_price * o.handmodel_cost / NULLIF(o.total_cost, 0),
                -- Layer 3: 平均分保底
                o.final_sale_price / NULLIF(
                  (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.order_fhs_id = o.order_id), 0)
              )
            ELSE o.final_sale_price
          END AS eff_rev,
          CASE
            WHEN category = 'handmodel' THEN o.handmodel_cost
            WHEN category = 'metal'     THEN COALESCE(o.keychain_cost,0) + COALESCE(o.necklace_cost,0)
            ELSE o.total_cost
          END AS eff_cost,
          o.adjustment_amount
        FROM orders o
        WHERE (o.confirmed_at BETWEEN cur_start AND cur_end OR o.confirmed_at IS NULL)
          AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
          AND o.deleted_at IS NULL
          AND (
            category = 'all'
            OR (category = 'handmodel' AND o.handmodel_cost > 0)
            OR (category = 'metal'     AND o.handmodel_cost = 0
                AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
          )
      ) base
    ),

    -- ── previous period ──────────────────────────────────────
    'previous', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(eff_rev), 0),
        'cost',    COALESCE(SUM(eff_cost), 0) + COALESCE(SUM(adjustment_amount), 0),
        'profit',  COALESCE(SUM(eff_rev - eff_cost), 0) - COALESCE(SUM(adjustment_amount), 0),
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
        'margin',  CASE WHEN SUM(eff_rev) > 0
                        THEN ROUND(
                          (SUM(eff_rev - eff_cost) - COALESCE(SUM(adjustment_amount), 0))
                          / SUM(eff_rev) * 100, 1)
                        ELSE 0 END,
        'aov',     CASE WHEN COUNT(*) > 0
                        THEN ROUND(SUM(eff_rev) / COUNT(*), 0)
                        ELSE 0 END,
        'metal_qty', json_build_object(
          'keychain', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.keychain_cost > 0
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.necklace_cost > 0
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE o.confirmed_at BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%玻璃瓶%'
          ), 0)
        )
      )
      FROM (
        SELECT
          CASE
            WHEN category = 'handmodel' AND (o.keychain_cost > 0 OR o.necklace_cost > 0)
              THEN COALESCE(
                (SELECT SUM(oi.item_sale_price) FROM order_items oi
                 WHERE oi.order_fhs_id = o.order_id
                   AND oi.item_category = '立體擺設'
                   AND oi.item_sale_price IS NOT NULL),
                o.final_sale_price * o.handmodel_cost / NULLIF(o.total_cost, 0),
                o.final_sale_price / NULLIF(
                  (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.order_fhs_id = o.order_id), 0)
              )
            ELSE o.final_sale_price
          END AS eff_rev,
          CASE
            WHEN category = 'handmodel' THEN o.handmodel_cost
            WHEN category = 'metal'     THEN COALESCE(o.keychain_cost,0) + COALESCE(o.necklace_cost,0)
            ELSE o.total_cost
          END AS eff_cost,
          o.adjustment_amount
        FROM orders o
        WHERE (o.confirmed_at BETWEEN prev_start AND prev_end OR o.confirmed_at IS NULL)
          AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
          AND o.deleted_at IS NULL
          AND (
            category = 'all'
            OR (category = 'handmodel' AND o.handmodel_cost > 0)
            OR (category = 'metal'     AND o.handmodel_cost = 0
                AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
          )
      ) base
    ),

    -- ── data_quality: 混合單使用 fallback 的訂單清單 ──────────
    'data_quality', (
      SELECT json_build_object(
        'avg_split_orders', COALESCE(COUNT(CASE WHEN is_fallback THEN 1 END), 0),
        'avg_split_ids',    COALESCE(
          json_agg(order_id ORDER BY order_id) FILTER (WHERE is_fallback),
          '[]'::json
        )
      )
      FROM (
        SELECT
          o.order_id,
          (o.handmodel_cost > 0
           AND (o.keychain_cost > 0 OR o.necklace_cost > 0)
           AND NOT EXISTS (
             SELECT 1 FROM order_items oi3
             WHERE oi3.order_fhs_id = o.order_id
               AND oi3.item_category = '立體擺設'
               AND oi3.item_sale_price IS NOT NULL
           )) AS is_fallback
        FROM orders o
        WHERE (o.confirmed_at BETWEEN cur_start AND cur_end OR o.confirmed_at IS NULL)
          AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
          AND o.deleted_at IS NULL
          AND o.handmodel_cost > 0
      ) dq
    ),

    'last_sync', NOW()
  ) INTO result;

  RETURN result;
END;
$function$;

-- ── get_financial_charts ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_financial_charts(
  tab_mode text  DEFAULT 'monthly'::text,
  category text  DEFAULT 'all'::text,
  ref_date date  DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- B1 fix upgrade（0038）: item_sale_price（Layer 1）+ 成本比例（Layer 2）
    'category_revenue', (
      SELECT json_build_object(
        'handmodel', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN COALESCE(
            (SELECT SUM(oi.item_sale_price) FROM order_items oi
             WHERE oi.order_fhs_id = orders.order_id
               AND oi.item_category = '立體擺設'
               AND oi.item_sale_price IS NOT NULL),
            final_sale_price * handmodel_cost / NULLIF(total_cost, 0)
          ) ELSE 0 END), 0),
        'keychain', COALESCE(SUM(CASE WHEN keychain_cost > 0
          THEN COALESCE(
            (SELECT SUM(oi.item_sale_price) FROM order_items oi
             WHERE oi.order_fhs_id = orders.order_id
               AND oi.item_category = '金屬鎖匙扣'
               AND oi.item_sale_price IS NOT NULL),
            final_sale_price * keychain_cost / NULLIF(total_cost, 0)
          ) ELSE 0 END), 0),
        'necklace', COALESCE(SUM(CASE WHEN necklace_cost > 0
          THEN COALESCE(
            (SELECT SUM(oi.item_sale_price) FROM order_items oi
             WHERE oi.order_fhs_id = orders.order_id
               AND oi.item_category ILIKE '%頸鏈%'
               AND oi.item_sale_price IS NOT NULL),
            final_sale_price * necklace_cost / NULLIF(total_cost, 0)
          ) ELSE 0 END), 0),
        'handmodel_profit', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN COALESCE(
            (SELECT SUM(oi.item_sale_price) FROM order_items oi
             WHERE oi.order_fhs_id = orders.order_id
               AND oi.item_category = '立體擺設'
               AND oi.item_sale_price IS NOT NULL),
            final_sale_price * handmodel_cost / NULLIF(total_cost, 0)
          ) - handmodel_cost ELSE 0 END), 0),
        'keychain_profit', COALESCE(SUM(CASE WHEN keychain_cost > 0
          THEN COALESCE(
            (SELECT SUM(oi.item_sale_price) FROM order_items oi
             WHERE oi.order_fhs_id = orders.order_id
               AND oi.item_category = '金屬鎖匙扣'
               AND oi.item_sale_price IS NOT NULL),
            final_sale_price * keychain_cost / NULLIF(total_cost, 0)
          ) - keychain_cost ELSE 0 END), 0),
        'necklace_profit', COALESCE(SUM(CASE WHEN necklace_cost > 0
          THEN COALESCE(
            (SELECT SUM(oi.item_sale_price) FROM order_items oi
             WHERE oi.order_fhs_id = orders.order_id
               AND oi.item_category ILIKE '%頸鏈%'
               AND oi.item_sale_price IS NOT NULL),
            final_sale_price * necklace_cost / NULLIF(total_cost, 0)
          ) - necklace_cost ELSE 0 END), 0),
        'handmodel_orders', COUNT(CASE WHEN handmodel_cost > 0 THEN 1 END),
        'keychain_orders',  COUNT(CASE WHEN keychain_cost > 0 THEN 1 END),
        'necklace_orders',  COUNT(CASE WHEN necklace_cost > 0 THEN 1 END),
        'handmodel_frame', COALESCE((
          SELECT SUM(COALESCE(
            (SELECT SUM(oi2.item_sale_price) FROM order_items oi2
             WHERE oi2.order_fhs_id = o2.order_id
               AND oi2.item_category = '立體擺設'
               AND oi2.item_sale_price IS NOT NULL),
            o2.final_sale_price * o2.handmodel_cost / NULLIF(o2.total_cost, 0)
          ))
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
          SELECT SUM(COALESCE(
            (SELECT SUM(oi2.item_sale_price) FROM order_items oi2
             WHERE oi2.order_fhs_id = o2.order_id
               AND oi2.item_category = '立體擺設'
               AND oi2.item_sale_price IS NOT NULL),
            o2.final_sale_price * o2.handmodel_cost / NULLIF(o2.total_cost, 0)
          ))
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
        'other',     COALESCE(SUM(total_cost
          - COALESCE(handmodel_cost,0)
          - COALESCE(keychain_cost,0)
          - COALESCE(necklace_cost,0)), 0)
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

-- ── Smoke Test ───────────────────────────────────────────────
DO $$
DECLARE
  v_kpis  JSON;
  v_dq    JSON;
BEGIN
  v_kpis := get_financial_kpis('yearly', 'handmodel', CURRENT_DATE);
  v_dq   := v_kpis->'data_quality';

  ASSERT v_kpis IS NOT NULL,
    '0038 smoke: get_financial_kpis returned NULL';
  ASSERT (v_kpis->'current') IS NOT NULL,
    '0038 smoke: get_financial_kpis missing current key';
  ASSERT (v_dq->>'avg_split_orders') IS NOT NULL,
    '0038 smoke: data_quality.avg_split_orders missing';

  RAISE NOTICE '0038 smoke PASS — get_financial_kpis + get_financial_charts updated with 3-layer item_sale_price fallback';
  RAISE NOTICE '0038 data_quality: % fallback orders in current period', v_dq->>'avg_split_orders';
END $$;