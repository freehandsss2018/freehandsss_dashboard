# FHS 系統藍圖 (FHS System Blueprint) - V4.8 (n8n Soul Restoration)
> [!IMPORTANT]
> **所有的具體售價、成本與銷售防呆邏輯，已全數轉移至 `FHS_Product_Bible_V3.7.md`，並通過「終極審判 (The Final Judgment)」100% 盲測驗收。**

> 💡 **【給 Fat Mo 的系統文件定位說明】**
> 本文件 (`FHS_Blueprint.md`) 是全系統的「核心邏輯與技術規格真相」。它定義了數據結構、ID 規則以及系統架構的最高準則。當 AI (如 Cursor/Antigravity) 介入開發時，必須首先讀取此文件，以確保所有決策與既定邏輯不產生衝突。

## 1. 公司背景與人員定義 (Business Context)
* **品牌名稱**：Freehandsss
* **核心業務**：嬰兒手足立體石膏倒模紀念品工作室。提供木框、玻璃瓶以及客製化金屬飾品（鎖匙扣、頸鏈）等服務。
* **技術定位**：傳統手工倒模技術與現代 3D 渲染/金屬鑄造技術的結合。
* **角色分工**：
  * **Ling Au (用戶)**：負責銷售、IG 經營、客情維護。操作 Dashboard 程度為核心使用者，因此前端介面必須極度防呆、直觀。
  * **Fat Mo (後台/總架構師)**：負責技術架構、工作流維護、財務數據精算與系統除錯。

## 2. 系統架構 (Technical Architecture)
* **Dashboard (The Heart)**：**Freehandsss 智能中樞 (AI Smart Hub)**
  * **角色**：系統的「中央神經系統」與「財務自動化中樞」。
  * **功能**：
    * **守護者**：強制所有邏輯變更符合 `FHS_Blueprint.md` 準則。
    * **財務執行**：系統唯一的財務計算核心，減少人工干預利潤計算。
    * **引導導購**：確保 UI 始終維持對 Ling Au 的「智能菜單」防呆水平。
    * **持續記憶**：透過 `.cursorrules` 與 `Changelog.md` 實現自我修復與持續進化。
    * **n8n 靈魂守護**：強制生產環境運行 24 節點 Gold Master 版本，並實施「三端對齊稽核」。

## 3. 下單與產品 SKU 定義 (SKU & Ordering)
* **五維度產品查找邏輯 (The 5-Dimension Lookup Logic)**：
  目前系統維護超過 484 個 SKU，透過五個維度組成的 Key 進行精準匹配：`[對象] & [類別] & [部位] & [材質] & [數量]`。這確保了從前端選擇到後端計價的數據一致性。
* **產品維度詳解**：
  1. **對象 (Subject)**：區分「嬰兒 (Infant)」、「小童」、「成人」或「家庭」。
  2. **類別 (Category)**：區分「手模 (Hand)」、「腳模 (Foot)」、「手腳綜合」或「金屬產品」。
  3. **材質 (Material)**：區分「白石膏」、「金色石膏」、「銀色石膏」或「925純銀/鍍金」。
  4. **部位 (Part)**：具體描述部位，如「左手」、「右手」或「單隻」。
  5. **數量 (Quantity)**：如「單件」、「一对」或「四肢套裝」。

### 3.1 定價與成本結構 (Pricing & Cost Structure)
系統嚴格執行 **五維度查找邏輯 (5D Lookup Logic)**，所有的基礎售價 (`Suggested_Price_Manual`)、畫圖成本 (`Drawing_Cost`) 以及階梯加購規則，統一由 `FHS_Product_Bible_V3.7.md` 作為唯一真理來源。

*   **圖紙費規則**：
    - **同部位**：邏輯定義於 Product Bible。
    - **不同部位 (一手一腳)**：每個「新部位」額外加收圖紙費（具體金額參閱 Product Bible）。
    - **頸鏈豁免**：特定條件下免收圖紙費之邏輯。
*   **3D 擺設基準**：
    - 區分「木框裝」與「玻璃瓶」，成本與售價由系統自動從資料庫提取。

## 4. 核心財務邏輯 (Core Financial Logic)
* **原則**：由 Dashboard 前端 Live Quote Engine 即時精算成本與售價，減少手動干預。所有精算結果隨 JSON Payload 直接寫入 n8n，全面取代舊版公式層。
* **計算輸出欄位** (Payload 綁定)：
  1. **System_Final_Sale_Price** = 依據五維度 SKU 查表與階梯價加總而得的建議售價。
  2. **System_Total_Cost** = 依據對象與模式 (S/P) 分配予 Fat Mo 的畫圖成本總和。
  3. **System_Additional_Fee** = 單購保護費 ($1000) 或跨部位保護費 ($100/$300) 的加總。

