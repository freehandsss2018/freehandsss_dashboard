# FHS 系統架構藍圖 (FHS System Blueprint) - V4.3
> 💡 **【給 Fat Mo 的文件定位說明】**
> 本文件 (`FHS_Blueprint.md`) 是整個系統的**「大腦與憲法」**。它不僅定義了所有的 ID 命名規則、利潤公式，更記載了系統運作的「根本邏輯」。每當 AI (如 Cursor/Antigravity) 介入開發時，必須首先讀取此藍圖，以確保新功能不與既有大腦衝突。

## 1. 公司背景與營運範式 (Business Context)
* **品牌名稱**：Freehandsss
* **核心業務**：嬰兒手足立體石膏倒模紀念品工作室。提供木框、玻璃罩、以及客製化金屬飾品（鎖匙扣、頸鏈等）。
* **未來發展**：計畫拓展 3D 掃描技術與全新金屬產品線。
* **團隊分工**：
  * **👧 Ling Au (前線)**：負責銷售、IG 經營、客服與建立訂單。對電腦程式知識為 0，因此前端介面必須極度防呆、直觀。
  * **👦 Fat Mo (後台/總架構師)**：負責技術架構、工作流自動化、財務數據精算與系統除錯。

## 2. 系統架構 (Technical Architecture)
* **核心核心 (The Heart)**：**Freehandsss 智能中樞 (AI Smart Hub)**
  * **角色**：系統的「中央神經系統」與「行為守門員」。
  * **功能**：
    * **守護藍圖**：強制所有開發必須符合 `FHS_Blueprint.md` 的邏輯。
    * **財務自動化**：作為唯一合法的財務計算核心，嚴禁人工干預利潤運算。
    * **防呆導購**：確保 UI 始終維持針對 Ling Au 的「智能點餐機」防呆水平。
    * **進化記憶**：透過 `.cursorrules` 與 `Changelog.md` 實現自我修復與持續進化。
* **前端 (Frontend)**：HTML / Vanilla JS (Nexus-OS 介面)，部署於 Synology NAS。
* **後端 (Backend/ERP)**：Airtable (FHS_Order_Processor base)，透過 MCP 與智能中樞直連。
* **自動化引擎 (Automation)**：n8n (Self-hosted)，負責所有商業邏輯判斷、SKU 拆解與 API 串接。目前核心工作流命名為 `FHS_Core_OrderProcessor`。
* **通訊與通知**：Meta Graph API (IG 訊息)、Telegram (內部戰報)。

## 3. 產品定義與成本驅動因子 (Product Catalog & Cost Drivers)
特工在設計前端 UI 時，必須理解以下產品層級、五維度辨識與成本驅動因素：
* **五維度 SKU 搜尋機制 (The 5-Dimension Lookup Logic)**：
  系統底層的 484 個 SKU 唯一識別碼（Key）是由五個維度組成：`[對象] & [手腳] & [產品] & [材料] & [數量]`。前端表單的設計必須能準確收集這五個維度的資訊，交由後台自動匹配畫圖、取模與材料成本。
* **成本驅動因子分類**：
  1. **基礎產品 (Infant)**：針對單一嬰兒手腳。數量 1 包含基礎運費；數量 2 以上為「加購」，反映物流成本的節省。材料分流（不銹鋼 vs 925銀/鋁合金）會直接影響成本。
  2. **相片選購版 (Photo - P)**：客戶提供照片，無須實體取模。成本結構中省去了取模的材料與人力，但保留後續的畫圖與製作成本。
  3. **家庭合成版 (Family - S1, S2)**：
     * **S1**：父母手 + 1 嬰兒手/腳（共 2 幅畫圖）。
     * **S2**：父母手 + 1 嬰兒手 + 1 嬰兒腳（共 3 幅畫圖）。
     * **核心邏輯**：畫圖幅數增加 = 勞動力成本上升，這是與基礎產品產生差價的主要來源。🚨 **警告**：「父母手」絕對不是獨立販售的單一產品，必須依附於家庭組合中。

