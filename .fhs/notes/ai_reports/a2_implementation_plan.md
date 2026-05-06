# A2 Implementation Plan: 強化 `/read` 強制初始化與 Token 節能防腐機制

## 1. 任務背景 (Context)
為了解決 AI 在新 Session 或長時間對話後「遺忘專案狀態」的風險，我們需要建立一套強制性的初始化流程。同時，為了避免頻繁讀取大型規則檔導致 Token 嚴重消耗，我們引入「輕量快照」與「時間戳比對」機制。

## 2. 核心變更方案 (Proposed Changes)

### A. 憲法層 (Constitutional Layer)
**修改檔案：** `/.fhs/ai/AGENTS.md`
*   **新增規則 3.11「會話初始化與 Token 節約原則」**：
    1.  **Session 絕對起點**：任何新 Session 開啟後，AI 必須確保已獲取當前狀態資訊。未完成初始化前，嚴禁執行代碼寫入。
    2.  **輕量化優先**：優先調用 `scripts/hooks/session-start-sop.sh` 獲取不到 300 tokens 的核心快照。
    3.  **中途防腐 (Anti-Stale)**：在執行關鍵操作前，AI 必須透過 `ls -l` 或 `stat` 檢查 `handoff.md` 的檔案修改時間。若時間戳未變，禁止重新讀取全文。

### B. 指令層 (Command Layer)
**修改檔案：** `/.fhs/ai/commands/read.md`
*   **更新用途定義**：明確其作為「全量重載」的角色，並提醒 AI 在一般情況下應優先使用輕量 Hook 腳本。

## 3. Token 消耗評估
*   **預期消耗**：每次初始化從 ~2000 tokens (全檔) 降至 **~300 tokens (輕量快照)**。
*   **中途檢查**：從 ~2000 tokens 降至 **< 20 tokens (僅讀取時間戳)**。

## 4. A3 審閱要點 (A3 Review Focus)
*   請 A3 確認 `AGENTS.md` 的新條文是否會與現有的 `Mid-Session 脈衝` 規則產生邏輯衝突。
*   確認 Timestamp Check 的實作方式是否符合 A3 的工具執行習慣。

---
**發起方**：Antigravity (A2)
**目標執行方**：Claude (A3)
**狀態**：等待 A3 審閱 (Pending Review)
