# FHS Handoff - 2026-05-16 (V41 Finance Mode → Supabase 接回 + 定價優惠記錄)

---

## 本次 Session 完成事項（最新，Finance Mode Supabase 接回）

### ✅ V41 Finance Mode — 完整接回 Supabase RPC

**目標**：替換原 `sbFetchFinancial()` 中已廢棄的 `get_order_summary` RPC，改用新建的雙 RPC。

**新 RPC（已部署）**：
- `supabase/rpc/get_financial_kpis.sql` — 財務 KPI（revenue/cost/profit/orders/margin/aov）
- `supabase/rpc/get_financial_charts.sql` — 圖表資料（trend/category_revenue/cost_breakdown）

**前端修改**（同步更新 V41.html + current.html）：
- `sbFetchFinancial()` 改為 12 parallel RPC calls（9 KPI + 3 chart，3 tabs × 3 categories）
- Data source label 改為「Supabase」
- `buildChartData()` + `buildTab()` 輔助函數映射 RPC 格式 → FO_MOCK_DATA 格式

**驗證結果**：12/12 RPC 呼叫成功，HK$13,030 May revenue，81.7% margin（真實數據）

---

### ✅ Supabase Schema 修正 — n8n_cost_adjustments 欄位

**Migration 0006**（已執行）：
- 新增 `n8n_cost_adjustments JSONB`（事後發現設計錯誤）
- 修正訂單 0600802：`keychain_cost = 450`（V3.7 §2.5 扣減後正確值）

**Migration 0007**（已執行）：
- `n8n_cost_adjustments JSONB` → `NUMERIC(10,2) DEFAULT 0`（系統扣減總額，例如 -20）
- 新增 `n8n_adjustment_notes JSONB DEFAULT '[]'`（可讀性說明陣列，不參與財務計算）
- 更新訂單 0600802：`n8n_cost_adjustments = -20`，`n8n_adjustment_notes = [{type, amount, desc, basis, keychain_item_count}]`

**欄位設計說明**：
| 欄位 | 類型 | 用途 |
|------|------|------|
| `n8n_cost_adjustments` | NUMERIC(10,2) | n8n 自動計算扣減總額（如 -20），參與財務計算 |
| `n8n_adjustment_notes` | JSONB | 扣減項目可讀性說明陣列，不參與計算 |
| `adjustment_amount` | NUMERIC | Fat Mo 人工輸入折扣，Dashboard 填入（V41 HTML 目前未接入） |

---

### ✅ n8n Workflow V47.5 更新

**節點：`Calculate Profit & Pack Items`**（workflow 6Ljih0hSKr9RpYNm）
- 新增 `N8n_Cost_Adjustments`（NUMERIC，keychain 跨件運費扣減總額）
- 新增 `N8n_Adjustment_Notes`（JSONB 陣列，含 type/amount/desc/basis/keychain_item_count）

**節點：`Mirror to Supabase`**
- orders upsert 加入 `n8n_cost_adjustments` + `n8n_adjustment_notes` 兩個新欄位

---

### ✅ 訂單 0600802（WingLee）完整調查

**調查結論**：
- `final_sale_price = $2,160` ✅ 正確（實際收款）
- `raw_form_state.__System_Final_Sale_Price = $3,460`（系統建議，非錯誤）
- 差額 $1,300 = **Fat Mo 授權定價優惠**（非數據錯誤）

**HK$3,460 計算方法**（`processTierPricing()` in current.html:4276-4339）：
- RH 鎖匙扣（index 0, qty=1, P-mode）→ $1,580
- RF 鎖匙扣（index 1, qty=1, P-mode, 異部位重置）→ $1,580
- 異部位附加費（index=1, P-mode, !standaloneSurchargePaid）→ $300
- **合計：$3,460**

**實際成交 $2,160 原因**：Fat Mo 以「同部位2件P-mode」定價（$2,160）收費，豁免跨部位重置及 $300 附加費。

**Migration 0008**（待執行）：
- 更新 `admin_notes` 記錄定價優惠原因與計算說明

---

### ✅ Subagent 知識庫更新

新建 lesson 檔案：
- `.fhs/memory/lessons/2026-05-16_keychain_shipping_deduction.md` — §2.5 $20 運費扣減根源、n8n code 位置、快速診斷指南
- `.fhs/memory/lessons/2026-05-16_order_0600802_pricing_concession.md` — $1,300 定價優惠說明（Supabase / n8n / Dashboard 各層位置對照）

---

## 待執行（人工）

⚠️ **Migration 0008 尚未執行**：
- 檔案：`supabase/migrations/0008_order_0600802_admin_notes.sql`
- 動作：在 Supabase SQL Editor 貼入並 Run
- 內容：更新訂單 0600802 admin_notes（定價優惠說明）

---

# FHS Handoff - 2026-05-16 (文檔生態系統審核完成 + /fhs-audit 優化升級)

當前版本：v1.4.5（憲法層） / V41（Stable Production）

---

## 本次 Session 完成事項

### ✅ 文檔生態系統完整審核（4 Phase）

**執行成果**：
- Phase 1/2：檢查根目錄 & .fhs/ 層級版本同步 → ✅ 16 檔案驗證通過
- Phase 3：Subagent frontmatter 標準化 → ✅ 8/8 檔案含完整版本宣告
- Phase 3.5：docs/ 文件夾深度掃描 → ✅ 8 檔案標記版本與相容性
- Phase 4：自動化驗證工具運行 → ✅ bash + Python 工具正常，JSON 清單生成

