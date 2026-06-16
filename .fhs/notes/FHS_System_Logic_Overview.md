# FHS 系統運作總論
> 版本：v1.0.0（2026-06-05 Session 60 建立）
> 目的：完整記錄 Freehandsss Dashboard 的運作邏輯，讓任何人讀完就知道整套系統在幹嘛。
> 更新規則：每次改動涉及以下任一層，必須同步更新本文件。

---

## 一、系統架構一覽

```
操作員（Fat Mo）
    │ 在 V41 Dashboard 填訂單
    ▼
前端 V41（freehandsss_dashboardV41.html）
    │ calculatePricing() 計算售價+成本
    │ captureFormState() 序列化表單
    │ 按「審閱並完成訂單」→ webhook payload
    ▼
n8n FHS_Core_OrderProcessor（ID: 6Ljih0hSKr9RpYNm, V47.16）
    │ Parse Items → Smart Cache → Calculate Profit → Supabase Mirror Prep
    │ → HTTP: Supabase Sync RPC
    ▼
Supabase（Read/Write Lead）          Airtable（過渡期 SSoT 快照）
    orders / order_items                  訂單主表 / 子項目
    cost_configurations                   產品成本（同步來源）
    products
```

---

## 二、前端邏輯（V41 Dashboard）

### 2.1 成本計算：`calculatePricing()`

**觸發時機**：任何商品或數量變更時自動觸發。

**前置條件**：`window._fhsCostReady === true`（`cost_configurations` 已從 Supabase 載入）

**計算步驟**（白話）：

1. **讀取原子成本**（從 `window._fhsCostConfig`，來源 Supabase `cost_configurations`）
   - 畫圖費費率：`drawing_cost_adult_p/s`、`drawing_cost_baby_p/s`
   - 打印費：`material_cost_necklace_silver/gold`、`material_cost_keychain_stainless/alloy`
   - 鏈條/環扣：`necklace_chain_cost`（$100）、`keychain_clasp_cost`（$10）
   - 運費：`charm_shipping_deduction_per_extra`（$35）、`keychain_shipping_deduction_per_extra`（$20）

2. **每件計算成本**（per-item）：
   - `item.FatMoCost` = 畫圖費 × qty（**W1 豁免規則**：同部位第2件起免費，跨產品亦適用）
   - `item.PrintingCost` = 打印/鑄造費 × qty（依材質+對象分層）
   - `item.ClaspCost` = 環扣費 × qty（僅鎖匙扣，$10/件）
   - `item.BaseShippingCost` = 運費毛值 × qty（吊飾$35，鎖匙扣$20）
   - `item.ChainCost` = 鏈條費 per-item：
     - 吊飾：全訂單奇偶位分配（奇數件位=$100，偶數件位=$0）
     - 鎖匙扣：= ClaspCost

3. **訂單層計算**：
   - `_totalNecklaceChainCost` = ceil(總吊飾件數/2) × $100（訂單層頸鏈總費）
   - `_totalShippingDeduction` = (同類總件數−1) × 單件運費（多件優惠）
   - `_systemTotalCost` = Drawing + Printing + NecklaceChain + KeychainClasp + BaseShipping − ShippingDeduction

4. **結果存放**：
   - `window.fhsCurrentPricingItems` = items 陣列（含 per-item 四分量）
   - `window.fhsCurrentPricingMeta` = { System_Final_Sale_Price, System_Total_Cost }

### 2.2 售價計算規則

| 產品 | 公式 |
|------|------|
| 鎖匙扣（S模式） | qty=1: $860 / qty=2: $1,200 / qty=3: $1,680 / qty=4: $2,000 / 之後+$500/件 |
| 吊飾（倒模） | 首對: $2,980 / 單隻: $1,980（ceil(n/2)×2980 + n%2×1980）|
| 立體擺設 木框 | 4肢: $2,380 / 2肢: $2,080 |
| 立體擺設 玻璃瓶 | 4肢: $1,680 / 2肢: $1,380 |
| 羊毛氈公仔 | $680/件 |
| 燈飾 | $80/件 |

### 2.3 畫圖費豁免規則（W1）

- **同部位首件**：收全額畫圖費（依P/S模式 + 成人/嬰兒分層）
- **同部位第2件起**：免畫圖費（`chargedPositions Set` 跨陣列追蹤）
- **跨產品適用**：主商品已有某部位 → 鎖匙扣/吊飾同部位免費

