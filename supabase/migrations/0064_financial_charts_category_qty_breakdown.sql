-- 0064_financial_charts_category_qty_breakdown.sql
-- Financial Overview「訂單數」KPI 卡細項 bar 語意修正：
-- Fat Mo 回報手模擺設/頸鏈吊飾/鎖匙扣三行細項顯示「單」(訂單數)，但應以「件」(品項數量) 呈現；
-- 頂層「訂單數」大數字（12）繼續以訂單號計算（get_financial_kpis，不受本次改動影響）。
--
-- 根因：get_financial_charts() category_revenue 內 handmodel_orders/keychain_orders/
-- necklace_orders 三個欄位用 COUNT(CASE WHEN xxx_cost > 0 THEN 1 END) 數「有此分類成本的訂單數」，
-- 語意上一直係訂單計數而非品項數量。例：2張鎖匙扣訂單各含4件鎖匙扣 → 舊值顯示2單，
-- 新值應顯示8件（COALESCE(SUM(oi.quantity),0)，按 order_items.quantity 加總）。
-- 三個欄位 key 名稱維持不變（下游 0061/0062 get_financial_overview_full()
-- breakdown.orders 陣列沿用同一組 key），只改內部計算方式；前端 unit label
-- 由「單」改「件」同步於 Freehandsss_Dashboard 兩份 HTML。

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
        -- 0064: 由「訂單數」COUNT 改「品項數量」SUM(order_items.quantity)，
        -- key 名稱沿用（handmodel_orders/keychain_orders/necklace_orders）避免下游 0061/0062 改動。
        'handmodel_orders', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                WHERE oi.order_fhs_id = orders.order_id
                  AND oi.item_category = '立體擺設')
          ELSE 0 END), 0),
        'keychain_orders', COALESCE(SUM(CASE WHEN keychain_cost > 0
          THEN (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                WHERE oi.order_fhs_id = orders.order_id
                  AND oi.item_category = '金屬鎖匙扣')
          ELSE 0 END), 0),
        'necklace_orders', COALESCE(SUM(CASE WHEN necklace_cost > 0
          THEN (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                WHERE oi.order_fhs_id = orders.order_id
                  AND oi.item_category ILIKE '%頸鏈%')
          ELSE 0 END), 0),
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
  v_charts JSON;
  v_hm_qty NUMERIC;
BEGIN
  v_charts := get_financial_charts('current', 'all', CURRENT_DATE);
  v_hm_qty := (v_charts->'category_revenue'->>'handmodel_orders')::NUMERIC;
  ASSERT v_hm_qty IS NOT NULL,
    '0064 smoke FAIL: category_revenue.handmodel_orders IS NULL';
  RAISE NOTICE '0064 smoke OK: handmodel qty=%, keychain qty=%, necklace qty=%',
    v_charts->'category_revenue'->>'handmodel_orders',
    v_charts->'category_revenue'->>'keychain_orders',
    v_charts->'category_revenue'->>'necklace_orders';
END $$;
