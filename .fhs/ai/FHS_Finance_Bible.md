# FHS Finance Bible — 財務計算聖經

> **Authority Level**: L1 — 架構不變量（最高權威）
> **衝突規則**: 本文件定義的架構規則 > 一切其他文件。定價/售價公式請讀 L2 `.fhs/ai/FHS_Pricing_Bible.md`。
> **Version**: v1.3.0
> **Created**: 2026-05-16 | **Updated**: 2026-06-26（S124 v2：§G2 範例校正 — 物料 $115，subtotal 不含運費；N飾公式 = 加購 125×N，單購S 60+125×N，單購P 110+125×N）
> **Path**: `.fhs/ai/FHS_Finance_Bible.md`
>
> ⚠️ **強制規則**：凡任何 AI（主 agent 或 subagent）涉及財務利潤、成本、折扣計算任務，
> 必須在動手前先完整讀取此文件。不得跳過。

---

## 一、四端系統總覽

```
Dashboard（前端）
    ↓ HTTP POST (JSON Payload)
n8n FHS_Core_OrderProcessor（6Ljih0hSKr9RpYNm）
    ├─ 寫入 Airtable（備援）
    └─ 寫入 Supabase（主導）
         ↑
    Layer 1: Supabase View 提供即時成本查詢
```

| 角色 | 系統 | 財務職責 |
|------|------|---------|
| 前端真理守護者 | Dashboard | 計算並傳入 `final_sale_price`（禁止 n8n/Supabase 重算） |
| 成本計算引擎 | n8n Layer 2 | 計算 total_cost、per-item breakdown、組合折扣 |
| 即時成本查詢 | Supabase Layer 1 | 提供 `v_products_with_costs` VIEW 給 n8n 查詢 |
| 成本歷史快照 | Supabase Layer 2 | 鎖定訂單確認時的成本（不可再變動） |
| 備援同步 | Airtable | Supabase 寫入成功後異步同步，作為後備 |

---

## 二、雙層成本架構（核心規則）

### Layer 1 — 即時報價層（Supabase View，動態）

```
用途：n8n 查詢產品單位成本（替代舊 Airtable Fetch Exact Base Cost）
實體：v_products_with_costs（VIEW）
查詢：GET /rest/v1/v_products_with_costs?Product_Name=in.("sku1","sku2")
RPC： POST /rest/v1/rpc/get_base_cost_by_skus with {"sku_list": [...]}
特性：成本更新即時反映 → 報價永遠用最新成本
禁止：不可對此 View 資料做 INSERT/UPDATE/DELETE
```

資料來源鏈：
```
Airtable Base_Costs（人工維護）
    → 同步腳本 → Supabase cost_configurations（28 個配置）
    → products.total_base_cost（= drawing + printing + clasp/頸鏈 + shipping）
       ⚠️ 鎖匙扣的 clasp=環扣；吊飾的 clasp=頸鏈($100 現行，Airtable $70 已過時）
    → v_products_with_costs.Total_Base_Cost
```

### Layer 2 — 歷史快照層（n8n 靜態寫入，不可變）

```
用途：訂單確認後鎖定成本，永久稽核依據
實體：orders.total_cost / net_profit / handmodel_cost / keychain_cost / necklace_cost
     order_items.item_base_cost / handmodel_cost / keychain_cost / necklace_cost
特性：訂單確認後，任何產品漲價均不影響此值
禁止：Trigger / Generated Column / View 動態重算這些欄位（等同財務造假）
```

---

## 三、n8n 成本計算流程（節點職責）

```
Parse Items & Generate SKU
    職責：SKU 正規化（3肢→4肢，組合格式化）
    輸出：Search_SKU（標準化 SKU）、Order_Item_Key、Original_Qty

Batch SKU Collector → Fetch Exact Base Cost（或 Supabase Layer 1）
    職責：批次查詢每個 SKU 的 total_base_cost
    遷移狀態：目前仍用 Airtable；Phase B 改為 Supabase get_base_cost_by_skus

Local Data Mapper
    職責：將查詢結果映射，使 Product_Name / Total_Base_Cost 欄位名稱一致

Calculate Profit & Pack Items
    職責：
      1. 將各 SKU 成本 × 數量 = item 成本
      2. 依 SKU 判斷 item_category → 分類成本
      3. 計算跨部位鎖匙扣運費共享扣減（V3.7 §2.5）
      4. 彙總 order 層：total_cost、handmodel_cost、keychain_cost、necklace_cost
    輸出：Total_Cost、Final_Profit、Sub_Items[]（含分類成本）

Mirror to Supabase
    職責：將計算結果 upsert 至 Supabase orders + order_items
    必須包含：所有成本欄位（見第五節）
```

