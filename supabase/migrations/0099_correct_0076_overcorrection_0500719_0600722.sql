-- 0099: correct the second pair of order-level cost overcorrections from 0076.
-- Authorized by Fat Mo on 2026-10-03: "授權更正兩單的成本".
-- Evidence: finance-auditor 2026-10-03「核實 0500719 加購成本」and
-- Fat Mo's recovered 0500719 IG message (add-on; main product $1,980,
-- keychains $2,500, deposit $800). The receipts are handled separately in 0100.
-- The old snapshot already included one $60 drawing charge. 0076 saw
-- order_items.drawing_cost = 0 and added that charge again; 0097 missed these orders.
-- 0500719: 1x60 drawing + 5x(115+10) material/clasp - (5-1)x20 shipping = 605;
--          plus 210 handmodel = 815.
-- 0600722: 1x60 drawing + 6x(115+10) material/clasp - (6-1)x20 shipping = 710;
--          plus 210 handmodel = 920.
-- Only total_cost, keychain_cost and net_profit change financially. The note
-- appended below has amount 0. No receipt, item, or raw_form_state changes.

CREATE TEMP TABLE _m0099_fix (
    order_id           text PRIMARY KEY,
    expected_total     numeric NOT NULL,
    expected_keychain  numeric NOT NULL,
    new_total          numeric NOT NULL,
    new_keychain       numeric NOT NULL,
    basis              text NOT NULL
);

CREATE TEMP TABLE _m0099_updated (order_id text PRIMARY KEY);

INSERT INTO _m0099_fix
    (order_id, expected_total, expected_keychain, new_total, new_keychain, basis)
VALUES
    ('0500719', 875, 665, 815, 605,
     '加購嬰兒(S)鎖匙扣5飾：畫圖1×60＋物料115及環扣10共5×125－運費(5－1)×20＝605；手模210；0076重複加畫圖60'),
    ('0600722', 980, 770, 920, 710,
     '加購嬰兒(S)鎖匙扣6飾：畫圖1×60＋物料115及環扣10共6×125－運費(6－1)×20＝710；手模210；0076重複加畫圖60');

-- Preflight: reject missing, already changed, locked, or malformed target rows.
DO $$
DECLARE
    v_eligible integer;
BEGIN
    PERFORM 1 FROM orders o
    JOIN _m0099_fix f ON f.order_id = o.order_id
    FOR UPDATE OF o;

    SELECT count(*) INTO v_eligible
    FROM orders o
    JOIN _m0099_fix f ON f.order_id = o.order_id
    WHERE o.total_cost = f.expected_total
      AND o.keychain_cost = f.expected_keychain
      AND o.handmodel_cost = 210
      AND COALESCE(o.necklace_cost, 0) = 0
      AND COALESCE(o.accessory_cost, 0) = 0
      AND f.new_total = f.new_keychain + o.handmodel_cost
      AND o.cost_override_locked IS NOT TRUE
      AND jsonb_typeof(o.n8n_adjustment_notes) = 'array';

    IF (SELECT count(*) FROM _m0099_fix) <> 2 OR v_eligible <> 2 OR EXISTS (
        SELECT 1 FROM audit_logs WHERE source = 'migration_0099'
    ) THEN
        RAISE EXCEPTION 'migration 0099 preflight failed: eligible rows=% (expected 2), or audit source already exists', v_eligible;
    END IF;
END $$;

-- Capture each row before changing orders. Include the note snapshot for rollback.
INSERT INTO audit_logs
    (log_type, action, actor, entity_type, entity_id,
     before_val, after_val, summary, source)
SELECT
    'order_cost_adjust',
    'correct_0076_overcorrection',
    'AI_migration_0099',
    'order',
    o.order_id,
    jsonb_build_object(
        'total_cost', o.total_cost, 'keychain_cost', o.keychain_cost,
        'net_profit', o.net_profit, 'final_sale_price', o.final_sale_price,
        'handmodel_cost', o.handmodel_cost, 'necklace_cost', o.necklace_cost,
        'accessory_cost', o.accessory_cost,
        'n8n_adjustment_notes', o.n8n_adjustment_notes),
    jsonb_build_object(
        'total_cost', f.new_total, 'keychain_cost', f.new_keychain,
        'net_profit', o.final_sale_price - f.new_total,
        'final_sale_price', o.final_sale_price,
        'handmodel_cost', o.handmodel_cost, 'necklace_cost', o.necklace_cost,
        'accessory_cost', o.accessory_cost,
        'n8n_adjustment_notes', o.n8n_adjustment_notes || jsonb_build_array(
            jsonb_build_object(
                'type', 'manual_correction', 'amount', 0, 'source', 'migration_0099',
                'desc', '2026-10-03 migration 0099 更正 0076 重複畫圖費；Fat Mo 授權；僅審計說明，不入金額',
                'basis', f.basis))),
    '更正 0076 成本高計 $60（Fat Mo 2026-10-03 授權）：' || f.basis,
    'migration_0099'
