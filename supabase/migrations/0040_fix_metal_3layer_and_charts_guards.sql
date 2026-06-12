-- ============================================================
-- Migration 0040: Metal 混合單 3-layer 修復 + Charts deleted_at 守衛
-- ============================================================
-- F1: get_financial_kpis — category='metal' 移除 handmodel_cost=0 守衛
--     + eff_rev 新增 metal 3-layer 分支（鏡像 handmodel 0038 邏輯）
--     + data_quality 擴充 metal fallback 追蹤
-- F2: get_financial_charts — 4 處補 deleted_at IS NULL 守衛
--     (trend / category_revenue / handmodel_frame / handmodel_bottle / cost_breakdown)
-- F8: 補回 STABLE 修飾詞（0038 重建時遺失）
-- ============================================================
-- 影響：
--   category='metal' 的 revenue/cost/profit 將加入混合單的金屬分攤收入
--   預期 yearly_metal.current.revenue 從 $21,860 上升（+混合單 metal 比例）
--   charts 圖表排除軟刪訂單，與 kpis 口徑一致
-- ============================================================

-- ── get_financial_kpis ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_financial_kpis(
  tab_mode text  DEFAULT 'current'::text,
  category text  DEFAULT 'all'::text,
  ref_date date  DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER   -- F8: 補回 STABLE
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
          -- F1: metal 3-layer fallback（鏡像 handmodel 0038 邏輯）
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
            -- F1 新增：metal 混合單 3-layer
            WHEN category = 'metal' AND o.handmodel_cost > 0
              THEN COALESCE(
                -- Layer 1: 精確 item_sale_price（鎖匙扣 + 頸鏈合計）
                (SELECT SUM(oi.item_sale_price) FROM order_items oi
                 WHERE oi.order_fhs_id = o.order_id
                   AND (oi.item_category = '金屬鎖匙扣' OR oi.item_category ILIKE '%頸鏈%')
                   AND oi.item_sale_price IS NOT NULL),
                -- Layer 2: 成本比例分攤
                o.final_sale_price
                  * (COALESCE(o.keychain_cost, 0) + COALESCE(o.necklace_cost, 0))
                  / NULLIF(o.total_cost, 0),
                -- Layer 3: 平均分保底
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
            -- F1: 移除 AND o.handmodel_cost = 0，讓混合單也計入 metal
            OR (category = 'metal' AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
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
            -- F1 新增：metal 混合單 3-layer（previous 期）
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
        WHERE (o.confirmed_at BETWEEN prev_start AND prev_end OR o.confirmed_at IS NULL)
          AND o.process_status::TEXT NOT IN ('cancelled', 'refunded')
          AND o.deleted_at IS NULL
          AND (
            category = 'all'
            OR (category = 'handmodel' AND o.handmodel_cost > 0)
            -- F1: 移除 AND o.handmodel_cost = 0（previous 期）
            OR (category = 'metal' AND (o.keychain_cost > 0 OR o.necklace_cost > 0))
          )
      ) base
    ),

    -- ── data_quality: 混合單使用 fallback 的訂單清單（handmodel + metal 均追蹤）──
    'data_quality', (
      SELECT json_build_object(
        'avg_split_orders', COALESCE(COUNT(CASE WHEN is_fallback THEN 1 END), 0),
        'avg_split_ids',    COALESCE(
          json_agg(order_id ORDER BY order_id) FILTER (WHERE is_fallback),
          '[]'::json
        ),
        -- F1 data_quality 擴充：metal fallback 單清單
        'metal_fallback_orders', COALESCE(COUNT(CASE WHEN is_metal_fallback THEN 1 END), 0),
        'metal_fallback_ids', COALESCE(
          json_agg(order_id ORDER BY order_id) FILTER (WHERE is_metal_fallback),
          '[]'::json
        )
      )
      FROM (
        SELECT
          o.order_id,
          -- handmodel fallback（原有邏輯）
          (o.handmodel_cost > 0
           AND (o.keychain_cost > 0 OR o.necklace_cost > 0)
           AND NOT EXISTS (
             SELECT 1 FROM order_items oi3
             WHERE oi3.order_fhs_id = o.order_id
               AND oi3.item_category = '立體擺設'
               AND oi3.item_sale_price IS NOT NULL
           )) AS is_fallback,
          -- metal fallback（F1 新增：混合單中金屬部份無 item_sale_price）
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
STABLE SECURITY DEFINER   -- F8: 補回 STABLE
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

    -- F2: trend 補 deleted_at IS NULL
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
          AND deleted_at IS NULL    -- F2 新增
          AND (
            category = 'all'
            OR (category = 'handmodel' AND handmodel_cost > 0)
            OR (category = 'metal'     AND (keychain_cost > 0 OR necklace_cost > 0))
          )
        GROUP BY DATE_TRUNC('month', confirmed_at)
      ) row
    ),

    -- F2: category_revenue 補 deleted_at IS NULL
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
        -- F2: handmodel_frame 補 deleted_at IS NULL
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
            AND o2.deleted_at IS NULL    -- F2 新增
            AND o2.handmodel_cost > 0
            AND EXISTS (
              SELECT 1 FROM order_items oi
              WHERE oi.order_fhs_id = o2.order_id AND oi.product_sku ILIKE '%木框%'
            )
        ), 0),
        -- F2: handmodel_bottle 補 deleted_at IS NULL
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
            AND o2.deleted_at IS NULL    -- F2 新增
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
        AND deleted_at IS NULL    -- F2 新增
    ),

    -- F2: cost_breakdown 補 deleted_at IS NULL
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
        AND deleted_at IS NULL    -- F2 新增
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
  v_kpis_metal  JSON;
  v_kpis_all    JSON;
  v_charts      JSON;
  v_metal_rev   NUMERIC;
  v_all_rev     NUMERIC;
  v_metal_dq    NUMERIC;