## 4. 財務運算與最終利潤定律 (Core Financial Logic)
* **最高原則**：最終銷售金額與利潤必須「全自動計算」，絕對不允許人工輸入或複製貼上。
* **利潤精算邏輯**：
  1. 總營收 (Total_Revenue) = 已付訂金 + 未付清餘額 + 車費及其他服務費。
  2. 總成本 (Total_Cost) = 所有子項目底層成本的總和。
  3. 最終淨利 (Final_Profit) = 總營收 - 總成本。
* **兩大最終利潤結算定律 (成本扣減法則)**：
  在抓取到基礎成本後，系統需套用以下定律來精算最終利潤（於底層運算）：
  * **銀頸鏈定律**：針對「吊飾/頸鏈」類別，每 2 隻產品自動扣減 $220 的頸鏈成本。
  * **運費定律**：針對「鎖匙扣」類別，同一張單的第 2 隻產品起，每隻自動扣減 $20 的運費/包裝成本。

## 5. 前端設計守則 (Frontend UI/UX Rules)
* **智能點餐機模式**：前端 Dashboard 必須像「智能點餐機」，隱藏所有複雜的五維度 SKU 組合邏輯。
* **極致防呆 (V26 最新實作)**：包含「套用至其他」的智能複製按鈕、家庭合成鎖匙扣的防呆選項動態聯動。
* **條件式渲染**：若勾選「相片選購版」，則不應出現「實體取模」的相關加購選項。
* **雙模式切換 (Role-based Views)**：
  * **Ling Au 模式**：隱藏與生產核對相關的複雜資訊。
  * **Fat Mo 模式**：顯示「📋 本單產品核對清單 (生產專用)」，供後台生產覆核。
* **全域核對中心 (Global Review Center)**：
  * 作為 Fat Mo 的專屬視角，必須對所有訂單子項目(Items)實現「維度矩陣化」。
  * **排版公理**：嚴禁使用巢狀 `CSS Grid` 破壞表格對齊。必須採用原生的 `<td rowspan>` 結構向下延展單號與客人資訊，確保與 `<thead>` 上的【刻字】、【明細】、【批次】、【進度】欄位達到 Pixel-Perfect 的完美垂直對齊。
  * **字體基線**：強制使用無襯線字體與 Flexbox `align-items: center`，確保中英文與 Emoji 混排時的基線穩定。
* **動態免責聲明**：系統會根據所選產品（立體擺設 vs 金屬飾品 vs 綜合）自動生成長短適宜且附帶 emoji 的 IG 訊息及注意事項，方便直接複製貼上。

## 6. Dashboard CRUD 核心架構 (V25/V26 Form State Preservation)
* **目標**：支援無縫的「建立新單」與「修改舊單」。
* **架構**：
  1. **新建單 (`action: "create"`)**：送出資料時，除了結構化資料外，將表單的所有控制項狀態打包為 `Raw_Form_State` (純文字 JSON) 同步送往 n8n/Airtable。
  2. **修改單 (`action: "update"`)**：透過輸入 `Order_ID` 呼叫 n8n Fetch Webhook (`/webhook/fetch-fhs-order`)，載入舊資料並解析 `Raw_Form_State`，於 0.1 秒內完美還原所有「五維度資料」與「刻字內容」。
   3. **恢復生命週期 (Restoration Lifecycle)**：採「三階段還原法」：
      - 第一階段：還原靜態 ID 欄位並觸發聯動。
      - 第二階段：根據聯動結果重新渲染動態 DOM (如肢體選單)。
      - 第三階段：利用 `data-who` 特性精準還原沒有 ID 的動態元件值。
   4. 操作流程必須讓 Ling Au 輕鬆還原舊單、修改餘額/刻字，然後再次送出，避免反向解碼的複雜度。
   5. **後端防呆 (The Upsert Shield)**：n8n 接收前端 payload 時，Airtable 寫入節點 (`Create Main Order` 與 `Create Sub Items`) **必須** 配置為 `Upsert` 模式，並分別以 `Order_ID` (Main_Orders) 與 `Order_Item_Key` (Order_Items) 作為 Matching Columns。
   6. **精準 ID 映射 (Precision ID Mapping)**：在 n8n 寫入子項目時，為了確保 100% 寫入成功，應優先使用 Airtable 的 `Record ID` 進行連結（`Product_Link` 與 `Order_Link`），並在節點設定中將 Mapping Mode 設為 `Define Below` 以確保正確解析。

