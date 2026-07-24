# FHS 系統運作總論
> 版本：v1.0.0（2026-06-05 Session 60 建立）
> 目的：完整記錄 Freehandsss Dashboard 的運作邏輯，讓任何人讀完就知道整套系統在幹嘛。
> 更新規則：每次改動涉及以下任一層，必須同步更新本文件。
> 架構定位與數據主導權見 `.fhs/ai/AGENTS.md` §1；本文件記錄即時運作細節（函式簽名/RPC/migration編號）。（原 See-Also 檔 `docs/FHS_Blueprint.md` 已於 2026-07-08 S158 刪除：業務背景遷 auto-memory、§5 排版鐵律遷 `ui-ux-pro-max/FHS_INTEGRATION.md` Section 六，見 decisions.md D20）

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
- **吊飾頸鏈成本**（V47.19 新增，2026-07-17，D40）：`necklaceChainCost = Math.ceil(charmItemCount/2) × $100`，計入 `Total_Cost` 與 `Necklace_Cost_Total`，獨立重算不信任前端傳入值。詳見 §5.4.2。

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
> **2026-07-05（Session 147）新增約束**：migration `0048_cost_config_value_check_constraint` 已上線 `chk_config_value_numeric_nonneg` CHECK 約束——`data_type='number'` 的 row，`config_value` 必須符合 `^\d+(\.\d+)?$`（非負數字字串），寫入負數或非數字值會直接被 DB 拒絕（error 23514）。詳細設計見 `.fhs/ai/FHS_Product_Cost_Operations.md` §OP-1.2。

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
- 新增唯讀 RPC `fhs_check_product_cost_drift()`：比對 `products.total_base_cost` 與 atom 組裝值，**範圍限定**僅嬰兒 S/P 不銹鋼鎖匙扣（已用 live 數據數學驗證之公式：`drawing_baby_{s|p} + material_cost_keychain_stainless + keychain_clasp_cost`）。其餘 tier 已於 §5.4.3（Phase 2，2026-07-18）全數補齊覆蓋。
- **Dashboard 存檔提示**：`fhs_upsert_cost_config` 存檔成功後，toast 加註「products 成本表不會自動同步，請另行執行 drift 檢查」（V42 dev，line ~13743）。
- **Phase 2（drift 覆蓋部分已於 §5.4.3 完成，2026-07-18）**：成本組裝單一真源重構（收斂 `cost_configurations`/`products`/n8n 硬編碼 COST_MAP 三套並存的成本表徵）本身仍未排程，另開 `/cl-flow`；但全品類 drift 檢查覆蓋（鋁合金/成人/家庭鎖匙扣+家庭吊飾+立體擺設+配件）已補齊，見 §5.4.3。

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

### 5.4.2 吊飾（純銀頸鏈吊飾）成本雙數簿漂移 + 頸鏈規則從未落地（Session 181，2026-07-17，D40 ✅ 已修復）

> ✅ 已執行完畢（2026-07-17）：migration 0046 + n8n V47.19。見 `.fhs/notes/ai_reports/2026-07-17_order_cost_audit.md`、`decisions.md` D40、`.fhs/memory/lessons/2026-07-17_charm_cost_ledger_drift_and_missing_chain_rule.md`。

- **現象**：Fat Mo 回報訂單 Akira（0600721）成本計錯。全量審計（46 張訂單）揪出兩層問題，同 §5.4.1 鎖匙扣事故屬同一 drift 模式第三次重演（立體擺設 migration 0030 為第二次）：
  1. **頸鏈規則缺失**：`necklace_chain_cost`（每 2 條吊飾共用 1 條 $100，`Math.ceil(N/2)×100`）存在於 `cost_configurations` 及前端 `calculatePricing()`（正確計算並存入 `order_items.chain_cost` 供顯示），但 n8n `Calculate Profit & Pack Items` 從未讀取此值計入訂單成本。
  2. **雙數簿漂移（更深層）**：`products.total_base_cost`（n8n 實際成本來源）凍結咗吊飾材料舊值（銀 $365／金 $421，即本表 §5.3 已記錄嘅「前版誤記」舊值），而 `cost_configurations.material_cost_necklace_silver/gold`（本表 §5.3 已記錄嘅 live 值 $465/$465）長期未回傳播——凍結值入面已隱含舊版約 $70/件 頸鏈估算，若單純疊加新 $100 頸鏈規則會造成雙重計算（fresh-context opus 對抗式審查揪出此風險，第一次 patch 嘗試 NEEDS_REVISION）。
- **單一真源已定案**：仿 §5.4.1 鎖匙扣先例，建 `fhs_compute_charm_cost(drawing_fee, material_per_piece, qty=1)` RPC（`= drawing + material×qty`，**無 clasp/chain 項**——頸鏈刻意留喺訂單層獨立計，因係跨 2 件吊飾共用嘅實體資源，攤分做半件成本會喺奇數件時算錯）。
- **修復（migration 0046）**：用上述 RPC 回填 242 行吊飾 SKU 之 `total_base_cost`（銀/金材料 365/421 → 465/465，Fat Mo 確認金銀拉平屬有意）。只改商品目錄，未動任何既有訂單快照，零風險。
- **修復（n8n V47.18→V47.19）**：`Calculate Profit & Pack Items` 新增 `necklaceChainCost = Math.ceil(charmItemCount/2)×100`，計入 `Total_Cost`／`Necklace_Cost_Total`，寫入 `n8nAdjustmentNotes`（type: `necklace_chain_cost`）供審計追溯。因 migration 0046 已先清除凍結值內含嘅舊頸鏈估算，此規則現與 SKU 基礎成本互不重疊。
- **範圍**：僅影響**未來新單／未來重新 sync 之單**（n8n Code node 只在 webhook 觸發時運行，非批次/trigger）。7 張既有 flag 訂單（Akira/Dede/Kathleen/Amen/Selina Lai/Lokyi_C/DebbieHo）之歷史快照不受此部署自動影響，需 Fat Mo 另行於 Dashboard 手動 sync 補正。
- **2026-07-18 續修（migrations 0056/0057）**：Fat Mo 要求再核實時揪出 0046 回填後仍殘留兩個結構缺口（且過程中曾誤用已被 S124 v2 裁決取代嘅 Pricing Bible §6.2 舊運費分解做基準，一度誤判「漏 $35 運費」——實情係 **products 值按現行裁決不含運費**，鎖匙扣單購 185（非205）為 live 鐵證）。最終方程式（fresh-context opus 八角度對抗審查 FORMULA_HOLDS）：
  - **加購**（含 1 行「加貼」typo SKU）＝ `material($465) × item_per_set`（免畫圖，對齊鎖匙扣先例）
  - **單購**＝ `tier_drawing + material × item_per_set`（tier 映射 live 實證：嬰兒→60、嬰兒(P)→110、成人(P)→240；家庭(S1/S2/P1/P2) 於此輪誤用單一成人式，已於 §5.4.3 Phase 2 修正為 composite）
  - migration **0056** 按此回填 242 行（改後 SQL 驗證 242/242 符合，零違規）；migration **0057** 將 `fhs_check_product_cost_drift()` 擴充覆蓋吊飾全 tier（總覆蓋 282 行，執行結果零漂移）。
  - **Akira 0600721 重算定案數**：吊飾 4×465 − 運費扣減105 + 頸鏈200 = 1955；+ 鎖匙扣 440 + 手模 210 ＝ **total_cost $2605**（現存 2357，計少 $248）。此數由對抗審查獨立重算鎖定，為 resync 後預期值。
  - 防再錯機制：`finance-gatekeeper/SKILL.md` §三B 新增「成本改動前置紀律」三步（完整方程式先行／對齊先例／改完跑 drift 檢查）。
- **Phase 2（drift 覆蓋部分已於 §5.4.3 完成，2026-07-18）**：鎖匙扣、立體擺設、吊飾三大品類均已各自補完單一真源 RPC；成本組裝架構性重構（收斂 `cost_configurations`/`products`/n8n 三套並存表徵）本身仍未排程，另開 `/cl-flow`；但全品類 drift 檢查覆蓋已補齊，見 §5.4.3。

### 5.4.3 成本架構 Phase 2：全品類漂移偵測網一次收網（Session 181，2026-07-18，D41 ✅ 已修復）

> ✅ 已執行完畢（2026-07-18）：migrations 0058/0059，cl-flow flow_id `2026-07-18-2105`。見 `artifacts/2026-07-18-2105/cl-final-plan.md`、`decisions.md` D41。

- **緣起**：`/cl-flow 成本架構 phase 2` 一次收網覆蓋 §5.4.1/§5.4.2 未觸及嘅品類（鋁合金鎖匙扣、成人/家庭鎖匙扣、家庭吊飾、立體擺設、配件）。
- **opus 對抗審查揪出 A3 原定案兩個 BLOCKER**（同 §5.4.1/§5.4.2 一脈相承嘅「文件可過時，live 數據先係真相」教訓再次應驗）：
  1. 家庭鎖匙扣 SKU 普查遺漏 N=2..10 梯階（~152 個 SKU 全部 flat 275/405，未按式，只查咗 item_per_set=1 就落結論）。
  2. **composite 畫圖式（成人份 + 每個嬰兒肢各計一次）方向一度判斷錯**：opus 首輪用家庭吊飾 SKU 現價反推出「單一成人式」，同 A3 composite 假設矛盾。最終查證 Dashboard 前端 `calculatePricing()` 原始碼（`isFamily` 分支，`freehandsss_dashboardV42.html:7099-7110`）證實 **composite 才係 Fat Mo 現行實際業務邏輯**——`0600107` 訂單嘅 `order_items.drawing_cost=230`（=110+2×60）為活證據；Fat Mo 直接確認。連帶發現 §5.4.2（D40）記錄嘅家庭吊飾 tier_drawing 本身都用錯咗單一成人式，一併喺本次修正（零歷史單受影響，純 catalog 修正）。
- **定案方程式**（composite 畫圖式，四條 Fat Mo 拍板已定案）：
  - 嬰兒鎖匙扣-鋁合金：加購=`(material_alloy+10)×N`；單購=`drawing_baby{S:60/P:110}+(material_alloy+10)×N`（material_alloy=115，同不銹鋼 baby tier 已收斂同價）
  - 成人/家庭鎖匙扣（不銹鋼+鋁合金）：加購=`(material_adult+10)×N`；單購=`composite_drawing+(material_adult+10)×N`；composite_drawing：成人(P)=240、S1=110+1×60=170、S2=110+2×60=230、P1=240+1×110=350、P2=240+2×110=460
  - 家庭吊飾（單購）：`composite_drawing + material×N`（composite_drawing 同上；加購維持不變，本身已正確=材料×N無畫圖）
  - `material_cost_keychain_alloy_adult`：135→**125**（Fat Mo 拍板對齊不銹鋼同價；6-03 定價早於 6-16/6-23 兩次材質收斂動作，判定為漏改）
  - 立體擺設／配件：現值（210/30）已確認正確，只補入 drift 網
- **修復**：migration **0058**（products 全量重算 + cost_configurations 原子修正 + 刪除零成本佔位 row，21/23 行安全刪除，2 行因仍被已取消測試單 order_items 引用而動態排除）；migration **0059**（`fhs_check_product_cost_drift()` 擴充至全品類共 7 個 CTE，含 base_row 監測分支——初版誤將立體擺設/家庭吊飾(加貼) 當佔位 row 觸發假陽性，已收窄範圍修正）。opus 第二輪審查揪出 STEP G DELETE 會撞 `order_items_product_sku_fkey` 外鍵嘅 BLOCKER，已改用 `NOT EXISTS` 動態排除修復。
- **驗證**：`SELECT * FROM fhs_check_product_cost_drift() WHERE drift <> 0` = **零行**（全品類）。
- **歷史單影響**：僅 `0600107`（家庭(S2)鎖匙扣加購，2026-05-22）需二次 resync；因瀏覽器環境連唔到生產 Dashboard，Fat Mo 自行手動 resync。家庭吊飾全線 0 張歷史單，純 catalog 修正。
- **n8n 影響**：**零改動**——V47.19 訂單層規則以 category 字串判斷，天然涵蓋本次品類，成本修正全部落 `products` 表即生效。

### 5.4.4 立體擺設玻璃瓶套裝新增「含父母」SKU（Session 183，2026-07-19 ✅ 已修復）

> ✅ 已執行完畢（2026-07-19）：migration 0060。見 `decisions.md` 2026-07-19 條目（兩則）、`Changelog.md` S183 條目。

