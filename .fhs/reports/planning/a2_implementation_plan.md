# A2 Implementation Plan — 訂單總覽子項目成本與利潤柝分優化 (修訂版)

本計畫旨在針對先前方案進行深度批評，並基於系統效能、直觀管理模式、衝突避免、Token 消費、系統長期發展方向、Desktop 與手機版雙介面適配，以及 Subagent & Skill 的自動化驗證，提出更為嚴謹的「全域預載快取 + 按需稽核模式 (Preloaded Global Price Cache with On-Demand Auditing Toggle, PGC-ODAT)」架構分析與實施計畫。

---

## 一、 先前方案的 3 個弱點批評 (Critical Retrospective)

1. **弱點 1：資料庫聯表查詢 (PostgREST Join) 的效能負擔**
   *批評*：先前方案在每次呼叫 `sbFetchItems(orderIds)` 時，均對 Supabase 使用 PostgREST 聯表 Join 語法 `products(suggested_price)`。當操作者載入大量歷史訂單（例如一次載入 200 筆訂單、含上千筆項目）或頻繁切換篩選/分頁/排序時，Supabase 端將為每筆 order_item 執行重覆的商品表 nested lookup。這不僅增加了伺服器端的 Join 負載與 API 響應延遲，也使得網路傳輸體積因巢狀 JSON 結構而變大。

2. **弱點 2：介面資訊過載與手機端版面膨脹 (Mobile Layout Bloat)**
   *批評*：先前方案預設在每一個產品細節卡片內嵌財務資訊，這在 Desktop 端會造成視覺擁擠，在手機端（手風琴 Card 視圖）更會導致高度直接加倍。對於有 5-6 個項目的訂單，手機螢幕會被大量重複的「建議價/成本/利潤」塞滿，嚴重破壞了現有 V41 版面所追求的精簡性（即移除嬰兒月齡、整合狀態晶片等精簡美學），不符合 Premium UI/UX 憲章。

3. **弱點 3：訂單折扣與建議售價的「數值衝突」造成認知混淆**
   *批評*：先前方案直接在項目層級顯示「建議價」與「建議利潤」，但未考慮訂單層級的折扣（例如：同部位買多件的 Tier 階梯折扣、加購價優惠、或是管理員手動調整的折讓金額 `Adjustment_Amount`）。當操作者看到「子項目建議利潤之和」與「訂單總利潤」不一致時，會直覺認為系統有計算錯誤，進而產生不必要的對帳困擾，失去了「方便查閱系統有否計算錯誤」的設計初衷。

---

## 二、 更好的版本：PGC-ODAT 優化架構 (Better Architecture)

為了解決上述 3 個弱點，修訂版架構採取了以下改進：
1. **快取化 (Performance)**：在應用程式初始化 (`init()`) 時，將全表 490 個 SKU 的 `suggested_price` 一次性非同步載入（大小僅約 20KB）並建立全域 Map 快取。後續查詢 order_items 時**不使用 db join**，直接在前端進行 O(1) 快取查詢，達到零 DB Join 額外開銷。
2. **按需開啟 (UI/UX)**：新增「🔍 項目稽核模式」切換按鈕。預設隱藏明細財務，保持 V41 極簡美學與順暢滾動；當操作者需要核對時，一鍵啟用即可動態在 Desktop 與手機端渲染詳細財務數字，並將此喜好儲存於 `localStorage` 中。
3. **語意釐清 (Conflict Avoidance)**：將顯示標籤明確定義為「SKU建議價」與「SKU建議利潤」，並在該稽核列旁說明「不含整單優惠與手動折讓」，避免操作者產生數值衝突的困擾。

---

## 三、 架構分析與可行性評估 (Architectural Analysis)

### 1. 系統效能 (Performance)
- **資料庫端**：`products` 表為相對靜態的規格資料（僅 490 筆）。一次性 preload 的 SQL 執行代價極低。order_items 的 PostgREST 查詢保持原始的 simple-select，免除嵌套 Join 負載。
- **前端渲染**：按需 toggle 僅觸發客戶端重新繪製（`renderReviewTable`），不產生新的 API 請求，切換時間為毫秒級。

### 2. 直觀管理模式 (Intuitive Management)
- 在篩選工具列的「重新載入」按鈕左側新增「🔍 項目稽核模式」切換鈕，UI 配色與現有 FHS 視覺系統保持高度和諧。
- 狀態具有狀態記憶功能（使用 `localStorage` 的 `fhs_show_item_financials` 鍵）。

### 3. 衝突避免 (Conflict Avoidance)
- 不改動資料庫 Schema，亦不改動寫入/新增/編輯訂單的邏輯（`captureFormState`）。
- 保持 `sbFetchItems` 功能的單一職責，避免破壞其他地方（例如訂單詳情 Modal）對 `sbFetchItems` 回傳結果的依賴。

### 4. Token 消費與長期發展方向 (Token & Maintenance)
- **代碼變動量小**：不修改 API select 結構，仅在 data map 與 render 階段進行 localized 修改，便於未來 AI 閱讀和維護，能顯著降低後續 sessions 的 Token 消費。
- **擴展性**：未來若有動態折扣規則調整，可在 preload 快取層直接注入邏輯，不需要頻繁修改後端 SQL 或 Join 映射。

---

## 四、 具體實施計畫 (Step-by-Step Plan)

### 階段 1：全域變數與非同步預載入設定