---

## 7. 資料庫 Schema 與公式字典 (Airtable Data Dictionary)
* **全域強制文件與命名規範 (Documentation & Naming Standards)**：
    * **中文註解義務**：凡是進行任何「新增、修改、優化、更新」動作，都**必須**加上清晰的繁體中文 Description (描述) 或註解，以便 Fat Mo 追蹤。這涵蓋了：
        * **Airtable**：所有 Table 與 Field。
        * **n8n**：所有 Workflow (需有 Sticky Note) 與 節點 (Nodes)。
        * **程式碼**：HTML 與 JavaScript 檔案內的邏輯區塊。
    * **命名規範**：任何新建項目必須符合「系統一致性、專業度、易明」原則（例如 `FHS_Module_Action`）。
* 前端系統在進行 CRUD 操作時，**絕對不要**在 payload 中傳送標註為 `[Formula]`, `[Rollup]`, `[Lookup]` 的欄位。

### 表 1：`Main_Orders` (主訂單表)
* **`Order_ID`** [String]：系統自動生成的唯一單號。生成邏輯：`FHS` + `{Type_Code(W/M/G)}` + `{Source_Code(I/T)}` + `-` + `YYMMDD` + `-` + `{當年訂單流水號}` (目前前端已實作隨機防撞單號生成，後續可依 n8n 進一步規範)。
* **`Customer_Name`** [String]：客戶名稱。
* **`Deposit`** [Number]：已付訂金。
* **`Balance`** [Number]：未付清餘額。
* **`Additional_Fee`** [Number]：車費及其他服務費。
* **`Raw_Form_State`** [Long Text]：前端傳送來的序列化表單狀態，支援完美還原 UI。
* **`Final_Sale_Price`** [Formula]：總售價 (`Deposit + Balance + Additional_Fee`)。
* **`Total_Cost`** [Currency/Rollup]：整筆訂單總成本。
* **`Net_Profit`** [Formula]：最終淨利 (`Final_Sale_Price - Total_Cost`)。

### 表 2：`Order_Items` (子項目明細表)
* **`Item_ID`** [Formula]：`{Order_Link} & " | " & {Product_Link}`
* **`Order_Link`** [Linked Record]：關聯至 `Main_Orders`。
* **`Product_Link`** [Linked Record]：關聯至 `Product_Database_V2`。
* **`Quantity`** [Number]：購買數量。
* **`Engraving_Text`** [Long Text]：客製化刻字。
* **`Item_BaseCost`** [Lookup]：透過 Product_Link 自動抓取的底層總成本。
* **`Order_Item_Key`** [String]：**[核心識別碼]** 用於 Upsert。格式：`單號_類別_部位` (如 `0623151_K_LH`)，確保更新時不產生重複欄位。

### 表 3：`Product_Database_V2` (SKU 大本營)
*存放 484 個精準 SKU，由 5 維度組合而成，前端絕對不可見。*
* **`Product_Name`** [String]：SKU 標準名稱。
* **`Item_Per_Set`** [Number]：該 SKU 預設包含的物件數量（乘數）。
* **`Total_Base_Cost`** [Formula]：核心成本精算引擎。公式：`{Drawing_Cost} + ({Printing_Cost} + {Clasp_Cost}) * {Item_Per_Set} + {Shipping_Cost}`

### 表 4：`Base_Costs` (底層成本表)
* **`Cost_Combination_SKU`** [String]：成本組合唯一命名。
* **`Drawing_Cost`**, **`Printing_Cost`**, **`Clasp_Cost`**, **`Shipping_Cost`** [Number/Currency]：各項拆解成本。

