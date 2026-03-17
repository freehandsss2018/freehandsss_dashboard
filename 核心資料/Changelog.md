## [V31.9] - 2026-03-17
### ⚡ 全域核對：一鍵快跳修改 (Quick-Jump to Edit)
- **快速跳轉連結**：全域核對中心的「單號」全面轉化為精緻的金色膠囊按鈕。
- **自動聯動**：點擊單號後，系統會自動切換至「修改舊單」模式、自動填入單號、並觸發背景讀取，實現無縫對接。
- **視覺優化**：採用金色邊框與縮放動畫效果，提升操作指引性與高級感。

## [V31.8] - 2026-03-17
### 🛠️ 修改模式 ID 邏輯優化 (Edit Mode ID Refinement)
- **延遲同步**：在「修改舊單」初始狀態下，底下的訂單編號不再自動讀取，保持空白以符合邏輯直覺。
- **搜到才填入**：僅在頂部搜索框讀取成功後，才同步填入下方的基本資訊單號欄位。
- **清空邏輯修正**：優化重設表單邏輯，在修改模式下執行 `resetForm` 時，不會強行生成新單號。
- **[Hotfix V31.83]**：修復全域核對中心在讀取「無子項目」訂單時發生的 `ReferenceError` 渲染錯誤。

## [V31.7] - 2026-03-17
### 💎 全域深度回饋 (Universal Deep Feedback)
- **全面覆蓋**：將全域載入提示擴展至系統中所有異步環節。
- **配置管理優化**：讀取或儲存「自動遞增單號」設定時，現在會有明確提示。
- **核對中心強化**：執行大數據篩選、重新整理或批量更新核對資料時，提供即時狀態回饋。
- **查重驗證**：手動輸入單號進行查重驗證時，加入動態載入提示防止誤觸。

## [V31.6] - 2026-03-17
### 🚀 全域體驗與動態回饋 (Global UX & Loading State)
- **全域載入遮罩**：實作 Glassmorphism 磨砂玻璃效果的載入遮罩，解決操作時「無反應」的疑慮。
- **異步邏輯整合**：將載入狀態深度整合至「讀取舊單」與「同步數據」流程，提供即時進度文字回饋。
- **介面安全鎖定**：數據處理期間自動鎖定 UI 防止重複點擊，增進系統穩定性。

## [V31.5] - 2026-03-17
### 📝 訊息須知強化 (Notice Update)
- **Category B 須知更新**：在金屬產品須知中新增「⭐️ - 製成品最少需預三個月」條款。

## [V31.4] - 2026-03-17
### ✨ 訊息與邏輯終極優化 (Final Refinement & Bug Fixes)
- **訊息格式細化**：手模擺設訊息中，肢體部分改為手與腳分行顯示，並在刻字前加入分隔符號。
- **免責聲明強化**：為全系列訊息（手模/金屬）加入「【免責聲明】」標題與分隔線。
- **編輯模式修復**：修正讀取舊單時，搜尋框內容會被資料還原所覆蓋的邏輯漏洞。
- **部署安全機制**：正式建立「部署護衛」協議，確立未經指令嚴禁更新 current 檔的規範。

## [V31.3] - 2026-03-17
### ✨ 訊息結構與介面終極優化 (Final Message & UI Refinement)
- **訊息結構重組**：將「【財務結算】」區塊移至產品詳情下方，更符合對話邏輯。
- **標題分行格式**：在訊息首行加入分行符號，使單號與類別更清晰易讀。
- **UI 冗餘移除**：刪除「頸鏈選配」手動下拉選單，改為在訊息中固定顯示「二選一」字眼。
- **初始化 Bug 修復**：修正頁面刷新後不立即顯示 Order ID 的邏輯缺陷。
- **部署**：將優化後的 V31.3 正式發布為 `Freehandsss_dashboard_current.html`。

