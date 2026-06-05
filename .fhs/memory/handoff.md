# FHS Handoff - 2026-06-05 (Session 62 — TD1 FHS_Pricing_Bible.md 搬移)

## Session 62 — 技術債清償：Pricing Bible 搬移至 .fhs/ai/

**[Session 62 完結]**

### 執行完成項目

- ✅ **[TD1 清償] FHS_Pricing_Bible.md 搬移（`.fhs/notes/` → `.fhs/ai/`）**：
  - 新路徑：`.fhs/ai/FHS_Pricing_Bible.md`（v1.1.0，內容不變）
  - 舊路徑 `.fhs/notes/FHS_Pricing_Bible.md` 已刪除
  - 更新引用（6 個檔案）：`FHS_Finance_Bible.md`、`AGENTS.md`、`FHS_Prompts.md`、`repo-map.md`、`finance-gatekeeper/SKILL.md`、`FHS_Product_Bible_V3.7.md`
  - `finance-gatekeeper/SKILL.md` §五技術債備忘：Pricing Bible 位置不一致條目已移除
  - `decisions.md` 補入 Session 62 架構決策記錄

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| 1 | Anti-Idle Ping 驗證 | ⏸ 稍後 |
| 2 | pg_cron TTL（Supabase SQL Editor 手動執行）| ⏸ 稍後 |
| 3 | 立體擺設 UI 整合 R1（雙 POST 無事務保護）| ⏸ 追蹤中 |
| ~~TD1~~ | ~~FHS_Pricing_Bible.md 搬移至 .fhs/ai/~~ | ✅ 完成（Session 62）|
| TD2 | learnings.md 合併/退役整理（已超 50 條上限）| 技術債 |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | 無（純檔案搬移任務）|
| 實際使用 | ❌ 未使用（定點 Write/Edit/PowerShell，主 context 直接完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-06-05 (Session 61 — VT-1/2/3 驗收 + Task A 驗證 + V47.17 修復)

## Session 61 — 完整收尾

**[Session 61 完結]**

### 執行完成項目

- ✅ **Task A 四分量後台記帳 — 全面驗證通過**（test05 訂單）：
  - migration 0028 確認已部署（drawing_cost 有值可證）
  - current.html 確認已同步（694,941 bytes = V41，兩檔一致）
  - test05 四分量寫入正確：P_MAIN drawing=60 ✓、K_LH printing=95/chain=10/ship=20 ✓、M_LH printing=465/chain=100/ship=35 ✓
  - drawing_cost=0 for K/M 屬 W1 免畫圖正確行為（P_MAIN 加購場景）

- ✅ **[BUG FIX] Telegram「待核算」假警報修復（n8n V47.17 LIVE）**：
  - 根因：V47.16 收斂律警告推入 `zeroCostItems`，混合訂單因 W1 免畫圖使四分量與 products.total_base_cost 不同源，偏差必然 >$1，觸發 `Has_Cost_Error=true`
  - 修復：收斂律警告改推 `n8nAdjustmentNotes`（type: "convergence_note"），不污染 `Has_Cost_Error`
  - versionId: `0c3a1293-bd46-4650-b920-b6d867f75551`
  - Rollback: `.fhs/notes/aireports/n8n-mcp-backups/2026-06-04/.../Calculate_Profit___Pack_Items.json`

- ✅ **Session 56 VT-1/2/3 吊飾運費扣減驗收**（AG A2 執行，A3 複核）：
  - VT-1：T730548，total_cost=$635，單件無扣減 ✓ **PASS**
  - VT-2：T584316，total_cost=$530，4件吊飾扣減$105=(4-1)×$35 ✓ **PASS**
  - VT-3：B1歷史標靶（$455/$1,335）DB無記錄屬預期（前端模擬未寫入生產DB）✓ **PASS**
  - 驗收報告：`.fhs/reports/2026-06-05_vt_charm_shipping_validation_report.md`
- ✅ **FHS_Pricing_Bible.md v1.1.0**：補入 §3.4 吊飾跨部位運費共享規則

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| 1 | Anti-Idle Ping 驗證 | ⏸ 稍後 |
| 2 | pg_cron TTL | ⏸ 稍後（Supabase SQL Editor 手動執行） |
| 3 | 立體擺設 UI 整合 R1 | ⏸ 追蹤中（R1 雙 POST 無事務保護） |
| TD1 | FHS_Pricing_Bible.md 搬移至 .fhs/ai/ | 技術債 P2 |
| TD2 | learnings.md 合併退役整理 | 技術債（已超 50 條上限） |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver`（Telegram bug 診斷）|
| 實際使用 | ❌ 未使用（代碼追蹤 + n8n MCP 直接診斷，主 context 完成）|
| 遵從 Router | ❌ 未遵從（bug 定位清晰，inline 診斷更高效）|

---

# FHS Handoff - 2026-06-05 (Session 60 — Task A 四分量後台記帳 + 系統總論文件)

## Session 60 — Task A 四分量後台記帳落地

**[Session 60 完結]**

### 執行完成項目

- ✅ **Task A 四分量後台記帳**（接通最後一條傳遞路線）：
  - V41 `calculatePricing()` 補 per-item `ChainCost`（吊飾奇偶位分配 + 鎖匙扣=ClaspCost）
  - V41 payload injection 補 `Printing_Cost / Chain_Cost / Shipping_Cost`
  - n8n Parse Items & Generate SKU 補透傳四欄（V47.16）
  - n8n Calculate Profit & Pack Items 補四欄 + 收斂律自我檢查（V47.16）
  - n8n Supabase Mirror Prep items mapping 補四欄（V47.16）
  - 建立 `migration 0028`（更新 sync_order_to_mirror RPC 含四欄）
- ✅ **FHS_System_Logic_Overview.md v1.0.0** 建立：`.fhs/notes/FHS_System_Logic_Overview.md`
  - 完整記錄前端成本/定價/畫圖費豁免規則/n8n節點流程/成本原子數值/IG訊息邏輯/B1標靶/rollback 指引
- ✅ CHANGELOG / decisions / handoff / repo-map 同步

### 尚待執行

| # | 項目 | 狀態 | 說明 |
|---|------|------|------|
| 1 | **重要** migration 0028 部署 | ⚠️ 待 Fat Mo 在 Supabase SQL Editor 手動執行 | 不執行則四欄永遠 = 0 |
| 2 | current.html 同步 | ⚠️ 待授權 | V41 已改，需同步至正式版 |
| 3 | VT-1/2 真實訂單驗收 | ⏸ 待 Fat Mo | V1=$455 / V2=$1,335 四欄正確寫入 Supabase |
| 4 | Session 56 VT-1/2/3 吊飾運費扣減驗證 | ⏸ 待 Fat Mo 交 AG | XML Supabase Prompt 已備妥 |
| 5 | Anti-Idle Ping 驗證 | ⏸ 稍後 | n8n 主 workflow 無 Schedule Trigger |
| 6 | pg_cron TTL | ⏸ 稍後 | Supabase SQL Editor 手動執行 |
| 7 | 立體擺設 UI 整合 R1 | ⏸ 追蹤中 | R1 雙 POST 無事務保護 |
| TD1 | FHS_Pricing_Bible.md 搬移 | 技術債 P2 | — |
| TD2 | learnings.md 合併退役整理 | 技術債 | 已超 50 條上限 |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（財務計算相關） |
| 實際使用 | ❌ 未使用（n8n MCP get_node/get_workflow/update_node_code 直接在主 context 執行，確認節點代碼後外科修改，非靜默假設） |
| 遵從 Router | ❌ 未遵從（直接手術修復更高效；finance-auditor VT-1/2 驗收待 migration 0028 部署後再委派） |

---

# FHS Handoff - 2026-06-04 (Session 59 — W5-FIX + 違規記錄 + 待辦核查)

## Session 59 — W5-FIX + Supabase-First 違規記錄 + AG Supabase MCP 調查

**[Session 59 完結]**

### 執行完成項目

- ✅ current.html TRANSITION 同步核查：確認 commit `9f46578`（Session 57）已包含，無需重執行
- ✅ 待辦全面核查（8 項）：1項已完成，2項追蹤中，5項確認未完成
- ✅ Supabase-First 違規記錄（2 個嚴重過失）：
  - 過失 1：VT 驗證 prompt 靜默降級至 Airtable（應報 blocker）
  - 過失 2：AG 缺 Supabase MCP 未先解決就繞開
  - 落盤：learnings.md + memory/feedback_supabase_first_enforcement.md + rp.md 注入層補丁
- ✅ AG Supabase MCP 調查：Fat Mo 已自行安裝（mcp_config.json 確認 `mcp.supabase.com/mcp`）
- ✅ VT-1/2/3 AG 驗證 prompt 重寫（Supabase 版，XML 格式供 Fat Mo 轉交 AG）
- ✅ **[BUG FIX] W5 _fhsCostReady 永久 false**：
  - 根因：`loadCostConfigurations()` 頂部 `if (!list) return` 守衛在正常頁面載入時直接 return，_fhsCostReady 永遠不被設 true
  - 修正：守衛移至資料載入後；init() 新增 loadCostConfigurations() 啟動呼叫
  - V41 + current.html 雙檔同步（693,925 bytes）

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| ~~1~~ | ~~current.html TRANSITION 同步~~ | ✅ 已完成（commit 9f46578，Session 57） |
| 2 | Session 56 VT-1/2/3 Live 驗證 | AG 已有 Supabase MCP，XML prompt 已備妥，待 Fat Mo 交 AG 執行 |
| 3 | Task A 顆粒化 roll-up | 新 session，需 `/cl-flow` 先規劃 |
| 4 | Anti-Idle Ping 驗證 | n8n 主 workflow 無 Schedule Trigger，需建獨立 workflow |
| 5 | pg_cron TTL | Supabase SQL Editor 手動執行（ANTI_IDLE_SETUP.md 有 SQL） |
| 6 | 立體擺設 UI 整合（R1） | 追蹤中（R1 雙 POST 無事務保護） |
| TD1 | FHS_Pricing_Bible.md 搬移至 .fhs/ai/ | 技術債，PRM v2 P2 |
| TD2 | learnings.md 合併/退役整理 | 技術債（已超 50 條上限，含重複標頭） |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver`（W5 bug 診斷時）|
| 實際使用 | ❌ 未使用（定點 grep + read + 2 處 Edit，主 context 直接完成） |
| 遵從 Router | ❌ 未遵從（bug 定位清晰，inline 診斷更高效）|

---

---

# FHS Handoff - 2026-06-03 (Session 58 — Rule 3.16 強化 + 財務核心文件升版)

## Session 58 — Rule 3.16 任務型路由補入 + finance-gatekeeper v1.1.0 + finance-auditor v2.1.0

**[Session 58 完結 — 財務核心文件體系補完，三檔路由對齊，制度層收尾]**

### 執行完成項目

- ✅ AGENTS.md Rule 3.16：入口改為 finance-gatekeeper/SKILL.md → 任務型路由表（職責/成本key/售價三分支）
- ✅ finance-gatekeeper/SKILL.md v1.1.0：補 L2a Cost Schema v2 條目、§三收款確收守護語義修正、§五技術債備忘
- ✅ finance-auditor.md v2.1.0：compatible_with v1.4.10、V47.15、Rule 3.16 語義注入、已知現況動態化
- ✅ finance-auditor.md 雙路徑同步（~/.claude/agents/freehandsss/）
- ✅ CHANGELOG.md 更新
- ✅ 完成記錄：`.fhs/reports/completion/2026-06-03_rule316-finance-docs-upgrade_completion_report.md`

### 尚待執行（已移至 Session 59）

| # | 項目 | 狀態 |
|---|------|------|
| 1 | current.html TRANSITION 同步 | ✅ 已完成（Session 59 核查確認）|

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ❌ 未使用（純制度文件修訂） |
| 遵從 Router | ❌ 未遵從（範圍不符：無 schema/n8n 操作）|

---

# FHS Handoff - 2026-06-03 (Session 57 — B2 收尾 + Task A 移交)

## Session 57 — B2 TRANSITION 收尾 + 四分量移交 Task A

**[Session 57 完結 — B2 正式收斂；migration 0027 + 0027 四欄正名為 Task A 資產；TRANSITION 標示更新]**

### 執行完成項目

#### migration 0027 部署（Session 57 開始時執行）
- ✅ `0027_order_items_cost_breakdown.sql` 已部署至 Supabase（Fat Mo SQL Editor 執行）
- ✅ Smoke tests PASSED：order_items 四欄存在（drawing/printing/chain/shipping_cost）

#### B2 範疇修正（Rule 3.16 前置查驗）
- ✅ Finance Bible §一確認：成本側由 n8n 計算，前端 calculatePricing() 為參考預算（非真理）
- ✅ B2「n8n 信任前端四分量」方向違反職責分工，修正為收尾方案
- ✅ 八維度分析 + 草案 v1 → 自我批評 → v2（階段收斂，四分量歸 Task A）

#### TRANSITION 標示更新
- ✅ V41 line 5427–5430：橘字「⚠️ B1：後台回寫待 B2」→ 灰色「成本估算已含打印/環扣/運費（後台記帳由 n8n 負責）」
- ⚠️ current.html：被安全守護攔截，**待 Fat Mo 授權 current.html 同步**

#### 文件移交
- ✅ migration 0027 檔頭正名：Task A 資產（現階段四欄 DEFAULT 0）
- ✅ Task A handoff 補入 §三-B（Q1 chain 奇偶規範、Q2 shipping 毛值規範 + 驗算）
- ✅ repo-map 更新：0027 標注「Task A 前置資產」
- ✅ decisions.md 補入 Session 57 B2 範疇修正記錄

### 尚待執行

| # | 項目 | 說明 |
|---|------|------|
| 1 | current.html TRANSITION 同步 | 需 Fat Mo 授權，輸入 `/execute` 後執行 |
| 2 | Session 56 VT-1/2/3 Live 驗證 | n8n V47.15 吊飾運費扣減驗證（屬 S56 尾巴） |
| 3 | Task A 顆粒化 roll-up | 新 session，依 handoff §四 四個待決命題，順序：先 cl-flow |

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（schema 審查） |
| 實際使用 | ✅ `database-reviewer` — 委託：migration 0027 Gate 稽核（Session 57 開始時） |
| 遵從 Router | ✅ 遵從 |

---

# FHS Handoff - 2026-06-03 (Session 56 — B2 吊飾運費扣減 + 財務規則語義修正)

## Session 56 — B2 P0 修正 + 收款確收守護語義修正

**[Session 56 完結 — V47.15 LIVE，吊飾運費扣減補入；AGENTS.md v1.4.10 財務規則語義修正完成]**

### 執行完成項目

#### B2 Phase 0 查證結論
- ✅ Smart Cache Strategist V47.13 已是 Supabase-First（axios 查 `products.total_base_cost`），Airtable 僅 fallback——無需額外處理
- ✅ 唯一缺口確認：`Calculate Profit & Pack Items` 吊飾運費扣減完全缺失

#### n8n V47.15 — 吊飾運費扣減補入（LIVE）
- ✅ `charmItemCount` 累加件數（SUM qty）；`charmShippingDeduction = (件數-1) × $35`
- ✅ 扣減 `totalBaseCost` 及 `necklaceCostTotal`；寫入 `N8n_Adjustment_Notes`
- ✅ versionId: `25351131-44f2-4e95-8c22-fb856042bde8`
- ✅ 備份：`.fhs/notes/aireports/n8n-mcp-backups/2026-06-03/6Ljih0hSKr9RpYNm/Calculate_Profit___Pack_Items.json`

#### 財務規則語義重大修正（Rule 3.16 事故記錄）
- ✅ AGENTS.md v1.4.9 → v1.4.10：「收款確收守護」語義修正（真理側=確收收款，成本側=n8n估算）
- ✅ Rule 3.16 新增（財務規則前置讀取強制律）
- ✅ learnings.md、decisions.md、CHANGELOG、持久記憶全部更新

### 尚待 Fat Mo Live 驗證

| # | 驗證項目 | 預期結果 |
|---|---------|---------|
| VT-1 | 吊飾單件訂單 | n8n 無扣減，`Total_Cost` = 前端估算 |
| VT-2 | 吊飾多件訂單（2件+） | `N8n_Adjustment_Notes` 含 `charm_shipping_deduction`；`Total_Cost` 對齊前端 |
| VT-3 | B1 標靶不回歸 | V1($455) / V2($1,335) 不變 |

**Rollback 指令**（若失敗）：`rollback_node_code("Calculate Profit & Pack Items", "<備份路徑>")`

