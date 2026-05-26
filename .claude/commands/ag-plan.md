# /ag-plan（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/ag-plan.md](/.fhs/ai/commands/ag-plan.md)

### 流程摘要：
1. Antigravity (A2) 本地分析並產出 Implementation Plan
2. **落盤強制路徑**：`d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\reports\planning\a2_implementation_plan.md`
3. 落盤後立即自查驗證（file reader 確認存在且非空）
4. 產出交回 Fat Mo → 呼叫 `/cl-flow` 或 `/execute`

### 防守檢查：
- ✅ 禁止只存入 `.gemini/antigravity/brain/` 而不寫入專案目錄
- ✅ 禁止在此階段對任何程式碼執行修改操作
- ✅ 必須使用繁體中文
