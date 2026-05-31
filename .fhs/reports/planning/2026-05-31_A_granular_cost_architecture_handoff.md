# A 任務接盤包 — 三層顆粒化成本架構落實

> **建立**：2026-05-31（Session 50）
> **狀態**：⏸ DEFERRED — 待新 session 接手（因 token 限制，A 與 B 分 session 執行）
> **前置依賴**：B（財務知識守門員）應先完成，因 B 是 A 的維護地基（無單一真相源，A 改完一樣會「被忘記」）
> **授權狀態**：NO-TOUCH，未 /execute。本文件為規劃接盤，非執行授權。
> **語言**：繁體中文（遵 learnings 2026-05-25 實體落盤 + 繁中 pitfall）

---

## 一、為什麼有這份接盤包（背景）

Session 49 移交兩項討論：
- **2a**：`cost_configurations` 四個 `material_cost_*` key 值均為 0
- **2b**：財務知識散落，系統時常「忘記」定價/售價/成本/折扣邏輯

Session 50 討論 2a 時，Fat Mo 提出核心質疑：**「Supabase 的 `products.total_base_cost` 根基概念不健全」**，並闡述他的三層顆粒化成本邏輯。經主 context 審閱財務相關檔案後，**確認 Fat Mo 的邏輯正確，但現行實作未實現該邏輯**。

Fat Mo 裁決：**B 先行，A 移至新 session**。本文件即為 A 的接盤依據。

---

## 二、Fat Mo 的三層顆粒化成本邏輯（原話精煉）

> 「我的核心邏輯是由最底層成本開始推疊計算出去（顆粒化）：
> 第一層 base_cost → 第二層 根據不同產品組合生成 `products.total_base_cost` →
> 第三層 客人選購實境（折扣及成本運算）結合第二層。」

| 層 | 設計意圖 | 性質 |
|----|---------|------|
| **第一層** | 原子成本：繪圖 / 印刷(鑄造) / 扣夾 / 運費 + **物料成本**（4 個 material_cost_* key）| 最底層、可維護的單一數值 |
| **第二層** | 依產品組合 **roll-up 累加** → `products.total_base_cost`（per SKU）| 應為「計算結果」，非手填 |
| **第三層** | 客人實境：`adjustment_amount`（折扣/補打）+ 成本運算，結合第二層 | 訂單層套用 |

---

## 三、現況診斷（A 必讀 — 病灶在哪）

### 3.1 三層健康度

| 層 | 現行實作 | 健康度 |
|----|---------|--------|
| 第一層 base_cost | `cost_configurations` 表存在；但 4 個 `material_cost_necklace_silver/gold`、`material_cost_keychain_stainless/alloy` = **0 且未接線**；繪圖/印刷/扣夾/運費分量未必每 SKU 齊全 | 🔴 斷裂 |
| 第二層 total_base_cost | **migration `0023_main_products_seed.sql` 硬編碼 flat 數字**（30 SKU 打包成一個總數），**不是**從第一層 roll-up | 🔴 偽顆粒 |
| 第三層 adjustment | `orders.adjustment_amount` 存在，KPI SQL 套用（成本 +adj、利潤 −adj）| 🟡 可用 |

### 3.2 核心矛盾（文件 vs 實作）

- `FHS_Finance_Bible.md` §二 與 `product_pricing_reference.md` §4.1 都聲稱：
  `total_base_cost = Drawing_Cost + Printing_Cost + Clasp_Cost + Shipping_Cost`（顆粒化）
- **但實際 0023 是人手算好的總數直接 INSERT** → 第一層改動不會自動反映到第二層
- 這就是 Fat Mo 直覺「根基不健全」的精確來源 — **文件描述的是顆粒化，實作是 flat 快照**

### 3.3 4 個 material_cost_* key 為何「填了不影響計算」

- n8n 不讀這 4 個 key，直接讀 `products.total_base_cost`（per SKU）
- `fhs_sync_products_from_config()` 只同步 addon（羊毛氈/燈飾），不碰這 4 個 key
- 即使是物料成本，也只是 total_base_cost 的「其中一個分量」，非全部（還有繪圖/印刷/扣夾/運費）
- 若貿然接線覆蓋 total_base_cost，會丟失其他三個成本分量 → **設計缺口**（Session 49 已識別）

---

## 四、A 任務的核心待決命題（需新 session 用 cl-flow 正式驗證）

