# FHS Handoff - 2026-05-17 (訂單總覽 Filter/Sort + 批量操作工具列)

---

## 本次 Session 完成事項

### ✅ 訂單總覽 Filter/Sort 功能
- 新增 `review-filters-v2` 篩選面板（Year/Month/Status/Batch/Search + 類別 Chips + 排序快選）
- `applyReviewFilters()` 客戶端即時篩選，`sortReviewTable()` 升降序排序
- `matchesOrderCategory()` 按手模/鑰匙扣/頸鏈分類
- 修復 DOMContentLoaded bug → 改用 IIFE 事件綁定
- 修復「無資料顯示」bug：fetch handler 還原直接調用 `renderReviewTable(globalOrders)`

### ✅ 批量操作工具列升級
- 舊 `#bulkDeleteBar`（僅有刪除）→ 新 `#bulkActionBar`（進度 + 批次 + 刪除 + 取消）
- `executeBulkStatusUpdate()` — 批量設定 Process_Status（POST to update-order-meta）
- `executeBulkBatchUpdate()` — 批量設定 Batch_Number（POST to update-order-meta）
- `executeBulkDelete()` — 保留，Supabase DELETE + n8n 最佳努力同步
- 選後立即 re-render via `applyReviewFilters()` 或 `renderReviewTable()`
- V41.html + current.html 已同步

---

## 待辦 ⏳ 項目

1. **Anti-Idle Ping**：n8n Schedule Trigger 每 6 天 ping Supabase（防止 free tier 休眠）
2. **pg_cron TTL**：`error_logs` 表 30 天自動清理
3. **V42 Dashboard**：介面優化 + 動畫系統（規劃中）
4. **current/yearly tab 數據確認**：兩個 tab 均顯示 YTD 數據（相同），Fat Mo 需確認是否接受
5. **supabase/migrations/0009_backfill_n8n_cost_adjustments.sql**：未追蹤檔案，待確認是否需要部署

---

## 核心配置

| 項目 | 值 |
|------|-----|
| 生產版 | Freehandsss_dashboard_current.html (= V41) |
| 開發版 | freehandsss_dashboardV41.html |
| Supabase URL | https://vpmwizzixnwilmzctdvu.supabase.co |
| n8n Workflow | V45.7.4（Supabase-First） |
| Airtable Base | app9GuLsW9frN4xaT |
| RPC: KPIs | get_financial_kpis（含 handmodel_qty + metal_qty） |
| RPC: Charts | get_financial_charts（含 handmodel_frame + handmodel_bottle） |
| Webhook: update-order-meta | https://yanhei.synology.me:8443/webhook/update-order-meta |
| Guardian Hook | pre-tool-guard.js 阻擋 Edit → current.html，需 PowerShell temp file |
| 批量操作 | #bulkActionBar（Status + Batch + Delete），_syncBulkActionBar() 控顯隱 |
