> ⚠️ **DEPRECATED（2026-06-01）**
> 本文件已合併至 `.fhs/ai/FHS_Pricing_Bible.md`（L2 現行定價 HEAD，Session 62 路徑更新）。
> 請勿再引用本文件進行定價計算。內容僅作歷史存檔。

# FHS 產品定價規則參照文件

> **版本**：v2.0.0
> **最後更新**：2026-05-31（Session 48 補全：立體擺設 / 成本結構 / 折扣機制 / 數據位置）
> **Source of Truth**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html` → `calculatePricing()` 函式
> **警告**：本文件記錄前端建議售價邏輯與成本結構。若代碼更新，本文件必須同步修訂，否則將成為誤導來源。

---

## 全局模式判定

| 變數 | 判定條件 | 含義 |
|------|---------|------|
| `hasMainProduct` | `enableP === true`（立體擺設勾選）| true = 有主產品（倒模）|
| `pModeState` | `hasMainProduct ? "S" : "P"` | S = 倒模/有主產品；P = 純照片建模 |
| `hasAdult` | Product_Name 含「成人」或 comboNote 含「父母/成人」| 影響成本費率 |

---

## §0 立體擺設（Category P）

### 0.1 主產品售價（`item.Order_Item_Key === "TEMP_P_MAIN"`）

| 款式 | 肢數 | 建議售價 |
|------|------|---------|
| 木框套裝 | 4肢 | **$2,380** |
| 木框套裝 | 非4肢（1–3肢）| **$2,080** |
| 玻璃瓶套裝 | 4肢 | **$1,680** |
| 玻璃瓶套裝 | 非4肢 | **$1,380** |

判定依據：`name.includes("木框") && name.includes("4肢")`

### 0.2 成員混合模式附加費

| 條件 | 附加費 |
|------|-------|
| 同一訂單中同時有**成人 + 嬰兒**（`hasAdultInSet && hasBabyInSet`）| **+$300** |

### 0.3 配件（`item.isAccessory === true`）

| 配件 | 售價（per件）| 計算方式 |
|------|-----------|---------|
| 羊毛氈公仔 | **$680** | × qty |
| 燈飾 | **$80** | × qty |

### 0.4 代碼位置

| 元素 | 位置 |
|------|------|
| 主產品定價 | `calculatePricing()` L5158–5180 |
| 配件定價 | `calculatePricing()` L5182–5190 |

---

## §1 純銀頸鏈吊飾（Category M）

> **Session 48 Phase 2 大修**（2026-05-31）：改用頸鏈組合併計價，移除獨立部位定價。

### 1.1 核心原則

- **925銀 / 925金 售價完全相同**，不因材質產生差價
- **頸鏈組計價**：不分身體部位，以**總吊飾數**合併後按頸鏈組計算
- **每條頸鏈最多掛 2 個吊飾**（`Math.ceil(totalCharms / 2)` 條頸鏈）
- **無異部位附加費**：跨部位（左手+右腳）不加收費用
- **無獨立圖紙費**：原 $1,000 單購圖紙費已移除

### 1.2 倒模模式（`hasMainProduct = true`）

**公式**：
```
fullNecklaces = floor(totalCharms / 2)
singleCharms  = totalCharms % 2
silverPrice   = fullNecklaces × $2,980 + singleCharms × $1,980
```

| 總吊飾數 | 頸鏈數 | 建議售價 | 組合說明 |
|---------|--------|---------|---------|
| 1 | 1 | **$1,980** | 1條頸鏈 +1隻 |
| 2 | 1 | **$2,980** | 1條頸鏈 一對 |
| 3 | 2 | **$4,960** | 一對 + +1隻 |
| 4 | 2 | **$5,960** | 兩對 |
| 5 | 3 | **$7,940** | 兩對 + +1隻 |
| 6 | 3 | **$8,940** | 三對 |

### 1.3 P系列模式（`hasMainProduct = false`）

**公式**：
```
if totalCharms === 1:
    silverPrice = $2,280
else:
    remaining   = totalCharms - 2
    extraFull   = floor(remaining / 2)
    extraSingle = remaining % 2
    silverPrice = $3,280 + extraFull × $3,280 + extraSingle × $1,640
