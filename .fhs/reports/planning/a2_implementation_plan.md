# Implementation Plan - Order_ID Rename Bug Fix & Supabase Sync Optimization (v2 - Improved)

## Goal & Scope
Investigate and resolve the Order_ID rename issues and synchronization discrepancies in the FHS Dashboard V41. Specifically, ensure that renaming an order completes successfully without duplicate order records, database lock contentions, or foreign key (FK) errors, and that product SKUs (`product_sku`) and statuses are preserved during subsequent synchronization runs.

---

## Findings & Risks

### 1. Webhook Race Condition (Duplicate Order Records)
- **Root Cause**: The n8n webhook `Receive Dashboard Order` is configured with `responseMode: "onReceived"`. This causes n8n to immediately reply `200 OK` to the frontend before processing the workflow nodes.
- **Race Condition**: The frontend receives `200 OK` and immediately calls `sbSyncOrder()`, which upserts the order under the *new* ID (e.g. `06001005TX`) in Supabase. Meanwhile, n8n executes the `rename_order_id` RPC. Because the new ID already exists (upserted by the frontend), the database's `UPDATE orders SET order_id = new_id WHERE order_id = old_id` fails due to a unique/PK constraint violation. This causes the n8n transaction to roll back, leaving the old order `06001005` in the database, alongside the newly created duplicate `06001005TX`.
- **Improved Solution**: Enhance `rename_order_id(old_id, new_id)` in Supabase to acquire an explicit row-level lock using `FOR UPDATE` on both rows. If both `old_id` and `new_id` exist, perform a safe field-level merge (preserving `confirmed_at`, `process_status`, `batch_number`, and `admin_notes` from the old order row into the new one) and then delete the old `old_id` row to complete the rename process cleanly.

### 2. Product SKU Erasure Bug in `sbSyncOrder`
- **Root Cause**: To avoid FK violations with items like `羊毛氈公仔 - 加購` (which do not exist in the `products` table), the frontend was modified to omit `product_sku` entirely from the insert payload in `sbSyncOrder()`.
- **Side Effect**: Since `sbSyncOrder` deletes existing items and inserts new ones, omitting `product_sku` causes all `product_sku` columns in the database to be set to `NULL` after a frontend sync.
- **Improved Solution**: 
  - Update the `sbSyncOrder` pre-fetch query to select `product_sku` in addition to `item_key`, `batch_number`, and `process_status`.
  - Preserve `product_sku` from the pre-fetched `_prevItemMap` during insertion: `product_sku: _prev.product_sku || null`. This ensures the valid SKUs resolved by n8n are kept, and unsupported SKUs remain `null` (avoiding any FK constraint violations).

### 3. Defensive Restore Fallback Bug
- **Root Cause**: If the insert fails, `sbSyncOrder` attempts a restore fallback. However, it restores items using `order_fhs_id: orderId` (the old ID) instead of `effectiveOrderId` (the new ID). If the order was renamed, the old ID record no longer exists, causing the restore to fail.
- **Improved Solution**: Update the restore fallback payload to use `order_fhs_id: effectiveOrderId` and preserve `product_sku`.

---

## Proposed Changes

### Database (Supabase)

#### [MODIFY] [rename_order_id function](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/supabase/migrations/0011_rename_order_id_security_definer.sql)
Modify the `rename_order_id` function to add row-level locking, merge fields on collision, and run idempotently:

```sql
CREATE OR REPLACE FUNCTION rename_order_id(old_id TEXT, new_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_old_exists BOOLEAN;
  v_new_exists BOOLEAN;
BEGIN
  -- No-op if IDs are the same
  IF old_id = new_id THEN RETURN; END IF;

  -- Row-level locking to prevent concurrent transaction deadlocks
  PERFORM 1 FROM orders WHERE order_id IN (old_id, new_id) FOR UPDATE;

  SELECT EXISTS(SELECT 1 FROM orders WHERE order_id = old_id) INTO v_old_exists;
  SELECT EXISTS(SELECT 1 FROM orders WHERE order_id = new_id) INTO v_new_exists;

  -- Idempotent case: rename already completed
  IF v_new_exists AND NOT v_old_exists THEN
    RETURN;
  END IF;

  -- Race condition: if both exist (frontend created new_id first),
  -- merge crucial fields from old_id to new_id, then delete old_id.
  IF v_new_exists AND v_old_exists THEN
    UPDATE orders n
      SET 
        confirmed_at = COALESCE(n.confirmed_at, o.confirmed_at),
        process_status = COALESCE(n.process_status, o.process_status),
        batch_number = COALESCE(n.batch_number, o.batch_number),
        admin_notes = COALESCE(n.admin_notes, o.admin_notes)
      FROM orders o
      WHERE o.order_id = old_id AND n.order_id = new_id;

    DELETE FROM orders WHERE order_id = old_id;
    RETURN;
  END IF;

  -- Normal rename flow
  -- Update item_key prefix BEFORE updating orders.order_id
  UPDATE order_items
    SET item_key = REPLACE(item_key, old_id, new_id)
    WHERE order_fhs_id = old_id;

  -- Update orders.order_id → ON UPDATE CASCADE auto-updates order_fhs_id
  UPDATE orders
    SET order_id = new_id
    WHERE order_id = old_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'rename_order_id: order % not found', old_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Frontend

#### [MODIFY] [freehandsss_dashboardV41.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV41.html)

1. Update the pre-fetch query in `sbSyncOrder` to select `product_sku` (around line 8560):
```javascript
const _pvRes = await fetch(SB_URL + '/rest/v1/order_items?order_fhs_id=eq.' + encodeURIComponent(effectiveOrderId) + '&select=item_key,batch_number,process_status,product_sku', { headers: sbH });
```

2. Add `product_sku` preservation to the pre-fetch mapping loop (around line 8563):
```javascript
if (Array.isArray(_pvRows)) {
    _pvRows.forEach(function(r) {
        if (r.item_key) {
            _prevItemMap[r.item_key] = {
                batch_number: r.batch_number || null,
                process_status: r.process_status || null,
                product_sku: r.product_sku || null
            };
        }
    });
}
```

3. Include `product_sku` in the insert row (around line 8611):
```javascript
var _row = {
    order_fhs_id:  effectiveOrderId,
    item_key:      item.Order_Item_Key,
    item_category: _deriveCat(item.Order_Item_Key),
    quantity:      item.Quantity || 1,
    engraving_text: item.Notes || '',
    specification: _spec,
    process_status: _sanitizeStatus(_status),
    batch_number:  _batch,
    product_sku:   _prev.product_sku || null
};
```

4. Update the restore fallback loop to use `effectiveOrderId` and restore `product_sku` (around line 8636):
```javascript
var _restoreRows = Object.keys(_prevItemMap).map(function(ik) {
    var _d = _prevItemMap[ik];
    var _r = {
        order_fhs_id:  effectiveOrderId,
        item_key:      ik,
        process_status: _sanitizeStatus(_d.process_status),
        batch_number:  _d.batch_number || null,
        product_sku:   _d.product_sku || null
    };
    return _r;
});
```

---

## Verification Plan

### Automated Database Verification
1. Run `node scripts/run_0011.js` (recreated temporarily) to apply the improved RPC.
2. Run database level tests to verify field merging and deadlock prevention.

### Manual End-to-End Verification
1. Open the dashboard in a browser session.
2. Select role "Fat Mo", find or create order `TEST-RENAME-99`.
3. Rename to `TEST-RENAME-99-TX` and submit.
4. Verify console errors, check order row rename, item keys prefix change, and that `product_sku` is preserved correctly.
