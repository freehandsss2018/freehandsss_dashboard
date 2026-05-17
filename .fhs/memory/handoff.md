# FHS Handoff - 2026-05-17 21:30
當前版本：v1.4.6（憲法層）/ V41（UI層）

## 本次 Session 完成事項

### 1. 訂單總覽 Filter/Sort 功能 (V41)
- 新增 `review-filters-v2` 篩選面板（Year/Month/Status/Batch/Search + 類別 Chips + 排序快選）
- `applyReviewFilters()` 客戶端即時篩選，`sortReviewTable()` 升降序排序
- `matchesOrderCategory()` 按手模/鑰匙扣/頸鏈分類
- 修復 DOMContentLoaded bug → 改用 IIFE 事件綁定
- 修復「無資料顯示」bug：fetch handler 還原直接調用 `renderReviewTable(globalOrders)`

### 2. 批量操作工具列升級 (V41)
- 舊 `#bulkDeleteBar`（僅有刪除）→ 新 `#bulkActionBar`（進度 + 批次 + 刪除 + 取消）
- `executeBulkStatusUpdate()` — 批量設定 Process_Status（POST to update-order-meta）
- `executeBulkBatchUpdate()` — 批量設定 Batch_Number（POST to update-order-meta）
- `executeBulkDelete()` — 保留，Supabase DELETE + n8n 最佳努力同步
- 選後立即 re-render via `applyReviewFilters()` 或 `renderReviewTable()`
- V41.html + current.html 已同步

### 3. Stitch 大地溫潤 (Earthy Warm) 設計系統同步與資產導出
- **[新建]** `docs/DESIGN.md`：詳細梳理大地溫潤 (Earthy Warm) 核心色彩、狀態色、字型比例、8px 網格、玻璃擬態以及雙端 (Ling Au / Fat Mo) 分流介面標準。
- **[修改]** `docs/README.md` & `docs/repo-map.md` & `README.md` & `.fhs/ai/README.md` & `Freehandsss_Dashboard/README.md`：更新版本號為憲法層 v1.4.6，並完成文件同步。
- **[Stitch MCP 註冊]**：
  - 新建專案：`"Freehandsss Dashboard V41 Design System"` (Project ID: `11117181158430315963`)
  - 規格上傳：上傳 UTF-8 Base64 `docs/DESIGN.md`，建立 Screen `4258009578173095400`
  - 建立設計系統：解析並建立 `"Freehandsss Earthy Warm V41"` (Asset ID: `08d31e5f626240ff8a69be7fa9816c49`)
- **[完成記錄]**：寫入 `2026-05-17_stitch_design_system_export_completion_report.md` 及 Lessons 學習日誌。

## 待辦 ⏳ 項目

1. **Anti-Idle Ping 部署驗證**：依 AGENTS.md §4「防閒置強制」硬規則，驗證 n8n 是否已存在每 6天 ping Supabase 的 Schedule Trigger node；如缺失則補建（非重新定義規則，僅執行驗證/補建）
2. **pg_cron TTL**：`error_logs` 表 30 天自動清理
3. **V42 Dashboard**：介面優化 + 動畫系統（規劃中）
4. **current/yearly tab 數據確認**：兩個 tab 均顯示 YTD 數據（相同），Fat Mo 需確認是否接受
5. **supabase/migrations/0009_backfill_n8n_cost_adjustments.sql**：已列入 Staging，等待 commit，後續需確認是否需要部署

## 核心配置

| 項目 | 值 |
|------|-----|
| 生產版 | Freehandsss_dashboard_current.html (= V41) |
| 開發版 | freehandsss_dashboardV41.html |
| Supabase URL | https://vpmwizzixnwilmzctdvu.supabase.co |
| n8n Workflow | V47.4（Supabase-First） |
| Airtable Base | app9GuLsW9frN4xaT |
| RPC: KPIs | get_financial_kpis（含 handmodel_qty + metal_qty） |
| RPC: Charts | get_financial_charts（含 handmodel_frame + handmodel_bottle） |
| Webhook: update-order-meta | https://yanhei.synology.me:8443/webhook/update-order-meta |
| Guardian Hook | pre-tool-guard.js 阻擋 Edit → current.html，需 PowerShell temp file |
| 批量操作 | #bulkActionBar（Status + Batch + Delete），_syncBulkActionBar() 控顯隱 |
| Stitch 專案 ID | 11117181158430315963 |
| Stitch 設計系統 ID | 08d31e5f626240ff8a69be7fa9816c49 |
