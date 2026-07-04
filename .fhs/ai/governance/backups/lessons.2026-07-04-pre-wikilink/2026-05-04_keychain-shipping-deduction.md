# Lessons — 2026-05-04 鎖匙扣跨部位運費扣減修正

## 1. 跨部位運費扣減是訂單層規則，非 Item 層

Node 7 的 `(qty-1)×20` 只處理同 SKU qty>1 的情況。
不同部位（如 LH + RH 各 1 件）分屬不同 Order_Items，Node 7 完全不觸碰。
正確規則：Node 14 訂單層 `(keychainItemCount - 1) × 20`。
**應對**：凡有跨 Order_Items 的批次扣減邏輯，必須在 Node 14 層計算，不能依賴 Node 7。

## 2. n8n PUT API 拒絕 GET 回傳的額外欄位

`GET /workflows/:id` 回傳 `active`, `isArchived`, `meta`, `tags`, `shared` 等欄位，
但 `PUT /workflows/:id` 的 schema 有 `additionalProperties: false`，會拒絕這些欄位。
**修正**：PUT body 只傳 `name`, `nodes`, `connections`, `settings`, `staticData`, `pinData`。
不要把 GET response 直接 spread 後 PUT。

## 3. 遷移腳本 update-legacy-profit.js 不含新扣減規則

`scripts/update-legacy-profit.js` 直接加總 Order_Items Subtotal_Cost，
不會套用跨部位運費扣減（§2.5）。
重新執行會覆蓋人工修正的 Total_Cost。
**應對**：執行前必須先更新腳本加入 §2.5 邏輯，或執行後重新套用扣減。

## 4. qty=N 在 Order_Items 代表「同部位 N 件」而非「N 倍成本乘數」

Order_Items.Quantity=2 代表客人買了同部位 2 件，使用「2飾」批次價 SKU。
n8n Node 14 用 `Total_Base_Cost`（Product_Database 的批次總成本），不再乘以 qty。
**應對**：看到 qty>1 的 K Order_Item，理解為「使用 N飾 SKU」，成本已是批次總價。

## 5. 22 筆訂單中 Shirley (0650429) 在原 11 單修正範圍外被遺漏

原審計只過濾了 0600xxx 系列訂單，0650xxx 系列未被納入查詢範圍。
**應對**：跨系列修正時，查詢條件不能假設訂單號碼格式，應查全表再過濾類別。

## 6. 解說複雜計算規則應用實物表格，不用術語

Fat Mo 反映「bundle」、「SKU mapping」等術語難理解。
改用「產品 | 件數 | 成本」表格直接展示實物，最後一行顯示扣減和總成本。
