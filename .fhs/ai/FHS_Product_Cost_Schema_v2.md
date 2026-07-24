---
name: FHS Product Cost Schema (Core)
version: v2.3.0
created: 2026-05-28
updated: 2026-07-25
authority: SSoT for cost_configurations 23-key schema + V2統一SKU模型（Core layer；S189審查後升格）
companion_docs:
  - .fhs/ai/FHS_Product_Cost_UI_Spec.md       # 已退役 2026-07-25，僅供歷史參考
  - .fhs/ai/FHS_Product_Cost_Operations.md    # 已退役 2026-07-25，僅供歷史參考
references:
  - .fhs/ai/FHS_Pricing_Bible.md §5（已改指針指回本文件，唔再重複維護金額表）
  - airtable-database/Base_Costs-Grid view.csv (歷史成本記錄)
  - .fhs/notes/addon_product_sop.md (加購配件 SOP)
  - supabase/migrations/0020_financial_settings_system.sql (v1 schema)
  - supabase/migrations/0073/0076-0078 (V2統一SKU模型 + 歷史回填，見§10)
status: v2.3.0 active
status_note: 原v2.2.0規劃嘅3-subagent audit鏈（database-reviewer/code-reviewer/ui-designer）從未正式完成即擱置逾7週；本次升格依據係§2.1內容已於S124/D40-D45/S189多個session實際生產驗證使用（非事後補簽審查記錄）——production-validated supersedes原定審查流程。此為誠實揭露，非假裝已審查。
---

# 📜 FHS 產品成本 Schema v2.3.0 — Core 文件

> **本文件用途**：所有 AI/人類查找「某產品定義／成本是多少／關聯是什麼」的唯一入口（Core 層）。
> **配套文件**（均已於2026-07-25退役，僅供歷史參考，非現行規範）：`FHS_Product_Cost_UI_Spec.md`（UI規範，內容已100%落地生產）；`FHS_Product_Cost_Operations.md`（RPC/並發/升級SOP，大部分已上線，唯一未完成項`fhs_mirror_write_product_cost` RPC見handoff.md待辦）。
> **核心使命**：清晰、可追查、可管理。
> **嚴禁**：不得在他處硬編碼成本；所有成本必須回到 `cost_configurations` + `products` 兩張表的真理。

---

## §0. Subagent 審計鏈（強制）

任何進入 Stage 3 (Migration 落地 / HTML 改動) 前，必須完成以下審計，缺一不可：

| 階段 | Subagent | 審計範圍 | 通過條件 |
|------|----------|----------|---------|
| **Pre-Stage 3-A** | `database-reviewer` | Core §2-§7 schema 設計、display_group 欄位型別、CHECK 約束 | PASS verdict |
| **Pre-Stage 3-B** | `code-reviewer` | Operations §OP-1~§OP-5 RPC 安全性、並發策略、回滾路徑 | PASS verdict |
| **Pre-Stage 3-C** | `ui-designer` | UI Spec §UI-1~§UI-4 響應式合規 + 視覺一致性 | PASS verdict |
| Post-Stage 3 | `code-reviewer` | 實際寫入的 SQL/HTML 與設計一致 | PASS verdict |

> 來源依據：`feedback_subagent_router.md` + `feedback_delivery_standards.md` — Router 推薦是硬要求。

---

## §1. 文件目的與範圍

### 1.1 為什麼有這份文件

v1 schema (Migration 0020) 只有 7 個 generic key（drawing_cost_per_order / printing_cost_per_cm2 / shipping × 2 / addon × 2），無法表達：

- 嬰兒 S vs 嬰兒 P vs 成人 P 的繪圖成本差異
- 立體擺設木框 vs 玻璃瓶的物料分流
- 鎖匙扣材質（不銹鋼 vs 鋁合金）與吊飾材質（925銀 vs 925金）的成本
- S1/S2/P1/P2 組合公式（成人 + N 個嬰兒肢）