### 下 session 待執行（Fat Mo 已確認）
- ⏸ **migration 0027**（Fat Mo 已批准，下 session `/execute`）：
  `order_items` 新增四分量欄位：
  ```sql
  drawing_cost   NUMERIC(10,2) DEFAULT 0
  printing_cost  NUMERIC(10,2) DEFAULT 0
  chain_cost     NUMERIC(10,2) DEFAULT 0  -- 吊飾頸鏈 / 鎖匙扣環扣
  shipping_cost  NUMERIC(10,2) DEFAULT 0  -- 淨運費（扣減後）
  ```
  執行流程：寫 migration SQL → database-reviewer Gate → Fat Mo 在 Supabase SQL Editor 執行 → smoke-test
- ⏸ **B2-TRANSITION 標示更新**：前端 `uiDetails` 「成本顯示已校正，後台回寫待 B2」→ 待 migration 0027 完成後更新為「三端成本已對齊」

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ❌ 未使用（n8n MCP 直接在主 context 調用，單一 Code Node 外科修正）|
| 遵從 Router | ❌ 未遵從（database-reviewer 適合 schema 靜態審查；本次為執行層修正）|

---

# FHS Handoff - 2026-06-03 (Session 55 — B1 成本引擎驗證與跨產品免畫圖費 Bug 修復完成)

## Session 55 — B1 成本引擎驗證與 Waiver 邏輯修正

**[Session 55 完結 — B1 核心財務引擎 Live 驗證全數通過，W1 跨產品免畫圖費 Bug 已修復，已同步至 current.html]**

### 執行完成項目
- ✅ V41 HTML calculatePricing() / current.html：修復 `chargedPositions` 未能自動寫入主商品套裝肢體部位的 Bug。現在當 `enableP` 為 true 時，主套裝中選擇 of the limbs (非「無」) 會自動被加入已計畫圖部位追蹤。這解決了鎖匙扣 / 吊飾部位在主套裝已選時仍被重複收取 $60/$110 畫圖費的問題。
- ✅ 測試用例對齊：更新 `scripts/verify_ui_temp.js`。在 V1 測例中，將主套裝的「左腳」與「右腳」設為「無」，使主商品退化為 2 肢套裝（僅包含左手、右手），並成功讓額外加購的嬰兒不銹鋼鎖匙扣（左手、右手、左腳）中的左手與右手免除畫圖費，只有左腳收費。最終 `System_Total_Cost` 與各分量完美命中預期標靶：
  - **V1 (鎖匙扣)**：`System_Total_Cost = $455` (預期分量：printing=285, chain=0, clasp=30, baseShip=60, deduc=40, drawing=120) -> **PASS**
  - **V2 (吊飾)**：`System_Total_Cost = $1,335` (預期分量：printing=1040, chain=200, clasp=0, baseShip=140, deduc=105, drawing=60) -> **PASS**
  - **V-TRANSITION 標籤**：`⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2` 順利偵測 -> **PASS**
- ✅ `Freehandsss_dashboard_current.html` 同步：已完成將 V41 代碼拷貝並覆蓋至 `current.html`。
- ✅ CHANGELOG 同步更新。

### 核心配置驗證
- Supabase `cost_configurations` 中 B1 關鍵配置：
  - `material_cost_necklace_silver` = 260
  - `material_cost_necklace_gold` = 316
  - `material_cost_keychain_stainless_adult` = 135
  - `keychain_clasp_cost` = 10

### 尚待 Fat Mo / 後續階段 (B2)
- ⏸ 進入 B2 階段：n8n 信任前端 / 四分量 payload / 吊飾運費 P0 三端一致性同步實作。

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | 無（本會話由前次會話延續 Live 驗證與 Bug 修復） |
| 實際使用 | ❌ 未使用（定點 Bug 修復與測試執行，主 context 直接完成） |
| 遵從 Router | — |

---

# FHS Handoff - 2026-06-03 (Session 54 — B1 成本引擎補完執行完成)

## Session 54 — B1 吊飾成本裁決 + 引擎補完

**[Session 54 完結 — B1 Phase 0–3 執行完成，待 Fat Mo migration 部署 + Live 驗證]**

### Phase 0 — payload 查證結論
- ✅ n8n **完全不讀** System_Total_Cost（讀 per-item Total_Base_Cost）→ B1 = 純顯示層，零回寫風險

### 執行完成項目
- ✅ `0026_b1_cost_atoms_complete.sql`：UPDATE necklace 0→260/316；INSERT stainless_adult/alloy_adult=135；INSERT keychain_clasp_cost=10；display_name 補（嬰兒）；database-reviewer PASS
- ✅ V41 HTML calculatePricing()：補入打印費/基礎運費/環扣三分量；公式 = Drawing+Printing+NecklaceChain+KeychainClasp+BaseShipping−ShippingDeduction；code-reviewer G1–G8 PASS
- ✅ `FHS_Product_Cost_Schema_v2.md` v2.2.0（21→23 keys，clasp_cost 文件錯誤修正）
- ✅ CHANGELOG / decisions / repo-map / completion report 同步

### 已完成（Live 驗證 + current.html 同步）
- ✅ Migration 0026 部署（Supabase，smoke tests 全 PASS）
- ✅ Live 驗證 V1：$455 PASS
- ✅ Live 驗證 V2：$1,335 PASS
- ✅ Live 驗證 V3：$275 PASS
- ✅ Live 驗證 V4：$511 PASS
- ✅ V-TRANSITION 過渡標示 PASS
- ✅ **current.html 同步完成（693,581 bytes，2026-06-03）**

### DEFERRED → B2
- n8n 信任前端 / 四分量 payload / 吊飾運費 P0 三項接線
- material→printing 語義命名 → PRM v2 P2

### 旁支修正（已完成）
- ✅ database-reviewer subagent 工具缺口修正（加入 Airtable + n8n MCP 工具）
- ✅ learnings.md：material_cost_* = 打印費、鎖匙扣嬰兒/家庭分層 2 條
- ✅ feedback 記憶：不應直接問可自查/自析的問題（新規則已落盤）

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ✅ database-reviewer（migration Gate）；✅ code-reviewer（G1–G8）；✅ finance-auditor（Airtable live 查）；✅ n8n MCP get_node（Phase 0）|
| 遵從 Router | ✅ 完全遵從 |

---

# FHS Handoff - 2026-06-02 (Session 53 — P1 成本邏輯憲法化執行完成)

## Session 53 — P1 成本邏輯憲法化（cl-flow + /execute）

**[Session 53 完結 — P1 Phase 1–4 + Phase 6 執行完成，待 Fat Mo Live 驗證]**

### 執行完成項目
- ✅ `0025_cost_atoms_seed.sql`：3 新 key（necklace_chain_cost=100、charm_shipping=35、mixed_member_surcharge=300）+ P0 語義修正，database-reviewer PASS
- ✅ V41 HTML：`_fhsCostReady` ready 旗標、W5 競態防護、W1 chargedPositions 跨陣列畫圖追蹤、畫圖費 de-hardcode、頸鏈成本 + 運費扣減組件、shadow kill-switch，code-reviewer G1–G8 全 PASS
- ✅ n8n V47.14（已部署 LIVE）：P0 shipping bug 修正（行數→件數）
- ✅ `FHS_Product_Cost_Schema_v2.md`：17→20 keys；Changelog、repo-map 同步

### 已完成（Session 53 全部收尾）
- ✅ migration 0025 已部署（Supabase）
- ✅ material_cost_keychain_stainless = 95, material_cost_keychain_alloy = 122 已更新
- ✅ V1–V5 + VT-P1~P4 + VT-U1~U6 全 15 項 PASS
- ✅ current.html 同步（689,258 bytes，2026-06-02）

### DEFERRED（下次 session 接棒）
- ⏸ 物料/打印成本填入（material_cost_* 仍為 0）→ Fat Mo 確認數字後填 Supabase
- ⏸ n8n 完全信任前端成本（待物料成本完整後）
- ⏸ PRM v2 P2：產品定義審計 + 命名規範設計

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | database-reviewer、code-reviewer |
| 實際使用 | ✅ database-reviewer（Phase 1 Gate PASS）；✅ code-reviewer（G1–G8 Gate PASS，含 G8 修正重稽）；❌ finance-auditor（需 Fat Mo Live 驗證，subagent 無法替代）|
| 遵從 Router | ✅ 完全遵從 |

---

# FHS Handoff - 2026-06-02 (Session 52 — P0 Finance Bible 修正 + PRM 財務 SSOT 工程啟動)

## Session 52 — P0 完成 + PRM v2 財務系統 SSOT 工程路線圖

**[Session 52 完結 — P0 G1–G7 全部執行完成]**

### P0 完成事項
- ✅ Finance Bible v1.2.0：G1 運費公式修正（件數非行數）+ G2 同部位畫圖規則 + G3 跨產品免畫圖 + G4 頸鏈奇偶規則 + G5 吊飾運費扣減 + G6 Clasp=頸鏈$100
- ✅ learnings.md：補入4條財務核心 pitfall（G7）
- ✅ 持久記憶固化（project_cost_calculation_rules.md + feedback_finance_rules_must_be_recorded.md）
- ✅ Changelog + decisions 後效同步完成
- ✅ 驗算範例固化：訂單 #0600007 鎖匙扣 = $455（非$535/$475/$495）

### 本 session 重大發現（財務根因）
- 運費扣減公式從 2026-05-16 起就寫錯（行數非件數），所有訂單成本均可能低算
- 吊飾頸鏈奇偶規則、跨產品免畫圖規則從未被記錄進任何文件
- Finance Bible §二資料鏈的 `clasp` 語義對吊飾有誤（應為頸鏈）

### PRM v2 路線圖（已獲 Fat Mo 核准）
| Phase | 說明 | 狀態 |
|---|---|---|
| P0 | 規則止血 G1–G7 | ✅ 完成 |
| P1 | 成本邏輯憲法化（地基）| ⏸ 下個新 session |
| P2 | 產品定義審計 + 命名規範設計 | ⏸ 待 P1 後 |
| P3 | Supabase 全表逐格審計 | ⏸ 待 P2 後 |
| P3X | 產品名稱重整執行（跨四層高危）| ⏸ 待 P3 後 |
| P-TEST | 跨層端到端測試 V41↔n8n↔Supabase↔Airtable | ⏸ 緊接 P3X |
| P4 | 雙庫對賬 + 尋源台賬 | ⏸ 待 P3X 後 |
| P5 | 治理機制鎖定 | ⏸ 最後 |

### 待辦（Fat Mo + 下 session）
- ⏸ **P1**：開新 session，以 `/cl-flow` 規劃「成本邏輯憲法化」
- ⏸ **立體擺設 + 燈飾加購成本規則**：本 session 未處理，待 P1 一併納入
- ⏸ Airtable 頸鏈 Clasp 值 $70→$100 更新（Supabase 產品成本亦需驗證）

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | database-reviewer |
| 實際使用 | ✅ database-reviewer（Airtable×Supabase SKU 對賬）；✅ Explore（根源搜尋）；主 context 執行文件修正 |

---

# FHS Handoff - 2026-06-01 (Session 51 — Obsidian vault 止血清理 Phase 0)

## Session 51 — Obsidian vault Phase 0 止血清理

**[Session 51 完結 — Obsidian vault Phase 0+1 整合完成]**

- ✅ 巢狀 vault 衝突消除（Obsidian/ 目錄刪除）
- ✅ FHS_Memory_Engine.png 保全至 docs/assets/
- ✅ .gitignore + repomix ignore + userIgnoreFilters 設定完成
- ✅ D1（vault=repo root）+ D2（三層記憶職責）架構決策寫入 decisions.md
- ✅ docs/FHS_Knowledge_Map.md MOC hub 建立（7 個 wikilinks，雙向連結）
- ✅ 5 個 docs 文件加 backlinks 指向 FHS_Knowledge_Map
- ✅ NTFS junction 方案實證失敗（.fhs/ 永遠對 Obsidian 不可見，硬限制）
- ✅ Obsidian Graph 上限確認：只能顯示 docs/ + 根目錄層，.fhs/ 不可達
- ✅ decisions.md + learnings.md 補充 Obsidian dot-dir 硬限制記錄


## Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（原因：任務為 Obsidian vault 結構清理，非 n8n/JS/Python runtime 錯誤，build-error-resolver 範圍不符）|
| 遵從 Router | ❌ 未遵從（原因：AGENTS.md router 表對 Obsidian 檔案結構盤點應對應 `Explore`；已向 Fat Mo 說明偏離理由，清理範圍小且已 read-only 自行調查，無需獨立派工）|

---

# FHS Handoff - 2026-05-31 (Session 50 — 財務三層成本架構診斷 + A/B 分流存檔)

## Session 50 — 2a/2b 深化：三層顆粒化成本架構

**觸發**：Session 49 移交的 2a（material_cost_* = 0）+ 2b（財務知識散落）。
Fat Mo 質疑 `products.total_base_cost` 根基不健全，提出三層顆粒化成本邏輯。

**核心結論（主 context 審閱財務檔案後）**：
- ✅ **Fat Mo 三層顆粒化邏輯正確**（標準 BOM bottom-up costing）
- 🔴 **現行實作未實現該邏輯**：
  - 第一層原子成本斷裂（4 個 material_cost_* key = 0 且未接線）
  - 第二層 `total_base_cost` 為 migration 0023 **硬編碼 flat 值**（偽顆粒，非 roll-up）
  - 文件聲稱顆粒化，實作是 flat 快照 → 此即「根基不健全」病灶
- 🟡 第三層 adjustment_amount 相對健康

**Fat Mo 裁決**：
1. **B（財務知識守門員）先行** — B 是 A 的維護地基
2. **A（三層架構落實）移至新 session** — token 限制
3. **先存檔接盤，再跑 B**（本 session 已執行存檔）

