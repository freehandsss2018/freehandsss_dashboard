# /a3go

**用途 (Purpose)**：多代理協作的最終技術把關觸發器。啟動後，A3 讀取 A1/A2 報告，執行技術可行性評估，並在雙重授權後執行原子更新。

> ⚠️ `/a3go` 是進入最終技術把關的觸發器，並非自動覆寫令。

**Added in**：v1.0 / **重構**：v2.0（2026-03-31）

**前置條件 (Precondition)**：
- 已執行 `/read` 並確認記憶同步完成
- 已由 Fat Mo 明確輸入 `/a3go`
- A1 / A2 報告已由 Fat Mo 橋接提供

**預期行為 (Expected Behavior)**：

【第一層：讀取報告】
1. 列出 `~/.gemini/antigravity/brain/` 下最新的 session 目錄（取第一行）
2. 嘗試讀取（依 v2.0 命名規範）：
   - `a1_audit_report.md`（A1 審計報告）
   - `a1_implementation_plan.md`（A1 實施建議，若存在）
   - `a2_implementation_plan.md`（A2 本地實施計畫）
3. 回報確認：「A1 ✅ A2 ✅，開始技術評估」
4. 輸出技術可行性評估（Maintenance / Simplicity / Zero Conflict 三項評分）
5. **暫停執行**，等待 Fat Mo 下達第一層授權

【第二層：授權清單】
6. 以 `[MODIFY]` / `[NEW]` / `[DELETE]` 格式輸出**完整變更文件清單（含絕對路徑）**
7. 聲明：「清單以外的文件不會被修改」
8. **暫停執行**，等待 Fat Mo 明確下達「執行」

【執行階段】
9. 獲授權後，以原子方式完成所有文件修改
10. 將裁決結果寫入 `.fhs/notes/ai_reports/a3_execution_verdict.md`
11. 任務完成後強制寫入 `.fhs/notes/decisions.md`

**副作用 (Side Effects)**：
- 是否寫檔：是（**必須獲 Fat Mo 雙重授權後才可執行，缺任一層授權即停止**）
- 任務完成後強制寫入：`.fhs/notes/ai_reports/a3_execution_verdict.md` + `.fhs/notes/decisions.md`

**異常處理 (Fallback)**：
- 若 `~/.gemini/antigravity/brain/` 不存在：**強制停止**，回報「brain 目錄未找到，請 Fat Mo 確認路徑」
- 若 `a1_audit_report.md` 不存在：**強制停止**，回報「A1 報告未找到，請 Fat Mo 提供（命名規範：a1_audit_report.md）」
- 若 `a2_implementation_plan.md` 不存在：**強制停止**，回報「A2 報告未找到，請 Fat Mo 提供（命名規範：a2_implementation_plan.md）」
- **舊格式（audit_report.md.resolved / implementation_plan.md.resolved）已退役，不再讀取**
