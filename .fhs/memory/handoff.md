# FHS Handoff - 2026-05-16 (Plan 0004 成本架構遷移完成 + Bug 6 修復)

當前版本：v1.4.5（憲法層） / V41（Stable Production）

---

## 本次 Session 完成事項

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