FROM orders o
JOIN _m0099_fix f ON f.order_id = o.order_id
WHERE o.total_cost = f.expected_total
  AND o.keychain_cost = f.expected_keychain
  AND o.handmodel_cost = 210
  AND COALESCE(o.necklace_cost, 0) = 0
  AND COALESCE(o.accessory_cost, 0) = 0
  AND f.new_total = f.new_keychain + o.handmodel_cost
  AND o.cost_override_locked IS NOT TRUE
  AND jsonb_typeof(o.n8n_adjustment_notes) = 'array';

-- Keep the sale price and receipt columns at their current values.
WITH upd AS (
    UPDATE orders o
    SET total_cost = f.new_total,
        keychain_cost = f.new_keychain,
        net_profit = o.final_sale_price - f.new_total,
        n8n_adjustment_notes = o.n8n_adjustment_notes || jsonb_build_array(
            jsonb_build_object(
                'type', 'manual_correction', 'amount', 0, 'source', 'migration_0099',
                'desc', '2026-10-03 migration 0099 更正 0076 重複畫圖費；Fat Mo 授權；僅審計說明，不入金額',
                'basis', f.basis))
    FROM _m0099_fix f
    WHERE o.order_id = f.order_id
      AND o.total_cost = f.expected_total
      AND o.keychain_cost = f.expected_keychain
      AND o.handmodel_cost = 210
      AND COALESCE(o.necklace_cost, 0) = 0
      AND COALESCE(o.accessory_cost, 0) = 0
      AND f.new_total = f.new_keychain + o.handmodel_cost
      AND o.cost_override_locked IS NOT TRUE
      AND jsonb_typeof(o.n8n_adjustment_notes) = 'array'
    RETURNING o.order_id
)
INSERT INTO _m0099_updated (order_id)
SELECT order_id FROM upd;

DO $$
DECLARE
    v_audit integer;
    v_updated integer;
    v_fixed integer;
BEGIN
    SELECT count(*) INTO v_updated FROM _m0099_updated;
    SELECT count(*) INTO v_audit FROM audit_logs
    WHERE action = 'correct_0076_overcorrection'
      AND source = 'migration_0099'
      AND actor = 'AI_migration_0099';

    SELECT count(*) INTO v_fixed
    FROM orders o
    JOIN _m0099_fix f ON f.order_id = o.order_id
    WHERE o.total_cost = f.new_total
      AND o.keychain_cost = f.new_keychain
      AND o.net_profit = o.final_sale_price - f.new_total
      AND o.n8n_adjustment_notes @> jsonb_build_array(
          jsonb_build_object('type', 'manual_correction', 'amount', 0,
                             'source', 'migration_0099'));

    IF v_audit <> 2 OR v_updated <> 2 OR v_fixed <> 2 THEN
        RAISE EXCEPTION 'migration 0099 guard failed: audit=%, updated=%, corrected=% (expected 2 each)', v_audit, v_updated, v_fixed;
    END IF;
END $$;

DROP TABLE _m0099_fix;
DROP TABLE _m0099_updated;

-- Smoke test after application (finance-auditor must verify live values):
-- SELECT order_id, final_sale_price, deposit, balance, total_cost,
--        keychain_cost, handmodel_cost, necklace_cost, accessory_cost, net_profit,
--        COALESCE(keychain_cost,0) + COALESCE(handmodel_cost,0)
--          + COALESCE(necklace_cost,0) + COALESCE(accessory_cost,0) AS component_sum,
--        final_sale_price - total_cost AS expected_net
-- FROM orders WHERE order_id IN ('0500719', '0600722');
-- Expected cost pairs: 0500719 815/605; 0600722 920/710.
-- SELECT entity_id, before_val, after_val FROM audit_logs
-- WHERE source = 'migration_0099' AND action = 'correct_0076_overcorrection';
-- Expected: exactly 2 rows. For rollback, restore total_cost,
-- keychain_cost, net_profit and n8n_adjustment_notes from before_val,
-- after separate Fat Mo authorization; do not change receipts here.