- **緣起**：Fat Mo 修正玻璃瓶套裝定義——2肢/4肢分級只講述嬰兒手腳（`hasFoot` 只查嬰兒左右腳）原價不變；訂單倒模對象含父母時售價一律 $2,580 flat，先例單號 `0600107`。
- **SKU 命名一度反覆**：首輪決定「品名不變、只改售價」（沿用「玻璃瓶套裝 (4肢)」），Fat Mo 部署後回報混淆疑慮，查證揭發真 bug——訂單總覽「顯示項目財務」稽核面板用獨立嘅 `fhsSuggestedPriceMap`（讀 `products.suggested_price` 靜態逐 SKU 對照，無 context 判斷含唔含父母），同一品名下無法區分「含父母」定價，恆顯示 catalog 舊值 $1,680，同 `calculatePricing()` 即時結果脫節。改用獨立 SKU「**玻璃瓶套裝 (家庭)**」（對齊既有「家庭(S1)/(S2)」鎖匙扣/吊飾命名慣例，不再標肢數，因家庭定價 flat 不分 2肢/4肢）。
- **防呆補強**：現有 `hasAdult && !hasBaby` 頂層防呆睇 Product_Name/comboNote 含「成人」字樣，但 P_MAIN 品名/comboNote 從不含「父母」，全靠獨立 `en_parent` checkbox，完全冇被涵蓋——「父母已勾但嬰兒肢體全部『無』」呢個違反 §0 品牌核心嘅情境原本會靜默算出 $2,580 都唔會被攔。已補獨立防呆區塊（紅字阻擋、報價歸零）+ $2,580 formula 本身加 `hasBabyInSet` 雙重防守。
- **執行**：`calculatePricing()`/`buildOrderItemsForPricing()` 兩處 pName 生成新增 `hasParentGlass` 判定；`products` 表新增第 5 行 SKU「玻璃瓶套裝 (家庭)」（migration 0060，`total_base_cost=210` 不變、`suggested_price=2580`，`ON CONFLICT (sku) DO NOTHING` 冪等）。
- **驗證**：node harness（獨立參數名避免變數遮蔽）7 組情境全過（含防呆邊界、家庭品名輸出）；`SELECT * FROM fhs_check_product_cost_drift() WHERE drift<>0` 新 SKU 插入後仍零行；NAS 部署後 Browser pane 直接喺 live 網址測試 `en_parent` 切換 + 品名/售價雙重核實正確。
- **歷史單影響**：`0600107` 之 `product_sku` 保留原文「玻璃瓶套裝 (4肢)」不回填（Layer 2 快照精神）。
- **教訓**：改「售價」但唔改「品名」嘅設計，喺任何有靜態 per-SKU catalog 對照嘅系統都係計時炸彈——改 SKU 定價邏輯前應先掃全 repo 揾晒邊啲地方用緊 SKU 字串做查表 key（唔淨係改主要計算函式），同 §5.4.1-§5.4.3「單一真源」教訓同源但呢次係「同一 SKU 名底下藏兩種語意」嘅新變體。

### 5.4.5 吊飾頸鏈成本：前端估算雙計 + Audit Ledger badge 誤導 + 記帳格式對齊鎖匙扣（Session 187，2026-07-21/22，D42）

> ✅ 三項全部已修復並部署（2026-07-22）：n8n V47.20 已正式上線 + 7 張真實歷史吊飾單（Dede/Kathleen/Akira/DebbieHo/Amen/Selina Lai/Lokyi_C）已直接 Supabase backfill 至新格式（第 8 張 `test1001` 為壓測 fixture 非真實訂單，已排除）。⚠️ 端對端 live webhook 驗證受 Airtable API 額度耗盡（S186 已知問題，見 §5.4.2 待辦）阻擋未能完成，待額度恢復後補測。見 `decisions.md` D42（含追記）、`Changelog.md` S187 系列條目（4 則）。

- **緣起**：Fat Mo 核對 Akira（0600721）帳單，發現「吊飾成本折扣運算有錯」，牽出三個獨立問題，全部源自同一根因——**頸鏈成本喺唔同層各自用唔同手法表達，互相打架**：
  1. **前端估算雙計**（`calculatePricing()`）：新/修訂單嘅成本預估器將「每件運費**扣減**率」config（`charm_shipping_deduction_per_extra`/`keychain_shipping_deduction_per_extra`）誤複用做「每件運費**成本**」疊加落 `_totalBaseShipping`，同真正嘅扣減項並存，令 `raw_form_state.__System_Total_Cost` 估算貴 $220（Akira：$2,615 vs 真實 $2,395）。**修復**：移除 `_totalCostNew` 公式入面 `_totalBaseShipping` 加項。純前端參考預算修正，不影響任何已落地 Supabase 數字。
  2. **Audit Ledger badge 正負號誤導**：核對帳單「② 成本快照鏈」畫面，`_dedBadge(keyword)` 用 desc 子字串比對（keyword=`吊飾`）撈 `n8n_adjustment_notes`，但吊飾同時有 `charm_shipping_deduction`（-$105）同 `necklace_chain_cost`（+$200，V47.19 加項）兩張筆記都含「吊飾」字眼，被夾埋加成 +$95，再經 `_fNeg(-Math.abs(x))` 強制當扣減顯示，印出誤導性「(-$95)」。**修復**：`_dedBadge` 拆做 `_dedBadge`（只認負值）+`_addBadge`（只認正值），同 keyword 底下嘅正負筆記分開顯示唔再合併淨值。
  3. **記帳格式唔一致（根本對齊）**：追查落品項明細再發現，吊飾嘅「環扣/頸鏈」成本喺 4 件入面唔對稱分佈（左手$100/右手$0，源自前端 `calculatePricing()` 估算 pass-through，非 n8n 權威值——V47.19 只計訂單層總數，從未拆返落每件）；相對之下鎖匙扣嘅環扣每件對稱$10（因為早已摺入 `products.total_base_cost`）。Fat Mo 裁決：吊飾比照鎖匙扣模式，改為**品項層對稱 $100/件 + 訂單層「共用折扣」負數扣減**，取代現行「訂單層單一 +$200 加項」。**數學等價證明**：`100×N − floor(N/2)×100 = 100×ceil(N/2)`，同 V47.19 現行 `ceil(N/2)×100` 加項完全相等，總成本 $2,605 不變，純記帳表達方式對齊。
- **n8n 節點改動範圍**（`Calculate Profit & Pack Items`，V47.19→V47.20）：per-item loop 內吊飾類別新增 `itemChainCost = 100×itemQty` 對稱摺入自身 `Total_Base_Cost`/`Necklace_Cost`（同時覆寫 `Chain_Cost` 欄位為 n8n 權威值，不再信前端 pass-through；非吊飾類別 `Chain_Cost` 顯示維持原樣不受影響）；訂單層以 `charmChainSharingDiscount = floor(charmItemCount/2)×100` 取代舊式 `necklaceChainCost` 加項；`n8n_adjustment_notes` 新增 `necklace_chain_sharing_discount`（負數）取代 `necklace_chain_cost`（正數）。
- **範圍（追記，2026-07-22 推翻早前決定）**：Fat Mo 原裁決「只影響新落單／未來 resync，8 張歷史單不 backfill」，同日追加改變主意，要求連歷史單一併修改。執行：7 張真實歷史單（第 8 張 `test1001` 為 $0 成本壓測 fixture 非真實訂單，已排除）直接 Supabase UPDATE——`order_items` 吊飾行 `item_base_cost`/`subtotal_cost`/`necklace_cost` 各 +$100、`chain_cost` 統一對稱 100；`orders.n8n_adjustment_notes` 正數 `necklace_chain_cost` 換成負數 `necklace_chain_sharing_discount`（DebbieHo 0600727 N=1 個案 `floor(1/2)=0` 故直接移除該筆記，無替代）。**未動** `orders.necklace_cost`/`total_cost`/`net_profit`/`final_sale_price`（UPDATE 前後逐單核對完全不變，證明純記帳格式重分配，非財務數字改動）。
- **驗證**：Node harness 用 Akira 真實 4 吊飾+4鎖匙扣+1手模情境重算，`totalBaseCost=2605`／`necklaceCostTotal=1955`／`keychainCostTotal=440`／`handmodelCostTotal=210` 與現行完全一致；n8n `update_node_code` dry-run 通過（過程中揪出並修正一個草稿 bug——原稿誤將非吊飾類別嘅 `Chain_Cost` 一併覆寫為 0，已收窄只影響吊飾類別）後 `dryRun=false` 正式部署，自動備份於 `.fhs/notes/aireports/n8n-mcp-backups/2026-07-22/`。**端對端 live 驗證受阻**：測試單 `test9002`（4吊飾模擬情境）經真實 webhook 提交後卡喺 n8n `running`（execution 4906）未落地 Supabase，重新 curl 探測 Airtable API 確認 `HTTP 429` 依然存在，同 S186 已知嘅 `test5001`（execution 4902，卡逾 12 小時）屬同一未解決外部阻塞，**非本次改動引起**（新舊 code 同樣會喺此步驟卡住）；Supabase 核實兩張測試單均未落地，無孤兒記錄需清理，但端對端驗證本身待 Airtable 額度恢復後補做。
- **教訓**：同一個成本分量（頸鏈）喺前端估算層、Audit Ledger 顯示層、n8n 權威計算層三處各自用唔同假設表達（雙計/keyword撞正/唔對稱分佈），互相獨立地睇都「啱」，夾埋睇先暴露矛盾——查呢類「畫面睇落唔對數」嘅 bug，必須逐層追到底（前端估算 vs 顯示邏輯 vs 後端權威值三方對照），單一層修完唔代表全部修完。

### 5.4.6 鎖匙扣/吊飾「單購/加購」語義漂移根因確認 + 三層成本模型裁決（Session 189，2026-07-24）

> ⏳ **狀態：Phase 0（唯讀模擬）已執行完畢並產出實數；Phase 1-3（實際 schema/n8n/Dashboard 改動）待 Fat Mo 拍板 Q1/Q4 後方可進行**（cl-flow flow_id `2026-07-24-0213`，Verdict `CONDITIONAL_READY`）。本節記錄嘅係決策+根因+Phase0模擬結果,**現行 Supabase 產品定價／order_items 寫入邏輯尚未改動**,查詢實際訂單成本請繼續以本節之前既有規則為準,唔可以將本節「新模型」數字當現行行為引用。

- **緣起**：Fat Mo 核對訂單 0600723 財務分頁「右手 鋼×4」成本小計 $500，反覆質疑計算邏輯，AI 一開始堅持 $500 正確（引用 finance-auditor 獨立覆核 + D37/S176 舊結論 + products 表源頭值三方一致），但 Fat Mo 出示 2024-09-15 原始成本推演表（Excel 截圖）+ 舊 Airtable Base_Costs 記錄，證明現行「加購=$0畫圖」並非原始設計。
- **根因（git archaeology 實測confirmed）**：「加購」語義曾經歷史性漂移：
  1. 2024-09-15 原始設計：同部位第2件起免畫圖，**首件仍收**（首件全費含畫圖+運費，次件起淨物料+環扣）
  2. 2026-06-02（S52，`decisions.md:536-541`）：Finance Bible 正式落盤「同部位首件含畫圖，第2件免畫圖」——同原始設計一致
  3. **2026-06-03（S55，commit `4dbdef2`）轉捩點**：修復「加購喺主套裝已選部位時重複收畫圖費」bug 時，實際落地代碼（`chargedPositions` pre-populate 邏輯，`Freehandsss_dashboard_current.html:5113-5130`）將「同部位」判定範圍由「線內首件」誤擴大成「主套裝已選=成條線全免（含首件）」，超出 S52 原意
  4. 之後 `FHS_Product_Definition.md` 將「加購=依附主產品」固化為正式定義，鞏固咗漂移後嘅新語義
- **交叉證據**：Supabase live 查證，`item_base_cost=500=subtotal_cost`（quantity=4）違反 schema 自身契約（`migrations/0005_field_descriptions.sql:277-284` 定義「item_base_cost×quantity=subtotal_cost」，但實際存嘅係已乘quantity嘅小計）；`n8n Code Node` 額外查證確認：`order_items.drawing_cost`/`printing_cost`/`chain_cost` 拆解欄位喺「單購」多件SKU會被錯誤地 qty 相乘（例：`drawing_cost=$220`=110×2，但真正記帳值`subtotal_cost=$360`只含一次$110），全庫掃描僅2張單3行受影響（低風險，獨立於本次主爭議）。
- **Fat Mo 裁決（新三層成本模型，取代單購/加購二分）**：
  - **Layer 1 成本表**：畫圖/物料/環扣/運費各自獨立欄位（對應 `cost_configurations`）
  - **Layer 2 產品層**：SKU `total_base_cost` = Layer 1 全部分量加總（含運費，運費視為成本一種，唔抽離；同時保留 `shipping_cost` 等獨立欄位拆解留底，達成「顆粒化」——每個分量都要有專屬欄位記錄，唔可以溝埋一齊或淨係文字備註）
  - **Layer 3 訂單組合層**：同部位第2件起嘅畫圖/運費扣減，由 n8n 訂單層動態計算（結構化欄位 `drawing_charged_count`/`drawing_waived`，唔淨係 `n8n_adjustment_notes` 文字備註）
  - **SKU 命名**：刪除「(單購)/(加購)」+「N飾」編碼（現時 484 個 SKU 變體），復原 `FHS_Product_Definition.md` §3.2/3.3 原有定義嘅乾淨格式「`[對象]([建模法]) [品類] - [材質]`」——成本計價資訊由 SKU 字串移入結構化欄位後，SKU 身份自然變乾淨，非另立新規則
