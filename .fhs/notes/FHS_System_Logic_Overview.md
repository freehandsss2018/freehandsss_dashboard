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

### 2.5 付款分攤 UI — 三大類簡化模式（Session 126，2026-06-29）

**函式**：`renderPaymentSplits` / `_fhsAllocateSimplified` / `_fhsAggregateByCat` / `_fhsTogglePaySimpMode` / `_fhsBuildCatFormula` / `_fhsRefreshSimplifiedView`

**兩種輸入模式**（toggle 按鈕切換，UI-only，不影響序列化）：
- **細分（預設）**：每件逐部位 split-box（box-cat-P/K/M），現有邏輯不變
- **三大類**：① 手模擺設+配件（cat-P）② 鎖匙扣（cat-K）③ 頸鏈吊飾（cat-M）各一格；預設**唯讀鏡像**顯示三類聚合現值；✏️ 解鎖 → inline 確認 → 整百最大餘數分攤回填底層 box

**分攤演算法（`_fhsAllocateSimplified`）**：
- $100 單位 largest-remainder：`floor(raw/100)*100` → 按小數部分遞減分配 $100 剩餘 → 不足百補至最大分數 box
- Σ 精確守衛（`allocs[0] += total - Σallocs`）
- 零權重 fallback：等權整百分攤

**序列化契約（不變）**：
- 寫穿走 `dispatchEvent('input')` → `recalcSplitSum` → `serializeSplits` → `#depositSplitData`/`#balanceSplitData` JSON
- `captureFormState`/`raw_form_state`/n8n/舊單還原零感知
- 簡化 input 無 id/name/非 `.split-box-input`（防 recalcSplitSum 雙計）

**守衛繼承**：S92 isDefault 載入保護、S97 force、S101 restoreSplits innerHTML 清空、S107 `_fhsSplitRestoreSnapshot`

**算式顯示（`_fhsBuildCatFormula`，Session 126 追加）**：
- 三大類模式下，每個類別標籤下方顯示建議價組成算式，如 `$860×4`（同值合併）或 `$2380+$860`（異值展開）
- 資料來源：`depositSplitContainer .split-box.box-cat-{P/K/M} .quick-half-btn[data-suggested]`（建議價，非已付值）
- 算式為純顯示層（`<span class="fhsPaySimp_formula">`），無 id/name/input，captureFormState 零感知
- `_fhsRefreshSimplifiedView` 更新時同步刷新算式

**IG 訊息【付款資料】格式（`_buildSplitIgLine` 分支，Session 126 追加）**：
- 簡化模式啟用時，付款行改為三類小計：`pureNumeric=false` → `已付訂金：手模+配件$X+鎖匙扣$Y+頸鏈吊飾$Z=$T`；`pureNumeric=true` → `X+Y+Z=$T`
- 三類全 0 時 fallback 原逐件格式；細分模式行為不變

**UI 標籤與顏色（Session 126 追加）**：
- Toggle 按鈕：`⊞ 簡化`（進入簡化模式）/ `≡ 逐件`（返回逐件明細）——操作者語言，取代「三大類/細分」
- 鎖匙扣（box-cat-K）配色：`#E3F2FD` / `#1565C0`（鋼藍）；P=橙、M=紫、K=藍，三類視覺分離

**kgov 同步點**：修改 `renderPaymentSplits`/`_quickHalfFillAllSplits`/`_quickFillAllSplits`/`restoreSplits` 時需補呼 `_fhsRefreshSimplifiedView()`。

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
| `ig_watchdog_alerts` | IG 看門狗 v3 每日警報記錄（S119，見 §11）|

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

> ⚠️ **2026-06-20（Session 112）live 值校正**：本表前版多個值已與 Supabase live 不符（文件 drift 本身即是本次事故的同類案例）。以下為本次查證之 live 值，校正時間以 `cost_configurations.updated_at` 為準。

