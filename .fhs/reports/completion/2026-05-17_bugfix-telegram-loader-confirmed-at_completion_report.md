# 完成記錄：Bug Fix — Telegram 失效 / Loader 訊息 / confirmed_at 混亂

**日期**：2026-05-17
**執行者**：Claude Code (Sonnet)
**授權方式**：Fat Mo `/execute` 指令
**任務類型**：生產層 Bug Fix（Dashboard V41 + n8n V47.6）

---

## 背景

Fat Mo 編輯訂單 0600100 後同步，發現三個問題：
1. Telegram 通知完全沒有發出
2. 同步 overlay 顯示「正在同步數據至 Airtable...」（應為 Supabase + Airtable）
3. 修改後 `confirmed_at` 被更新為修改時間（應保留建立時間），`updated_at` 才是修改時間

---

## 診斷過程

### Bug #1 — Telegram 失效

完整執行鏈追蹤（n8n `FHS_Core_OrderProcessor` V47.4）：

| 節點 | 狀況 |
|------|------|
| Receive Dashboard Order | OK（responseMode: onReceived，144ms 即回應） |
| Input Normalizer | OK（action: "edit"） |
| Switch Action | OK（fallback → output 1） |
| Parse Items & Generate SKU | OK（回傳含商品的 items） |
| Batch SKU Collector | OK |
| Read Cache File → Smart Cache Strategist | OK |
| Fetch Exact Base Cost | OK（查詢 Airtable Product_Database） |
| Local Data Mapper | **⚠️ SKU 未命中時 `id: null`** |
| Calculate Profit & Pack Items | OK（Product_Record_ID: null） |
| Create Main Order | OK（Airtable upsert） |
| Bind Main Order ID | **🔴 Bug**：傳 `Product_ID: null` |
| Create Sub Items | **🔴 Airtable 拒絕 `[null]` linked record** → 節點失敗 |
| Pack Telegram Data | **永不觸發**（upstream 失敗） |
| Send Profit Report | **永不觸發** |

**Root Cause**：`Bind Main Order ID` 無條件傳入 `Product_ID: item.Product_Record_ID`，當 SKU 未命中 Airtable Product_Database 時值為 null，導致 `Create Sub Items` 的 Airtable linked record 欄位收到 `[null]`，API 報錯，截斷整條通知鏈。

### Bug #2 — Loader 訊息

Dashboard V41 Line 5221 寫死為「Airtable」，但 V41 起已是 Supabase-First 架構，顯示有誤。

### Bug #3 — confirmed_at 混亂

**雙側問題**：
- Dashboard `sbSyncOrder`（Line 8090）：`confirmed_at: new Date().toISOString()` — 每次同步（包括 edit）都用當前時間覆蓋
- n8n `Mirror to Supabase`（舊版）：`confirmed_at: calc.Order_Confirm_Date || null` — edit 時 `Order_Confirm_Date` 為 undefined，傳 null 清空原始日期；`process_status: '待確認'` 每次重置

Supabase schema 確認：
- `confirmed_at DATE`（無 DEFAULT，需手動設值）= 訂單建立日期
- `updated_at TIMESTAMPTZ`（有 trigger `orders_updated_at`）= 自動更新，不需手動傳

---

## 修改清單

### Dashboard（freehandsss_dashboardV41.html）

| 位置 | 修改 |
|------|------|
| Line 5221 | `"正在同步數據至 Airtable..."` → `"正在同步數據至 Supabase + Airtable..."` |
| Line 5441 | `sbSyncOrder(payload, orderItemsArray)` → `sbSyncOrder(payload, orderItemsArray, currentMode)` |
| Line 8061 | 函式簽名加 `mode = 'create'` 參數 |
| Lines 8087–8098 | 移除 `confirmed_at: new Date().toISOString()`；改為 `...(mode === 'create' ? { confirmed_at: new Date().toISOString().slice(0, 10) } : {})` |

### n8n FHS_Core_OrderProcessor

| 節點 | 修改 | versionId |
|------|------|-----------|
| `Pack Telegram Data` | `.first().json` → `.all()[0]?.json \|\| {}` | 770cdf2f |
| `Bind Main Order ID` | `Product_ID` 只在非 null 時加入；filter 無 Order_Item_Key 項目 | ee3c98da |
| `Mirror to Supabase` V47.6 | `confirmed_at` 僅 create 寫入；`process_status` 僅 create 設值；新增 `action` 偵測 | b3ad33b4 |

---

## 後效同步稽核

- **[A] 結構變動**：無新增/刪除檔案 → 跳過
- **[B] 制度層變動**：本記錄即完成記錄 ✅
- **[C] CHANGELOG**：已於 2026-05-17 頂部補入變更條目 ✅

---

## 已知限制

**Telegram Bug #1 的殘留風險**：當訂單所有商品均無 Airtable Product_Database 匹配（SKU 全部未命中）時，`Bind Main Order ID` 返回空陣列 → `Create Sub Items` 0 items → `Pack Telegram Data` 仍不觸發。

**根本解法（需 Fat Mo 手動操作）**：在 n8n canvas 中，為 `Create Main Order` → `Pack Telegram Data` 增加一條直接連線（使 Telegram 在訂單主記錄保存後即觸發，不再依賴子項目鏈成功）。

**SKU 未命中的根本預防**：確保所有 Dashboard 商品 `Product_Name` 格式都能在 `Product_Database.Product_Name` 中找到精確匹配。可執行 `Batch SKU Collector` → `Fetch Exact Base Cost` 後查看 zero-cost items 警告。

---

## Rollback 指引

| 節點 | Backup 路徑 |
|------|------------|
| Pack Telegram Data | `.fhs/notes/aireports/n8n-mcp-backups/2026-05-17/6Ljih0hSKr9RpYNm/Pack_Telegram_Data.json` |
| Bind Main Order ID | `.fhs/notes/aireports/n8n-mcp-backups/2026-05-17/6Ljih0hSKr9RpYNm/Bind_Main_Order_ID.json` |
| Mirror to Supabase | `.fhs/notes/aireports/n8n-mcp-backups/2026-05-17/6Ljih0hSKr9RpYNm/Mirror_to_Supabase.json` |
| Dashboard HTML | Git revert（`Freehandsss_Dashboard/freehandsss_dashboardV41.html`） |