v2 schema 現行 23 個 key（0026 B1 補入 3 個後之現況），分 6 個 GROUP（A-E + MISC），明確覆蓋所有現行產品。

### 1.2 涵蓋範圍

| 涵蓋 | 不涵蓋 |
|------|--------|
| 所有 `products` 表 SKU 的單位成本來源 | `final_sale_price`（前端真理，永不從本表反推） |
| `order_items.item_base_cost` 計算依據 | 跨部位附加費 $100/$300（屬定價邏輯，不屬成本） |
| 加購配件（羊毛氈/燈飾）成本 | 鎖匙扣異部位運費扣減 $20（屬訂單層計算） |
| 繪圖費、印刷費、運費 | 客單利潤計算公式（在 n8n Calculate Profit 節點） |

---

## §2. GROUP 總覽（23-key 一覽表，DB 實測數字，見 §2.1）

| GROUP | display_group | Key 數 | 用途 |
|-------|---------------|--------|------|
| A | drawing | 4 | 繪圖成本（4 tier：嬰兒S / 嬰兒P / 成人S / 成人P） |
| B | material_3d | 2 | 立體擺設物料（木框 / 玻璃瓶） |
| C | material_jewelry | 8 | 飾品物料（鎖匙扣嬰兒/成人×2材質 + 吊飾2材質 + 頸鏈 + 環扣） |
| D | shipping | 3 | 運費（標準 / 順豐 / 吊飾多件扣減） |
| E | addon | 2 | 加購配件（羊毛氈 / 燈飾） |
| MISC | misc | 4 | 印刷費、繪圖固定費、鎖匙扣多件扣減、混合成員附加費 |

### 2.1 23 個 config_key 完整清單（0026 B1 補入 3 個，2026-06-03）

> **0026 變更**：UPDATE necklace_silver/gold 0→260/316；INSERT stainless_adult/alloy_adult=135、keychain_clasp_cost=10；UPDATE stainless/alloy display_name 補（嬰兒）。
> **⚠️ 文件修正**：前版 row 12 `clasp_cost` 為 Airtable per-product column（非 config_key），已移除並由 `keychain_clasp_cost` 取代。