- **執行狀態**：cl-flow（flow_id `2026-07-24-0213`）已完成 A1(Perplexity)+A2(Gemini) 對抗評審，`cl-final-plan.md` Verdict=`CONDITIONAL_READY`——Phase 0（唯讀模擬對比全庫歷史訂單新舊成本，零寫入零風險）可獨立執行；Phase 1-3（實際 schema/n8n/Dashboard 改動）待 Phase 0 報表 + Fat Mo 拍板 Q1（N飾維度是否 collapse）後方可進行。
- **已完成之獨立子任務**：Requirement #3（Supabase 表/欄位 description 100% 覆蓋）已於同 session 執行完畢，`migration 0070`，15 表全覆蓋，同新裁決之三層模型正交、不受阻。
- **Phase 0 唯讀模擬執行結果**（`migrations 0071`+`0072`，RPC `fhs_simulate_new_cost_model()`）：對全庫 `金屬鎖匙扣`/`純銀頸鏈吊飾` order_items 並排計算現行 subtotal vs 新模型 subtotal——**64 行受影響、涉及 30 張訂單，現行總額 $21,555，新模型總額 $27,400，差額 +$5,845**（全部 4 個 tier 分組差額均為正值：P-baby-吊飾+$680／P-baby-鎖匙扣+$1,780／S-baby-吊飾+$1,235／S-baby-鎖匙扣+$2,150，符合「S55 移除嘅畫圖費現重新計入」預期方向）。0600723 右手驗證：$500→$580，同人手推導完全吻合。
  - **執行中 finance-auditor 獨立覆核揪出並修正一個真實 bug**：`migration 0071` 初版漏計吊飾類別嘅 D42 頸鏈成本（$100/件），導致吊飾類 delta 出現可疑負數；`migration 0072` 修正後（unit_full_cost 加 $100 頸鏈 + 扣減新增 `floor(quantity/2)×100` 共用折扣）全 tier 轉正，數值可信。
  - **明確聲明未覆蓋範圍**（RPC 回傳 `uncovered_scope`，no silent cap）：家庭 composite SKU（1 行，D41 專屬公式未納入,待 Q3 獨立驗證）；已知「單購」拆解欄位 qty 相乘 bug 污染行（3 行，比較基準本身不潔淨，需交叉排除）；跨 SKU 行同部位彙總扣減（如同單右手+左腳分兩行、或吊飾+鎖匙扣混單）本模擬僅算單行內 quantity，真實 n8n Phase 2 邏輯需彙總全單。
- **Phase 1 新統一 SKU 上架執行結果**（Fat Mo 拍板 Q1=collapse、Q4=接納+$5,845 為預期方向後執行；`migrations 0073`+`0074`）：
  - `products` 表新增 16 個統一 S/P tier SKU（嬰兒/成人 × S/P × 鎖匙扣不銹鋼/鋁合金或吊飾925銀/925金），命名格式「`[對象]([S/P]) [品類] - [材質] (V2)`」，`item_per_set=1`（quantity 責任移交 `order_items.quantity`）。**命名撞名教訓**：原擬用無`(V2)`後綴嘅乾淨命名，但實測發現成人(P)-tier部分既有「單購」SKU本身已是裸格式（歷來冇N飾變體），會直接撞現有生產SKU UNIQUE constraint；全部16個新SKU改加`(V2)`後綴避免碰撞，副作用係過渡期operator可肉眼分辨新舊模型。
  - `order_items` 新增4個結構化欄位：`position_code`(左手/右手/左腳/右腳 CHECK)、`drawing_waived`、`drawing_charged_count`、`cost_model_version`，供 Phase 2 n8n 動態扣減寫入，取代純文字 `n8n_adjustment_notes`。
  - 新建 `fhs_verify_new_sku_costs()`（新SKU專屬drift監測，不與舊監測混用，A2/#3反饋）；**發現並修正**：舊 `fhs_check_product_cost_drift()` 嘅 `base_row_monitor`「孤兒row監測」CTE 將新SKU（`mode='S'/'P'`）誤判做「未知孤兒」，全部16行假陽性漂移——修正（`migration 0074`）加 `sku NOT LIKE '%(V2)'` 排除，兩監測範圍從此不重疊，修正後全庫零漂移。
  - **database-reviewer 獨立覆核揪出 Phase 2 阻斷性待辦**：n8n live workflow「Parse Items & Generate SKU」節點（`n8n/FHS_Core_OrderProcessor.json`）用 `sku.includes("鎖匙扣")`／`.includes("吊飾")` 過度匹配（非精準比對）判斷分類，會誤將V2新SKU尾綴污染成類似 `...(V2) - 1飾 (加購)` 嘅混合格式，導致後續成本查詢失敗。**現時非活躍風險**（Dashboard 前端未接線生成任何V2 SKU，全庫零"(V2)"引用），但**Phase 2（n8n動態扣減）啟用V2下單流程前必須先修正呢個節點**，屬 Phase 2 前置阻斷項。
  - 驗證：`fhs_verify_new_sku_costs()`=0行、`fhs_check_product_cost_drift()`=0行、舊SKU（0600723先例$500、曾撞名嘅成人(P)鎖匙扣-不銹鋼$375）`updated_at`確認未被觸碰、全表 `GROUP BY sku HAVING count(*)>1`=0行確認UNIQUE constraint未被繞過。
- **Phase 2 前置修復（n8n live workflow，V47.12→V47.13）**：database-reviewer 揪出嘅「Parse Items & Generate SKU」節點過度匹配已修正——鎖匙扣/吊飾正規化區塊（`.includes("鎖匙扣")`/`.includes("吊飾")` 兩處）加 `isV2Sku = sku.endsWith("(V2)")` guard，凡SKU已係完整(V2)格式即跳過舊式「- N飾 Mode」後綴邏輯同 `shipping_saved`/`necklace_saved` 舊扣減計算。經 n8n MCP `update_node_code` dry-run 先預覽 diff 確認純加guard、零其他改動，再 `dryRun=false` 正式套用（自動備份於 `.fhs/notes/aireports/n8n-mcp-backups/2026-07-24/`，backup版本ID `eb7eeefb-34c1-498b-9f52-7b1f2396ff6a`，可用 `rollback_node_code` 一鍵回滾）。**Live execution 驗證已補（2026-07-24 同session內完成）**：`trigger_test_execution` MCP工具本身打嘅係 `/workflows/{id}/run` management API，同呢個webhook-triggered workflow不兼容（兩次mock payload皆405，屬工具層問題）；改用 curl 直接 POST 真實 webhook URL（`https://yanhei.synology.me:8443/webhook/1444800b-...`，`authentication:"none"`）觸發，構造刁鑽對抗測試（訂單 `FHS-TEST-V2-0724`，品項 `Product_Name="嬰兒(S)鎖匙扣 - 不銹鋼 (V2)"` **同時**帶 `Mode:"(加購)"`——最容易觸發舊bug嘅組合）。**結果PASS**：execution 5064 success，Supabase `order_items.product_sku` 實際寫入值 = `"嬰兒(S)鎖匙扣 - 不銹鋼 (V2)"`，完全冇被追加後綴污染；`item_base_cost=subtotal_cost=$205` 同 `products` 表新SKU定價完全對上，順便驗證埋成本查表全鏈路（webhook→Parse Items→products.sku查表→寫入order_items）對V2 SKU已可正常運作。測試訂單已清理（`order_items`/`orders` 兩表各刪1行，刪後歸零確認）。

- **Phase 2 核心bug修復（n8n live workflow「Calculate Profit & Pack Items」，V47.20→V47.21）**：qty=1 live測試PASS掩蓋咗一個更嚴重嘅問題——用 **qty=4** 重測同一SKU,揪出 `item_base_cost=subtotal_cost=$205`（應為$820），證實 n8n 由頭到尾**完全冇喺任何節點做`total_base_cost × quantity`**。根因：`Local Data Mapper`／`Calculate Profit & Pack Items` 兩節點對 `Total_Base_Cost` 一律直接使用唔乘quantity——舊SKU得能行得通係因為「幾多飾」焗喺SKU字串本身（`item_per_set`=N，`total_base_cost`已經係成套總價），但V2 SKU設計係「單件價」（`item_per_set`=1），要靠n8n動態×quantity先岩，Phase1規劃時漏咗呢一步。**連帶第二個bug**：舊code對所有「純銀頸鏈吊飾」類別無條件 `itemCost += 100×itemQty`（頸鏈費），但V2吊飾SKU嘅`total_base_cost`本身已經baked咗$100/件（Phase1方程式），一旦V2吊飾接線會**雙重計算**頸鏈成本。
  - **修正**：`isV2Sku` guard——V2 SKU嘅`itemCost = rawUnitCost × itemQty`；V2吊飾唔再重複加`itemChainCost`落itemCost（但display/審計仍計呢個值）。現有 `keychainShippingDeduction`/`charmShippingDeduction`/`charmChainSharingDiscount` 三個訂單層扣減機制（原本已存在,鏡像唔使重寫）純按件數(`itemQty`)計算,唔區分V2/舊SKU,兩者皆通用不變。
  - **Live webhook驗證**：qty=4 V2鎖匙扣重測後 `item_base_cost=subtotal_cost=$820`（同Phase0 gross預期完全吻合）；V2吊飾qty=2測試 `chain_cost=$200`(顯示正確)但`item_base_cost=$1320`(gross,冇雙重計算)，訂單層`necklace_cost=total_cost=$1185`（=1320−35運費扣減−100共用折扣，同Phase0設計完全吻合）。
  - **舊SKU regression 缺口已補完（真正根因：測試資料本身有誤，非infra/非本次代碼改動）**：連續4次嘗試（`FHS-TEST-OLD-REGRESS`/`-REGRESS2`/`-REGRESS3`）皆被 `get_execution_log` MCP 工具顯示為"running"卡住，最初誤判為 `Smart Cache Strategist` 節點 axios/NAS 網絡層問題（同已知 `test5001`/`test9002` 表徵相似）。**Fat Mo 用瀏覽器直接開 n8n UI 揭穿真相**：execution 實際喺 958ms 內就完成並 **Error**（非卡住），`get_execution_log` MCP 工具回報嘅"running"狀態係失準/過時，唔可信——真正錯誤係 `HTTP: Supabase Sync RPC` 節點收到 Postgres `22001: value too long for type character varying(20)`，根因係我啲測試訂單ID（如`FHS-TEST-OLD-REGRESS3`，22字元）超過 `orders.order_id` 嘅 `varchar(20)` 上限；而V2測試系列訂單ID（`FHS-TEST-V2-0724`等）啱啱好17字元冇撞上限，純屬命名巧合掩蓋咗呢個限制，同鎖匙扣/V2 SKU邏輯完全無關。改用合規短ID（`FHS-TEST-OLDR4`，14字元）重試,**結果完美吻合預期**：`product_sku="嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)"`（單一後綴無污染）、`item_base_cost=subtotal_cost=$500.00`（同0600723已知值一致）、`drawing_cost=$0`、訂單層`keychain_cost=$440`（500−60運費扣減，`n8n_adjustment_notes`筆記正確）。**舊SKU路徑經live execution直接確認完全未受V47.13/V47.21影響**，驗證缺口正式補完。測試訂單已清理。
  - **額外教訓（工具可信度）**：`mcp__n8n-mcp-server__get_execution_log` 對已完成（含Error）嘅execution可能持續回報過時嘅"running"狀態，唔可以單憑呢個MCP工具判斷execution係咪真係卡住——懷疑卡單時應改用瀏覽器直接開 n8n UI `/workflow/{id}/executions/{executionId}` 核實，或請Fat Mo協助截圖，唔應該憑MCP工具嘅表面狀態就斷定「同代碼改動有因果關係」。

