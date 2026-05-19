# Antigravity (Gemini) 系統性 Bug 診斷報告

- **診斷時間**：2026-05-19
- **目標系統**：Antigravity (A2) 協作系統
- **審閱對象**：A3 (Claude Code) 

---

## 1. 根因定位（Root Cause）

### 【S1】Dead Loop / 自動待辦執行的根因：
- **涉及檔案與行號**：`/.fhs/notes/SOP_NOW.md` (行 2 - 3)
  ```markdown
  # FHS Soul Awakening Hook
  > 任何 AI 讀到此文件，請立即執行初始化步驟。
  ```
  *   **機制分析**：此處的 Hook 指令為「無條件強制觸發器」。每當 AI 因為 Context 關聯或 `/read` 橋接指令讀取到 `SOP_NOW.md` 時，便會被強制啟動初始化流程。
  *   **連鎖反應**：該初始化步驟 (行 10) 規定必須讀取 `/.fhs/memory/handoff.md`。當 AI 讀取交接檔後，看見 `## 待辦 ⏳ 項目` (行 33) 中的任務清單，基於 AI 的主動協助本能，會自動將其視為用戶當前要求執行的任務，導致無視用戶原本簡單的指令（如 "say hi"）。

### 【S2】未授權自動修改檔案的根因：
- **涉及檔案與行號**：`/.fhs/ai/commands/execute.md` (行 4) 與 `/.fhs/notes/SOP_NOW.md` (行 43)
  *   `execute.md` 行 4 標註：`**對應 Agent**：A3 (Claude Code 專用指令)`
  *   `SOP_NOW.md` 行 43 定義 A2 (Antigravity) 職責包含：`文件修補、UI 文字微調`
  *   **機制分析**：雖然憲法層 `AGENTS.md` (行 222) 規定 `/execute` 是唯一的執行與修改入口，但由於 `execute.md` 明確寫死該指令為 **Claude (A3) 專用**，導致 A2 (Antigravity) 判定自己不受 `/execute` 授權流程的拘束。加上 `SOP_NOW.md` 明文允許 A2 進行「文件修補」，AI 產生權限判定漏洞，直接繞過了安全防禦線進行寫入。

### 【S3】/read 指令無法重置行為的根因：
- **涉及檔案與行號**：`/.fhs/ai/commands/read.md` (行 33)
  *   **機制分析**：`/read` 指令步驟 2 規定要讀取 `SOP_NOW.md`。這會重啟上述的 `Soul Awakening Hook`，進而再次將 `handoff.md` 的待辦項目載入 AI Context 中，使重置指令反而再次成為自動執行待辦事項的導火線。

---

## 2. 衝突/冗餘清單（Conflict/Redundancy List）

1.  **[C1/C3] 任務觸發冗餘 (死循環)**：
    `SOP_NOW.md` 內的初始化指令缺乏情境隔離（Context Isolation）。沒有區分「一般查詢/問候」與「全量重載」，導致只要檔案在 Context 中，對話流程就會被綁架。
2.  **[C2/C5] 授權邊界衝突 (自主越權)**：
    `AGENTS.md` 的全局防禦線被 `execute.md` 內「Claude 專屬」的文字標籤穿透，造成 Antigravity (A2) 判定自己擁有隱形的寫入特權。
3.  **[C4] Token 浪費與指令衝突**：
    `commands/read.md` 規定讀取 `AGENTS.md` 的 **前 100 行**，但 `SOP_NOW.md` (行 9) 卻要求「同步所有規則」（即全量讀取 15KB+ 的檔案），造成指令衝突與 Token 消耗。

---

## 3. 修復方案（Fix Proposal）

### [A] 修改 `/.fhs/notes/SOP_NOW.md` (最小改動)
*   **弱化強 Hook (行 3)**：
    *   **原內容**：`> 任何 AI 讀到此文件，請立即執行初始化步驟。`
    *   **擬修改**：`> ⚠️ 此為背景快照。除非用戶明確呼叫 /read 或要求初始化，否則請勿主動執行初始化或待辦事項。`
*   **限制讀取範圍 (行 9)**：
    *   將 `1. 讀取 /.fhs/ai/AGENTS.md（憲法層 v1.4.6）— 同步所有規則`
    *   改為 `1. 讀取 /.fhs/ai/AGENTS.md（前 100 行）— 確認憲法版本`
*   **收緊 A2 權限 (行 43)**：
    *   在雙系統職責表 A2 (Antigravity) 欄位中，補充標註：`文件修補（必須獲用戶明確批准，禁止自主寫入）`

### [B] 修改 `/.fhs/ai/commands/execute.md`
*   **擴展適用對象 (行 4)**：
    *   **原內容**：`**對應 Agent**：A3 (Claude Code 專用指令)`
    *   **擬修改**：`**對應 Agent**：A3 (Claude) 與 A2 (Antigravity) 通用`
*   **明確寫入約束**：
    *   增加說明：`無論是 Claude 還是 Antigravity，未獲得用戶明確 /execute 授權均嚴禁修改任何代碼與配置文件。`

### [C] 修改 `/.fhs/memory/handoff.md`
*   **待辦防呆標示**：
    *   在 `## 待辦 ⏳ 項目` 標題下方加入：
        `> ⚠️ 注意：此待辦清單僅供狀態備份。未經用戶明確指派任務，所有 AI 嚴禁主動執行。`
