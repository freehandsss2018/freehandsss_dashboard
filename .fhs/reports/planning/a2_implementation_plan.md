# Optimizing Order Sync and Logic

The goal of this task is to stabilize the Freehandsss (FHS) order pipeline and improve synchronization UX by:
1. **Resolving the PostgREST SKU cost calculation bug** for complex SKUs with parentheses by wrapping the filter values in double quotes.
2. **Preventing duplicate Order IDs** by adding a client-side verification check directly in the "Save" (Sync to Airtable) flow.
3. **Optimizing Order Overview transition latency** by showing a "Sync in progress" banner with automated polling when switching pages right after a sync.

## User Review Required

> [!IMPORTANT]
> The duplicate Order ID validator will query Supabase directly on the client side before triggering the webhook. If a conflict is found, saving will be blocked and the operator will be alerted immediately. If the network or Supabase is down, it will prompt the operator to choose whether to override/bypass.

## Open Questions

None. The requirements are fully detailed and the solution has been verified with scratch tests.

---

## Proposed Changes

### n8n Workflow

#### [MODIFY] [FHS_Core_OrderProcessor_live.json](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/n8n/FHS_Core_OrderProcessor_live.json)
Update the `Smart Cache Strategist` node's JS code to output properly double-quoted filters to avoid PostgREST parsing issues for SKUs with parentheses.

Specifically, replace:
```javascript
      if (base) {
        return `sku.like.${encodeURIComponent(base)}*`;
      } else {
        return `sku.eq.${encodeURIComponent(sku)}`;
      }
```
with:
```javascript
      if (base) {
        return `sku.like."${encodeURIComponent(base)}*"`;
      } else {
        return `sku.eq."${encodeURIComponent(sku)}"`;
      }
```

### Dashboard UI

#### [MODIFY] [Freehandsss_dashboard_current.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/Freehandsss_dashboard_current.html)
#### [MODIFY] [freehandsss_dashboardV41.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV41.html)

1. Add CSS rules in the main `<style>` block for the spinner animation and banner styling:
```css
@keyframes fhs-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.fhs-spin {
    animation: fhs-spin 1s linear infinite;
}
```

2. Add a `syncProgressBanner` element below the header inside `reviewZone2`:
```html
            <!-- Sync in progress notification banner -->
            <div id="syncProgressBanner" style="display:none; background:var(--fhs-warning-bg); border-top:1px solid var(--fhs-border); border-bottom:1px solid var(--fhs-border); padding:8px 24px; font-size:var(--fhs-text-xs); color:var(--fhs-warning); font-weight:600; align-items:center; gap:8px;">
                <span style="display:inline-block; width:12px; height:12px; border:2px solid var(--fhs-warning); border-top-color:transparent; border-radius:50%;" class="fhs-spin"></span>
                <span>🔄 訂單 <span id="syncProgressOrderId"></span> 同步中，由於背景更新有時間差，資料將於幾秒後自動更新...</span>
            </div>
```

3. In `syncToAirtable()`, perform a duplicate check before saving. If conflict found, abort. Also store `_fhsLastSyncTime`, `_fhsLastSyncOrderId`, and `_fhsLastSyncPayload` on success.
4. Implement `checkSyncFinished(orders)` and `handleSyncPollingCheck(orders)` to check and stop the polling banner when the order has been updated.
5. In `switchMode(mode)`, start the polling interval (every 4 seconds) if the user switches to `review` while a sync is in progress.
6. Call `handleSyncPollingCheck(orders)` in both standard and patched `fetchGlobalReview` functions.

---

## Verification Plan

### Automated Tests
- Run scratch script to update the live n8n workflow and verify it is successfully published.
- Run scratch test `test_supabase_escaping.js` to ensure the double quotes URL encoding correctly returns products with parentheses (already verified).

### Manual Verification
- Deploy changes to `Freehandsss_dashboard_current.html` and `freehandsss_dashboardV41.html`.
- Create a test order with "羊毛氈公仔 - 加購" (contains parentheses) and verify cost is calculated correctly.
- Test changing order ID to an existing order ID and verify the save button blocks execution and alerts.
- Test saving an order and immediately switching to Order Overview, verifying the progress banner displays, polls, and hides itself when sync finishes.