- **Phase 2 核心功能落實：同部位第2件起免畫圖（n8n live workflow「Calculate Profit & Pack Items」V47.21→V47.22 + 「Supabase Mirror Prep」+ RPC `sync_order_to_mirror()`，migration 0075）**：
  - **邏輯**：由 `Order_Item_Key` 後綴（`_LH`/`_RH`/`_LF`/`_RF`）推導 `position_code`；同一 position_code 之下**跨品類**（鎖匙扣+吊飾共享豁免資格，同Dashboard前端 `calculatePricing()` 嘅 `chargedPositions` Set 精神一致——同部位3D掃描只需一次）分組，組內按 `packedItems` 原始順序，第1件收畫圖費，其餘全部豁免；扣減鏡像現有 `keychainShippingDeduction`/`charmChainSharingDiscount` 寫法（訂單層扣減 + `n8n_adjustment_notes` 審計記錄），僅V2統一SKU套用，舊SKU完全不受影響。
  - **結構化欄位落地**：`order_items.position_code`/`drawing_waived`/`drawing_charged_count`/`cost_model_version`（migration 0073已建）首次被實際寫入非NULL值——`sync_order_to_mirror()` RPC（migration 0075）擴充 INSERT/UPDATE 支援呢4個欄位，`Supabase Mirror Prep` 節點同步傳遞。
  - **Live webhook 對抗測試**（跨品類同部位訂單：右手鎖匙扣qty4 + 右手吊飾qty1 + 左腳鎖匙扣qty2）：**結果完全吻合人手推導**——右手鎖匙扣`drawing_charged_count=1`（首件），右手吊飾`drawing_charged_count=0`（同部位第2件，正確跨品類豁免），左腳鎖匙扣`drawing_charged_count=1`（新部位首件）；訂單層`total_cost=$1,490`/`keychain_cost=$890`/`necklace_cost=$600`，`n8n_adjustment_notes`記錄`drawing_position_dedup_deduction:-$300`並附逐行detail拆解，數字全部核對正確。**再次舊SKU regression確認未受V47.22影響**（`$500`不變，4個新欄位皆NULL）。全部測試訂單已清理。
  - **已知非阻斷性小瑕疵**：`_fourColGross`收斂律自我檢查（審計用，`amount=0`唔影響實際財務數字）對V2 SKU會產生誤導性差異提示——因為呢個檢查原本針對舊SKU嘅前端四分量pass-through設計（`Drawing_Cost`/`Printing_Cost`/`Shipping_Cost`），V2訂單前端未必填呢啲欄位，令`convergence_note`嘅差值計算對V2單無意義。純cosmetic，唔影響任何實際入帳數字，留待日後獨立處理（唔喺本次Phase2範圍）。
  - **Phase 2 至此完整交付**：SKU過度匹配修復（V47.13）+ qty乘法修復（V47.21）+ 頸鏈雙重計算修復（V47.21）+ 同部位畫圖動態扣減（V47.22+RPC 0075）四項全部live驗證PASS。

- **Phase 3（部分）：Dashboard 前端切換到 V2 SKU 生成（`freehandsss_dashboardV42.html`，dev版，未部署 `current.html`）**：
  - **範圍收窄至嬰兒(baby)tier**：Dashboard 生成「大寶」部位時用 `大寶鎖匙扣...` 字面（唔係`嬰兒鎖匙扣...`），但 Phase1 目錄（migration 0073）只建咗 `target_object IN ('嬰兒','成人')` 共16個V2 SKU，冇`大寶`專屬entry——若連大寶/家庭/成人區塊都改，會即刻查唔到成本變$0。故本次**淨係改嬰兒(baby)tier嘅鎖匙扣+吊飾兩類**（4個code區塊：真實提交`syncToAirtable()`嘅嬰兒鎖匙扣8396行+嬰兒吊飾8459行、前端估價`buildOrderItemsForPricing()`對應兩個鏡像區塊6972/7011行），大寶/家庭/成人區塊維持原有(單購/加購)格式完全不動。
  - **改動內容**：`let finalObj = p.type; if(!hasMainProduct) finalObj="嬰兒(P)";`（舊：有主套裝完全冇tag，冇主套裝先加(P)）→ `let finalObj = hasMainProduct ? "嬰兒(S)" : "嬰兒(P)";`（新：兩邊都明確tag）；`Product_Name`模板尾巴加`" (V2)"`後綴。
  - **驗證**：`current.html` 受 pre-tool-guard.js R1/R9 保護，未獲 `.deploy-ok` 授權前唔可寫入，故改動範圍局限於 `V42.html`（dev版，無guard）。4個編輯位皆reload後console零錯誤；另喺browser console隔離測試4種組合（嬰兒S/P×鎖匙扣/吊飾）字串輸出，全部同Phase1目錄entry及先前live webhook已驗證嘅SKU字串完全吻合（"嬰兒(S)鎖匙扣 - 不銹鋼 (V2)"／"嬰兒(P)鎖匙扣 - 不銹鋼 (V2)"／"嬰兒(S)吊飾 - 925銀 (V2)"／"嬰兒(P)吊飾 - 925金 (V2)"）。未做嘅深度驗證：實際click過表單UI完整落單流程（因read_page/find工具喺此session反覆cache失效，改用fetch攔截+console隔離測試邏輯替代，效果等價但非完整UI交互驗證）。
  - **未部署**：`current.html` 未升格，operator現行實際使用嘅檔案完全未變。升格需 Fat Mo 直接回覆AI提出嘅升格確認問題（見對話記錄），AI方可自建`.deploy-ok`（10分鐘有效，一次性consume）。
  - **尚未做**：4份規則文件P0同步（Finance Bible/finance-gatekeeper/Cost_Schema_v2/Quadruple_Sync_Field_Map）、家庭composite SKU（Q3）、`buildAuditLedgerHtml()`財務彈窗顯示更新、大寶/家庭/成人tier嘅V2目錄擴充+對應Dashboard區塊改動。
  - **升級驗證：真實 browser UI 操作端對端測試（非console隔離邏輯測試）**：`window.fetch` 攔截（僅捕獲含"webhook"嘅請求並回mock response，唔send出去）後，用真實DOM click觸發`enableP`/`enableK`/`k_baby_sec_en`/`k_lh_en`checkbox+`qty`輸入，`calculatePricing()`估價運算零console error正常執行；再直接call真實`syncToAirtable()`（非mock，係頁面上`syncBtn`嘅onclick target function本身），攔截到嘅真實payload入面`Order_Items_List`正確含 `{"Order_Item_Key":"0600702_K_LH","Product_Name":"嬰兒(S)鎖匙扣 - 不銹鋼 (V2)","Mode":"(加購)","Quantity":4}`——同Phase1目錄entry逐字吻合。**風險排查**：呢個form自動load咗一張真實歷史訂單（0600702，action="review"），非空白新單；核實 Supabase `orders.customer_name`仍為原值"YingYing"（非測試輸入嘅"V2 Browser Test"）、`updated_at`同測試前一致，確認fetch攔截完全生效，真實webhook從未發出，0600702訂單完全未受任何觸碰。至此Phase3（嬰兒tier部分）驗證強度由「邏輯隔離測試」升級為「完整真實UI互動端對端測試」。
- **教訓**：業務規則嘅語義會喺「修一個bug」嘅過程中不知不覺被擴大範圍（S55 本意止跨產品重複收費，實際結果變成連線內首件都豁免）——修復 bug 時必須明確界定「呢次改動嘅範圍邊界」，唔可以淨係驗證「target 數字啱咗」就當完事,要同步核對「改動路徑有冇超出原本 bug report 描述嘅範圍」。另：AI 三次獨立驗證（自己、finance-auditor subagent、D37舊結論）一致嘅結論，喺面對業主提出原始設計文件(spreadsheet)時仍然可能係錯——「多方驗證一致」證明嘅係「現行代碼行為自洽」，唔等於「現行代碼行為符合原始業務意圖」，兩者係唔同層次嘅正確性,唔可以互相取代。

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

### 5.6 記錄中心「支出記錄」tab（expense_logs，Session 150 修復）

**`expense_logs` 表**（Session 34 建表，欄位：`log_type/entry_date/category/item_name/amount/remarks/operator/payload/created_at`）。

**寫入 RPC**：`fhs_write_expense_log(p_log_type, p_entry_date, p_category, p_item_name, p_amount, p_remarks, p_operator)` → INSERT 回傳 `id`（migration 0049，2026-07-07 部署）。SECURITY DEFINER + 固定 `search_path`；GRANT EXECUTE TO anon, authenticated。

> ⚠️ **S150 修復前的斷裂**：前端 `submitExpenseLog()` 早已呼叫 `_fsRpc('fhs_write_expense_log', ...)` 作為主路徑，但該 RPC 從未建立（探針 404），落入 `.catch()` fallback；fallback 又引用未定義的 `window._sbUrl`/`window._sbHdr`（第二層斷裂），導致記錄中心「支出記錄」tab 完全無法寫入。migration 0049 補上 RPC 本體；fallback 同步修正為使用同一 IIFE 內已宣告的 `_FS_SB_URL`/`_FS_SB_ANON` 常數（不再依賴 window 上不存在的鍵）。詳見 `.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md` §4.4。

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

### 10.12 Segmented Control（全部/進行中/已完成）Desktop 開放（S150 F3，2026-07-07）

**問題**：`#fhsSegWrapper`（`全部/進行中/已完成` 三分頁，控制 `#reviewTableBody` 篩選）CSS 基樣式為 `display:none`，只在 `@media (max-width:767px)` 覆寫為顯示 → **Desktop（≥768px）完全看不到此控制項**，已完成/歸檔訂單在 Desktop 端不可篩選、形同隱形。

**修正**（V42 CSS，line ~2907）：
- 基樣式由 `display:none` 改 `display:block`（常顯）
- 新增 `@media (min-width:768px)`：`max-width:380px`（靠左、不佔滿整行）
- 原 `@media (max-width:767px)` 區塊不變（767px 以下零回歸）

**live 驗證**（2026-07-07）：1280px 下點「已完成」分頁，`#reviewTableBody` 列數從「進行中」74 筆切至「已完成」6 筆；「全部」80 筆 = 74+6 完全吻合。修復前這 6 筆歸檔訂單在 Desktop 端無法觸及。

詳見 `.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md` §4.3。

### 10.13 財務版面全額錯誤事故審計（2026-07-17）

**事故**：Fat Mo 報告財務版面所有金額錯誤。四路平行審查（前端映射/DB真值/git回歸/生產Playwright實測）+ opus fresh-context 驗收裁定為三個並存問題：

| # | 問題 | 狀態 |
|---|------|------|
| 1 | **數據污染**：S179/S180（07-16）壓測單 test1001/test9999003/test1004/「未命名」寫入生產 orders 未清理，連同 `confirmed_at IS NULL` 條款被計入現期，monthly revenue 虛高近 50% | ✅ 已清（Fat Mo 批准改「已取消」，Layer 2 快照欄位零觸碰） |
| 2 | **前端徽章 bug**：`buildTab()` 從未賦值 `marginChange`/`aovChange`（vs上期徽章恆 N/A）；orders 徽章 `isInt=true` 吞 % 後綴 | ✅ 已修（V42:15247-15248 百分點差配 'pp' + pct() 配 %；V42:13930）；current.html 待 /upload-web 升格同步 |
| 3 | **RPC 死過濾器**：`get_financial_kpis`（15處）/`get_financial_charts`（5處）狀態過濾全部寫 `process_status::TEXT NOT IN ('cancelled', 'refunded')`，但 enum `order_status` 實際值係中文（待確認/製作中/完成/已取件/已取消）→ **過濾器從未生效，取消單一直計入財務 KPI** | ✅ 已修（Fat Mo 已批准，migration `fix_financial_rpc_status_filter_enum_mismatch` 已套用，20處替換 `NOT IN ('已取消')`；驗證 RPC 實跑=獨立SQL 對數分毫不差：monthly $29,570、yearly $156,120） |

**已裁決並執行**：
- 0600106（$5,680 未確認真單）Fat Mo 決定維持「待確認」唔郁，現正確排除喺兩個 RPC 財務統計之外，日後人手 confirm 先計入。
- kpis 計未確認單 vs charts 唔計嘅口徑不一致——Fat Mo 裁決「kpis 統一收緊唔計未確認單」，migration `unify_financial_kpis_charts_unconfirmed_orders_scope` 已套用（移除 kpis current 期 4 處 `OR confirmed_at IS NULL`），驗證 kpis yearly revenue = charts trend 加總 = $150,440 分毫不差。
- V42 前端三處修復已走 `/upload-web` 升格部署至 `current.html`，三關驗證PASS，正式上線生產。

事故全案至此結案，最終 monthly revenue（真實已確認）= $23,890，yearly = $150,440。

**審計陷阱（未來 session 注意）**：驗證 orders 狀態過濾嘅 SQL 唔可以照抄 RPC 源碼嘅英文字面值（會複製死碼得出假結論）；一律先 `SELECT unnest(enum_range(NULL::order_status))` 查實際 enum 值。

---

### 10.14 Financial Overview 前端有兩套並存實作 + `get_financial_overview_full` 整合 RPC（D43續完成，2026-07-22）

**架構澄清（易誤判陷阱）**：Dashboard「💰 財務」Financial Overview 面板實際有**兩條獨立資料路徑**，唔係只得 n8n webhook 一條：

1. **前端直呼 Supabase**（`sbFetchFinancial()`，`current.html`/`V42.html` ~line 15186，"V41 Supabase Read Layer"）——`localStorage.fhs_supabase_read` 預設自動設 `'1'`（見 line 5441-5442），**呢條先係實際生效路徑**。前端直接 12 個 `sbRpc()` 呼叫（`get_financial_kpis` × 9 + `get_financial_charts` × 3，涵蓋 3 個 tab_mode × 3 個 category）組裝出 `groups`/`barChart`/`pieChart`/`breakdown` 形狀。
2. **n8n webhook**（`fetchFinancialOverview()` / `FINANCIAL_WEBHOOK_URL`，n8n workflow `FHS_Financial_Overview` `uQKtGDupMBnSygr3`）——僅當 `isSupabaseRead()===false` 或路徑 1 呼叫失敗時 fallback 使用。

