# FHS Handoff - 2026-05-19 深夜
當前版本：v1.4.6（憲法層）/ V41（UI層）
n8n Workflow：V47.9（Smart Cache Strategist 本地成本表）

---

## 本次 Session 完成事項

### 1. Review Mode 三個核心 Bug 修復（上個 session 遺留）
- **批次顏色消失**：新增 `applyBatchColorLive()` 函數（兩個 HTML 檔案）
- **輸入「13」不自動轉「第13批」**：真正的 `saveInlineEdit`（line 6697）`const value` → `let value`
- **批次/進度不同步 Supabase**：修復 RLS 政策、ENUM→text、UUID on-demand 查詢、`return=representation` 偵測 0 rows

### 2. Duplicate form field id 警告修復（雙層根因）
- **第一層**：`qaCenter` 隱藏 div（iPhone Drawer 來源）與系統模式面板 ID 衝突 → 改名 `qac-` 前綴
- **第二層**：`v40InitDrawerMirrors()` 的 `cloneNode(true)` 複製所有子元素 ID → 加 `stripDescendantIds()` 清除 clone ID
- 影響範圍：`fatmoConfigPanel`（btnIdModeRandom / btnIdModeSeq / nextSeqIdInput）及 `qaCenter` clone 全數消除

### 3. Finance UX 四項優化
- **批次欄 focus-to-clear**：點擊「第35批」→ 清空顯示純數字、全選、限制輸入數字 (`batchInputFocus`)
- **Deposit 運算式輸入**：接受 `80+900`，標籤旁即時顯示 `= $980`，blur 後計算結果填入 (`evalSimpleMath`)
- **Balance 自動餘數提示**：`generate()` 改為只讀 deposit.value（不用 placeholder 作 fallback），空 deposit = 0 付款 → balance placeholder 顯示全額
- **Deposit/Balance = 0 顯示優化**：三個 restore 路徑（line 4924 n8n path / `restoreFormState` 迴圈 / `_injectFinancials`）統一用 `|| ''` 處理，0 值顯示空白讓 placeholder 生效

### 4. 深層根因：`_injectFinancials()` 覆蓋問題
- `reconstructOrderFromSupabase` 的 Fix B 注入函數在 `restoreFormState` 之後執行，`dbDep != null` 條件判斷允許 0 值寫入 → 覆蓋所有之前 restore 的修復
- 修復：`_depEl.value = dbDep || ''` / `_balEl.value = dbBal || ''`

---

## 待辦 ⏳ 項目

1. **Telegram Footer 移除**：「This message was sent automatically with n8n」由 n8n 實例層自動加入，需 Fat Mo 在 NAS 的 n8n 環境配置中關閉（非 workflow 層面可修）
2. **Supabase products 成本更新**：若新增產品類型，需同步更新 Smart Cache Strategist V47.9 的硬編碼表
3. **Airtable 背景同步驗證**：API 額度重置（6月初）後確認背景 Airtable sync path 正常
4. **Anti-Idle Ping 驗證**：確認 n8n 每 6 天 ping Supabase 的 Schedule Trigger 存在
5. **pg_cron TTL**：`error_logs` 表 30 天自動清理

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
- `fetch()` ❌ 靜默失敗
- `process.env` ❌ IIFE try-catch 繞過
- `require()` ❌ 完全不可用
- → 所有 HTTP 呼叫必須用 HTTP Request 節點，Code 節點只做計算

### Telegram 訊息路徑
```
收到 Webhook → Supabase Mirror → Pack Telegram Data → Send Profit Report
（Airtable 全部 continueOnFail: true，不阻斷主路徑）
```

### DOM Restore 三層路徑（重要）
```
n8n path: line 4923-4924 (data.Deposit / data.Balance)
restoreFormState loop: line 4732 (state[key] for all form fields)
_injectFinancials: line 5154-5155 (dbDep / dbBal — 最後執行，會覆蓋前兩層)
→ 三層都需要 || '' 處理 0 值
```
