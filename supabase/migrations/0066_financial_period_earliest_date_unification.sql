-- 0066_financial_period_earliest_date_unification.sql
-- Fat Mo 裁決（2026-07-23）：財務 RPC 嘅「期間歸屬」日期由純 confirmed_at
-- 改為 LEAST(confirmed_at, appointment_at)（取兩者較早者）：
--   確認日期新過約定日期 → 用約定日期（Airtable→Supabase遷移期間confirmed_at較約定日期後嘅歷史單，還原原始業務日期）
--   約定日期新過確認日期 → 用確認日期（避免最近先確認、但約定日期未到嘅訂單被「XX迄今」cur_end=今天截斷，跌出本期收入）
--   任一方為NULL → 用另一方（COALESCE語義，Postgres LEAST()原生支援）
--   兩者皆NULL（草稿單）→ 排除（同現行行為一致）
--
-- 實測影響（Yearly/all, ref_date=2026-07-23）：41→40單，+0600106（未確認但有約定日期，Fat Mo確認
-- 「任一有date就當已計入」）、−0500509/0500703（confirmed_at喺2026但appointment_at喺2025，
-- 遷移期時序落差歷史單，改用較早嘅約定日期正確歸屬去2025）。
-- 4張最近確認、約定日期喺未來嘅單（0600037/07001009/070010010/0700101）維持計入本期，
-- 不再因為「約定日期>今天cur_end」而被誤判跌出（此問題喺純appointment_at優先方案下會發生，
-- 已改用LEAST()解決）。
--
-- 影響範圍：get_financial_kpis()（current/previous 兩期、orders_inclusive、metal_qty、
-- handmodel_qty、data_quality 全部期間篩選）+ get_financial_charts()（trend 月份分組、
-- category_revenue、handmodel_frame/bottle、cost_breakdown 全部期間篩選）。
-- 不影響：get_financial_overview_full()/fhs_build_financial_overview_tab()（0061/0062，
-- 純組裝上述兩個函式輸出，本身冇日期邏輯，自動繼承新口徑）。

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
            WHERE LEAST(o2.confirmed_at, o2.appointment_at) BETWEEN cur_start AND cur_end
              AND o2.process_status::TEXT NOT IN ('已取消')
              AND o2.deleted_at IS NULL
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE LEAST(o2.confirmed_at, o2.appointment_at) BETWEEN cur_start AND cur_end
              AND o2.process_status::TEXT NOT IN ('已取消')
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
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('已取消')
              AND o.deleted_at IS NULL
              AND o.keychain_cost > 0
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('已取消')
              AND o.deleted_at IS NULL
              AND o.necklace_cost > 0
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('已取消')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
              AND o.process_status::TEXT NOT IN ('已取消')
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
        -- 0066(2026-07-23): 期間歸屬改用 LEAST(confirmed_at, appointment_at) 取較早者
        WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
          AND o.process_status::TEXT NOT IN ('已取消')
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
            WHERE LEAST(o2.confirmed_at, o2.appointment_at) BETWEEN prev_start AND prev_end
              AND o2.process_status::TEXT NOT IN ('已取消')
              AND o2.deleted_at IS NULL
              AND o2.handmodel_cost > 0
          )
          WHEN category = 'metal' THEN (
            SELECT COUNT(*) FROM orders o2
            WHERE LEAST(o2.confirmed_at, o2.appointment_at) BETWEEN prev_start AND prev_end
              AND o2.process_status::TEXT NOT IN ('已取消')
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
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('已取消')
              AND o.deleted_at IS NULL
              AND o.keychain_cost > 0
              AND oi.item_category = '金屬鎖匙扣'
          ), 0),
          'necklace', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('已取消')
              AND o.deleted_at IS NULL
              AND o.necklace_cost > 0
              AND oi.item_category ILIKE '%頸鏈%'
          ), 0)
        ),
        'handmodel_qty', json_build_object(
          'frame', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('已取消')
              AND o.deleted_at IS NULL
              AND o.handmodel_cost > 0
              AND oi.product_sku ILIKE '%木框%'
          ), 0),
          'bottle', COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            JOIN orders o ON oi.order_fhs_id = o.order_id
            WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN prev_start AND prev_end
              AND o.process_status::TEXT NOT IN ('已取消')
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
        -- 0066(2026-07-23): 期間歸屬改用 LEAST(confirmed_at, appointment_at) 取較早者
        WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN prev_start AND prev_end
          AND o.process_status::TEXT NOT IN ('已取消')
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
        WHERE LEAST(o.confirmed_at, o.appointment_at) BETWEEN cur_start AND cur_end
          AND o.process_status::TEXT NOT IN ('已取消')
          AND o.deleted_at IS NULL
          AND o.handmodel_cost > 0
      ) dq
    ),
    'last_sync', NOW()
  ) INTO result;

  RETURN result;
END;
$function$;

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

-- ── Smoke Test ───────────────────────────────────────────────
DO $$
DECLARE
  v_kpis   JSON;
  v_charts JSON;
  v_orders NUMERIC;
BEGIN
  v_kpis   := get_financial_kpis('yearly', 'all', CURRENT_DATE);
  v_orders := (v_kpis->'current'->>'orders')::NUMERIC;
  ASSERT v_orders IS NOT NULL, '0066 smoke FAIL: kpis current.orders IS NULL';

  v_charts := get_financial_charts('yearly', 'all', CURRENT_DATE);
  ASSERT (v_charts->'category_revenue'->>'handmodel') IS NOT NULL,
    '0066 smoke FAIL: charts category_revenue.handmodel IS NULL';

  RAISE NOTICE '0066 smoke OK: yearly orders=%, revenue=%',
    v_kpis->'current'->>'orders', v_kpis->'current'->>'revenue';
END $$;
