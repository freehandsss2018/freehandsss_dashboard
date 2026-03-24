# FHS Lesson: Airtable Data Cleansing & V3.5 Bible Standards

## 💡 學習點總結
為了配合 `FHS_Product_Bible_V3.5.md` 的「唯一真理」，資料庫必須進行大規模清洗，確保售價與成本與系統運算邏輯 100% 同步。

## 🛠️ 執行成果
- **成本標準化**: 更新了 28 筆 `Base_Costs`，強制執行：
  - 嬰兒/大寶 (S): $60 | (P): $110
  - 成人 (S): $110 | (P): $240
- **售價覆蓋**: 批次更新了 484 筆 `Product_Database` 的 `Suggested_Price_Manual`，全面取代舊有公式。
- **補全 SKU**: 建立了缺失的成人(P)與家庭(P)不銹鋼與純銀吊飾項目。

## ⚠️ 防呆警告 (Source of Truth)
- **單一源頭**: 一切以 `FHS_Product_Bible_V3.5.md` 為準，不應依賴 Airtable 內部的 Excel 型公式。
- **畫圖成本**: 系統應採用 `System_Total_Cost` 欄位直接輸出，減少人工計算誤差。

---
*Created: 2026-03-21*
*Reference Session: 1162b961-8c9c-481c-bd35-ebceee62e932*
