-- 0065_hotfix_revert_charts_status_filter_regression.sql
-- 緊急回歸修復：0064 由 repo 內舊版 0041 檔案內容重建 get_financial_charts()，
-- 但 repo 的 migrations/ 目錄從未收錄 2026-07-17 兩個線上已套用嘅修復
-- （`fix_financial_rpc_status_filter_enum_mismatch` + `unify_financial_kpis_charts_unconfirmed_orders_scope`，
-- 只喺 Supabase migration history 存在，未落 repo 檔案——repo/DB drift）。
-- 結果：0064 的 CREATE OR REPLACE 意外令 get_financial_charts() 5 處
-- `process_status::TEXT NOT IN ('cancelled', 'refunded')`（英文字面值，同中文 enum 永不匹配的死碼）
-- 由已修復嘅 `NOT IN ('已取消')` 打回舊死碼，令「已取消」訂單重新被計入
-- category_revenue/cost_breakdown/trend 的收入/成本/毛利數字（雖然頂層「訂單數」
-- 由 get_financial_kpis 計算，未受影響）。
--
-- 本檔僅將 0064 誤帶回的 5 處字面值改回 '已取消'，其餘（0064 品項數量改動）原樣保留。
-- 見 auto-memory project_financial_rpc_status_filter_bug.md、decisions.md 2026-07-17 條目。

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
          WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
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
          WHERE o2.confirmed_at BETWEEN cur_start AND cur_end
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
      WHERE confirmed_at BETWEEN cur_start AND cur_end
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
      WHERE confirmed_at BETWEEN cur_start AND cur_end
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
  v_charts JSON;
  v_def    TEXT;
BEGIN
  v_def := pg_get_functiondef('public.get_financial_charts(text,text,date)'::regprocedure);
  ASSERT v_def NOT LIKE '%cancelled%',
    '0065 smoke FAIL: dead-code English literal still present in get_financial_charts()';
  v_charts := get_financial_charts('yearly', 'all', CURRENT_DATE);
  ASSERT (v_charts->'category_revenue'->>'handmodel') IS NOT NULL,
    '0065 smoke FAIL: category_revenue.handmodel IS NULL';
  RAISE NOTICE '0065 smoke OK: get_financial_charts() 已取消 filter restored, no cancelled/refunded literal left';
END $$;
