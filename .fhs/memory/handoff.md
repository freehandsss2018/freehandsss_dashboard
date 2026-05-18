# FHS Handoff - 2026-05-18 深夜
當前版本：v1.4.6（憲法層）/ V41（UI層）
n8n Workflow：V47.9（Smart Cache Strategist 本地成本表）

---

## 本次 Session 完成事項

### 1. Telegram 通知系統全面重構（Supabase-First）
- **拓撲重組**：Mirror to Supabase → Pack Telegram Data → Send Profit Report（繞過 Airtable 依賴）
- **三格訊息分離**：新訂單（完整商品清單）/ 修改訂單（精簡 + 變更摘要）/ 刪除訂單（最簡）
- **訊息架構**：Pack Telegram Data 組裝 `Full_Message`，Telegram 節點直接送出

### 2. n8n Bug 修復
- **Batch SKU Collector**：移除 `require('fs')` → NAS 不支援
- **Smart Cache Strategist V47.9**：`fetch()` 在 NAS Code 節點不可用 → 改用 26種 base SKU 成本硬編碼對照表 + prefix matching
- **Pack Telegram Data**：`$⚠️` 格式修正、雙🔄修正、Update_Note 直接輸出
- **Notify Telegram (Delete)**：Unicode 編碼修復（不再顯示 `?????`）

### 3. Dashboard Bug 修復
- **Bug #1 - confirmed_at**：edit 時不再覆蓋建立日期（兩個 HTML 檔案）
- **Bug #2 - Loader 文字**：「正在同步數據至 Supabase + Airtable...」
- **Bug #3 - lastFetchedState 時序**：移到 limb_sel_ DOM 還原後，修復部位欄位誤報
- **Update_Note 優化**：取模時間（合拼 hour + ampm）+ 顯示原本→修改值格式

### 4. 成本查詢根本問題確認
- Supabase products 表有 200 個 SKU（手模擺設 4 個 + 鎖匙扣/吊飾 196 個）
- NAS n8n Code 節點 fetch() 完全不可用 → V47.9 hardcoded map 繞過
- Airtable API 月度限制已達上限（5月底重置）

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
