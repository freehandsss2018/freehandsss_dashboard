-- 0100: correct only order 0500719 receipts, separately from migration 0099.
-- Apply after 0099. Fat Mo authorized "跟 IG 訊息金額" on 2026-10-03.
-- Recovered IG message: main product $1,980 + add-on keychains $2,500
-- = final sale $4,480; deposit $800, balance $3,680.
-- The existing additional_fee for this order cannot be read from migration
-- history. Its schema default is 0, but this migration requires its actual
-- row value to be 0, so 800 + 3680 + additional_fee = 4480.
-- net_profit uses the current orders.total_cost, not a fixed cost literal.
-- Do not touch raw_form_state, order_items, or any other financial field.

CREATE TEMP TABLE _m0100_fix (
    order_id            text PRIMARY KEY,
    expected_deposit    numeric NOT NULL,
    expected_balance    numeric NOT NULL,
    expected_final      numeric NOT NULL,
    new_deposit         numeric NOT NULL,
    new_balance         numeric NOT NULL,
    new_final           numeric NOT NULL,
    basis               text NOT NULL
);

CREATE TEMP TABLE _m0100_updated (order_id text PRIMARY KEY);

INSERT INTO _m0100_fix
    (order_id, expected_deposit, expected_balance, expected_final,
     new_deposit, new_balance, new_final, basis)
VALUES
    ('0500719', 3680, 0, 3680, 800, 3680, 4480,
     'Fat Mo 2026-10-03 找回 IG 原文：主產品1980＋加購鎖匙扣2500＝4480；訂金800，尾數3680');

-- Preflight also enforces the 0099 -> 0100 sequence. Check the actual
-- additional_fee value on this row; a schema DEFAULT does not prove it.
DO $$
DECLARE
    v_eligible integer;
BEGIN
    PERFORM 1 FROM orders o
    JOIN _m0100_fix f ON f.order_id = o.order_id
    FOR UPDATE OF o;

    SELECT count(*) INTO v_eligible
    FROM orders o
    JOIN _m0100_fix f ON f.order_id = o.order_id
    WHERE o.deposit = f.expected_deposit
      AND o.balance = f.expected_balance
      AND o.final_sale_price = f.expected_final
      AND o.additional_fee = 0
      AND f.new_deposit + f.new_balance + o.additional_fee = f.new_final
      AND o.total_cost = 815
      AND o.keychain_cost = 605
      AND o.cost_override_locked IS NOT TRUE
      AND jsonb_typeof(o.n8n_adjustment_notes) = 'array'
      AND EXISTS (
          SELECT 1 FROM audit_logs a
          WHERE a.entity_id = o.order_id AND a.source = 'migration_0099'
            AND a.action = 'correct_0076_overcorrection');

    IF (SELECT count(*) FROM _m0100_fix) <> 1 OR v_eligible <> 1 OR EXISTS (
        SELECT 1 FROM audit_logs WHERE source = 'migration_0100'
    ) THEN
        RAISE EXCEPTION 'migration 0100 preflight failed: eligible rows=% (expected 1), or audit source already exists', v_eligible;
    END IF;
END $$;

-- Snapshot all changed financial fields, actual additional_fee and notes.
INSERT INTO audit_logs
    (log_type, action, actor, entity_type, entity_id,
     before_val, after_val, summary, source)
SELECT
    'order_receipt_adjust',
    'correct_0500719_receipts_per_ig',
    'AI_migration_0100',
    'order',
    o.order_id,
    jsonb_build_object(
        'deposit', o.deposit, 'balance', o.balance,
        'additional_fee', o.additional_fee,
        'final_sale_price', o.final_sale_price,
        'total_cost', o.total_cost, 'net_profit', o.net_profit,
        'n8n_adjustment_notes', o.n8n_adjustment_notes),
    jsonb_build_object(
        'deposit', f.new_deposit, 'balance', f.new_balance,
        'additional_fee', o.additional_fee,
        'final_sale_price', f.new_final,
        'total_cost', o.total_cost, 'net_profit', f.new_final - o.total_cost,
        'n8n_adjustment_notes', o.n8n_adjustment_notes || jsonb_build_array(
            jsonb_build_object(
                'type', 'manual_correction', 'amount', 0, 'source', 'migration_0100',
                'desc', '2026-10-03 migration 0100 跟 IG 原文更正 0500719 收款；Fat Mo 授權；僅審計說明，不入金額',
                'basis', f.basis))),
    '跟 IG 原文更正 0500719 收款（Fat Mo 2026-10-03 授權）：' || f.basis,
    'migration_0100'