| # | config_key | display_group | display_name | 現行值 | 用途 |
|---|-----------|---------------|--------------|--------|------|
| 1 | `drawing_cost_baby_s` | drawing | 嬰兒/大寶 掃描建模 (S) 繪圖費 | 60 | Bible §1 第 1 行 |
| 2 | `drawing_cost_baby_p` | drawing | 嬰兒/大寶 照片建模 (P) 繪圖費 | 110 | Bible §1 第 3 行 |
| 3 | `drawing_cost_adult_s` | drawing | 成人 掃描建模 (S) 繪圖費（限玻璃瓶） | 110 | Bible §1 第 2 行 |
| 4 | `drawing_cost_adult_p` | drawing | 成人 照片建模 (P) 繪圖費 | 240 | Bible §1 第 4 行 |
| 5 | `material_cost_woodframe` | material_3d | 木框套裝物料成本 | 210 | 木框 2肢/4肢 同成本 |
| 6 | `material_cost_glassjar` | material_3d | 玻璃瓶套裝物料成本 | 210 | 玻璃瓶 2肢/4肢 同成本 |
| 7 | `material_cost_keychain_stainless` | material_jewelry | 鎖匙扣 - 不銹鋼物料（嬰兒） | **115** | 嬰兒層；live 值（2026-06-16 更新，本表舊值 95 已過時，live 為真源） |
| 8 | `material_cost_keychain_alloy` | material_jewelry | 鎖匙扣 - 鋁合金物料（嬰兒） | **115** | 嬰兒層；live 值（2026-06-23 更新同不銹鋼收斂同價，本表舊值 122 已過時） |
| 9 | `material_cost_necklace_silver` | material_jewelry | 吊飾 - 925銀物料 | **465** | live 值（D40，migration 0046，本表舊值 260 已過時）|
| 10 | `material_cost_necklace_gold` | material_jewelry | 吊飾 - 925金物料 | **465** | live 值（D40，migration 0046，同銀拉平，本表舊值 316 已過時）|
| 11 | `necklace_chain_cost` | material_jewelry | 吊飾頸鏈成本 / 條 | 100 | **0025 新增**；P0 奇偶規則：Math.ceil(N/2)×$100 |
| 12 | `material_cost_keychain_stainless_adult` | material_jewelry | 鎖匙扣 - 不銹鋼物料（成人/家庭） | **125** | 成人/家庭層；live 值（2026-06-16 更新，本表舊值 135 已過時） |
| 13 | `material_cost_keychain_alloy_adult` | material_jewelry | 鎖匙扣 - 鋁合金物料（成人/家庭） | **125** | 成人/家庭層；**2026-07-18 Phase 2（D41）修正 135→125**，對齊不銹鋼同價 |
| 14 | `keychain_clasp_cost` | material_jewelry | 鎖匙扣環扣成本 / 件 | **10** | **0026 新增**；每件鎖匙扣金屬環扣 |
| 15 | `shipping_cost_standard` | shipping | 標準運費成本 | 0 | 既有 v1 key |
| 16 | `shipping_cost_sf` | shipping | 順豐運費成本 | 0 | 既有 v1 key |
| 17 | `charm_shipping_deduction_per_extra` | shipping | 吊飾多件運費扣減 / 件 | 35 | **0025 新增**；B1 引擎亦複用此值作 base shipping 單價 |
| 18 | `addon_cost_wool_felt` | addon | 羊毛氈加購配件成本 | 30 | 既有 v1 key 改名 |
| 19 | `addon_cost_light` | addon | 燈飾加購配件成本 | 30 | 既有 v1 key 改名 |
| 20 | `printing_cost_per_cm2` | misc | 印刷費 / cm² | 0 | 既有 v1 key |
| 21 | `drawing_cost_fixed_per_order` | misc | 繪圖固定費 / 單 | 0 | 既有 v1 key（每單一次性） |
| 22 | `keychain_shipping_deduction_per_extra` | misc | 鎖匙扣多件運費扣減 / 件 | 20 | Bible §2.5（N-1）×$20；B1 引擎亦複用此值作 base shipping 單價 |
| 23 | `mixed_member_surcharge` | misc | 混合成員附加費（成人+嬰兒） | 300 | **0025 新增**；立體擺設混合訂單加收 |

---

## §3. GROUP A — 繪圖成本（Drawing Cost）

### 3.1 名詞定義

| 名詞 | 中文含義 | 後綴/標識 | 對應 cost_config |
|------|---------|----------|------------------|
| 嬰兒 | 0–3 歲幼兒，立體倒模主角 | 無或 (S)/(P) | drawing_cost_baby_* |
| 大寶 | 4 歲以上兒童，與嬰兒共享成本層 | 同嬰兒 | drawing_cost_baby_*（共用） |
| 成人 | 18 歲以上家長 | (S)/(P) | drawing_cost_adult_* |
| 家庭 | 1 成人 + N 嬰兒/大寶的組合產品線 | (S1/S2/P1/P2) | 無獨立 key，由組合公式得出 |
| S = 掃描建模 | 實體倒模掃描，需現場製模 | SKU 含 `(S)` 或 `S1/S2` | drawing_cost_*_s |
| P = 照片建模 | 從照片建 3D，無需現場 | SKU 含 `(P)` 或 `P1/P2` | drawing_cost_*_p |

### 3.2 4-tier 成本表（權威：FHS_Pricing_Bible.md §5，Product Bible V3.7 已退役）

