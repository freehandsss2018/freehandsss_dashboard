---
name: FHS System Changelog
version: v1.0
compatible_with: AGENTS.md v1.4.5
last_updated: 2026-05-16
description: Unified changelog for n8n workflows, Dashboard, and system architecture
note: "Versions track different subsystems: n8n (V47.x), Dashboard (V39-V42), Architecture (v1.4.x)"
---

# FHS Dashboard Changelog

> **版本說明**：本檔案追蹤多個版本線：
> - **n8n Workflow**: V45.x–V47.x（後端業務邏輯）
> - **Dashboard Proto**: V36–V42（前端介面）
> - **System Architecture**: v1.4.x（AGENTS.md 憲法層）

## [System v1.4.6-patch1] — 2026-05-19

### Antigravity (A2) 系統性 Bug 修復

**問題**：A2 在任何輸入下自動執行初始化、主動處理待辦、越權寫入檔案

#### 修復項目
- **SOP_NOW.md**：弱化 Soul Awakening Hook 為條件觸發（非無條件強制）；AGENTS.md 讀取範圍限前 100 行；A2 職責補充「禁止自主寫入」
- **handoff.md**：待辦清單標題下加防呆標示，明確禁止 AI 自主執行
- **.agents/workflows/read.md**：修正 handoff 路徑 `/notes/` → `/memory/`（靜默失敗 bug）
- **.agents/workflows/ag-plan.md**：移除橋接版硬編碼步驟（違反橋接版規則）
- **.agents/workflows/error-eye.md**：移除橋接版硬編碼步驟
- **.agents/workflows/fhs-check.md**：移除橋接版硬編碼規則
- **guardian.md**：自動關鍵詞觸發條件 → 純手動 /guardian 觸發
- **commit.md**：移除重複定義的第一/二/三階段內容（~50% token 浪費）
- **AGENTS.md**：關鍵語義邊界補充 `/commit` 授權例外，消除與 `/execute` 唯一入口的語義灰色地帶

---

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
