---
name: finance-calculator
type: fhs-native
version: 1.0.0
scope: reference-only (不常駐 context，按需 Read)
---

# FHS Finance Calculator — 核心財務公式

> 詳細財務守護規則見 `AGENTS.md §財務真理守護`。本 skill 只補充計算公式與快速查表。

## 利潤公式

```
Profit = Sale_Price - Cost
Gross_Margin% = (Sale_Price - Cost) / Sale_Price × 100
AOV = Total_Revenue / Order_Count
```

## 前端 vs n8n 利潤優先規則

| 情況 | 誰計算利潤 |
|------|-----------|
| 前端傳入 profit ≠ 0 | **前端值為最終值，n8n 不介入** |
| 前端傳入 profit = 0 | n8n 重算：`Sale_Price - Cost` |

## SKU 成本映射

詳細定價見 `docs/FHS_Product_Bible_V3.7.md`（唯一真理來源）。

## 財務欄位類型規範

| 欄位 | Airtable 類型 | 備注 |
|------|--------------|------|
| Sale_Price | number / currency | 非 string |
| Cost | number / currency | 非 string |
| Profit | number / currency | 非 string |
| Order_Confirm_Date | date (ISO) | 收入確認日 |
