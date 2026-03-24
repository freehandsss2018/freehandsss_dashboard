# FHS Lesson: n8n MCP Server Activation & Debugging

- **日期**: 2026-03-21
- **主題**: n8n MCP 伺服器掛載與全域錯誤監測對接
- **類別**: 【架構對沖】/【自動化】

## 💡 核心學習點 (Lessons)
1.  **MCP 環境不一致處理**：
    - 在 Windows 環境下，即便 `mcp_config.json` 已正確配置 `n8n-Antigravity`，若 MCP 工具尚未在 Assistant 端的 Tool Schema 中更新，應優先使用 `curl.exe` (Windows 原生) 搭配 `X-N8N-API-KEY` 進行 API 直連。
    - **注意**：PowerShell 的 `curl` 實際上是 `Invoke-WebRequest` 的別名，其 `-H` 語法與標準 curl 不同，建議強制指定 `curl.exe`。

2.  **n8n 錯誤監測邏輯 (Error Loop Shield)**：
    - 在 `FHS_System_ErrorMonitor` 工作流中，實作了「錯誤循環盾牌」。
    - **原理**：使用 5 分鐘 (300,000 ms) 的冷卻時間戳記儲存於 `staticData`，對相同節點抛出的重複錯誤進行過濾，避免因一個 Bug 導致 API 額度瞬間噴發。

3.  **Airtable 映射一致性**：
    - 再次確認全端 1:1 映射定律。`FHS_System_ErrorMonitor` 將錯誤詳細資訊（時間、工作流名稱、錯誤訊息、報錯節點）寫入 Airtable `Error_Logs` 表格。

## 🛠️ 技術決策
- **狀態**：完成 `n8n-Antigravity` 持久化掛載。
- **降級方案**：當 MCP 工具失效時，透過 `curl.exe` 讀取 `mcp_config.json` 中的憑證進行操作，確保任務不中斷。

## ❌ 踩坑紀錄 (Pitfall)
- 曾嘗試使用 ID `PusL5vFUw7BMC2xH` 獲取工作流，但該 ID 可能屬於 `projectId` 或其他層級，實際工作流 ID 應從 `list` 結果中的 `id` 欄位獲取（例如 `7` 或 `8WbbEqZpiWu0CB1o`）。

---
*Verified by Antigravity - Scenario 9 Protocol*