畫圖費費率：
| 對象 | P模式 | S模式 |
|------|-------|-------|
| 成人 | $240 | $110 |
| 嬰兒/大寶 | $110 | $60 |

### 2.4 payload 序列化（訂單送出時）

送出訂單時，per-item 附掛：
```
Order_Item_Key, Product_Name, Quantity, Notes,
Suggested_Price_Manual, Drawing_Cost, Printing_Cost, Chain_Cost, Shipping_Cost
```

`captureFormState()` 核心邏輯**不可修改**（n8n webhook 掛鉤 + Raw_Form_State 不可侵犯）。

---

## 三、n8n 工作流邏輯（V47.16）

**Workflow ID**: `6Ljih0hSKr9RpYNm`

### 3.1 節點流程

```
Receive Dashboard Order (Webhook)
    ↓
Input Normalizer → Switch Action（create/edit/delete）
    ↓（create/edit）
Parse Items & Generate SKU → Batch SKU Collector → Read Cache File
    → Smart Cache Strategist → [Cache Hit?] → Fetch Exact Base Cost
    → Local Data Mapper → Calculate Profit & Pack Items
    ↓
Supabase Mirror Prep → Supabase Active Switch → HTTP: Supabase Sync RPC
    → Pack Telegram Data → Send Profit Report
```

### 3.2 各節點職責

| 節點 | 職責 |
|------|------|
| **Parse Items & Generate SKU** | SKU 正規化 + 透傳前端四分量成本欄位 |
| **Smart Cache Strategist** | 從 Supabase `products` 讀取 `total_base_cost` per SKU |
| **Calculate Profit & Pack Items** | 計算訂單總成本、打包 Sub_Items（含四分量）、收斂律自我檢查 |
| **Supabase Mirror Prep** | 組裝 RPC payload（order + items，含四分量 snake_case 映射）|
| **HTTP: Supabase Sync RPC** | 呼叫 `sync_order_to_mirror` 寫入 Supabase |

### 3.3 成本計算邏輯（Calculate Profit & Pack Items）

- **讀取來源**：每件 `Total_Base_Cost` 來自 Smart Cache → Supabase `products.total_base_cost`
- **四分量**（Task A）：直接從前端透傳的 `Drawing_Cost / Printing_Cost / Chain_Cost / Shipping_Cost` 讀取
- **運費扣減**（訂單層）：
  - 鎖匙扣：`(keychainItemCount-1) × $20`
  - 吊飾：`(charmItemCount-1) × $35`
- **收斂律守護**（V47.16 新增）：`SUM(四分量毛值) − 扣減 ≈ Total_Cost`，偏差 >$1 則告警

---

## 四、折扣/調整邏輯

### 4.1 多件運費優惠（訂單層）
- **鎖匙扣**：≥2件同時下單，扣 `(件數−1) × $20`（件數 = SUM qty）
- **吊飾**：≥2件同時下單，扣 `(件數−1) × $35`

### 4.2 adjustment_amount（操作員手動調整）
- 存於 `orders.adjustment_amount`
- 對 KPI SQL：成本 + adj、利潤 − adj
- **不影響** `total_cost` 欄位

### 4.3 收款確收守護（最高優先）
- `final_sale_price` = Deposit + Balance + Additional_Fee（操作員手輸，絕對真理）
- **n8n 嚴禁重算或覆蓋**這三個欄位
- `total_cost` = n8n 後台估算快照（可改）
- `net_profit` = final_sale_price − total_cost（n8n 計算）

---

## 五、Supabase 資料結構

### 5.1 主要表

| 表 | 用途 |
|----|------|
| `orders` | 訂單主表（一張訂單一行）|
| `order_items` | 訂單子項（每件商品一行）|
| `products` | 產品目錄（SKU + `total_base_cost`）|
| `cost_configurations` | 原子成本 key-value（前端讀取）|

### 5.2 order_items 關鍵欄位

| 欄位 | 說明 |
|------|------|
| `item_key` | `{OrderID}_{類型}_{部位}` 唯一鍵 |
| `total_base_cost` | 每件成本總數（來自 products）|
| `drawing_cost` | 畫圖費分量（Task A，前端傳入）|
| `printing_cost` | 打印/鑄造費分量（Task A，前端傳入）|
| `chain_cost` | 鏈條/環扣費分量（Task A，前端傳入）|
| `shipping_cost` | 運費毛值分量（Task A，前端傳入）|
| `precomplete_status` | 「完成」前的 process_status 快照（用於精準退回）；`fhs_complete_order` 寫入，`fhs_uncomplete_order` 讀取後清空 |