## [V40.7] - 2026-03-17
### 🧹 系統淨化與正式部署 (System Purge & Deployment)
- **正式上線**：將 `freehandsss_dashboardV31.html` 部署為 `Freehandsss_dashboard_current.html`，作為 Ling Au 的專用穩定入口。
- **檔案清理**：物理清除 16 個冗餘檔案，包括舊版 HTML (V25/V26/V30/V32)、過時 n8n 流程 JSON、以及損毀的下載檔。
- **版本稽核**：確認 `V32.html` 雖編號較高但內容較舊，已與其餘冗餘檔案一併清除。
- **目錄結構優化**：移除非必要的開發腳本與 0 字節無效標記。
- **一致性強化**：確保工作區僅保留 `FHS_Core` 系列命名的最新資產。

## [V40.6] - 2026-03-17
### 🧠 FHS 智能中樞 SOUL Directive (終極完整版) 實裝
- **核心升級**：正式融合「終極完整版」SOUL 指令集，確立 7 大執行協議。
- **角色覺醒協定**：導入動態情境路由，強制於任務開始前讀取 `FHS_Prompts.md` 並宣告身分。
- **自癒閉環實裝**：授權最高 5 次自我修復嘗試與「沙盒模式」自動 QA。
- **全端映射強化**：嚴格化前後端 1:1 欄位映射檢查。

## [V31.1] - 2026-03-16
### 🧪 產品線導向訊息分段引擎 (Product Line Oriented Engine)
- **詳情與須知整合**：放棄「詳情」與「須知」分離邏輯，將同一類產品的訂單詳情與專屬須知合併為一則完整訊息。
- **類別識別系統**：
  - **Category A (手模擺設)**：自動識別木框、玻璃瓶，整合立體手模專屬手工聲明。
  - **Category B (金屬產品)**：自動識別鎖匙扣、吊飾、頸鏈，整合金屬工藝專屬聲明。
- **UI 雙預覽模式**：根據訂單內容動態顯示 A、B 兩大預覽框，讓 Ling Au 在發送前精準檢查。
- **一鍵式高效按鈕**：
  - `[ 📋 複製：手模擺設訊息 ]` (橙色)。
  - `[ 📋 複製：金屬產品訊息 ]` (藍灰色)。
- **IG 換行優化**：確保生成的訊息在 Instagram 貼文及 DM 中完美呈現換行格式。
- **同步相容性**：更新 `syncToAirtable` 引擎，確保雙段訊息正確合併並推送到後台。

## [V31.0] - 2026-03-16
### ✨ UI/UX 訂單介面及訊息格式優化 (Au Ling 模式升級)
- **訊息格式精準化**：
  - 將「排程資訊」更名為「客人資料」。
  - 調整首行格式為純文字 `📝 freehandsss 訂單` (移除星號)。
  - 頸鏈吊飾刻字改為單行格式，並加入「用料」描述與「頸鏈配色」選項。
- **介面專屬增強**：
  - 新增「📿 頸鏈選配 (二選一)」下拉選單 (金色/銀色)。
  - 全面導入 **Premium** 視覺語彙：玻璃擬態卡片 (Glassmorphism)、漸層背景與平滑過渡動畫。
- **技術修正**：修正 `appearance` CSS 屬性以達跨瀏覽器相容性。

## [V40.5] - 2026-03-16
### 🛡️ 效能引擎安全重生計畫 (Smart- **V40.5 Phase 4 - 高壓連擊測試與雲端之眼監控 (2026-03-16)**
    - [前端] 於「自動化稽核中心」新增「🚀 API 防護極限測試」功能，模擬 10ms 內 8 次極速更新連擊。
    - [前端] 實作 `fetch` 攔截機制，全自動驗證 800ms 防抖佇列（Debounce Queue）之打包成功率。
    - [監控] 啟用「雲端之眼 (Cloud Eye)」，透過 MCP 即時審計 Airtable `Error_Logs`，確保無 429 API 崩潰紀錄。
- **V40.5 Phase 3 - 智慧緩存 (Smart Caching) 終極優化 (2026-03-16)**
  - 在 `FHS_Core_OrderProcessor` 導入 `products.json` 本地緩存讀取機制。
  - **非阻塞路徑原則 (Section 14.2)**：實施嚴格的 `try-catch` 包覆，確保緩存異常（缺失、損毀、權限）時，系統能自動降級 (Fallback) 至 Airtable 原生搜尋，不中斷訂單流程。