| Tier | Key | 金額 | 適用 SKU 範例 |
|------|-----|------|---------------|
| 嬰兒/大寶 S | `drawing_cost_baby_s` | $60 | `嬰兒鎖匙扣 - 不銹鋼`、`家庭(S1) - 嬰兒部分` |
| 嬰兒/大寶 P | `drawing_cost_baby_p` | $110 | `嬰兒(P)鎖匙扣 - 不銹鋼`、`家庭(P1) - 嬰兒部分` |
| 成人 S | `drawing_cost_adult_s` | $110 | 僅限玻璃瓶套裝中的成人肢；不獨立 SKU |
| 成人 P | `drawing_cost_adult_p` | $240 | `成人(P)鎖匙扣 - 不銹鋼`、`成人(P)吊飾 - 925銀` |

### 3.3 組合公式（家庭系列）

家庭 SKU = 成人 1 對 + N 個嬰兒/大寶肢

| SKU 系列 | 公式 | 計算 | 總繪圖費 |
|---------|------|------|---------|
| 家庭(S1) | adult_s + 1 × baby_s | $110 + $60 | **$170** |
| 家庭(S2) | adult_s + 2 × baby_s | $110 + $120 | **$230** |
| 家庭(P1) — α 純 P | adult_p + 1 × baby_p | $240 + $110 | **$350** |
| 家庭(P2) — α 純 P | adult_p + 2 × baby_p | $240 + $220 | **$460** |
| 家庭(P1) — β 混型 | adult_p + 1 × baby_s | $240 + $60 | **$300**（Phase 2 defer） |
| 家庭(P2) — β 混型 | adult_p + 2 × baby_s | $240 + $120 | **$360**（Phase 2 defer） |

> ⚠️ **β 混型聲明**：成人 P + 嬰兒 S 混搭目前不在自動計算範圍，遇到時由 Fat Mo 手動調整 `orders.net_profit`。Phase 2 才正式建模。
>
> ✅ **2026-07-18 補充（D41）**：家庭(S1/S2/P1/P2) α 純式（170/230/350/460）已用 Dashboard 前端 `calculatePricing()` 原始碼證實為現行真實邏輯，並已於 migrations 0058/0059 回填至 `products.total_base_cost`（鎖匙扣+吊飾兩品類），`fhs_check_product_cost_drift()` 已擴充覆蓋驗證零漂移。見 `FHS_System_Logic_Overview.md` §5.4.3。

### 3.4 飾數對繪圖費的影響

**結論：飾數不影響繪圖費。**

- 繪圖費是「每個 SKU 設計一次」的一次性成本
- 同一 SKU `嬰兒鎖匙扣 - 不銹鋼` 不論 order_item.quantity 是 1 或 5，繪圖費相同（皆為 $60；飾數不進 SKU 字串，見 §5.3）
- 飾數只影響材質成本（更多飾 = 更多金屬）與印刷面積

---

## §4. GROUP B — 立體擺設物料（Material 3D）

### 4.1 名詞定義

| 名詞 | 含義 | SKU 命名 |
|------|------|---------|
| 立體擺設 | Freehandsss 主力地基產品，立體倒模放入容器 | `木框套裝 (N肢)`、`玻璃瓶套裝 (N肢)` |
| 木框套裝 | 方形木質相框，倒模嵌入 | `木框套裝 (2肢)`、`木框套裝 (4肢)` |
| 玻璃瓶套裝 | 圓形玻璃容器，倒模放入 | `玻璃瓶套裝 (2肢)`、`玻璃瓶套裝 (4肢)` |
| N肢 | 肢數（2 或 4），代表容器內倒模件數 | 2肢 = 雙手 OR 雙腳；4肢 = 全四肢 |

### 4.2 成本表

| Key | 金額 | 涵蓋 SKU | 備註 |
|-----|------|---------|------|
| `material_cost_woodframe` | $210 | 木框套裝 2肢、木框套裝 4肢 | 物料成本一致，肢數差異反映在售價而非成本 |
| `material_cost_glassjar` | $210 | 玻璃瓶套裝 2肢、玻璃瓶套裝 4肢 | 同上 |

