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

---

*本文件由 Session 60 建立。下次改動任何上述層次時，請同步更新對應章節。*