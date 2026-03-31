# /execute

**用途 (Purpose)**：唯一准許執行修改代碼的指令。授權 A3 (Claude) 根據 Verdict 報告正式執行實作。
**對應 Agent**：A3 (Claude Code 專用指令)
**Added in**：v2.0 (2026-03-31)

---

## 預期行為 (Expected Behavior)

1. **執行前確認**：
   - 確認 `.fhs/notes/ai_reports/a3_execution_verdict.md` 存在且非空。
   - 確認是 Fat Mo 明確發出 `/execute` 指令（不可由 AI 自行串接調用）。

2. **執行約束 (Strict Execution)**：
   - 重新列出準備修改的檔案。
   - **僅執行** Verdict 報告中已批准的內容，禁止超範圍修改。
   - 逐階段回報進度，不得靜默完成。

3. **完成後動作**：
   - 執行完畢後，確保符合三端守護原則。
   - 若為重大更新，需提醒 Fat Mo 是否要進行 `/commit`。