---

## 四、SKU → 商品類別映射（n8n Layer 2 組合拆扣核心）

```javascript
// SKU 判斷規則（由 Search_SKU 字串推導）
function getItemCategory(sku) {
  if (sku.includes('木框') || sku.includes('玻璃瓶')) return '立體擺設';
  if (sku.includes('鎖匙扣'))  return '金屬鎖匙扣';
  if (sku.includes('吊飾'))    return '純銀頸鏈吊飾';  // ⚠️ Supabase 實際儲存值，非 '銀飾'
  return '其他';
}

// 成本分配規則
// item_category = '立體擺設'    → handmodel_cost = item_base_cost, keychain/necklace = 0
// item_category = '金屬鎖匙扣'  → keychain_cost = item_base_cost, handmodel/necklace = 0
// item_category = '純銀頸鏈吊飾'→ necklace_cost = item_base_cost, handmodel/keychain = 0
```

### 跨部位鎖匙扣運費共享扣減（Bible V3.7 §2.5）

```
規則：同一訂單，鎖匙扣總件數 > 1 時，
      共享運費：(鎖匙扣總件數 - 1) × $20 從 keychain_cost 扣減

⚠️ 【G1 修正 2026-06-02】「總件數」= SUM(quantity) across all keychain order_items
   NOT「行數 row count」。例：左手×1 + 右手×2 = 3件，扣減 = (3-1)×$20 = $40，
   而非 (2行-1)×$20 = $20。

扣減應用層：orders.keychain_cost（訂單層彙總，非 order_items 層）
計算公式：
  orders.keychain_cost = SUM(order_items.keychain_cost) - keychainShippingDeduction
  orders.handmodel_cost = SUM(order_items.handmodel_cost)（無扣減）
  orders.necklace_cost = SUM(order_items.necklace_cost) - necklaceShippingDeduction
  orders.total_cost = SUM(all item costs) - keychainShippingDeduction - necklaceShippingDeduction

驗證：orders.handmodel_cost + orders.keychain_cost + orders.necklace_cost = orders.total_cost
```

### 位置依賴成本規則（Per-Position Cost Rules）— 2026-06-02 Fat Mo 確認

> ⚠️ 以下為成本(cost)計算核心規則。過去因未記錄，AI 反覆算錯。
> 售價(price)計算邏輯另見 `FHS_Pricing_Bible.md`，兩者不同勿混淆。

#### 鎖匙扣每件成本組件
```
成本 = 畫圖 + 物料(Material) + 環扣(Clasp)

⚠️ 【S124 更正 2026-06-26】
  - 運費不計入 order_items.subtotal_cost（行層），僅在訂單層扣減
  - 訂單層扣減：(SUM(quantity across all keychain rows) - 1) × $20
  - 嬰兒不銹鋼 live 值：物料=$115（非舊版 $95），不含 $20 運費
  N飾成本 = (物料+環扣) × N_飾 [+ 畫圖費（單購首件）]
    加購：(115+10) × N_飾 = 125 × N
    單購(S)：60 + 125 × N
    單購(P)：110 + 125 × N
```

#### 純銀頸鏈吊飾每件成本組件
```
成本 = 畫圖 + 打印 + 頸鏈 + 運費($35/件)

⚠️ 【G6】吊飾無「扣夾」。Airtable Base_Costs 的「Clasp」欄位，
   對吊飾而言代表「頸鏈」（neck chain），非金屬扣夾。
   現行頸鏈成本 = $100（Airtable 舊值 $70 已過時，以 $100 為準）
```

