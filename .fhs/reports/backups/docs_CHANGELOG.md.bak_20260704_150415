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

## [S130 Phase B] — 2026-07-01 (Audit Ledger Phase B — 訂單層成本覆蓋鎖)

### Supabase Migration 0047 — `cost_override_locked` + 2 新 RPC + 2 RPC 守衛

**目標**：人工修改訂單成本後，防止 `fhs_batch_recalc_execute` / `fhs_apply_financial_batch_update` 自動覆蓋，保證「人工覆蓋優先」語義。

**PART 1 — `orders.cost_override_locked` 欄位**：
- `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_override_locked BOOLEAN NOT NULL DEFAULT false`
- `false` = n8n 批次可更新；`true` = 人工鎖定，批次跳過

**PART 2 — `fhs_adjust_order_cost(p_order_id, p_new_total_cost, p_reason, p_actor)` SECURITY DEFINER RPC**：
- 原子操作：UPDATE `total_cost` + `net_profit` + `cost_override_locked=true` + `recalc_requested_at=NULL`
- 同交易寫 `audit_logs`（`log_type='order_cost_adjust'`, `action='update'`, before/after JSONB）
- GRANT EXECUTE TO anon, authenticated

**PART 3 — `fhs_unlock_order_cost(p_order_id, p_actor)` SECURITY DEFINER RPC**：
- 原子操作：SET `cost_override_locked=false`
- 同交易寫 `audit_logs`（`action='unlock'`）
- GRANT EXECUTE TO anon, authenticated

**PART 4 — `fhs_apply_financial_batch_update` 守衛**（覆寫原函數保持同名參數 `p_target_orders`、日期用 `confirmed_at`）：
- 三個 UPDATE 分支均加 `AND (cost_override_locked IS NULL OR cost_override_locked = false)`

**PART 5 — `fhs_batch_recalc_execute` 守衛**：
- ARRAY_AGG 收集加 `AND (cost_override_locked IS NULL OR cost_override_locked = false)`
- 新增 `v_skipped_locked` 計數回報

**Smoke tests（8/8 PASS）**：column exists, both RPCs exist, grants applied, guards present.

### Dashboard V42 Phase B — 設定中心訂單層成本修改 + Audit Ledger 本單變更歷史

**loadAuditLedger SELECT**：加 `cost_override_locked` 欄位取回

**buildAuditLedgerHtml ② 成本快照鏈 header**：`cost_override_locked=true` 時顯示橙色「🔒 人工覆蓋」badge

**設定中心新增「訂單層成本修改」區塊**（`id="orderCostAdjSection"`）：
- 輸入欄：訂號、新成本（數字）、修改原因
- 確認按鈕（橙色）→ `window.fhsAdjustOrderCost()`
- 解鎖按鈕（灰色）→ `window.fhsUnlockOrderCost()`

**Audit Ledger Modal 新增 ⑤ 本單變更歷史**（`<details>` 摺疊）：
- `ontoggle` 懶載：`window._fhsLoadAuditHistory(orderId, detailsId)`
- 調用 `fhs_query_audit_logs({p_log_type:'order_cost_adjust', p_entity_id:orderId, p_limit:20})`
- 渲染 HTML 表格：時間 / 動作 / 修改前 / 修改後 / 原因

---

## [S130] — 2026-07-01 (Session 130 — 訂單總覽日期優先次序修正)

### Dashboard V42 — 取模日期優先顯示 + 排序對齊

**問題**：訂單總覽 Date 欄以 `confirmed_at` 為優先，有取模日期（appointment_at）時仍顯示確認日期，排序也按確認日期。

**修改（兩處前端，無 Supabase 改動）**：
- `mapOrder()` L13773：`Date: confirmed_at || appointment_at` → `Date: appointment_at || confirmed_at`
- `sbFetchGlobalReview()` L13825：SQL `order` → `appointment_at.asc.nullslast,confirmed_at.asc`

**邏輯說明**：
- 有取模日期：Date 欄顯示取模日期，預設排序以取模日期升序
- 無取模日期：fallback 顯示確認日期，排序按確認日期
- 「日期 — 最新/最舊」下拉排序、年月篩選器均透過 `o.Date` 運作，自動跟從新優先次序
- 逾期計算：後端 `v_delivery_reminders` 已實現 `COALESCE(appointment_at, created_at) + 90天`，無需改動

---

## [S127] — 2026-06-30 (Session 127 — Phase 1b Write Alerts body bug 修復)