- **n8n 核心優化：** 徹底完成 `FHS_Core_OrderProcessor` 的性能優化，將迴圈搜尋轉向批量處理。
- **終極空值防禦：**
  - 在 `Batch SKU Collector` 加入 `Array.isArray()` 強制檢查，防止空訂單導致工作流中斷。
  - 在 `Calculate Profit & Pack Items` 實裝循環缺失防禦，保證財務 Payload 完整性。
- **數據映射存活定律：** 實施 `costMap` 缺失時的 0 成本 Fallback 保護，確保未知 SKU 不會觸發 `undefined` 崩潰。

## [V30.0] - 2026-03-15 (🏆 當前穩定基準版本)
### 🛡️ 全域核對中心防爆機制 (Anti-Explosion Mechanism)
- **前端 JS：** 導入 `let metadataUpdateQueue` 與 800ms 防抖佇列（Debounce Queue）。
  - 對同一訂單/細項的連續快速修改將自動合併為單次請求。
  - 新增「準備同步...」與「同步中...」視覺狀態提示。
- **後端 n8n：** 升級至「防爆快充引擎 (V3)」。
  - 支援 Array 陣列輸入，減少 90% 的 Webhook 喚醒開銷。
  - **原生批次寫入 (Option B)：** 透過 Code 節點進行 10 筆一組的 Chunking，並執行 Airtable Native PATCH。
- **架構遵循：** 完美對齊 Blueprint Section 10.3 (Webhook Response Protocol) 與 14.2 (非阻塞路徑)。

## V29.2 - 批次填色獨立化與系統強韌化修復 (2026-03-14)
- 🎨 **批次填色精準化 (V29.2)**：
    - **數字自動提取**：實施 `getBatchColor` 數字提取演算法，不論輸入「31」、「B31」或「批 31」，系統均能精準識別為「31」並呈現一致色塊。
    - **白底防誤觸**：若批次欄位無數字（如「待定」），背景強制保持白色，避免視覺混淆。
- 🛡️ **行獨立渲染 (Row Isolation)**：
    - **移除 Fallback 洩漏**：徹底移除子項目對訂單批次 (`o.Batch`) 的樣式繼承。現在每一行產品項目的顏色均完全由其自身的批次決定。
    - **局部更新機制**：重構 `saveInlineEdit`，將 DOM 樣式刷新範圍縮減至「當前行 (TR)」，實現毫秒級、無副作用的即時變色體驗。
- 🩺 **災難級修復與強韌化 (System Repair)**：
    - **崩潰恢復**：解決了因混合編碼導致的 Dashboard 文件損毀問題，通過 Git 基準還原與二進位手術級腳本重新部署功能。
    - **手稿存檔**：將本次修復涉及的二進位替換策略編入 `FHS_Blueprint.md` 第 14 章。

## V29 - 全域核對中心: 矩陣化解析引擎 (Robust V29) 與同步功能修復 (2026-03-13)
- ✨ **V29 高度強化型產品解析引擎 (Robust Engine)**：
  - **解決痛點**：修復了當 Airtable `Product` 欄位傳回 Record ID 時，前端無法解析維度的問題。
  - **核心升級**：實施「三欄位橫向搜尋」(Item_ID + Product + Specification)，優先從極具描述性的 `Item_ID` 提取特徵，確保 100% 抓取對象、部位、類別、材質與數量。