#### 【G2】畫圖費：同部位首件計費，後續免費
```
規則：同一訂單、同一部位（如「嬰兒左手」）：
  第 1 件：全成本（含畫圖費）— 稱「單購 SKU」
  第 2 件起：免畫圖費（同一部位的圖只畫一次）— 稱「加購 SKU」

適用：鎖匙扣 + 純銀頸鏈吊飾均適用此規則。

驗算範例（嬰兒鎖匙扣不銹鋼，物料=$115 Clasp=$10 Drawing(S)=$60）：
⚠️【S124 更正】舊例用 Printing=$95+Shipping=$20=合計$115，現正名為物料=$115，subtotal 不含運費
  嬰兒左手 1飾(單購) ×1：$60+$115+$10 = $185（subtotal_cost，不含運費）
  嬰兒右手 1飾(單購) ×1：$60+$115+$10 = $185（subtotal_cost，不含運費）
  嬰兒右手 2飾(加購) ×2：($115+$10)×2 = $250（免畫圖，subtotal_cost，N飾×125）
  item subtotals 合計 = $185+$185+$250 = $620
  件數 = SUM(quantity) = 1+1+2 = 4
  運費訂單層扣減：(4-1)×$20 = $60
  orders.keychain_cost = $620 − $60 = $560
```

#### 【G3】跨產品部位規則
```
規則：同一訂單、同一部位，不論產品類型（鎖匙扣或吊飾）：
  若該部位已有任何一件產品，後加的同部位其他類型產品，
  即使是「該類首件」，同樣免畫圖費（部位已畫過）。

範例：嬰兒左手已有鎖匙扣 → 再加購嬰兒左手吊飾 → 吊飾免畫圖費
```

#### 【G4】頸鏈費：1 頸鏈最多 2 吊飾（奇偶交替規則）
```
核心邏輯：每條頸鏈最多掛 2 個吊飾
  奇數件（第1、3、5…件）：含頸鏈費 $100
  偶數件（第2、4、6…件）：免頸鏈費（與前一件共用同一頸鏈）

範例（同部位 4 件吊飾，Drawing=$60 Printing=$260 Necklace=$100 Shipping=$35）：
  第1件（部位首件）：$60+$260+$100+$35 = $455（含畫圖+頸鏈）
  第2件（同鏈）：  $260+$35 = $295（免畫圖、共用頸鏈）
  第3件（新鏈）：  $260+$100+$35 = $395（免畫圖、新頸鏈）
  第4件（同鏈）：  $260+$35 = $295（免畫圖、共用頸鏈）
  小計 $1440，運費扣減 (4件-1)×$35=$105 → 吊飾成本 = $1335
```

#### 【G5】純銀頸鏈吊飾運費共享扣減
```
規則：同一訂單，吊飾總件數 > 1 時，
      (吊飾總件數 - 1) × $35 從 necklace_cost 扣減
      ⚠️ 總件數 = SUM(quantity) across all necklace order_items（非行數）
```

---

## 五、成本欄位歸屬表（Who Writes What）

### orders 表

| 欄位 | 寫入方 | 禁止操作 | 說明 |
|------|--------|---------|------|
| `final_sale_price` | Dashboard（sbSyncOrder） | n8n/Supabase 禁止重算 | 前端絕對真理 |
| `total_cost` | n8n（Mirror to Supabase） | Supabase trigger 禁止 | Layer 2 快照 |
| `net_profit` | n8n（Mirror to Supabase） | Supabase trigger 禁止 | Layer 2 快照 |
| `handmodel_cost` | n8n（Mirror to Supabase） | Supabase trigger 禁止 | Layer 2 快照 |
| `keychain_cost` | n8n（Mirror to Supabase） | Supabase trigger 禁止 | 含運費扣減 |
| `necklace_cost` | n8n（Mirror to Supabase） | Supabase trigger 禁止 | Layer 2 快照 |
| `deposit` | Dashboard（sbSyncOrder） | n8n 禁止覆蓋 | 用戶輸入 |
| `balance` | Dashboard（sbSyncOrder） | n8n 禁止覆蓋 | 用戶輸入 |
| `additional_fee` | Dashboard（sbSyncOrder） | n8n 禁止覆蓋 | 用戶輸入 |
| `raw_form_state` | Dashboard（sbSyncOrder） | n8n/Supabase 只讀 | 不可侵犯 |

### order_items 表

