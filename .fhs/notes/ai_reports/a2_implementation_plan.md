# FHS 系統優化實作計畫 (A2) — ag-plan

**目標**：針對產品數據同步（products.js）與 Dashboard 定價硬編碼問題進行清理與優化。
**日期**：2026-04-01
**狀態**：等待批准 (Awaiting Approval)

---

## 1. 審計發現與風險 (Findings & Risks)

基於本地環境分析，目前系統存在以下問題：

### 1.1 定價邏輯硬編碼 (Hardcoded Pricing)
- **發現**：`Freehandsss_dashboard_current.html` 中的 `processTierPricing` 函數直接寫死了產品單價。
- **風險**：與手動維護的 `FHS_Product_Bible_V3.7.md` 存在脫節風險。若聖經更新但代碼未改，POS 將報出錯誤價格。

### 1.2 沉積資產 (Legacy Sediment)
- **發現**：`products.js` 與 `products.json` 為早期緩存機制，目前 HTML 程式碼完全沒有引用這兩個檔案。
- **風險**：虛假的存在感會誤導開發者或 AI Agent，導致維護錯誤。

### 1.3 檔案命名混亂
- **發現**：存在 `freehandsss_dashboardV36.html` 與 `Freehandsss_dashboard_current.html` 兩個內容相同的檔案。
- **風險**：增加覆蓋錯檔案的機率。

---

## 2. 擬議修改檔案清單 (Proposed Changes)

### 2.1 儲存庫清理
#### [DELETE] [products.js](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/products.js)
#### [DELETE] [products.json](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/products.json)
#### [DELETE] [freehandsss_dashboardV36.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV36.html)

### 2.2 基礎設施補強
#### [MODIFY] [package.json](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/package.json)
- 新增 `scripts` 區塊，加入 `sync-check` 佔位符，提醒未來開發者執行自動化校驗。

### 2.3 文件地圖同步
#### [MODIFY] [repo-map.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/docs/repo-map.md)
- 更新檔案地圖以移除已刪除的檔案。

---

## 3. 驗證計畫 (Verification Plan)

1. **核心功能檢測**：移除檔案後，手動觸發 Dashboard 的 `generate()` 函數，確保定價運算依然正常。
2. **三端比對**：隨機抽取產品，確認 HTML 硬編碼價格與聖經一致。
3. **系統完整性**：執行 `/fhs-check` 指令，確保無破損路徑。

---

> [!IMPORTANT]
> **NO-TOUCH GUARDRAIL**
> 本文件僅為計畫書。在獲得 `/execute` 授權前，Antigravity 不會對以上提及的任何程式碼執行實際寫入操作。