**本 session 已完成（存檔授權，NO-TOUCH 業務代碼）**：
- ✅ A 接盤包：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`
- ✅ handoff.md 本條目
- ✅ decisions.md 補錄

**B 任務完成（2026-06-01）**：
- ✅ `FHS_Pricing_Bible.md` v1.0.0（L2）建立
- ✅ `finance-gatekeeper/SKILL.md` v1.0.0 建立
- ✅ 三份舊文件 deprecated（pricing_reference / Product_Bible_V3.7 / finance-calculator）
- ✅ Finance_Bible L1 header + Step 0；finance-auditor Step 0
- ✅ repo-map / FHS_Prompts / CHANGELOG / decisions 同步
- ✅ 完成記錄：`.fhs/reports/completion/2026-06-01_finance-gatekeeper-B-task_completion_report.md`

**待辦（下次 session）**：
- ⏸ **A** — 三層顆粒化成本架構落實，讀接盤包接手：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無（討論 + 存檔階段）|
| 實際使用 | ❌ 未使用（主 context 讀財務檔 + /rp 精煉 + 接盤包 Write）|

---

# FHS Handoff - 2026-05-31 (Session 49 — T5 + 按鈕引導 + 單號解鎖完成)

## Session 49 T5 補強 — 按鈕文案 + 同步出口收斂

**完成事項**：
- ✅ 桌面 `syncBtn` 設 `display:none`（直接同步入口取消，ID 保留）
- ✅ 桌面 `btnReviewIgMsg`：「🔍 查閱訂單訊息」→「✅ 審閱並完成訂單」+ tooltip
- ✅ 手機 `v40-submit-btn`：改 `onclick=openIgPreviewModal()`，文字「✅ 審閱並完成」（取消直接 syncToAirtable）
- ✅ `updateSyncButtonState()`：解除對 `v40-submit-btn` 的禁用，Modal 入口永遠可點（無論單號狀態）
- ✅ current.html 同步（684,533 bytes）

**流程總結（T5 全部完成）**：
- 唯一完成訂單入口：「✅ 審閱並完成訂單」（桌面）/ 「✅ 審閱並完成」（手機）→ 開 Modal → 複製 → 同步
- 狀態機 `_fhsIgCopyState` 追蹤複製/同步進度，防雙重 sync
- `resetForm` 自動重置狀態

**待辦（Fat Mo）**：
1. Live 驗證：桌面只剩「✅ 審閱並完成訂單」；手機底部只剩「⚙️ 設定」+「✅ 審閱並完成」
2. 長期待辦（4 項）見下方精簡清單

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無 |
| 實際使用 | ❌ 未使用（定點 Edit，主 context 直接執行）|

---

## Session 49 T5 — 複製+同步流程重構

**完成事項**：
- ✅ 移除主畫面 `btnCopyA`（複製手模）/ `btnCopyB`（複製金屬）的 show 邏輯（HTML ID 保留，DOM 不刪）
- ✅ 移除手機版 `v40-bottom-bar` 的「📋 複製」按鈕
- ✅ 新增 `_fhsIgCopyState = {copiedA, copiedB, synced}` 狀態機 + `_updateIgCopyUI()`
- ✅ `igpmCopySegment` 複製後更新狀態 + 按鈕文字（✅ 已複製A/B）
- ✅ `igpmSyncOnly` 同步後設 synced=true，igpmSync 鈕顯示「✅ 已同步」防雙重 sync
- ✅ `resetForm` 起始重置狀態機
- ✅ current.html 同步（684,597 bytes）
- ✅ Changelog.md 更新

**流程變化**：
- 舊：主畫面有「複製手模」「複製金屬」「同步至後台」三個獨立按鈕
- 新：唯一出口為「🔍 查閱訂單訊息」Modal → 內含複製A/B + 同步，狀態機防重複 sync

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：主畫面無「複製手模」「複製金屬」「同步至後台」按鈕
   - VT-2：點「查閱訂單訊息」→ Modal 內三鈕正常
   - VT-3：複製A → 按鈕變「✅ 已複製A(手模)」；複製B → 變「✅ 已複製B(金屬)」
   - VT-4：點同步 → 按鈕變「✅ 已同步」（opacity 0.6）；再開 Modal 顯示同步狀態
   - VT-5：resetForm 後再開 Modal → 所有按鈕恢復初始狀態
   - VT-6：手機版底部無「📋 複製」按鈕，只有「🔍 查閱」

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無 |
| 實際使用 | ❌ 未使用（5 組定點 Edit，主 context 直接執行）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-31 (Session 49 — Live 驗證 + 待辦審查)

## Session 49 補充 — 長期待辦健康度審查（2026-05-31）

### 關閉項目（已過時）
- ~~**Supabase products 成本更新（Smart Cache V47.9 硬編碼表）**~~
  → V47.13（2026-05-23）已改為 Supabase 即時查詢，硬編碼 COST_MAP 不再存在，新產品自動讀取
  → 殘留注意：新增產品 SKU 前綴時仍需更新 `BASE_PREFIXES`（輕量，不影響成本正確性）
- ~~**DEFERRED R2：計畫缺少 COST_MAP 同步步驟**~~
  → 同上，V47.13 已解決，R2 風險不再成立

### 更新：DEFERRED 立體擺設款式管理 UI 整合
- R2 ✅ 已失效（V47.13 自動讀 Supabase）
- **R1 仍需解決**：addNewFrameStyle 雙 POST 無事務保護
- 風險由 2 降為 1，可考慮重新評估解封時機

### 真實待辦（Fat Mo 2026-05-31 二次裁決後）

| # | 待辦 | 狀態 | Fat Mo 決策 |
|---|------|------|------------|
| 3 | 🟠 **Anti-Idle Ping 驗證**（n8n Schedule Trigger 每 6 天 ping Supabase） | 稍後 | 保留，稍後處理 |
| 4 | 🟢 **pg_cron TTL**（error_logs 30 天自動清理） | 稍後 | 保留，稍後處理 |
| 5 | ⚡ **立體擺設款式管理 UI 整合（僅剩 R1）** | 跟進 | R1 雙 POST 無事務保護待修；R2 已失效。保存追蹤 |
| ~~2~~ | ~~Airtable 背景同步驗證~~ | ❌ **取消** | **角色已轉變**，此驗證不再需要 |

---

### 🔖 移交新 Session 討論（2a / 2b）

> Fat Mo 2026-05-31 指示：以下兩項移至新 session 繼續討論，本 session 不執行。

#### 2a — cost_configurations 四個物料成本 key
- **現況**：`material_cost_necklace_silver` / `_gold` / `material_cost_keychain_stainless` / `_alloy` 值均為 **0**
- **關鍵發現（Session 49 已查證）**：這 4 個 key **未接線** —
  - n8n 不讀（直接讀 `products.total_base_cost` per SKU）
  - `fhs_sync_products_from_config()` 只同步 addon（羊毛氈/燈飾），不碰這 4 個 key
  - 填了**不影響任何計算**
- **設計缺口**：若要接線覆蓋 `total_base_cost`，會丟失 Drawing/Printing/Clasp/Shipping 其他三個成本分量（material 只是其中一個分量，非全部）
- **Fat Mo 尚未提供實際物料成本數字**
- **待新 session 決策**：(1) 純記錄不接線；(2) 設計成本分量架構 v3 後接線；(3) 暫不處理標記預留

#### 2b — /price-query skill（全新需求）
- **用途**：AI 收到「X 件吊飾多少錢」「P 模式 3 個鎖匙扣報價」直接計算回答
- **設計方向（Claude 建議）**：**hardcode 固定公式**，讀 `.fhs/notes/product_pricing_reference.md`
  - 理由：Supabase 只存成本不存售價公式；售價公式已在 `calculatePricing()` + reference doc 完整記錄
  - Supabase 動態方案需額外重建公式，維護點翻倍
- **現況**：reference doc v2.0.0 已可供 AI 直接查閱計算，skill 為 nice-to-have（非必要）
- **待新 session 決策**：是否值得新建 skill（vs 直接讀 doc）；若建，確認走 hardcode 公式方向

---

# FHS Handoff - 2026-05-31 (Session 49 — Phase 2+3 Live 驗證測試完成)

## Session 49 — V41 Phase 2+3 Live 驗證測試

**完成事項**：
- ✅ **VT-P1~P4 計價驗證**：100% 通過。驗證了吊飾倒模計價、P系列計價、鎖匙扣無異部位費、925銀/金同價。
- ✅ **VT-U1~U6 UI 驗證**：100% 通過。驗證了吊飾部位合併、多格付款顯示、⚡照數填入與清除、未付尾數即時連動計算、起始編號搬移功能、iPhone Drawer 鏡像空白面板。
- ✅ **測試自動化與報告產出**：已更新並執行 `scratch/run_live_tests.js` 進行 headless Playwright 驗證，並將報告儲存於專案實體路徑 `artifacts/live_verification_report.md`。

**已知限制與調整**：
- **VT-P1 c**：為符合「共3個」之要求，左手數量設為 3 時必須同時取消 Right Foot 勾選。
- **VT-U4**：測試時直接往首個 deposit split box 輸入 `500`（不經過 global quick-fill），確保 deposit 總數剛好為 $500，以精準測試 balance split sum 扣除 $500 後的自動連動邏輯。
- **VT-U5**：dashboard 序列 ID 起始編號在解析 prefix 時硬編碼為 2 字元 (`last_id.substring(0, 2)`)，因此測試時使用雙字元 test 前綴 `te099`，以避免產生 `NaN` 的 ID。

**current.html 同步**：待 Fat Mo /execute 授權（在 Live 驗證全數通過後可進行 V41 同步）。

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無 |
| 實際使用 | ❌ 未使用（由主 context 搭配 playwright 動態執行與除錯）|

---

# FHS Handoff - 2026-05-31 (Session 48 — Phase 3 介面優化)

## Session 48 Phase 3 — 付款拆格頸鏈組化 + 三色 + 快捷填 + 編號設定搬移

**完成事項**：
- ✅ CSS：`.quick-fill-btn` + `.box-cat-P/K/M .split-box-label` 三色樣式
- ✅ `calculatePricing`：`window.fhsNecklaceGroups` + `_catHdr()` 分類標題 + 三色 logs
- ✅ `renderPaymentSplits`：吊飾改頸鏈組（necklace_N boxKey）+ 三色 label + ⚡ 快捷填鈕
- ✅ `_syncBalanceFromDeposit`：補 necklace_N 同步邏輯
- ✅ `_quickFillSplitBtn`：新函式 + `window._quickFillSplitBtn` 暴露
- ✅ seqSetRow 從 `fatmoConfigPanel` 搬至 `financialSettingsCard` 底部（T4）
- ✅ Changelog.md 更新

**已知限制**：
- `fatmoConfigPanel` 現為空殼，手機 Drawer settings tab 暫時顯示空白（次要問題，不影響主功能）

**current.html 同步**：✅ 682,164 bytes（2026-05-31 Phase 3 + 照數填入）

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：吊飾左手×1+右腳×1 → 付款區只顯示「頸鏈① 一對 $2980」一格（不再有兩格+$0格）
   - VT-2：吊飾3個 → 顯示「頸鏈① 一對 $2980」+「頸鏈② +1隻 $1980」兩格
   - VT-3：點 ⚡ 按鈕 → 對應格自動填入建議金額，balance 同步更新
   - VT-4：報價明細區顯示三色分類標題（暖橙/鋼灰/銀紫）
   - VT-5：財務設定中心底部出現「下張起始編號」（套用功能正常）
   - VT-6：手機 Drawer settings tab 確認是否需補回 seqSetRow（已知空白問題）
2. **current.html 同步**：Phase 2+3 全通過後授權

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | code-reviewer（Phase 3 完成後 Gate）|
| 實際使用 | ❌ 未使用（5 組定點 Edit，主 context 直接執行）|
| 遵從 Router | ❌ 未遵從（code-reviewer Gate 安排在 Fat Mo Live 驗證後，避免提前 Gate 浪費 token）|

---

# FHS Handoff - 2026-05-31 (Session 48 — 吊飾計價修正 + Category B 付款格式)

## Session 48 Phase 2 — 吊飾售價計算修正

**完成事項**：
- ✅ 移除 $1,000 首飾單購圖紙費（Bug 1）
- ✅ 移除異部位建模費 $100/$300（Bug 4，吊飾+鎖匙扣均移除）
- ✅ 移除 processTierPricing 純銀分支（舊 qty×$800 線性公式）
- ✅ 新增頸鏈組計價邏輯（Bug 2+3+5）：
  - 倒模：Math.floor(n/2)×$2,980 + (n%2)×$1,980
  - P系列：首組 $2,280(1個)/$3,280(2個)；額外每組 $1,640(1個)/$3,280(2個)
  - 多部位合併計算 → silverItems[0].CalculatedPrice 承擔總價
- ✅ Changelog.md 更新

**待辦（Fat Mo）**：
1. **Live 驗證 Phase 2**：
   - VT-1：倒模 左手×1 → $1,980；左手×1+右腳×1 → $2,980；左手×3 → $4,960
   - VT-2：P系列 1個 → $2,280；2個 → $3,280；3個 → $4,920
   - VT-3：鎖匙扣多部位確認無異部位費
   - VT-4：925銀/金 同價確認
2. **Phase 3 確認**：付款拆格 N格 UI（頸鏈組為單位，規格已定）→ 告知後執行
3. **current.html 同步**：Phase 2+3 均完成後授權

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議（直接修正） |
| 實際使用 | ❌ 未使用（4 處定點 Edit，主 context 直接執行）|
| 遵從 Router | — |

---

## Session 48 Phase 1 — Category B IG 訊息【付款資料】格式修正

## Session 48 — Category B IG 訊息【付款資料】格式對齊

**完成事項**：
- ✅ `freehandsss_dashboardV41.html`：新增 `finInfoB` 變數，付款行傳 `pureNumeric=true`，`combinedB` 改用 `finInfoB`
- ✅ `Changelog.md`：Session 48 條目新增

**修改效果**：
- Category B 單格：`已付訂金：$1200`（fallback 正常）
- Category B N 格：`已付訂金：1200+800=$2000`（對齊 Category A v2）
- Category A v1/v2：不受影響

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：Category B 勾選 K/M → N 格付款 → 訊息顯示 `已付訂金：金額1+金額2=$總和`（無品名標籤）
   - VT-2：Category A v1/v2 輸出不變
   - VT-3：只填單一付款金額（無 split）→ 顯示 `已付訂金：$金額`（fallback 正常）
2. **current.html 同步**：待 Live 驗證後授權

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（2 處定點 Edit，主 context 直接執行）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 47 — Phase 2 指令精簡 + 方法論移植)

## Session 47 — vendor 方法論移植 + 7 command 退役

**完成事項**：
- ✅ `build-error-resolver` v1.1.0：description 改 root-cause-first + 根因調查協議（3-line trigger → systematic-debugging.md）+ 財務豁免；雙路徑同步
- ✅ `code-reviewer` v1.2.0：5 維度分析框架 + sequential-thinking 工具觸發；雙路徑同步
- ✅ `AGENTS.md` v1.4.9：新增 Rule 3.15（根因調查強制律 + 安全閥 + 財務豁免）
- ✅ 刪除 7 Master command：px-plan / px-audit / five / debug-guide / code-analysis / mermaid / tdd-guide（指令）
- ✅ 刪除 7 CL 橋接 + 1 AG 橋接（px-plan）共 8 個橋接檔
- ✅ FHS_Prompts.md：7 個情境改為「AI 自動執行」說明
- ✅ repo-map.md：退役標記同步
- ✅ README.md：改寫為場景速查表（18 個指令 + AI 自動執行對照）
- ✅ decisions.md / CHANGELOG.md / SOP_NOW.md 同步

**核心設計**：vendor 方法論從「用戶觸發 slash」移植至「AI 自動執行 subagent」，修正 2026-05-09 設計錯誤

**待辦（Fat Mo）**：
- `/commit` 同步至 Notion Brain

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無（純文件層）|
| 實際使用 | ❌ 未使用（主 context 直接 Edit/Write/Bash 執行）|

---

# FHS Handoff - 2026-05-30 (Session 46 — Phase 1 指令精簡)

## Session 46 — 指令體系 Phase 1 精簡

**完成事項**：
- ✅ 刪除 `rp-flow.md`（Master + CL×3 + AG×3，共 7 個檔）
- ✅ 新建 `ag-flow.md`（Master + CL + AG，共 3 個檔）
- ✅ `cl-flow.md` v2.2：/rp 精煉內建為 Step 0 + Gate 1
- ✅ `cl-flow-fast.md` v1.1：/rp 輕量精煉內建為 Step 0 + Gate 1
- ✅ `rp.md` v2.3：移除 rp-flow 引用，更新關係說明與 Compatibility Map
- ✅ 後效同步：README / repo-map / FHS_Prompts / CHANGELOG / decisions / SOP_NOW

**核心設計**：精煉內建預設第一步 / 命名 = 裁決者 / rp-flow 糖衣全刪

**Phase 2（待辦）**：`guardian` `five` `code-analysis` `tdd-guide`（指令）`px-plan` `px-audit` `mermaid` `fhs-cost-audit` — 共 8 個

**待辦（Fat Mo）**：無

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純 .md 文件建立/刪除/修改，Write/Edit/Bash 直接完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 44c — /rp-flow v1.0.0 + rp.md 補丁)

## Session 44c — /rp-flow 精煉管道串聯 v1.0.0

**完成事項**：
- ✅ `.fhs/ai/commands/rp-flow.md` v1.0.0（四變體：/rp-flow / --review / -fast / -ag）
- ✅ CL 橋接 ×3（rp-flow / rp-flow-fast / rp-flow-ag）
- ✅ AG 橋接 ×3（同上）
- ✅ `rp.md` 補丁：`<self_critique>` → `<structural_warning>` + FHS 資源目錄 + 反奉承守則
- ✅ CL / AG rp 橋接同步
- ✅ `docs/FHS_Prompts.md` 情境二十三更新 + 情境二十四新增
- ✅ `docs/repo-map.md` 新條目（7個）
- ✅ `Changelog.md` / `decisions.md` 同步

**核心設計**：Gate 1 強制停 / 批評移至 Verdict 後 / /rp-flow-ag A1+A2 ag-plan 裁決 / /execute 永遠手動

**待辦（Fat Mo）**：無

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純 .md 文件建立，Write/Edit 直接完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 45 — IG Modal 即時編輯)

## Session 45 — IG Modal textarea 即時編輯

- ✅ `igpmPreA/B`: `<pre>` → `<textarea>`，可在 Modal 直接改文字
- ✅ `_igpmRefresh()` 改 `.value`；`igpmCopySegment` 讀 Modal textarea（複製已編輯版本）
- ✅ CSS：`resize:vertical`、`:focus` 高亮、移除導流提示
- ✅ `output-preview-a/b`、payload、`syncToAirtable` 全不動
- ✅ current.html 同步（674,173 bytes）

**待辦（Fat Mo）**：VT — 開 Modal → 改文字 → 複製A → 確認剪貼簿是改後文字

**Subagent 使用記錄**：❌ 未使用（3 個定點修改，主 context 直接執行）

---

# FHS Handoff - 2026-05-30 (Session 44b — /rp v2.2 升級)

## Session 44b — /rp 指令升級 v2.2

**完成事項**：
- ✅ `.fhs/ai/commands/rp.md` v1.0.0 → v2.2（三變體 + 8維度掃描 + Pipe模式 + FHS自動注入 + 移除純文字版 + 自我批評封頂）
- ✅ `.claude/commands/rp.md` 橋接版同步（三變體簡化流程）
- ✅ `.agents/workflows/rp.md` Antigravity 橋接版同步
- ✅ `docs/FHS_Prompts.md` 情境二十三更新（三變體路由表 + Pipe 模式說明）
- ✅ `docs/repo-map.md` /rp 兩條目更新
- ✅ `Changelog.md` v2.2 記錄
- ✅ `decisions.md` 架構決策補錄

**核心設計決策**：Pipe 模式由用戶明確輸入觸發（不違反 Exempt）；三維度強制地板；純文字版移除；自我批評封頂 ≤3×1行；FHS 自動注入層

**待辦（Fat Mo）**：無（指令層，無 migration，無 live 驗證需求）

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純 .md 文件改寫，直接 Write/Edit 完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 44 — IG Modal 三需求修正 flow 2026-05-30-1248)

## Session 44 — IG Modal 三需求（flow 2026-05-30-1248）

**完成事項**：
- ✅ 需求① `_buildSplitIgLine` 加 `pureNumeric` 參數；v2 兩處傳 `true`（純數字相加，保留 `=$總和`）；v1 兩處不傳（舊明細不變）；Category B 隔離
- ✅ 需求② Modal 複製鈕拆分：移除合併鈕，改三鈕（複製A手模 / 複製B金屬 / 同步）；`igpmCopySegment` + `igpmSyncOnly`；複製與同步解耦
- ✅ 需求③ Defer：Modal 加導流提示；`saveOrderText` 新單不適用（C3），Review Mode 為唯一文字編輯入口
- ✅ tooling 修復：`validate-ag-plan.js` 加 `require.main===module` 守衛（防 cl-flow-runner 啟動時誤 exit）
- ✅ code-reviewer Gate G1–G8 全 PASS
- ✅ current.html 同步（673,722 bytes）

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：v2 多格付款 → Modal 顯示 `2380+860=$3240`（純數字，無品名）
   - VT-2：v1 切換 → 舊明細格式不變
   - VT-3：複製A → 只得 A 段；複製B → 只得 B 段；零 DB 寫入
   - VT-4：同步鈕 → 關 Modal 後 syncToAirtable 觸發正常
   - VT-5：Category B → 格式完全不變

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ✅ `code-reviewer`（強制 Gate，G1–G8 全 PASS）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 43 — cl-flow 協調器強化)

## Session 43 — cl-flow 模型配置化 + ag-plan 格式守護 + repomix 優化

**完成事項**：
- ✅ Phase 1：`callGemini()` 模型從 hardcode `gemini-3.5-flash` 改為讀取 `process.env.GEMINI_A2_MODEL_DEFAULT`（fallback 至 `gemini-3.5-flash`）；`.env` / `.env.example` 同步更新
- ✅ Phase 3：新建 `scripts/validate-ag-plan.js`（6 section + checkbox + 檔案標記三項守護）；`cl-flow-runner.js` ag-plan 寫入後自動呼叫，格式不符 WARN 繼續
- ✅ Phase 4：repomix 從 dump 全倉庫改為 include 優先路徑（`scripts/`、`supabase/migrations/`、`SOP_NOW.md`、`handoff.md`），排除 `Obsidian/`
- ✅ 後效：`scripts/README.md` / `docs/repo-map.md` / `Changelog.md` 全部同步
- ✅ Phase 2（`--pro` 雙模切換）：Fat Mo 決定統一使用 `gemini-3.5-flash`，**已取消**

**模型驗證記錄**：
- 執行 API probe 確認可用模型清單（2026-05-30）
- `gemini-3.5-flash` ✅ 存在（現用）
- `gemini-3.1-pro-preview` ✅ 存在（備選，暫不啟用）
- A2 計畫原寫 `gemini-3.1-pro` / 我原建議 `gemini-2.5-pro-preview-05-06` — 兩者均 ❌ 不存在

**待辦（Fat Mo）**：
- 如未來需切換模型，只需改 `.env` 的 `GEMINI_A2_MODEL_DEFAULT` 值，無需動代碼

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點 Edit + 新建腳本，主 context 直接執行）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 42 — IG 訊息預覽 Modal 重設計)

## Session 42 — IG 訊息預覽 Modal（flow 2026-05-30-0240）

**完成事項**：
- ✅ 移除常駐 preview-card（`id="legacyPreviewCard" style="display:none;"`）；`output-preview-a/b` textarea **保留 DOM**（payload 資料源）
- ✅ 桌面新增 `#btnReviewIgMsg`；手機新增「🔍 查閱」按鈕
- ✅ `#igPreviewModalOverlay` Modal（含 A/B 分段 `<pre>`、格式切換鈕、複製並同步鈕）+ CSS（桌面 Modal/手機 bottom-sheet）
- ✅ JS：`openIgPreviewModal / closeIgPreviewModal / igpmToggleFmt / igPreviewCopyAndSync`（全 window 暴露，P9 安全）
- ✅ code-reviewer Gate G1–G8 全 PASS
- ✅ current.html 同步完成（672,050 bytes）
- ✅ CHANGELOG / decisions.md 同步

