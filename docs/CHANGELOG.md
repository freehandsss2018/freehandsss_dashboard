# FHS Dashboard Changelog

## [V47.4] — 2026-05-16

### n8n Workflow: Supabase-First Cost Architecture (C0.5 Fix)

**Workflow ID**: `6Ljih0hSKr9RpYNm`

#### Node: `Calculate Profit & Pack Items`
- Added `getItemCategory(sku)` function: derives `item_category` from SKU string (木框/玻璃瓶→立體擺設, 鎖匙扣→金屬鎖匙扣, 吊飾→銀飾)
- Each packed item now includes: `Item_Category`, `Handmodel_Cost`, `Keychain_Cost`, `Necklace_Cost`
- Return payload now includes order-level: `Handmodel_Cost_Total`, `Keychain_Cost_Total`, `Necklace_Cost_Total`
- Keychain shipping deduction `(keychainItemCount - 1) × $20` now applied to `keychainCostTotal` (Bible V3.7 §2.5)

#### Node: `Mirror to Supabase`
- **orders upsert**: added `deposit`, `balance`, `additional_fee`, `full_order_text`, `handmodel_cost`, `keychain_cost`, `necklace_cost`
- **order_items upsert**: `product_sku` changed from hardcoded `null` → `item.Product_Name || null`; added `item_category`, `handmodel_cost`, `keychain_cost`, `necklace_cost`, `subtotal_cost`, `specification`

### Knowledge System: FHS Finance Bible
- Created `.fhs/ai/FHS_Finance_Bible.md` v1.0.0 — mandatory pre-task reading for all financial tasks
- Upgraded `database-reviewer` → v2.0.0 (Finance Bible Phase 0, Quadruple Sync)
- Upgraded `finance-auditor` → v2.0.0 (Finance Bible Phase 0, 4-tier Supabase-First architecture)

---

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
