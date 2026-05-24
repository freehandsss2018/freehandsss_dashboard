# FHS Progress Tracking & Financial Adjustment Integration (v4)

實施細分類進度追蹤 (Category-Aware Progress) 與補打調整金額 (Adjustment Amount) 跨系統同步。

## 建議之介面設計 (Premium UI/UX Design Proposal)

為提供最頂級的用戶體驗，本方案設計了以下三處 UI 顯示與互動位置：

1. **訂單總覽 (Review Table) 的行內下拉選單與動態輸入框**
   - 在訂單總覽的產品項目中，若用戶將進度下拉選單切換至「**需進行補打**」，下拉選單下方將**即時滑出**（使用 CSS transition 動態平滑展開）一個精緻的補打金額輸入框：
     ```html
     <div class="adjustment-input-wrapper">
       <span class="currency-symbol">$</span>
       <input type="number" class="adjustment-amount-input" placeholder="輸入補打金額">
     </div>
     ```
   - 該輸入框採用無邊框、精緻的下底線設計，並在失去焦點 (onblur) 或按下 Enter 時**自動保存**至 Supabase 且觸發同步。

2. **總覽表格「成交金額 (Final Sale Price)」旁的補打標籤 (Pill Tag)**
   - 在成交金額的儲存格中，若該訂單的 `adjustment_amount` 大於 0，將在其右方或下方顯示一個精緻的珊瑚色微型標籤 `(補打: +$X)`。
   - 該標籤採用柔和的半透明背景與文字顏色，既明顯又不搶奪核心金額的視覺焦點。

3. **編輯訂單表單 (Edit Order Modal) 的「財務金額資訊」區域**
   - 在原有的「訂金」、「尾數」、「附加費」下方，新增一個「補打費用 (Adjustment Amount)」的輸入欄位。
   - **動態顯示邏輯**：當且僅當此訂單內含「需進行補打」的產品，或該訂單在資料庫中已有 `adjustment_amount > 0` 時，此輸入欄位才會以柔和的淡入動畫顯示，否則預設隱藏以維持表單簡潔性。

---

## 使用者審查確認 (User Review Required)

> [!IMPORTANT]
> - **數據庫枚舉值 (Database Enum) 擴充**：
>   為了徹底避免瀏覽器快取被清理或跨裝置登入時「自訂細微狀態」丟失的漏洞，我們將正式擴充 Supabase 的 `item_status` ENUM，直接寫入 `'需進行補打'`, `'已book日期'`, `'已取模'`, `'待交收'` 至資料庫中。
> - **四端同步更新**：
>   Airtable 的欄位需要同步寫入，我們將同步修改 `FHS_Action_MetadataUpdate` n8n 工作流中的 Code Node，將 `Adjustment_Amount` 加入 batch-main chunk。

---

## 預期改動 (Proposed Changes)

我們將同步修改 `Freehandsss_dashboard_current.html` 與 `freehandsss_dashboardV41.html`，確保正式版與 V41 版程式碼完全一致。

### 1. 資料庫層級 (Supabase Schema)
- 建立一個 migration 腳本，透過 SQL 編輯器或 pg 連線擴充 ENUM 值：
  ```sql
  ALTER TYPE item_status ADD VALUE IF NOT EXISTS '需進行補打';
  ALTER TYPE item_status ADD VALUE IF NOT EXISTS '已book日期';
  ALTER TYPE item_status ADD VALUE IF NOT EXISTS '已取模';
  ALTER TYPE item_status ADD VALUE IF NOT EXISTS '待交收';
  ```

### 2. 前端介面與邏輯修改 (HTML/CSS/JS)

#### [MODIFY] [Freehandsss_dashboard_current.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/Freehandsss_dashboard_current.html)
#### [MODIFY] [freehandsss_dashboardV41.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV41.html)

- **更新 `_sanitizeItemStatus`**：
  支援新的狀態名稱映射，並傳回對應的正確字串。
- **更新 `mapOrder` 與 `sbFetchGlobalReview` 的 `qs.select`**：
  查詢及映射 orders 時，將 `adjustment_amount` 欄位納入查詢，並指派給 mappedOrder 對象的 `Adjustment_Amount` 屬性。
- **更新 `reconstructOrderFromSupabase`**：
  在表單還原的末端，讀取 `adjustment_amount` 並寫入新表單欄位 `#adjustment`，若數值大於 0 則使該欄位可見。
- **更新 `sbSyncOrder`**：
  在 upsert `orders` 的 row 結構中，加入 `adjustment_amount: payload.Adjustment_Amount || 0`。
- **UI 下拉選單分流渲染**：
  修改 `renderReviewTable` 渲染下拉選單的 option 生成邏輯：
  - 立體擺設：僅限 `["已book日期", "已取模", "待交收", "Done 已完成"]`。
  - 鎖匙扣 & 純銀吊飾：加入 `["需進行補打"]` 選項。
- **新增行內輸入框與動態切換機制**：
  在對應的 td 單元格內，若狀態為「需進行補打」，則動態顯示數字輸入框，其值同步更新至 order 的 `Adjustment_Amount` 並調用 `saveInlineEdit` 保存。
- **更新 `saveInlineEdit` 的 Webhook 送出邏輯**：
  若欄位為 `Adjustment_Amount`，則在 updateQueue 中標記為非 item 更新，寫入 `Adjustment_Amount`，並直接對 Supabase 進行 orders table PATCH。

### 3. 工作流修改 (n8n Workflow)

#### [MODIFY] [FHS_Action_MetadataUpdate.json](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/n8n/FHS_Action_MetadataUpdate.json)
- 修改 `Chunk Main_Orders` Code Node，將 `Adjustment_Amount` 欄位映射到 Airtable 的 `Adjustment_Amount` 中。

---

## 驗證計畫 (Verification Plan)

### 自動化與手動驗證
1. **健康稽核**：執行 `python Maintenance_Tools/run_all.py` 確保全局健康。
2. **整合測試**：執行 `node scripts/qa_v41_supabase.js` 確保 Supabase 資料讀寫與映射均符合 schema 規範。
3. **介面測試**：在網頁上修改進度為「需進行補打」，確認補打金額輸入框順利滑出，輸入金額後，檢查控制台輸出之 PATCH 請求成功，且重新整理後金額與狀態正確保留。
