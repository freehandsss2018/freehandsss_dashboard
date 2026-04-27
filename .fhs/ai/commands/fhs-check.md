# /fhs-check

**用途 (Purpose)**：執行全系統健康檢查與壓力測試。
**版本**：v1.1 (2026-04-25 更新)

**執行階段 (Phases)**：
1.  **Phase 1: 環境檢查** - 驗證 `.env` 配置、PowerShell 編碼及路徑相容性。
2.  **Phase 2: 本地邏輯稽核** - 執行 `LOCAL_AUDIT` (Profit Auditor 本地邏輯測試)。
3.  **Phase 3: 生命週期測試** - 執行 `LIFECYCLE` (建立 -> 更新 -> 刪除流程測試)。
4.  **Phase 4: 壓力與驗收測試** - 執行 `STRESS` 及 `ACCEPTANCE` 測試，模擬高負載情境。
5.  **Phase 5: 結案報告** - 輸出 Health Report 並將 Red Flags 記錄至 `session-log.md`。

**執行規範 (Execution Standards)**：
- **測試數據命名**：所有測驗建立的訂單，其 **Order ID 均必須以 `test` + 數字作為開端** (例如: `test1`, `test1024`)。
- **數據清理任務**：測試內容完成後，**必須將所有測試產生的數據完全刪除**，始可標記為測試成功。
- **健康標準**：必須無任何 Red Flags 且所有測試腳本均回傳 PASS。

**前置條件 (Precondition)**：
- A3 GO 任務準備結案前，或由管理員手動呼叫。
- 已讀取 `/.fhs/ai/AGENTS.md` 並確認版本號。

**行為預期 (Expected Behavior)**：
1. 執行：`python Maintenance_Tools/run_all.py`
2. 依序完成上述五個階段。
3. 若發現異常，立即停止並回報失敗階段與錯誤訊息。

**異常處理 (Fallback)**：
- 若 `run_all.py` 不存在：回報「未找到 run_all.py」，停止執行。
- 若任何階段失敗：立即截圖或記錄錯誤，等待人工指示。