**修復清單**：
- 更新 29 個檔案版本聲明與 compatible_with 欄位
- 修正 3 個 subagent (blender-3d-modeler, database-reviewer, finance-auditor) 缺失 version 字段
- 標記 GLOBAL_AI_SOP.md 為已過時（⛔ 廢棄）
- 新增 Python UTF-8 編碼支援修復（cp950 → UTF-8）

**報告輸出**：
- `.fhs/reports/FHS_Documentation_Ecosystem_Complete_Audit_20260516.md`
- `.fhs/reports/version_manifest.json`（12 檔案追蹤）
- 驗證結果：✅ 零文檔漂移，100% 版本對齐

### ✅ /fhs-audit 命令優化升級（v1.0 → v2.0）

**融合策略**：
- 將 4 Phase 文檔審核併入 `/fhs-audit` 為「檢查六」
- 擴展 fhs-audit：21 項 → 25 項檢查、5 大維度 → 6 大維度
- 新增「文檔生態系統版本一致性」檢查維度
  - A6-1：根目錄 & .fhs/ 層級版本同步
  - A6-2：Subagent 標準化 (8/8)
  - A6-3：docs/ 文件夾版本標記
  - A6-4：自動化驗證工具運行

**更新內容**：
- `.fhs/ai/commands/fhs-audit.md`（v2.0）
- `.fhs/ai/commands/README.md`（列表更新）
- 報告格式新增檢查六區段
- 版本日誌記錄升級詳情

---

### ⚠️ 前一 Session 完成事項（參考）

### ✅ Plan 0004 — Supabase 成本架構完整遷移

**Step 1 — CSV → Supabase 資料遷移（`scripts/migrate_from_csv.js`）**
- Airtable API 月度限額耗盡（429），改用 `airtable-database/` CSV 檔案
- 新建 `scripts/migrate_from_csv.js`（支援 multiline quoted fields 的 CSV parser）
- 成功遷移：
  - `cost_configurations`: 28 筆
  - `products`: 489 筆（含 `cost_config_id` 100% 連結、`total_base_cost` 全填）
  - `orders`: 23 筆歷史訂單（狀態 `待確認`，無損壞）
  - `order_items`: 64 筆（50 筆有 `product_sku`，15 筆歷史孤兒正常）

**Step 2 — SQL migration（`0004_cost_infrastructure.sql`）**
- 在 Supabase SQL Editor 執行
- 建立：`recalculate_product_costs()` function + `v_order_cost_breakdown` VIEW

**Step 3 — 驗證查詢**
- `cost_configurations`: 28 ✅
- `products with cost_config_id`: 489/489 ✅
- `products with NULL total_cost`: 0 ✅
- `cost_integrity ✓ matched`: 50 筆 ✅
- `cost_integrity ⚠ no product`: 15 筆（歷史孤兒，可接受）

### ✅ Bug 6 修復 — Airtable 429 導致 Telegram 未執行

**根因**：`Smart Cache Strategist` 成功從 Supabase 取得成本後，`Fetch Exact Base Cost`（Airtable 節點）仍執行 `SUPABASE_SKIP` 查詢 → Airtable 月度 quota 耗盡 → 429 → workflow 中斷 → Telegram 未執行

**修復**：透過 n8n REST API PUT，設定 `Fetch Exact Base Cost` 節點：
- `onError: continueRegularOutput`
- `continueOnFail: true`

現在 Airtable 429 不再中斷 workflow，Telegram 正常發送。

### ✅ RPC 驗證

`get_base_cost_by_skus` Supabase RPC 確認存在且正常：
- 呼叫 `POST /rest/v1/rpc/get_base_cost_by_skus` → 200 ✅
- 返回正確 `Product_Name` + `Total_Base_Cost`

---

## 架構狀態更新

| 項目 | 狀態 |
|------|------|
| `cost_configurations` | ✅ 28 筆（Supabase） |
| `products.cost_config_id` | ✅ 489/489 全連結 |
| `products.total_base_cost` | ✅ 全填 |
| `get_base_cost_by_skus` RPC | ✅ 正常 |
| `v_order_cost_breakdown` VIEW | ✅ 建立 |
| n8n Supabase-First 成本讀取 | ✅ 啟用（Bug 6 已修） |
| Airtable 成本讀取 | ⚠️ 月度 quota 耗盡（重置後自動恢復為 fallback） |

---

## 待辦 ⏳ 項目

### 🔴 BLOCKING

1. **test008–010 CRUD 測試**（暫停中）
2. **玻璃瓶 父母/大寶 顯示驗證**（修復已部署，需用真實訂單確認）

### 📋 架構後續（排期）

3. **Anti-Idle Ping**：n8n Schedule Trigger 每 6 天 ping Supabase（防止 free tier 休眠）
4. **pg_cron TTL**：`error_logs` 30 天自動清理
5. **Airtable 月度 quota 重置後**：驗證 `SUPABASE_SKIP` fallback 不再觸發 429

---

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.5 |
| 穩定生產版 | `Freehandsss_dashboard_current.html` (V41) |
| n8n Workflow | V45.7.4（Supabase-First 成本讀取啟用）|
| Airtable Base | `app9GuLsW9frN4xaT`（quota 耗盡，月初重置） |
| Supabase | Primary Lead（成本架構完整，RLS 正常）|
| 新增腳本 | `scripts/migrate_from_csv.js`（CSV → Supabase 遷移備用）|

---

## 本次教訓

- Airtable API 月度 quota 耗盡時，改用 CSV export 執行 migration 是可行 fallback
- CSV multiline quoted fields 需要 character-by-character parser，不能簡單按 `\n` 分行
- n8n 節點 `continueOnFail` 可透過 REST API PUT 更新（需清理 settings 欄位）
- `SUPABASE_SKIP` 雖能讓 Airtable 返回 0 筆，但仍會消耗月度 API quota
