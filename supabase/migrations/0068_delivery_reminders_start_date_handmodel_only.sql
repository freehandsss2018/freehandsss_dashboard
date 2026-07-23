BEGIN;

-- Fix: v_delivery_reminders used COALESCE(appointment_at, created_at) as start_date for
-- ALL orders. appointment_at is only meaningful for 手模擺設 (hand-mold) orders, which need
-- a physical casting appointment; keychain/necklace-only orders never need one, so any
-- appointment_at value on them is a meaningless leftover (e.g. copied from an unrelated
-- form field) that can predate created_at and make the SLA start far too early.
-- Root cause found 2026-07-23: Fat Mo reported order 0600801 (pure keychain, no 手模擺設)
-- had appointment_at=2026-02-26 vs created_at=2026-05-10 — a 74-day-early SLA start that
-- pushed the order into false overdue/warn urgency.
-- Fix: only use appointment_at when the order has at least one hand-mold item
-- (order_items.item_key LIKE '%_P_%'); otherwise always use created_at.
CREATE OR REPLACE VIEW public.v_delivery_reminders
WITH (security_invoker = on) AS
SELECT
  o.id,
  o.order_id,
  o.customer_name,
  o.process_status,
  CASE WHEN COALESCE(g.has_handmodel, false)
       THEN COALESCE(o.appointment_at::date, o.created_at::date)
       ELSE o.created_at::date
  END                                                                                AS start_date,
  (CASE WHEN COALESCE(g.has_handmodel, false)
        THEN COALESCE(o.appointment_at::date, o.created_at::date)
        ELSE o.created_at::date
   END)
    + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END                    AS due_date,
  ((CASE WHEN COALESCE(g.has_handmodel, false)
         THEN COALESCE(o.appointment_at::date, o.created_at::date)
         ELSE o.created_at::date
    END)
    + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
    - timezone('Asia/Hong_Kong', now())::date                                        AS days_remaining,
  CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END                        AS sla_days,
  CASE
    WHEN (((CASE WHEN COALESCE(g.has_handmodel, false)
                 THEN COALESCE(o.appointment_at::date, o.created_at::date)
                 ELSE o.created_at::date
            END)
      + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
      - timezone('Asia/Hong_Kong', now())::date) < 0   THEN 'overdue'
    WHEN (((CASE WHEN COALESCE(g.has_handmodel, false)
                 THEN COALESCE(o.appointment_at::date, o.created_at::date)
                 ELSE o.created_at::date
            END)
      + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
      - timezone('Asia/Hong_Kong', now())::date) = 0   THEN 'due_today'
    WHEN (((CASE WHEN COALESCE(g.has_handmodel, false)
                 THEN COALESCE(o.appointment_at::date, o.created_at::date)
                 ELSE o.created_at::date
            END)
      + CASE WHEN COALESCE(g.is_glass, false) THEN 126 ELSE 90 END)
      - timezone('Asia/Hong_Kong', now())::date) <= 14 THEN 'warn'
    ELSE 'normal'
  END                                                                                AS urgency
FROM public.orders o
LEFT JOIN LATERAL (
  SELECT
    bool_or(oi.product_sku LIKE '%玻璃瓶%')  AS is_glass,
    bool_or(oi.item_key LIKE '%\_P\_%' ESCAPE '\') AS has_handmodel
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
  v_0600801_start date;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.v_delivery_reminders;
  SELECT COUNT(*) INTO v_bad
    FROM public.v_delivery_reminders
    WHERE urgency NOT IN ('overdue', 'due_today', 'warn', 'normal');
  SELECT COUNT(*) INTO v_archived_leak
    FROM public.v_delivery_reminders v
    JOIN public.orders o ON o.order_id = v.order_id
    WHERE o.is_archived IS TRUE;
  RAISE NOTICE 'v_delivery_reminders (0068): % active rows, % bad-urgency rows, % archived-leak rows', v_count, v_bad, v_archived_leak;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: urgency has unexpected values';
  END IF;
  IF v_archived_leak > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: % archived orders still leaking into v_delivery_reminders', v_archived_leak;
  END IF;

  SELECT start_date INTO v_0600801_start FROM public.v_delivery_reminders WHERE order_id = '0600801';
  IF v_0600801_start IS NOT NULL THEN
    RAISE NOTICE '0600801 start_date after fix: %', v_0600801_start;
  END IF;
END $$;

COMMIT;
