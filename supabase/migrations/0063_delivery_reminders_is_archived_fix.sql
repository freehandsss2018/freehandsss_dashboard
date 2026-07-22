BEGIN;

-- Fix: v_delivery_reminders never filtered on orders.is_archived (the authoritative
-- completion flag written by the S161 auto-archive detection / triggerArchiveOrder()).
-- Root cause found 2026-07-22: Fat Mo reported "交貨期進度" card showing already-completed
-- orders as overdue (e.g. 0500509 overdue 304 days despite is_archived=true).
-- Live audit: 16/33 rows in the view had is_archived=true — the old filters never caught them:
--   1) orders.process_status NOT IN ('完成','已取件','已取消') — dead filter, live data only
--      ever contains '待確認'/'製作中', never those three literal values.
--   2) order_items.process_status NOT IN ('完成','已取件') — real "done" values are
--      'Done 已完成' (41 rows) and legacy '完成' (26 rows); the majority value was never matched.
-- Fix: add is_archived as the primary (authoritative) exclusion, keep item-level filter as
-- defense-in-depth but widen the literal set to match live data ('Done 已完成','待交收').
CREATE OR REPLACE VIEW public.v_delivery_reminders
WITH (security_invoker = on) AS
SELECT
  o.id,
  o.order_id,
  o.customer_name,
  o.process_status,
  COALESCE(o.appointment_at::date, o.created_at::date)                              AS start_date,
  COALESCE(o.appointment_at::date, o.created_at::date)
    + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END                    AS due_date,
  (COALESCE(o.appointment_at::date, o.created_at::date)
    + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
    - timezone('Asia/Hong_Kong', now())::date                                        AS days_remaining,
  CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END                        AS sla_days,
  CASE
    WHEN ((COALESCE(o.appointment_at::date, o.created_at::date)
      + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
      - timezone('Asia/Hong_Kong', now())::date) < 0   THEN 'overdue'
    WHEN ((COALESCE(o.appointment_at::date, o.created_at::date)
      + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
      - timezone('Asia/Hong_Kong', now())::date) = 0   THEN 'due_today'
    WHEN ((COALESCE(o.appointment_at::date, o.created_at::date)
      + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
      - timezone('Asia/Hong_Kong', now())::date) <= 14 THEN 'warn'
    ELSE 'normal'
  END                                                                                AS urgency
FROM public.orders o
LEFT JOIN LATERAL (
  SELECT bool_or(oi.product_sku LIKE '%玻璃瓶%') AS is_glass
  FROM public.order_items oi
  WHERE oi.order_fhs_id = o.order_id
) g ON true
WHERE o.deleted_at IS NULL
  AND o.is_archived IS NOT TRUE
  AND o.process_status NOT IN ('完成', '已取件', '已取消')
  AND (
    NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_fhs_id = o.order_id)
    OR EXISTS (
      SELECT 1 FROM public.order_items oi2
      WHERE oi2.order_fhs_id = o.order_id
        AND oi2.process_status NOT IN ('完成', '已取件', 'Done 已完成', '待交收')
    )
  );

GRANT SELECT ON public.v_delivery_reminders TO anon;
GRANT SELECT ON public.v_delivery_reminders TO authenticated;

-- Smoke test
DO $$
DECLARE
  v_count       bigint;
  v_bad         bigint;
  v_archived_leak bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.v_delivery_reminders;
  SELECT COUNT(*) INTO v_bad
    FROM public.v_delivery_reminders
    WHERE urgency NOT IN ('overdue', 'due_today', 'warn', 'normal');
  SELECT COUNT(*) INTO v_archived_leak
    FROM public.v_delivery_reminders v
    JOIN public.orders o ON o.order_id = v.order_id
    WHERE o.is_archived IS TRUE;
  RAISE NOTICE 'v_delivery_reminders (0063): % active rows, % bad-urgency rows, % archived-leak rows', v_count, v_bad, v_archived_leak;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: urgency has unexpected values';
  END IF;
  IF v_archived_leak > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: % archived orders still leaking into v_delivery_reminders', v_archived_leak;
  END IF;
END $$;

COMMIT;