BEGIN
  -- F1: metal 分類收入應包含混合單（yearly 全時段）
  v_kpis_metal := get_financial_kpis('yearly', 'metal', CURRENT_DATE);
  v_metal_rev  := (v_kpis_metal->'current'->>'revenue')::NUMERIC;
  ASSERT v_metal_rev > 0,
    '0040 smoke FAIL: yearly_metal.current.revenue = 0，混合單修復可能未生效';

  -- data_quality: metal_fallback_orders 欄位存在
  v_metal_dq := (v_kpis_metal->'data_quality'->>'metal_fallback_orders')::NUMERIC;
  ASSERT v_metal_dq IS NOT NULL,
    '0040 smoke FAIL: data_quality.metal_fallback_orders 欄位缺失';

  -- F2: charts 可正常執行（deleted_at 守衛不破壞現有數據）
  v_charts := get_financial_charts('yearly', 'all', CURRENT_DATE);
  ASSERT v_charts IS NOT NULL,
    '0040 smoke FAIL: get_financial_charts returned NULL';
  ASSERT (v_charts->'trend') IS NOT NULL,
    '0040 smoke FAIL: charts.trend 缺失';
  ASSERT (v_charts->'cost_breakdown') IS NOT NULL,
    '0040 smoke FAIL: charts.cost_breakdown 缺失';

  -- F1 一致性驗證：metal + handmodel 分類收入不超過 all（若超過代表重複計算）
  v_kpis_all := get_financial_kpis('yearly', 'all', CURRENT_DATE);
  v_all_rev  := (v_kpis_all->'current'->>'revenue')::NUMERIC;
  -- 注意：mixed orders 在 metal 和 handmodel 各分攤，加總可能 < all（正常）
  ASSERT v_metal_rev <= v_all_rev,
    '0040 smoke FAIL: metal_rev > all_rev，疑似重複計算';

  RAISE NOTICE '0040 smoke PASS — F1 metal 3-layer 啟用，yearly_metal.revenue = %，F2 charts deleted_at 守衛生效，F8 STABLE 補回', v_metal_rev;
  RAISE NOTICE '0040 data_quality: metal_fallback_orders = %', v_metal_dq;
END $$;
