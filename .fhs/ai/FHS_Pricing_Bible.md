# FHS 定價聖經 (FHS Pricing Bible)

> **Authority Level**: L2 — 現行定價 HEAD
> **Version**: v1.2.0
> **更新日期**: 2026-06-05 (Session 63 — §10 重構為規則 ID 表)
> **衝突規則**: 若本文件與 L1（`.fhs/ai/FHS_Finance_Bible.md`）衝突，以 L1 為準；本文件取代所有舊版定價文件（pricing_reference / Product_Bible_V3.7）
> **Source of Truth**: `freehandsss_dashboardV41.html` → `calculatePricing()` 函式（代碼為最終裁決者）
> **警告**: 計價邏輯變更後，本文件必須同步修訂，否則將成為誤導來源。

---

## §0 品牌核心定位（嬰兒核心原則）

> 來源：FHS_Product_Bible_V3.7 §0（品牌禁止邏輯，長期有效）

- **靈魂所在**：Freehandsss 的價值在於「嬰兒立體倒模」，所有產品必須圍繞嬰兒展開
- **禁止組合**：禁止推銷「嬰兒照片建模 (P) + 成人實體倒模 (S)」的組合
- **禁止單人成人**：禁止單獨訂購成人產品，必須有嬰兒產品引導

---

## §1 全局模式判定

| 變數 | 判定條件 | 含義 |
|------|---------|------|
| `hasMainProduct` | `enableP === true`（立體擺設勾選）| true = 有主產品（倒模）|
| `pModeState` | `hasMainProduct ? "S" : "P"` | S = 倒模/有主產品；P = 純照片建模 |
| `hasAdult` | Product_Name 含「成人」或 comboNote 含「父母/成人」| 影響成本費率 |

---

## §2 立體擺設（Category P）

> Session 48 Phase 2 確認定價。代碼位置：`calculatePricing()` L5158–5190

### 2.1 主產品售價（`item.Order_Item_Key === "TEMP_P_MAIN"`）

| 款式 | 肢數 | 建議售價 |
|------|------|---------|
| 木框套裝 | 4肢 | **$2,380** |
| 木框套裝 | 非4肢（1–3肢）| **$2,080** |
| 玻璃瓶套裝 | 4肢 | **$1,680** |
| 玻璃瓶套裝 | 非4肢 | **$1,380** |

判定依據：`name.includes("木框") && name.includes("4肢")`

### 2.2 成員混合模式附加費

| 條件 | 附加費 |
|------|-------|
| 同一訂單中同時有**成人 + 嬰兒**（`hasAdultInSet && hasBabyInSet`）| **+$300** |

### 2.3 配件（`item.isAccessory === true`）

| 配件 | 售價（per件）|
|------|-----------|
| 羊毛氈公仔 | **$680** |
| 燈飾 | **$80** |

---

## §3 純銀頸鏈吊飾（Category M）

> **Session 48 Phase 2 大修**（2026-05-31）：改用頸鏈組合併計價，移除獨立部位定價。
> 代碼位置：`calculatePricing()` L5245–5290

### 3.1 核心原則

- **925銀 / 925金 售價完全相同**，不因材質產生差價
- **頸鏈組計價**：不分身體部位，以**總吊飾數**合併後按頸鏈組計算
- **每條頸鏈最多掛 2 個吊飾**（`Math.ceil(totalCharms / 2)` 條頸鏈）
- **無異部位附加費**：跨部位（左手+右腳）不加收費用（Session 48 已移除）
- **無獨立圖紙費**：原 $1,000 單購圖紙費已移除

### 3.2 倒模模式（`hasMainProduct = true`）

```
fullNecklaces = floor(totalCharms / 2)
singleCharms  = totalCharms % 2
silverPrice   = fullNecklaces × $2,980 + singleCharms × $1,980
```