1. **`products.total_base_cost` 應否改為從 `cost_configurations` 原子成本動態 roll-up？**
2. 若是，**roll-up 應在哪一層計算**？
   - 候選：Supabase View（唯讀）/ n8n 計算層 / migration 重算
   - ⚠️ 硬約束：`FHS_Finance_Bible` §十一 反模式禁止 **Postgres trigger / generated column 重算成本**
3. **4 個 material_cost_* key 如何融入**？三選一：
   - (1) 純記錄不接線（維持現狀，標記預留）
   - (2) 設計「成本分量架構 v3」後接線（material 為其中一個分量，需同時容納繪圖/印刷/扣夾/運費）
   - (3) 暫不處理，標記預留
4. **如何在不破壞「Layer 2 歷史快照不可變」原則下，讓第一層改動可控地傳播**？
   - 關鍵張力：Layer 1（即時報價）要反映最新成本；Layer 2（訂單確認後快照）不可變
   - 已確認訂單的 total_cost 不能被第一層改動污染

---

## 五、A 任務的硬約束（不可違反）

| 約束 | 來源 |
|------|------|
| 禁止 Postgres trigger / generated column 重算 `total_cost` / `net_profit` / 成本 | Finance_Bible §十一 反模式 |
| Layer 2 歷史快照（orders/order_items 成本欄）訂單確認後不可變 | Finance_Bible §二 |
| 前端利潤為最高真理，n8n 不得重算（除非前端傳 0）| AGENTS §財務真理守護 |
| 禁止改 HTML ID / captureFormState | AGENTS §3 全域硬規則 |
| NAS n8n Code Node：fetch/process.env/require 靜默失敗，須用 HTTP Request 節點或 axios | learnings 2026-05-22 + memory |
| 新增 SKU 前綴須同步 n8n Smart Cache `BASE_PREFIXES`（V47.13 已改即時查詢，但前綴仍需更新）| handoff Session 49 |

---

## 六、A 任務的影響面（預估，待 cl-flow 細化）

| 層 | 可能影響的檔案/節點 |
|----|-------------------|
| Supabase | `cost_configurations`、`products.total_base_cost`、可能新建 roll-up View；migration 0022a/0023 後續 |
| n8n | Smart Cache Strategist、Calculate Profit & Pack Items（讀成本來源若改變）|
| 前端 | `calculatePricing()`（若報價成本來源改變）— 但售價公式為 hardcode，應不受影響 |
| 文件 | Finance_Bible / pricing_reference §4 必須同步（否則再次成為誤導來源）|

---

## 七、A 新 session 接手 SOP（如何接盤）

1. `/read` 初始化 → 確認版本
2. 讀本檔（`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`）
3. 確認 B（財務知識守門員）是否已完成 — 若已完成，以守門員裁定的「權威階層」為 A 的真相錨點
4. 讀 `.fhs/ai/FHS_Finance_Bible.md` §二/§十一 + `.fhs/notes/product_pricing_reference.md` §4
5. 讀 `supabase/migrations/0003_base_cost_view_and_rpc.sql`、`0004_cost_infrastructure.sql`、`0020_financial_settings_system.sql`、`0022a/0022b`、`0023_main_products_seed.sql`
6. 對第四節 4 個命題逐一 `/cl-flow` 規劃 → A3 Verdict → 等 `/execute`

---

## 八、相關資料索引（A 接手必查清單）

| 資料 | 路徑 |
|------|------|
| 財務聖經 | `.fhs/ai/FHS_Finance_Bible.md` |
| 定價參照 | `.fhs/notes/product_pricing_reference.md` |
| 產品聖經 | `docs/FHS_Product_Bible_V3.7.md` |
| 成本遷移計畫 | `docs/plan_0004_supabase_cost_migration.md` |
| 成本基礎設施 migration | `supabase/migrations/0004_cost_infrastructure.sql` |
| 財務設定系統 migration | `supabase/migrations/0020_financial_settings_system.sql` |
| cost_config v2 schema/rpc | `supabase/migrations/0022a_cost_config_v2_schema.sql` / `0022b_cost_config_v2_rpc.sql` |
| 主力產品 seed（flat 值病灶）| `supabase/migrations/0023_main_products_seed.sql` |
| Live 成本稽核 | `finance-auditor` subagent |
| 靜態 schema 稽核 | `database-reviewer` subagent |

---

*接盤包建立者：Session 50 主 context。A 正式 cl-flow 規劃尚未啟動。*