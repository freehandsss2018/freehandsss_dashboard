---
name: fhs-bug-triage
description: FHS Dashboard Bug 修復完成驗證協議。宣告任何 Bug 修復完成前，必須通過 5-Gate 檢查。防止「代碼已寫 ≠ Bug 已修復」的假完成模式。
type: validation-protocol
version: 1.0
created: 2026-05-13
applies_to: [build-error-resolver, frontend-developer, database-reviewer]
trigger: 任何 AI 準備宣告「Bug 修復完成」或「任務完成」之前
---

# FHS Bug Triage — 5-Gate Completion Protocol

## 核心原則

**代碼已寫入檔案 ≠ Bug 已修復。**

每次宣告修復完成，必須逐一通過以下 5 個驗證閘門。任何一個未過 → 禁止宣告完成。

---

## 5-Gate 驗證清單

### Gate 1 — Code Gate（代碼存在驗證）

```
目的：確認修改的代碼實際存在於目標檔案
方法：grep 目標函數名或關鍵字串
通過條件：grep 返回正確行號與內容
失敗症狀：grep 無結果 / 行號與描述不符
```

**範例**：
```bash
grep -n "sbSyncOrder\|final_sale_price" freehandsss_dashboardV41.html | head -5
```

### Gate 2 — DB Gate（資料庫約束驗證）

```
目的：確認 Supabase schema / RLS / FK 約束已到位
方法：
  - RLS Policy：Supabase Dashboard > Authentication > Policies 截圖確認
  - Schema 約束：SELECT column_name, is_nullable, data_type FROM information_schema.columns
  - FK 存在：SELECT constraint_name FROM information_schema.table_constraints
通過條件：相關 Policy / 約束存在且正確
失敗症狀：Policy 缺失、欄位允許 NULL 但應 NOT NULL
```

**FHS 常見 DB Gate 失敗點**：
- `orders_anon_insert` / `orders_anon_update` / `order_items_anon_insert` / `order_items_anon_delete` Policy 未建立
- `final_sale_price` NOT NULL 但 sbSyncOrder 未傳此欄位（DEFAULT 0 觸發 Profit Auditor 警報）

### Gate 3 — Execution Gate（實際執行驗證）

```
目的：實際觸發一次完整的修復後流程，拿到 HTTP 2xx 回應
方法：在 Dashboard 執行真實操作（非模擬）
通過條件：
  - sbSyncOrder：Console 顯示 "[sbSyncOrder] Supabase sync complete for [Order_ID]"
  - n8n sync：n8n webhook 返回成功，無 error
  - dedup：不出現重複列
失敗症狀：Console 顯示 403 / 400 / 500 錯誤；n8n timeout
```

**FHS Gate 3 標準測試步驟**：
1. 開啟 V41 Dashboard，確認「Supa 已開啟」狀態晶片
2. 開啟瀏覽器 F12 Console
3. 選擇一筆測試訂單，修改一個可見欄位（如刻字）
4. 點擊「同步到系統」
5. 等待 n8n 回應（約 5–10 秒）
6. 確認 Console 出現：`[sbSyncOrder] Supabase sync complete for FHS-XXXXX`

### Gate 4 — Verify Gate（數據持久化驗證）

```
目的：read-back 確認 Supabase 的實際 row 數值正確，而非依賴 Console log
方法：
  - Supabase Dashboard > Table Editor > orders 找到測試訂單
  - 確認 updated_at 已更新（在剛才操作後幾秒內）
  - 確認關鍵欄位數值正確（非 0 / 非 null / 非舊值）
通過條件：
  - orders.final_sale_price = 正確金額（非 0）
  - orders.raw_form_state 含剛才修改的刻字
  - order_items 存在對應記錄
失敗症狀：updated_at 未更新；final_sale_price = 0；order_items 空白
```

### Gate 5 — No-Regress Gate（迴歸驗證）

```
目的：確認修復未破壞相鄰功能
方法：針對 FHS 高風險相鄰流程進行抽查
通過條件：
  - 訂單總覽（訂單總覽 Tab）無重複列
  - 開啟同一訂單的修改介面，表單欄位正確還原
  - 財務數字（deposit/balance）未被重置為 0
  - n8n 後續批次處理無新增 error_logs
失敗症狀：dedup 失效；財務欄位歸零；面板無法展開
```

---

## 禁止行為（Anti-Patterns）

| 禁止行為 | 症狀描述 |
|---------|---------|
| 以「代碼已寫入」替代 Gate 3 | 說「修復完成」但實際從未觸發過同步 |
| 以文件替代執行 | 寫 SETUP.md / CHECKLIST.md 代替真正執行 SQL |
| 超過 1 份 .md 指導文件 per bug | 重複文件 = Token 浪費，資訊稀釋 |
| 靜默跳過 Gate | 「可能沒問題」是假設，不是驗證 |
| 在 Gate 2 未通過時進行 Gate 3 | DB 約束不對，執行也只是得到 403 |

---

## 適用場景

**必須執行**：
- 任何涉及 Supabase 寫入的 Bug 修復
- 任何涉及 n8n → Airtable / Supabase 同步的問題
- 任何 Dashboard 表單還原或財務顯示問題

**不需要全 5 Gate**：
- 純 CSS / 文字調整（只需 Gate 1）
- 文件更新（只需 Gate 1）
- 純讀取功能修改（只需 Gate 1 + Gate 5）

---

## FHS 特有診斷快查

| 症狀 | 優先檢查 |
|------|---------|
| sbSyncOrder 403 錯誤 | Gate 2：RLS Policy 是否建立 |
| final_sale_price = 0 | Gate 2：sbSyncOrder orderRow 是否含此欄位 |
| 訂單總覽重複列 | Gate 3：dedup filter 是否在 fetch 時執行 |
| 修改介面財務歸零 | Gate 5：財務最後原則，注入順序是否正確 |
| 面板未展開 | Gate 4：raw_form_state enableK/M 與肢體 flags 狀態 |
| n8n Code Node 失敗 | Gate 3：確認輸出格式為 `[{json: {...}}]` |

---

## 歷史教訓（本 skill 建立背景）

**2026-05-13 Session 事件**：  
AI 在 sbSyncOrder 代碼寫入後多次宣告「修復完成」，但：
1. RLS Policy 從未建立（Gate 2 失敗）
2. final_sale_price 未寫入 sbSyncOrder（Gate 2 失敗）  
3. 從未實際觸發同步驗證（Gate 3 失敗）
4. 寫了 5 份重複 Setup 文件替代執行

實際效果：**sbSyncOrder 每次呼叫都會 403 失敗，三個 Bug 等同未修復。**

詳見：`.fhs/reports/completion/2026-05-13_Session_Workflow_Postmortem.md`