**bug 歷史（D43續完成）**：路徑 1 嘅 12 個呼叫入面，4 個原本用嚟組「Current 分頁」嘅呼叫寫死 `tab_mode:'yearly'`（同「Yearly 分頁」完全一樣），令 Current/Yearly 兩個分頁顯示相同數字。已修正為 `tab_mode:'current'`，令三個分頁對齊本節 §10.1 定義（current=本月迄今 vs 去年同期／monthly=本月完整 vs 上月／yearly=本年迄今 vs 去年同期）。

**新增**：路徑 2（n8n fallback）原本嘅 `Financial Aggregator` Code node 係一套獨立 JS 聚合邏輯（直接 `SUM()` 冇任何 3-layer 邏輯，`groups` 分類鍵完全唔存在），已改為呼叫新建 RPC `get_financial_overview_full(ref_date)`（migration `0061_get_financial_overview_full.sql`）——組合現有 `get_financial_kpis`/`get_financial_charts`（call 9 次 kpis + 3 次 charts，SQL 內部完成），一次回傳前端要嘅完整 `{current,monthly,yearly}×{groups,lineChart,barChart,pieChart,breakdown,data_quality}` 形狀，零重複 3-layer 邏輯。

**教訓（診斷紀律）**：分析呢類「畫面數字錯」bug，必須先用 browser 讀 `window.FO_LIVE_DATA._source` 確認邊條路徑真正生效，唔可以單靠 grep/讀碼假設「n8n workflow 就係入口」——本次事故最初深入分析咗路徑 2（已經係 fallback dead path），量化埋一份錯誤方向嘅偏差報告，後期 browser 實測先發現路徑 1 先係真正影響用戶畫面嗰條。詳見 `decisions.md`「D43續完成」條目、`.fhs/reports/planning/2026-07-22_financial-overview-3layer-gap-analysis.md`（已加更正註記）。

### 10.15 兩條路徑統一資料來源（D43續二，2026-07-22）

**歷史根因**（Fat Mo 追問後查證，`git log -S`）：§10.14 描述嘅「兩條並存路徑」源自 2026-05-10 `Supabase Phase 3`（`.fhs/reports/completion/2026-05-10_supabase-phase-3_completion_report.md`）——經典 strangler-fig 漸進遷移設計：Flag ON 直查 Supabase、Flag OFF/失敗 fallback n8n webhook（嗰陣仲查緊 Airtable），計劃本身寫明 Phase 4「雙系統穩定共存確認」，即雙軌設計上就係過渡態，非刻意永久保留嘅架構。同 `/8d`（八維度分析）無關。D43（2026-07-22 全面剝離 Airtable）令當初分裂嘅理由消失——路徑 2（n8n fallback）而家都係查 Supabase，同路徑 1 底層資料源已一致，剩底純粹係「shape 組裝邏輯喺兩處各自維護」嘅歷史遺留。

**統一**：路徑 1 前端 `sbFetchFinancial()` 由 ~130 行（12 個並行 RPC call + client-side `buildTab()`/`buildChartData()` 組裝）簡化為 5 行，直接 `sbRpc('get_financial_overview_full', {ref_date})` 一次攞完整形狀，同路徑 2（n8n fallback）call 同一個 SQL function。Migration `0062_financial_overview_full_parity_fields.sql` 補齊咗 `fhs_build_financial_overview_tab()` 原本缺少嘅 3 個前端衍生欄位（`marginChange`/`aovChange`/`isNewBusiness`，`isNewBusiness` 語義＝冇上期數據時前端顯示「—」而非誤導性 0%）+ `groups.*.orders_inclusive`，逐字對齊原 JS 語義（新增 helper `fhs_pct_or_null()`，同 `fhs_pct()` 分別在於 prev 為 0/null 時回傳 null 而非 0）。

**現狀**：兩條路徑（前端直呼 + n8n fallback）現時都係呼叫同一個 `get_financial_overview_full(ref_date)` RPC，唯一差別係「邊個發起呼叫」（browser fetch vs n8n code node），shape 組裝邏輯零重複，單一 SQL 來源。日後任何 3-layer/tab_mode/欄位邏輯改動，只需要改 `fhs_build_financial_overview_tab()` 一處。

### 10.16 `v_delivery_reminders` 遺漏 `is_archived` 過濾修復（S187續XIII，2026-07-22）

**問題**：手機版「交貨期進度」統計卡（V42 line ~9234 `renderDeliveryStatsCard`）直接讀 `v_delivery_reminders` view（migrations 0032/0033），顯示已完成訂單為逾期（33筆入面16筆 `is_archived=true` 誤判逾期，部分逾期300+天）。

**根因（同 §10.9 對照即現形的職責缺口）**：§10.9 記錄嘅 `_fhsArchivedIds` 前端守衛，只覆蓋「訂單總覽」逐行 badge（`mapOrder`/dlv badge 隱藏，V42 line 8362/8366），**從未覆蓋**「交貨期進度」統計卡——呢張卡係獨立走 `fetchDeliveryMap()` 直接 fetch `v_delivery_reminders` view，唔經過 `mapOrder`/`_fhsArchivedIds` 那條前端管線。而 view 本身（DB 層）從未引用 `orders.is_archived`（§10.8 `fhs_complete_order` 寫入嘅權威完成旗標），只靠兩個字面值過濾器且皆已失效：
- Order 層 `process_status NOT IN ('完成','已取件','已取消')`——生產數據 `process_status` 全庫只出現「待確認」/「製作中」，從未見過該三值（`fhs_complete_order` 寫入嘅係 `'Done 已完成'`，同呢三個字面值都唔匹配）
- Item 層 `process_status NOT IN ('完成','已取件')`——品項真實「完成」字面值主要係 `'Done 已完成'`（41筆，佔多數）同舊制 `'完成'`（26筆）並存，過濾器只揪到後者

**修復**：migration `0063_delivery_reminders_is_archived_fix.sql`——view WHERE 子句加 `AND o.is_archived IS NOT TRUE` 做主要（權威）過濾，item 層過濾字面值集擴充為 `('完成','已取件','Done 已完成','待交收')` 做雙重保險；smoke test 新增 archived-leak 計數檢查。

**教訓**：同一個「已完成」語義，DB 層（`orders.is_archived`）同前端顯示層（`_fhsArchivedIds` Set）如果分別各自實作過濾守衛，好容易漏一處——新增任何讀取訂單狀態嘅 view/查詢時，必須確認有冇引用 `is_archived`，唔可以淨係複製舊 `process_status` 字面值比對邏輯（尤其該邏輯本身已經係 dead filter，字面值同生產真實值長期不匹配都冇人發現）。

---

### 10.17 「訂單數」KPI 卡細項語意修正：訂單計數 → 品項數量（2026-07-22）

**問題**：Fat Mo 回報財務總覽「訂單數」KPI 卡三行細項（手模擺設/頸鏈吊飾/鎖匙扣）顯示單位「單」，實際應以「件」（品項數量）呈現；頂層「訂單數」大數字本身沿用訂單號計算，不受影響。

**根因**：`get_financial_charts()`（§10.1 表列）`category_revenue` 內 `handmodel_orders`/`keychain_orders`/`necklace_orders` 三個欄位一直是 `COUNT(CASE WHEN xxx_cost > 0 THEN 1 END)`——數「有此分類成本的訂單數」，語意上長期是訂單計數，同「件」單位標籤不符。例：2 張鎖匙扣訂單各含 4 件 → 舊值顯示 2 單，應顯示 8 件。

**修復**：migration `0064_financial_charts_category_qty_breakdown.sql`——三個欄位改為 `COALESCE(SUM(oi.quantity), 0)`（`order_items.quantity` 按分類 `item_category` 篩選加總），key 名稱維持不變（下游 `get_financial_overview_full()` §10.14 `breakdown.orders` 陣列沿用同一組 key，零改動）；前端 `sbFetchFinancial()` breakdown render（V42 line ~14071）unit label 由「單」改「件」。Browser 實測 Current（鎖匙扣 2→8件）+ Yearly（33/15/88件）兩個分頁皆正確，`get_financial_kpis` 頂層 `orders` 值不受影響（12/41 不變）。

**教訓**：KPI 卡片細項欄位命名（`xxx_orders`）同其實際顯示單位（單位標籤寫死喺前端 render 迴圈，唔隨後端欄位改名）可以長期脫鉤而不被發現——改動任何 breakdown 欄位語意前，須同時檢查前端 unit 格式化邏輯是否隨之更新。

---

### 10.18 Migration Repo/DB Drift 導致 `get_financial_charts()` 回歸事故 + hotfix（2026-07-22）

**問題**：§10.17 的 `0064` 改動套用後，交叉核對 `get_financial_kpis`（未觸碰）現行定義時發現同 `get_financial_charts`（`0064` 剛重建）不一致：前者用 `process_status::TEXT NOT IN ('已取消')`，後者卻是 `NOT IN ('cancelled', 'refunded')`（英文死碼，同中文 enum 永不匹配，見 `project_financial_rpc_status_filter_bug.md`）。

**根因**：`0064` 以 repo 內 `0041_fix_unconfirmed_doublecount_and_trend_3layer.sql`（2026-06-12）全文為底本重建 `get_financial_charts()`。但 2026-07-17 線上已套用嘅 `fix_financial_rpc_status_filter_enum_mismatch` migration（`list_migrations` 版本 `20260717121508`）只存在於 Supabase migration history，**從未以 `.sql` 檔形式落 repo**——repo 檔案同 live DB 之間存在未被發現的 drift。`0064` 嘅 `CREATE OR REPLACE FUNCTION` 全量覆蓋，令 5 處已修復嘅 `已取消` 過濾器打回英文死碼，靜默令「已取消」訂單重新計入 `category_revenue`/`cost_breakdown`/`trend` 嘅收入/成本/毛利數字（頂層「訂單數」由 `get_financial_kpis` 計算，不受影響）。

**修復**：`0065_hotfix_revert_charts_status_filter_regression.sql`——僅將 5 處字面值改回 `已取消`，`0064` 嘅品項數量改動原樣保留；smoke test 用 `pg_get_functiondef(...) NOT LIKE '%cancelled%'` 斷言死碼不再存在。

**教訓**：透過 Supabase MCP `apply_migration` 套用嘅修復，若冇同時 `Write` 對應 `.sql` 檔落 `supabase/migrations/`，repo 就會漏收，形成 live DB 領先 repo 嘅隱形 drift；下一次任何人以「repo 內最後一個同名函式 migration」為底本做 `CREATE OR REPLACE` 全量重建時，就會把 repo 冇收錄嘅修復全部打回。**改動任何 RPC 前，應先用 `pg_get_functiondef(oid)` 核對 live 定義同 repo 最新檔案是否一致**，不能假設 repo 檔案就是真源。全文見 lesson `2026-07-22_migration-repo-db-drift-create-or-replace-regression.md`。

---

### 10.19 財務 RPC「期間歸屬」日期口徑統一：confirmed_at → LEAST(confirmed_at, appointment_at)（2026-07-23）

**問題**：訂單總覽「全部」筆數同財務 Yearly「訂單數」長期對不齊（44 vs 41，更新單一訂單後變 40 vs 41）。追查發現訂單總覽前端一直用「約定日期（`appointment_at`）優先，冇約定日期先用確認日期（`confirmed_at`）」判斷年度歸屬，財務 RPC（`get_financial_kpis`/`get_financial_charts`）卻純用 `confirmed_at`——兩套系統各自用唔同日期欄位定義「期間」。

**Fat Mo 裁決**：統一口徑，且明確規則為「確認日期新過約定日期 → 用約定日期；約定日期新過確認日期 → 用確認日期」，即取兩者**較早者**（`LEAST`），任一方 NULL 用另一方，兩者皆 NULL（純草稿單）排除。

**實作前發現的技術陷阱（已避開）**：若直接改用「純 appointment_at 優先」（唔取較早者），會令**最近先確認、但約定日期未到（未來）**嘅訂單，因 Current/Yearly 分頁「迄今」語義（`cur_end = 今天`）而被誤判跌出本期收入——appointment_at 係未來日期 > cur_end，令剛成交嘅真實收入消失（模擬實測抓到 4 張本週剛確認嘅單會因此消失）。改用 `LEAST(confirmed_at, appointment_at)` 後：近期確認、未來約定嘅單改用較早嘅 `confirmed_at` 歸屬（不受影響）；只有「`confirmed_at` 遲過 `appointment_at`」嘅 Airtable→Supabase 遷移時序落差歷史單，先會改用較早嘅 `appointment_at` 歸屬去正確年份。

