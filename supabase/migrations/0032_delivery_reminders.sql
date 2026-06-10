BEGIN;

-- P1: Delivery deadline reminder VIEW (Session 82)
-- SLA: 90 days (standard) / 126 days for 玻璃瓶 orders (Fat Mo confirmed 2026-06-10)
-- Urgency: overdue(<0) / due_today(=0) / warn(≤14) / normal(>14)
-- HKT timezone boundary via timezone('Asia/Hong_Kong', now())::date
-- NO auto-UPDATE of process_status (C1 safety: Fat Mo reviews overdue orders manually)
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
  AND o.process_status NOT IN ('完成', '已取件', '已取消');

GRANT SELECT ON public.v_delivery_reminders TO anon;
GRANT SELECT ON public.v_delivery_reminders TO authenticated;

-- Smoke test: urgency column contains only valid values
DO $$
DECLARE
  v_count bigint;
  v_bad   bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.v_delivery_reminders;
  SELECT COUNT(*) INTO v_bad
    FROM public.v_delivery_reminders
    WHERE urgency NOT IN ('overdue', 'due_today', 'warn', 'normal');
  RAISE NOTICE 'v_delivery_reminders: % active rows, % bad-urgency rows', v_count, v_bad;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: urgency has unexpected values';
  END IF;
END $$;

COMMIT;
