========================================
🔍 AI 指令一致性稽核 (CL vs AG vs PX)
執行時間：2026-04-03 00:50
========================================

【1. 指令架構分佈】
目前全系統採用「母版 (Master) - 實踐橋接 (Bridge)」架構：

*   **母版來源 (.fhs/ai/commands/)**：
    - 存放 14 個完整指令定義。
    - 包含 A1 (PX)、A2 (AG)、A3 (CL) 的所有技術規範與硬護欄。
*   **實踐橋接 (.claude/commands/)**：
    - 存放 9 個 Claude Code 專屬橋接檔。
    - 內容多為「指標型 (Pointer)」，引導 Claude 讀取母版並執行。
*   **IDE 工作流 (.agents/workflows/)**：
    - 僅保留 `freehandsss-optimizer-v2.md` 作為舊版 agent 鏈。

【2. 角色指令對齊性】

| 指令集 | Antigravity (AG/A2) | Claude (CL/A3) | Perplexity (PX/A1) | 一致性狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **初始化 (/read)** | 讀取 SOP_NOW + todo | 讀取 SOP_NOW + .clauderules | N/A | 🟡 實施差異 (Context 不同) |
| **規劃 (/px-plan)** | 在母版定義 | 可調用 runner 觸發 | 提供外部報告 | ✅ 流程一致 |
| **規劃 (/ag-plan)** | 負責執行 (落盤規範) | 審核對應報告 | N/A | ✅ 規範嚴謹 |
| **流轉 (/cl-flow)** | 在母版定義 | 負責執行 (Runner 模式) | N/A | ✅ v2.1.0 最新準則 |
| **完成 (/commit)** | 母版（含 Git/Notion） | 橋接（引導至母版） | N/A | ✅ 定義統一 |

【3. 發現與警示】

1.  **Router 滯後 (🟡 輕度風險)**：
    `docs/FHS_Prompts.md` 目前版本為 v1.2 (2026-03-30)，其內容尚未包含 v2.1.0 的規劃三部曲 (`/px-plan`, `/ag-plan`, `/cl-flow`)。當前 AI 在進入「規劃任務」時，缺乏 Router 層級的明確路由提示。
2.  **指令別名殘留 (🟡 冗餘)**：
    `reflect.md` (已更名為 `commit.md`) 與 `a3go.md` (已退役並由 `cl-flow.md` 取代) 依然存在於母版資料夾中。雖然有跳轉說明，但可能導致 AI 在搜尋時產生瞬間混淆。
3.  **PX 指令定位**：
    PX 並無本地 Agent 實體，其所有指令 (`/px-audit`, `/px-plan`) 均由 A3 (CL) 或 A2 (AG) 透過 MCP 或 Runner 腳本代理執行。

【4. 總結建議】
全系統指令在 **邏輯層面高度一致**，且具備明確的「母子架構」。
**下一步建議**：更新 `FHS_Prompts.md` 到 v1.3，將 `/cl-flow` 納入【情境十二：系統開發與大規模規劃 (CL-Flow)】，以完成最後一哩路的對齊。