| 總吊飾數 | 頸鏈數 | 建議售價 |
|---------|--------|---------|
| 1 | 1 | **$1,980** |
| 2 | 1 | **$2,980** |
| 3 | 2 | **$4,960** |
| 4 | 2 | **$5,960** |
| 5 | 3 | **$7,940** |
| 6 | 3 | **$8,940** |

### 3.3 P系列模式（`hasMainProduct = false`）

```
if totalCharms === 1:
    silverPrice = $2,280
else:
    remaining   = totalCharms - 2
    extraFull   = floor(remaining / 2)
    extraSingle = remaining % 2
    silverPrice = $3,280 + extraFull × $3,280 + extraSingle × $1,640
```

| 總吊飾數 | 建議售價 |
|---------|---------|
| 1 | **$2,280** |
| 2 | **$3,280** |
| 3 | **$4,920** |
| 4 | **$6,560** |
| 5 | **$8,200** |

額外頸鏈：+1隻 = **$1,640**；+一對 = **$3,280**

### 3.4 吊飾跨部位運費共享規則

- **規則**：`Shipping_Deduction = (同訂單吊飾 Order_Items 總數 − 1) × $35`（總件數 = SUM qty）
- **計算層級**：訂單層級彙總，非 item 層級
- **n8n 成本與利潤**：`charmShippingDeduction = (件數-1) × $35`，正確寫入 `N8n_Adjustment_Notes` 並從 `total_cost` 中扣除（對齊 V47.15 修正）

---

## §4 金屬鎖匙扣（Category K）

> 代碼位置：`calculatePricing()` → `processTierPricing(metalItems, '金屬')` L5193–5240

### 4.1 核心原則

- **每個身體部位各自獨立計階梯**（左手 qty=3 和右手 qty=2 分別計價）
- **無異部位附加費**（Session 48 Phase 2 已移除）
- **不銹鋼 / 鋁合金 售價相同**

### 4.2 S mode（有主產品）

| qty | 售價 |
|-----|------|
| 1 | **$860** |
| 2 | **$1,200** |
| 3 | **$1,680** |
| 4 | **$2,000** |
| 5+ | $2,000 + (qty−4) × $500 |

### 4.3 P mode（無主產品或 Product_Name 含 `"(P)"`）

| qty | 售價 |
|-----|------|
| 1 | **$1,580** |
| 2 | **$2,160** |
| 3 | **$2,940** |
| 4 | **$3,520** |
| 5+ | $3,520 + (qty−4) × $880 |

### 4.4 家庭連心（`item.isFamily === true`）

| qty（人數）| 基礎價 |
|-----------|--------|
| 1 | $1,080 |
| 2 | $1,720 |
| 3 | $2,280 |
| 4 | $2,640 |
| 5+ | $2,640 + (qty−4) × $660 |

附加費：含 `"S2"` → +$100；含 `"P1"/"P2"` / 成人 / pModeState=P → +$300

### 4.5 鎖匙扣跨部位運費共享規則

> 來源：FHS_Product_Bible_V3.7 §2.5（2026-05-03 Fat Mo 確認，長期有效）

- **規則**：`Shipping_Deduction = (同訂單鎖匙扣 Order_Items 總數 − 1) × $20`
- **計算層級**：訂單層級彙總，非 item 層級
- **n8n 成本側**：`Necklace_Deduction = floor(qty/2) × 220`（見 Quadruple_Sync_Field_Map.md）

---

## §5 FatMo 繪圖成本字典（前端，不存 DB）

> 此為 FatMo 人工繪圖費用，作為訂單成本核算的前端參考值，不等同於產品生產成本。
> 代碼位置：`calculatePricing()` L5128–5156

### 5.1 計費規則（`item.FatMoCost = cost × qty`）

| 對象 | 模式 | 每件成本 |
|------|------|---------|
| 嬰兒 / 大寶 | S mode（有主產品）| **$60** |
| 嬰兒 / 大寶 | P mode（無主產品）| **$110** |
| 成人 | S mode | **$110** |
| 成人 | P mode / 木框成人（isPModeForce）| **$240** |