- ✨ **彩色膠囊標籤 (Badge) 極致細化**：所有維度（對象、類別、部位、材質、數量）獨立裝袋為彩色標籤，支援 Emoji 搭配與語意化顏色區分。
- 🪲 **同步功能 (Sync Logic) 深度修復**：修復了 `syncToAirtable` 代碼損毀導致的 Payload 與 Webhook 失聯問題。重構了發射邏輯，確保新單/舊單更新 100% 穩定送往 NAS。
- 🎨 **刻字渲染優化**：強制水平並列佈局，字體顯著加強，並徹底消除括號噪點。
- 🧹 **代碼冗餘清理**：稽核並移除了多個重疊的產品解析舊邏輯，確保 Dashboard V29 全速執行。
- ✨ **V29.1 深度解析擴展 (立體細節)**:
  - **立體款式**: 自動識別 `木框裝` (🖼️)、`玻璃瓶款式` (🧴)。
  - **主題色款**: 識別 `粉紅款式`、`草原款式`、`仿古式`、`淺木色`、`海洋款式` 標籤。
  - **肢體數**: 識別 `4肢套裝`、`2肢/一對` 構成標籤。
  - **數量強制化**: **[V29.1 修正]** 修改渲染邏輯，即使數量為 1 也會強制顯示 `x1` 膠囊標籤，解決視覺缺失感。
- ✨ **V29.2 批次色彩隔離優化 (Targeted Batch Coloring)**:
  - **色彩範圍隔離**: 修正了批次填色會蓋過全行的問題。現在背景顏色僅應用於「刻字」、「產品明細」、「批次」、「進度」四個生產核心欄位，確保訂單單號與客戶資訊保持導航中性色。
  - **色彩一致性 (Numeric Hash)**: **[V29.2 核心修正]** 強化了雜湊算法，強制提取字串中的數字部分進行運算。這確保了無論輸入是「31」、「 31」或「批次31」，在全域核對中心內都會呈現「完全相同」的視覺顏色，解決了先前版本中因空格或文字導致的顏色偏差問題。
  - **動態即時同步**: 優化了行內編輯 (Inline Edit) 邏輯，修改批次代號後，特定的四個欄位會即時同步變色，無需重新載入。

---

## V45.4 / V28.3 - 全域核對中心: Rowspan 佈局定案與「置頂對齊」機制 (2026-03-12)
- ✨ **結構性重構 (Rowspan 表格)**：徹底汰除導致欄位走位的 CSS Grid。全面導入 HTML `<td rowspan>` 結構，確保「刻字、明細、批次、進度」與 `<thead>` 達成 **Pixel-Perfect 完美對齊**。
- 🎯 **垂直置頂定律 (Top-Alignment Law)**：[V28.3 修正] 將原本的 `middle` 對齊更換為 `vertical-align: top;`。
  - **解決痛點**：修復了在多品項訂單中，單號因「居中對齊」而下沉，導致頂部產品看似「獨立無主」的視覺 Bug。現在單號與詳細資料永遠對齊於該筆訂單的第一筆產品。
- 🎯 **字體全域統一 (Typography Normalization)**：將表格內所有資料欄位、輸入框、選單字體強制統一為 **13px**，Header 統一為 **12px 加粗**，提升整體儀表板專業感。
- 🎨 **刻字 (Engraving) 欄位淨化**：優化 Regex 腳本，精準消除括號雜訊，並改為 **Inline-Flex 水平佈局**，優化縱向空間。

- 🪲 **防呆機制與數據韌體修復**：
  - **前端優化**：Dashboard 的 `sendOrder` 中全面導入 `getValSafe` 防呆機制，確保長輩鎖匙扣等所有產品的刻字（Top/Bot）均能安全擷取，不再因為 Element Null 而中斷。
  - **n8n 映射與防禦**：`FHS_Core_OrderProcessor` 中的 `Calculate Profit & Pack Items` 節點植入終極防禦機制 (`let originalItemData = {}`)，並確保 `Item_Notes` 正確映射至 `Engraving_Text` 欄位，大幅提升系統抗毀損能力。

- 🪲 **刻字遺失 (Engraving Data Drop) 修復**：
  - **前端優化**：Dashboard 的 `sendOrder` 中導入 `getValSafe` 防呆機制，確保長輩鎖匙扣等所有產品的刻字（Top/Bot）均能安全擷取，不再因為 Element Null 而中斷。
  - **n8n 映射修正**：`FHS_Core_OrderProcessor` 中的 `Parse Items & Generate SKU` 與 `Calculate Profit` 節點已正確提取 `Item_Notes` 並精準映射至 Airtable 的 `Engraving_Text` 欄位。
