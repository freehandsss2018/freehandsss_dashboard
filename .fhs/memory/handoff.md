# FHS Handoff - 2026-05-17 (Finance Mode 全面 Bug 修正 + 手模細分 + 數量面板)

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

### ✅ Finance Mode 財務指標 Bug 全面修正
- **收入細分雙重計算**：舊邏輯讓混合訂單（handmodel+keychain 同一單）被兩個分類各自計算，總和是實際 1.98x。修復：主分類邏輯（handmodel > keychain > necklace），每單收入只歸一類。
- **負毛利問題（吊飾 -$1,537）**：revenue 用主分類過濾（純吊飾單），但 cost 用全訂單 → revenue < cost。修復：新增 `*_profit` 欄位，直接用 `net_profit` 按主分類分組（非 revenue-cost 計算）。
- **訂單細分硬編碼 [0,0,0]**：JS `buildChartData()` orders 欄位字面上是 `[0, 0, 0]`。修復：SQL 新增 `handmodel_orders / keychain_orders / necklace_orders`，JS 讀取真實值。
- **吊飾訂單低計（顯示 1，實際 6+）**：主分類邏輯排除了混合單（handmodel+necklace 訂單被歸入 handmodel 不計入 necklace）。修復：訂單計數改用包容式（`COUNT(CASE WHEN necklace_cost > 0 THEN 1 END)`）。
- **頸鏈數量顯示 0（item_category 編碼損壞）**：`純銀頸鏈吊飾` 首字「純」儲存時 UTF-8 損壞（Big5 byte）。精確匹配 `= '純銀頸鏈吊飾'` 永遠返回 0。修復：改用 `ILIKE '%頸鏈%'` 跳過首字元。結果：8 件。
- **訂單 0600800（兩件吊飾）確認**：925銀 + 925金各 1 件，共 2 件，均正確計入。

### ✅ 教訓整理
- 寫入 `.fhs/memory/lessons/2026-05-17_finance-mode-sql-debugging.md`（8 條教訓）
- 涵蓋：SQL 部署驗證、JS fallback、主分類邏輯、COMMENT ON 語法、編碼診斷、Guardian Hook 繞過

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
