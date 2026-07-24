# FHS 定價聖經 (FHS Pricing Bible)

> **Authority Level**: L2 — 現行定價 HEAD
> **Version**: v1.7.0
> **更新日期**: 2026-07-25（S189財務文件全面審查：§5/§6 移除重複金額表，改為指向 `FHS_Product_Cost_Schema_v2.md`（唯一SSoT），消除同Cost Schema §2.1/§3.2 兩處各自維護同組數字嘅drift風險；§6.1過時公式+§6.3已填妥卻仍標「待填」嘅清單一併移除）；2026-07-23（§3.2 純銀頸鏈吊飾 S mode remainder單隻價 $1,980→$1,490下修，N=1底價不變；§4.3 P mode 鎖匙扣改為多部位合併計價+新增跨部位附加費，取代原「各部位獨立計階梯」；兩項均為 Fat Mo 對照客戶最新售價表 + 真實訂單核實後裁決，決策見 decisions.md D45）；2026-07-21 (§2.1 修復肢數判定 bug：hasFoot 捷徑判斷→實際總肢數計算，並將大寶肢體納入嬰兒同等計數但不觸發家庭價；2026-07-19 §2.1 玻璃瓶套裝新增「含父母」家庭定價 $2,580 並改用獨立 SKU「玻璃瓶套裝 (家庭)」（推翻同日較早嘅「SKU不變」決定，修正稽核面板顯示舊價 bug）；§6 footnote 修正已過時技術債描述)
> **衝突規則**: 若本文件與 L1（`.fhs/ai/FHS_Finance_Bible.md`）衝突，以 L1 為準；本文件取代所有舊版定價文件（pricing_reference / Product_Bible_V3.7）
> **Source of Truth**: `freehandsss_dashboardV41.html` → `calculatePricing()` 函式（代碼為最終裁決者）
> **警告**: 計價邏輯變更後，本文件必須同步修訂，否則將成為誤導來源。

---

## §0 品牌核心定位（嬰兒核心原則）

> 歷史來源：FHS_Product_Bible_V3.7 §0（規則已完整遷入本文件；V3.7 本身已退役，不得回頭查閱）

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

| SKU 名稱 | 條件 | 建議售價 |
|------|------|---------|
| 木框套裝 (4肢) | 4肢 | **$2,380** |
| 木框套裝 (2肢) | 非4肢（1–3肢）| **$2,080** |
| 玻璃瓶套裝 (4肢) | 4肢（純嬰兒/大寶，無父母）| **$1,680** |
| 玻璃瓶套裝 (2肢) | 非4肢（1–3肢，純嬰兒/大寶，無父母）| **$1,380** |
| **玻璃瓶套裝 (家庭)** | **倒模對象含父母**（不論嬰兒/大寶肢數）| **$2,580** flat（2026-07-19 Fat Mo 定案，先例單號 0600107；migration 0060） |

判定依據（**2026-07-21 修正**，取代 hasFoot 舊判定）：`type = (babyLimbCount + elderLimbCount) >= 4 ? "4肢" : "2肢"`——即**實際數總共選咗幾多肢**（4肢先算4肢，1–3肢一律2肢），非「有冇揀腳」捷徑判斷。`elderLimbCount` 只喺 `en_elder` 已勾先計入，且**大寶肢體同嬰兒肢體同等地位一齊計總數**（大寶等同嬰兒，2026-07-21 Fat Mo 定案）；父母肢體不影響 2肢/4肢 判定。玻璃瓶一旦 `hasParentGlass`（`en_parent` 已勾且至少一個嬰兒肢體≠「無」）即改用**獨立 SKU「玻璃瓶套裝 (家庭)」**、售價 $2,580 flat，不再依 4肢/2肢分級——**大寶本身不會觸發家庭價**，只有父母會。
⚠️ **舊 bug（2026-07-19 起存在，2026-07-21 修復）**：舊判定 `hasFoot = 嬰兒左腳或右腳其中一隻≠無` 只睇「有冇揀腳」，唔理實際揀咗幾多肢——導致「一手一腳」（UI 快速按鈕 `babySetMode('left'/'right')`，實際只選 2 肢）被誤判做「4肢」，多收 $300。同時大寶肢體完全未被計入 2肢/4肢 判定（大寶單獨或大寶+嬰兒混合肢數會被漏計）。修復位置：`buildOrderItemsForPricing()` 與儲存路徑同名判定區塊（V42/current.html 各 2 處）。
⚠️ **SKU 命名 2026-07-19 起已改變**（推翻同日較早的「SKU 命名不變」決定）：原方案沿用 `玻璃瓶套裝 (4肢)` 品名、只改售價，導致前端「顯示項目財務」稽核面板（讀 `products.suggested_price` 靜態對照表，`fhsSuggestedPriceMap`，per-SKU 無法區分是否含父母）恆顯示舊價 $1,680，與 `calculatePricing()` 即時結果不符。改用獨立 SKU 名稱後，`products` 表新增對應行（migration 0060，`total_base_cost` 仍 $210 flat 不變）令兩處來源一致。
木框套裝暫無對應「含父母」flat 價規則，維持 §2.1 原表 + §2.2 附加費邏輯；木框套裝亦無大寶/父母 UI 選項，故 `elderLimbCount` 恆為 0，肢數判定僅計嬰兒。