### 5.2 家庭連心成本分拆

每個成員（`comboNote` 各項）獨立計費：
- 父母/成人：`isPModeForce ? $240 : $110`
- 嬰兒：依 (P)/(S) 標記或 `isPModeForce` 決定 $110 / $60

---

## §6 產品生產成本結構（n8n + Supabase）

> 此為實際生產成本，由 n8n 從 Supabase `products` 表查詢後寫入訂單。

### 6.1 成本組成（per SKU）

```
total_base_cost = Drawing_Cost + Printing_Cost + Clasp_Cost + Shipping_Cost
```

> ⚠️ 注意：現行 migration 0023 為硬編碼 flat 值（非動態 roll-up）。
> 三層顆粒化架構落實（Task A）完成後，此欄位將改為從 cost_configurations 動態計算。
> 詳見：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`

### 6.2 代表性數值

| 類別 | 繪圖 | 鑄造/印刷 | 扣夾 | 運費 | total_base_cost |
|------|------|---------|------|------|----------------|
| 嬰兒吊飾 - 925銀 (S mode) | $60 | $260 | $70 | $35 | **$425** |
| 嬰兒吊飾 - 925金 (S mode) | $60 | $316 | $70 | $35 | **$481** |
| 嬰兒(P)吊飾 - 925銀 | $110 | $260 | $70 | $35 | **$475** |

### 6.3 cost_configurations 待填項目

| config_key | 說明 | 狀態 |
|------------|------|------|
| `material_cost_necklace_silver` | 吊飾 925銀物料成本 | ⚠️ 待填（Task A 範疇）|
| `material_cost_necklace_gold` | 吊飾 925金物料成本 | ⚠️ 待填（Task A 範疇）|
| `material_cost_keychain_stainless` | 鎖匙扣不銹鋼物料成本 | ⚠️ 待填（Task A 範疇）|
| `material_cost_keychain_alloy` | 鎖匙扣鋁合金物料成本 | ⚠️ 待填（Task A 範疇）|

---

## §7 折扣 / 補打機制（adjustment_amount）

> FHS **沒有百分比折扣機制**。唯一調整方式是 `adjustment_amount`（金額差值）。

| 值 | 含義 |
|----|------|
| 正數（+）| 追加費（補打、額外服務費）|
| 負數（−）| 折讓 / 折扣 |
| 0 | 無調整 |

**效果**（KPI 層計算）：
```
顯示成本 = total_cost + adjustment_amount
顯示利潤 = net_profit - adjustment_amount
```

`net_profit`（n8n 寫入）**不含** adjustment_amount；KPI 展示時才套用。
儲存位置：`orders.adjustment_amount NUMERIC(10,2) DEFAULT 0`（Supabase）

---

## §8 數據儲存位置總覽

| 數據類型 | 儲存位置 | 誰寫入 |
|---------|---------|-------|
| **售價規則**（定價公式）| 前端 JS hardcode | 開發者改代碼 |
| **FatMo 繪圖成本** | 前端計算後傳 payload，**不存 DB** | 前端計算 |
| **產品生產成本**（per SKU）| Supabase `products.total_base_cost` | 人工維護 / migration |
| **訂單總成本** | Supabase `orders.total_cost` | n8n Calculate Profit |
| **成本分類小計** | Supabase `order_items.necklace_cost` / `keychain_cost` / `handmodel_cost` | n8n |
| **折扣/補打** | Supabase `orders.adjustment_amount` | Review Mode 手動 |
| **利潤** | Supabase `orders.net_profit` | n8n（`final_sale_price - total_cost`）|

---

## §9 查詢路由

| 問題類型 | 建議工具 |
|---------|---------|
| 「X 產品定價公式是什麼？」| 直接讀本文件 §2–§4 |
| 「某訂單成本/利潤是多少？」| `finance-auditor` subagent（Live Supabase 查詢）|
| 「products 表 SKU 成本資料」| `database-reviewer` subagent |
| 「cost_configurations 目前值」| `database-reviewer` 或 Dashboard 財務設定中心 |
| 「adjustment_amount 影響了哪些訂單」| `finance-auditor` |
| 「架構規則（Layer 2 / trigger / 誰寫哪欄）」| 讀 L1 `.fhs/ai/FHS_Finance_Bible.md` |

---

## §10 規則沿革（按規則 ID 可查）

> **查詢方式**：按規則 ID 找到現行值 + 上次變更日期 + 對應 Session；深層決策理由見 `decisions.md [日期]`。
> **新增規則時**：在此表加一行，格式相同。

| 規則 ID | 現行值 | 上次變更日 | Session | 變更前值 | → decisions |
|---------|--------|-----------|---------|---------|-------------|
| `CHARM_SHIPPING_DEDUCTION` | (件數-1)×$35 per 訂單 | 2026-06-05 | S61 | 缺失（從未記錄）| [2026-06-05] B2 吊飾運費扣減 |
| `KEYCHAIN_SHIPPING_DEDUCTION` | (件數-1)×$20 per 訂單 | 2026-05-03 | — | — | FHS_Product_Bible_V3.7 §2.5 遷入 |
| `CHARM_NECKLACE_FORMULA_RECAST` | floor(n/2)×$2,980 + (n%2)×$1,980（倒模）| 2026-05-31 | S48 Ph2 | qty×$800 線性公式（已廢） | [2026-05-31] 吊飾計價大修 |
| `CHARM_DRAWING_FEE` | 無獨立圖紙費（已移除 $1,000 單購圖紙費）| 2026-05-31 | S48 Ph2 | $1,000 單購圖紙費 | [2026-05-31] 吊飾計價大修 |
| `CROSS_BODY_SURCHARGE` | 無異部位附加費（已移除）| 2026-05-31 | S48 Ph2 | 跨部位加收 $100/$300 | [2026-05-31] 吊飾計價大修 |
| `MEMBER_SURCHARGE` | 同訂單成人+嬰兒同時出現 +$300 | 2026-05-31 | S48 | — | 新增 |
| `ADULT_DRAWING_S` | $110 per 件 | 2026-06-02 | S53 | $110（未變，成本邏輯憲法化確認）| decisions [2026-06-02] |
| `BABY_DRAWING_S` | $60 per 件 | 2026-06-02 | S53 | $60（確認）| decisions [2026-06-02] |
| `CLASP_COST` | $10 per 件（環扣，非頸鏈）| 2026-06-03 | S54 | 缺失 / 誤記為$0 | decisions [2026-06-03] B1 成本補完 |
| `NECKLACE_CHAIN_COST` | $100 per 條（頸鏈）| 2026-06-03 | S53 | 缺失 | decisions [2026-06-02] P1 |
| `ADDON_WOOL_FELT` | $680 per 件（羊毛氈公仔）| 2026-05-31 | S48 | — | 新增 |
| `ADDON_LIGHTS` | $80 per 件（燈飾）| 2026-05-31 | S48 | — | 新增 |
| `P_MODE_4_LIMB_WOODFRAME` | $2,380（木框4肢）| 2026-05-31 | S48 Ph2 | — | Session 48 Phase 2 確認 |
| `P_MODE_2_LIMB_WOODFRAME` | $2,080（木框非4肢）| 2026-05-31 | S48 Ph2 | — | Session 48 Phase 2 確認 |

> **文件版本歷史**（Pricing_Bible 整體版本，非逐規則）：v1.0.0（2026-06-01 建立）→ v1.1.0（2026-06-05 吊飾運費規則補入）→ v1.2.0（2026-06-05 §10 重構為規則 ID 表）

---

*本文件為 FHS 定價/成本/折扣的現行唯一查閱入口（L2）。代碼為最終裁決者。*