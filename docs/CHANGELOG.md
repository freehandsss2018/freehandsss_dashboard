# FHS Dashboard Changelog

## [V1.4.1] — 2026-04-18

### System: Versioning Alignment

- **Stable Baseline**: Confirmed **V37** as the stable development foundation.
- **Production**: `current` version is now strictly synced with V37.
- **Interface Dev**: **V39** designated as the primary interface development branch.
- **Documentation**: Updated `AGENTS.md`, `repo-map.md`, and `SOP_NOW.md` to reflect this alignment.
- **UI Text**: Updated IG preview segments (changed `【財務結算】` to `【付款資料】`, replaced `金屬產品` with `吊飾產品` in headers, removed `✨` and `⚙️` emojis, replaced leading emojis in notice items with `-`, and adjusted order ID format to `(訂單編號# 0000000 產品)`).

## [V39] — 2026-04-10

### Phase 4 Complete: Webhook Hookup

**File**: `Freehandsss_Dashboard/freehandsss_dashboardV39_proto.html`

All 8 TODOhookup stubs replaced with real n8n webhook calls:

| # | Function | Endpoint |
|---|---|---|
| 1 | `loadSystemConfig()` | `GET /webhook/fetch-fhs-order?orderId=FHS-SYSTEM-CONFIG` |
| 2 | `saveSeqSettings()` | `POST /webhook/update-order-meta` |
| 3 | `checkOrderIDDuplicate()` | `GET /webhook/fetch-fhs-order?orderId={id}` |
| 4 | `fetchOldOrder()` | `GET /webhook/fetch-fhs-order?orderId={oId}` (+ full restoreFormState logic) |
| 5 | `syncToAirtable()` | `POST /webhook/1444800b-1397-4154-b2da-a4d328c6c51b` (full payload from V36) |
| 6 | `executeDeleteOrder()` | `POST /webhook/update-order-meta` (action: delete) |
| 7 | `fetchGlobalReview()` | `GET /webhook/fetch-global-review` (with query params) |
| 8 | `saveInlineEdit()` | `POST /webhook/update-order-meta` (queue flush) |

**Sandbox mode**: `getWebhookUrl()` still routes to `/webhook-test/` in dev mode (except fetch-global-review).

### Phase 3 Complete: Code Review PASS

Code-reviewer audit passed all checks:

- 180+ CONTRACT IDs present
- Zero banned V36 class names
- Zero external dependencies
- Zero real fetch() in prototype stage

### Phase 0–2 Complete (2026-04-07 to 2026-04-10)

- Phase 0: Contract Freeze — all HTML IDs locked
- Phase 1: Design Spec — V39 design system defined
- Phase 2: Prototype — single-file HTML with V39 CSS + V36 business logic