```

| 總吊飾數 | 頸鏈數 | 建議售價 |
|---------|--------|---------|
| 1 | 1 | **$2,280** |
| 2 | 1 | **$3,280** |
| 3 | 2 | **$4,920** |
| 4 | 2 | **$6,560** |
| 5 | 3 | **$8,200** |
| 6 | 3 | **$9,840** |

額外頸鏈：+1隻 = **$1,640**；+一對 = **$3,280**

### 1.4 代碼位置

| 元素 | 位置 |
|------|------|
| 定價主邏輯 | `calculatePricing()` L5245–5290 |
| 頸鏈組資料 | `window.fhsNecklaceGroups`（供 `renderPaymentSplits` 使用）|
| n8n 成本側 | Necklace_Deduction = `floor(qty/2) × 220`（見 Quadruple_Sync_Field_Map.md）|

---

## §2 金屬鎖匙扣（Category K）

### 2.1 核心原則

- **每個身體部位各自獨立計階梯**（左手 qty=3 和右手 qty=2 分別計價）
- **無異部位附加費**（Session 48 Phase 2 已移除）
- **不銹鋼 / 鋁合金 售價相同**

### 2.2 S mode（`pModeState === "S"`，有主產品）

| qty | 售價 |
|-----|------|
| 1 | **$860** |
| 2 | **$1,200** |
| 3 | **$1,680** |
| 4 | **$2,000** |
| 5+ | $2,000 + (qty−4) × $500 |

### 2.3 P mode（`pModeState === "P"` 或 Product_Name 含 `"(P)"`）

| qty | 售價 |
|-----|------|
| 1 | **$1,580** |
| 2 | **$2,160** |
| 3 | **$2,940** |
| 4 | **$3,520** |
| 5+ | $3,520 + (qty−4) × $880 |

### 2.4 家庭連心（`item.isFamily === true`）

**基礎階梯**：

| qty（人數）| 基礎價 |
|-----------|--------|
| 1 | $1,080 |
| 2 | $1,720 |
| 3 | $2,280 |
| 4 | $2,640 |
| 5+ | $2,640 + (qty−4) × $660 |

**附加費**：

| 條件 | surcharge |
|------|----------|
| 含 `"S2"` | +$100 |
| 含 `"P1"` / `"P2"` / 成人 / pModeState=P | +$300 |

**最終售價 = 基礎價 + surcharge**

### 2.5 代碼位置

`calculatePricing()` → `processTierPricing(metalItems, '金屬')`（L5193–5240）

---

## §3 FatMo 繪圖成本（前端，不存 DB）

> 此成本**僅為 FatMo 人工繪圖費用**，作為訂單成本核算的前端參考值，不等同於產品生產成本。

### 3.1 計費規則（`item.FatMoCost = cost × qty`）

| 對象 | 模式 | 每件成本 |
|------|------|---------|
| 嬰兒 / 大寶 | S mode（有主產品）| **$60** |
| 嬰兒 / 大寶 | P mode（無主產品）| **$110** |
| 成人 | S mode | **$110** |
| 成人 | P mode / 木框成人（isPModeForce）| **$240** |

**isPModeForce 觸發條件**：
- `!hasMainProduct`（無主產品）
- 或：`enableP && pSubCat === "木框款式" && 成人`

### 3.2 家庭連心成本分拆

每個成員（`comboNote` 各項）獨立計費：
- 父母/成人：`isPModeForce ? $240 : $110`
- 嬰兒：依 (P)/(S) 標記或 `isPModeForce` 決定 $110 / $60

### 3.3 代碼位置

`calculatePricing()` L5128–5156（FatMoCost 計算段）

---

## §4 產品生產成本（n8n + Supabase）

> 此為**實際生產成本**，由 n8n 從 Supabase `products` 表查詢後寫入訂單。

### 4.1 成本組成（per SKU）

```
total_base_cost = Drawing_Cost + Printing_Cost + Clasp_Cost + Shipping_Cost
```

### 4.2 代表性數值（CSV 離線備份，需 Supabase 核實）

| 類別 | 繪圖 | 鑄造/印刷 | 扣夾 | 運費 | total_base_cost |
|------|------|---------|------|------|----------------|
| 嬰兒吊飾 - 925銀 (S mode) | $60 | $260 | $70 | $35 | **$425** |
| 嬰兒吊飾 - 925金 (S mode) | $60 | $316 | $70 | $35 | **$481** |
| 嬰兒(P)吊飾 - 925銀 | $110 | $260 | $70 | $35 | **$475** |
| 家庭(P1)吊飾 - 925銀 | $240 | $260 | $70 | $35 | **$605** |

### 4.3 成本流向

```
Supabase products.total_base_cost
    ↓ (n8n Smart Cache Strategist 查詢)
n8n Calculate Profit
    ↓