### 5.3 cost_configurations 關鍵 key

| Key | 值 | 說明 |
|-----|----|------|
| `drawing_cost_baby_s` | $60 | 嬰兒/大寶掃描建模畫圖費 |
| `drawing_cost_baby_p` | $110 | 嬰兒/大寶照片建模畫圖費 |
| `drawing_cost_adult_s` | $110 | 成人掃描建模畫圖費 |
| `drawing_cost_adult_p` | $240 | 成人照片建模畫圖費 |
| `material_cost_necklace_silver` | $260 | 吊飾925銀打印費 |
| `material_cost_necklace_gold` | $316 | 吊飾18K金打印費 |
| `material_cost_keychain_stainless` | $95 | 鎖匙扣不銹鋼（嬰兒）打印費 |
| `material_cost_keychain_stainless_adult` | $135 | 鎖匙扣不銹鋼（家庭）打印費 |
| `material_cost_keychain_alloy` | $122 | 鎖匙扣鋁合金（嬰兒）打印費 |
| `necklace_chain_cost` | $100 | 吊飾頸鏈費（每條）|
| `keychain_clasp_cost` | $10 | 鎖匙扣環扣費（每件）|
| `charm_shipping_deduction_per_extra` | $35 | 吊飾基礎運費（每件毛值）|
| `keychain_shipping_deduction_per_extra` | $20 | 鎖匙扣基礎運費（每件毛值）|

---

## 六、IG 訂單訊息邏輯

### 6.1 Category 分類
- **Category A**：鎖匙扣/吊飾（純銀系列）→ 訊息含「付款資料」格式
- **Category B**：立體擺設（木框/玻璃瓶）→ 不同格式

### 6.2 訊息生成
- `buildIgMessage()` 根據 Category 組裝
- 付款格式 v1：品名 + 金額
- 付款格式 v2：純數字相加（如 `2380+860=$3240`）
- 操作員可在 IG Preview Modal 直接編輯後再複製/同步

### 6.3 唯一完成出口
- 桌面：「✅ 審閱並完成訂單」→ 開 Modal → 複製A/B → 同步
- 手機：「✅ 審閱並完成」→ 同上
- `_fhsIgCopyState` 狀態機防重複同步

---

## 七、驗收標靶（B1 基準，不可破）

| 場景 | 分量 | 總成本 |
|------|------|--------|
| V1：鎖匙扣3件（左手×1+右手×1+左腳×1）嬰兒S模式 | draw=$120, print=$285, chain=$30(clasp), ship=$60(毛)，扣$40 | **$455** |
| V2：吊飾4件 925銀（奇偶：chain=$200）| draw=$60, print=$1,040, chain=$200, ship=$140(毛)，扣$105 | **$1,335** |

收斂律驗算：
- V1：(120+285+30+60) − 40 = 495 − 40 = **455 ✓**
- V2：(60+1040+200+140) − 105 = 1440 − 105 = **1335 ✓**

---

## 八、需要 Fat Mo 手動執行的步驟

| 步驟 | 指令/位置 | 說明 |
|------|-----------|------|
| **必做** 部署 migration 0028 | Supabase SQL Editor → 貼入 `0028_sync_rpc_four_cost_columns.sql` | 更新 RPC 以寫入四欄，不做則四欄永遠 = 0 |
| current.html 同步 | `/execute` 再次授權後執行 | 將 V41 改動同步至正式版 |
| VT-1/2 驗收 | 真實訂單測試 | 確認四欄正確寫入 Supabase |

---

## 九、Rollback 指引

| 改動 | Rollback 方法 |
|------|--------------|
| n8n Parse Items | `rollback_node_code` + backup: `.fhs/notes/aireports/n8n-mcp-backups/2026-06-04/6Ljih0hSKr9RpYNm/Parse_Items___Generate_SKU.json` |
| n8n Calculate Profit | `rollback_node_code` + backup: `.../Calculate_Profit___Pack_Items.json` |
| n8n Supabase Mirror Prep | `rollback_node_code` + backup: `.../Supabase_Mirror_Prep.json` |
| Supabase RPC | 重新執行 `0012_sync_order_rpc.sql`（四欄保留，只回退 RPC 邏輯）|
| V41 HTML | `git checkout Freehandsss_Dashboard/freehandsss_dashboardV41.html` |
| V42 Audit Ledger | `git checkout Freehandsss_Dashboard/freehandsss_dashboardV42.html` |