### 表 5：`Sales_Pipeline` (銷售漏斗與 AI CRM)
*獨立追蹤，前端下單時不干擾此表。*
* **`Customer_Name`** [String]：潛在客戶名稱。
* **`Stage`** [Single Select]：進度狀態。

### 表 6：`Error_Logs` (醫療雲端日誌)
*系統監控與 AI 自動除錯的專用表格。*
* **`Time`** [String/Date]：報錯發生的時間。
* **`Workflow_Name`** [String]：發生錯誤的 n8n 工作流名稱。
* **`Error_Message`** [Long Text]：n8n 拋出的具體錯誤訊息。
* **`Node`** [String]：發生錯誤的具體節點名稱。

---

## 8. 系統監控與自動化除錯 (The Cloud Eye)
* **機制名稱**：「雲端之眼」(Cloud Monitoring System)
* **核心邏輯**：
  1. **自動捕捉 (Catch)**：所有核心工作流均掛載「Error Trigger」監聽器。
  2. **雲端推送 (Push)**：當節點報錯時，n8n 透過 Airtable 節點，將錯誤詳細資訊寫入 `Error_Logs` 表格中，完全避開本機 Docker 權限限制。核心工作流為 `FHS_System_ErrorMonitor`。
  3. **AI 即時診斷 (Diagnose)**：智能中樞 (AI) 透過其具備的 MCP (Model Context Protocol) 能力，即時從 Airtable 讀取最新的 `Error_Logs`，主動向 Fat Mo 回報失常事件及修復方案。

---

## 9. 高壓打擊測試與系統強韌度 (High-Pressure Testing & Robustness)
為了確保 V27 系統能承受真實世界的邊緣操作，核心系統已經過了以 Python 觸發的 `test_injector.py` 腳本高壓打擊（打擊對象為遠端 `yanhei.synology.me:8443` Webhook）。

* **產品矩陣終極組合測試**：系統完美拆解複雜產品組合（擺設 + 多把鎖匙扣 + 頸鏈），並精準從 `Product_Database_V2` 抓取底層成本加總，寫回 `Main_Orders` 的 `Total_Cost` 與 `Final_Sale_Price` 中。
* **Emoji 與極端字元防禦**：前端與 n8n 全 UTF-8 編碼支援，遇到滿是 Emoji 或 SQL 注入關鍵詞的字串，Airtable 也能照單全收，JSON 結構不會斷裂。
* **反覆狂暴修改 (Aggressive Upsert) 與 孤兒項目機制**：
    * 系統依賴 `Order_Item_Key`（單號_類別_部位）作為絕對防線。即使快速發送 Update 覆寫數量或備註，也不會產生重複的 Row。
    * **孤兒項目無視法則 (Orphaned Record Shield)**：若使用者在前端將加購品「刪除」後點擊修改，Airtable 中原本的該筆子項目**不會被刪除**。但這**完全不影響財務計算**，因為核心財務數據 (總入帳/總成本) 永遠是由前端重新運算當下生效的明細後，作為新的整捆 payload 複寫回主表。前端 UI 渲染也只抓取主表的 `Raw_Form_State`，完美隱藏孤兒資料並防禦意外的數據破壞。

---

## 10. 數據一致性與 Webhook 標準 (Data Consistency & Webhook Standards)
為了對抗 n8n 或其他外部系統對 JSON 資料層級的自動改變（例如 Airtable 節點的數據扁平化），系統遵循以下強韌化原則：

### 10.1 數據扁平化防禦 (JSON Flattening Shield)
*   **原則**：所有處理 Airtable 資料的 Code 節點，必須同時支援帶有 `.fields` 的巢狀結構以及被扁平化後的 Top-level 結構。
*   **實例**：使用 `const data = json.fields || json;` 來進行屬性存取。

