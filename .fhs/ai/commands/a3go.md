# /a3go

**用途 (Purpose)**：執行多代理協作的正式任務實施流程，啟動完整 A3 工作流。
**Added in**：v1.0

**前置條件 (Precondition)**：
- 已執行 `/read` 並確認記憶同步完成
- 已由 Fat Mo 明確輸入 `/a3go`

**預期行為 (Expected Behavior)**：
1. 列出 `~/.gemini/antigravity/brain/` 下最新的 session 檔案
2. 依序讀取：
   - `audit_report.md.resolved`（A1 稽核報告）
   - `implementation_plan.md.resolved`（A2 實施計畫）
3. 輸出：「A1 ✅ A2 ✅，等待 Fat Mo 授權執行重組。」
4. **暫停執行**，等待 Fat Mo 下達「執行重組」指令
5. 獲授權後，輸出風險評估摘要（Maintenance / Simplicity / Zero Conflict 三項評分）
6. 任務完成後，將決策摘要寫入 `/.fhs/notes/decisions.md`

**副作用 (Side Effects)**：
- 是否寫檔：是（視計畫而定，**必須獲 Fat Mo 明確授權後才可執行**）
- 任務完成後寫入 `/.fhs/notes/decisions.md`（強制）

**異常處理 (Fallback)**：
- 若 `~/.gemini/antigravity/brain/` 不存在：回報「brain 目錄未找到，請 Fat Mo 確認路徑」，停止執行
- 若 A1 或 A2 文件不存在：回報「[A1/A2] 文件未找到，請 Fat Mo 手動提供路徑」，停止執行
