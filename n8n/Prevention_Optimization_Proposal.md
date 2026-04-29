# 系統優化與事故預防方案 (Prevention & Optimization Proposal)

為了防止「靈魂流失」(n8n 降級) 與「SKU 匹配失敗」(成本=$0) 再次發生，我們提出以下四向優化方案：

---

## 1. 靈魂守護：自動化健康檢查 (Automatic Soul Guard)

**問題：** 之前發生降級時，系統完全沒有任何告警，直到 Ling Au 發現訊息不對。
**優化：** 在 n8n 中新增一個 **Cron Job 監控節點**：

- **頻率**：每 6 小時執行一次。
- **邏輯**：
    1. 調用 n8n 自己的 API 檢查工作流 `6Ljih0hSKr9RpYNm`。
    2. 驗證 `activeVersionId` 是否為最新的 Gold Master 版本。
    3. 驗證節點總數是否為 **24** (若為 23 代表有人誤用了 Import)。
- **告警**：若不符，立即發送 Telegram 到維修群組。

---

## 2. 部署守則：禁止人為導入 (Agent-Only Deployment)

**問題：** n8n 的 "Import from File" 會更改 Webhook URL，是本案最大的系統性風險。
**優化：**

- **規範**：禁止在 n8n UI 使用「導入」功能修改生產環境工作流。
- **方案**：改用 **API 專用更新腳本**。未來所有 AI (Claude/Antigravity) 部署時，必須使用 `curl -X PUT` 直接更新現有 ID 的 `nodes` 和 `activeVersion` 內容。這能保全 Webhook 連結，且能自動清理非法欄位。

---

## 3. SKU 容錯：模糊匹配與快取 (Fuzzy SKU & Dynamic Matching)

**問題：** Dashboard 傳送的名稱（如「木框款式」）與 Airtable（如「木框套裝」）經常微調。
**優化：**

- **建立正規化地圖**：在 `Parse Items` 節點中，不使用「全等」判斷（`===`），改用「關鍵字權重」匹配。
- **自動回報缺失**：如果 `Fetch Exact Base Cost` 返回 $0，除了報警，還要將該筆「無匹配 SKU」自動寫入一個 Airtable 專屬的 `Missing_SKU_Log` 表，方便營運人員快速補錄，而非事後查帳。

---

## 4. 數據防呆：多維度 Schema 驗證 (Payload Guard)

**問題：** 測試期間使用的 `Items` 欄位與生產的 `Order_Items_List` 欄位不對齊，導致邏輯落空。
**優化：**

- **輸入端補丁**：在 `Input Normalizer` (Node 2) 進行「多態映射」，確保 `Items` / `Order_Items` / `Order_Items_List` 三者在進入業務邏輯前，統一轉換為標準的內部對象。

---

## 5. 本地測試：金標測試集 (Gold Test Suite)

**問題：** 在 Windows 上使用 inline curl 會損壞中文編碼。
**優化：**

- **測試工具**：為維修人員建立一套 `test_payloads/` 文件夾，裡面存放 UTF-8 編碼的 `.json` 測試文件。
- **指令範本**：`curl -d @test_order_jewelry.json`。禁止在命令列直接拼寫 JSON 中文，確保測試環境與生產環境的一致性。

---

### 下一步動作 (Next Steps)

1. **[執行]** 建立 `Missing_SKU_Log` 表格於 Airtable。
2. **[實裝]** 在 n8n 中增加定時監控節點。
3. **[歸檔]** 本方案已同步至 [walkthrough.md](file:///C:/Users/Edwin/.gemini/antigravity/brain/a53ee22f-985b-447a-88a7-8b189548fcb2/walkthrough.md)。

*撰寫：Antigravity & Claude AI Team*