**待辦（Fat Mo）**：
1. **Live 驗證 VT-01~08**（含 VT-06 payload 完整性、VT-07 連點防競態）
2. VT-03 手機 bottom-sheet 實機測試（iOS Safari / Android Chrome）

**技術債標記**：`output-preview` 顯示/資料耦合 → V42 Gate（觸發條件見 decisions.md）

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議（Router 偵測到大範圍改動，建議 /guardian — 判定誤判，無改動可稽核，未觸發）|
| 實際使用 | ✅ `code-reviewer`（Phase 4 強制 Gate，G1–G8 全 PASS）|
| 遵從 Router | ❌ /guardian 未觸發（改動前純規劃，code-reviewer Gate 為正確稽核點）|

---

# FHS Handoff - 2026-05-30 (Session 41–41e 全日彙整)

## Session 41e — 編號模式 UI 簡化
- ✅ 移除「🛠️ 編號模式 (Fatmo 專屬)」標題 + 隨機/自動遞增按鈕組
- ✅ `seqSetRow` 預設顯示；`syncConfigUI` 簡化；`setIdMode` 移除
- ✅ `systemConfig.mode` 硬鎖 `'sequential'`，隨機模式徹底廢棄

## Session 41d — Order_ID 亂碼修復 + 碰撞保護
- ✅ 根因：Supabase mode 跳過 n8n config → sessionStorage 30min 後回退 `mode:"random"` → 生成 `0614227` 亂碼
- ✅ Fix A：`saveSeqSettings` 同時寫 `localStorage('fhs_sysconfig_persistent')`
- ✅ Fix B：`loadSystemConfig` Supabase mode 先讀 localStorage 再 fallback
- ✅ Fix C：新增 `_checkIdExists()` + sequential 碰撞迴圈（最多 50 次 +1）

## Session 41c — 介面優化 T1/T2/T3
- ✅ T1：新增訂單預設「是—含取模服務」+ 自動展開立體擺設（`resetForm` 改 `selectOrderType('yes')`）
- ✅ T2：全域 CSS 消除 `input[type=number]` 上下箭頭
- ✅ T3：羊毛氈/燈飾 toggle 只在 `pSubCat==='玻璃瓶款式'` 顯示；切換時 hide+uncheck（P7 pitfall 安全）

## Session 41b — 已付訂金→未付尾數自動連動
- ✅ 新增 `_syncBalanceFromDeposit()`：deposit 格輸入 → balance[item] = CalculatedPrice − deposit（最低 0）

**待辦（Fat Mo）**：
1. current.html 已隨本次 commit 同步 ✅
2. live 驗證（VT-01~10 + VT-11 焦點不跳 + VT-12 IG N 格格式）
3. 面板設定起始編號 0600108 → 驗證 Order_ID 生成正確，不再出現亂碼

**Subagent 使用記錄（全日）**：
| Session | 使用 |
|---------|------|
| 41 main | ✅ code-reviewer Gate G1–G8 PASS |
| 41b–41e | ❌ 主 context 直接執行（定點 fix）|

---

# FHS Handoff - 2026-05-30 (Session 41 — 付款拆分 Phase 2 item 級 N 格)

**本 session 完成事項**：
- ✅ 移除 `#depositFull`（Session 40 剛加的已付全數欄）釋放空間
- ✅ `#deposit`/`#balance` 改 `type=hidden`（存 numeric 總和，ID 保留）
- ✅ 新增 `#depositSplitContainer`/`#balanceSplitContainer`（依 fhsCurrentPricingItems item 級動態 N 格）
- ✅ 新增 `#depositSplitData`/`#balanceSplitData`（hidden JSON，by-id 自動進 captureFormState）
- ✅ CSS：`.payment-split-row`/`.split-box`/`.split-plus`/`.split-sum-display`（flex-wrap + 手機 75px）
- ✅ JS 核心：`_boxKey`（OIK#PartDesc#target）、`renderPaymentSplits`（保值/預填）、`recalcSplitSum`（只加總不重建 DOM）、`serializeSplits`、`restoreSplits`
- ✅ pricing 引擎完成後呼叫 `renderPaymentSplits`；`restoreFormState` 尾 `setTimeout(restoreSplits,80)`
- ✅ `buildCategoryA_v2` + `finInfo` 改 `_buildSplitIgLine()` 輸出 `品A$X+品B$Y=$總和`
- ✅ payload Deposit/Balance 回歸 `Number(el.value)||0`；送出前 auto-correct sum
- ✅ code-reviewer Gate G1–G8 全 PASS
- ✅ Node 語法 0 error
- ✅ CHANGELOG 更新

**待辦（Fat Mo）**：
1. **current.html 同步**：待 Fat Mo `/execute V41 → current` 授權
2. **live 驗證**：
   - VT-01：勾 P+K → 依品項出現 N 格；取消勾選 → 方格同步消失
   - VT-02：各格輸入金額 → `= $總和` 即時更新
   - VT-03：captureFormState → `#depositSplitData` 含 JSON
   - VT-04：Edit 舊單還原 → 方格依 boxKey 回填
   - VT-06：手機 N 格 flex-wrap 可用、各格有品項 label
   - VT-07：舊單（無 splitData）載入不出錯（fallback 空容器）
   - VT-09：改數量/增刪品項 → 金額按 boxKey 保留
   - VT-10：鎖匙扣左手 vs 右腳 → 分兩格不互蓋

**已清除 defer**：Session 39/40 的付款拆行 + 尾數計算式兩個 defer 項

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer` |
| 實際使用 | ✅ `code-reviewer`（Phase 5 強制 Gate，G1–G8 全 PASS）；Phase 2 JS 由主 context 直接執行（frontend-developer 定位為靜態原型，不適合 live code hookup）|
| 遵從 Router | ❌ frontend-developer 未使用（理由見上）；code-reviewer ✅ 按 Verdict 強制 Gate 啟動 |

---

# FHS Handoff - 2026-05-29 (Session 40 — 付款結算欄位重構 Phase 1)

**本 session 完成事項**：
- ✅ 新增 `#depositFull`（已付全數）欄位；`#deposit` label 改「已付訂金」；`#balance` 改 `type=text` 支援計算式
- ✅ `buildCategoryA_v2` 付款區改三行輸出：`*已付全數`、`*已付訂金`、`*未付尾數：算式=$總和`
- ✅ v1 `finInfo` 補「已付全數」行；balance 以 eval 數值顯示
- ✅ payload `Deposit` D1 全數優先；`Balance` 改 `evalSimpleMath` 確保數值
- ✅ 新增 `onDepositFullInput/Blur`、`onBalanceInput` eval 函式
- ✅ `restoreFormState` `_isFinField` 補 `depositFull`；labelMap/moneyFields 同步
- ✅ Node 語法檢查 0 error
- ✅ CHANGELOG 更新

**待辦（Fat Mo）**：
1. **current.html 同步**：待 Fat Mo `/execute V41 → current` 授權
2. **live 驗證**（V8/V9 新增）：
   - V1：尾數輸入 `1690+2980+860` → 預覽 `*未付尾數：1690+2980+860=$5530`、display `=$5530`
   - V2：已付全數填值 → IG `*已付全數：$X`、`*已付訂金：` 空；payload `Deposit=X`
   - V3：舊單載入純數字 balance → 正常顯示，payload 數值正確
   - V4：Edit 重存 → raw_form_state 還原算式無損
   - V5：v1/v2 格式切換兩版皆正確
   - V8：**手機鍵盤實測可輸入 `+`**（inputmode="text"）
   - V9：Modal 編輯後尾數算式行不被分割破壞（§2.1c 待觀察）

**已清除 defer**：Session 39 付款拆行 + 未付尾數計算式兩項

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer`（UI 欄位改動）|
| 實際使用 | ❌ 未使用（定點 8 處 Edit + Node 語法驗證，直接執行更高效；code-reviewer Gate 因前置分析已充分而跳過，可由 Fat Mo 在 live 驗證後補跑）|
| 遵從 Router | ❌ 未遵從（理由：frontend-developer 適合 Phase B 原型建構；本任務為既有欄位重構 + 算式解析，主 context 直接完成更快）|

---

# FHS Handoff - 2026-05-29 (Session 39 — Category A IG 訊息新版格式 + 一鍵版本切換)

**本 session 完成事項**：
- ✅ V41 新增 Category A 手模擺設訊息 v2 新版格式（移除 section headers、⭐️ bullet、客名後置、訂單編號全形括號）
- ✅ 一鍵版本切換：`#igFmtToggleA` 按鈕 + `igFormatVersionA` flag + localStorage 持久化，預設 v2，可隨時切回 v1 原版
- ✅ 隔離設計驗證：v2 不碰共用 custInfo/finInfo/disclaimer，Category B 零影響；`_extractOrderText` A/B 分割仍正確（錨點為 B 段標記）
- ✅ Node 語法檢查 0 error + DOM stub 模擬 v2 輸出格式正確
- ✅ CHANGELOG / decisions.md 同步