| 欄位 | 寫入方 | 說明 |
|------|--------|------|
| `item_base_cost` | n8n（Mirror to Supabase） | 查詢自 Layer 1 v_products_with_costs |
| `item_category` | n8n（Mirror to Supabase） | 由 SKU 推導（見第三節） |
| `handmodel_cost` | n8n（Mirror to Supabase） | item 層：如類別=立體擺設則=item_base_cost，否則=0 |
| `keychain_cost` | n8n（Mirror to Supabase） | item 層：如類別=金屿扣則=item_base_cost，否則=0 |
| `necklace_cost` | n8n（Mirror to Supabase） | item 層：如類別=純銀頸鏈吊飾則=item_base_cost，否則=0 |
| `product_sku` | n8n（Mirror to Supabase） | 來自 Product_Name（matched SKU） |
| `subtotal_cost` | n8n（Mirror to Supabase） | = item_base_cost × quantity |

---

## 六、Supabase 表格關聯（ERD）

```
cost_configurations（28 個成本配置）
    ↑ cost_config_id（FK ON DELETE SET NULL）
products（489 個 SKU）
    ↑ product_sku → sku（TEXT 比對，非 UUID FK）
order_items
    ↑ order_fhs_id → order_id（VARCHAR(20) FK）
orders

圖示：
orders ─── order_fhs_id ──< order_items >── product_sku ──> products
                                                               ↑
                                                         cost_config_id
                                                               ↑
                                                      cost_configurations
```

### 關鍵設計決策

| 設計 | 原因 |
|------|------|
| `order_items.order_fhs_id VARCHAR(20)` FK → `orders.order_id` | n8n 直接用 FHS-XXXXX 寫入，不需先查 UUID |
| `order_items.product_sku TEXT` → `products.sku`（無 FK 約束） | 特殊品（立體擺設/非標準）不在 products 表，允許 NULL |
| `orders.total_cost` 靜態 NUMERIC，禁止 trigger | Layer 2 歷史快照，任何動態計算均違反架構 |

---

## 七、Airtable 歷史邏輯對照（遷移參考）

| Airtable 欄位 | 類型 | Supabase 等效 | 計算方負責人 |
|--------------|------|--------------|------------|
| `Main_Orders.Handmodel_Cost` | rollup (SUM) | `orders.handmodel_cost NUMERIC` | n8n（Mirror node） |
| `Main_Orders.Keychain_Cost` | rollup (SUM) | `orders.keychain_cost NUMERIC` | n8n（含運費扣減） |
| `Main_Orders.Necklace_Cost` | rollup (SUM) | `orders.necklace_cost NUMERIC` | n8n（Mirror node） |
| `Order_Items.Handmodel_Cost` | formula | `order_items.handmodel_cost NUMERIC` | n8n（Mirror node） |
| `Order_Items.Keychain_Cost` | formula | `order_items.keychain_cost NUMERIC` | n8n（Mirror node） |
| `Product_Database.Total_Base_Cost` | formula | `products.total_base_cost NUMERIC` | 由 cost_configurations 計算 |
| `Base_Costs.Drawing_Cost` 等 | currency | `cost_configurations.*_cost NUMERIC` | 人工維護，腳本同步 |

> Airtable 的 rollup/formula 在 Supabase 中均由 **n8n 靜態寫入** 替代，嚴禁用 Postgres trigger/generated column 模擬。

---

## 八、Airtable 429 降級協議（CSV 備援）

### 背景

Airtable 每月有 API quota 上限。超限後回傳 HTTP 429，無法查詢任何 Airtable 資料。
為此，`airtable-database/` 目錄存有四個手動下載的 CSV 備份，作為 quota 超限時的離線數據源。

### 四個 CSV 檔案

| 檔案 | 對應 Airtable 表 | 關鍵欄位 |
|------|----------------|---------|
| `airtable-database/Main_Orders-Grid view.csv` | Main_Orders | Order_ID, Final_Sale_Price, Total_Cost, Handmodel_Cost, Keychain_Cost, Necklace_Cost, Net_Profit, Raw_Form_State |
| `airtable-database/Order_Items-Grid view.csv` | Order_Items | Order_Item_Key, Item_Category, Quantity, Item_BaseCost, Handmodel_Cost, Keychain_Cost, Necklace_Cost |
| `airtable-database/Product_Database-Grid view.csv` | Product_Database | Product_Name, Main_Category, Total_Base_Cost, Drawing_Cost, Printing_Cost, Clasp_Cost, Shipping_Cost |
| `airtable-database/Base_Costs-Grid view.csv` | Base_Costs | Linked_Base_Cost, Drawing_Cost, Printing_Cost, Clasp_Cost, Shipping_Cost |

### 降級觸發條件

