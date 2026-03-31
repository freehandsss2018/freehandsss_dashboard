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

4. **後效同步稽核 (Post-Execution Sync Audit)**：

   每次 `/execute` 完成後，必須逐項核查以下三個觸發條件。
   條件成立 → 對應同步為強制；未完成 = 任務不得視為正式收尾。

   **[A] 結構變動稽核**
   觸發條件（任一）：新增 / 刪除 / 移動任何檔案或目錄；或任何檔案用途 / 定位改變
   → 強制更新 `docs/repo-map.md`
   → 強制更新對應層級 `README.md`

   **[B] 制度層變動稽核**
   觸發條件（任一）：修改 `AGENTS.md` / `GLOBAL_AI_SOP.md` / `.fhs/ai/commands/` 內任何指令檔 / `README` / `repo-map` / workflow 文件 / 任何制度層、協議層、指令層之變更
   → 強制在 `.fhs/notes/completion_reports/` 產出正式完成記錄
   → 命名格式：`YYYY-MM-DD_<task_slug>_completion_report.md`

   **[C] CHANGELOG 稽核**
   觸發條件（任一）：版本號變更 / 流程語義變更 / command 行為邏輯改變 / 重大制度規則變更 / 會影響未來使用方式的行為調整
   → 強制更新 `CHANGELOG.md`
   ⚠️ 純 typo、純文案潤飾、非語義性重寫，不觸發

   **[D] 稽核宣告格式**
   完成稽核後，僅輸出「成立」的項目及已執行的同步動作。
   未觸發的條件不輸出，保持收尾精簡。
   若三項均不成立，輸出：「後效同步稽核完成：A/B/C 均不觸發。」
   若同步動作執行失敗，立即暫停並提示 Fat Mo，不得靜默跳過。