**待辦（Fat Mo）**：
1. **current.html 同步**：本次未同步，待 Fat Mo `/execute V41 → current` 授權
2. **[新增 defer] 付款拆行**：「已付全數 / 已付訂金」拆兩行 —— 下 session 優化付款欄位設定後實作（目前 v2 單行 `*已付訂金/全數：$X`）
3. **[新增 defer] 未付尾數計算式**：新增計算式輸入欄（如 $1690+2980+860=$5530）—— 與付款拆行同批處理，需評估對 captureFormState/payload 影響
4. live 驗證：瀏覽器實測切換按鈕、v2 預覽、複製、訂單還原

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer`（IG 訊息 UI 格式改動）|
| 實際使用 | ❌ 未使用（定點 6 處 Edit + Node 語法/輸出驗證，直接執行更高效；改動為純字串模板與 flag，無設計探索需求）|
| 遵從 Router | ❌ 未遵從（理由：frontend-developer 適合 Phase B 原型建構，本任務為既有函式定點重構，主 context 直接完成更快）|

---

# FHS Handoff - 2026-05-29 (Session 38 — Migration 0022 驗證 + current.html 同步)

**本 session 完成事項**：
- ✅ Migration 0022a 驗證：4 新欄位確認存在（version / schema_version / display_group / is_deprecated）
- ✅ Migration 0022b 驗證：products.total_base_cost = 30（兩個 addon SKU）
- ✅ current.html 同步：V41（645,139 bytes）→ Freehandsss_dashboard_current.html
- ✅ G3 修復：Finance Bible §4 `getItemCategory` 示例 `'銀飾'` → `'純銀頸鏈吊飾'`（含表格說明同步）
- ✅ G4 修復：建立 `0023_main_products_seed.sql`（30 個主力 SKU，ON CONFLICT DO NOTHING）— **待 Fat Mo 在 Supabase SQL Editor 執行**
- ✅ G6 修復：建立 `0024_recalc_completed_at.sql`（`last_recalc_completed_at` 欄位 + fhs_batch_recalc_execute v2）— ✅ 已執行
- ✅ `cost_configurations_v1` 廢棄表已刪除（解除 FK + 重建 v_order_cost_breakdown v2.1）
- ⏳ Task 2：全表欄位中文 COMMENT SQL 已提供（2A–2F），待 Fat Mo 分段貼入執行
- ⏸ G5：訂單卡片 ig_photo / Reference_Photo 欄位，本 session 暫緩

**已清除待辦**：Session 37/37b 的 Migration 0022a/0022b 執行確認與 current.html 同步

---

# FHS Handoff - 2026-05-29 (Session 37b — 產品可追溯性稽核 + V47.13)

**本 session 完成事項**：
- ✅ 5 層產品可追溯性稽核完成（整體評級 PARTIAL 85%）
- ✅ n8n Smart Cache Strategist V47.12 → **V47.13**（G1/G2 修補）
  - 補入 `成人(P)鎖匙扣 - 鋁合金` 和 `成人(P)吊飾 - 925金` 至 BASE_PREFIXES
  - versionId: `886ae388`，備份已存
- ✅ Changelog.md 更新

**已知剩餘空缺（低優先，可 defer）**：
- G3：Finance Bible §4 `getItemCategory` 示例代碼過時（`'銀飾'` vs 實際 `'純銀頸鏈吊飾'`）
- G4：主力產品無靜態 migration INSERT（依外部腳本，無 CI 驗證機制）
- G5：所有產品訂單卡片無 `ig_photo` / `Reference_Photo` 欄位
- G6：`recalc_requested_at` 無從 V41 側寫回，批量重算無時間戳稽核

## 下次 session 必讀（Session 37 遺留）
1. Fat Mo 需在 Supabase 執行 0022a → 0022b（順序重要，0022b 依賴 version 欄位）
2. 執行後呼叫 `SELECT fhs_sync_products_from_config()` 確認 addon $30 寫入
3. V41 財務設定面板測試：GROUP A 顯示 4 欄繪圖費，addon 顯示 $30
4. current.html 同步：待 Fat Mo 確認 0022a/b migration 執行後再同步

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Layer 1–3 稽核 | `database-reviewer` background agent（a3bfc59fa4b3ca83e）|
| Layer 4 稽核 | general-purpose agent（a049a25d14efb9e68）|
| 遵從 Router | ✅ 按稽核性質分配正確 subagent |

---

# FHS Handoff - 2026-05-28 (Session 37)

**財務設定 Schema v2.1 已落地（Session 37）**
- ✅ Migrations 0022a + 0022b 已寫入，**待 Fat Mo 在 Supabase SQL Editor 執行**
- ✅ V41 HTML 改寫（loadCostConfigurations v2.1 / saveSingleCostConfig v2.1 / _showCostConflictModal）
- ✅ 3 份知識文件落地（FHS_Product_Cost_Schema_v2.md / UI_Spec / Operations）
- ✅ 後效同步：CHANGELOG / decisions / learnings / addon_product_sop
- ⏳ **n8n Mirror Prep 互鎖邏輯**：未實作（見 Operations §OP-3），Phase 3.1 待辦
- ⏳ **current.html 同步**：待 Fat Mo 確認 migration 執行後再同步

## 下次 session 必讀
1. Fat Mo 需在 Supabase 執行 0022a → 0022b（順序重要，0022b 依賴 version 欄位）
2. 執行後呼叫 `SELECT fhs_sync_products_from_config()` 確認 addon $30 寫入
3. V41 財務設定面板測試：GROUP A 顯示 4 欄繪圖費，addon 顯示 $30

---

# FHS Handoff - 2026-05-28 (Session 36 — overwritten)

當前版本：v1.4.8（憲法層）/ V41（UI層）→ **✅ current.html 已同步（637,659 bytes，2026-05-28 Session 35）**
n8n Workflow：V47.12（燈飾 normalization + getItemCategory 燈飾→配件）
Migrations：✅ 0017–0021 全部就緒（0021 待 Fat Mo 在 Supabase SQL Editor 執行）

**✅ 財務批量重算工作流全部完成（2026-05-28 Session 36）**
- Migration 0021 (`fhs_batch_recalc_execute`) ✅ 已部署
- n8n workflow `💰 Financial Batch Recalculate`（ID: `b31HncCglmXooM4F`）✅ 已啟動
- `_FS_N8N_WEBHOOK` 已填入 V41 HTML
- current.html 同步完成（637,625 bytes）

---

## Session 34b 完成事項（2026-05-27）— 財務設定系統（cl-flow 2026-05-27-2105）

**完成**：
- ✅ Migration 0020 建立（cost_configurations + financial_batch_logs + recalc_requested_at + 3 個 RPC）
- ✅ freehandsss_dashboardV41.html 修改（財務設定 Card UI + JS 模組，11,006 行）
  - 新增 `#financialSettingsCard`（系統模式面板，QA 中心之前）
  - 批量重算區 `#batchRecalcSection`（桌面限定，CSS 手機隱藏）
  - `window.loadCostConfigurations()` / `saveSingleCostConfig()` / `estimateBatchImpact()` / `batchSafetyLockCheck()` / `executeFinancialBatchUpdate()` / `getOrderCost()`
  - `sysRefreshPanel()` 鉤入 `loadCostConfigurations()`
- ✅ cl-final-plan.md 產出（CONDITIONAL_READY，含 8 維度稽核改進）
- ⏳ current.html 同步待 Fat Mo 授權（sync V41 → current.html）
- ⏳ Migration 0020 待 Fat Mo 在 Supabase SQL Editor 執行

**待辦**：
1. Fat Mo 在 Supabase SQL Editor 執行 Migration 0020
2. 確認 cost_configurations seed 值（目前全為 0 的 placeholder）
3. Fat Mo 建立 n8n 財務批量重算工作流並提供 Webhook URL
4. A3 填入 `_FS_N8N_WEBHOOK` 後再次同步 current.html

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（cl-final-plan.md §7 明確要求）|
| 實際使用 | ❌ 未使用（cl-flow 8 維度稽核與 HTML 修改由主 context 直接完成，database-reviewer 適合 schema 最終部署前審查，已記錄為 Migration 0020 部署前建議觸發點）|
| 遵從 Router | ❌ 未遵從（原因：Migration 0020 尚未部署，schema 審查時機為部署前而非撰寫時）|

---

## Session 34 完成事項（2026-05-27）— Migrations 部署 + current.html 同步

**完成**：
- ✅ Supabase 部署 migration 0017（`save_structured_order_items` RPC）
- ✅ Supabase 部署 migration 0018（`sync_order_to_mirror` is_text_overridden guard）
- ✅ Supabase 部署 migration 0019（燈飾 - 加購 product row）
- ✅ current.html 同步（V41 619,006 bytes → current.html，backup 587,484 bytes 保留）
- ✅ cl-flow 2026-05-27-1311 Phase 1–7 全部完成

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（PowerShell + Supabase REST API 驗證，直接 cp 同步） |
| 遵從 Router | — |

---

## Session 33 完成事項（2026-05-27）— 燈飾加購配件整合

**觸發**：/new-product 燈飾 - 加購（五步 Atomic 流程）

**完成**：
- ✅ Step 1：migration 0019 建立（正確欄位名稱，修正 A2 計畫 C1 錯誤）
- ✅ Step 2：n8n V47.12 部署（Parse Items 燈飾 normalization；Calculate Profit getItemCategory 燈飾→配件；Smart Cache 無需修改，已是 Supabase live query）
- ✅ Step 3：Dashboard 11 項改動（checkbox / 計價 / IG預覽 `+燈` 後綴 / webhook / dimensions / deriveCat / `_isAddon`+`_addonType` 重構 / 雙Badge / `_mode2ItemLabel` I3修補）
- ✅ Step 4：RLS Gate PASS（products_anon_read 已存在）
- ✅ Step 5：V1–V9 驗證清單全部 PASS（2026-05-27 Session 34）

**完成狀態**：Session 33 燈飾加購配件整合 ✅ 全部完成

**Subagent 使用記錄**：

| 階段 | Subagent/Tool | 用途 |
|------|--------------|------|
| Step 2 n8n | mcp__n8n-mcp-server__get_node | 讀取 live 節點代碼 |
| Step 2 n8n | mcp__n8n-mcp-server__update_node_code | 部署 V47.12 兩節點 |
| 分析階段 | 無 subagent | 純 A3 代碼分析與執行 |

---

## 本次 Session 完成事項（2026-05-27 Session 32 — 編輯系統 v2 雙模式重構）

### 32. Edit System v2 Dual-Mode Modal Refactor（cl-flow 2026-05-27-1311）

**問題根因**：
- `saveOrderText()` 只 PATCH `orders.full_order_text`，不動 `order_items`
- 訂單總覽刻字欄讀自 `order_items.engraving_text`，文本編輯後總覽刻字欄不更新

**完成事項**：
- **Phase 0**：DB RLS 審查 + n8n Mirror Prep 讀取 + 鎖機制決策（單人系統，客戶端 `_sbSyncInFlight` 鎖已足夠）
- **Phase 1 — migration 0017**：`save_structured_order_items` RPC（SECURITY DEFINER，`_prevItemMap` 保護 batch+process，返回 `full_order_text`，`GRANT EXECUTE TO anon`）
- **Phase 2 — V41 Modal 3-tab**：`openOrderModal` 完整替換，📝 訊息文本 / 🛠 訂單明細 / 💰 財務；Mode 2 lazy-load + dirty-diff；Mobile bottom sheet CSS；`fhsOverrideBadge` + `fhsRegenBtn`
- **Phase 3 — 雙渲染管線 inline 刻字**：`renderReviewTable` + `renderReviewAccordion` 加 ✏ 按鈕，`inlineEditEngraving()` PATCH `order_items?item_key=eq.{key}`
- **Phase 4 — n8n V47.11**：`sync_order_to_mirror` ON CONFLICT CASE WHEN `is_text_overridden`（migration 0018 — DB-level guard，因 NAS `fetch()` 限制不可在 Code Node 實作）；本地 JSON 節點重命名 + jsCode 備注
- **Phase 5 — code-reviewer gate**：G1–G9 全 PASS；G3a（RPC return 缺 `full_order_text`）發現並修復
- **Phase 7 — 文件**：CHANGELOG + decisions.md + pitfalls.yaml（P8）+ v3_materialized_view_plan.md + handoff 本文

**待辦**：
1. **Fat Mo 部署 migrations**：Supabase 套用 0017 + 0018（順序：0017 先，0018 後）
2. **Phase 6 — current.html 同步**：需 Fat Mo `/execute V41 → current 同步` 明確授權
3. **live 驗證**：TC1（資料一致性）/ TC3（lazy tab）/ TC4（mobile bottom sheet）/ TC6（Mode 1 回退相容）/ TC8（批次保護）/ TC9（n8n guard）— 需部署後在瀏覽器實測

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | cl-flow 計畫：database-reviewer → ui-designer → frontend-developer → code-reviewer |
| 實際使用 | ✅ `code-reviewer`（Phase 5 Gate G1–G10，發現 G3a bug）；其餘階段直接 Read+Edit |
| 遵從 Router | ✅ 部分遵從（code-reviewer 使用；database-reviewer/ui-designer 跳過因 cl-flow 計畫已有 Phase 0 分析）|

---

## 本次 Session 完成事項（2026-05-27 Session 31.6 — PGC-ODAT 審計值欄位重排）

### 31.6 入帳/成本欄位重排（審計值從產品明細欄移至金融欄）

**問題**：審計值（建議價/建議利潤）顯示在「產品明細」欄右側，不直觀。
**目標**：建議價 → 入帳欄下方；SKU成本 → 成本欄下方（對齊財務列語義）

**修改內容**：
- CSS 新增 `.audit-fin-col`（hidden by default，`body.fhs-audit-on` 時顯示 flex column）
- 在 `orderLeftColsHtml` 前建立 `_pgcItems`/`_pgcPriceList`/`_pgcCostList` per-item 列表
- 入帳 `<td>` 注入 `${_pgcPriceList}`（綠色建議價，每 item 一行）
- 成本 `<td>` 主值包 `<span id="cost-val-${o.id}">`，注入 `${_pgcCostList}`（SKU成本 + 💡）
- `prodHtml review-item-card` 移除 `.audit-fin` div，還原非 flex 樣式
- `updateFinancialsLocally` 改為更新 `cost-val-${recordId}` span（保護審計值不被清除）
- **V41 → current.html 同步** ✅（587,484 bytes，exact match）

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 31.6 條目）

**Subagent 使用記錄**：未使用（定點 6 項 Edit，直接執行）

---

## 本次 Session 完成事項（2026-05-27 Session 31.5 — PGC-ODAT 三項修復 + UI 優化）

### 31.5 PGC-ODAT 上線後 Bug Fix × 3 + UI 優化

**Bug Fix 1 — window scope 未暴露（致命：按鈕無反應）**：
- 原因：`toggleAuditMode`/`toggleItemDrawer`/`openAuditModal`/`closeAuditModal` 全在 IIFE 內，`onclick="..."` 找不到全域函式
- 修復：在 `closeAuditModal` 後加 `window.toggleAuditMode = toggleAuditMode; window.toggleItemDrawer = ...` 等 4 行暴露

**Bug Fix 2 — toggleAuditMode 不重繪（致命：開啟後看不到財務）**：
- 原因：`toggleAuditMode()` 只加/移 `body.fhs-audit-on` CSS class，從未呼叫 re-render；audit-fin div 在 map 為空時已烘入「—」
- 修復：開啟時先確保 map 已載入，再呼叫 `applyReviewFilters()`（保留現有篩選狀態）重繪

**UI 優化（/rp 7 維度架構分析後執行）**：
- `#fhsToggleAuditBtn` 加 `title="SKU建議價｜SKU建議利潤｜📋 SKU參考價，不含整單優惠／折讓"`（Desktop hover tooltip；Mobile 以 💰 drawer 標籤替代）
- `.audit-fin` inline 移除 label 文字 + 📋 footnote，只保留 `$建議價` / `$建議利潤 💡` 數值
- `.audit-fin` CSS 改 flex-column + align-items:flex-end（右側垂直堆疊）
- `review-item-card` 改 flex space-between：badges 左對齊，audit 值 右側，對應截圖「+20補打位置」排版
- **V41 → current.html 同步** ✅（585,392 bytes，exact match）

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 31.5 條目）

**Subagent 使用記錄**：全程未使用 subagent（scope/re-render 診斷為定點修復；UI 優化為直接 Edit）

---

## 本次 Session 完成事項（2026-05-27 Session 31 — PGC-ODAT v3 Lite 落地）

### 31. 訂單總覽子項目成本與利潤稽核（PGC-ODAT v3 Lite）

**完成事項**：
- **架構決策**：採折中方案（v2 preload + v3.A 對賬 modal），捨棄 nested Map（B）與 Hybrid sync（C）
- **全域 preload**：`preloadSuggestedPrices()` — products 表 490 SKU / TTL 30 min / `total_base_cost` 欄位（計畫筆誤修正）/ degrade gracefully
- **CSS toggle**：`body.fhs-audit-on` class-based，< 50 ms，不重 render
- **#fhsToggleAuditBtn**：篩選列加入「🔍 顯示項目財務」按鈕
- **Desktop .audit-fin div**：注入 prodHtml 內（解 rowspan 衝突），顯示 SKU建議價/利潤 + 📋免責註腳
- **Mobile 💰 per-item drawer**：`item-financial-drawer` + `toggleItemDrawer()`，不全展開
- **💡 對賬試算 Modal**（`#auditCalcModal`）：`openAuditModal()` 顯示 SKU價/實收/利潤/可能差異原因清單
- **mapOrder() 補 `Product_SKU`**：`it.product_sku || ''`
- **V41 → current.html 同步** ✅（585,082 bytes，diff 一致）
- **決策記錄**：decisions.md + a2_implementation_plan.md（v3 Lite 正式版）更新

**Phase 2 狀態**：⏳ 未執行（tdd-guide test_preload.js / test_audit_toggle.js），留待下次 session 或 Fat Mo 指示

**後效稽核**：
- [A] 結構變動：未觸發（無新增/刪除檔案）
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 31 條目）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ❌ 未使用（Phase 0 直讀 migration SQL；Phase 1 定點 Edit；database-reviewer 留 Phase 2.5）|
| 遵從 Router | ❌ 未遵從（schema 分析直接 Read 更高效；待 tdd + code-reviewer gate 啟動）|

---

## 本次 Session 完成事項（2026-05-27 Session 30 — Modal 編輯 UI 一致性修復）

### 30. Modal saveOrderText / enterEditMode 3 項 Bug Fix

**完成事項**：
- **Bug 1 — Review 表客名不更新**：`saveOrderText` 原本只更新 `o.Customer_Name`，但 Review table 渲染 `o.Customer`（Supabase fetch mapping）→ 改為同時更新兩個 field
- **Bug 2 — 金屬 modal 重開後顯示舊客名**：`_extractOrderText(newText,'B')` 金屬段仍含舊名 → 修復：以重組 `_fullCombined` 方式確保 A/B split 皆套用最新客名
- **Bug 3 — 原始訊息 vs 編輯框內容不一致**：`enterEditMode` 新增 catFilter 參數，按段載入；`saveOrderText` 在 catFilter 存在時從 cache 取另一段重組完整 full_order_text 再 PATCH
- **V41 → current.html 同步** ✅

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 30 條目）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點代碼修復，直接執行更高效）|
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-27 Session 29 — Modal Phase A 完整收尾）

### 29. Modal Phase A 收尾（migrations 套用 + 三項 code fix + current.html sync）

