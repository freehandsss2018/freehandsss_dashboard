# FHS Handoff - 2026-05-17 (Finance Mode 手模/金屬數量面板 + Bar Chart 細分)

---

## 本次 Session 完成事項

### ✅ get_financial_charts.sql — handmodel 細分
- `category_revenue` 新增 `handmodel_frame`（木框收入）+ `handmodel_bottle`（玻璃瓶收入）
- 查詢方式：`EXISTS (SELECT 1 FROM order_items WHERE item_key ILIKE '%木框%')`
- 驗證結果：frame=61039, bottle=7080, 合計=68119 ✅

### ✅ Dashboard JS — Bar Chart 降級邏輯
- `buildChartData()` 加入 fallback：若 frame+bottle=0（SQL未部署），回退顯示「立體擺設」單條
- `barHmLabels` 動態切換：有細分數據 → '木框立體擺設'/'玻璃瓶立體擺設'，否則 → '立體擺設'

### ✅ get_financial_kpis.sql — handmodel_qty 新欄位
- current + previous 兩段各新增 `handmodel_qty: { frame, bottle }`
- 查詢 `SUM(oi.quantity)` from order_items WHERE `item_key ILIKE '%木框%'` / `'%玻璃瓶%'`
- 驗證結果：frame=15, bottle=1 ✅

### ✅ Finance Mode — 手模銷售數量面板（UI）
- 新增 `fo-handmodel-qty-panel`（紫色 #7B1FA2 邊框）
- 顯示木框套裝（件）+ 玻璃瓶套裝（件）
- 切換到 handmodel 類別時顯示，其他類別隱藏
- Mock data: current/yearly { frame:15, bottle:1 }, monthly { frame:4, bottle:0 }
- 兩個 HTML 檔案同步更新

### ✅ V41 → current.html 同步
- 完成後執行 copy V41 to current

---

## 待辦 ⏳ 項目

1. **Anti-Idle Ping**：n8n Schedule Trigger 每 6 天 ping Supabase（防止 free tier 休眠）
2. **pg_cron TTL**：`error_logs` 表 30 天自動清理
3. **V42 Dashboard**：介面優化 + 動畫系統（規劃中）
4. **current/yearly tab 數據確認**：兩個 tab 均顯示 YTD 數據（相同），Fat Mo 需確認是否接受

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
| Guardian Hook | pre-tool-guard.js 阻擋 Edit → current.html，需 PowerShell temp file |