| Key | Live 值 | 說明 |
|-----|----|------|
| `drawing_cost_baby_s` | $60 | 嬰兒/大寶掃描建模畫圖費 |
| `drawing_cost_baby_p` | $110 | 嬰兒/大寶照片建模畫圖費 |
| `drawing_cost_adult_s` | $110 | 成人掃描建模畫圖費 |
| `drawing_cost_adult_p` | $240 | 成人照片建模畫圖費 |
| `material_cost_necklace_silver` | $465 | 吊飾925銀打印費（前版誤記 $260，已過時）|
| `material_cost_necklace_gold` | $465 | 吊飾18K金打印費（前版誤記 $316，已過時）|
| `material_cost_keychain_stainless` | **$115** | 鎖匙扣不銹鋼（嬰兒/大寶）物料費（前版誤記 $95，2026-06-16 改值，本次事故起因）|
| `material_cost_keychain_stainless_adult` | $125 | 鎖匙扣不銹鋼（成人）物料費（前版誤記 $135）|
| `material_cost_keychain_alloy_adult` | $135 | 鎖匙扣鋁合金（成人）物料費 |
| `material_cost_keychain_alloy` | **$115** | 鎖匙扣鋁合金（嬰兒/大寶）物料費（S120 2026-06-23 補建；前版誤記 $122 且 key 不存在）；`products.total_base_cost` 同步更正：嬰兒S $212→$185 / 嬰兒P $262→$245（40 SKU）|
| `necklace_chain_cost` | $100 | 吊飾頸鏈費（每條）|
| `keychain_clasp_cost` | $10 | 鎖匙扣環扣費（每件）|
| `keychain_shipping_deduction_per_extra` | $20 | 鎖匙扣多件運費扣減（每件）|

### 5.4 成本傳播鏈與已知缺口（Session 112 新增）

**`cost_configurations` 變更 → `products.total_base_cost` 無自動傳播機制**：

```
cost_configurations（key-value，可編輯）
        │  fhs_upsert_cost_config()  ← 只寫 key-value，不回算下游
        ▼
products.total_base_cost  ← 仍是建表時的 seed 值，除非手動 UPDATE
        │
        ▼
order_items.subtotal_cost ← 建單時複製 products.total_base_cost（快照，設計上不回溯）
```

- 06001008 事故核實：`material_cost_keychain_stainless` 改 115 後，`products.total_base_cost`（185/235）剛好仍與新值組裝一致，**純屬巧合**（seed 本來就是用 115 算的），非系統正確同步。
- 已壞死的 `recalculate_product_costs(text)` RPC（引用 v1 schema 不存在欄位 `cc.id`/`cc.drawing_cost`/`cc.clasp_cost`，呼叫必報錯）已於 **migration 0042 移除**。
- 新增唯讀 RPC `fhs_check_product_cost_drift()`：比對 `products.total_base_cost` 與 atom 組裝值，**範圍限定**僅嬰兒 S/P 不銹鋼鎖匙扣（已用 live 數據數學驗證之公式：`drawing_baby_{s|p} + material_cost_keychain_stainless + keychain_clasp_cost`）。其餘 tier（家庭 S1/S2/P1/P2、成人、鋁合金、吊飾、立體擺設）公式未驗證，**刻意不覆蓋**，避免假性 drift 判定。
- **Dashboard 存檔提示**：`fhs_upsert_cost_config` 存檔成功後，toast 加註「products 成本表不會自動同步，請另行執行 drift 檢查」（V42 dev，line ~13743）。
- **Phase 2（未排程）**：成本組裝單一真源重構（收斂 `cost_configurations`/`products`/n8n 硬編碼 COST_MAP 三套並存的成本表徵），另開 `/cl-flow`。

### 5.4.1 加購鎖匙扣「N飾」數量漏算 — 雙層根因（Session 124 v2，2026-06-26 ✅ 已修復）

> ✅ S124 v2 已執行完畢（2026-06-26）：migrations 0045/0046 + 線B products UPDATE(41行) + 線C 9單回填 + n8n V47.18 + finance-auditor 對賬。見 `artifacts/2026-06-26-0922/cl-final-plan.md`。

- **現象**：「嬰兒鎖匙扣-不銹鋼-N飾(加購)」`order_items.subtotal_cost` 與 `orders.keychain_cost` 對 qty=2/3/4 多數仍只記單件 185/235，無視件數 → `total_cost`/`net_profit`/KPI 利潤多報（例 0600905/0600908 qty=2 記 keychain 185，應 ≈ 250 前；全庫 16 行受影響、9 單）。
- **雙層根因**：
  1. `products.total_base_cost` 對「N飾」SKU（`item_per_set`=1…10）**全 flat 185（嬰兒S）/235（嬰兒P）**，完全不隨 item_per_set 變 → products 表本身錯。
  2. n8n `Calculate Profit & Pack Items`(V47.17) `totalBaseCost += itemCost`／`keychainCostTotal += itemKeychainCost` 取 flat 值且**從不 × Original_Qty**（qty 只用於運費扣減），亦**未採前端透傳的四分量**。