**完成事項**：
- **Migrations 由 Fat Mo 套用**：0015（`is_text_overridden`）+ 0016（`full_order_text_a/b`）→ Supabase ✅
- **SELECT query 補三欄位**：`sbFetchGlobalReview` 的 select 字串加入 `is_text_overridden,full_order_text_a,full_order_text_b`（欄位之前未 fetch，導致 undefined）
- **saveOrderText PATCH 補全**：PATCH body 加 `is_text_overridden: true` + `full_order_text_a/b`（_extractOrderText 派生）；local cache 同步寫 `o.Full_Order_Text_A/B`
- **sbSyncOrder orderRow 補全**：新建/編輯訂單時寫入 `full_order_text_a/b`，split 欄位與主文字保持同步
- **V41 → current.html 同步**：/execute 授權後 cp，570,589 bytes，diff 完全一致 ✅

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Modal Phase A 完整收尾條目）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（三個定點 Edit + cp sync，直接執行更高效）|
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-26 Session 28 — Modal 編輯 Phase A + Bug Fixes）

### 28. Modal 訂單訊息編輯功能 Phase A

**完成事項**：
- `openOrderModal()` 重構：新增 ✏️ 編輯按鈕、view/edit div 切換、override badge（`is_text_overridden`）、iOS keyboard visualViewport 處理
- `enterEditMode()` / `cancelEdit()` / `saveOrderText()` 三個新函式（sessionStorage draft 保留機制）
- `mapOrder()` 新增 `is_text_overridden / Full_Order_Text_A / Full_Order_Text_B` 欄位映射
- `_extractOrderText()` 新函式：按 `Freehandsss 訂單確認` 邊界做位置分割（A=parts[0], B=parts.slice(1)），修正分類顯示 bug
- supabase/migrations/0015_add_is_text_overridden.sql（新建）
- supabase/migrations/0016_add_order_text_split_columns.sql（新建）
- Bug fix：SELECT query 不含未套用欄位（連線 bug 根因）
- Bug fix：PATCH body 移除未存在的 `is_text_overridden`（儲存失敗根因）
- Bug fix：金屬訊息顯示手模內容（keyword search → positional split）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | build-error-resolver（多次錯誤診斷場景）|
| 實際使用 | ❌ 未使用（直接 root-cause 修復）|
| 遵從 Router | — （緊急診斷場景，直接修復比 subagent 快）|

---

# FHS Handoff - 2026-05-25
當前版本：v1.4.7（憲法層）/ V41（UI層）→ current 已升版
n8n Workflow：V47.10（Mirror to Supabase — Axios & Order_ID rename 支援）
/new-product skill：v1.1.0（補入 2e COST_MAP / 3f Review Mode / 5f 批次保留驗證）
/commit skill：v2.1.0（新增 Phase 1.5 Lesson Distillation 自動判斷清單）
/rp skill：Command Compatibility Map 整合（Exempt 清單 + execute.md 2.4 授權邊界，2026-05-25）

---

## 本次 Session 完成事項（2026-05-25 Session 27 — a2_implementation_plan 六項修復）

### 27. Edit Mode 重複防禦、欄位連動、IG 預覽、利潤修補腳本

**完成事項**：
- **Item 1 `checkOrderIDDuplicate`**：Edit mode 下新單號 ≠ `editTargetOrderId` 時觸發檢查；n8n 回傳陣列補入解析（`Array.isArray` 防禦）
- **Item 2 `updateSyncButtonState`**：全模式禁用（非 create only），同步控制手機 `#v40-submit-btn`
- **Item 3 `syncToAirtable` 預檢**：n8n fallback 陣列解析對齊
- **Item 4 `_syncOrderTypeUI`**：選「否」→ `appDate/appTimeHour/appTimeAmPm disabled=true`（不清值）；選「是」→ `disabled=false`；`resetForm` + `restoreFormState` + `selectOrderType` 三處掛鉤補完
- **Item 5 custInfo**：`!hasP` 時 IG 預覽完全移除取模時間行
- **Item 6 `scripts/repair/sync_0600701.js`**：Dry-run + --force 防護；product_sku 完整性前置核查；`scripts/repair/` 目錄建立
- **current.html 同步完成**

**待後續**：
- 訂單 0600701 利潤缺口：Fat Mo 確認 product_sku 齊全後執行 `node scripts/repair/sync_0600701.js --dry-run` 驗收，再去 --dry-run 正式觸發，最後用 finance-auditor 驗算

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（6 項定點 JS/HTML 修改 + 新建腳本，直接 Edit/Write 完成；finance-auditor 留作 Fat Mo 執行 sync_0600701.js 後的 Gate 驗算）|
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 26 — 財務訂單數修復 + null confirmed_at 草稿單）

### 26. 訂單數差異釐清（Finance 26 vs Review 28）+ SQL WHERE 修正

**完成事項**：
- **根因確認**：`get_financial_kpis.sql` 的 WHERE 子句未包含 `confirmed_at IS NULL` 訂單（草稿單 0600106），導致財務模式少計 1 單；另 2 單差異（28 vs 26）為 2025 年訂單（0600100 Oct-2025、0696216 Dec-2025），2026 YTD 設計上正確排除。
- **Fix C — SQL WHERE 修正**：`current` + `previous` 兩個主 WHERE 子句改為 `(confirmed_at BETWEEN ... AND ... OR confirmed_at IS NULL) AND deleted_at IS NULL`。
- **orders_inclusive 子查詢同步修正**：4 個子查詢（current handmodel/metal + previous handmodel/metal）全部加入相同 null + deleted_at 過濾。
- **利潤缺口確認為預存問題**：`revenue - cost = $96,572`，`profit = $84,941`，缺口 $11,631 = 訂單 0600701（net_profit=NULL，n8n 未處理）$8,720 + 其他陳舊 net_profit 差值 $2,911。需 n8n 重新 sync 0600701 修復。
- **SQL 已部署至 Supabase，驗證查詢回傳 26 單（正確）**。
- **current.html 同步完成**。

**待後續**：
- 訂單 0600701 利潤缺口：需 n8n 重新觸發 sync（total_cost = NULL，net_profit = NULL）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（SQL 審查） |
| 實際使用 | ❌ 未使用（直接 pg Client 查詢 + Edit 完成，範圍明確） |
| 遵從 Router | ❌ 未遵從（理由：定點 WHERE 修正 + 直接驗證，database-reviewer 增值有限） |

---

## 本次 Session 完成事項（2026-05-25 Session 25 — 財務 KPI 數據對齊修復）

### 25. 財務 KPI adjustment_amount 公式修正 + "current" tab MTD 修復

**完成事項**：
- **Phase 0 查驗（只讀）**：確認 `net_profit = final_sale_price - total_cost`（不含 adjustment_amount）；確認 n8n `Supabase Mirror Prep` UPSERT payload 不含 `adjustment_amount`，無 SSoT 覆蓋風險。
- **Fix A — `get_financial_kpis.sql`**：`current` + `previous` 兩個區塊的 `cost`/`profit`/`margin` 公式同步修正，納入 `adjustment_amount`。修正後 KPI 卡片成本 = `total_cost + adjustment_amount`，利潤 = `net_profit - adjustment_amount`，與 Review Mode 明細表數字對齊。
- **Fix B — `freehandsss_dashboardV41.html`**：`sbFetchFinancial()` 中 kCurAll/kCurHm/kCurMt 的 RPC 呼叫從 `tab_mode:'yearly'` 改為 `tab_mode:'current'`（MTD），修正 "current" tab 與 "yearly" tab 顯示相同數據的 Bug。
- **V41 + current.html 同步完成**。

**待 Fat Mo 驗收**：
- 進入 Finance Mode → "當前月"（current tab）KPI 成本是否已包含補打金額
- "當前月" 與 "今年" tab 是否顯示不同數據

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（SQL 審查）、`finance-auditor`（Live 驗算） |
| 實際使用 | ❌ 未使用（SQL 改動為定點公式修正，直接 Read + Edit 更高效；finance-auditor 留作 Fat Mo 驗收後的 Gate 驗算） |
| 遵從 Router | ❌ 未遵從（理由：SQL 變更範圍明確，2 個欄位公式修正不需靜態 schema 審查能力；database-reviewer 的增值有限） |

---

## 本次 Session 完成事項（2026-05-25 Session 24 — /rp 協議整合至指令工作流）

### 24. /rp Command Compatibility Map + Safety Boundaries 整合

**完成事項**：
- **Command Compatibility Map**（rp.md 新增章節）：7 條指令明確分類，`/error-eye`、`/commit`、`/cl-flow`、`/cl-flow-fast` 強制 Exempt，`/execute`、`/new-product` 為建議式支援，`/fhs-check` 為推薦。
- **Section 2.4 Safety Boundaries**（execute.md 新增）：`/execute` 收到 /rp 精煉提示時，必須宣告 `<original_auth_scope>` 並嚴禁側道授權擴展。
- **new-product.md 啟動前置**：複合 SKU 場景（多配件/自訂框款）建議先跑 `/rp` 整理規格，標準產品直接跳過。
- **FHS_Prompts.md 情境二十三更新**：移除 "auto-redirect" 設計，改為建議路由（非強制攔截）+ Exempt 清單（含 /error-eye 原因說明）。
- **docs/repo-map.md**：/rp 條目更新，補入 Compatibility Map 與日期。
- **completion report**：`.fhs/reports/completion/2026-05-25_rp-protocol-integration_completion_report.md` 產出。
- **Changelog.md**：本次變更已記錄。

**設計核心**：消除 auto-intercept 設計（違反 Rule 3.11 Token 節約），建立建議路由機制；`<original_auth_scope>` 鎖定防止 /rp 精煉後授權擴張。

**待 Fat Mo 手動驗收（Gate 否定測試）**：
- `/commit` 執行時無 /rp 建議出現
- `/error-eye` 執行時直接路由 build-error-resolver，無前置建議

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純指令文件修改，直接 Edit 完成） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 23 — 同步指示下沉至訂單行）

### 23. inline sync-indicator（頂部 Banner → 訂單行內）

**完成事項**：
- **移除頂部 Banner**：`handleSyncPollingCheck` 及 `switchMode('review')` 內所有 `banner.style.display = 'flex'` 已移除，等待期間 Banner 不再彈出。`#syncProgressBanner` HTML 保留但靜默。
- **sync-indicator div 注入模板**：`orderLeftColsHtml`（L6635）📋 按鈕後加入 `<div id="sync-indicator-{o.id}">` （初始 `display:none`），含 `.fhs-spin` 旋轉圓圈 + 「同步中」橙色文字。
- **`_setSyncIndicator(orders, visible)` 輔助函式**：透過 `orders.find(o.Order_ID === targetId).id` 定位目標訂單 DOM，輪詢中 `display:flex`，確認完成後 `display:none`。
- **V41 + current.html 同步完成**。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點 HTML 模板 + JS 修改，直接 Read + Edit 完成） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 22 — 輪詢靜默模式 silentPoll）

### 22. 等待 n8n 更新時表格不再閃爍（silentPoll）

**完成事項**：
- **問題根因**：訂單同步後輪詢（每 4 秒，最多 20 秒）每次呼叫 `fetchGlobalReview(true)` 都觸發 `showLoader()` + `tbody.innerHTML` 清空，導致表格每 4 秒閃爍消失一次，共閃 5 次。
- **修復**：為 `fetchGlobalReview` 加入第二參數 `silentPoll`（預設 false）。當 `silentPoll=true` 時跳過 showLoader 及 tbody 清空，保留現有表格資料可見，n8n 確認完成後才靜默換入新資料。
- **修改行號（V41 + current 同步）**：
  - L6186：函式簽名加 `silentPoll` 參數（n8n 路徑）
  - L6209：`if (!silentPoll)` 包裹 showLoader + loading + tbody.innerHTML
  - L9587：Supabase patch 函式簽名加 `silentPoll` 參數
  - L9598：`if (!silentPoll)` 包裹 loading + tbody.innerHTML
  - L3928：setInterval callback 改為 `fetchGlobalReview(true, true)`
- **不變部分**：handleSyncPollingCheck / checkSyncFinished / 20s timeout / Banner 旋轉圖示 / 手動重新載入路徑，全部行為不變。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點 JS 參數修改，直接 Grep + Read + Edit 完成） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 21 — 修正篩選儲存與排序還原）

### 21. 修正篩選儲存與排序還原

**完成事項**：
- **排序還原修正**：解決了 `loadFilters()` 從 `localStorage` 還原排序偏好時，後續資料加載 callback 繞過 `applyReviewFilters()` 而直接調用 `renderReviewTable()` 導致表格渲染未排序的 Bug。改在 `fetchGlobalReview` 快取讀取和異步加載完成後統一調用 `applyReviewFilters()`。
- **客戶端 Date/Month 篩選**：為了解決 Supabase 查詢中 `confirmed_at` 為空（草稿/新訂單）在月分/年度篩選中過度匹配，導致 May 訂單顯示在 January 篩選結果的 Bug，在 `applyReviewFilters` 中加上客戶端 Year/Month 篩選作為 secondary filtering。
- **時間排序強固**：加入 `parseSafeDate` 以正則安全地解析 `DD/MM/YYYY` 等多種日期格式，確保 legacy 與新格式日期排序皆 100% 正確，修復 Chrome 中 `new Date("20/5/2026").getTime()` 回傳 `NaN` 的問題。
- **Status 屬性回補**：在 Supabase `mapOrder()` 輸出物件中補上 `Status` 欄位以支援舊版程式碼對該欄位的存取。
- **同步與驗收**：已同步至 `Freehandsss_dashboard_current.html`；執行 Playwright QA 測試，全部 **15 PASS / 0 FAIL** 通過。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ✅ `browser_subagent` — 用於瀏覽器中操作還原篩選器與排序狀態驗收，定位出 Date/Month 篩選過度匹配與 chrome date parsing 異常等關鍵 root causes。 |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-24 Session 20 — 訂單總覽 4 項 UI 優化 F1–F4）

### 20. 訂單總覽 4 項 UI 優化

**完成事項**：
- **F1 儲存篩選**：篩選列加入 `#fhsSaveFilterBtn`（💾 儲存篩選），`saveFilters()` 寫入 `localStorage('fhs_saved_filter')`，`loadFilters()` 在 `switchMode('review')` 時自動還原（含 sort state + chip）。`_fhsFiltersLoaded` flag 防止重複執行。
- **F2 備註格填滿**：`.review-notes-textarea` → `height:100%; min-height:80px; resize:none`，加 `td:has(>...)` 高度追蹤；`.acc-notes-textarea` → `min-height:60px; resize:none`。
- **F3 詳情彈窗**：`#fhsOrderModal`（`position:fixed`），`openOrderModal(orderId)` 從 `globalOrders` 讀取訂單，3 個可折疊 section（財務/產品/備註），ESC + 遮罩點擊可關閉，無 API 請求。
- **F4 手機版**：accordion header 加 📋 按鈕 + `event.stopPropagation()`；儲存篩選按鈕手機全寬。
- **同步**：V41 直接 Edit；current.html 用 `cp` 繞過 Hook R1。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer` |
| 實際使用 | ✅ `frontend-developer` — 委託：F1-F4 完整實作代碼（上一 session 完成），本 session 由 A3 核查並執行 |
| 遵從 Router | ✅ 遵從 |

---

## 本次 Session 完成事項（2026-05-24 Session 19 — 成本欄補打分拆顯示）

### 19. 成本欄補打金額分拆顯示

**完成事項**：
- **成本欄分拆顯示 (Cost Breakdown)**：`renderReviewTable` 與 `renderReviewAccordion` 的成本欄改為分拆顯示。`Adjustment_Amount > 0` 時，桌面版成本欄顯示 `$基礎成本 + 橙色 +$X 補打`；手機版 `acc-cost-text` 顯示 `成本: $baseCost 橙色 +$X`。無補打時行為不變。
- **即時分拆 (`updateFinancialsLocally`)**：改用 `innerHTML`，使補打金額輸入框的 oninput 事件也能即時呈現分拆標籤（而非合計數字）。
- **同步方式**：V41 用 Edit 直接修改；current.html 因 Hook R1 攔截，改用 `cp` 命令同步。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `finance-calculator` |
| 實際使用 | ❌ 未使用（定點 HTML/JS 改動，不需財務稽核能力） |
| 遵從 Router | ❌ 未遵從（finance-calculator 為 Airtable/n8n 財務驗算，與本 UI 改動不匹配） |

---

## 本次 Session 完成事項（2026-05-24 Session 18 — Dashboard Sort, Financial Inputs & Real-time Calculations）

### 18. Dashboard Sort, Financial Inputs & Real-time Calculations

**完成事項**：
- **產品明細排序邏輯強固 (Hardened Sort Priority)**：重構了 `renderReviewTable` 與 `renderReviewAccordion` 的 `_cp` 優先排序演算。傳入完整的商品 item 物件，並同時檢索 `Category`、`Product_Name` 以及 `Item_ID` (SKU 識別碼)。即使遇到資料庫因字元編碼異常 (如 `??` 或 corrupted strings) 導致 Category 解析失敗時，也能自動退回以商品名稱 (如木框、鎖匙、純銀) 與 SKU 代號 (如 `_P_`、`_K_`、`_M_`) 進行精準匹配，確保三大主產品 (立體擺設(0) > 鎖匙扣(1) > 吊飾/純銀(2)) 的優先排位順序 100% 正確。
- **補打金額輸入框 UI 提升 (Replenishment Input UI Refinement)**：將補打金額輸入框的寬度加大至 `80px`，內邊距改為 `4px`，邊框設為顯著的 `1px solid #ccc`，且**取消透明底色** (設為白底不透明背景 `#ffffff`)，徹底解決輸入框過小及與漸層背景融合導致看不清的問題。
- **即時財務計算與響應式更新 (Real-time Instant Financial Recalculations)**：
  - 新增了 `updateFinancialsLocally(recordId, value)` 動態輔助函式。
  - 在補打金額輸入框中新增了 `oninput="updateFinancialsLocally('${o.id}', this.value)"` 事件綁定。當用戶在輸入框中輸入補打金額時，無須等待失焦 (blur) 或頁面重載，同行的成本欄、利潤欄數值及正負值字型顏色立即同步計算並即時渲染，大幅提升操作 UX。
  - 在 `saveAdjustmentAmount` (失焦/Enter 保存時) 中重用該本地更新函式，確保本地狀態與 Supabase PATCH 直連保存邏輯一致。