### Phase 1b IG Watchdog Write Alerts body bug 修復

**根因診斷（exec 4022）**：Phase 1b 部署後首次 Cron 執行（2026-06-26 06:00 HKT），Write Alerts 節點以 `specifyBody: "string"` + `contentType: "json"` + `JSON.stringify([])` 傳送空陣列；n8n HTTP Request v4 將字串 `"[]"` 誤序列化為 `{"[]":""}` 送至 PostgREST → PGRST204 error。

**修復（GET → fix → PUT 外科手術）**：
- `wa1` Write Alerts 節點：`contentType: "json"` → `"raw"`，移除 `specifyBody: "string"`
- n8n raw mode 直送 `JSON.stringify(alerts)` 字串，不做二次序列化
- versionId 更新至 `2353e4da-18a8-4b16-bcca-334e24c50ce5`
- `build_n8n_workflow.cjs` 同步修正（單一真源防回退）

**端到端驗證**：mock alert JSON array POST → Supabase ig_watchdog_alerts → HTTP 201 ✅ → DELETE probe ✅

**業務說明**：ig_watchdog_alerts 表空白 = 正常（所有 Cron 執行 notify=0，無實際漏單）。"Has Alerts?" guard 正確阻止空陣列路徑；Write Alerts body bug 為 notify>0 時的潛在故障點，現已修復。

---

## [S125] — 2026-06-27 (Session 125 — Task A 收斂結案 + S124 v2 落盤)

### Task A 架構分析與收斂決策

**八維度分析結果（S125 cl-flow 規劃）**：
- **品項層四欄（drawing/printing/chain/shipping_cost）→ 正式廢欄**：live查實80列中74-76列為0/NULL，Audit Ledger S103起已改用訂單層分類欄（handmodel/keychain/necklace_cost），無有效消費者。保留欄位不DROP（n8n Mirror Prep仍INSERT），停止補寫投資。
- **21裸列NULL-subtotal → defer**：2026-05-10~05-24早期列，product_sku/item_base_cost/subtotal_cost全NULL；財務真理於訂單層完整；Audit Ledger已誠實顯示藍色待補錄。Phase 2重構時一併處理。
- **點4加購鎖匙扣 → 結案**：S124 v2已完成（migration 0045/0046 live + 9單回填 + finance-auditor PASS）；前向路徑對所有已發生訂單正確（全為嬰兒不銹鋼，products已為per-set值）。
- **非嬰兒不銹鋼家族products flat → 預防backlog**：降級為觸發式backlog（等真實訂單出現或Fat Mo確認各tier公式，再擴fhs_check_product_cost_drift覆蓋）。

**S124 v2 落盤**：migration 0045/0046 + completion report + 後效稽核文件（Finance Bible/System Logic/decisions/repo-map/CHANGELOG）一併提交。

---

## [S124-v2] — 2026-06-26 (Session 124 — 加購鎖匙扣成本 N飾維度修復)

### Supabase migrations 0045/0046 + products 線B + 9單線C回填 + n8n V47.18

**根因（雙根因）**：
- `products.total_base_cost` 全 N飾 variant 存 flat 185/235，未依 item_per_set 縮放
- Finance Bible §G2 範例 stale（物料 $95→應為 $115，subtotal 含/不含運費語義不清）

**修復**：
- `FHS_Finance_Bible.md` §G2 例子校正：物料 $115，subtotal_cost 不含運費，附 4 件訂單完整對賬示例
- `migration 0045`：CREATE `fhs_compute_keychain_cost(material, qty, drawing_fee)` RPC — 加購鎖匙扣成本單一真源
- 線B `products` UPDATE：41 rows 嬰兒不銹鋼 S/P N飾，`total_base_cost` 改為 `fhs_compute_keychain_cost` 動態值（1飾加購=125, 4飾加購=500 等）
- 線C 9單回填：14 rows `order_items`（嬰兒鎖匙扣）+ 9 rows `orders`（keychain_cost/total_cost/net_profit） + 9 rows `audit_logs`；家庭(S2)超出範圍保留原值
- `n8n V47.18`：Calculate Profit & Pack Items 注釋確認 per-set 語義，無功能改動
- `migration 0046`：`fhs_check_product_cost_drift()` N飾維度擴充，比對公式由 flat→`fhs_compute_keychain_cost(material, item_per_set, drawing_fee)`

**安全守護**（全程無違反）：`final_sale_price / deposit / balance / additional_fee` 真理欄位未動

---

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