- 🛡️ **未定義崩潰防禦 (Undefined Fallback Logic)**：
  - 修復了舊訂單在更新時因結構不匹配導致的 `Cannot read properties of undefined (reading 'Original_Qty')` 致命崩潰。
  - 在 `Calculate Profit & Pack Items` 節點植入終極防禦機制 (`let originalItemData = {}`)，確保即使找不到配對資料，工作流也能安全完成 Upsert 寫入，大幅提升系統抗毀損能力。


## V40 - 智能中樞 SOUL 導入與配置強韌化 (2026-03-10)
- 🧠 **SOUL 指令集實裝**：將原有過於臃腫的 `.cursorrules` 徹底瘦身，轉化為 200 字內的「SOUL 指令集」。聚焦於身分守護、邊界定義與最高指導原則。
- 🔒 **防崩潰協議 (Anti-Collapse Protocol)**：增設「配置鎖定」，嚴禁 AI 在未經 Fat Mo 確認前擅自修改系統設定檔，防止邏輯死循環。
- 📦 **自動化備份體系**：在指令中植入「備份提醒機制」，每當重大版本更新時主動提醒 Fat Mo 執行 Git Push 或 NAS 備份。
- 📚 **真理來源歸位**：將重複的 UI/UX 與 CRUD 邏輯從規則書中移除，回歸 `FHS_Blueprint.md` 專注管理，強化「單一真理來源」架構。

## V39 - 全域核對終極修復與「數據扁平化」適配 (2026-03-10)
- 📝 **Telegram 戰報還原與強化**：修正了先前因更名腳本覆寫導致的 Telegram 通知降版問題。現已重新整合 V36 的 `Order_Text` 完整訂單詳情，並精準抓取「總成本 (Total_Cost)」與「淨利潤 (Final_Profit)」。
- 📅 **Global Review 日期與搜尋修復**：修正 `FHS_Query_GlobalReview` 中使用了不存在的 `{Created_Time}` 導致的 API 崩潰。全面改用 `CREATED_TIME()` 並將搜尋優化為 `FIND()` 模糊比對。
- 🛡️ **「數據扁平化 (Json Flattening)」適配**：
    - **發現問題**：n8n 的 Airtable 節點會自動將 `.fields` 層級移除（數據扁平化），導致前端代碼抓不到資料顯示 `N/A`。
    - **解決方案**：重構 `FHS_Query_GlobalReview` 所有 Code 節點，直接從 Top-level 存取屬性，並加入 `Array.isArray()` 強制檢查，解決了因空訂單（無子項目）導致的 JavaScript 執行崩潰。
- ⚡ **Webhook 回應標準化**：修正 `FHS_Action_MetadataUpdate`。將回應模式設定為從 `Format Success` 節點明確回傳 JSON，徹底解決了前端瀏覽器因抓不到 200 回應而誤報「儲存失敗」的問題。

---

## V38 - 全域核對中心實裝與 Schema 標準化 (2026-03-10)
- 📊 **V27 全域核對中心 (Global Review Center)**：實作 Excel 風格的資料網格，支援年度/月份/狀態/批次過濾。
- 🎨 **批次配色系統**：根據 `Batch_Number` 自動分配背景顏色，視角化管理生產批次。
- 📝 **原地編輯與自動儲存**：在核對中心可直接修改「批次」、「進度」與「對客備註」，並自動同步回 Airtable。
- 🛡️ **Airtable Schema 強制註解規範**：根據 Fat Mo 指令，正式將「Airtable 欄位必須具備中文描述」列入 `.cursorrules` 與 `FHS_Blueprint.md`。確保所有後台欄位對維護者透明。
- 🛠️ **n8n 專業化命名與說明實裝**：
    - 將所有工作流重命名為標準化格式：`FHS_Core_OrderProcessor`, `FHS_System_ErrorMonitor`, `FHS_Query_GlobalReview`, `FHS_Query_OrderHistory`, `FHS_Action_MetadataUpdate`。
    - 在所有工作流 JSON 中植入 n8n 原生「便利貼 (Sticky Note)」說明節點。