**修復**：`supabase/migrations/0066_financial_period_earliest_date_unification.sql`——`get_financial_kpis()`／`get_financial_charts()` 全部 20 處期間篩選（current/previous 兩期、trend 月度分組、orders_inclusive、metal_qty/handmodel_qty、data_quality）由 `confirmed_at BETWEEN cur_start AND cur_end` 改為 `LEAST(confirmed_at, appointment_at) BETWEEN cur_start AND cur_end`；改動前先用 `pg_get_functiondef()` 核對 live 定義為底本（避開 §10.18 同類 drift 陷阱）。

**驗證**：獨立 SQL 模擬預測（40單／$155,380／$27,001）同套用後 RPC 直查完全吻合；itemized diff 確認僅 3 張單移動符合預期；browser 實測訂單總覽（全部＋2026）＝財務 Yearly「訂單數」＝40，兩邊對齊，無 console 錯誤。

**教訓**：業務規則統一口徑類改動，必須連 edge case（未來日期 vs「迄今」上限截斷）一併模擬驗證，唔可以只字面套用指令就直接改 SQL——直接套用「appointment_at 純優先」呢個看似合理嘅字面指令，會製造新 bug（少計近期真實成交）。

---

### 10.20 財務總覽「訂單數」KPI 卡「手模擺設」細項再拆木框／玻璃瓶（2026-07-23）

**問題**：Fat Mo 要求「訂單數」卡（唯獨呢張，收入/成本/毛利三卡「手模擺設」維持合併不變）的「手模擺設」細項再拆為「木框」及「玻璃瓶」兩行。

**資料品質陷阱（已避開）**：純用 `product_sku ILIKE '%木框%'/'%玻璃瓶%'` 比對會少計 2 件（Yearly 實測 23+7=30 vs 真實總數 32）——漏咗嗰 2 件係已知 avg_split fallback 訂單（0500719/0600722），`product_sku` 為 NULL 但 `specification` 正確寫住「木框款式」。改用 product_sku 為主、NULL 時 fallback 讀 specification，令 25+7=32 完全吻合。

**修復**：`supabase/migrations/0067_handmodel_orders_frame_bottle_split.sql`——`get_financial_charts()` 新增 `handmodel_frame_orders`/`handmodel_bottle_orders`（品項數量，手法同 §10.17 的 0064）；`fhs_build_financial_overview_tab()` breakdown.all／handmodel 新增 `ordersLabels`（僅 orders metric 用 4 行標籤，revenue/cost/profit 仍用 3 行 `labels`）；前端渲染迴圈 'orders' metric 優先讀 `bkd.ordersLabels`。

**驗證**：RPC 直查 `orders:[25,7,15,92]` 吻合；browser 實測 Current/Yearly/手模擺設分類篩選三情境全部正確，revenue/cost/profit 三卡不受影響；production 部署後直接驗證正確。

**教訓**：任何以 `product_sku` 做分類統計時，先查有冇 NULL SKU 的 avg_split 舊單（`data_quality.avg_split_ids`），唔可以假設 product_sku 永遠有值——`specification` 欄位係呢類舊單嘅可靠 fallback 分類來源。

---

### 10.21 純鎖匙扣/頸鏈訂單兩連環修復——結單提示漏判 + 警報起算日誤用 appointment_at（D44，2026-07-23）

**問題**：Fat Mo 回報訂單 0600801（純鎖匙扣 x2，無手模擺設）已完成但無「是否結單」提示，且懷疑警報日期起算點有誤。Supabase `execute_sql` 直查 0600801 確認兩個獨立根因。

**根因 1（結單提示漏判）**：`_fhsCheckHmOrderCompletion()`（[freehandsss_dashboardV42.html:5567](../../Freehandsss_Dashboard/freehandsss_dashboardV42.html:5567)）判斷邏輯本身正確（GATED 早於 S161續III 已含鎖匙扣/純銀吊飾），但只在使用者手動改動狀態下拉選單（onchange 事件）時觸發，從無頁面載入/資料刷新時的掃描。0600801 兩品項 `process_status='完成'` 是資料庫既有值（並非透過 V42 下拉選單觸發），故事件永不發生，提示永不彈出——這是「事件驅動 vs 靜態掃描」的架構缺口，不是判斷式寫錯。

**根因 2（警報起算日誤用）**：`v_delivery_reminders` view（migrations 0032/0033/0063）對所有訂單一律用 `COALESCE(appointment_at, created_at)` 當起算日。`appointment_at`（預約手模日期）只對手模擺設訂單有業務意義，鎖匙扣/頸鏈訂單從不需要預約，其 `appointment_at` 屬無意義殘留值。0600801 實測：`appointment_at=2026-02-26` 早於 `created_at=2026-05-10` 達 74 天，令 SLA 起算日大幅提早、訂單被誤判逾期/告警。

**修復**：
- `_fhsCheckHmOrderCompletion` 純判斷邏輯抽成新函式 `window._fhsIsOrderReadyToArchive(orderId)`，供渲染時查詢（非僅 onchange）。訂單總覽 iPhone Accordion 卡片渲染時（[freehandsss_dashboardV42.html:9635](../../Freehandsss_Dashboard/freehandsss_dashboardV42.html:9635)）新增「建議結單」綠色徽章，符合條件但未封存的訂單即時顯示，點擊直接觸發既有 confirm() 結單流程——刻意不做成頁面載入時對大量既有訂單逐一彈 N 個 confirm() 疊加。
- `supabase/migrations/0068_delivery_reminders_start_date_handmodel_only.sql`：新增 `has_handmodel`（`order_items.item_key LIKE '%_P_%'`）判斷，只有訂單內存在手模擺設品項才用 `appointment_at`，否則一律用 `created_at`。

**驗證**：Supabase 直查確認純鎖匙扣/頸鏈訂單（0601100/0600101）修復後 `start_date` 正確改用 `created_at`；smoke test（urgency 合法值 + 無 archived 洩漏）PASS。current.html 因 pre-tool-guard 保護未同步，待走既有部署流程升格。

**教訓**：任何「事件觸發式」偵測邏輯（onchange/onclick）對已存在於資料庫、但從未在本次瀏覽器 session 觸發過對應 UI 動作的資料一律失效——凡涉及「狀態偵測後提示」的功能，設計時須額外考慮「資料已經是目標狀態，但事件從未發生」這個路徑，不能只驗證判斷式本身。

**D44續（同日）：徽章上線即抓到假陽性，`isDone()` 收緊為只信任「Done 已完成」**

上線後 Fat Mo 立即用 0600105 抓到假陽性：該單兩個鎖匙扣品項 `process_status='完成'`，`isDone()` 判定已完成而顯示「建議結單」，但畫面「進度」下拉選單其實顯示「0 什麼都未做」——因為選單選項清單裡從無「完成」呢個字面值可匹配，瀏覽器自動退回顯示第一個選項，令畫面顯示同資料庫真實值不一致。

Fat Mo 裁決完成信號的唯一真理：**鎖匙扣/純銀吊飾＝下拉選單揀「Done 已完成」；木框＝三個 checkbox（已book/已做laser/已做音訊）全踢；玻璃瓶＝兩個 checkbox（已book/已完成）全踢**——木框/玻璃瓶 checkbox 全踢後系統背後同樣寫入字面值「Done 已完成」，三類品項本質上共用同一判斷標準。舊資料殘留嘅字面值「完成」（非經此下拉/checkbox 產生）證實不可靠，不能作為完成信號；`已取件`/`待交收` 屬人手確認過的下游生命週期狀態予以保留。

修復：[freehandsss_dashboardV42.html:5595](../../Freehandsss_Dashboard/freehandsss_dashboardV42.html:5595) `isDone()` 移除對字面值「完成」的信任，只保留 `'Done 已完成' || '已取件' || '待交收'`。全庫掃描確認：改嚴後現存未封存訂單無一符合（含最初回報的 0600801），因為 23 筆殘留「完成」品項都需人手逐一重新於畫面選過正確狀態才能通過嚴格判斷——這是刻意的保守選擇，寧願暫時零徽章都不可再對假陽性狀態亂提示。

**D44續三（同日）：新單品項狀態 NULL 令整單於 `v_delivery_reminders` 完全消失**

Fat Mo 回報 07001006/07001007（剛新開、品項從未被觸碰過）畫面完全無任何交貨期徽章（連綠色「正常」都無）。查證：`v_delivery_reminders` 品項層「未完成」過濾用 `oi2.process_status NOT IN ('完成','已取件','Done 已完成','待交收')`——SQL 的 `NULL NOT IN (...)` 結果係 UNKNOWN（非 TRUE），故品項 `process_status` 為 NULL 嘅訂單，EXISTS 子查詢完全唔命中，WHERE 子句 OR 兩個分支都失敗，整張訂單於 view 消失。全庫掃出 6 張現存訂單中招（07001006/07001007/07001009/070010010/0600037/一張未命名測試單），全部係品項狀態未觸碰過嘅新單。

修復：`supabase/migrations/0069_delivery_reminders_null_status_fix.sql`——item-level 過濾加 `oi2.process_status IS NULL OR oi2.process_status NOT IN (...)`，明確將 NULL 視為「未完成」。驗證：修復後 07001006/07001007 正確顯示 `urgency='normal'`、`days_remaining` 81/82 天；smoke test 新增 `v_null_missing` 檢查（NULL 狀態訂單仍缺席即拋錯）PASS。

**D44續四（同日）：手模擺設訂單未到取模日期前不顯示 SLA 倒數，改顯示「未到取模日期」提示**

Fat Mo 確認 0600037（木框，appointment_at=2026-07-27，尚未到）正確顯示「正常剩94天」（SLA 起算日邏輯本身無錯），但提出：取模預約日期未到之前，訂單根本未開始生產，不應該顯示緊一個「已經開始跑鐘」嘅倒數——應該像「建議結單」同一手法，顯示一個獨立提示。

修復：純前端判斷（[freehandsss_dashboardV42.html:9639](../../Freehandsss_Dashboard/freehandsss_dashboardV42.html:9639)），訂單總覽 Accordion 卡片渲染時，若訂單有立體擺設品項（`_catFlagsM.hasA`）且 `o.Appointment_Date` 仍在未來，優先顯示藍色「未到取模日期（X天後）」徽章，蓋過原本會顯示嘅正常 SLA 倒數；取模日一過即自動回復正常倒數。冇改 Supabase view（`v_delivery_reminders` 嘅 SLA 起算日邏輯本身正確，只係呢個情況下前端唔應該顯示緊倒數畫面）。

**教訓 3**：SQL 的 `col NOT IN (...)` 對 `col IS NULL` 永遠回傳 UNKNOWN 而非 TRUE——任何「未完成/未觸碰」過濾條件如果用 `NOT IN` 排除已完成清單，必須明確加 `OR col IS NULL`，否則 NULL（通常代表「從未設定」，語意上最應該落入「未完成」分支）會被兩個分支一齊漏走，屬於 SQL NULL 三值邏輯嘅經典陷阱，與字串內容是否正確無關。

**教訓 2**：舊系統遺留的字面值 ENUM（如「完成」vs「Done 已完成」）即使語意相近，也不能假設等價——同一字面值可能在不同訂單代表完全不同的真實狀態（0600801「完成」= 真完成，0600105「完成」= 未開始），已證實為不可靠的污染/殘留資料，任何完成判斷邏輯只能信任「當前 UI 唯一產出路徑」會寫入的字面值，不能信任歷史匯入或舊版系統留下的近義字串。

**D44續二（同日）：Fat Mo 授權批次歸零全部殘留「完成」資料，改由人手逐張重新核實**

`isDone()` 收緊後，全庫掃出 23 筆殘留字面值「完成」（12 張未封存訂單），既無法信任亦無法逐一自動判斷真偽。Fat Mo 明確授權批次改寫為各自類別的「未開始」初始值（非刪除、非猜測真實進度）：金屬鎖匙扣/純銀頸鏈吊飾（20 筆）→ `0 什麼都未做`；立體擺設（3 筆：06001007/0600718/0600721）→ `待製作`（此類走 checkbox 模式，「0 什麼都未做」不在其選項清單內，正確初始值為「待製作」）。執行後 `remaining_stale=0`，全庫已無殘留「完成」字面值。受影響訂單：0600101/0600105/0600106/0600107/0600718/0600721/0600723/0600809/0600903/0600905/0600908/0650429/06001007。後續由 Fat Mo 逐張在畫面重新核實並選擇正確進度。

---

*本文件由 Session 60 建立。下次改動任何上述層次時，請同步更新對應章節。*
*§十 由 Session 99 補入（2026-06-12）。§10.8–10.9 由 Session 104 補入（2026-06-15）。§10.10 由 Session 105 補入（2026-06-16）。§10.11 由 Session 130b 補入（2026-07-01）。§10.12 由 Session 150 補入（2026-07-07）。§10.13 由 2026-07-17 財務審計 session 補入。§10.14 由 D43續完成 session 補入（2026-07-22）。§10.15 由 D43續二 session 補入（2026-07-22）。§10.16 由 S187續XIII session 補入（2026-07-22）。§10.17 由 2026-07-22 訂單數細項單位修復 session 補入。§10.18 由 2026-07-22 migration drift 回歸修復 session 補入。§10.19 由 2026-07-23 期間歸屬日期口徑統一 session 補入。§10.20 由 2026-07-23 手模擺設木框/玻璃瓶拆分 session 補入。§10.21 由 2026-07-23 D44 純鎖匙扣/頸鏈兩連環修復 session 補入。§十一 由 Session 119 補入（2026-06-23）。*