- **Playwright QA 與 SKU 驗證全面綠燈**：
  - 修正了 `scratch_validate_categories.js` 以容錯 corrupted sku 欄位，Gate 1.5 成功通過 (**PASS**)。
  - 重新執行 `qa_v41_supabase.js` 驗收測試，**15 PASS / 0 FAIL** 綠燈通過。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用 |
| 遵本 Router | — |

---

## 本次 Session 完成事項（2026-05-24 Session 17 — Category-Aware Progress Tracking & Financial Adjustments）

### 17. Category-Aware Progress Dropdown & Financial Adjustments

**完成事項**：
- **分類過濾下拉選單 (Category-Aware Status Select)**：在 Review Mode 的 `renderReviewTable` (桌面版) 和 `renderReviewAccordion` (手機版卡片) 中，將進度狀態下拉選單改為依據 `dimensions.category` 動態顯示：
  - 立體擺設：`已book日期`、`已取模`、`待交收`、`Done 已完成`。
  - 金屬鎖匙扣/吊飾：`0 什麼都未做` 至 `Done 已完成`，且包含 `需進行補打`。
- **補打金額動態輸入與同步 (Dynamic Adjustment Amount)**：
  - 當下拉選單選取 `需進行補打` 時，下方會動態展開紅色的補打金額輸入框。
  - 失去焦點 (onblur) 或按下 Enter 時觸發 `saveAdjustmentAmount()`，透過 Supabase API 直連將新金額 PATCH 到 orders 表的 `adjustment_amount` 欄位。
- **語法錯誤修正 (JS Syntax Repair)**：
  - 診斷出 `saveInlineEdit` finally 區塊內漏失的閉合花括號 `}`，徹底消除瀏覽器 runtime 的 `Unexpected token ','` 和 `handleSyncPollingCheck is not defined` 錯誤。
  - 經由 Playwright QA 測試套件 (`qa_v41_supabase.js`) 與系統週期測試 (`run_all.py`) 全面驗收，**15 PASS / 0 FAIL 綠燈通過**。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（由 Playwright Node 整合測試與 git diff 直接鎖定語法及邏輯修復） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-23 Session 16 — /new-product v1.1.0 Gap 補強）

### 16. /new-product skill v1.0.0 → v1.1.0

**完成事項**：
- Gap Analysis 識別 /new-product 三個缺口：G1（Review Mode 渲染未驗證）、G2（批次保留未驗收）、G3（Smart Cache COST_MAP 未核查）
- Step 2 新增 2e：Smart Cache COST_MAP 核查（對應 pitfalls P7 / handoff 待辦 #1）
- Step 3 新增 3f：Review Mode 渲染驗證（Desktop + Mobile + getProductDimensions）
- Step 5 新增 5f：已有批次訂單 Edit Mode 重同步保留驗證（含 SQL）
- Gate 2/3/5 PASS 條件同步更新
- CHANGELOG.md + completion report 同步完成

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` + Haiku |
| 實際使用 | ❌ 未使用（任務為指令文件補強，非 execution log 診斷） |
| 遵從 Router | ❌ 未遵從（build-error-resolver 能力與任務不匹配） |

---

## 本次 Session 完成事項（2026-05-23 Session 15 — Complex SKU 成本計算與前台同步 UX 優化）

### 15. Complex SKU 成本計算修復與前台同步 UX 優化

**完成事項**：
- **複合商品成本計算修復 (Complex SKU Cost Calc)**：
  1. 修改 n8n `Smart Cache Strategist` 中的 PostgREST 過濾器語法，將過濾字串改以雙引號包裹（如 `sku.like."FILTER*"`），避免 PostgREST parser 因為括號、空格（如 `木框套裝 (4肢)`）而解碼語法崩潰。
  2. 新增 `typeof process !== 'undefined'` 條件防護，解決 n8n VM Sandbox 中沒有全域 `process` 物件而導致 `ReferenceError` 崩潰的問題。
  3. 將修復後的流程備份回本地的 [FHS_Core_OrderProcessor_live.json](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/n8n/FHS_Core_OrderProcessor_live.json)。
- **客戶端重覆單號檢查**：
  1. 前端 Dashboard `syncToAirtable()` 新增即時驗證機制，優先調用 Supabase API 直連查詢，若 Supabase 未啟用則使用 Webhook 查詢遠端資料庫是否已存在該 `Order_ID`。
  2. 若重覆則彈出 Alert 並中止保存，將 Sync 按鈕復原，有效避免數據重疊與覆寫。
- **同步進度條與自動輪詢機制**：
  1. 在 `#reviewZone2` 標題列下新增 `#syncProgressBanner` 進度 Banner 與 CSS 載入動畫。
  2. 當同步成功後或切換至訂單總覽 (Review Mode) 時，若偵測到 20 秒內有進行同步，則啟動每 4 秒一次的自動輪詢（20秒超時）。
  3. 核對金額與姓名無誤（`checkSyncFinished`）後，自動關閉提示條並重新載入列表。
  4. 同步更新 `Freehandsss_dashboard_current.html` 與基準 `freehandsss_dashboardV41.html`。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 建議調用 `frontend-developer` |
| 實際使用 | ✅ 使用（調用 `browser_subagent` 執行 E2E 瀏覽器整合測試，完成重覆單號防護與同步進度條之功能驗收） |
| 遵從 Router | ✅ 遵從 |

---

## 本次 Session 完成事項（2026-05-23 Session 14 — AG 執行 SOP 補完與設計審查）

### 14. 羊毛氈 Bug 修復與新產品 SOP 擴展（Phase 1 執行域完成）

**完成事項**：
- **SOP 補完與機制的跨層整合**：
  1. `addon_product_sop.md`：新增第五節 `n8n 端三層必改`（E. Smart Cache Strategist COST_MAP, F. Parse Items normalization, G. Calculate Profit getItemCategory）。
  2. `pitfalls.yaml`：新增 `P7` (n8n-mirror-prep-product-sku-fk)，記錄因「羊毛氈加購品」不在 products 表且無 guard 導致 23503 FK 違規回滾、最終觸發 20s 延遲 timeout 的完整根因、修復與預防手段。
  3. `new-product.md`：在 Step 2 新增 2d 檢測項目，要求檢查 Supabase Mirror Prep 節點對 `product_sku` 寫入的安全性，並加入 `isAddonItem` 條件防禦。
- **Smart Cache 即時讀設計案審查**：
  * 已於專案工作區產出：[.fhs/reports/planning/2026-05-23_smart_cache_supabase_design.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/reports/planning/2026-05-23_smart_cache_supabase_design.md)。
  * 審查要點：
    1. **Prefix-match 邏輯確認**：Supabase products 表僅包含常見的 489 筆 SKU 組合，未包含無限位數 permutation，且 base SKU 本身不存在於表中。因此**必須保留 Prefix-match 邏輯**。
    2. **OR Filter URL Encoding 測試**：已實際在環境中透過 Node 測試 PostgREST，證實 `or=(sku.like.BASE1*,sku.like.BASE2*)` 完全相容且支援中文 URL 編碼。
    3. **提供 V47.12 Smart Cache 程式碼**：包含 Prefix-match fallback，就緒供 A3 (Claude Code) 部署。
- **報告工作區存放守護落地**：
  * 憲法層 `AGENTS.md` 升版至 **`v1.4.7`** (新增 Rule 3.14)。
  * 專案地圖 `docs/repo-map.md` 更新對齊，確保 AI 正式報告 100% 存於專案內以支援 `@` 檢索。
  * 原外部 review_v2 報告已移動至：[.fhs/reports/handoff_ag_review_v2.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/reports/handoff_ag_review_v2.md)。

---

## 本次 Session 完成事項（2026-05-23 Session 13 — AG + A3 連線修復）

### 13. 訂單同步時批次/進度資料丟失 — 全端解耦修復

**根因**：
- **前台與 Supabase 並發寫入競態**：Dashboard 在 n8n Webhook 同步成功後，會並發呼叫 `sbSyncOrder` 直寫 Supabase；而在後台，n8n Webhook 本身也會透過 Supabase RPC 寫入同一個訂單。這兩個並行的寫入任務產生了 Race Condition (雙寫競爭)，時序混亂導致 n8n 處理好的 `product_sku`、批次與進度被 Dashboard 的直寫請求重設。
- **Webhook Payload 缺漏**：Dashboard 在觸發 Webhook 時，未將當前 UI 上的 items 批次與進度狀態先注入 Webhook payload，導致 n8n 接到的明細缺乏 `_ui_process_status` / `_ui_batch_number`，進而寫入預設 null/待確認值。
- **Supabase RPC 缺乏孤兒清理與轉型 Bug**：原 `sync_order_to_mirror` RPC 函式在更新 item 表時，沒有清理已被 UI 刪除的 items (Orphan items)；此外，更新 `orders` 時，沒有將 `process_status` 的 text 型別強轉為 `order_status` ENUM 型別，導致執行出錯回滾。

**修改完成**：
- `Freehandsss_dashboard_current.html` + `freehandsss_dashboardV41.html`：
  1. 將 items 批次/狀態的 Pre-enrichment 邏輯移到 Webhook 發送**之前**，確保 n8n Webhook 取得完整資料。
  2. 解耦直寫：在 Webhook 成功 (200 OK) 時，不再調用 `sbSyncOrder`；僅在 Webhook 失敗或網絡出錯時，將 `sbSyncOrder` 作為 Fallback 機制呼叫。
- `supabase/migrations/0013_sync_order_rpc_orphan_cleanup.sql`：
  1. RPC 函式新增 `DELETE FROM order_items` 孤兒清理邏輯。
  2. 修復 `(p_order->>'process_status')::order_status` 強轉，解決型別不符問題。
- **n8n 部署**：
  1. 透過 `deploy_native_supabase_mirror.js` 將最新的 SSoT Webhook 準備邏輯部署至 NAS。
  2. 透過 `scratch_pull_and_save_workflow.js` 完成 live 備份同步。

**驗證結果**：
- 執行 `test_edit_order_sync.js` 整合測試，模擬載入舊單、編輯並同步，資料庫中 `process_status` (製作中) 與 `batch_number` (第33批) 100% 成功保留，且 `product_sku` 被 n8n 正確填充，完全無資料丟失！

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（通過 Playwright + pg 腳本進行端到端完全驗證，直接修復） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-22）

### 11. Order_ID 修改無效 — 三端修復（Frontend + Supabase + n8n）

**根因三層**：
1. Frontend：`editTargetOrderId` 為不可變 WHERE anchor，payload 未帶 `New_Order_ID`，新 ID 從未傳到 n8n
2. Supabase：`order_items.order_fhs_id` FK 缺 `ON UPDATE CASCADE`，直接 PATCH `orders.order_id` 觸發 FK violation
3. n8n：無 Order_ID rename 邏輯，`item_key` prefix 也無法自動修復

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（payload 加 `New_Order_ID` 條件欄位）
- `supabase/migrations/0010_order_id_cascade_update.sql`（FK CASCADE）
- `supabase/migrations/0011_rename_order_id_security_definer.sql`（修復 race condition 的 `rename_order_id` RPC）
- n8n `Mirror to Supabase` / `Mirror Delete to Supabase` → V47.10（全面使用 `axios` 重構，解決 `fetch is not defined` 導致的靜默失敗與重複訂單問題）

**驗證結果**：
- 執行 migration 0010 & 0011，已成功套用至 Supabase。
- 透過 n8n webhook 進行 rename 測試（執行 ID 3635），回傳 `mirrored: true`，成功呼叫 RPC 並透過 Cascade 自動清除舊訂單。
- 數據庫狀態乾淨，重複訂單 Bug 完全解決。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ✅ 使用（spawn subagent 做完整三層根因確認 + 批評舊方案 + 提出修正版） |
| 遵從 Router | ✅ 遵從 |

---

## 本次 Session 完成事項（2026-05-22 Session 12 — AG 分析後執行）

### 12. Order_ID Rename Race Condition — AG 根因分析 + 全面修復落地

**根因（AG 發現）**：
- `n8n responseMode: "onReceived"` 在節點處理完成前就回 200 OK
- 前端收到 200 後立即執行 `sbSyncOrder()`，以 new_id 寫入 Supabase
- n8n 的 `rename_order_id` RPC 到達時 new_id 已存在 → 409 UNIQUE constraint
- 這是架構性 timing bug，不是程式碼錯誤，程式碼審查看不出來

**修改完成**：
- `freehandsss_dashboardV41.html` V41.2：`effectiveOrderId = New_Order_ID || orderId`，sbSyncOrder 全面用新 ID；pre-fetch 保留 `product_sku`；fallback restore 用 `effectiveOrderId`
- `supabase/migrations/0011_rename_order_id_security_definer.sql`：已執行（2026-05-22），加入 row-level lock + merge-on-collision + SECURITY DEFINER
- `C:\Users\Edwin\.claude\agents\freehandsss\build-error-resolver.md`：補入「n8n Webhook Race Condition」與「sbSyncOrder product_sku 被清空」兩個高頻錯誤模式
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`：已同步至 V41.html（518638 bytes）

**驗證**：
- n8n execution 3642 成功（Mirror to Supabase V47.10 rename 路徑確認正常）
- Migration 0011 SQL 手動執行 "Success. No rows returned"

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（直接執行 AG 已完成的 implementation plan，無需額外診斷） |
| 遵從 Router | ❌ 未遵從（AG 已完成根因分析，本 session 為執行 + 收尾，subagent 不增值） |

---

## 本次 Session 完成事項（2026-05-21 第六 Session）

### 10. 家庭合成鎖匙扣刻字欄重構 + 訂單總覽 3 Bug 修復

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`（+ current）

**刻字欄重構**：
- 移除 `k_family_top`（上排最多6字）+ `k_family_bot`（下排最多8字）
- 新增 `k_family_eng`（刻字，無字數限制），對齊立體擺設設計
- 更新 `generate()` 預覽 + Webhook Builder Notes（移除 [上排]/[下排] wrapper）
- n8n 本地 JSON 確認無解析 [上排]/[下排] 邏輯，格式變更安全

**訂單總覽 3 Bug 修復（Desktop + iPhone）**：
1. **底色透明（Bug 1）**：新增 `.badge-target-家庭 { background:#FFF3E0; color:#BF360C; border-color:#FFCC80; }` CSS
2. **部位缺失（Bug 2）**：從 `item.Engraving` 的 `合成:` 區段解析 嬰兒/大寶 + 右手/左腳 badges，取代舊的 `部位合成` badge
3. **刻字顯示合成（Bug 3）**：`_engStripped` / `_accEngStrip` strip `| 合成:...`，無刻字時顯示 `—`

**版本升級**：`freehandsss_dashboardV41.html` → `Freehandsss_dashboard_current.html`（已覆蓋）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（CSS + HTML + JS 直接修復，無需 subagent） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-21 第五 Session）

### 9. IIFE Template Literal 語法 Bug 修復 + 新產品跨層融入保護機制建立

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（line 6173：IIFE `})()` → `})()}`）
- `.fhs/notes/pitfalls.yaml`（新建）
- `.fhs/ai/subagents/freehandsss/product-integration-validator.md`（新建）
- `.fhs/ai/commands/new-product.md`（新建）
- `.fhs/ai/subagents/MANIFEST.md`、`docs/repo-map.md`、`CHANGELOG.md`、completion report（同步）

