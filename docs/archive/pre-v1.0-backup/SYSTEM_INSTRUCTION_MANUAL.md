# Freehandsss 系統全方位操作說明書 (System Instruction Manual)
>
> **版本**: V4.8.1 (AI Auto-Wake Edition)
> **作者**: Antigravity & Claude AI Team
> **日期**: 2026-03-26

---

## 1. 系統鳥瞰：三端對齊架構 (The Triple-Sync Architecture)

Freehandsss 系統由三個核心組件構成，數據在其中流轉：

1. **Dashboard (前端控制台)**:
    * **檔案**: `freehandsss_dashboardV35.html`
    * **作用**: Ling Au 的下單工具。它會生成一個複雜的 **JSON Payload**。
2. **n8n (智能處理引擎)**:
    * **檔案**: `n8n/FHS_Core_OrderProcessor.json`
    * **作用**: 系統的「靈魂」。負責計算利潤、標準化 SKU、發送 Telegram 戰報。
3. **Airtable (雲端主資料庫)**:
    * **Base**: `app9GuLsW9frN4xaT`
    * **作用**: 永久儲存數據。分為 `Main_Orders`、`Order_Items` 與 `Product_Database`。

---

## 2. 靈魂與規則：大腦文件 (The Brain Documents)

任何 AI 助理進入系統開發前，必須無條件遵循以下文件：

### 2.1 [.cursorrules](file:///.cursorrules) — 系統靈魂 (The Soul)

* **自動喚醒**：Cursor/Gemini 啟動時自動讀取。
* **最高協議**：嚴禁 n8n 手動 Import，強制 Code Node v2 陣列格式。

### 2.2 [.clauderules](file:///.clauderules) — Claude 專屬靈魂

* **自動喚醒**：Claude Code (CLI) 啟動時自動觸發，強制讀取初始化文件。

### 2.3 [FHS_Blueprint.md](file:///FHS_Blueprint.md) — 技術藍圖

* **內容**：ID 命名規範、UI 分流邏輯、n8n 24 節點架構。

### 2.4 [FHS_Product_Bible_V3.7.md](file:///FHS_Product_Bible_V3.7.md) — 產品真理

* **內容**：SKU 精確價格、畫圖成本、3肢=4肢防呆報價規則。

---

## 3. 數據羅盤：[Triple_Sync_Field_Map.md](file:///n8n/Triple_Sync_Field_Map.md)

**這是防止數據斷鍊的最高準則。**

* 記錄了前端 JSON ➔ n8n ➔ Airtable 的 1:1 欄位映射關係。修改後端邏輯前必讀。

---

## 4. 運維 SOP 與快捷指令 (SOP & Commands)

### 4.1 神速喚醒指令 (The Magic Commands)

若覺得 AI 記憶模糊或沒按 SOP 辦事，請输入：

* **`/read`**：強制所有 AI 重啟記憶並同步最高協議。
* **`@SOP_NOW`**：(手動掛鉤) 觸發初始化程序。

### 4.2 修改 n8n 工作流

1. **地圖先行**：查閱 `Triple_Sync_Field_Map.md`。
2. **本地編輯**：修改 JSON，回傳格式必須為 `[{json: {...}}]`。
3. **安全測試**：使用 UTF-8 `.json` 文件進行 `curl -d @file` 測試。
4. **API 部署**：禁止使用 n8n UI 的「Import」，必須透過 API PUT 更新現成 ID。

### 4.3 雲端大腦同步 (Notion Sync)

任務結束後執行：`node Sync_Notion_Brain.js`。

---

## 5. 常見故障排除 (Troubleshooting)

| 症狀 | 可能原因 | 解決方法 |
| :--- | :--- | :--- |
| **總成本 = $0** | SKU 代碼不匹配 / 編碼損壞 | 檢查 `Parse Items` 正規化層；使用 UTF-8 測試。 |
| **Telegram 警報頻發** | 格式非陣列 | 確保 `return [{json: auditResults}]`。 |
| **Telegram 內容丟失** | n8n 被降級至 23 節點 | 通過 SSH 切換 `activeVersionId` 至 Gold Master。 |

---
**說明書結束。如有疑問，隨時呼叫 `/read` 呼喚系統靈魂。**