---

## 十一、IG 看門狗警報整合（Session 119，2026-06-23）

### 11.1 資料流向（單向）

```
IG Drive Export
   ↓ n8n workflow D4LK6VrQbiXlju0V（Cron 06:00 HKT）
   ↓ Classify & Report 節點（cr1）
   ↓  種類：not_created / created_incomplete（通知+寫入）｜created_full → verified_ok（S150 Phase 4 起僅寫入不通知，見 §11.6）
   ↓  P2a 起：同時輸出 messages 陣列（所有新訊息，不分類別，見 §11.7）
   ↓  P2b 起：同時輸出 mismatches 陣列（金額比對疑似不符，見 §11.8）+ alerts 陣列
   ↓          追加 kind='content_mismatch' 鏡像列（複用 Write Alerts，非新開寫入路徑）
   ↓
   ├─ Has Alerts?（IF守衛：alerts.length > 0）
   │    true  → Write Alerts HTTP POST → ig_watchdog_alerts INSERT（service_role key，冪等）→ Telegram Notify (Data)
   │    false → Telegram Notify (Data)（直接發摘要，跳過空陣列寫入）
   │
   ├─ Has Messages?（IF守衛：messages.length > 0，P2a 新增，與 Has Alerts? 平行，不阻塞既有分支）
   │    true  → Write Messages HTTP POST → ig_messages INSERT（service_role key，content 已 redactPii() 遮罩）
   │    false → 終止（無下游節點）
   │
   └─ Has Mismatches?（IF守衛：mismatches.length > 0，P2b 新增，與上兩者平行）
        true  → Write Mismatches HTTP POST → content_mismatch INSERT（service_role key，比對證據明細）
        false → 終止（無下游節點）

V42 igwatch 模式（anon SELECT）← ig_watchdog_alerts
V42 igwatch 模式（anon RPC）  → fhs_resolve_ig_alert（resolved 回寫）
```

### 11.2 ig_watchdog_alerts 表設計

| 欄位 | 說明 |
|------|------|
| `id` | UUID 主鍵 |
| `alert_date` | Cron 跑日（匯出覆蓋日）|
| `order_id` | FHS 訂單編號字串（**非 UUID**），NULL = 弱訊號/無訂號 |
| `kind` | `not_created` / `created_incomplete` / `verified_ok`（CHECK 約束，S150 Phase 4 起三值；`resolved` 對 verified_ok 恆為 true，見 §11.6）|
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
| kind-aware 動作 | `created_incomplete` → `openOrderModal()`；`not_created` → `_igwCopyOrderId()`（禁用 openOrderModal，訂單不在 DB，靜默失敗）；`verified_ok` → 無動作按鈕（純展示，resolved 恆 true 天然排除於待處理）|
| kindLabel/kindColor | `not_created`=🆕未建立/紅｜`created_incomplete`=📝資訊不齊/橙｜`verified_ok`=✓已核對/綠（S150 Phase 4，`_renderIgWatchList` 約 L13965-13966）|
| Resolve 回寫 | `_igwToggleResolve()` → `sbRpc('fhs_resolve_ig_alert', ...)` + 樂觀更新 |
| URL 深連結 | `?view=igwatch[&orderId=xxx]`，window.onload 解析 |

> ⚠️ **S150 F1 修復（2026-07-07）**：三顆按鈕（開訂單/複製訂號/標記已處理）onclick 屬性曾全數失效——`JSON.stringify(r.order_id)` 產生的雙引號字串字面值，被直接嵌入同樣用雙引號包裹的 `onclick="..."` 屬性中，瀏覽器解析屬性時在第一個內嵌雙引號處提前截斷，整組 HTML 屬性斷裂。修法：改手動包單引號（`'\'' + r.order_id + '\''`），前提是 order_id/alert id 只含英數+連字號（見 `scripts/ig-watchdog/lib/order-match.mjs` `normalizeOrderId()`），無需 HTML escape。**教訓（通用 pattern）**：`JSON.stringify()` 產生的雙引號字串，不可直接嵌入同樣用雙引號分隔的 HTML 屬性——字串分隔符必須與外層屬性分隔符不同。同批加上 `_igwCopyOrderId()` 的 `execCommand('copy')` textarea fallback（含 1.5s 逾時保護，防 `navigator.clipboard` 權限 pending 永久卡住）。詳見 `.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md` §4.2。

### 11.5 Phase 狀態

| Phase | 內容 | 狀態 |
|-------|------|------|
| 1a | Migration 0043（表 + RPC + RLS）| ✅ 已部署 |
| 2 | V42 igwatch 模式 | ✅ 已上線 |
| 1b | n8n write node（HTTP Request → ig_watchdog_alerts）| ✅ 已驗收（S125）Exec 4034（2026-06-29 06:00 HKT）17/17節點全通過；OAuth 根因=Google Cloud OAuth app 處於 Testing 模式（refresh token 7天失效）→ 已發布為 Production；versionId=1a2632e1 |
| 3 | Telegram 訊息附 V42 deep-link URL | ✅ 已完成（S125）；S128 修復 emoji surrogate bug（🔗→`>`，ensure_ascii=True）；versionId=bb683165 |

### 11.6 S150 Phase 4-6：verified_ok 正向記錄 + orders anon 權限收斂（2026-07-12）

**背景**：S150 全面審視計畫（[implementation plan](../reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md) §4.5-§4.7）Phase 1-3 已於 2026-07-07 完成止血；Phase 4-6 因排隊等 S148/S149 完成，延至 2026-07-12 由 Fat Mo 核准後接續執行。

**Phase 4（P1a）— created_full 正向記錄**：
- Migration `0050_ig_watchdog_verified_ok_check.sql`：`ig_watchdog_alerts.kind` CHECK 從二值（`not_created`/`created_incomplete`）擴充為三值，新增 `verified_ok`。
- `scripts/ig-watchdog/build_n8n_workflow.cjs`（`classifyCode`，Classify & Report 節點 `cr1`）：新增 `verifiedItems` 收集 `cls.category==='created_full'` 的訊息，映射為 `kind:'verified_ok', resolved:true` 寫入 `alerts` 陣列，與既有 `notifyItems`（`created_incomplete`/`not_created`）並列但**不**進入 `notifyItems`——因此不進「需核對」計數，也不出現在 `telegramText`（TG 深連結 filter 只挑後兩類，維持零改動）。已用 curl 4 欄位（`name/nodes/connections/settings`）PUT 部署至 live n8n workflow `D4LK6VrQbiXlju0V`，versionId `05740bb4...`→`4a125f6b-a37c-46b0-a5b6-c7f8d14223d9`。
- V42 UI（`_renderIgWatchList`，L13965-13966）：`kindLabel`/`kindColor` 補上 `verified_ok` → 綠色「✓ 已核對」。「待處理」計數 filter（`!r.resolved`）本身零改動，因 verified_ok 寫入時 `resolved` 已為 true，天然被既有邏輯排除。
- **冪等保證**：既有 `ix_igwatch_alerts_dedup` UNIQUE INDEX `(alert_date, thread, COALESCE(order_id,''), kind)` 對 `kind` 值無特化，`verified_ok` 自動受同一去重機制保護，配合 PostgREST `Prefer: resolution=ignore-duplicates`，同一 Cron 日重跑同一 thread 不會產生重複列。
- **已知限制**：n8n Public API 對 Schedule-Trigger workflow 無手動觸發端點（`POST /workflows/{id}/run` 回 405），故本次以本地 Node 模擬（`new Function` 包 mock `$()` 執行抽出的 jsCode）驗證邏輯，真正 live cron 端到端驗證留待下次排程（`0 6 * * *` HKT，即 2026-07-12T22:00Z 後）自然發生，可用 `get_execution_log` 或直接查 `ig_watchdog_alerts WHERE kind='verified_ok'` 覆核首批寫入。

**Phase 5（P1b）— orders anon 權限收斂**：
- Migration `0051_orders_anon_policy_cleanup.sql`：原計畫刪除 `orders_anon_delete`（判斷為「未使用」）+ 刪除重複的 `anon_update_orders`（與 `orders_anon_update` 逐字等價，保留後者）。
- **⚠️ 事故與修正**：`orders_anon_delete` 判斷錯誤——Dashboard `executeDeleteOrder()`（L11515-11525，綁定 `#confirmDeleteBtn`）實際會以 anon key 對 `orders` 發 DELETE（"Supabase hard delete (primary)"）。原始 grep 稽核用單行 pattern 未命中，因為 `method:'DELETE'` 與 URL 分處不同行。政策移除後，該請求因 table 級 GRANT 仍在、但 RLS 無 permissive DELETE 政策而濾空 0 rows，仍回 **HTTP 200**（非 403），前端 `if (!sbDelRes.ok)` 判斷不到，UI 彈出「已成功刪除」但訂單實際未刪——靜默失敗。由 fresh-context code-reviewer(opus) 於同一 session 內抓出，即時以 `0052_restore_orders_anon_delete.sql` 回滾該政策。影響窗口 2026-07-12 約 12:34–12:41 UTC（~7 分鐘），經核實無真實訂單資料受影響（低流量內部後台工具，且失效模式是「刪不掉」而非「誤刪」）。
- 最終生效狀態：`orders_anon_delete` 保留（原樣）；`anon_update_orders` 刪除，只留 `orders_anon_update`（UPDATE 去重部分判斷正確，經 fresh-context 二次核實 PASS）。
- **教訓（見 lessons/INDEX.md 2026-07-12 條目）**：稽核「前端是否呼叫某端點」不能用單行 grep pattern 判斷不存在；HTTP method 與 URL 常因程式碼風格分行，且 anon-key 對有 RLS 保護表的寫入操作，權限不足時常「表面 2xx、實際 0 rows」而非顯式 403/404，兩者組合會讓移除政策的回歸長期潛伏不被發現。

**Phase 6 — 制度收尾**：本節（§11.6）即落盤項之一；另見 `decisions.md`、`Changelog.md`、`.fhs/memory/lessons/INDEX.md` 對應條目、`.fhs/memory/handoff.md` 便攜塊更新。

### 11.7 P2a：IG 訊息入庫 + PII 明文剝離（Session 171，2026-07-13）

**背景**：S150 §4.8 明文剝離出去的獨立架構域（訊息入庫+內容比對+意圖標註+回覆範本庫+PII 政策），透過獨立 `/cl-flow`（flow_id `2026-07-13-1224`）規劃，分三期 P2a/P2b/P2c 分次執行。本節記錄已完成的 P2a。**此變更使「IG 看門狗全程唯讀不寫入客人 DM 內容」的舊敘述（原見 `scripts/README.md`，已同步訂正）不再成立**——P2a 起會把每則新訊息（遮罩後）持久化至 `ig_messages`。

**ig_messages 表設計**（Migration `0053_create_ig_messages_table.sql`）：

| 欄位 | 說明 |
|------|------|
| `id` | UUID 主鍵 |
| `ig_message_id` | 冪等鍵組成之一，`hashId(thread+'\|'+ts+'\|'+sender)` 雜湊值（cyrb53 純 JS 算術，非明文組合字串）|
| `thread` | IG thread 資料夾名稱（明文，結構性 join key，比照 §11.2 `ig_watchdog_alerts.thread` 既有先例，非本次新增缺口）|
| `sender_is_business` | 是否商家自發（輕量 includes 判斷，與 `parseInboxCode` 的 `isBusiness()` 各自獨立實作但驗證同一字串集，非單一真源違規——僅屬雙處輕量重複）|
| `customer_name` | `maskName()` 遮罩後（只留每詞首字，如 `Katrina Sui`→`K****** S**`），非明文 |
| `content` | `redactPii()` 遮罩後訊息文字（電話/IG handle/地址門牌/付款尾碼），**嚴禁存未遮罩明文** |
| `pii_policy_applied` | 遮罩策略版本字串（現行 `regex_v1`）|
| `has_receipt` | photo metadata 收據布林（同 `ig_watchdog_alerts` 語義）|
| `order_id` | `extractOrderIds()` 抽得訂號，NULL=無可信訂號（非 FK，訂號可能查無對應 order，同 §11.2 設計）|
| `sent_at` | 訊息原始時間戳轉換 |

**冪等鍵**：`UNIQUE INDEX ix_ig_messages_dedup (thread, ig_message_id)`；`Write Messages` 節點 POST URL 帶 `?on_conflict=thread,ig_message_id`，確保 PostgREST UPSERT 仲裁鍵真的落在此索引（而非預設落空的 PRIMARY KEY）。

