# a2_implementation_plan - 財務數據對齊與高性能架構優化計畫

此計畫針對 Freehandsss 儀表板中「財務概覽 KPI」與「訂單明細明細表」之間的數據不一致進行徹底修復，並對系統效能與數據同步進行架構級優化。

## 一、 核心目標與範圍 (Goal & Scope)
1. **數據一致性 (Data Parity)**：確保任何情況下，財務 KPI 卡片與明細表格的數據完全對等。
2. **高效能架構 (Performance)**：將原本 12 次併發的 REST RPC 合併為單次網路請求，降低 Supabase 連線池與帶寬消耗。
3. **衝突避免與 SSoT 閉環**：建立前端補打金額（`adjustment_amount`）更新至 n8n/Airtable 的同步閉環，防止數據覆蓋。
4. **自動化 UI/UX 驗證**：引入 browser_subagent 與 Playwright 進行 E2E 渲染對比。

---

## 二、 前期方案自我批評 (Self-Criticism of Previous Approach)
在審查前版計畫後，我們發現了以下 3 個核心架構弱點並予以改進：
1. **高併發 API 浪費**：原計畫發起 12 次並行的 RPC，極易觸發 Supabase Free Tier 限制。優化方案將其合併為單一 JSON 封裝 RPC。
2. **SSoT 閉環缺失**：原計畫直接 PATCH Supabase 上的補打金額，但在全量同步時會被 n8n/Airtable 覆蓋。優化方案將引入 n8n Webhook 寫回機制。
3. **忽略 DOM 渲染驗證**：原計畫僅在資料庫層進行數據驗證，無法防範 Chrome 在日期轉換等前端代碼上的 NaN 或渲染順序問題。優化方案改用 Playwright 進行瀏覽器畫面數值比對。

---

## 三、 擬議修改檔案清單 (Proposed Changes)

### 1. 資料庫層 (Database Layer)

#### [NEW] [get_financial_dashboard_pack.sql](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/supabase/rpc/get_financial_dashboard_pack.sql)
建立單一整合型 RPC 函數，一次性處理所有財務 KPI 與圖表折線、佔比數據，回傳結構化的 JSON 對象：
*   **成本 (cost)**: `COALESCE(total_cost, 0) + COALESCE(adjustment_amount, 0)`
*   **利潤 (profit)**: `final_sale_price - (COALESCE(total_cost, 0) + COALESCE(adjustment_amount, 0))`
*   **其他成本拆分 (other)**: 包含補打金額的差額計算。

#### [DELETE] [get_financial_kpis.sql](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/supabase/rpc/get_financial_kpis.sql) (選用，若舊函數無其他依賴則移除以保持數據乾淨)

---

### 2. 前端介面層 (Frontend Layer)

#### [MODIFY] [freehandsss_dashboardV41.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV41.html)
*   **重構 `sbFetchFinancial()`**：改為調用單一的 `get_financial_dashboard_pack`。
*   **動態篩選對齊**：抓取前端 `#reviewYear` 與 `#reviewMonth` 的選擇值作為時間過濾條件傳入 RPC。
*   **補打金額 SSoT 寫回**：在 `saveAdjustmentAmount()` 中，PATCH 成功後發送通知給 n8n webhooks，同步回 Airtable。
*   **數據異常警示 UI**：在 KPI 卡片中新增黃色警示標誌，提示管理員當月包含 `null` 成本的草稿訂單或已調賬目。

---

### 3. 自動化測試 (Automated Validation)

#### [NEW] [assert_financial_e2e.js](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/scripts/assert_financial_e2e.js)
建立一個 Playwright 整合校驗腳本：
1. 啟動 headless 瀏覽器加載 Dashboard V41。
2. 遍歷選取 2026年 1月、2026年 2月等，讀取畫面的 KPI 卡片（收入、成本、利潤、訂單數）。
3. 直連 PostgreSQL 進行相同的 SQL Sum 比對。
4. 驗證 UI 渲染值與底層數據完全對等。

---

## 四、 驗證與執行步驟 (Verification Plan)

### 第一階段：自動化測試
1. 部署整合型 SQL 函數。
2. 執行 `node scripts/assert_financial_e2e.js` 確認無任何偏離。

### 第二階段：手動與視覺確認
1. 切換明細表篩選，切換分頁至財務，觀察 KPI 數字與下方訂單列表加總。
2. 檢查警告標示是否正確在含有草稿（如 0600701）的月份彈出提示。