- **單一真源已定案（證據）**：前端 `calculatePricing()` 四分量**才是對的**——4飾加購 `Σ四分量=500`=(物料115+環扣10)×4，已含 qty + G2/G3 免畫圖。修法＝n8n 收斂至四分量和（缺則 fallback products×qty）。屬 §5.4 Phase 2 單一真源同源，本案做立即修子集。
- **subtotal 含運費慣例（釐清）**：subtotal_cost **不含運費**（四分量 500 無運費）；運費僅訂單層 `(鎖匙扣件數−1)×$20` 扣減。Finance Bible §G2 範例把運費寫進 per-piece 且用 stale $95，待校正。
- **v2 修復取向（8維分析後定，✅ 已執行）**：(1) 建唯讀 RPC `fhs_compute_keychain_cost()` 封裝 G2/G3 公式為**單一真源**，回填/drift/n8n 共用，杜絕第二套公式（解「新單四分量 vs 舊單回填 SQL」雙公式 drift）；(2) 立即修**不動 n8n 全品類取值**，全品類四分量收斂明確歸 Phase 2 另案（控 blast radius）；(3) 本 9 單全為「立體擺設+加購鎖匙扣」→ 統一「加購全免畫圖=(material+clasp)×N」，判定依「同單是否有立體擺設」布林；(4) 回填寫入 S124 `audit_logs`，drift 函式擴充覆蓋 N飾(item_per_set) 維度。詳 `artifacts/2026-06-26-0922/cl-final-plan.md §9`。
- **per-set vs per-piece 已由專檔定案（非歧義）**：`FHS_Product_Cost_Schema_v2.md §5.1/§5.4` 明定「飾數=同 SKU 內倒模件數」「order_item 成本 = 繪圖費 + 材質物料費**依飾數倍增** + 印刷費」→ `total_base_cost` = **per-set 總額**＝`(material+clasp)×飾數 [+繪圖(單購首件)]`。4飾加購=(115+10)×4=500（對齊前端四分量）。products 現 flat 185 = 卡在飾數=1 未倍增。**n8n 取 per-set 總額後不得再 ×order_items.quantity**（飾數已含於 SKU/total_base_cost，quantity 為飾數的冗餘表徵，乘則雙計）。

> ✅ Session 112 [G] 稽核收尾確認：本節（§5.3/§5.4）已於 migration 0042 部署同一 session 內同步完成；`finance-gatekeeper/SKILL.md` 路由表已同步加行（v1.3.0）。

### 5.5 綜合審計日誌（Session 124 新增）

**`audit_logs` 表**（migration 0044，2026-06-25 部署 ✅）：

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID PK | gen_random_uuid() |
| `created_at` | TIMESTAMPTZ | 事件時間 |
| `log_type` | TEXT NOT NULL | `cost_config_change` / `order_cost_adjust` / `batch_recalc` |
| `action` | TEXT NOT NULL | `create` / `update` / `delete` |
| `actor` | TEXT | 操作者（來自 localStorage `fhs_expense_operator`）|
| `entity_type` | TEXT | `cost_config` / `order` |
| `entity_id` | TEXT | config_key 或 FHS order_id |
| `before_val` | JSONB | 改前快照 |
| `after_val` | JSONB | 改後快照 |
| `summary` | TEXT | 人讀摘要（e.g. `drawing_cost_base: 55 → 60`）|
| `source` | TEXT | `dashboard` / `n8n` / `rpc` |

**RLS**：anon `SELECT` only（查閱日誌）；寫入只經 SECURITY DEFINER RPC（anon 不可直接 INSERT）。

**索引**：`(log_type, created_at DESC)`、`(entity_id, created_at DESC)`、`(created_at DESC)`。

**寫入路徑**：
- `fhs_upsert_cost_config(p_key, p_value, p_expected_version, p_updated_by)`（4-param）——已升級，在同一交易內 INSERT `audit_logs`（log_type=`cost_config_change`，原子寫入，有改必有記錄）。
- ✅ S130 Phase B（已部署 0047）：`fhs_adjust_order_cost(p_order_id, p_new_total_cost, p_reason, p_actor)` 及 `fhs_unlock_order_cost(p_order_id, p_actor)`，同交易寫 log_type=`order_cost_adjust`；`orders.cost_override_locked` 防批次覆蓋。