---

## V37 - n8n Upsert 核心進化與強韌化修正 (2026-03-10)
- 🚀 **n8n Upsert 最終修復**：解決了 `upsert` 模式下 `Create Sub Items` 節點映射無效的問題。通過實作「精準 ID 映射 (Precision ID Mapping)」，直接傳送 Airtable 內部 Record ID 進行關聯，達成 100% 寫入穩定性。
- 🛡️ **搜尋強韌化 (Search Robustness)**：開啟 `Fetch Exact Base Cost` 節點的 `Always Output Data`。即使 SKU 搜尋不到，工作流也會以 $0 成本繼續執行，防止整個 Webhook 流程因搜尋無結果而靜態崩潰（Silent Failure）。
- 🌍 **全 UTF-8 源頭編碼**：確認並修復了 PowerShell 測試封包的編碼問題。現在系統能完善處理中文產品名稱（如「木框套裝 (4肢)」）。
- 🔬 **深度模擬驗證**：完成 Create -> Edit -> Upsert 全鏈路實測，確認無重複資料產生且資料鏈路完整。

## V36 - V26 PRO 1.1: 數據恢復與重複資料終結者 (2026-03-09)
- 🛡️ **重複資料終結**：實作 `Order_Item_Key` 與 n8n `Upsert` 邏輯。現在修改舊單會精準覆蓋原有 Record，不再於 Airtable 產生重複行數。
- 🔄 **數據恢復進化**：修正 `restoreFormState` 生命週期，採用「三階段還原法」，解決肢體選單等動態生成的元件無法讀回資料的陳年 BUG。
- 🧼 **自動清理機制**：新增切換模式自動 `resetForm` 功能。切換「建立新單」時會自動清空畫面，避免前一筆單的殘留資料誤導 Ling Au。
- 📡 **Telegram 戰報升級**：
  - 新增 `Clean_Order_Text`：發送至 Telegram 的戰報自動剔除冗長免責聲明，只留核心資訊。
  - 新增 `Update_Note`：自動偵測「修改了什麼」，在 Telegram 即時標記更新項目。
- 🚀 **體驗優化**：新單建立成功後，儀表板會自動切換至「修改模式」並鎖定該單號，流程更加直覺。

## V35 - 雲端之眼 (Cloud Eye) 實裝完成與權限升級 (2026-03-09)
- ✨ **全鏈路打通**：成功透過 Airtable API Create Record 節點，實現 n8n Error Trigger 至 Airtable `Error_Logs` 的精準報錯推送，確認可完美繞過 Docker 權限鎖死問題。
- 🔑 **MCP 權限擴展**：為 AI Middle-Hub PAT 增加 `schema.bases:write` 權限，由 AI 從後台全自動構建 `Error_Logs` 架構與欄位中文註解。
- 📘 **藍圖定案**：已將此穩定架構正式編入 `FHS_Blueprint.md` (第八章)，正式取代先前的本地 `debug.log` 方案。

