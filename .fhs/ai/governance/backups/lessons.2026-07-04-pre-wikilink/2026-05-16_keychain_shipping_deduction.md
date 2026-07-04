# Lesson: HK$20 鎖匙扣跨部位運費共享扣減 — 深度診斷與案例
**日期**: 2026-05-16
**關聯文件**: `docs/FHS_Product_Bible_V3.7.md §2.5`、`.fhs/ai/FHS_Finance_Bible.md §4`
**前置 Lesson**: `.fhs/memory/lessons/2026-05-04_keychain-shipping-deduction.md`（規則首次發現）

---

## 1. 規則說明

**觸發條件**: 同一訂單內，鎖匙扣類 Order_Items 的件數合計 > 1

**公式**:
```
keychainShippingDeduction = (keychainItemCount - 1) × HK$20
keychain_cost（正確值）= keychain_cost（原始）- keychainShippingDeduction
```

**計算層級**: 訂單層（Order），非 Item 層。  
跨不同 Order_Items 的鎖匙扣件數需先在訂單層加總，再計算扣減。

**業務邏輯**: 鎖匙扣第一件需支付 HK$20 配件運費，同訂單每多一件豁免一次 HK$20，因為配件可以合單出貨。

**Fat Mo 確認日期**: 2026-05-03

---

## 2. 文件出處（三處）

| 出處 | 位置 | 說明 |
|------|------|------|
| Product Bible | `docs/FHS_Product_Bible_V3.7.md §2.5` | 規則原始定義，包含「誠實記錄」的已知缺口 |
| Finance Bible | `.fhs/ai/FHS_Finance_Bible.md §4` | 財務計算引用此規則作為成本扣減標準 |
| n8n 實作 | `Calculate Profit & Pack Items` 節點 | 代碼層實作（詳見下節） |

---

## 3. n8n 代碼位置

**節點名稱**: `Calculate Profit & Pack Items`（原稱 Node 14，訂單層計算）

**關鍵變數**:
```javascript
keychainShippingDeduction = (keychainItemCount - 1) * 20
```

**注意**: Node 7（`(qty-1)×20`）只處理同 SKU qty>1 的情況（同一 Order_Item 內多件），
不處理跨 Order_Items 的鎖匙扣合單。跨 Item 扣減必須在訂單層（Node 14）計算。

---

## 4. 已知缺口（Product Bible §2.5 誠實記錄）

現行 n8n 邏輯（V45.7.4）只完整處理「單一 Order_Item qty > 1」情況。

**跨 Item 扣減尚未完整實作的場景**:
- 訂單有 LH 鎖匙扣（qty=1）+ RH 鎖匙扣（qty=1）= 兩個不同 Order_Items，各 qty=1
- 此情況 `keychainItemCount` 能正確加總到 2，扣減應為 HK$20
- 但若 `orders.keychain_cost` 欄位是從 Item 層直接加總而未套用扣減，則結果錯誤

**待修正版本**: V45.7.4（已記錄，待 Fat Mo 安排）

---

## 5. 今日案例 — 訂單 0600802

**訂單**: `0600802`  
**產品**: 2 件鎖匙扣

**數據異常**:
| 欄位 | 原始值 | 正確值 |
|------|--------|--------|
| `orders.keychain_cost` | HK$470 | HK$450 |
| `orders.total_cost` | HK$450 | HK$450（已正確套用扣減） |

**根本原因**:
`orders.total_cost` 在 n8n 計算時有套用 `keychainShippingDeduction`（-HK$20），
但 `orders.keychain_cost` 欄位本身沒有套用，仍為原始值 HK$470。
導致兩欄位不一致：`total_cost ≠ keychain_cost`（差 HK$20）。

**發現方式**: 人工核對訂單成本明細時，發現 `keychain_cost + handmodel_cost + necklace_cost ≠ total_cost`。

**修正方式**: 直接更新 `orders.keychain_cost = HK$450`（套用扣減後的正確值）。

---

## 6. 快速診斷指引

**觸發條件**: 發現 `total_cost ≠ keychain_cost + handmodel_cost + necklace_cost`

**排查步驟**:

1. **先查鎖匙扣件數**：該訂單有幾件鎖匙扣 Order_Items？合計件數是否 > 1？
2. **計算應有扣減**：`(keychainItemCount - 1) × HK$20`
3. **比對 keychain_cost**：`keychain_cost（Airtable）` 是否已扣除此金額？
4. **比對 total_cost**：`total_cost` 是否已反映扣減（通常 total_cost 正確）？
5. **若 keychain_cost 未扣減**：手動更新 `keychain_cost = 原值 - keychainShippingDeduction`

**此規則是差異的首要嫌疑人**，凡成本加總對不上，先查此規則再查其他原因。

---

## 7. 架構層次總結

```
訂單成本加總（正確）：
  total_cost = keychain_cost（含扣減）+ handmodel_cost + necklace_cost + ...

n8n 計算順序：
  Node 7  → Item 層：同 SKU qty>1 的批次成本
  Node 14 → 訂單層：keychainShippingDeduction 扣減 → 寫入 total_cost

已知問題：
  Node 14 正確計算 total_cost，但 keychain_cost 欄位未同步更新為扣減後的值
  → keychain_cost 與 total_cost 之間存在系統性 HK$20×(n-1) 差距
```