**RLS**：anon SELECT 只讀；無 anon INSERT（防偽造）；service_role bypass（n8n 寫入用）；90 天 TTL pg_cron 清理（`delete-old-ig-messages`）。

**PII 明文剝離函式**（`lib/order-match.mjs`，單一真源，diff-guard 測試保護）：
- `redactPii(text)`：regex best-effort，非 NER。遮罩電話（含分隔符/852國碼/新版7x-9x開頭）、IG handle、地址門牌（同時吃「數字在前」與「數字在後」語序）、付款尾碼。刻意不動訂號與短金額數字，保留 P2b 內容比對層所需訊號。
- `maskName(name)`：姓名遮罩，只留每詞首字元。
- `hashId(str)`：cyrb53 純 JS 算術雜湊（避開 n8n Code 節點 `require('crypto')` 靜默失敗的已知地雷，見 `.fhs/memory/learnings.md` 對應條目），供冪等鍵去識別化，非安全用途。

**驗收方法**：`node --test order-match.test.mjs`（27/27，含 fresh-context review 抓出的 F2 繞過樣本回歸測試）+ diff-guard 逐字嵌入確認 + mock-execution harness（對已部署 jsCode 跑合成資料斷言）+ 兩次 live PUT 後 GET 核對 + fresh-context opus 獨立審查（PASS-WITH-CONCERNS，4 項發現 3 項即時修復，詳見 `decisions.md` D31）。真實 cron 端到端資料流證據留待下次自然排程（約 2026-07-13T22:00Z 後）覆核。

**已知未解決**：既有 `Write Alerts` 節點（§11.1，Session 119 建立）同樣缺 `on_conflict` 參數，非本次 P2a 範圍未修，已 spawn_task 追蹤（`task_e3a60daa`）。

**下一步**：P2b（內容比對層，`content_mismatch` 表）/ P2c（意圖標註+回覆範本庫）依 Verdict `artifacts/2026-07-13-1224/cl-final-plan.md` §8 分次執行策略排隊。

### 11.8 P2b：內容比對層——金額比對（Session 171，2026-07-13）

**背景**：P2a 完成後同 session 接續 P2b。v1 誠實收窄範圍：僅做**金額比對**（`amount_mismatch`）；品項比對（`item_mismatch`）需要 `order_items` 明細，現行 n8n「Fetch Orders」節點只攞訂單層欄位（`order_id/customer_name/deposit/final_sale_price/created_at/confirmed_at/full_order_text`），未攞品項——刻意不做假比對，留待未來擴充該節點查詢後才開放。

**比對邏輯**（`lib/order-match.mjs` `compareToOrder(text, orderRecord)`，僅在 `classifyMessage` 已判定 `category=created_full`/`created_incomplete`（即訂號已在 DB 命中）時呼叫，`not_created` 已由既有分類覆蓋不重複比對）：
- 只用 `orderRecord.final_sale_price` 做比對基準，**不 fallback 到 `deposit`**——`created_incomplete` 訂單常 `final_sale_price` 未填，`deposit` 只係全額約一半，用它做基準會令客人提及全額/尾數時系統性誤判（fresh-context opus review F2，2026-07-13 抓出後修正）。冇 `final_sale_price` 就視為資料不足以比對，不觸發。
- 只抓「訊息提及金額明顯高於系統記錄」（`> final_sale_price × 1.1`）——真正的財務風險方向（潛在少收/漏記）；金額低於系統記錄視為正常（可能提及訂金/尾數），不觸發，減少誤報。
- `extractAmountsFromText(text)` 抽取候選金額：先 `toHalfWidth`，範圍限定 10-50000（業務內全部係手模/鎖匙扣/吊飾小額訂單），排除訂號形狀（0開頭7-8位）、付款尾碼（重用 `redactPii` 的 `PAYMENT_TAIL_RE`，單一真源）、**未標記曆年**（1900-2099 形狀數字，如 V42 制式確認文本內嘅取模日期「2026/07/13」的「2026」，除非鄰近 `$`/元/蚊/HKD/港幣 等貨幣標記才當真金額——fresh-context opus review F1 抓出後修正，此前會令幾乎每張低價訂單的 V42 確認訊息都誤判為金額不符，污染 2 週校準期資料）。

**寫入設計**：
- `content_mismatch` 表（migration 0054）：比對證據明細（含具體金額數字），供人工追查。`order_id`/`message_ig_message_id` 皆為軟性參照（非 FK，比照 `ig_watchdog_alerts.order_id` 既有設計）；`message_ig_message_id` 與 P2a `ig_messages.ig_message_id` 用同一 `hashId(thread+ts+sender)` 公式計算，可跨表 join。
- `ig_watchdog_alerts.kind` CHECK 擴充第四值 `content_mismatch`（migration 0055）——**不新開寫入節點**，鏡像列直接併入既有 `alerts` 陣列由既有 `Write Alerts` 節點寫入，複用既有 `fhs_resolve_ig_alert` RPC + V42 UI 工作流；`content_mismatch` 表本身不設 `resolved` 欄位，避免雙軌狀態 drift。
- **Risk mitigation（cl-final-plan §6.5）**：mismatch 鏡像列刻意不進 `notifyItems`，故不進 `telegramText` 深連結、不推高 `summary`「需核對」計數——上線頭 2 週只寫表唔推 Telegram，待人工覆核閾值校準後才考慮接通知。

**V42 UI**（`_renderIgWatchList`，L13965-13998）：`kindLabel`/`kindColor` 新增 `content_mismatch` → 橘色「⚠️ 疑似對不上」；新增「核對金額」action button（`openOrderModal(order_id,'','finance')`，同 `created_incomplete` 按鈕的呼叫模式）；卡片內新增一行顯示 `raw.mm` 內嘅 `ig_reported_amount`/`db_actual_amount`（fresh-context review F5 建議，避免操作員要另開訂單先睇到具體金額差）。此為本次 P2b 唯一觸及 Dashboard HTML 的一步。

**fresh-context opus 獨立審查**（比照 §11.6/§11.7 先例）：PASS-WITH-CONCERNS，5 項發現：F1（曆年誤判，已修復）、F2（deposit fallback 系統性誤報，已修復）、F3（付款尾碼數字誤判，已修復）、F4（既有 `Write Alerts` 缺 `on_conflict` 令同批重複鏡像列可能 23505 打回整批——根因為 P2a 已發現並 spawn_task 追蹤的既有缺陷 `task_e3a60daa`，非 P2b 新增）、F5（金額差未顯示在卡片，已補充修復）。全部可修復項已修復並重新 live 部署 + 重跑 mock-execution harness 確認回歸不再發生。

**驗收方法**：`node --test order-match.test.mjs`（35/35，含 F1/F2/F3 回歸測試）+ diff-guard 逐字嵌入確認 + mock-execution harness（合成資料含 V42 確認文本帶日期的 F1 迴歸場景 + 真實金額不符場景，全過）+ 兩次 live PUT 後 GET 核對（第二次含修復）+ 瀏覽器內注入合成 `content_mismatch` 列驗證 V42 UI 渲染正確（顏色/標籤/按鈕/金額顯示）+ fresh-context opus 獨立審查。真實 cron 端到端資料流證據留待下次自然排程（約 2026-07-13T22:00Z 後）覆核。

**下一步**：P2c（意圖標註+回覆範本庫）依 Verdict §8 分次執行策略排隊。

### 11.9 task_e3a60daa 修復：Write Alerts on_conflict 補記錄（Session 171續II，2026-07-13）

**問題**：§11.7/§11.8 F4 追蹤的既有缺陷——`ig_watchdog_alerts` 舊冪等鍵 `ix_igwatch_alerts_dedup` 是 `COALESCE(order_id,'')` **expression index**（因 `order_id` 可為 NULL）。PostgREST 的 `on_conflict` 查詢參數只接受 plain column 名稱，不支援 expression 作 conflict target；`Write Alerts` 節點 URL 原本無此參數，令 UPSERT 仲裁鍵預設落在 PRIMARY KEY（`id`，body 從不帶，永遠不會撞），真撞到 dedup 鍵時是未處理的 `23505` 把整批 `INSERT` 打回，而非 `Prefer: resolution=ignore-duplicates` 預期的靜默忽略。

**發現**：診斷時查出此問題**已於本 session 稍早、未落文件的情況下被修復**——Supabase 內部 migration 版本 `20260713091833`（name `igwatch_alerts_on_conflict_fix`）已新增具現化欄位 `order_id_key`（`GENERATED ALWAYS AS (COALESCE(order_id,'')) STORED`）+ plain-column 唯一索引 `ix_igwatch_alerts_dedup_v2 (alert_date, thread, order_id_key, kind)` 取代舊 expression index；且 GET live n8n workflow 確認 `Write Alerts` 節點 URL 已帶 `?on_conflict=alert_date,thread,order_id_key,kind`。本地 `supabase/migrations/` 與 `scripts/ig-watchdog/build_n8n_workflow.cjs` 皆未同步此變更，屬未落文件的 live drift。

**本次執行**（純補齊 SSOT，非新部署）：
- `build_n8n_workflow.cjs` 補回 `on_conflict` 參數與說明註解，與 live 狀態同步。
- 新建 `supabase/migrations/0056_igwatch_alerts_on_conflict_fix.sql`，內容照抄已 live 執行的 DDL（`IF NOT EXISTS`/`IF EXISTS` 冪等）。
- GET live workflow 與重新產生的本地 JSON 逐節點/連線 diff，確認 24 個節點完全一致（僅 `settings.callerPolicy`/`availableInMCP` 兩個 n8n 自動附加欄位差異，非本次修復範圍）——**未重新 PUT**，避免不必要的 Google Drive credential 重新指派負擔。

**驗證**：`EXPLAIN INSERT ... ON CONFLICT (alert_date, thread, order_id_key, kind) DO NOTHING` 對 live DB 執行（零寫入，僅 query plan），輸出確認 `Conflict Arbiter Indexes: ix_igwatch_alerts_dedup_v2`，證實 on_conflict 目標與索引結構正確匹配。

詳見 `decisions.md` D33。

### 11.10 P2c：意圖標註 + 回覆範本庫（Session 173，2026-07-13）

**設計**：`lib/order-match.mjs` 新增 `tagIntent(text)` 純函式，regex-first 零 LLM 起步，涵蓋 5 類業務意圖：`cancel`/`complaint`/`modify_order`/`payment_inquiry`/`place_order`（`INTENT_PATTERNS` 陣列，順序即優先序——取消/投訴優先於改單/查詢/新單，因屬業務最需即時人工介入類別）。一則訊息可能同時命中多個意圖，回傳陣列，`[0]` 供 `is_primary` 使用。只標註客人發出的訊息（`isBizSender()` 過濾），商家 V42 制式確認文本不參與標註。

**落地**：`message_intents` 表（migration 0057）記錄命中結果（`intent_label`/`matched_regex`=`re.source`/`is_primary`）；`reply_templates` 表（同 migration）為人工維護靜態範本庫，5 類意圖各 1 筆草稿種子，非 pipeline 寫入對象，正式對客文案上線前需 Fat Mo 覆核。兩表皆用 `message_thread`+`message_ig_message_id` 軟性參照（比照 §11.8 `content_mismatch` 設計，非計畫書原文 `message_id` FK——現行 n8n REST POST fire-and-forget 寫入模式取不回 `ig_messages` INSERT 產生的 UUID）。

**n8n 整合**：`Classify & Report` 節點輸出新增 `intents` 陣列；新增 `Has Intents?` IF 節點（守衛空陣列不寫入，同 `Has Messages?`/`Has Mismatches?` 理由）+ `Write Intents` HTTP Request 節點（REST POST + `on_conflict=alert_date,message_thread,message_ig_message_id,intent_label`，吸取 P2a F3 教訓不重犯）。`Classify & Report` 平行分支擴充為 4 條（Has Alerts?/Has Messages?/Has Mismatches?/Has Intents?）。

**已知限制（誠實收窄）**：cl-final-plan §7 要求「≥20 真實樣本、覆蓋率≥70%、準確度≥80%」正式驗收，執行期查證 `ig_messages` 0 筆（P2a 上線後僅跑過一次 cron，當日 0 筆符合條件）、`ig_watchdog_alerts` 現存 10 筆真實 snippet 皆為訂單細節確認文本，無 5 類意圖的多樣真實樣本可測。Fat Mo 裁決先建代碼、驗收延後，待 `ig_messages` 自然累積足量真實訊息後補測；`node --test` 現有 8 組 `tagIntent` 測試為功能回歸用途（illustrative examples），非正式驗收樣本。

**部署驗證**：GET live workflow → 本地重建 JSON 結構化 diff（僅新增 2 節點 + `Classify & Report` 內容 + 對應 connections，無其餘節點/連線 drift）→ PUT（HTTP 200）→ 再 GET 確認 26/26 節點與本地版本逐一一致。

詳見 `decisions.md` D35、`scripts/README.md` ig-watchdog 段。