-- 0067_handmodel_orders_frame_bottle_split.sql
-- Fat Mo 要求：財務總覽「訂單數」KPI 卡的「手模擺設」細項，再拆分為「木框」及「玻璃瓶」兩行
-- （其餘 收入/成本/毛利 三張卡的「手模擺設」維持合併不變，只有「訂單數」卡拆分——
-- 因手模擺設 cost 固定 $210 flat，木框/玻璃瓶不分家，冇清晰嘅拆分收入基礎；但品項數量可以直接拆）。
--
-- 資料品質發現：product_sku ILIKE '%木框%'/'%玻璃瓶%' 直接比對會漏 2 件（Yearly 2026 實測：
-- 23 木框 + 7 玻璃瓶 = 30，但『立體擺設』分類真實總數係 32）。查證漏咗嗰 2 件屬於已知嘅
-- avg_split fallback 訂單（0500719/0600722，data_quality.avg_split_ids 早已收錄），
-- 呢兩件 order_items.product_sku 係 NULL，但 specification 欄位正確寫住「木框款式」。
-- 故用 product_sku 為主，product_sku IS NULL 時 fallback 用 specification 補齊分類，
-- 令 25 木框 + 7 玻璃瓶 = 32，同「手模擺設」原有總數完全吻合，不會憑空少咗2件。
--
-- 實作：
--   1. get_financial_charts() category_revenue 新增 handmodel_frame_orders/handmodel_bottle_orders
--      （品項數量，同 0064 handmodel_orders 同一組 SUM(oi.quantity) 手法，僅按 SKU/specification 再分流）。
--   2. fhs_build_financial_overview_tab() breakdown.all／breakdown.handmodel 新增 'ordersLabels'
--      （只有 orders 這個 metric 用 4 行標籤['木框','玻璃瓶','頸鏈吊飾','鎖匙扣']，
--      revenue/cost/profit 三個 metric 的 'labels' 保持 3 行['手模擺設','頸鏈吊飾','鎖匙扣']不變）。
--      前端渲染迴圈需要相應改動：'orders' metric 優先讀 bkd.ordersLabels，其餘 metric 讀 bkd.labels。

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
            DATE_TRUNC('month', LEAST(o.confirmed_at, o.appointment_at)) AS period_month,
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
          WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
            AND o.process_status::TEXT NOT IN ('已取消')
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
        -- 0067: 手模擺設品項數量再拆木框/玻璃瓶；product_sku 為主，NULL 時 fallback 用 specification
        -- （補齊 avg_split 舊單缺 SKU 的資料缺口，令 frame+bottle 總和同 handmodel_orders 吻合）
        'handmodel_frame_orders', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                WHERE oi.order_fhs_id = orders.order_id
                  AND oi.item_category = '立體擺設'
                  AND (oi.product_sku ILIKE '%木框%'
                       OR (oi.product_sku IS NULL AND oi.specification ILIKE '%木框%')))
          ELSE 0 END), 0),
        'handmodel_bottle_orders', COALESCE(SUM(CASE WHEN handmodel_cost > 0
          THEN (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                WHERE oi.order_fhs_id = orders.order_id
                  AND oi.item_category = '立體擺設'
                  AND (oi.product_sku ILIKE '%玻璃瓶%'
                       OR (oi.product_sku IS NULL AND oi.specification ILIKE '%玻璃瓶%')))
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
          WHERE LEAST(o2.confirmed_at, o2.appointment_at) BETWEEN cur_start AND cur_end
            AND o2.process_status::TEXT NOT IN ('已取消')
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
          WHERE LEAST(o2.confirmed_at, o2.appointment_at) BETWEEN cur_start AND cur_end
            AND o2.process_status::TEXT NOT IN ('已取消')
            AND o2.deleted_at IS NULL
            AND o2.handmodel_cost > 0
            AND EXISTS (
              SELECT 1 FROM order_items oi
              WHERE oi.order_fhs_id = o2.order_id AND oi.product_sku ILIKE '%玻璃瓶%'
            )
        ), 0)
      )
      FROM orders
      WHERE LEAST(confirmed_at, appointment_at) BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('已取消')
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
      WHERE LEAST(confirmed_at, appointment_at) BETWEEN cur_start AND cur_end
        AND process_status::TEXT NOT IN ('已取消')
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

