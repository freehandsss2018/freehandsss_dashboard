# /ag-plan

**用途 (Purpose)**：由 Antigravity (A2) 負責本地分析與規劃，並產出可供 A3 審查的 Implementation Plan。
**對應 Agent**：A2 (Antigravity 專用指令)
**Added in**：v2.0 (A3 工作流優化)

---

## 預期行為與強制規則 (Expected Behavior & Guardrails)

1. **落盤實體路徑限制 (No Artifact Trap)**：
   - A2 **必須**將報告直接寫入專案的實體絕對路徑：`d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\notes\ai_reports\a2_implementation_plan.md`
   - **絕對禁止**使用相對路徑寫入。
   - **絕對禁止**只產生內部 artifact（如存在 `.gemini/antigravity/brain/` 內）而不寫入專案目錄。
   - 沒有落盤到 `.fhs/notes/ai_reports/`，即視為任務失敗，禁止宣告完成。

2. **自查驗證機制 (Self-Audit)**：
   - 每次產出 `a2_implementation_plan.md` 後，A2 必須立刻發起自查，透過 file reader 確認該絕對路徑檔案存在且內容不為空。
   - 如果自查發現檔案不存在，必須立即重新實行寫入落盤動作。

3. **報告內容要求**：
   - 目標與範圍 (Goal & Scope)
   - 分析發現與風險 (Findings & Risks)
   - 擬議修改檔案清單 (Proposed Files changes, 使用 `[NEW]`, `[MODIFY]`, `[DELETE]`)
   - **NO-TOUCH 護欄聲明**：不得在此階段對任何程式碼執行修改操作。

4. **下一階段指引 (Handoff)**：
   - 產出完成並驗證成功後，系統將停留於「計畫完成」狀態，交回給 Fat Mo，以便後續呼叫 `/cl-flow` (A3 最終審核) 或 `/execute` (A2 執行)。

---

## 指令命名家族 (Command Family Sync)
- `/px-plan` = A1 (Perplexity) 產出外部架構與情報 Plan
- `/ag-plan` = A2 (Antigravity) 產出本地落實 Plan（即本指令）
- `/cl-flow` = A3 (Claude) 給出最終 Verdict 報告（取代舊 `/a3go`）
- `/execute` = 唯一准許執行修改代碼的指令（A2 不可自發調用執行）
