BEGIN;

-- P1+: Delivery reminder VIEW — item-level completion filter (Session 83+++++)
-- New condition: exclude orders where ALL order_items are '完成' or '已取件'
-- Logic: keep order IF (no items) OR (at least one item NOT IN ('完成','已取件'))
-- This auto-suppresses warnings when Fat Mo marks all items done without changing
-- orders.process_status — complementary to C1 safety rule (no auto order-status change)
-- FK: order_items.order_fhs_id = orders.order_id (verified Session 82)
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
  AND o.process_status NOT IN ('完成', '已取件', '已取消')
  AND (
    NOT EXISTS (SELECT 1 FROM public.order_items oi2 WHERE oi2.order_fhs_id = o.order_id)
    OR EXISTS (
      SELECT 1 FROM public.order_items oi2
      WHERE oi2.order_fhs_id = o.order_id
        AND oi2.process_status NOT IN ('完成', '已取件')
    )
  );

GRANT SELECT ON public.v_delivery_reminders TO anon;
GRANT SELECT ON public.v_delivery_reminders TO authenticated;

-- Smoke test
DO $$
DECLARE
  v_count bigint;
  v_bad   bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.v_delivery_reminders;
  SELECT COUNT(*) INTO v_bad
    FROM public.v_delivery_reminders
    WHERE urgency NOT IN ('overdue', 'due_today', 'warn', 'normal');
  RAISE NOTICE 'v_delivery_reminders (0033): % active rows, % bad-urgency rows', v_count, v_bad;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Smoke test FAIL: urgency has unexpected values';
  END IF;
END $$;

COMMIT;
