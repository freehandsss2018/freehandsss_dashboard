# FHS 系統全方位健康檢查與驗證 SOP (2026-03-28 版)

本方案旨在確保 **Dashboard V36.2**、**n8n 工作流** 與 **Airtable 資料庫** 之間的數據一致性與穩定性。

## 🖥️ 第一階段：前端 Dashboard UI 檢查

### 1. 互動組件驗證 (Button & Inputs)
- [ ] **建立模式 (Create Mode)**：輸入隨機測試單號，確認 `syncBtn` 是否顯示 "🔄 數據發射中..."。
- [ ] **編輯模式 (Edit Mode)**：在「全域核對中心」點擊 `Order_ID` 膠囊，確認是否成功跳轉並回填數據。
- [ ] **渲染性能**：載入超過 100 筆訂單，確認 `DocumentFragment` 是否解決了 V36 之前的 DOM 渲染卡頓。
- [ ] **SKU 選擇**：切換石膏、金屬、銀飾開關，確認 `orderItemsArray` 擷取邏輯是否正確（檢查 Preview 區域）。

---

## 🔗 第二階段：數據同步與 Airtable 驗證

### 1. 同步鏈路檢查 (n8n Webhook)
- **測試終端**: `https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b`
- [ ] **Payload 完整性**：確認 `Raw_Form_State` 是否包含所有欄位快照。
- [ ] **Airtable 寫入**：檢查 Airtable `Order_Table` 是否出現對應單號，且 `Total_Base_Cost` 非為 0。

### 2. 智慧緩存穿透 (Smart Cache Leak Check)
- [ ] **模擬故障**：人工將某 SKU 的緩存成本設為 0，觸發同步，確認 n8n 是否自動穿透緩存並從 Airtable 重新取得正確數值。

---

## 📢 第三階段：Telegram 有效訊息方案

針對不同場景，系統應發出以下標籤化訊息：

| 場景 | Telegram 訊息內容模板 | 優先級 |
| :--- | :--- | :--- |
| **新單建立** | `[FHS-NEW] 🟢 訂單 {Order_ID} 已建立。聯絡人：{Name}。總額：{Price}。` | NORMAL |
| **訂單修改** | `[FHS-UPDATE] 🔵 訂單 {Order_ID} 內容已更新。變更項目：{Update_Note}。` | LOW |
| **訂單刪除** | `[FHS-DELETE] ⚠️ 警告：訂單 {Order_ID} 已從系統中移除！操作人：Agent 3。` | **HIGH** |
| **緩存異常** | `[FHS-ALERT] 🚨 緩存穿透預警：SKU {SKU} 成本存儲異常，已自動執行修復抓取。` | **CRITICAL** |

---

## 💾 持久化維護
本文件已存儲於 `FHS_System_Health_Check_SOP.md`。
**建議檢查週期**：每次主要版本更新（如 V37）或 n8n 工作流重構後執行。

---
🏁 **Agent 2 方案制定完畢。請確認是否要啟動針對上述項目的「自動化測試腳本」編寫。**