### 4.3 重要邏輯

- **立體擺設無獨立繪圖費**：肢的繪圖費由 GROUP A 承擔（依肢屬於嬰兒/大寶/成人決定）
- **2肢 vs 4肢 物料成本相同**：差異在售價（Bible §4：木框 2肢$2,080 / 4肢$2,380）反映「組合複雜度」
- **關聯**：每個立體擺設訂單，會疊加 N 筆繪圖費（依肢計） + 1 筆容器物料費

---

## §5. GROUP C — 飾品物料（Material Jewelry）

### 5.1 名詞定義

| 名詞 | 含義 | SKU 命名 |
|------|------|---------|
| 鎖匙扣 | 金屬扁平件，附鑰匙環 | `嬰兒鎖匙扣 - 不銹鋼`、`成人(P)鎖匙扣 - 鋁合金` |
| 吊飾 | 純銀/鍍金墜飾，附頸鏈 | `嬰兒吊飾 - 925銀`、`家庭(S1)吊飾 - 925金` |
| 不銹鋼 / 鋁合金 | 鎖匙扣 2 種材質 | 影響金屬成本 |
| 925銀 / 925金 | 吊飾 2 種材質（金銀同價，Bible §3） | 同價但獨立 key 保留靈活性 |
| 1飾 / 2飾 / ... 5+飾 | 同 SKU 內倒模件數 | 影響金屬用量 |

### 5.2 成本表

> **2026-07-25 起本節不再重複列數字**（S189審查揪出本節同§2.1曾經各自維護一組材質成本，兩者一度出現舊值vs新值嘅內部矛盾——屬過時/衝突病徵，根治方式係刪除重複表，非同步兩份）。適用材質/涵蓋SKU前綴嘅**現行值**一律睇 §2.1 完整 23-key 清單（key: `material_cost_keychain_stainless`／`_alloy`／`_stainless_adult`／`_alloy_adult`／`material_cost_necklace_silver`／`_gold`／`necklace_chain_cost`／`keychain_clasp_cost`）。

### 5.3 SKU 命名規律（必須記憶）

> ⚠️ **SKU 格式權威來源為 `FHS_Product_Definition.md`§3.3/§3.4**：SKU **不含飾數後綴**。飾數是 order_item 層級的 quantity 欄位，不進 SKU 字串——若 SKU 誤帶飾數後綴，會與 `products.sku` 對不上，成本查詢靜默 fallback 為 0。

```
[對象]([建模法])[品類] - [材質]
  │      │       │       │
  │      │       │       └────────── 不銹鋼/鋁合金/925銀/925金
  │      │       └────────────────── 鎖匙扣/吊飾
  │      └────────────────────────── S/P（可省略表示 S）
  └───────────────────────────────── 嬰兒/大寶/成人/家庭(S1)/家庭(P2)/...
```

範例解析：
- `嬰兒(P)鎖匙扣 - 鋁合金` = 嬰兒 + 照片建模 + 鎖匙扣 + 鋁合金（飾數另存於 order_item.quantity，非 SKU 一部分）
- `家庭(S2)吊飾 - 925金` = 1 成人 + 2 嬰兒 S + 吊飾 + 925金

### 5.4 關聯

每個飾品 order_item 成本 = 繪圖費（依對象/建模法）+ 材質物料費（依飾數倍增） + 印刷費（依面積）

---

## §6. GROUP D — 運費（Shipping）

### 6.1 成本表

| Key | 預設值 | 用途 |
|-----|-------|------|
| `shipping_cost_standard` | 0 | 一般訂單物流成本 |
| `shipping_cost_sf` | 0 | 順豐訂單物流成本 |

### 6.2 鎖匙扣多件運費扣減（特殊規則）

依 Bible §2.5：同一訂單有 N 個鎖匙扣時，扣減 `(N-1) × $20`。

