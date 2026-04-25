# Lesson: Financial Overview V40 整合 + 真實數據校正

**日期：** 2026-04-25
**Session：** 第十六次

---

## 本次任務摘要

1. 將獨立頁面 `freehandsss_financial_overview.html` 合併入 `freehandsss_dashboardV40.html` 作為第 4 個模式（`finance`）
2. 直接查詢 Airtable 取得真實財務數據，校正 Mock Data

---

## 教訓一：V40 整合模式的正確方法

**問題：** 獨立頁面的 `#fo-header`（sticky top: 64px）進入 V40 後變成雙層 header。

**解法：**
- 移除獨立頁面的 `#fo-header` HTML（V40 自有 `.fhs-top-bar`）
- Tab Bar sticky 改為 `top: 56px`（V40 top bar 高度為 56px，非 64px）
- 所有函式加 `fo` 前綴防命名衝突

**規則：** 整合獨立頁面前先確認宿主 Top Bar 高度（用 CSS 搜索 `.fhs-top-bar { height: ...}`）

---

## 教訓二：switchMode() 需要 setTimeout 延遲

**問題：** `financeModeContainer` 剛設為 `display:block`，Canvas 的 `clientWidth` 仍為 0。

**解法：** `setTimeout(foInitAll, 50)` — 給瀏覽器一個 tick 完成 layout reflow 後再渲染 canvas。

**規則：** 任何 `display:none → block` 後立即讀 canvas 尺寸，必須加 `setTimeout` 或 `requestAnimationFrame`。

---

## 教訓三：Mock Data 應使用真實 Airtable 數據

**問題：** Dashboard 顯示數據（Revenue: HK$38,090）與 Airtable 真實數據（HK$20,520）嚴重不符。

**根因：** Mock Data 是最初開發時隨意填入的假設數字，從未校正。

**解法：** 直接用 Airtable MCP 查詢 Main_Orders 表取得真實數值，計算後更新 Mock Data。

**真實基準（2026-04-25）：**
- 總收入 HK$20,520 / 總成本 HK$9,953 / 淨利潤 HK$10,567 / 7 筆訂單
- 3月：14,280 / 4月：6,240

**規則：** 每次新 session 啟動財務 Dashboard，先 Airtable 查詢校正 Mock Data，再處理功能開發。

---

## 教訓四：產品類別統計方法

Order_Items 的 `Item_Category` 來自 Product_Link 的 Lookup，有三個主分類：
- `純銀頸鏈吊飾`（佔最大頭）
- `金屬鎖匙扣`
- `立體擺設`（木框/玻璃瓶）

barChart 的 labels 需與真實分類對齊，不能繼續沿用假設的「木框套裝/玻璃瓶套裝」標籤。

---

## 待改善

- n8n workflow 匯入後，Mock Data 將被真實 webhook 數據取代，上述手動校正只是臨時方案
- Yearly tab 的折線圖資料太少（只有 2026 年數據），歷史年份暫時填 0，視覺上不理想
