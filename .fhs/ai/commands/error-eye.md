# /error-eye（錯誤監控與診斷）

用途：從 Airtable Error_Logs 抓取異常，執行 Catch-Push-Diagnose。

觸發條件：
- 用戶提及「錯誤」「Error Log」「異常」「診斷」「掛了」
- 手動輸入 /error-eye

偵錯三部曲：
1. Catch：讀取 Airtable Error_Logs 最新 20 條異常記錄
2. Push：分類異常類型（n8n / Airtable / UI / API Rate Limit）
3. Diagnose：輸出診斷報告，包含根因分析與修復建議

輸出格式：
- 🔴 嚴重（系統停擺）：立即觸發 Telegram 通知 Fat Mo
- 🟡 警告（功能異常）：列出修復步驟，等待確認
- 🟢 輕微（可觀察）：記錄至 session-log.md

異常處理：
- 無法連接 Airtable → 回報「Error_Logs 讀取失敗，請確認 MCP 連線」