### 10.2 取值安全性 (Array & Null Safety)
*   **強制檢查**：在對任何關聯欄位（如 `Order_Items_Links`）執行 `.forEach()` 之前，必須使用 `Array.isArray()` 進行型別檢查。避免因「空單（無子項目）」導致整個 Webhook 崩潰。

### 10.3 Webhook 響應標準 (Webhook Response Protocol)
*   **明確終點**：n8n Webhook 節點必須明確指定「回應節點 (Response Node)」，而不使用「最後節點 (Last Node)」。
*   **成功回傳**：無論後端邏輯複雜度如何，最終必須回傳一個包含 `success: true` 的標準 JSON 物件，確保前端瀏覽器能準確接收到 200 OK 狀態。

---

## 11. 開發沙盒模式 (Development Sandbox Mode)
為了在不污染生產環境資料（Airtable Production Data）的情況下進行開發與測試，系統實作了沙盒切換機制：

*   **觸發機制**：於 URL 加入參數 `?mode=dev` 即可啟動，或點擊介面頂部的「🛠️ 進入沙盒模式」按鈕進行切換。
*   **視覺標示**：啟動後，Dashboard 頂部會出現橘色「🛠️ SANDBOX MODE」橫幅，提醒使用者目前處於開發環境。
*   **API 重新導向 (Redirect Logic)**：
    *   系統會自動偵測 `isDevMode` 狀態。
    *   所有 `fetch` 呼叫均會透過 `getWebhookUrl()` 處理，將原本的 `/webhook/` 路徑自動替換為 `/webhook-test/`。
    *   這要求 n8n 中的對應工作流必須啟動「Test Webhook」節點，且該節點通常連結至測試用的 Airtable Base 或進行 Mock 回應。
*   **受影響介面**：包含「讀取舊單」、「同步至後台」、「全域核對」以及「行內編輯」。

---

## 12. 自動化測試體系 (Automated Testing System)
為了守護核心財務定律與 UI 穩定性，系統於開發模式下集成了「自動稽核中心」：

*   **執行環境**：僅於 `?mode=dev` 模式下可見，位於 Dashboard 底部。
*   **財務稽核 (`runFinanceAudit`)**：
    *   自動模擬不同產品組合（如多件鎖匙扣或銀吊飾）。
    *   驗證「運費定律」與「銀頸鏈定律」是否正確觸發並反映於總成本與利潤中。
*   **UI 完整性稽核 (`runUIIntegrityCheck`)**：
    *   執行「狀態捕捉 -> 重置 -> 還原」自動化流程。
    *   **非同步延遲補償**：[V45.2 修復] 因肢體選單依賴 DOM 非同步生成，稽核腳本已加入 300ms 的緩衝延遲，確保還原後能精準讀取到新生成的選項，避免「讀取競速」導致誤報。
    *   比對還原後的關鍵欄位（聯絡人、產品類別、肢體選擇、刻字）是否與原始狀態一致。
*   **歷史訂單深度稽核 (Audit Past Order Link)**：
    *   **跨組件聯動**：[V45.2 新增] 全域核對中心與稽核中心完成深度整合。
    *   **時光機功能**：支援將 Airtable 中的 `Raw_Form_State` 反向注入 UI，實現「舊單新算」，驗證財務定律的向下相容性。
    *   **資料限制**：由 Python 壓力測試腳本直接生成的「機器人單」(Robot Orders) 因不具備 UI 操作紀錄，其 `Raw_Form_State` 為空 (`{}`)，不支援此項還原稽核。
*   **日誌系統**：測試結果將即時輸出至介面上的「稽核日誌」，並以顏色標示成功（綠色）或失敗（紅色）。

---

## 13. 財務雙重驗證架構 (Double Verification Architecture)
為了防止前端計算 Bug 或數據竄改，系統採用「前台顯示、後台稽核」的雙保險機制：

