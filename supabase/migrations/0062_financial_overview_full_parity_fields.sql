-- 0062_financial_overview_full_parity_fields.sql
-- Financial Overview 統一資料來源 Step 2：補齊 `fhs_build_financial_overview_tab`
-- 缺少嘅 3 個前端衍生欄位（marginChange/aovChange/isNewBusiness）+ groups.*.orders_inclusive，
-- 令 get_financial_overview_full() 可以完全取代前端 sbFetchFinancial() 嘅 12-call client-side
-- 組裝邏輯，唔再有兩處各自實作同一份 shape（decisions.md D43續二 記錄）。
--
-- 語義完全對齊 Freehandsss_dashboard_current.html sbFetchFinancial() 原有 buildTab()：
--   isNewBusiness = !prev.revenue
--   marginChange  = (cur.revenue && prev.revenue) ? (cur.profit/cur.revenue*100) - (prev.profit/prev.revenue*100) : null
--   aovChange     = pct(cur.orders?cur.revenue/cur.orders:null, prev.orders?prev.revenue/prev.orders:null)
--                   （原 JS pct() 對 prev 為 0/null 時回傳 null，唔係 0——同 fhs_pct() 語義唔同，
--                    因此呢度唔用 fhs_pct，改用下面 fhs_pct_or_null）
-- subtitle 文案逐字對齊原 JS：current='vs 去年同期'／monthly='vs 上個月'／yearly='vs 上一年全年'

CREATE OR REPLACE FUNCTION public.fhs_pct_or_null(p_cur numeric, p_prev numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_prev IS NULL OR p_prev = 0 THEN NULL
    ELSE ROUND(((p_cur - p_prev) / ABS(p_prev)) * 1000) / 10
  END;
$$;

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
        'orders', ARRAY[
          (c_all->'category_revenue'->>'handmodel_orders')::int,
          (c_all->'category_revenue'->>'necklace_orders')::int,
          (c_all->'category_revenue'->>'keychain_orders')::int
        ]
      ),
      'handmodel', json_build_object(
        'labels',  ARRAY['手模擺設'],
        'revenue', ARRAY[(c_all->'category_revenue'->>'handmodel')::numeric],
        'cost',    ARRAY[(c_all->'cost_breakdown'->>'handmodel')::numeric],
        'profit',  ARRAY[(c_all->'category_revenue'->>'handmodel_profit')::numeric],
        'orders',  ARRAY[(c_all->'category_revenue'->>'handmodel_orders')::int]
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

GRANT EXECUTE ON FUNCTION public.fhs_pct_or_null(numeric, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fhs_build_financial_overview_tab(text, date) TO anon, authenticated, service_role;