### 2.2 成員混合模式附加費

| 條件 | 附加費 |
|------|-------|
| 同一訂單中同時有**成人 + 嬰兒**（`hasAdultInSet && hasBabyInSet`），**且非玻璃瓶套裝** | ~~+$300~~ **$0（2026-06-11 Fat Mo 決定豁免）** |
| 玻璃瓶套裝含父母 | **不適用**本附加費——$2,580 flat 已內含混合模式差異，避免與 §2.1 疊加 |

> 觸發條件：`en_parent` checkbox 已勾（含父母肢體「待定」亦觸發）AND 至少一個嬰兒肢體 ≠「無」。
> 邏輯保留（UI 仍顯示 +$0，木框套裝適用）。如需恢復收費，改 `cost_configurations.mixed_member_surcharge` 數值即可。
> 玻璃瓶套裝自 2026-07-19 起於 `calculatePricing()` 明確排除本附加費（`!isGlassJar` guard），防止未來 `mixed_member_surcharge` 改回非 0 時誤疊加在 $2,580 之上。

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

> **2026-07-23 Fat Mo 裁決修訂**：對照客戶最新售價表 + 真實加購單（一對金手+一對銀腳=2對=$2,980×2=$5,960）核實，remainder 單隻價由 $1,980 降至 $1,490（= 完整頸鏈 $2,980 之半，對齊 P mode `extraSingle=extraFull÷2` 既有結構）。**單獨1隻（N=1，未成對）維持 $1,980 底價不變**，不套用 remainder 公式。

```
if totalCharms === 1:
    silverPrice = $1,980                          // 底價，不套 remainder 公式
else:
    fullNecklaces = floor(totalCharms / 2)
    singleCharms  = totalCharms % 2
    silverPrice   = fullNecklaces × $2,980 + singleCharms × $1,490
```

| 總吊飾數 | 頸鏈數 | 建議售價 | 備註 |
|---------|--------|---------|------|
| 1 | 1 | **$1,980** | 底價特例 |
| 2 | 1 | **$2,980** | |
| 3 | 2 | **$4,470** | 2980+1490（原$4,960，2026-07-23下修）|
| 4 | 2 | **$5,960** | =2×2980 |
| 5 | 3 | **$7,450** | 5960+1490（原$7,940，2026-07-23下修）|
| 6 | 3 | **$8,940** | =3×2980 |

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

- **S mode（有主產品）：每個身體部位各自獨立計階梯**（左手 qty=3 和右手 qty=2 分別計價，不合併）
- **P mode（無主產品）：2026-07-23 起改為多部位合併計價**——見 4.3
- **無異部位附加費**（Session 48 Phase 2 已移除，但 P mode 另有「跨部位附加費」機制，見 4.3，兩者不同）
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