CREATE OR REPLACE FUNCTION public.fhs_build_financial_overview_tab(p_tab text, p_ref_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  k_all    jsonb := get_financial_kpis(p_tab, 'all', p_ref_date)::jsonb;
  k_hm     jsonb := get_financial_kpis(p_tab, 'handmodel', p_ref_date)::jsonb;
  k_metal  jsonb := get_financial_kpis(p_tab, 'metal', p_ref_date)::jsonb;
  c_all    jsonb := get_financial_charts(p_tab, 'all', p_ref_date)::jsonb;
  MONTH_ZH text[] := ARRAY['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  v_subtitle text;
  cur_rev numeric; cur_cost numeric; cur_profit numeric; cur_orders numeric;
  prev_rev numeric; prev_cost numeric; prev_profit numeric; prev_orders numeric;
  cur_aov numeric; prev_aov numeric;
  v_margin_change numeric;
  v_is_new_business boolean;
  line_chart json;
  result json;
BEGIN
  cur_rev    := (k_all->'current'->>'revenue')::numeric;
  cur_cost   := (k_all->'current'->>'cost')::numeric;
  cur_profit := (k_all->'current'->>'profit')::numeric;
  cur_orders := (k_all->'current'->>'orders')::numeric;
  prev_rev    := (k_all->'previous'->>'revenue')::numeric;
  prev_cost   := (k_all->'previous'->>'cost')::numeric;
  prev_profit := (k_all->'previous'->>'profit')::numeric;
  prev_orders := (k_all->'previous'->>'orders')::numeric;

  v_is_new_business := (prev_rev IS NULL OR prev_rev = 0);

  v_margin_change := CASE
    WHEN cur_rev IS NOT NULL AND cur_rev <> 0 AND prev_rev IS NOT NULL AND prev_rev <> 0
    THEN (cur_profit / cur_rev * 100) - (prev_profit / prev_rev * 100)
    ELSE NULL
  END;

  cur_aov  := CASE WHEN cur_orders  IS NOT NULL AND cur_orders  > 0 THEN cur_rev  / cur_orders  ELSE NULL END;
  prev_aov := CASE WHEN prev_orders IS NOT NULL AND prev_orders > 0 THEN prev_rev / prev_orders ELSE NULL END;

  v_subtitle := CASE p_tab
    WHEN 'current' THEN 'vs 去年同期'
    WHEN 'monthly'  THEN 'vs 上個月'
    WHEN 'yearly'   THEN 'vs 上一年全年'
    ELSE 'vs 去年同期'
  END;

  SELECT json_build_object(
    'labels',  array_agg(MONTH_ZH[substring(t->>'period' from 6 for 2)::int] ORDER BY t->>'period'),
    'revenue', array_agg((t->>'revenue')::numeric ORDER BY t->>'period'),
    'cost',    array_agg((t->>'cost')::numeric ORDER BY t->>'period'),
    'profit',  array_agg((t->>'profit')::numeric ORDER BY t->>'period')
  ) INTO line_chart
  FROM jsonb_array_elements(c_all->'trend') AS t;

  IF line_chart IS NULL THEN
    line_chart := json_build_object('labels', '[]'::json, 'revenue', '[]'::json, 'cost', '[]'::json, 'profit', '[]'::json);
  END IF;

  SELECT json_build_object(
    'revenue',       cur_rev,
    'cost',          cur_cost,
    'profit',        cur_profit,
    'orders',        cur_orders,
    'revenueChange', fhs_pct(cur_rev, prev_rev),
    'costChange',    fhs_pct(cur_cost, prev_cost),
    'profitChange',  fhs_pct(cur_profit, prev_profit),
    'ordersChange',  fhs_pct(cur_orders, prev_orders),
    'marginChange',  v_margin_change,
    'aovChange',     fhs_pct_or_null(cur_aov, prev_aov),
    'isNewBusiness', v_is_new_business,
    'subtitle',      v_subtitle,
    'margin',        (k_all->'current'->>'margin')::numeric,
    'aov',           (k_all->'current'->>'aov')::numeric,
    'groups', json_build_object(
      'all', json_build_object(
        'revenue', cur_rev, 'cost', cur_cost, 'orders', cur_orders,
        'orders_inclusive', COALESCE((k_all->'current'->>'orders_inclusive')::numeric, cur_orders)
      ),
      'handmodel', json_build_object(
        'revenue', (k_hm->'current'->>'revenue')::numeric,
        'cost',    (k_hm->'current'->>'cost')::numeric,
        'orders',  (k_hm->'current'->>'orders')::numeric,
        'orders_inclusive', COALESCE((k_hm->'current'->>'orders_inclusive')::numeric, (k_hm->'current'->>'orders')::numeric)
      ),
      'metal', json_build_object(
        'revenue', (k_metal->'current'->>'revenue')::numeric,
        'cost',    (k_metal->'current'->>'cost')::numeric,
        'orders',  (k_metal->'current'->>'orders')::numeric,
        'orders_inclusive', COALESCE((k_metal->'current'->>'orders_inclusive')::numeric, (k_metal->'current'->>'orders')::numeric)
      )
    ),
    'handmodel_qty', k_all->'current'->'handmodel_qty',
    'metal_qty',     k_all->'current'->'metal_qty',
    'lineChart', line_chart,
    'barChart', json_build_object(
      'all', json_build_object(
        'labels', ARRAY['手模擺設','頸鏈吊飾','鎖匙扣'],
        'values', ARRAY[
          (c_all->'category_revenue'->>'handmodel')::numeric,
          (c_all->'category_revenue'->>'necklace')::numeric,
          (c_all->'category_revenue'->>'keychain')::numeric
        ]
      ),
      'handmodel', json_build_object(
        'labels', ARRAY['手模擺設'],
        'values', ARRAY[(c_all->'category_revenue'->>'handmodel')::numeric]
      ),
      'metal', json_build_object(
        'labels', ARRAY['頸鏈吊飾','鎖匙扣'],
        'values', ARRAY[
          (c_all->'category_revenue'->>'necklace')::numeric,
          (c_all->'category_revenue'->>'keychain')::numeric
        ]
      )
    ),
    'pieChart', json_build_object(
      'all', json_build_object(
        'labels', ARRAY['手模擺設','頸鏈吊飾','鎖匙扣'],
        'values', ARRAY[
          (c_all->'cost_breakdown'->>'handmodel')::numeric,
          (c_all->'cost_breakdown'->>'necklace')::numeric,
          (c_all->'cost_breakdown'->>'keychain')::numeric
        ],
        'colors', ARRAY['#7B1FA2','#0288D1','#26C6DA']
      ),
      'handmodel', json_build_object(
        'labels', ARRAY['手模擺設'],
        'values', ARRAY[(c_all->'cost_breakdown'->>'handmodel')::numeric],
        'colors', ARRAY['#7B1FA2']
      ),
      'metal', json_build_object(
        'labels', ARRAY['頸鏈吊飾','鎖匙扣'],
        'values', ARRAY[
          (c_all->'cost_breakdown'->>'necklace')::numeric,
          (c_all->'cost_breakdown'->>'keychain')::numeric
        ],
        'colors', ARRAY['#0288D1','#26C6DA']
      )
    ),
    'breakdown', json_build_object(
      'all', json_build_object(
        'labels',  ARRAY['手模擺設','頸鏈吊飾','鎖匙扣'],
        'revenue', ARRAY[
          (c_all->'category_revenue'->>'handmodel')::numeric,
          (c_all->'category_revenue'->>'necklace')::numeric,
          (c_all->'category_revenue'->>'keychain')::numeric
        ],
        'cost', ARRAY[
          (c_all->'cost_breakdown'->>'handmodel')::numeric,
          (c_all->'cost_breakdown'->>'necklace')::numeric,
          (c_all->'cost_breakdown'->>'keychain')::numeric
        ],
        'profit', ARRAY[
          (c_all->'category_revenue'->>'handmodel_profit')::numeric,
          (c_all->'category_revenue'->>'necklace_profit')::numeric,
          (c_all->'category_revenue'->>'keychain_profit')::numeric
        ],
        -- 0067: orders 專用 4 行標籤（木框/玻璃瓶/頸鏈吊飾/鎖匙扣），revenue/cost/profit 仍用上面 3 行 labels
        'ordersLabels', ARRAY['木框','玻璃瓶','頸鏈吊飾','鎖匙扣'],
        'orders', ARRAY[
          (c_all->'category_revenue'->>'handmodel_frame_orders')::int,
          (c_all->'category_revenue'->>'handmodel_bottle_orders')::int,
          (c_all->'category_revenue'->>'necklace_orders')::int,
          (c_all->'category_revenue'->>'keychain_orders')::int
        ]
      ),
      'handmodel', json_build_object(
        'labels',  ARRAY['手模擺設'],
        'revenue', ARRAY[(c_all->'category_revenue'->>'handmodel')::numeric],
        'cost',    ARRAY[(c_all->'cost_breakdown'->>'handmodel')::numeric],
        'profit',  ARRAY[(c_all->'category_revenue'->>'handmodel_profit')::numeric],
        'ordersLabels', ARRAY['木框','玻璃瓶'],
        'orders',  ARRAY[
          (c_all->'category_revenue'->>'handmodel_frame_orders')::int,
          (c_all->'category_revenue'->>'handmodel_bottle_orders')::int
        ]
      ),
      'metal', json_build_object(
        'labels',  ARRAY['頸鏈吊飾','鎖匙扣'],
        'revenue', ARRAY[
          (c_all->'category_revenue'->>'necklace')::numeric,
          (c_all->'category_revenue'->>'keychain')::numeric
        ],
        'cost', ARRAY[
          (c_all->'cost_breakdown'->>'necklace')::numeric,
          (c_all->'cost_breakdown'->>'keychain')::numeric
        ],
        'profit', ARRAY[
          (c_all->'category_revenue'->>'necklace_profit')::numeric,
          (c_all->'category_revenue'->>'keychain_profit')::numeric
        ],
        'orders', ARRAY[
          (c_all->'category_revenue'->>'necklace_orders')::int,
          (c_all->'category_revenue'->>'keychain_orders')::int
        ]
      )
    ),
    'data_quality', k_all->'data_quality',
    'last_sync', k_all->>'last_sync'
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_charts(text, text, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fhs_build_financial_overview_tab(text, date) TO anon, authenticated, service_role;

-- ── Smoke Test ───────────────────────────────────────────────
DO $$
DECLARE
  v_tab JSON;
  v_frame INT; v_bottle INT; v_total_qty INT;
BEGIN
  v_tab := fhs_build_financial_overview_tab('yearly', CURRENT_DATE);
  v_frame  := (v_tab->'breakdown'->'all'->'orders'->>0)::INT;
  v_bottle := (v_tab->'breakdown'->'all'->'orders'->>1)::INT;
  ASSERT v_frame IS NOT NULL AND v_bottle IS NOT NULL,
    '0067 smoke FAIL: breakdown.all.orders[0]/[1] (frame/bottle) IS NULL';
  ASSERT jsonb_array_length((v_tab->'breakdown'->'all'->'ordersLabels')::jsonb) = 4,
    '0067 smoke FAIL: ordersLabels length != 4';
  RAISE NOTICE '0067 smoke OK: frame=%, bottle=%, ordersLabels=%',
    v_frame, v_bottle, v_tab->'breakdown'->'all'->'ordersLabels';
END $$;
