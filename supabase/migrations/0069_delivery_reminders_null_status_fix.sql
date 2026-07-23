BEGIN;

-- Fix: v_delivery_reminders item-level "not yet done" filter used
-- `oi2.process_status NOT IN ('完成','已取件','Done 已完成','待交收')`. In SQL, NULL NOT IN (...)
-- evaluates to UNKNOWN (not TRUE), so any order whose items still have a NULL process_status
-- (brand-new orders never touched in the review UI) silently failed both branches of the
-- WHERE clause's OR and vanished from the view entirely — not even shown as 'normal' (green).
-- Root cause found 2026-07-23: Fat Mo reported 07001006/07001007 (freshly created, items
-- untouched) showing no delivery badge at all. Live audit: 6 active orders had 100% NULL
-- item process_status and were fully invisible to delivery tracking.
-- Fix: explicitly treat NULL as "not done" alongside the existing literal exclusion list.
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
        AND (oi2.process_status IS NULL
             OR oi2.process_status NOT IN ('完成', '已取件', 'Done 已完成', '待交收'))
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
  v_null_missing  bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.v_delivery_reminders;
  SELECT COUNT(*) INTO v_bad
    FROM public.v_delivery_reminders
    WHERE urgency NOT IN ('overdue', 'due_today', 'warn', 'normal');
  SELECT COUNT(*) INTO v_archived_leak
    FROM public.v_delivery_reminders v
    JOIN public.orders o ON o.order_id = v.order_id
    WHERE o.is_archived IS TRUE;
  -- Orders with only-NULL item statuses that should now be visible
  SELECT COUNT(*) INTO v_null_missing
    FROM public.orders o
    WHERE o.is_archived IS NOT TRUE AND o.deleted_at IS NULL
      AND o.process_status NOT IN ('完成','已取件','已取消')
      AND EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_fhs_id = o.order_id)
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_fhs_id = o.order_id AND oi2.process_status IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM public.v_delivery_reminders v WHERE v.order_id = o.order_id);
  RAISE NOTICE 'v_delivery_reminders (0069): % active rows, % bad-urgency rows, % archived-leak rows, % still-missing null-status orders', v_count, v_bad, v_archived_leak, v_null_missing;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: urgency has unexpected values';
  END IF;
  IF v_archived_leak > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: % archived orders still leaking into v_delivery_reminders', v_archived_leak;
  END IF;
  IF v_null_missing > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: % NULL-status orders still missing from v_delivery_reminders', v_null_missing;
  END IF;
END $$;

COMMIT;