*   **前台 (Frontend)**：負責即時計算，提供 Ling Au 操作參考與報價預覽。
*   **後台 (Backend - n8n Auditor)**：
    *   當 Webhook 接收到訂單時，n8n 會獨立於前端，根據原始 JSON 狀態 (`Raw_Form_State`) 重新跑一遍財務演算。
    *   **比對機制**：若「後台稽核成本」與「前台上傳成本」誤差大於 $1，系統將判定為稽核失敗。
    *   **警報觸發**：稽核失敗時，n8n 會繞過普通流程，直接向 Fat Mo 發送 Telegram **緊急警報**。
*   **核心價值**：確保即使前端代碼被意外修改（或未測試就上線），最終進入 Airtable 的財務數據仍受到監控。

## 14. 質量守護與漏洞防禦協議 (QA & Bug Prevention Protocol) - V4.5
為了防止「功能上線、數據遺失」或「稽核故障、訂單中斷」等低級錯誤再次發生，凡是涉及系統修改，AI 特別助理必須遵循以下鐵律：

### 14.1 【1:1 數據映射鐵律】 (The 1:1 Mapping Rule)
*   **定義**：任何在前端 UI 新增或修改的輸入欄位（Input/Select/Textarea），必須同步檢查以下兩個路徑：
    1. **Payload 鏈條**：`sendOrder` / `syncToAirtable` 函數中的 `orderItemsArray` 必須包含對應的對鍵（Key）。
    2. **Airtable 接收牆**：Airtable 的 `Order_Items` 表格必須具備對應的 Field。
*   **防護動作**：開發新欄位後，AI 必須主動執行 `view_file` 檢查 `payload` 構建邏輯，而非依賴「邏輯上覺得它應該有」。

### 14.2 【非阻塞路徑原則】 (Non-Blocking Architecture)
*   **定義**：核心業務流程（如「建立訂單」）絕對不可依賴於輔助功能（如「財務稽核」或「發送通知」）。
*   **實例**：在 n8n 中，稽核邏輯必須放在**並行分支**，確保即使稽核節點崩潰、資料格式錯誤，主線路徑（寫入 Airtable）仍能 100% 完成任務。

### 14.3 【E2E 流程全感官稽核】 (Sensory E2E Audit)
*   **標準測試程序**：每次功能迭代後，AI 必須模擬包含「特殊字元」、「長文字」、「多品項組合」的真實下單流程。
*   **驗證指標**：
    1. Dashboard 顯示正確。
    2. Payload 完整送出（讀取 Network log 模擬）。
    3. Airtable 實際寫入（透過 MCP 查詢剛剛建立的模擬單數據）。

### 14.4 【靈魂自省協議】 (Soul Verification)
*   每完成一個任務，AI 必須自問：「我剛才改動的舊代碼中，有沒有什麼隱藏的 side-effect？」
*   如果涉及 payload 修改，必須重新讀取 `.cursorrules` 確認是否符合最新數據規範。

### 14.5 【數據映射存活定律】 (Data Mapping Survivability)
*   **定義**：在 n8n 中進行陣列配對 (Array Mapping) 或合併時，不可假設原始資料陣列的長度與結構永遠 100% 吻合。
*   **防禦機制**：必須永遠預留 Fallback (備用) 邏輯。例如在提取 `originalItemData` 時，如果遇到 `undefined`，必須給予一個空物件 `{}` 作為預設值，並針對每一個屬性 (如 `.Original_Qty`) 設定 `|| DefaultValue`。
*   **實例**：`let originalItemData = items[i].pairedItem?.json || parseNodeItems[i]?.json || {};` 搭配 `Quantity: originalItemData.Original_Qty || 1`，可保證在面對殘缺歷史數據時，核心流程依然能安全執行而不會遭遇致命當機。

