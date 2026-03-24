# FHS 系統架構與全量交接文檔 (V35.0 Standard)

本文件旨在為新接入的 AI (如 Claude) 提供 FHS (Freehandsss) 系統的即時全景視角，確保開發邏輯、財務準則與 SOP 協議的 100% 傳承。

## 1. 系統靈魂層 (Core Constraints - The SOUL)
這兩份檔案定義了 AI 的身分、邊界與行為邏輯，嚴禁任何違反其協議的代碼改動。

*   **[.cursorrules](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.cursorrules)**:
    - **身分**: 全端架構稽核員。
    - **協議**: 包含「隧道視野防禦」、「Stitch MCP 協議」、「日誌錨定 (Changelog Anchoring)」與「字元潔淨度 (NEL Check)」。
    - **核心**: 任何任務開始前必須讀取 Changelog 最後 20 行。
*   **[FHS_Prompts.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/FHS_Prompts.md)**:
    - **情境路由**: 定義了 10 個核心執行場景（POS 模式、修改模式、財務稽核、記憶引擎 3.0 等）。
    - **重要性**: 提供具體的 Prompt 模板，確保 AI 在不同任務中角色切換的精確性。

## 2. 系統大腦層 (Knowledge & Memory)
定義了業務邏輯的實體規則與歷史經驗。

*   **[FHS_Blueprint.md (V4.7+)](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/FHS_Blueprint.md)**:
    - **總綱**: 系統架構、數據 Schema、五維度 (對象-類別-規格-材質-數量) SKU 查找邏輯及全域安全規範。
*   **[FHS_Product_Bible_V3.7.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/FHS_Product_Bible_V3.7.md)**:
    - **財務真理**: 所有產品的底層成本、售價與梯流折扣邏輯。V3.7 確立了首飾加購 $1,980 的新基準。
*   **[Changelog.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Changelog.md)**:
    - **版本軌跡**: 目前最新穩定版為 **V35.0**。所有紀錄按日期降序排列。
*   **[.fhs/memory/handoff.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/memory/handoff.md)**:
    - **跨會話記憶**: 記錄當前 Pending 任務與開發分支狀態。
*   **[.fhs/memory/lessons/](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/memory/lessons/)**:
    - **教訓庫**: 存放如「編碼損毀危機」、「Latin-1 陷阱」等重大事故的反思紀錄。

## 3. 系統心臟層 (The Front-end - Dashboard)
交互介面與核心算價引擎。

*   **[freehandsss_dashboardV35.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/freehandsss_dashboardV35.html)**:
    - **目前開發分支**: 包含 V3.7 財務邏輯、NEL 字符修復與 UTF-8 強制編碼。
*   **[Freehandsss_dashboard_current.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_dashboard_current.html)**:
    - **生產環境**: 目前運行於前線的穩定版本。

## 4. 系統神經層 (Integrations & Backend)
數據流與雲端連動。

*   **n8n Workflows (NAS)**:
    - `FHS_Core_OrderProcessor`: 訂單處理核心（支持前端成本優先協議）。
    - `FHS_System_ErrorMonitor`: 全域錯誤攔截與 Cloud Eye (Airtable) 推送。
*   **Airtable Bases**:
    - `Main_Orders`: 訂單主表。
    - `Product_Database`: 產品維度真理庫。
*   **Notion Cloud Brain**:
    - 透過 `Sync_Notion_Brain.js` 定期同步本地 Lessons 至雲端。

## 5. 核心執行 SOP (The Protocols)
1.  **任務啟動**: 執行 `view_file` 讀取 `Changelog.md` 錨定版本。
2.  **狀態同步**: 讀取 `handoff.md` 確認接手位置。
3.  **寫入守衛**: 強制使用 Python 寫入 UTF-8，並掃描 `U+0085` (NEL) 字符。
4.  **三端對齊**: 修改代碼後，必須確保本地日誌、Airtable 被動映射與 Notion 雲端大腦同步。

---
*Claude, 請以此文檔作為 FHS 的最高啟動手冊。*
