---
name: FHS System Changelog
version: v1.0
compatible_with: AGENTS.md v1.4.12
last_updated: 2026-06-05
description: Unified changelog for n8n workflows, Dashboard, and system architecture
note: "Versions track different subsystems: n8n (V47.x), Dashboard (V39-V42), Architecture (v1.4.x)"
---

# FHS Dashboard Changelog

> **版本說明**：本檔案追蹤多個版本線：
> - **n8n Workflow**: V45.x–V47.x（後端業務邏輯）
> - **Dashboard Proto**: V36–V42（前端介面）
> - **System Architecture**: v1.4.x（AGENTS.md 憲法層）

## [V42-patch4] — 2026-06-12 (Session 97 — split box focusout restore + 全部半訂 force fix)

### Dashboard V42 — 支付拆格 UX Bug 修復

#### 問題 1：focusin 清空前未保存原值 → focusout 無差別填半訂
- **根因**：Session 94 Edit E/F 令 focusin 無條件清空，但未保存清空前的值；focusout 只有 fallback 半訂邏輯
- **修復**：focusin 在清空前存 `dataset.preFocusVal` + `dataset.preFocusIsDefault`；focusout 優先還原 preFocusVal（含 $0 有效值），無先前值才 fallback 半訂
- **受益場景**：全付後誤點 balance 再離開 → 正確還原 $0；全自訂值誤點再離開 → 還原原值

#### 問題 2：`_quickHalfFillAllSplits` guard 阻擋用戶切換模式
- **根因**：Session 92 的載入保護 guard（非空 + 非預設）同樣阻擋用戶手動按「全部半訂」
- **修復**：加 `force` 參數；按鈕呼叫傳 `true`（強制填值）；renderPaymentSplits auto-call 不傳（保持保護）

#### 變動
- `Freehandsss_Dashboard/freehandsss_dashboardV42.html`：deposit focusin +2 行 save；deposit focusout 改 restore 邏輯；balance focusin +2 行 save；balance focusout 改 restore 邏輯；`_quickHalfFillAllSplits` +force 參數；按鈕 onclick 傳 `true`

---

## [System v1.4.12-patch1] — 2026-06-05 (Session 63 補丁)

### FHS_Prompts.md 同步機制補丁

**問題**：FHS_Prompts.md 路由總機缺乏自動同步觸發機制，Fat Mo 須靠人工主動巡查才能發現過時路由。

#### 變動
- `AGENTS.md`：文件同步強制律擴充 3 個新觸發條件（AGENTS Rule 新增 / L2 文件增刪 / 核心業務語義修正）
- `execute.md`：新增 [F] FHS_Prompts.md 同步稽核項（與 [B] 同等強制力）
- `FHS_Prompts.md` v1.7：
  - 情境五：「前端利潤最高真理」→「收款確收守護」語義修正
  - 情境六：三叉路由（定價 / 成本 / 產品身份各自獨立入口）
  - 情境八：加 kgov / 知識治理 / Product_Definition 觸發詞
  - 情境十二：補 /new-product 6步 + kgov 落盤 + Rule 3.17 提示
  - 情境二十三：v2.2 → v2.3
  - Header：同步觸發說明 + last_audited_session: S63

---

## [System v1.4.12] — 2026-06-05 (Session 63)

### 系統知識文件化治理方案

**目標**：建立可追尋的產品定義 SSoT，消除「AI 每次需重新解說」痛點，雙紀律強制律上線。

#### Phase 0 — 全文件盤點
- Explore 掃描 30+ 檔：17 個版本漂移（14 個 subagent 檔 compatible_with = v1.4.5/6），3 個斷鏈

#### Phase 1 — 止血
- `docs/FHS_Blueprint.md`：Product_Bible_V3.7 死鏈 → FHS_Product_Definition.md；compatible_with v1.4.11
- `docs/README.md`：Product_Bible_V3.7 標 DEPRECATED，重定向至新檔
- `.fhs/notes/product_pricing_reference.md`：修正錯誤路徑 `.fhs/notes/` → `.fhs/ai/FHS_Pricing_Bible.md`
- 8 個 subagent 檔：compatible_with 批次更新 v1.4.5/6 → v1.4.11（後再更至 v1.4.12）
- `docs/FHS_Legacy_Migration_Notes.md`、`docs/FHS_Prompts.md`：版本對齊

#### Phase 2 — 產品定義 SSoT
- `[NEW]` `.fhs/ai/FHS_Product_Definition.md` v1.0.0：L2 產品身份 SSoT，4 類產品完整條目，§0 狀態欄強制，只回答 WHAT
- `.fhs/ai/commands/new-product.md` v1.1.0 → v1.2.0：補 Step 6 知識落盤（Gate 6）

#### Phase 3 — 規則沿革可查化
- `.fhs/ai/FHS_Pricing_Bible.md` v1.1.0 → v1.2.0：§10 重構為規則 ID 可查表（14 條規則，按規則 ID 索引，≤2 跳可查現值+上次變更）

#### Phase 4 — 治理鎖定
- `AGENTS.md` v1.4.11 → v1.4.12：新增 Rule 3.17（雙紀律強制律）
- `.fhs/ai/commands/cl-flow.md` v2.2.0 → v2.3.0：Step 6 嵌雙紀律自檢出口 Gate
- `.fhs/ai/commands/execute.md`：[E] 擴充為雙紀律兩行格式（驗收 + Subagent）
- `docs/repo-map.md`：同步所有 Phase 1-4 新增/修改
- 記憶合併：`feedback_subagent_router` + `feedback_delivery_standards` → `feedback_pre_delivery_dual_discipline`（淨 −1）

#### 淨變化審計
| 類型 | 數量 |
|------|:---:|
| 新增檔 | +1（FHS_Product_Definition.md）|
| 修改既有 | ~12 |
| 刪除/退役 | 0 |
| 記憶淨增減 | −1 |
| 新 skill/subagent | 0 |

---

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