> **2026-07-23 Fat Mo 裁決修訂**：對照客戶最新售價表核實，P mode 鎖匙扣原本「每個身體部位各自獨立計階梯」同客戶售價表（以總吊飾數合併計價）不符——例如左手1+右手1，舊邏輯算 $1,580×2=$3,160，客戶售價表用合併總量qty=2查表=$2,160，差$1,000。已改為**多部位合併計價**，並新增**跨部位附加費**（客戶售價表：「第3/4隻吊飾如是另一手/腳需+$100圖紙費」，按全新不同部位數計，非數量位置）。
> 代碼位置：`processTierPricing()` P mode 分流分支，`freehandsss_dashboardV42.html` L7259 起

```
totalQty      = 該訂單所有 P mode 鎖匙扣 item 嘅 Quantity 加總（跨身體部位合併）
distinctParts = P mode item 數量（= 涉及嘅不同身體部位數）

if totalQty === 1: price = $1,580
elif totalQty === 2: price = $2,160
elif totalQty === 3: price = $2,940
elif totalQty === 4: price = $3,520
else: price = $3,520 + (totalQty−4) × $880

surcharge = max(0, distinctParts − 2) × $100     // 3個部位+$100，4個部位（兩手兩腳全出）再+$100
price += surcharge
```

| 總吊飾數（合併）| 售價（無跨部位）|
|-----|------|
| 1 | **$1,580** |
| 2 | **$2,160** |
| 3 | **$2,940**（+ 跨部位附加費，見上）|
| 4 | **$3,520**（+ 跨部位附加費，見上）|
| 5+ | $3,520 + (qty−4) × $880 |

**驗證案例**：左手1+右手1（2部位）= $2,160；左手1+右手1+左腳1（3部位）= $2,940+$100=$3,040；四部位全出 = $3,520+$200=$3,720。

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

> 歷史來源：FHS_Product_Bible_V3.7 §2.5（2026-05-03 Fat Mo 確認；規則已完整遷入本文件；V3.7 本身已退役，不得回頭查閱）

- **規則**：`Shipping_Deduction = (同訂單鎖匙扣 Order_Items 總數 − 1) × $20`
- **計算層級**：訂單層級彙總，非 item 層級
- **n8n 成本側**：`Necklace_Deduction = floor(qty/2) × 220`（見 Quadruple_Sync_Field_Map.md）

---

## §5 FatMo 繪圖成本字典（前端，不存 DB）

> 此為 FatMo 人工繪圖費用，作為訂單成本核算的前端參考值，不等同於產品生產成本。
> 代碼位置：`calculatePricing()` L5128–5156
> **2026-07-25 起金額表移除**：現行金額為 `FHS_Product_Cost_Schema_v2.md` §2.1／§3.2（唯一 SSoT，Group A drawing）之子集，本文件不再重複維護第二份副本以避免 drift（S189 審查揪出本節舊表同 Cost Schema §3.2 曾經各自維護同一組數字，屬過時/重複病徵）。查金額請直接讀 Cost Schema v2 §2.1/§3.2。

### 5.1 計費規則

`item.FatMoCost = cost（見 Cost Schema v2 §3.2）× qty`，按對象（嬰兒/大寶/成人）× 模式（S/P）四選一。

### 5.2 家庭連心成本分拆

每個成員（`comboNote` 各項）獨立計費，費率同上（依 (P)/(S) 標記或 `isPModeForce` 決定）。

---

## §6 產品生產成本結構（n8n + Supabase）

> 此為實際生產成本，由 n8n 從 Supabase `products` 表查詢後寫入訂單。
> **2026-07-25 起本節簡化為指針**：具體成本組成/代表性數值/23-key清單，唯一 SSoT 為 `FHS_Product_Cost_Schema_v2.md`（本文件不再重複維護，原 §6.1 公式已過時、原 §6.3「待填項目」四個 key 實際上早已填妥現行值 115/115/465/465，見 Cost Schema v2 §2.1）。V2 統一 SKU 模型（S189，2026-07-24起）另見 Cost Schema v2 §10。

產品生產成本詳見 → `FHS_Product_Cost_Schema_v2.md`（全份，唯一 SSoT）

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
| `MEMBER_SURCHARGE` | 同訂單成人+嬰兒同時出現 **+$0（豁免；邏輯保留）** | 2026-06-11 | S90 | +$300 | [2026-06-11] mixed_member_surcharge 歸零（config 值改 0，JS `??` 修正，顯示仍保留）|
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