## 5. 前端 UI/UX 規範 (Frontend UI/UX Rules)
* **視覺風格**：全系統採用 V31.0 (Historical Reference) 定案的 Premium 玻璃擬態 (Glassmorphism) 設計，包含漸層背景與平滑過渡動畫。
* **雙端分流架構 (Dual-Experience UI)**：
  - **👧 Ling Au 模式 (行動端 < 768px)**：定位為「Point-of-Sale 點餐機」。必須實作固定底部導覽列 (Bottom Navigation)、卡片式步進引導 (Wizard flow)、加大觸控區域 (大於 44px)，並強制隱藏複雜的財務數據網格。
  - **👦 Fat Mo 模式 (桌面端 > 1200px)**：定位為「Data Cockpit 決策座艙」。必須實作側邊導覽列 (Sidebar)、最大化全域核對中心的螢幕寬度（嚴格遵守 td rowspan 對齊定律），並於頂部新增「動態財務看板」(自動結算總收入、總成本與最終利潤)。
* **UI 開發與邏輯防護守則 (Stitch MCP Protocol)**：
  - 任何 UI 外殼的翻新，必須透過 Stitch MCP 或類似 AI 工具生成，但絕對嚴禁修改既有的 Element IDs (如 `momName`, `syncBtn`, `reviewTableBody`)。
  - 必須 100% 保留 `captureFormState()` 的數據擷取結構與現有的 `onclick`/`onchange` 綁定，以確保 n8n 與 Airtable 寫入鏈路不被破壞。
* **排版守則**：
  - **全域核對中心**：強制使用 HTML `<td rowspan>` 結構進行多品項排列。
  - **字體標準**：數據網格內容統一 13px，Header 12px 加粗。
  - **對齊定律**：所有主屬性（單號、日期）必須設定 `vertical-align: top;`。
  - **全域載入指示器 (Global Loader)**：任何涉及 API 呼叫的動作必須包裹在 `showLoader()` / `hideLoader()` 中，並提供對應的動態文字提示。
  - **單號快跳 (Quick-Jump)**：核對中心單號必須使用 `.review-jump-pill` 樣式並具備一鍵切換模式並讀取的功能。


## 6. Dashboard CRUD 與狀態保持 (Form State Preservation)
* **Raw_Form_State**：系統將前端表單的所有選項序列化為 JSON 並存入 Airtable，實現 0.1 秒極速還原舊單。
* **Upsert Shield**：任何寫入 Airtable 的動作必須具備 Upsert 邏輯，避免產生重複數據。

## 7. Airtable 數據架構 (Data Schema)
* **Main_Orders**：訂單主表。
* **Order_Items**：訂單細項表（對應多個產品）。
* **Product_Database**：SKU 基礎資料與成本資料。
* **Error_Logs**：系統錯誤與監控日誌。

## 8. 雲端之眼監控系統 (The Cloud Eye)
* **Catch-Push-Diagnose**：
  1. **Catch**：n8n 捕捉工作流錯誤。
  2. **Push**：將錯誤日誌推送到 Airtable `Error_Logs`。
  3. **Diagnose**：AI 助理透過 MCP 定期掃描日誌並向 Fat Mo 提出診斷建議。

## 9. Antigravity 執行協議 (Execution Protocol)
* **執行權限解封**：執行指令時加入 `-y` 或 `-f` 參數。
* **腳本自理**：臨時測試腳本必須包含自刪邏輯。
* **自我測試閉環**：代碼修改後必須在沙盒模式執行 `runAllAudits()`。
* **部署與同步授權**：正式環境檔案 `Freehandsss_dashboard_current.html` 被嚴格保護。任何新功能的開發、Bug 修復或 UI 微調，初始僅能實施於開發版本文件。在未獲得 Fat Mo 明明確指令（如「完成，更新套用至 current 版本中」）之前，AI 禁止執行 `cp` 或覆寫 `current` 端的動作。

## 10. 全端變更控制與除錯憲法 (Change Control & Debugging Constitution)
* **防隧道視野 (Anti-Tunnel Vision)**：處理任何 Bug 或新增功能時，AI 必須從「系統全局」視角思考。修好的 A 功能（如 Telegram 顯示）的同時，若破壞了 B 功能（如表單讀取），視為「嚴重失職」。
* **三端對齊稽核 (Triple-Sync Audit)**：前端 (Dashboard Payload) -> 中介層 (n8n JSON) -> 儲存端 (Airtable Schema) 必須維持絕對的 1:1 映射。任何一端的增刪改，必須同步審計另外兩端，確保牽一髮動全身的數據不遺失。
* **經驗傳承鐵律 (Mandatory Memory Retrieval)**：發生問題時，必須優先檢索 `.fhs/memory/lessons/`，確認是否犯過類似錯誤。絕對禁止憑空盲目試錯，無視過往已建立的穩定版基石。

## 11. SKU 正規化與補丁守則 (SKU Normalization)
* **規則優先**：任何與 Bible 不符之前端輸入，必須在 n8n `Parse Items` 節點進行「收斂」。
* **典型補丁**：
  - `3肢` -> `4肢` (計價與成本對齊)。
  - `款式` -> `套裝` (SKU 字符標準化)。
* **API 唯一路徑**：生產環境修改僅限 `curl -X PUT`，嚴禁 `Import From File`。

---
**版本紀錄與日誌同步**：每次修改核心代碼後，必須同步更新 `Changelog.md`。