1. 在 `Freehandsss_dashboard_current.html` 的全域變數區域（約 line 5837 後）宣告價格對照表：
   ```javascript
   let fhsSuggestedPriceMap = {};
   ```
2. 新增非同步載入函數 `preloadSuggestedPrices()`：
   ```javascript
   async function preloadSuggestedPrices() {
       try {
           if (!isSupabaseRead()) return;
           const rows = await sbFetch('products', { select: 'sku,suggested_price' });
           if (rows && rows.length > 0) {
               rows.forEach(function(r) {
                   if (r.sku) fhsSuggestedPriceMap[r.sku] = Number(r.suggested_price || 0);
               });
               console.log('✅ SKU Suggested Price Map preloaded. Count:', Object.keys(fhsSuggestedPriceMap).length);
           }
       } catch (e) {
           console.error('❌ Failed to preload product prices:', e);
       }
   }
   ```
3. 在 `init()` 啟動流程中（約 line 10006），非同步呼叫此 preloader：
   ```javascript
   preloadSuggestedPrices();
   ```

### 階段 2：資料結構映射優化 (Mapping)

1. 在 `mapOrder()` 函數中的項目回傳物件中，補全 `Product_SKU` 欄位以利前端 O(1) 尋找：
   ```javascript
   // 在 mapOrder() 的 return it 區塊中：
   Product_SKU: it.product_sku || '',
   ```

### 階段 3：介面與切換控制實作 (UI & Toggle)

1. **新增稽核模式切換函數 `toggleAuditMode()`**：
   ```javascript
   function toggleAuditMode() {
       window.fhsShowItemFinancials = !window.fhsShowItemFinancials;
       localStorage.setItem('fhs_show_item_financials', window.fhsShowItemFinancials ? '1' : '0');
       
       const btn = document.getElementById('fhsToggleAuditBtn');
       if (btn) {
           if (window.fhsShowItemFinancials) {
               btn.innerHTML = '🔍 隱藏項目財務';
               btn.style.backgroundColor = '#E2EAFC';
               btn.style.borderColor = '#B1C9EF';
               btn.style.color = '#1D3557';
           } else {
               btn.innerHTML = '🔍 顯示項目財務';
               btn.style.backgroundColor = 'var(--fhs-bg-elevated)';
               btn.style.borderColor = 'var(--fhs-border)';
               btn.style.color = 'var(--fhs-text-primary)';
           }
       }
       if (window.globalOrders && window.globalOrders.length > 0) {
           renderReviewTable(window.globalOrders);
       }
   }
   ```
2. **在 `init()` 補上狀態復原邏輯**：
   ```javascript
   window.fhsShowItemFinancials = localStorage.getItem('fhs_show_item_financials') === '1';
   // 於 DOM 加載完畢後調用一次以更新按鈕外觀
   setTimeout(() => {
       const btn = document.getElementById('fhsToggleAuditBtn');
       if (btn && window.fhsShowItemFinancials) {
           btn.innerHTML = '🔍 隱藏項目財務';
           btn.style.backgroundColor = '#E2EAFC';
           btn.style.borderColor = '#B1C9EF';
           btn.style.color = '#1D3557';
       }
   }, 500);
   ```
3. **在篩選工具列插入 Button HTML**：
   定位至桌面版篩選器第二行尾端（約 line 2280 前後），於 `fhsSaveFilterBtn` 之前插入：
   ```html
   <button id="fhsToggleAuditBtn" class="fhs-btn-save-filter" type="button" onclick="toggleAuditMode()" style="background-color: var(--fhs-bg-elevated); color: var(--fhs-text-primary); border: 1px solid var(--fhs-border); margin-right: 6px;">
       🔍 顯示項目財務
   </button>
   ```

### 階段 4：雙版面渲染逻辑修改 (Desktop & Mobile)

1. **Desktop 表格渲染 (`renderReviewTable` 內迴圈)**：
   若 `window.fhsShowItemFinancials` 啟用，根據項目 `Qty`、`Cost` 與 `Product_SKU` 生成財務 HTML，加入 `.review-item-card` 的垂直 Flex 容器中。
2. **Mobile Accordion 渲染 (`renderReviewTable` 手機版迴圈)**：
   同步將生成的財務 HTML 插入手機項卡片 `.acc-item-card` 內 controls 元素之前。

---

## 五、 啟動 Subagent & Skill 的自動化驗證方案

為確保本實施計畫的高標準執行，後續將在獲得授權後，由 Antigravity 協同 Subagent 執行以下驗證步驟：
1. **動態測試 Skill (Preload Verification)**：
   建立獨立的測試檔（如 `scripts/repair/test_preload.js`），在 Node 中執行 Supabase products 查詢，核對所得 SKU 的數量和 suggested_price，確保無死鎖或憑證權限錯誤。
2. **Browser Subagent 視覺驗證 (UI Validation)**：
   啟動 headless browser subagent，執行以下測試：
   - 載入 `Freehandsss_dashboard_current.html`。
   - 確認篩選列有「🔍 顯示項目財務」按鈕，且點擊後表格能無誤地即時重繪。
   - 切換至手機視窗寬度（750px），確認 Accordion 切換後有相同的財務明細行，且字體大小與排版無遮擋或跑版。
   - 錄製操作驗收影片保存至 artifacts。

---

## 聲明：NO-TOUCH 護欄
**在未獲得 Fat Mo 正式呼叫 `/execute` 前，Antigravity 不會對專案中的代碼進行任何實體修改。本計畫僅作為架構論證及實施計畫落盤。**
