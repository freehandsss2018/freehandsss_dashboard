-- ============================================================
-- Migration 0041: F4 未確認單雙計修復 + F3 trend 3-layer 口徑對齊
-- ============================================================
-- F4: get_financial_kpis — previous 期移除 OR confirmed_at IS NULL
--     unconfirmed 單只計入 current 期，previous 不再雙計
-- F3: get_financial_charts — trend block 重構為 per-order eff_rev
--     鏡像 kpis 3-layer 邏輯，category 模式下趨勢與 KPI 口徑對齊
-- ============================================================
-- ⚠️  語義變動警告：
--   F4 修復後 previous 期對比數字會改變（消除雙計偽值）
--   F3 修復後 category='metal'/'handmodel' 趨勢圖數字會調整
--   兩者均為「修正至正確值」，屬預期變動，before/after 快照見 artifacts/
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_financial_kpis(
  tab_mode text  DEFAULT 'current'::text,
  category text  DEFAULT 'all'::text,
  ref_date date  DEFAULT CURRENT_DATE
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
            WHEN category = 'metal' AND o.handmodel_cost > 0
              THEN COALESCE(
                (SELECT SUM(oi.item_sale_price) FROM order_items oi
                 WHERE oi.order_fhs_id = o.order_id
                   AND (oi.item_category = '金屬鎖匙扣' OR oi.item_category ILIKE '%頸鏈%')
                   AND oi.item_sale_price IS NOT NULL),
                o.final_sale_price
                  * (COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0))
                  / NULLIF(o.total_cost, 0),
                o.final_sale_price / NULLIF(
                  (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.order_fhs_id = o.order_id), 0)
              )
            ELSE o.final_sale_price
          END AS eff_rev,
          CASE
            WHEN category = 'handmodel' THEN o.handmodel_cost
            WHEN category = 'metal'     THEN COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0)
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
            OR (category = 'metal' AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
          )
      ) base
    ),
    'previous', (
      SELECT json_build_object(
        'revenue', COALESCE(SUM(eff_rev), 0),
        'cost',    COALESCE(SUM(eff_cost), 0) + COALESCE(SUM(adjustment_amount), 0),
        'profit',  COALESCE(SUM(eff_rev - eff_cost), 0) - COALESCE(SUM(adjustment_amount), 0),
        'orders',  COUNT(*),
        'orders_inclusive', CASE
          WHEN category = 'handmodel' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE o2.confirmed_at BETWEEN prev_start AND prev_end
              AND o2.process_status::TEXT NOT IN ('cancelled', 'refunded')
              AND o2.deleted_at IS NULL
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE o2.confirmed_at BETWEEN prev_start AND prev_end
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
            WHEN category = 'metal' AND o.handmodel_cost > 0
              THEN COALESCE(
                (SELECT SUM(oi.item_sale_price) FROM order_items oi
                 WHERE oi.order_fhs_id = o.order_id
                   AND (oi.item_category = '金屬鎖匙扣' OR oi.item_category ILIKE '%頸鏈%')
                   AND oi.item_sale_price IS NOT NULL),
                o.final_sale_price
                  * (COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0))
                  / NULLIF(o.total_cost, 0),
                o.final_sale_price / NULLIF(
                  (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.order_fhs_id = o.order_id), 0)
              )
            ELSE o.final_sale_price
          END AS eff_rev,
          CASE
            WHEN category = 'handmodel' THEN o.handmodel_cost
            WHEN category = 'metal'     THEN COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0)
            ELSE o.total_cost
          END AS eff_cost,
          o.adjustment_amount
        FROM orders o
        -- F4: previous 期移除 OR o.confirmed_at IS NULL（消除 unconfirmed 雙計）
        WHERE o.confirmed_at BETWEEN prev_start AND prev_end
          AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
          AND o.deleted_at IS NULL
          AND (
            category = 'all'
            OR (category = 'handmodel' AND o.handmodel_cost > 0)
            OR (category = 'metal' AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
          )
      ) base
    ),
    'data_quality', (
      SELECT json_build_object(
        'avg_split_orders', COALESCE(COUNT(CASE WHEN is_fallback THEN 1 END), 0),
        'avg_split_ids',    COALESCE(
          json_agg(order_id ORDER BY order_id) FILTER (WHERE is_fallback),
          '[]'::json
        ),
        'metal_fallback_orders', COALESCE(COUNT(CASE WHEN is_metal_fallback THEN 1 END), 0),
        'metal_fallback_ids', COALESCE(
          json_agg(order_id ORDER BY order_id) FILTER (WHERE is_metal_fallback),
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
           )) AS is_fallback,
          (o.handmodel_cost > 0
           AND (o.keychain_cost > 0 OR o.necklace_cost > 0)
           AND NOT EXISTS (
             SELECT 1 FROM order_items oi4
             WHERE oi4.order_fhs_id = o.order_id
               AND (oi4.item_category = '金屬鎖匙扣' OR oi4.item_category ILIKE '%頸鏈%')
               AND oi4.item_sale_price IS NOT NULL
           )) AS is_metal_fallback
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

    -- F3: trend 重構為 per-order eff_rev，再 GROUP BY 月份
    --     category 模式下趨勢圖與 KPI 口徑對齊（0040 前：全額 final_sale_price）
    'trend', (
      SELECT json_agg(row ORDER BY row.period)
      FROM (
        SELECT
          TO_CHAR(grp.period_month, 'YYYY-MM')           AS period,
          COALESCE(SUM(grp.eff_rev), 0)                  AS revenue,
          COALESCE(SUM(grp.eff_rev - grp.eff_cost), 0)   AS profit,
          COALESCE(SUM(grp.eff_cost), 0)                 AS cost
        FROM (
          SELECT
            DATE_TRUNC('month', o.confirmed_at) AS period_month,
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
              WHEN category = 'metal' AND o.handmodel_cost > 0
                THEN COALESCE(
                  (SELECT SUM(oi.item_sale_price) FROM order_items oi
                   WHERE oi.order_fhs_id = o.order_id
                     AND (oi.item_category = '金屬鎖匙扣' OR oi.item_category ILIKE '%頸鏈%')
                     AND oi.item_sale_price IS NOT NULL),
                  o.final_sale_price
                    * (COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0))
                    / NULLIF(o.total_cost, 0),
                  o.final_sale_price / NULLIF(
                    (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.order_fhs_id = o.order_id), 0)
                )
              ELSE o.final_sale_price
            END AS eff_rev,
            CASE
              WHEN category = 'handmodel' THEN o.handmodel_cost
              WHEN category = 'metal'     THEN COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0)
              ELSE o.total_cost
            END AS eff_cost
          FROM orders o
          WHERE o.confirmed_at BETWEEN cur_start AND cur_end
            AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
            AND o.deleted_at IS NULL
            AND (
              category = 'all'
              OR (category = 'handmodel' AND o.handmodel_cost > 0)
              OR (category = 'metal'     AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
            )
        ) grp
        GROUP BY grp.period_month
      ) row
    ),

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
            AND o2.deleted_at IS NULL
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
            AND o2.deleted_at IS NULL
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
        AND deleted_at IS NULL
    ),

    'cost_breakdown', (
      SELECT json_build_object(
        'handmodel', COALESCE(SUM(handmodel_cost), 0),
        'keychain',  COALESCE(SUM(keychain_cost), 0),
        'necklace',  COALESCE(SUM(necklace_cost), 0),
        'other',     COALESCE(SUM(total_cost
          - COALESCE(handmodel_cost, 0)
          - COALESCE(keychain_cost, 0)
          - COALESCE(necklace_cost, 0)), 0)
      )
      FROM orders
      WHERE confirmed_at BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('cancelled', 'refunded')
        AND deleted_at IS NULL
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
  v_kpis_prev_all   JSON;
  v_kpis_cur_metal  JSON;
  v_charts          JSON;
  v_prev_orders     NUMERIC;
  v_trend           JSON;
BEGIN
  -- F4: previous 期不再含 unconfirmed 單（confirmed_at IS NULL 的單不應出現在 previous）
  v_kpis_prev_all := get_financial_kpis('yearly', 'all', CURRENT_DATE);
  v_prev_orders   := (v_kpis_prev_all->'previous'->>'orders')::NUMERIC;
  ASSERT v_prev_orders IS NOT NULL,
    '0041 smoke FAIL: previous.orders IS NULL';

  -- F4: current 仍含 unconfirmed 單（OR confirmed_at IS NULL 保留）
  v_kpis_cur_metal := get_financial_kpis('yearly', 'metal', CURRENT_DATE);
  ASSERT (v_kpis_cur_metal->'current'->>'revenue')::NUMERIC >= 0,
    '0041 smoke FAIL: current metal revenue < 0';

  -- F3: trend 不為 NULL，且為陣列
  v_charts := get_financial_charts('yearly', 'metal', CURRENT_DATE);
  v_trend  := v_charts->'trend';
  ASSERT v_trend IS NOT NULL,
    '0041 smoke FAIL: charts trend NULL';

  -- F3: trend 各行有 revenue/profit/cost 欄位
  ASSERT (v_trend->0->>'revenue') IS NOT NULL OR json_array_length(v_trend) = 0,
    '0041 smoke FAIL: trend[0].revenue missing';

  RAISE NOTICE '0041 smoke PASS — prev_orders=%, metal_trend_rows=%',
    v_prev_orders,
    CASE WHEN v_trend IS NULL THEN 0 ELSE json_array_length(v_trend) END;
END $$;