**查詢 RPC**：`fhs_query_audit_logs(p_log_type, p_entity_id, p_from, p_to, p_limit, p_offset)` → JSONB `{success, rows, count}`；GRANT EXECUTE TO anon, authenticated。

**前端**：Log Sheet 記錄中心新增「📋 審計日誌」tab（V42 dev，Session 124）。篩選器：類別下拉 + 訂號輸入 + 日期範圍。

> ✅ Session 124 [G] 確認：本節已於 migration 0044 部署同一 session 內完成。

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
> ② 成本快照鏈 v2 架構（Session 103 修復；Session 124 加可展開明細；Session 128 加 inline 扣減 badge）：
> - **主結構**：`orders.handmodel_cost / keychain_cost / necklace_cost`（30/30 populated，最可靠）
> - **inline 成本扣減 badge（S128）**：`n8n_adjustment_notes` 內每筆有金額的扣減（如「鎖匙扣多件運費優惠」「吊飾多件運費優惠」）依 desc 關鍵字（手模/鎖匙扣/吊飾）對應到該類別成本行，於金額**左旁**顯示 `(−$X)` **綠色 `#2E9E5B`**（節省語義，非成本，與紅色成本區隔）+ 小圓形 ⓘ（`fhsAudit_dedDot`），**點按才展開**解說（含 `basis` 依據），預設收起；未對應到類別者 fallback inline 顯示確保不漏。**只揭露不改數**：成本金額與 `total_cost` 維持 n8n 快照值不變。helper：`_dedBadge(keyword)` / `_costRow(label,costNum,keyword)`，`_consumedAdj` 防重複映射。頂部摘要卡「💰 成本扣減說明」維持為總覽。
> - **Problem E 扣減行**：`catSum − total_cost > 0` → 顯示「運費共享扣減」對賬行
> - **per-item 次清單（S128 重排版）**：`order_items.subtotal_cost`（稀疏，舊單全空顯示藍色待補錄條）。品項以**分類色標頭分組**（對齊 S126 簡化付款 P橙 `#FFF3E0/#E65100` / K藍 `#E3F2FD/#1565C0` / M紫 `#EDE7F6/#4527A0`），**次序固定 P手模擺設 → K鎖匙扣 → M頸鏈吊飾**（對齊訂單總覽）；分類碼由 `item_key` 的 `_P_/_K_/_M_` 解析，fallback `item_category` 關鍵字。
> - **左右手腳精簡標籤（S128）**：品項標籤改顯示**部位**（左手/右手/左腳/右腳/主體），由 `item_key` 後綴 `_LH/_RH/_LF/_RF/_MAIN` 解析（`_limbName`）；非手模類附材質提示（銀/金/鋼/鋁，由 `product_sku` 取，`_matName`）。**刻字（`specification`/`engraving_text`，如「[上排]LUCA」）一律不顯示**（非成本核對所需）。組內依部位 rank（主體→左手→右手→左腳→右腳）排序。helper：`_limbName`/`_matName`/`_catCode`/`_catMeta`/`_limbRank`。
> - **per-item 可展開明細（S124，點2 降級版）**：每筆品項成本小計用原生 `<details>`，summary 顯示部位標籤+小計金額，展開只列**真實存在欄位**（`item_base_cost`、`quantity`、及 >0 的 `drawing/printing/chain/shipping_cost`）；四欄全空時顯示「明細未記錄（n8n 未寫入）」，**禁止前端用 cost_configurations 自行重算拆解**（違反成本單一真源）
> - **數量誠實警示（S124，點3）**：`qty>1 && subtotal_cost == item_base_cost`（成本完全未隨件數累加）→ 顯示紅色 `fhsAudit_qtyWarn`「疑漏算加購 N−1 件，待 n8n 修正」，**不顯示 `單件×數量=小計` 乘法**（避免製造假數）
> - **品項層四欄（正式廢欄，S125 架構決策）**：`drawing/printing/chain/shipping_cost` — live 查實 80 列中 74–76 列為 0/NULL，無有效消費者（訂單層主結構 S103 起改用 `orders.handmodel/keychain/necklace_cost`）。**保留欄位不 DROP**（n8n Mirror Prep 仍 INSERT，DROP 觸發 PostgREST 400 斷鏈）；停止補寫投資；per-item 展開 >0 者仍顯示，全空時維持「明細未記錄」誠實文案。Phase 2 單一真源重構時一併清理。
>
> ✅ **S124 v2 修復（2026-06-26，已結案）**：加購鎖匙扣 N飾成本漏算 bug 已修 — migration 0045（`fhs_compute_keychain_cost` RPC）+ 線B products UPDATE 41 rows（嬰兒 S/P 不銹鋼 N飾改 per-set 值）+ 線C 9 單回填（order_items/orders/audit_logs）+ finance-auditor 三端對賬 9/9 PASS。前向路徑：n8n 直讀 `products.total_base_cost`（已為 per-set 值），所有已發生訂單正確。`fhsAudit_qtyWarn` 誠實警示仍保留（對未來可能的其他 tier 缺口）。
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
| 0043 | `ig_watchdog_alerts` 表 + RLS anon 只讀 + SECURITY DEFINER RPC `fhs_resolve_ig_alert` + expression UNIQUE INDEX dedup + pg_cron 90天 TTL（Session 119，2026-06-23）|

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