→ 由 `keychain_shipping_deduction_per_extra` (預設 $20) 控制
→ 計算在 `fhs_batch_recalc_execute` RPC 第 4 步、n8n「Calculate Profit & Pack Items」節點（V47.22，`keychainShippingDeduction`，見 `n8n/Quadruple_Sync_Field_Map.md` 現行公式）

---

## §7. GROUP E — 加購配件（Addon）

### 7.1 名詞定義

| 名詞 | 含義 | 必要前提 |
|------|------|---------|
| 加購配件 | 在主產品基礎上附加的裝飾件 | **僅限立體擺設之下嘅玻璃瓶款式**（`pSubCat === '玻璃瓶款式'`），木框款式不適用（2026-07-25 cl-flow 2026-07-25-0148 糾正，前端 `Freehandsss_dashboard_current.html` 第4265/6194/6202行 `isGlass` gate 已核實） |
| 羊毛氈公仔 - 加購 | 手工羊毛氈造型配件 | 放入玻璃瓶 |
| 燈飾 - 加購 | LED 燈串配件 | 裝點玻璃瓶款式立體擺設 |

### 7.2 成本表

| Key | 金額 | 對應 products SKU |
|-----|------|-------------------|
| `addon_cost_wool_felt` | $30 | `羊毛氈公仔 - 加購` |
| `addon_cost_light` | $30 | `燈飾 - 加購` |

### 7.3 α 方案落地（本次新增）

**問題**：v1 時代加購配件**不在 products 表**，導致 n8n 計算時找不到成本而 fallback 為 0。
（參考 `.fhs/notes/addon_product_sop.md`：曾警告「絕對不能寫入 product_sku」）

**v2 解決**：將 2 個加購 SKU INSERT 到 `products` 表，`total_base_cost` 由本 schema 對應 key 鏡像同步。

```sql
INSERT INTO products (sku, total_base_cost, ...) VALUES
  ('羊毛氈公仔 - 加購', 30, ...),
  ('燈飾 - 加購',     30, ...)
ON CONFLICT (sku) DO UPDATE SET total_base_cost = EXCLUDED.total_base_cost;
```

寫入後，`fhs_batch_recalc_execute` 透過既有 `JOIN products` 自動拿到正確成本，無需特殊分支。

### 7.4 關聯

加購配件 → products 表 → order_items.subtotal_cost → orders.total_cost → orders.net_profit

### 7.5 訂單層獨立分類欄（migration 0079/0080，cl-flow 2026-07-25-0148）

`orders.accessory_cost` / `order_items.accessory_cost`（`NUMERIC(10,2) DEFAULT 0`）：修復配件成本（itemCost，$30 flat）雖已正確計入 `total_cost`，但漏落訂單層三分類 rollup（`handmodel_cost`/`keychain_cost`/`necklace_cost`）嘅顯示缺口。n8n `Calculate Profit & Pack Items`（V47.23起）新增 `accessoryCostTotal` 累加分支，同 `Supabase Mirror Prep` 傳遞至 `sync_order_to_mirror` RPC（migration 0080 擴充支援）。Dashboard `buildAuditLedgerHtml()` 財務彈窗②成本快照鏈新增「配件成本」列，`catSum` 公式已納入。歷史3張單（0600107/0600723/0696216）已 backfill（動態 `SUM(item_base_cost)`，非硬編碼）。純分類標記修復，`total_cost`/`net_profit` 數值本身不變。

---

## §8. 計算規則 & 邊界聲明

### 8.1 成本流向（全鏈路）

