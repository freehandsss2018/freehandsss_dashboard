-- 0061_get_financial_overview_full.sql
-- Financial Overview 轉換層（選項 C）：新建單一整合 RPC，一次回傳 Dashboard
-- FO_LIVE_DATA/FO_MOCK_DATA 期望嘅完整形狀（current/monthly/yearly × groups/lineChart/
-- barChart/pieChart/breakdown/data_quality），組合現有已驗證嘅 get_financial_kpis /
-- get_financial_charts（零重複邏輯，唔重寫任何成本/3-layer 公式）。
--
-- 背景：.fhs/reports/planning/2026-07-22_financial-overview-3layer-gap-analysis.md
-- 決策：decisions.md D43續（Fat Mo 選項 C + 同步修正 Current/Monthly/Yearly 語義位移）
--
-- tab_mode 語義對齊 RPC 定義（修正原 n8n Financial Aggregator 嘅語義位移 bug）：
--   current = 本月迄今 vs 去年同期 ｜ monthly = 本月完整 vs 上月 ｜ yearly = 本年迄今 vs 去年同期

CREATE OR REPLACE FUNCTION public.fhs_pct(p_cur numeric, p_prev numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_prev IS NULL OR p_prev = 0 THEN 0::numeric
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

  v_subtitle := CASE p_tab
    WHEN 'current' THEN 'vs 去年同期'
    WHEN 'monthly'  THEN 'vs 上月'
    WHEN 'yearly'   THEN 'vs 去年同期'
    ELSE 'vs 去年同期'
  END;

  SELECT json_build_object(
    'labels',  array_agg(MONTH_ZH[substring(t->>'period' from 6 for 2)::int] ORDER BY t->>'period'),
    'revenue', array_agg((t->>'revenue')::numeric ORDER BY t->>'period'),
    'cost',    array_agg((t->>'cost')::numeric ORDER BY t->>'period'),
    'profit',  array_agg((t->>'profit')::numeric ORDER BY t->>'period')
  ) INTO line_chart
  FROM jsonb_array_elements(c_all->'trend') AS t;

  -- 冇任何一單落喺呢個期間時，trend 為空集合，line_chart 會係 NULL——補返空殼，避免前端 d.labels 爆錯
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
    'subtitle',      v_subtitle,
    'margin',        (k_all->'current'->>'margin')::numeric,
    'aov',           (k_all->'current'->>'aov')::numeric,
    'groups', json_build_object(
      'all',       json_build_object('revenue', cur_rev, 'cost', cur_cost, 'orders', cur_orders),
      'handmodel', json_build_object(
        'revenue', (k_hm->'current'->>'revenue')::numeric,
        'cost',    (k_hm->'current'->>'cost')::numeric,
        'orders',  (k_hm->'current'->>'orders')::numeric
      ),
      'metal', json_build_object(
        'revenue', (k_metal->'current'->>'revenue')::numeric,
        'cost',    (k_metal->'current'->>'cost')::numeric,
        'orders',  (k_metal->'current'->>'orders')::numeric
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

CREATE OR REPLACE FUNCTION public.get_financial_overview_full(ref_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'current', fhs_build_financial_overview_tab('current', ref_date),
    'monthly', fhs_build_financial_overview_tab('monthly', ref_date),
    'yearly',  fhs_build_financial_overview_tab('yearly', ref_date)
  );
$$;

GRANT EXECUTE ON FUNCTION public.fhs_pct(numeric, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fhs_build_financial_overview_tab(text, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_overview_full(date) TO anon, authenticated, service_role;