orders.total_cost（寫入）
order_items.necklace_cost / keychain_cost / handmodel_cost（分類小計）
```

### 4.4 cost_configurations 待填項目（migration 0022a，初始值均為 0）

| config_key | 說明 |
|------------|------|
| `material_cost_necklace_silver` | 吊飾 925銀物料成本 ⚠️ 待填 |
| `material_cost_necklace_gold` | 吊飾 925金物料成本 ⚠️ 待填 |
| `material_cost_keychain_stainless` | 鎖匙扣不銹鋼物料成本 ⚠️ 待填 |
| `material_cost_keychain_alloy` | 鎖匙扣鋁合金物料成本 ⚠️ 待填 |

---

## §5 折扣 / 補打機制（adjustment_amount）

> FHS **沒有百分比折扣機制**。唯一調整方式是 `adjustment_amount`（金額差值）。

### 5.1 性質

| 值 | 含義 |
|----|------|
| 正數（+）| 追加費（補打、額外服務費）|
| 負數（−）| 折讓 / 折扣 |
| 0 | 無調整 |

### 5.2 輸入方式

| 方式 | 位置 | 說明 |
|------|------|------|
| 訂單建立時 | `#adjustment`（`display:none`，Fat Mo 專屬）| 隱藏欄位，通常不填 |
| 訂單確認後 | Review Mode 訂單卡片 → 直接輸入並 `saveAdjustmentAmount()` | 最常用路徑 |

### 5.3 效果（KPI 層計算）

```sql
-- get_financial_kpis.sql
顯示成本  = total_cost + adjustment_amount
顯示利潤  = net_profit - adjustment_amount
```

`net_profit`（n8n 寫入）**不含** adjustment_amount；KPI 展示時才套用。

### 5.4 儲存位置

`orders.adjustment_amount NUMERIC(10,2) DEFAULT 0`（Supabase）

---

## §6 數據儲存位置總覽

| 數據類型 | 儲存位置 | 誰寫入 | 誰讀取 |
|---------|---------|-------|--------|
| **售價規則**（定價公式）| 前端 JS hardcode | 開發者改代碼 | `calculatePricing()` |
| **前端建議售價**（`totalSuggestedPrice`）| `window.fhsCurrentPricingMeta.System_Final_Sale_Price` | 前端計算 | Webhook payload → n8n |
| **FatMo 繪圖成本**（`totalDrawingCost`）| 前端計算後傳 payload，**不存 DB** | 前端計算 | n8n 僅接收，不重算 |
| **產品生產成本**（per SKU）| Supabase `products.total_base_cost` | 人工維護 / migration | n8n Smart Cache Strategist |
| **訂單總成本**（已計算）| Supabase `orders.total_cost` | n8n Calculate Profit | Dashboard Finance Mode |
| **成本分類小計** | Supabase `order_items.necklace_cost` / `keychain_cost` / `handmodel_cost` | n8n | Finance Mode / `finance-auditor` |
| **成本設定**（material）| Supabase `cost_configurations` | Fat Mo 手動 / RPC | n8n（預留，目前值為 0）|
| **折扣/補打**（adjustment）| Supabase `orders.adjustment_amount` | Review Mode 手動 | KPI SQL |
| **利潤**（已計算）| Supabase `orders.net_profit` | n8n（`final_sale_price - total_cost`）| Finance Mode / KPI SQL |

---

## §7 查詢路由

| 問題類型 | 建議工具 |
|---------|---------|
| 「X 產品定價公式是什麼？」| 直接讀本文件 §0–§2 |
| 「某訂單成本/利潤是多少？」| `finance-auditor` subagent（Live Supabase 查詢）|
| 「products 表 SKU 成本資料」| `database-reviewer` subagent |
| 「cost_configurations 目前值」| `database-reviewer` 或 Dashboard 財務設定中心 |
| 「adjustment_amount 影響了哪些訂單？」| `finance-auditor` |

---

## §8 修訂歷史

| 版本 | 日期 | Session | 變更摘要 |
|------|------|---------|---------|
| v2.0.0 | 2026-05-31 | Session 48 | 補全：立體擺設定價（§0）、FatMo 繪圖成本（§3）、生產成本結構（§4）、折扣機制（§5）、數據位置總覽（§6）、查詢路由（§7）|
| v1.0.0 | 2026-05-31 | Session 48 Phase 2 | 初版：吊飾頸鏈組計價 + 鎖匙扣定價 |
| — | 2026-05-31 | Session 48 Phase 2 | 吊飾計價大修：移除 $1,000 圖紙費；移除異部位費；改用頸鏈組公式；修正 P系列 qty=2 |
| — | 2026-05-29 | Session 37b | n8n V47.13：補入成人吊飾 SKU 至 BASE_PREFIXES |
| — | 2026-05-28 | Session 37 | migration 0022a：cost_configurations material_jewelry 四個 key |

---

*本文件為 FHS 財務定價系統的唯一人工可讀參照。代碼為最終裁決者。*