### 10.10 Session 105 UX 修復總覽（2026-06-16）

#### A. 封存→已完成語義更名
- 所有 UI 文案：「封存」→「完成」；「已封存」→「已完成」
- Segmented Control：原「進行中 / 已完成」→「全部 / 進行中 / 已完成」（`_fhsSegTab='all'` 分支：`segFiltered = allOrders.slice()`）
- bsSheet 按鈕：`<span>完成訂單</span>`；動態標籤：`.has(orderId) ? '取消完成' : '完成訂單'`

#### B. Swipe 手勢引擎修復（V42 line ~11503）
| Bug | 根因 | 修正 |
|-----|------|------|
| ✏ 刻字 icon 點擊觸發 swipe drawer | `currentX` 模組層級變數，touchstart 未重置 | `currentX = isOpen ? -maxSlide : 0`（touchstart 起始點） |
| 互動元件（button/input）誤觸 swipe | 無 guard | `if (e.target.closest('button, input, select, a')) return;` |
| 靈敏度過高（誤觸） | `threshold=40` | `threshold=64` |
| swipe-btn 觸控遲頓 | 無 touch 優化 | `.swipe-btn { touch-action: manipulation; }` |

#### C. Swipe 按鈕動態文字
- Template literal 由靜態 `<span>完成</span>` 改為 `${..._fhsArchivedIds.has(o.id) ? '取消完成' : '完成'}`

#### D. 已完成訂單 dlv-card-done Badge
- CSS class：`.dlv-card-done { background:#EAF0F8; border:1px solid #93AECB; }`；status text `color:#2E5C8A`
- Badge 文字：`✅ 完成 · Xd 前`（以 `appointment_at` 或 `Date` 計算天數）
- 顏色選擇：藍灰（區別正常訂單的綠色 dlv-card-green）

### 10.11 S130b 訂單總覽日期排序優先次序修正（2026-07-01）

**問題**：訂單總覽以 `confirmed_at` 單欄排序，未考慮 `appointment_at`（預約日）作為主排序鍵。

**修正**：

| 層次 | 改動 |
|------|------|
| `sbFetchGlobalReview` 查詢排序（V42 line ~13858）| `order: 'appointment_at.asc.nullslast,confirmed_at.asc'`（appointment_at 優先，NULL 排末，fallback confirmed_at） |
| `mapOrder()` `Date` 欄位（V42 line ~13806）| `row.appointment_at \|\| row.confirmed_at \|\| ''`（appointment_at 優先） |

**語義**：`appointment_at` = 操作者手動填寫的客戶預約取件日期，比系統自動寫入的 `confirmed_at` 更貼近業務排期需求。`nullslast` 確保無預約日的舊單不衝前。

---

*本文件由 Session 60 建立。下次改動任何上述層次時，請同步更新對應章節。*
*§十 由 Session 99 補入（2026-06-12）。§10.8–10.9 由 Session 104 補入（2026-06-15）。§10.10 由 Session 105 補入（2026-06-16）。§10.11 由 Session 130b 補入（2026-07-01）。§十一 由 Session 119 補入（2026-06-23）。*

