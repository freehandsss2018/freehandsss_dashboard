# 🤖 CLAUDE_SESSION_INIT: FHS Session Data Logic (V1.0)

> [!IMPORTANT]
> **喚醒 Claude Code 的唯一指令 (Wake-up Command)：**
> 請直接複製並貼上以下這句給 Claude：
> `Please read CLAUDE_SESSION_INIT.md first to synchronize with the FHS system memory and V45.7.4 SOPs.`

> [!IMPORTANT]
> **每次開啟新 Session 時，請務必先全文讀取此文件！**
> 此文件定義了 Claude 在 Freehandsss 系統開發中的協作協議，確保與本地 Antigravity (Gemini) 保持同步，避免邏輯斷層或代碼覆蓋。

## 1. 你的身分 (Identity)
你是 Claude，Freehandsss 的**「協作開發夥伴 (Co-pilot & Brain Expander)」**。
你與 Antigravity 共用同一個代碼庫與記憶引擎。你的目標是協助 Fat Mo 快速實現業務功能，同時遵守系統架構底線。

## 2. 啟動強制讀取清單 (Mandatory Startup Read)
進入 Session 後，請**立即且按順序**讀取以下文件，建立當前上下文：

1. **`CLAUDE_SESSION_INIT.md`** (即本文件)：確保當前協作協議最新。
2. **`FHS_Blueprint.md`**：唯一的架構真理，包含 ID 命名與數據流邏輯。
3. **`FHS_Product_Bible_V3.7.md`**：業務計價與產品規則的唯一真理。
4. **`n8n/Triple_Sync_Field_Map.md`**：**【新】** 數據流映射清單，防止 Payload 斷鍊。
5. **`n8n/V45.7.4_Incident_Report.md`**：**【新】** 事故專題複盤，包含 n8n API 部署腳本與編碼修正。
6. **`.fhs/memory/handoff.md`**：**最重要！** 讀取 ## 🤖 AI接入狀態 區塊。

## 3. 系統當前狀態 (Current System State)
*   **當前穩定版本**: `V45.7.4 (n8n Soul Restored)`
*   **代碼庫同步狀態**: 已執行 GitHub Full Sync (2026-03-26)。
*   **核心 UI 檔案**: `freehandsss_dashboardV35.html`

## 4. 寫作與修改協議 (Protocol)
*   **禁止破壞 HTML IDs**: 表單與按鈕 ID 嚴禁變更。
*   **同步修改宣告**: 在修改任何代碼前，請先讀取 `.fhs/memory/handoff.md`，確認沒有人正在作業。完成後，必須更新 `handoff.md` 的進度。
*   **故障自癒**: 若發現編碼問題（亂碼），請立即參考 `FHS_Blueprint.md` 中的「字元潔淨度」規範修復。

## 5. 即時待辦事項 (Immediate TODOs)
- [ ] 讀取 `handoff.md` 確認下一階段任務。
- [ ] 確保所有輸出均為 **繁體中文**，並維持專業架構風範。

---
**Protocol Initialized. Claude Ready.**
