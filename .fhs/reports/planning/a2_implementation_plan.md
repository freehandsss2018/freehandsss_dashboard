# 實施計畫 - 立體擺設款式管理 UI 整合方案

根據最新需求，本方案不採用配件（如羊毛氈）的動態管理，而是針對核心產品類別「立體擺設」進行動態框架款式（款式類型）的管理。Ling Au 可以直接透過介面新增新的框架款式（如皮框款式），並設定 2肢與 4肢的價格。Dashboard 將自 Supabase 讀取最新款式配置，並自動渲染於款式下拉選單中，實現完全動態的價格計算與訂單總覽渲染。

## 用戶審查與反饋 (User Review Required)

> [!IMPORTANT]
> 1. **核心類別價格動態化**：此變更將原本 hardcode 於前端的立體擺設報價（木框 2080/2380，玻璃瓶 1380/1680）改為**動態查表報價**。系統會在網頁載入時從 Supabase 讀取 `main_category = '立體擺設'` 的產品表。
> 2. **防呆邏輯自動適配**：原本木框款式專屬的防呆邏輯（不支援成人實體倒模，強制判定為 Photo (P) 模式）將自動適配於任何非「玻璃瓶款式」的新增框架款式上。
> 3. **雙端管理介面**：
>    - **桌上型電腦 (Desktop)**：於右側邊欄 (`#v40-side-panel`) 渲染一個全新的卡片面版 `#frameStyleManagerPanel`。
>    - **行動裝置 (Mobile)**：於滑出式抽屜的設定頁籤 (`#v40-drawer-settings`) 中鏡像渲染該卡片面版。

## 擬議變更 (Proposed Changes)

### Dashboard 前端組件

#### [MODIFY] [freehandsss_dashboardV41.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV41.html)

1. **HTML 結構與佈局變更**：
   - 在右側邊欄 `#v40-side-panel` 的「Fat Mo 設定」卡片後，新增「立體擺設款式管理」卡片 `#frameStyleManagerPanel`，提供款式列表 `.side-frame-styles-list`（含 custom 款式的刪除按鈕）及新增款式表單（款式名稱 `.new-frame-name`、2肢價格 `.new-frame-price-2`、4肢價格 `.new-frame-price-4`、按鈕 `.btn-add-frame` 與狀態列 `.new-frame-status`）。
   - 在底部抽屜的設定頁籤 `#v40-drawer-settings` 中新增鏡像容器 `<div id="v40-drawer-frame-mirror" style="margin-top: 15px;"></div>`。
   - 更新 `v40InitDrawerMirrors()` 函數，使之在初始化時將 `#frameStyleManagerPanel` 複製到該鏡像容器中。

2. **新增/更新 JavaScript 業務邏輯**：
   - **`loadFrameStyles()`**：非同步向 Supabase 查詢 `main_category = '立體擺設'` 的產品。將產品快取於 `window.fhsFrameProducts`，並動態更新款式下拉選單 `#pSubCat` 的 Option 列表（自動保留用戶當前的選中狀態），同時刷新雙端管理面板的款式清單。
   - **`renderSideFrameStylesList(uniqueTargets)`**：在桌面端和手機端更新款式管理清單，顯示 2肢和 4肢的建議售價，並為非核心款式（排除「木框」與「玻璃瓶」）提供刪除圖標 `🗑️`。
   - **`updateSubCatOptions(uniqueTargets)`**：動態重構 `#pSubCat` 下拉選單。將 `'木框套裝'` 轉換為 `'木框款式'`、`'皮框套裝'` 轉換為 `'皮框款式'`，以完美相容歷史訂單。
   - **`addNewFrameStyle(btn)`**：讀取輸入值，並在確認無誤後向 Supabase `products` 表發送 **兩個** `POST` 請求（分別為 `2肢` 和 `4肢` 產品設定，`total_base_cost` 設為預設值 210），成功後清空輸入並調用 `loadFrameStyles()` 刷新。
   - **`deleteFrameStyle(target_object)`**：確認後向 Supabase 發送 `DELETE` 請求（以 `target_object` 比對，一次刪除 2肢與 4肢），成功後重新加載。

3. **核心模組整合與防禦**：
   - **`buildOrderItemsForPricing()`**：動態依據所選款式名稱（例如 `皮框款式`）去除 "款式" 後綴，並拼裝成資料庫產品名稱（例如 `皮框套裝 (4肢)`）推入 `orderItemsArray`。
   - **`calculatePricing()`**：立體擺設的計價從 `window.fhsFrameProducts` 中比對產品單價；若無資料則 fallback 回原有的 hardcode 報價。
   - **`isPModeForce` 計算邏輯**：將原有的 `pSubCat === "木框款式"` 判斷，改為 `pSubCat !== "玻璃瓶款式"`。所有新增的框架樣式將默認與木框具有相同的成人 P 模式強制邏輯。
   - **`adultPForce` 與防呆警告提示**：同步將 `pSubCat === "木框款式"` 改為 `pSubCat !== "玻璃瓶款式"`。
   - **`getProductDimensions(item)`**：若為立體擺設項目，在解析款式名稱時加入動態提取邏輯，如果不是木框或玻璃瓶，將自動匹配 prefix 為 `🖼️ [款式名稱]`。

4. **生命週期**：
   - 在 `init()` 啟動時立即執行 `loadFrameStyles()`，確保下拉選單在訂單還原前已完成動態構建。

#### [NEW] [Freehandsss_dashboard_current.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/Freehandsss_dashboard_current.html) (同步覆蓋)
- 在完成 `freehandsss_dashboardV41.html` 的修改與自查後，將其內容完整複製覆蓋至 `Freehandsss_dashboard_current.html`，防止版本偏離。

## 驗證計劃 (Verification Plan)

### 手動驗證流程
1. 載入網頁，確認右側邊欄（Desktop）與底部設定抽屜（Mobile）已正常渲染擺設款式管理介面。
2. 確認款式下拉選單中預載入「木框款式」與「玻璃瓶款式」。
3. 測試新增款式：
   - 輸入名稱：`皮框`，2肢價格：`2180`，4肢價格：`2480`。
   - 點擊「新增款式」，確認提示「新增成功」。
   - 確認款式下拉選單即時多出 `皮框款式` 選項。
   - 確認管理清單中出現 `🎨 皮框款式 (2肢: $2180 / 4肢: $2480)`。
4. 在訂單表單中選擇 `皮框款式`：
   - 選擇 2肢，確認「建議售價」顯示 `$2180`。
   - 選擇 4肢，確認「建議售價」顯示 `$2480`。
   - 勾選「成人」手模，確認防呆機制自動觸發（警告提示：皮框不支援成人實體倒模！系統已強制判定為成人的「照片(P)」模式）。
5. 保存或更新訂單，驗證 Supabase 寫入的 order_items 的 `product_sku` 包含 `皮框套裝 (2肢)` 或 `皮框套裝 (4肢)`。
6. 切換至「訂單總覽」，確認該訂單的款式標籤在 Desktop Table 及 Mobile Accordion 中均顯示為 `🖼️ 皮框`。
7. 測試刪除該自定義款式，確認選單與資料庫中相應項目皆已移除。
