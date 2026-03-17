# FHS 系統藍圖 (FHS System Blueprint) - V4.5
> 💡 **【給 Fat Mo 的系統文件定位說明】**
> 本文件 (`FHS_Blueprint.md`) 是全系統的「核心邏輯與技術規格真相」。它定義了數據結構、ID 規則、利潤公式以及系統架構的最高準則。當 AI (如 Cursor/Antigravity) 介入開發時，必須首先讀取此文件，以確保所有決策與既定邏輯不產生衝突。

## 1. 公司背景與人員定義 (Business Context)
* **品牌名稱**：Freehandsss
* **核心業務**：嬰兒手足立體石膏倒模紀念品工作室。提供木框、玻璃瓶以及客製化金屬飾品（鎖匙扣、頸鏈）等服務。
* **技術定位**：傳統手工倒模技術與現代 3D 渲染/金屬鑄造技術的結合。
* **角色分工**：
  * **Ling Au (用戶)**：負責銷售、IG 經營、客情維護。操作 Dashboard 程度為核心使用者，因此前端介面必須極度防呆、直觀。
  * **Fat Mo (後台/總架構師)**：負責技術架構、工作流維護、財務數據精算與系統除錯。

## 2. 系統架構 (Technical Architecture)
* **智能中樞 (The Heart)**：**Freehandsss 智能中樞 (AI Smart Hub)**
  * **角色**：系統的「中央神經系統」與「財務自動化中樞」。
  * **功能**：
    * **守護者**：強制所有邏輯變更符合 `FHS_Blueprint.md` 準則。
    * **財務執行**：系統唯一的財務計算核心，減少人工干預利潤計算。
    * **引導導購**：確保 UI 始終維持對 Ling Au 的「智能菜單」防呆水平。
    * **持續記憶**：透過 `.cursorrules` 與 `Changelog.md` 實現自我修復與持續進化。

## 3. 下單與產品 SKU 定義 (SKU & Ordering)
* **五維度產品查找邏輯 (The 5-Dimension Lookup Logic)**：
  目前系統維護超過 484 個 SKU，透過五個維度組成的 Key 進行精準匹配：`[對象] & [類別] & [部位] & [材質] & [數量]`。這確保了從前端選擇到後端計價的數據一致性。
* **產品維度詳解**：
  1. **對象 (Subject)**：區分「嬰兒 (Infant)」、「小童」、「成人」或「家庭」。
  2. **類別 (Category)**：區分「手模 (Hand)」、「腳模 (Foot)」、「手腳綜合」或「金屬產品」。
  3. **材質 (Material)**：區分「白石膏」、「金色石膏」、「銀色石膏」或「925純銀/鍍金」。
  4. **部位 (Part)**：具體描述部位，如「左手」、「右手」或「單隻」。
  5. **數量 (Quantity)**：如「單件」、「一对」或「四肢套裝」。

## 4. 核心財務邏輯 (Core Financial Logic)
* **原則**：由系统自動計算成本與利潤，禁止人工手動修改最終結果。
* **計算公式**：
  1. **總收入 (Total_Revenue)** = 定金 + 尾數 + 額外收費。
  2. **總成本 (Total_Cost)** = 依照產品 SKU 提取的基礎成本（包含代印、配件、物流等）。
  3. **最終利潤 (Final_Profit)** = 總收入 - 總成本。

## 5. 前端 UI/UX 規範 (Frontend UI/UX Rules)
* **視覺風格**：全系統採用 V31.0 定案的 Premium 玻璃擬態 (Glassmorphism) 設計，包含漸層背景與平滑過渡動畫。
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
* **部署與同步授權**：正式環境檔案 `Freehandsss_dashboard_current.html` 被嚴格保護。任何新功能的開發、Bug 修復或 UI 微調，初始僅能實施於開發版本文件。在未獲得 Fat Mo 明確指令（如「完成，更新套用至 current 版本中」）之前，AI 禁止執行 `cp` 或覆寫 `current` 端的動作。

---
**版本紀錄與日誌同步**：每次修改核心代碼後，必須同步更新 `Changelog.md`。