### kgov 同步點（Session 102 補入，Session 103 更新）

> ① 確收鏈欄位來源注意（Session 103b 修復）：
> - `deposit` / `balance` **不在** `mapOrder()` 輸出 → 必須從 `loadAuditLedger` extra fetch 讀取
> - `orders` fetch select 必須包含 `deposit,balance`；提取用 `extra.deposit ?? o.Deposit`
> - `n8n_adjustment_notes` 在 DB 為 JSON array/object，顯示前需 type guard 轉字串
>
> ② 成本快照鏈 v2 架構（Session 103 修復）：
> - **主結構**：`orders.handmodel_cost / keychain_cost / necklace_cost`（30/30 populated，最可靠）
> - **Problem E 扣減行**：`catSum − total_cost > 0` → 顯示「運費共享扣減」對賬行
> - **per-item 次清單**：`order_items.subtotal_cost`（稀疏，舊單全空顯示藍色待補錄條）
> - **四欄禁用**：`drawing/printing/chain/shipping_cost`（91% 空，Task A 未完成）→ 不再讀取
>
> 若 n8n **Calculate Profit & Pack Items** 或 **Supabase Mirror Prep** 或 **財務 RPC** 邏輯變動，必須同步檢查 V42 `buildAuditLedgerHtml` 函式：
> - 訂單層類別欄映射（`handmodel_cost / keychain_cost / necklace_cost`）
> - `n8n_adjustment_notes` 顯示邏輯
> - 確收鏈公式（`deposit + balance + additional_fee = final_sale_price`）
> - KPI 口徑（`net_profit − adjustment_amount`）
>
> 觸發條件：欄位重命名 / 新成本欄位 / 確收語義變更（任何一項）→ 同步更新 `buildAuditLedgerHtml`。

---

---

## 十、Supabase RPC 財務計算層（Session 99 補入）

> **任何 AI agent 處理財務 KPI / 圖表 / 混合單相關任務，必須先讀完本節。**
> 對應 Migration 歷史：0036 → 0037 → 0038 → 0040 → 0041

### 10.1 兩個核心 RPC 函式

| 函式 | 簽名 | 用途 |
|------|------|------|
| `get_financial_kpis` | `(tab_mode, category, ref_date) RETURNS json` | KPI 卡片：revenue / cost / profit / orders / margin / aov / qty |
| `get_financial_charts` | `(tab_mode, category, ref_date) RETURNS json` | 圖表資料：trend / category_revenue / cost_breakdown |

**tab_mode**：`current`（本月迄今 vs 去年同期）/ `monthly`（本月完整 vs 上月）/ `yearly`（本年迄今 vs 去年同期）

**category**：`all` / `handmodel`（立體擺設）/ `metal`（鎖匙扣+頸鏈）

---

### 10.2 混合單（Mixed Order）定義

**混合單** = 同一張訂單同時含：
- `handmodel_cost > 0`（立體擺設）
- `keychain_cost > 0 OR necklace_cost > 0`（金屬品類）

**問題**：整張訂單只有一個 `final_sale_price`，但 category 模式需要拆分歸屬。

**解法**：3-layer revenue fallback（見 10.3）

---

### 10.3 3-Layer Revenue Fallback（收入分攤邏輯）

當 category='handmodel' 且該訂單為混合單時，按以下優先序計算該品類應得收入：

```
Layer 1（精確）：order_items.item_sale_price
  → 訂單明細中對應品類的 item_sale_price 加總
  → 前提：Fat Mo 入帳時逐項填寫分拆金額（V42 n8n 自動填）

Layer 2（比例估算）：final_sale_price × 品類成本 / total_cost
  → 以成本佔比推算收入份額
  → 歷史舊單（無 item_sale_price）走此層

Layer 3（平均分，兜底）：final_sale_price / 訂單品項數
  → 確保不出現 NULL / 0
  → 極少用，只在 total_cost = 0 時觸發
```

**metal 3-layer**（同邏輯，金屬品類版）：
- Layer 1：`item_category = '金屬鎖匙扣' OR ILIKE '%頸鏈%'` 的 item_sale_price
- Layer 2：`final_sale_price × (keychain_cost + necklace_cost) / total_cost`
- Layer 3：`final_sale_price / 品項數`