```
若 Airtable MCP 回傳 HTTP 429：
  → 停止所有 Airtable MCP 工具呼叫
  → 改讀對應 CSV 檔案（Read 工具直接讀取）
  → 在稽核報告中標注「數據來源：CSV 離線備份（日期待確認）」
  → 提醒 Fat Mo：CSV 備份可能非最新，建議 Airtable quota 重置後再驗證
```

### CSV 與 Supabase 的優先級

```
數據可信度排序（由高至低）：
  1. Supabase（即時，主導）
  2. Airtable MCP（即時，備援，quota 可用時）
  3. airtable-database/*.csv（離線備份，quota 超限時使用）

⚠️ CSV 僅作稽核參考，不可用於修改任何系統數據。
```

---

## 九（原八）、財務驗證公式

```
驗證 1：訂單成本一致性
  orders.handmodel_cost + orders.keychain_cost + orders.necklace_cost = orders.total_cost
  （keychain_cost 已含運費扣減）

驗證 2：利潤正確性
  orders.net_profit = orders.final_sale_price - orders.total_cost

驗證 3：前端利潤守護
  若 frontend_profit ≠ 0，Airtable.Net_Profit 必須 = frontend_profit
  若 frontend_profit = 0，n8n 可重算 Net_Profit

驗證 4：SKU 成本完整性
  v_order_cost_breakdown.cost_integrity = '✓ matched'（全部）
  products.total_base_cost IS NOT NULL（全部）
```

---

## 十、任何財務任務前的強制讀取清單

```
必讀（按優先順序）：
  0. .fhs/ai/skills/finance-gatekeeper/SKILL.md ← 守門員（查詢路由 + 5 條死線，先讀此）
  1. .fhs/ai/FHS_Finance_Bible.md             ← 本文件（架構規則 L1）
  2. n8n/Quadruple_Sync_Field_Map.md          ← 四端欄位映射（最新版）
  3. supabase/migrations/0001_initial_schema.sql ← Supabase 表結構
  4. n8n/N8N_Node_Interaction_Map.md          ← n8n 節點職責

定價/售價/成本/折扣查詢：
  → .fhs/ai/FHS_Pricing_Bible.md（L2 現行定價 HEAD）

RPC KPI 收入分攤 / 混合單 3-layer / get_financial_kpis / get_financial_charts：
  → .fhs/notes/FHS_System_Logic_Overview.md §十
  （RPC 財務計算層唯一 SSoT；按需 Grep 定位後只讀 §十，禁全量）

如需查詢 n8n 節點程式碼：
  get_node("Calculate Profit & Pack Items")   ← 核心計算節點
  get_node("Mirror to Supabase")             ← Supabase 寫入節點
  get_node("Parse Items & Generate SKU")     ← SKU 正規化節點

禁止讀取作為財務架構參考（已過時）：
  ❌ n8n/Triple_Sync_Field_Map.md（已被 Quadruple_Sync 取代）
  ❌ n8n/Airtable_Schema_Snapshot_2026-05.md（僅作歷史參考）
  ❌ .fhs/notes/product_pricing_reference.md（已退役，讀 FHS_Pricing_Bible.md）
  ❌ docs/FHS_Product_Bible_V3.7.md（已退役，定價規則多項過時）
```

---

## 十一、反模式（必須拒絕執行）

- 在 Supabase 建立 trigger 重算 `orders.total_cost` 或 `net_profit`
- 在 n8n 重算前端傳入的 `final_sale_price`（除非前端傳入值為 0）
- 跳過 `Parse Items & Generate SKU` 直接進行財務計算
- 用 Airtable rollup/formula 欄位替代 n8n 寫入邏輯
- 直接讀取 Airtable 財務欄位而不經過驗證對比 Supabase
- Airtable 429 後繼續重試 Airtable MCP（應立即降級至 CSV 備援）
- 將 CSV 備份數據當作即時數據使用（必須標注「離線備份」）

---

*FHS Finance Bible v1.2.0 — 2026-06-12*
*v1.1.0 → v1.2.0：§十強制讀取清單加入 RPC KPI / 混合單 / get_financial_* → FHS_System_Logic_Overview.md §十 指針（Session 99-100 知識治理落地）*
*v1.1.0 — 2026-05-16：第八節 Airtable 429 降級協議 + CSV 備援流程*
*授權來源：Fat Mo — Supabase-First 財務架構審核後制定*