```
cost_configurations  ←─ Fat Mo 透過 UI 更新（fhs_upsert_cost_config RPC）
        │
        ▼ (fhs_sync_products_from_config RPC — 0022b 新增)
  products.total_base_cost
        │
        ▼ (n8n Smart Cache Strategist 拿到此值)
  order_items.item_base_cost / subtotal_cost
        │
        ▼ (fhs_batch_recalc_execute RPC — 0021 已上線)
  orders.total_cost / handmodel_cost / keychain_cost / necklace_cost / accessory_cost
        │
        ▼ (純減法)
  orders.net_profit  =  orders.final_sale_price  −  orders.total_cost
                                  ▲
                                  └── 前端真理，永不從成本反推
```

### 8.2 寫入守則

| 動作 | 允許路徑 | 禁止 |
|------|---------|------|
| 更新單筆成本 | UI → `fhs_upsert_cost_config` RPC | 直接 UPDATE cost_configurations |
| 同步到 products | RPC `fhs_sync_products_from_config` | 直接 UPDATE products.total_base_cost（除非 Migration） |
| 批量重算訂單 | UI → `fhs_apply_financial_batch_update` → n8n webhook → `fhs_batch_recalc_execute` | 直接 UPDATE orders.total_cost |
| 修改 final_sale_price | 前端 UI 編輯訂單 | 任何後端計算結果反寫 |

### 8.3 邊界與 deferred

| 項目 | 狀態 | 處理方式 |
|------|------|---------|
| β 混型訂單（成人 P + 嬰兒 S） | Phase 2 defer | Fat Mo 手動調整 net_profit |
| 跨部位附加費 $100/$300 | 屬定價邏輯，非成本 | 不在本 schema 範圍 |
| 鎖匙扣多件運費扣減 | 已含 | `keychain_shipping_deduction_per_extra` key |
| 5+飾鎖匙扣每隻 +$500/$880 | 屬定價邏輯 | 不在本 schema 範圍 |
| 羊毛氈/燈飾以外的未來加購 | 開放擴展 | 新 key + products INSERT 即可 |

### 8.4 受影響檔案總清單

> **移至 Operations 文件 §OP-6**（避免本 Core 文件臃腫）。

---

## §9. Schema 版本升級 SOP

### 9.1 版本欄位

`cost_configurations` 表新增 `schema_version TEXT DEFAULT 'v2'` 欄位，用於：
- AI 啟動時讀取確認 schema 版本
- UI 在版本不符時顯示警告 banner
- Migration 升級時用作 idempotency 判斷

### 9.2 升級流程（v2 → v3 範例）

1. **新增 keys**：在新 Migration（如 0030）中 INSERT 新 config_key + ON CONFLICT DO NOTHING（不覆蓋舊值）
2. **新增 display_group**：若需新分組，在 0030 加 ENUM value（向後相容）
3. **棄用舊 key**：標記 `is_deprecated = TRUE`，不直接 DELETE（保留歷史審計）
4. **更新 schema_version**：`UPDATE cost_configurations SET schema_version = 'v3'`
5. **更新本文件**：寫新版 `FHS_Product_Cost_Schema_v3.md`，舊版改名 `_archive_v2.md` 移到 `.fhs/ai/archive/`

### 9.3 向後相容承諾

- v2 已有的 23 個 key 名稱永不重複使用為其他用途
- v2 的計算公式（如 S1=adult_s+1×baby_s）若改變必須提供 migration script 修正歷史訂單

---

## §10. V2 統一 SKU 模型（S189，2026-07-24~25）

> **背景**：2026-06-03(S55) 將「同部位第2件起免畫圖費」嘅豁免範圍誤擴大成「主套裝已選=成條線全免（含首件）」，2026-07-24 Fat Mo 出示 2024-09-15 原始設計文件糾正。裁決新三層模型，用「V2統一SKU」取代舊有「單購/加購」二分（舊命名體系見 `FHS_Finance_Bible.md` §四附錄，僅供對照舊單，新單一律用本節模型）。

### 10.1 第四種計價路徑：products.total_base_cost 直接定值

不同於 §2-§9 描述嘅「cost_configurations 逐個 key 組合」模式，V2 SKU 嘅 `products.total_base_cost` 係 migration 直接 INSERT 嘅**單件全費**（唔經 cost_configurations 逐項相加）：