---
#### D. Global Review Center (全域核對中心) [V29 優化]
- **定位**：一頁式總覽，用於核對「實體產品」、「刻字內容」與「生產批次」。
- **動態過濾**：支援 `年份`, `月份`, `狀態`, `單號/姓名`, `批次` 複合檢索，快速過濾特定條件的訂單 (如：只看 "Done 已完成")。
- **批次色彩管理**：每個子項目的背景顏色由 `Batch_Number` 動態決定，直觀區分不同批次的產品，即使同一筆訂單有多個批次也不會混淆。色彩為區塊級（Item-Level）填色，全行對齊。
- **維度矩陣化顯示 (Detailed Product Grid) [V29 強化]**：所有產品細節強制採用結構化「膠囊標籤 (Badge)」陣列顯示。
  - **解析引擎 (V29 Robust Engine)**：採用「橫向掃描」策略，同時掃描 `Item_ID`, `Product` 與 `Specification` 三大欄位。這解決了 Airtable 僅傳回 Record ID 的限制，能精準提取被隱藏在 `Item_ID` 中的產品特徵。
  - **五維度精準提取**:
    - **對象**: 嬰兒、大寶、家庭、成人、寵物 (嚴格區分 `_E_` 大寶標記)。
    - **類別**: 🔑 金屬鎖匙扣、💍 純銀吊飾、🎨 立體擺設。
    - **部位**: ✋ 左手/右手、🦶 左腳/右腳、👨‍👩‍👧‍👦 家庭合成。
    - **材質**: ⚙️ 不銹鋼、✨ 925銀、👑 925金、⚙️ 鋁合金。
    - **數量**: 自動識別尾綴 `x2` 或 `-2` 並轉化為數量標籤。
- **刻字橫向佈局**：刻字欄位 (Engraving) 採用 V29 強化顯示，強制將【上排】與【下排】內容平行並列，字體加粗，並移除多餘的括號雜訊，實現極簡視覺。
- **行內快速編輯 (Inline Edit)**：
  - **訂單層級**：修改 `Admin_Notes` 會同步更新 `Main_Orders`。
  - **項目層級**：修改 `Batch_Number` 與 `Process_Status` 時，系統會針對特定子項目 (Order_Items) 進行更新，色彩隨之立即變化。

---

## 🛰️ 系統架構強韌化 (Architecture Hardening) - [V40.2 新增]

為應對 Airtable API 每秒 5 次請求的限制，系統實施以下核心優化協議：

### 1. 終結逐條搜尋 (Anti-Loop Batching)
*   **目標：** `FHS_Core_OrderProcessor`
*   **邏輯：** 在處理多品項訂單時，透過 `Batch SKU Collector` 彙整所有 SKU 並進行一次批量搜尋，杜絕循環內 API 請求。
*   **效益：** API 呼叫次數減少約 85%。

### 2. 智慧緩存 (Smart Caching)
*   **目標：** `FHS_Query_GlobalReview`
*   **邏輯：** 優先讀取 NAS 本地的 `products.json` 緩存，減少靜態資料的高頻請求。

### 3. 錯誤循環盾牌 (Error Loop Shield)
*   **目標：** `FHS_System_ErrorMonitor`
*   **邏輯：** 針對相同節點的錯誤實施 300 秒冷卻機制，防止錯誤爆炸耗盡 API 額度。

## 🛡️ 系統交付與部署協議 (Handover Protocol) - [V40.3 新增]

為防止 AI 在修改後台工作流後漏掉「手動導入」的指令，系統確立以下通訊規範：
1. **n8n 非自動化原則**：AI 必須明確提醒用戶，n8n 磁碟檔案變動不會自動生效。
2. **手動導入清單**：凡涉及 `n8n/*.json` 修改，必須逐一列出清單供用戶手動 Import。
### 14.5 N8N 工作流部署手冊 (實裝 2026-03-11)
- **智慧緩存**：透過 `FHS_System_CacheSync` 自動生成 `products.json`。
- **寫入路徑**：內部路徑設為 `products.json`，對應 NAS 上的 `docker/n8n/products.json`。
- **權限必備**：必須執行 `chown -R 1000:1000 /volume1/docker/n8n` 以確保 n8n 擁有寫入權限。

---
💡 **結論：** 本藍圖不僅是開發指南，更是系統穩定性的最後防線。AI 助理應比任何人更在意數據的完整性。