---

## 十一、IG 看門狗警報整合（Session 119，2026-06-23）

### 11.1 資料流向（單向）

```
IG Drive Export
   ↓ n8n workflow D4LK6VrQbiXlju0V（Cron 06:00 HKT）
   ↓ Classify & Report 節點（cr1）
   ↓  種類：not_created / created_incomplete（created_full 靜默）
   ↓ [Phase 1b] Has Alerts?（IF守衛：alerts.length > 0）
   ↓   true  → Write Alerts HTTP POST → ig_watchdog_alerts INSERT（service_role key，冪等）→ Telegram Notify (Data)
   ↓   false → Telegram Notify (Data)（直接發摘要，跳過空陣列寫入）
   ↓
V42 igwatch 模式（anon SELECT）← ig_watchdog_alerts
V42 igwatch 模式（anon RPC）  → fhs_resolve_ig_alert（resolved 回寫）
```

### 11.2 ig_watchdog_alerts 表設計

| 欄位 | 說明 |
|------|------|
| `id` | UUID 主鍵 |
| `alert_date` | Cron 跑日（匯出覆蓋日）|
| `order_id` | FHS 訂單編號字串（**非 UUID**），NULL = 弱訊號/無訂號 |
| `kind` | `not_created` / `created_incomplete`（CHECK 約束）|
| `customer_name` | 顧客名（classifyMessage 輸出）|
| `snippet` | om.text 前 40 字摘要 |
| `thread` | IG thread 資料夾名稱 |
| `has_receipt` | photo metadata 收據布林（零下載偵測）|
| `db_matched` | order_id 是否在 Supabase orders 找到 |
| `raw` | 完整事件 payload JSONB（人工雙確認用）|
| `resolved` | 操作員已處理標記（DEFAULT false）|
| `resolved_at / resolved_by` | resolve 時間戳 + 操作員 |

**冪等鍵**：`CREATE UNIQUE INDEX ix_igwatch_alerts_dedup ON ig_watchdog_alerts (alert_date, thread, COALESCE(order_id,''), kind)`
— 同一 Cron 日 + thread + order_id + kind 最多一筆；COALESCE 允許 NULL order_id 參與比對

**RLS**：anon SELECT 只讀；無 anon INSERT（防偽造）；service_role bypass（n8n 寫入用）

### 11.3 SECURITY DEFINER RPC

```sql
fhs_resolve_ig_alert(p_id uuid, p_resolved boolean, p_by text DEFAULT 'operator')
```
- 只修改 `resolved / resolved_at / resolved_by` 三欄
- anon + authenticated 可呼叫；owner 身份執行
- GRANT EXECUTE TO anon, authenticated

### 11.4 V42 igwatch 模式

| 元素 | 說明 |
|------|------|
| 模式按鈕 | 🐶 `modeIgWatchBtn`，整合 switchMode array + activeMap |
| 容器 | `#igwatchModeContainer`（filter tabs / badge / list）|
| Lazy load | switchMode('igwatch') → `loadIgWatchAlerts()` |
| kind-aware 動作 | `created_incomplete` → `openOrderModal()`；`not_created` → `_igwCopyOrderId()`（禁用 openOrderModal，訂單不在 DB，靜默失敗）|
| Resolve 回寫 | `_igwToggleResolve()` → `sbRpc('fhs_resolve_ig_alert', ...)` + 樂觀更新 |
| URL 深連結 | `?view=igwatch[&orderId=xxx]`，window.onload 解析 |

### 11.5 Phase 狀態

| Phase | 內容 | 狀態 |
|-------|------|------|
| 1a | Migration 0043（表 + RPC + RLS）| ✅ 已部署 |
| 2 | V42 igwatch 模式 | ✅ 已上線 |
| 1b | n8n write node（HTTP Request → ig_watchdog_alerts）| ✅ 已驗收（S125）Exec 4034（2026-06-29 06:00 HKT）17/17節點全通過；OAuth 根因=Google Cloud OAuth app 處於 Testing 模式（refresh token 7天失效）→ 已發布為 Production；versionId=1a2632e1 |
| 3 | Telegram 訊息附 V42 deep-link URL | ✅ 已完成（S125）；S128 修復 emoji surrogate bug（🔗→`>`，ensure_ascii=True）；versionId=bb683165 |