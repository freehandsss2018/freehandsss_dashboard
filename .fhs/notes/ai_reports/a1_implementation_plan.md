# A1 Implementation Plan (PX Report): True 1-Click `/cl-flow` Coordinator

**Target Document**: `d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\notes\ai_reports\a1_implementation_plan.md`
**Author**: Perplexity (A1) - Simulated
**Topic**: External Architecture Research for 1-Click LLM Orchestration

---

## 1. 目標 (Objective)
建立一個真正的一鍵協調流程，徹底消除目前需要人工手動依序觸發 `/px`, `/ag` 並等待的人為中斷。系統將於執行 `/cl-flow` 時自動生成 PX 與 AG 的獨立報告，最終再由 Claude 進行交叉審查。

## 2. 限制 (Constraints)
- **環境差異**：Claude Code 與 Antigravity(VS Code Extension) 及 Perplexity 分屬不同的執行環境與前端介面。
- **無縫接軌**：不可依賴 Claude Code 捏造審閱過程，必須要有真實的檔案 (`px-report.md`, `ag-plan.md`) 落在實體目錄下才能繼續流程。
- **安全護欄**：在未取得使用者 `/execute` 指令批准前，純處於「Planning」狀態，禁止任何改寫專案核心業務邏輯的行為 (FR-6)。

## 3. 風險 (Risks)
- **API 依賴與成本**：完全自動化依賴於 API Keys (Perplexity API, Gemini API) 以及對應的 Token 消費。若設計不當，打包 codebase (${repomix}) 的內容過大可能造成 context window limit 錯誤或超額扣款。
- **時序延遲 (Race Conditions)**：Claude Code 執行腳本時若未正確 await，可能在 `px-report.md` 或 `ag-plan.md` 還未寫入硬碟前就開始讀取，導致最終審閱抓不到資料。
- **錯誤隱匿 (Silent Failures)**：若調度腳本（runner）崩潰，可能沒有適當的方法讓 Claude 知道，而導致進入錯誤狀態迴圈。

## 4. 假設 (Assumptions)
- `npm` 與 Node.js 環境在本地已穩定配置。
- 專案內部備有可用於調用 Gemini 的 API Key，且 Perplexity 的 MCP server 設定已包含有效的 Perplexity API Key。
- Claude Code 有權限在專案目錄執行 shell command（如 `node scripts/cl-flow-runner.js`）。

## 5. 成功標準 (Success Criteria)
- 使用者只需在 Claude Code 給予 `/cl-flow [指令]`，接著只需等待最終的 `cl-final-plan.md` 生成，中間無需任何人工介面切換或輸入。
- 觀察 `artifacts/{flow_id}/`，裡面有包含具體且獨立的 `px-report.md` 與 `ag-plan.md`。
- Claude 產出的 `cl-final-plan.md` 能精準反映上述兩份文件的重點並合併結論。

## 6. 範圍外項目 (Out of Scope)
- 不涵蓋更換或升級現有 n8n webhook 工作流邏輯（僅做純開發環境的協調器增強）。
- 不涵蓋建立網頁版 GUI 按鈕來觸發此流程；流程完全限定於 CLI (Claude Code) 內使用。
