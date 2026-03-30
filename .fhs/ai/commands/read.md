# /read

**用途 (Purpose)**：初始化 AI 記憶體，進行環境與進度同步。
本指令是 `/.fhs/notes/SOP_NOW.md` 的統一入口別名，
讓 Claude Code 與 Antigravity 都能用同一個指令觸發。
**Added in**：v1.0

**前置條件 (Precondition)**：
- 已讀取 `/.fhs/ai/AGENTS.md` 並確認版本號

**預期行為 (Expected Behavior)**：
1. 讀取 `/.fhs/notes/SOP_NOW.md` 的完整內容
2. 讀取 `/.fhs/notes/todo.md`（了解當前待辦）
3. 輸出當前專案狀態的純文字報告
4. 輸出範例：「已完成記憶同步，憲法版本 v1.0 已確認。」

**副作用 (Side Effects)**：
- 是否寫檔：**否**
- 是否修改現有檔案：**絕對禁止**

**異常處理 (Fallback)**：
- 若 `/.fhs/notes/SOP_NOW.md` 不存在：回報「SOP_NOW.md 未找到，請 Fat Mo 確認路徑」，停止執行
- 若 `/.fhs/notes/todo.md` 不存在：略過，不影響主流程