**關鍵原則**：純單（非混合）直接用 `final_sale_price`，不套 3-layer。

---

### 10.4 category 模式 WHERE 條件

```sql
-- all：所有非取消/退款單
-- handmodel：handmodel_cost > 0（含混合單）
-- metal：keychain_cost > 0 OR necklace_cost > 0（含混合單）

-- ⚠️ 禁止在 metal 的 WHERE 加 AND handmodel_cost = 0
--    這樣會排除混合單，導致收入嚴重低估（migration 0040 修復的 bug）
```

---

### 10.5 confirmed_at 政策

```sql
-- current 期：OR confirmed_at IS NULL（含未確認中的進行中訂單）
-- previous 期：只用 BETWEEN，不含 IS NULL（避免同一張未確認單污染對比基準）
-- ⚠️ 0041 修復：0040 前兩期都有 IS NULL，導致未確認單雙重計算
```

---

### 10.6 data_quality 欄位

`get_financial_kpis` 回傳 `data_quality` 節點，追蹤 fallback 使用率：

| 欄位 | 含義 |
|------|------|
| `avg_split_orders` | handmodel 混合單走 Layer 2/3 的訂單數 |
| `avg_split_ids` | 上述訂單 ID 清單 |
| `metal_fallback_orders` | metal 混合單走 Layer 2/3 的訂單數 |
| `metal_fallback_ids` | 上述訂單 ID 清單 |

目標：`avg_split_orders` 和 `metal_fallback_orders` 隨時間趨近 0（Fat Mo 補填 item_sale_price 後）。

---

### 10.7 Migration 歷史索引

| Migration | 內容 |
|-----------|------|
| 0036 | qty 子查詢補 `deleted_at IS NULL`（8 條） |
| 0037 | `order_items` 加 `item_sale_price` 欄位 |
| 0038 | handmodel 3-layer fallback 引入；STABLE 遺失（後補） |
| 0040 | metal 3-layer + charts deleted_at 守衛 + STABLE 補回 + data_quality 擴充 |
| 0041 | previous 期移除 IS NULL（F4）+ trend 3-layer 口徑對齊（F3） |
| 0042 | `order_items` 加 `precomplete_status text`；新增 RPC `fhs_complete_order` / `fhs_uncomplete_order`（Session 104，2026-06-15）|

---

### 10.8 完成（Complete）功能架構（Session 104）

「完成」取代「封存」語義：按「完成」= 檢視歸檔 + 全品項設 Done，精準退回還原每項原始進度。

| 函式 | 作用 |
|------|------|
| `fhs_complete_order(p_order_fhs_id)` | 單交易：快照 `process_status → precomplete_status`，設 `process_status='Done 已完成'`，設 `orders.is_archived=true` |
| `fhs_uncomplete_order(p_order_fhs_id)` | 單交易：`process_status = COALESCE(precomplete_status, process_status)`，清空 `precomplete_status`，設 `is_archived=false` |

前端 V42 呼叫路徑：`triggerArchiveOrder → toggleArchive → _sbRpc('fhs_complete_order',…)`（5s undo timer；undo 取消 timer，零 DB 寫）。

### 10.9 `is_archived` 前端同步機制（Session 104 Bug Fix，2026-06-15）

**問題**：`window._fhsArchivedIds`（Set）原本純 in-memory，頁面刷新後清空，已完成訂單退回「進行中」。

**修正**：

| 層次 | 改動 |
|------|------|
| `sbFetchGlobalReview` select（V42 line ~13003）| 加入 `is_archived` 欄位 |
| `mapOrder` 回傳物件（V42 line ~12967）| 加 `is_archived: row.is_archived \|\| false` |
| 載入後重建（V42 line ~13183）| `window.globalOrders = orders` 後立即 `.clear()` + `forEach` 重建 `_fhsArchivedIds` |
| dlv badge 隱藏（V42 line 8362/8366）| template 加 `_fhsArchivedIds.has(o.id)` 守衛，已完成訂單不顯示逾期 badge／紅框 |

**重要順序**：重建 `_fhsArchivedIds` 必須在 `applyReviewFilters()` 呼叫**之前**，否則第一次過濾仍用空 Set。

---

*本文件由 Session 60 建立。下次改動任何上述層次時，請同步更新對應章節。*
*§十 由 Session 99 補入（2026-06-12）。§10.8–10.9 由 Session 104 補入（2026-06-15）。*