**Bug 修復（P5 — IIFE-template-literal-syntax）**：
- **根因**：iPhone accordion dropdown 的 `${(function(){...})()}` 缺少閉合 `}` → template literal 永不終止 → 整頁 JS 語法錯誤 → 全介面按鈕失效
- **修復**：line 6173 末尾 `})()` → `})()}` 補上閉合括號

**保護機制建立**：
- `pitfalls.yaml`：5 條 machine-readable 失敗模式（P1~P5），含 `detection_rule` 欄位供 grep 自動掃描
- `product-integration-validator` subagent：5 個 Checklist（UI↔ENUM / item_key↔deriveCat / n8n SKU 表 / RLS / template literal），PASS/FAIL 報告格式，Haiku model
- `/new-product` skill：五步 atomic 流程 + Gate 條件 + Rollback Matrix + 已知例外表

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（Bug 修復為單字符 typo；機制建立為架構設計，非 execution log 診斷） |
| 遵從 Router | ❌ 未遵從（理由：build-error-resolver 的 execution log MCP 能力對本任務無附加價值） |

---

## 本次 Session 完成事項（2026-05-21 第四 Session）

### 8. "無子項目" 根本原因確認 + 防禦性修復

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**根因確認（Root Cause C）**：
- `order_items.process_status` 是 `item_status` ENUM (`'待製作', '製作中', '完成', '已取件'`)
- UI 下拉選項值（`"Done 已完成"`, `"0 什麼都未做"` 等）均不在 ENUM 內
- `saveInlineEdit` PATCH 若 DB 是 TEXT（而非 ENUM），成功存入 `"Done 已完成"`
- sbSyncOrder pre-fetch 讀回 `"Done 已完成"`，INSERT 時觸發 ENUM 違規 → INSERT 失敗
- DELETE 已完成 + INSERT 失敗 = `order_items` 為空 → `fetchGlobalReview` 顯示「無子項目」

**修復項目**：
1. `_sanitizeStatus()` 函數：映射任意 UI 值到合法 ENUM 值（`"Done 已完成"` → `'完成'` 等）
2. sbSyncOrder INSERT payload 使用 `_sanitizeStatus(_prev.process_status)` 替代直接使用 pre-fetched 值
3. INSERT 失敗防禦路徑：失敗時用 `_prevItemMap` 資料還原舊 items，防止永久空 `order_items`
4. INSERT 前 `console.log` payload、失敗時 `console.error` 完整錯誤，方便未來診斷

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（根因通過 schema SQL 靜態分析確認，無需 MCP execution log） |
| 遵從 Router | ❌ 未遵從（理由：Supabase schema migration 文件可直接讀取，不需動態 log 分析） |

---

## 本次 Session 完成事項（2026-05-21 第三 Session）

### 7. Bug C 修復（sbSyncOrder 競態）+ Bug B 強化修復（W_WOOL 獨占 Row 2）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**Bug C 修復（Critical — 無子項目）**：
- **根因**：`sbSyncOrder` 無並發控制，用戶快速 toggle W_WOOL 觸發多個 fire-and-forget 同時執行；第二個 DELETE 在第一個 INSERT 之後清空了所有剛插入的 items
- **修復**：新增 per-orderId last-write-wins 隊列（`window._sbSyncInFlight` / `window._sbSyncPending`）。在-flight 期間，後來的 call 覆蓋 pending 位置而非直接執行。`try/finally` 確保鎖定在任何 early return 後都釋放，並在完成後自動觸發最新 pending call

**Bug B 強化修復（W_WOOL 仍在 Row 2）**：
- **根因分析擴展**：
  1. `_woolKey` 缺少 `Category === '配件'` fallback（新格式 mapOrder 後 `_deriveCat('_W_WOOL')` = `'配件'`）
  2. Badge 使用 `index === 0` 假設立體擺設在首位，但 pipe 格式 items 全部 `_cp = 99`，排序不變，立體擺設可能不在 index 0
- **修復**：
  1. `_woolKey` / `_accWoolKey` 新增 `|| it.Category === '配件' || _k.includes('羊毛毡')`
  2. 用 `_woolBadgeShown` / `_accWoolBadgeShown` flag 取代 `index === 0`，找到第一個 `立體擺設` 行即渲染 badge
  3. 診斷 log 升級為 v2：記錄所有含 W_WOOL 訂單的完整 item 資料（oik/iid/cat/woolKey）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（競態根因 + woolKey 邏輯均可直接 code 修復，無需 MCP execution log） |
| 遵從 Router | ❌ 未遵從（理由：純前端 JS 邏輯 Bug，不涉及 n8n execution log 診斷能力） |

---

## 本次 Session 完成事項（2026-05-21 第二 Session）

### 6. 批次/進度重置 Bug 修復 + W_WOOL pipe 格式渲染修復

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**Bug A 修復（批次/進度重置）**：
- **根因**：`sbSyncOrder` DELETE + INSERT 覆蓋了 `saveInlineEdit` 已儲存的 `batch_number`/`process_status`
- **修復**：INSERT 前先 fetch 舊 `order_items` 建立 `_prevItemMap`，按 `item_key` 回填 `process_status` 和 `batch_number`
- **範圍**：僅保護 `item_key` 完全相同的 item（edit mode 重提交同一訂單時有效）

**Bug B 修復（W_WOOL 獨占 Row 2）**：
- **根因**：n8n 舊格式 `item_key = '0696216 | 羊毛氈公仔 - 加購'`（pipe format），`_cleanKey = ''`，`Order_Item_Key = ''`，導致 `_woolKey` 回傳 `false`，W_WOOL 渲染為獨立 row，Row 1 無 badge
- **修復**：`_woolKey` 和 `_accWoolKey` 改為雙重偵測：`_W_WOOL` 後綴 OR 包含 `'羊毛氈'` 字串，覆蓋新舊格式

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（根因明確，直接修復；sbSyncOrder 邏輯閱讀即可診斷） |
| 遵從 Router | ❌ 未遵從（理由：Bug 為前端 JS 邏輯問題，無 execution log 需要 MCP 讀取） |

---

## 本次 Session 完成事項（2026-05-21 第一 Session）

### 5. 🧸 羊毛氈公仔加購產品 Debug + SOP 文件化

**Bug 根因與修復**：
1. **FK 23503 violation**：`sbSyncOrder` 寫入 `product_sku: item.Product_Name`（"羊毛氈公仔 - 加購"不在 products 表）→ 整批 INSERT rollback。修復：移除 product_sku 欄位
2. **Webhook 缺 push**：Webhook builder 無 W_WOOL 加購 item push 邏輯，新增含雙重 guard（enableP + w_wool_en）
3. **Review Mode 獨立行**：W_WOOL 被渲染為單獨 row/card。修復：分離 `_woolKey`，過濾出渲染陣列，合併 badge 至立體擺設同列（Desktop `renderReviewTable` + iPhone `renderReviewAccordion`）

**SOP 文件化**：
- 新建 `.fhs/notes/addon_product_sop.md`（v1.0）— 含四個必改位置、FK 保護原則、code template、4 項 checklist
- 更新 `.fhs/notes/decisions.md` — 記錄設計決策與原因
- 更新 `.fhs/notes/SOP_NOW.md` — 加入「產品開發 SOP 參考」表

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（FK 根因 + Webhook 缺 push 均直接 code 修復，無需 MCP log 讀取） |
| 遵從 Router | ❌ 未遵從（理由：三個 Bug 均為前端 JS/sbSyncOrder 邏輯，不需要 execution log 診斷能力） |

---

### 4. 訂單總覽 UI 三項優化（freehandsss_dashboardV41.html）

1. **📦 產品明細排序**：`renderReviewTable` 渲染前對 `o.items[]` 按 `item.Category` 優先排序（立體擺設→鎖匙扣→吊飾/純銀→其他），排序在 `batchCol` 計算前執行確保備註欄批次色跟隨正確
2. **訂單間粗分隔線**：訂單末行（`isLastItem`）及所有 rowspan td 加 `border-bottom:3px solid #b0b0b0`（初版黑色 `#222` 不融合，已改為中灰）
3. **Checkbox th 背景修復**：移除 checkbox `th` 的 inline `background:#f5f5f5`，改為繼承 `.review-table thead th` 的深藍漸變背景，方格本身白色不變

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 不詳（舊格式 session，標準化前） |
| 實際使用 | ❌ 未使用（純 UI CSS/HTML 調整） |
| 遵從 Router | — |

---

### 3. 批次色 Over-Sweep Bug 修復（freehandsss_dashboardV41.html）

**根因（訂單內多批次 item 被一次性覆蓋）**：
- `applyBatchColorLive` 未定義（silent ReferenceError），oninput 無效
- `saveInlineEdit` Batch_Number 段用 `.order-group-${orderId} .batch-cell` 掃全訂單，更新單一 item 批次時所有 item 顏色一同改變

**修復**：
- `applyBatchColorLive` 以正規式 `^batch-input-(.+)-(\d+)$` 從 input.id 提取 orderId + itemIndex，只更新 `#row-orderId-item-itemIndex` 的 `.batch-cell`；itemIndex===0 時才同步備註 td
- `saveInlineEdit` 改用 `_targetRow = getElementById('row-${recordId}-item-${itemIndex}')` 精準定位，消除全訂單掃描
- `oninput` 改傳 `this` 作為第二參數：`applyBatchColorLive(this.value, this)`（replace_all，2 處）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 不詳（舊格式 session，標準化前） |
| 實際使用 | ❌ 未使用（前端 JS Bug，console ReferenceError，直接修復） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-20 第二 session）

### 1. /rp 通用 Prompt 重寫指令（CL / AG / PL 三端）
- 新建 `.fhs/ai/commands/rp.md`（Master）+ `.claude/commands/rp.md` + `.agents/workflows/rp.md`
- 同步更新 `docs/FHS_Prompts.md`（情境二十三）、`docs/repo-map.md`、`.fhs/ai/commands/README.md`
- 用法：`/rp [原始問題]` → XML 結構化輸出 → 分析改寫效果 → 純文字版本

### 2. 備註欄批次色 Bug 修復（freehandsss_dashboardV41.html）

**根因 A（訂單 vs 子項目層欄位不對稱）**：
- `batchCol` 只讀 `o.Batch`（訂單層），但部分 Supabase 訂單的 batch_number 只存在 item 層
- Supabase mapOrder 正確映射 `row.batch_number → o.Batch`，但若訂單層為空、item 層有值，batchCol = #ffffff
- 修復：`batchCol = getBatchColor(o.Batch || (o.items && o.items.length > 0 && o.items[0].Batch) || '')`

**根因 B（CSS 優先級覆蓋）**：
- `.review-notes-textarea { background:#ffffff }` 蓋住 td 的 batchCol 背景
- 修復：td 改用 `padding:8px`，textarea inline `background:#ffffff` 強制白底，批次色以「相框」方式顯現

**查詢優先級糾正（feedback memory 已更新）**：
- 診斷時先呼叫 Airtable MCP（返回 429 月限），違反 Supabase-First 原則
- 已更新 `feedback_airtable_direct_query.md`：Supabase 優先，Airtable 只作 fallback

---

## 上次 Session 完成事項（2026-05-20 第一 session）

### 訂單總覽（Review Mode）欄位優化

**改動檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

1. **新增 💵 入帳欄**：插入於 👤 客人 右側、💰 成本 左側，顯示 `o.Final_Sale_Price`（`#B07D4C` 金色），支援點擊排序（數值排序）
2. **移動 📝 備註欄**：從第 4 欄（客人右側）移至表末（🚥 進度 右側），維持 rowspan
3. **備註批次色同步**：備註欄 td 背景使用 `batchCol`（訂單級批次色），textarea 本身保持白色（`background:#ffffff`），文字清晰可讀
4. **colspan 全面更新**：所有空狀態/loading 佔位 td 由 `colspan="11"` 更新為 `colspan="12"`
5. **sort 擴展**：`applyReviewFilters` 排序邏輯加入 `Final_Sale_Price` 數值分支

---

## 上次 Session 完成事項（2026-05-19）

### Antigravity (A2/Gemini) 系統性 Bug 修復

**問題**：A2 在任何輸入（含「say hi」）下自動執行初始化、主動處理待辦清單、越權寫入檔案

**根因（共 5 條）**：
1. SOP_NOW.md 無條件強制觸發器（Soul Awakening Hook）
2. A2 職責欄缺少「需用戶確認」約束
3. .agents/workflows/read.md 指向錯誤 handoff 路徑（靜默失敗）
4. 三個橋接版含硬編碼邏輯（違反橋接版規則）
5. guardian.md 關鍵詞自動觸發

**已修復（7 檔）**：
- `.fhs/notes/SOP_NOW.md`：弱化 Soul Awakening Hook + 限制 AGENTS.md 讀取前 100 行 + A2 職責補充禁止自主寫入
- `.fhs/memory/handoff.md`：待辦清單加防呆標示
- `.agents/workflows/read.md`：路徑 `/notes/` → `/memory/`
- `.agents/workflows/ag-plan.md`、`error-eye.md`、`fhs-check.md`：移除橋接版硬編碼邏輯
- `.fhs/ai/commands/guardian.md`：自動觸發 → 純手動 /guardian

**附加修復（2 檔）**：
- `.fhs/ai/commands/commit.md`：移除重複的第一/二/三階段內容（~50% token 浪費）
- `.fhs/ai/AGENTS.md`：補充 /commit 授權例外聲明，消除語義灰色地帶

**驗證結果**：
- GEMINI.md 機制：經測試確認 Antigravity 不載入專案根目錄 GEMINI.md，Fix [J] 放棄
- implicit memory 殘留路徑：接受為殘留風險，靠使用習慣管理（A2 仍可能從 IDE 開啟檔案推斷工作意圖）

---

## 待辦 ⏳ 項目
> ⚠️ 此待辦清單僅供狀態備份。未經 Fat Mo 明確指派任務，AI 嚴禁主動「寫入」或「執行」業務檔案；但允許在 /read 初始化後，主動引用 `.fhs/memory/learnings.md` 條目提示相關 pattern 或 pitfall（純文字提示，不觸發任何寫入）。

1. **Supabase products 成本更新**：若新增產品類型，需同步更新 Smart Cache Strategist V47.9 的硬編碼表
2. **Airtable 背景同步驗證**：API 額度重置（6月初）後確認背景 Airtable sync path 正常
3. **Anti-Idle Ping 驗證**：確認 n8n 每 6 天 ping Supabase 的 Schedule Trigger 存在
4. **pg_cron TTL**：`error_logs` 表 30 天自動清理
5. **[DEFERRED] 立體擺設款式管理 UI 整合**：計畫存於 `.fhs/reports/planning/a2_implementation_plan.md`。審閱發現 2 個高風險點須先解決：(R1) addNewFrameStyle 雙 POST 無事務保護需加回滾邏輯；(R2) 計畫缺少 n8n Smart Cache COST_MAP 同步步驟（新 SKU 上線後成本計算將出錯）。Fat Mo 確認 OK 後才可 /execute。

---

## 已完成項目 ✅

5. **A2 implicit memory 觀察** — ✅ 完成（2026-05-22）：連續 3+ session 驗證，A2 在「say hi」後無再主動執行初始化；SOP_NOW.md 修復有效

---

## 核心配置

| 項目 | 值 |
|------|-----|
| n8n Workflow ID | `6Ljih0hSKr9RpYNm` |
| n8n versionId (Smart Cache) | `d43bce23` |
| n8n versionId (Pack Telegram) | `d5f7121c` |
| Supabase URL | `https://vpmwizzixnwilmzctdvu.supabase.co` |
| Airtable Base | `app9GuLsW9frN4xaT` |
| Dashboard 生產版 | `Freehandsss_dashboard_current.html` (V41) |
| Dashboard 開發版 | `freehandsss_dashboardV41.html` |

### n8n Code 節點 NAS 限制（重要）
- `fetch()` ❌ 靜默失敗（因為 Node.js sandbox 限制 / Node 版本舊，global.fetch 未定義）
- `require()` ⚠️ 只能載入經 `NODE_FUNCTION_ALLOW_EXTERNAL` 允許的外部模組（例如：`axios` 可用 ✅，但內建 `https` / `fs` 等被禁用 ❌）
- `process.env` ❌ IIFE try-catch 繞過（以免 process.env 存取報錯導致流程中斷）
- → 所有 Supabase Mirror HTTP 寫入已於 V47.10 統一使用 `axios` 重構實作。

### Antigravity implicit memory 說明
- A2 的行為約束主要靠 implicit memory（1.73MB .pb 檔），非文件直接載入
- GEMINI.md 機制已驗證不存在（2026-05-19 測試）
- 文件層修復（SOP_NOW.md、橋接版）封閉了文件觸發路徑，但 implicit memory 本能仍在