FROM orders o
JOIN _m0100_fix f ON f.order_id = o.order_id
WHERE o.deposit = f.expected_deposit
  AND o.balance = f.expected_balance
  AND o.final_sale_price = f.expected_final
  AND o.additional_fee = 0
  AND f.new_deposit + f.new_balance + o.additional_fee = f.new_final
  AND o.total_cost = 815
  AND o.keychain_cost = 605
  AND o.cost_override_locked IS NOT TRUE
  AND jsonb_typeof(o.n8n_adjustment_notes) = 'array'
  AND EXISTS (
      SELECT 1 FROM audit_logs a
      WHERE a.entity_id = o.order_id AND a.source = 'migration_0099'
        AND a.action = 'correct_0076_overcorrection');

WITH upd AS (
    UPDATE orders o
    SET deposit = f.new_deposit,
        balance = f.new_balance,
        final_sale_price = f.new_final,
        net_profit = f.new_final - o.total_cost,
        n8n_adjustment_notes = o.n8n_adjustment_notes || jsonb_build_array(
            jsonb_build_object(
                'type', 'manual_correction', 'amount', 0, 'source', 'migration_0100',
                'desc', '2026-10-03 migration 0100 跟 IG 原文更正 0500719 收款；Fat Mo 授權；僅審計說明，不入金額',
                'basis', f.basis))
    FROM _m0100_fix f
    WHERE o.order_id = f.order_id
      AND o.deposit = f.expected_deposit
      AND o.balance = f.expected_balance
      AND o.final_sale_price = f.expected_final
      AND o.additional_fee = 0
      AND f.new_deposit + f.new_balance + o.additional_fee = f.new_final
      AND o.total_cost = 815
      AND o.keychain_cost = 605
      AND o.cost_override_locked IS NOT TRUE
      AND jsonb_typeof(o.n8n_adjustment_notes) = 'array'
      AND EXISTS (
          SELECT 1 FROM audit_logs a
          WHERE a.entity_id = o.order_id AND a.source = 'migration_0099'
            AND a.action = 'correct_0076_overcorrection')
    RETURNING o.order_id
)
INSERT INTO _m0100_updated (order_id)
SELECT order_id FROM upd;

DO $$
DECLARE
    v_audit integer;
    v_updated integer;
    v_fixed integer;
BEGIN
    SELECT count(*) INTO v_updated FROM _m0100_updated;
    SELECT count(*) INTO v_audit FROM audit_logs
    WHERE action = 'correct_0500719_receipts_per_ig'
      AND source = 'migration_0100'
      AND actor = 'AI_migration_0100';

    SELECT count(*) INTO v_fixed
    FROM orders o
    JOIN _m0100_fix f ON f.order_id = o.order_id
    WHERE o.deposit = f.new_deposit
      AND o.balance = f.new_balance
      AND o.final_sale_price = f.new_final
      AND o.additional_fee = 0
      AND o.deposit + o.balance + o.additional_fee = o.final_sale_price
      AND o.net_profit = o.final_sale_price - o.total_cost
      AND o.n8n_adjustment_notes @> jsonb_build_array(
          jsonb_build_object('type', 'manual_correction', 'amount', 0,
                             'source', 'migration_0100'));

    IF v_audit <> 1 OR v_updated <> 1 OR v_fixed <> 1 THEN
        RAISE EXCEPTION 'migration 0100 guard failed: audit=%, updated=%, corrected=% (expected 1 each)', v_audit, v_updated, v_fixed;
    END IF;
END $$;

DROP TABLE _m0100_fix;
DROP TABLE _m0100_updated;

-- Smoke test after application (finance-auditor must verify live values):
-- SELECT order_id, deposit, balance, additional_fee, final_sale_price,
--        total_cost, net_profit,
--        deposit + balance + additional_fee AS receipt_sum,
--        final_sale_price - total_cost AS expected_net
-- FROM orders WHERE order_id = '0500719';
-- Expected: deposit 800, balance 3680, additional_fee 0, final_sale_price
-- 4480, total_cost 815 after 0099, net_profit 3665; receipt_sum 4480.
-- SELECT entity_id, before_val, after_val FROM audit_logs
-- WHERE source = 'migration_0100' AND action = 'correct_0500719_receipts_per_ig';
-- Expected: exactly 1 row. For rollback, restore deposit, balance,
-- final_sale_price, net_profit and n8n_adjustment_notes from before_val,
-- after separate Fat Mo authorization. Roll back 0100 before 0099.