| SKU（`(V2)` 後綴） | total_base_cost |
|---|---|
| 嬰兒(S)鎖匙扣 - 不銹鋼/鋁合金 (V2) | $205 |
| 嬰兒(P)鎖匙扣 - 不銹鋼/鋁合金 (V2) | $255 |
| 嬰兒(S)吊飾 - 925銀/925金 (V2) | $660 |
| 嬰兒(P)吊飾 - 925銀/925金 (V2) | $710 |

> 現時僅覆蓋**嬰兒(baby) tier**（16個SKU，migration 0073）；大寶/成人/家庭仍用舊模型，V2擴展列為下個session待辦（見 `.fhs/memory/handoff.md` MASTER表）。

### 10.2 order_items 新增 4 欄（migration 0073，sync_order_to_mirror() RPC 由 migration 0075 擴充支援）

| 欄位 | 型別 | 用途 |
|---|---|---|
| `cost_model_version` | TEXT | `'v2_layered'`（V2品項）／`NULL`（舊模型品項） |
| `position_code` | TEXT | 左手/右手/左腳/右腳，由 `item_key` 尾綴 `_LH/_RH/_LF/_RF` 推導 |
| `drawing_waived` | BOOLEAN | 該行是否有單位被同部位共享豁免 |
| `drawing_charged_count` | INTEGER | 該行實際收畫圖費嘅單位數（0或1） |

### 10.3 核心規則（逐字，2026-07-24 Fat Mo 三度確認）

> **品項層（`order_items`）= 全額**：`item_base_cost`/`subtotal_cost`/`drawing_cost` 恆為 `quantity × 單件全費`，唔理會呢件實際有冇被同部位另一件豁免。豁免資訊只存喺 `drawing_waived`/`drawing_charged_count` 呢類 metadata 欄位，唔影響 `item_base_cost` 本身數值。
>
> **訂單層（`orders`）= 淨額 + badge**：`keychain_cost`/`necklace_cost`/`total_cost` 為扣減後嘅真實總數，差額寫入 `n8n_adjustment_notes`（type=`drawing_position_dedup_deduction`），喺財務彈窗②成本快照鏈用 badge 顯示，同運費/頸鏈共享折扣同一視覺類別。

### 10.4 同部位共享豁免公式

同一訂單、同一身體部位（`position_code`），跨鎖匙扣/吊飾共享「首件收畫圖費」資格（同一部位3D掃描只需一次）：

```
組內第一件（按packedItems原始順序，鎖匙扣優先於吊飾）：
  drawing_charged_count = 1，收 tier_drawing_rate 一次
組內其餘所有品項（含同一行第2件起）：
  drawing_charged_count = 0，豁免

畫圖費率 tier_drawing_rate：
  嬰兒(S) = $60　嬰兒(P) = $110　（見 §2.1 drawing_cost_baby_s/p）

drawing_position_dedup_deduction（訂單層扣減，寫入n8n_adjustment_notes）
  = Σ(每個非首件品項嘅 quantity × tier_drawing_rate)
```

實作：n8n workflow `FHS_Core_OrderProcessor`「Calculate Profit & Pack Items」節點 V47.22（現行 live）。歷史舊模型訂單回填見 migrations 0076-0078（架構責任分工見 `FHS_Finance_Bible.md` 新增章節「V2統一成本模型 — 架構責任」）。

### 10.5 快照聲明

以上金額為 **2026-07-25 live Supabase 查詢快照**（已用 `cost_configurations`/`products` 表核實）。如有疑問請重新查詢核實，唔好假設文件永遠反映最新值——本文件同其他markdown一樣冇自動同步機制（見 `FHS_Finance_Bible.md`「已知限制」章節）。

---

**Core 文件結束 — UI/Operations 細節見配套文件（已退役，僅供歷史參考）。**