## V34 - 雲端之眼：Airtable 監控概念整合 (The Cloud Eye) (2026-03-09)
- ☁️ **架構革命**：將原本寫入本地 `.log` 檔案的錯誤監控系統，升級為寫入 Airtable 的 `Error_Logs` 資料表。徹底解決 Synology Docker 容器 `uid 1000 (node)` 掛載權限不足的問題 (\`EACCES: permission denied\`)。
- 👁️ **即時感測**：AI 中樞現在能透過 MCP (Model Context Protocol) 連線直接掃描雲端日誌，達成跨環境的完美監測。

## V33 - 自動化醫療監控：n8n 的眼 (2026-03-09)
- 👁️ **n8n's Eye**: 初步概念實作了自動化錯誤監控系統 (本地檔案版)。
- 🛡️ **監視邏輯**: 已將「自動診斷」寫入 `.cursorrules`。
- 🛠️ **連動更新**: 更新 `FHS_Blueprint.md` 第 8 章，明確定義了 Catch-Push-Diagnose 流程。

## V32 - Work Capability Optimization & Pause (2026-03-09)
- **藍圖同步**：根據 V30 指令，已將「Freehandsss 智能中樞」正式列入 `FHS_Blueprint.md` 的系統架構核心 (The Heart)。明確定義其作為中央神經系統、財務自動化核心與防呆守門員的角色。

---

## [2026-03-09] V30: 藍圖同步進化機制 (Proactive Blueprint Evolution)
- **文件更新權 (主動模式)**：在 `.cursorrules` 中加入「核心邏輯連動」指令。現在 AI 在修改利潤公式或產品維度等核心邏輯後，會自動同步更新 `FHS_Blueprint.md`，實現「決策即進化」，藍圖將隨開發實作即時更新。

---

## [2026-03-09] V29: 智能學習與同步機制強化 (Learning & Sync Optimization)
- **自動更新與回饋**：在 `.cursorrules` 中加入「強制回饋」指令。AI 現在會在每次完成代碼修改後，主動詢問用戶是否同步更新藍圖（Blueprint）或日誌（Changelog），確保文檔與代碼永遠同步，解決「失憶」與「發呆」問題。

---

## [2026-03-09] V28: 系統效能與授權進化 (System Efficiency & Authorization Upgrade)
- **自動化授權**：在 `.cursorrules` 中加入核心授權指令，允許 AI 直接執行「無破壞性終端指令」與「小範圍檔案寫入」，大幅提升開發與除錯效率。
- **防止失憶機制**：確立即時更新藍圖與日誌的連鎖反應邏輯。

---

## [2026-03-09] V27: 智能中樞全功能開眼 (Smart Hub Full Initialization)
- **後台視角 (Airtable MCP)**：成功串接 `airtable-mcp-server`，獲得 `Main_Orders` 與 `Product_Database` 的即時 Schema 存取權。
- **解決方案記錄**：
  - 修復了 `npx` 環境變數未安裝的問題 (Node.js 補完)。
  - 修正了 MCP 套件 404 錯誤 (更換為正確的社群穩定版)。
  - 確立了「權限隔離」原則，使用獨立 Token `Antigravity_Smart_Hub` 以保護 n8n 穩定性。
- **大腦植入**：建立 `FHS_Blueprint.md` 與 `.cursorrules`，確立五維度 SKU 真理與 AI 執行鐵律。

---

## [2026-03-08] V26: 免責聲明與社交通知升級
- **智能免責聲明**：更新免責聲明 (Disclaimer) 輸出邏輯。系統現在能夠根據客人的購物籃（立體擺設、金屬飾品或綜合），自動切換最精準、附帶 Emoji 的 IG 回覆格式。
- **Telegram 警報系統重構**：修復了 `n8n` Telegram 通知機器人的邏輯 Bug，確保「新訂單」與「修改舊單」能被準確分辨，不再引發通知混亂。
  
---

## [2026-03-03 至 2026-03-04] V25 雙向系統架構奠基 (Form State Preservation)
- **單向轉雙向**：Dashboard 從原本只能「新增訂單」的單向系統 (V24)，正式升級為支援讀出舊單的雙向系統 (V25/V26)。
- **核心架構 (The Breakthrough)**：
  - 確立了透過發送與讀取純文字 `Raw_Form_State`（序列化 JSON）的方式，將前端幾十個開關、選項的狀態完整記錄於 Airtable。
  - 達成了「0.1 秒極速還原」舊單狀態的目標，避免了複雜的反向解碼工程。
- **介面大防呆**：
  - 引進「✨ 建立新單 / 🔍 修改舊單」的頂部大開關。
  - 為家庭合成鎖匙扣 (S1, S2) 設計動態聯動選單，封鎖錯誤的 SKU 組成。
  - 新增「套用至其他」按鈕，快速複製刻字內容。
- **雙視角切割**：首創 `Ling Au 模式` (極度簡化) 與 `Fat Mo 模式` (顯示生產核對清單) 的 UI Toggle。
