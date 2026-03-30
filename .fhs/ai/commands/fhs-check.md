# /fhs-check

**用途 (Purpose)**：執行全系統健康檢查與壓力測試。
**Added in**：v1.0

**前置條件 (Precondition)**：
- A3 GO 任務準備結案前，或 Fat Mo 手動呼叫
- 已讀取 `/.fhs/ai/AGENTS.md` 並確認版本號

**預期行為 (Expected Behavior)**：
1. 執行：`python Maintenance_Tools/run_all.py`
2. 依序完成：LOCAL_AUDIT → LIFECYCLE → STRESS → ACCEPTANCE
3. 輸出 Health Report，明確標示所有 Red Flags
4. 若發現 Red Flags，將問題摘要寫入 `/.fhs/notes/session-log.md`

**副作用 (Side Effects)**：
- 是否寫檔：否（除 session-log.md 外）
- 是否修改現有檔案：否

**異常處理 (Fallback)**：
- 若 `Maintenance_Tools/run_all.py` 不存在：回報「run_all.py 未找到，請 Fat Mo 確認路徑」，停止執行
- 若任何測試階段失敗：停止後續測試，立即回報失敗階段與錯誤訊息，等待指示
