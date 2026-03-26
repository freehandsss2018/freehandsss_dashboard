# Freehandsss 系統全方位操作說明書 (System Instruction Manual)
> **版本**: V45.7.4 (n8n Soul Restored Edition)
> **作者**: Antigravity & Claude AI Team
> **日期**: 2026-03-26

---

## 1. 系統鳥瞰：三端對齊架構 (The Triple-Sync Architecture)

Freehandsss 系統由三個核心組件構成，數據在其中流轉：

1.  **Dashboard (前端控制台)**: 
    *   **檔案**: `freehandsss_dashboardV35.html`
    *   **作用**: Ling Au 的下單工具。它會生成一個複雜的 **JSON Payload**（包含 Order_ID, Items, Raw_Form_State），並發射到 n8n。
2.  **n8n (智能處理引擎)**:
    *   **檔案**: `n8n/FHS_Core_OrderProcessor.json`
    *   **位置**: Synology NAS Docker (`n8n-freehandsss`)
    *   **作用**: 系統的「靈魂」。負責計算利潤、標準化 SKU、將訂單寫入 Airtable，並發送 Telegram 戰報。
3.  **Airtable (雲端主資料庫)**:
    *   **Base**: `app9GuLsW9frN4xaT`
    *   **作用**: 永久儲存數據。分為 `Main_Orders`（訂單）、`Order_Items`（細項）與 `Product_Database`（價格與成本真理）。

---

## 2. 靈魂與規則：大腦文件 (The Brain Documents)

任何 AI 助理進入系統開發前，必須無條件遵循以下文件的優先級：

### 2.1 [.cursorrules](file:///.cursorrules) — 系統靈魂 (The Soul)
*   **定義了系統的行為準則。**
*   **最高禁令**：禁止在 n8n 介面使用 Import（會斷開 Webhook）、必須使用繁體中文。
*   **最高協議**：所有的代碼修改必須經過「三端對齊稽核」。

### 2.2 [FHS_Blueprint.md](file:///FHS_Blueprint.md) — 技術藍圖 (The Blueprint)
*   **定義了技術規格。**
*   **內容**：如何命名 ID、數據結構為何、手機端與電腦端的 UI 分流邏輯、n8n 24 節點的架構設計。

### 2.3 [FHS_Product_Bible_V3.7.md](file:///FHS_Product_Bible_V3.7.md) — 產品真理 (The Truth)
*   **定義了業務邏輯。**
*   **內容**：全產品 SKU、正確價格、畫圖成本、階梯加購規則、3肢等於4肢的防呆邏輯。

---

## 3. 數據羅盤：[Triple_Sync_Field_Map.md](file:///n8n/Triple_Sync_Field_Map.md)

**這是 V45.7.4 新增的最重要文件。**
*   它記錄了前端 JSON 欄位（如 `Order_Items_List`）與 n8n 處理變數以及 Airtable 欄位（如 `Search_SKU`）之間的 1:1 映射關係。
*   **開發前必看**：如果您要修改任何欄位名稱，必須在此文件中同步更新。

---

## 4. 運維 SOP：如何正確修改系統 (Standard Operating Procedures)

### 4.1 修改 n8n 工作流 (Maintenance)
1.  **核對地圖**：先看 `Triple_Sync_Field_Map.md` 確定數據流路徑。
2.  **本地編輯**：修改 JSON 代碼，切記 **Code Node v2 必須回傳 `[{json: {...}}]` 格式**。
3.  **安全測試 (Safe Test)**：
    *   將 JSON Payload 寫入本地 `.json` 檔案。
    *   執行 `curl -d @file.json`。**嚴禁在命令行直接输入中文**，否則會亂碼。
4.  **API 部署 (Deployment)**：
    *   **禁止：** UI 手動導入「Import」。
    *   **正確：** 使用 `curl -X PUT` 直接更新現有工作流 ID，這才能保全 Webhook 連結不中斷。

### 4.2 雲端大腦同步 (Notion Sync)
每次完成重大修復或功能更新後，必須執行：
`node Sync_Notion_Brain.js`
這會將本地的 `.fhs/memory/lessons/` 教訓同步到您的 Notion 雲端，讓未來的 AI 助理更聰明。

---

## 5. 常見故障排除 (Troubleshooting)

| 症狀 | 可能原因 | 解決方法 |
| :--- | :--- | :--- |
| **總成本 = $0** | SKU 代碼不匹配 / 中文編碼損壞 | 檢查 `Parse Items` 節點的正規化邏輯；使用 UTF-8 檔案進行測試。 |
| **Telegram 警報頻發** | `Profit Auditor` 回傳格式非陣列 | 確保 `return [{json: auditResults}]`。 |
| **Telegram 消息為空** | n8n 降級或 activeVersionId 未同步 | 通過 SSH 入 NAS 資料庫，強制將 `activeVersionId` 設定為 Gold Master。 |
| **Dashboard 打不開** | HTML ID 被 AI 竄改 | 檢查 `captureFormState()` 中調用的元素 ID 是否與 HTML 一致。 |

---

## 6. 版本紀錄 (Release Tracking)

*   **Changelog.md**: 每一次代碼 Push 前，必須在此文件中寫下修復了什麼、新增了什麼。
*   **Git**: 所有的穩定版本均已 Push 至 GitHub。當前最新穩定分支：`main` (V45.7.4)。

---
**說明書結束。如有疑問，請諮詢您的 AI 架構師 Antigravity。**
