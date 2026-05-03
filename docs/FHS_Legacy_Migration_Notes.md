# FHS 舊訂單遷移注意事項
>
> **用途**：記錄 Excel 舊資料遷移至 Airtable 的缺失問題與處理方法，供日後再次遷移時參考。
> **首次遷移**：2026-04-26（2026年 Jan–Apr 共 17 筆）
> **相關腳本**：`scripts/sync-legacy-orders.js`、`scripts/update-legacy-profit.js`、`scripts/update-legacy-sale-price.js`

---

## 1. Excel 資料的已知缺失

### 1.1 主要商品（倒手模）缺失

**問題**：Excel 金額欄（M欄）只記錄金屬商品（鎖匙扣/吊飾）的收費，**沒有記錄木框/玻璃瓶擺設的售價**。

**原因**：Fat Mo 當時 Excel 設計只記錄加購商品，木框擺設視為理所當然的主產品，沒有獨立列出。

**處理方法**：

- 非 P 系列訂單 → 一律補加 `木框套裝 (4肢)` 作為主商品（單購）
- Final_Sale_Price += $2,380（木框套裝4肢的 Suggested_Price_Manual）
- P 系列訂單 → 不加木框，第一件商品視為單購，其餘為加購

**影響的訂單**（12筆非P系列）：
Jasmine、Akira、Kathleen、Gaeac、森橋、Micaela、KateSo、Bu、DebbieHo、PrinceCheng、Angel、Wing430

---

### 1.2 Deposit / Balance 拆分缺失

**問題**：Excel 只記錄「總金額」，**沒有分開記錄訂金 (Deposit) 和尾數 (Balance)**。

**處理方法**：

- 遷移時 Deposit = 0, Balance = 0（欄位留空）
- Final_Sale_Price 直接填入 Excel 的總金額（加上木框售價後）
- 日後如需補回，需向 Fat Mo 或 Ling Au 查核原始收款記錄

---

### 1.3 Order_ID 缺失

**問題**：Excel 舊訂單**沒有 FHS-XXXXX 格式的訂單編號**，只有 S/N 流水號。

**處理方法**：

- 遷移時 Order_ID 欄位留空（Airtable 不強制此欄）
- 對比鍵改用「日期 + 客人名稱」複合鍵防止重複匯入
- 日後如有需要，可手動補入自訂編號

---

### 1.4 成本資料不可信

**問題**：Excel N欄（成本）記載的是**當時的歷史成本**，現在已過期或不準確。

**處理方法**：

- 完全**忽略** Excel 的成本數字
- Total_Cost 改從 Airtable `Product_Database` 的 `Total_Base_Cost` 重新計算
- 執行 `scripts/update-legacy-profit.js` 從 Order_Items Subtotal Cost 加總回填

---

### 1.5 部分商品規格模糊

**問題**：Excel 的「對象」、「零件」欄位描述不統一，例如：

- 「腳 / 已掉手」= 只有腳（手已掉落不適合倒模）
- 「手 / 客客」= 手部，備註為客客（嬰兒暱稱）
- 「當爸父」= 備註對象是父親

**處理方法**：

- 將這些說明放入 `Specification` 欄位（自由文字）
- 不強行映射至固定部位代碼
- 刻字 (Engraving_Text) 只記錄真正需要刻的文字

---

### 1.6 部分訂單金額異常偏低

**問題**：個別訂單金額明顯低於正常售價，例如：

- Bu：$500（正常木框4肢應為 $2,380 起）

**處理方法**：

- **不修改**，按 Excel 原始金額輸入
- 這些可能是優惠價、舊友價或部分收款
- 在 `Admin_Notes` 欄可補充說明（如需要）

---

## 2. 遷移時跳過的訂單

以下 4 筆訂單在 Excel 中存在，但 Airtable **已有記錄**，遷移時跳過：

| 客人 | 原因 |
|------|------|
| Amen | Airtable 已有（2026-03-11） |
| Katrina Sui | Airtable 已有（2026-03-28） |
| Shirley | Airtable 已有（2026-04-02）— Excel 同名不同單 |
| Lokyi_C | Airtable 已有（2026-04-16） |

> ⚠️ **Shirley 特別注意**：Excel 有一筆 Shirley（Mar-10），Airtable 有一筆 Shirley（Apr-02）。經 Fat Mo 確認為同一人不同訂單，以 Airtable 記錄為準，Excel 那筆不補入。

---

## 3. 日後再次遷移的標準流程

### Step 1 — 數位化 Excel 資料

將 Excel 轉為結構化資料，每筆訂單必須包含：

```text
customer_name      (客人名稱)
appointment_date   (Excel 日期欄 = Order_Confirm_Date)
final_sale_price   (Excel 金額欄，非P系列需 +$2,380)
batch_number       (批次號)
items[]            (商品列表，見下)
```

每件商品：

```text
sku        (對應 Product_Database 的 Product_Name，必須完全一致)
qty        (數量)
spec       (規格/部位，自由文字)
engraving  (刻字)
```

### Step 2 — 確認 SKU 對應

對照 `docs/FHS_Product_Bible_V3.7.md` 與 Airtable `Product_Database`，確認每件商品的 SKU 名稱完全一致。

常見 SKU 格式：

- 木框套裝 (4肢) / 木框套裝 (2肢)
- 嬰兒鎖匙扣 - 不銹鋼 - {N}飾 (加購/單購)
- 嬰兒(P)鎖匙扣 - 不銹鋼 - {N}飾 (單購/加購)
- 嬰兒吊飾 - 925銀 - {N}飾 (加購)

### Step 3 — 判斷 P 系列 vs 非 P 系列

- **非 P 系列**（S 系列，實體倒模）：補加 `木框套裝 (4肢)` 主商品，Final_Sale_Price += $2,380
- **P 系列**（照片建模）：不加木框，第一件為單購，其餘為加購

### Step 4 — 執行腳本

> ⚠️ **重要警告（2026-05-04 更新）**：`update-legacy-profit.js` 目前**不包含跨部位鎖匙扣運費扣減邏輯**（Product Bible §2.5）。
> 執行後會用原始 Item_BaseCost 總和覆蓋 Total_Cost，**抹除**已人工修正的跨件運費扣減。
> 執行前必須先更新腳本，或在執行後重新套用 §2.5 扣減規則。

```bash
# 1. 試跑確認無誤
node scripts/sync-legacy-orders.js --dry-run

# 2. 正式匯入
node scripts/sync-legacy-orders.js

# 3. 計算成本與利潤（從 Product_Database 重算）
#    ⚠️ 執行前請確認腳本已包含跨部位鎖匙扣運費扣減（§2.5）
node scripts/update-legacy-profit.js --dry-run
node scripts/update-legacy-profit.js
```

### Step 5 — 填入 Order_Confirm_Date

- Excel 的「日期」欄 = 客人確認訂單日期 = `Order_Confirm_Date`
- 遷移後需手動或腳本批次填入此欄位
- 用途：月度/年度財務統計的基準日期

---

## 4. 欄位對照表（Excel → Airtable）

| Excel 欄位 | Airtable 欄位 | 備註 |
|-----------|--------------|------|
| A欄 S/N | — | 不匯入，用日期+客名作對比鍵 |
| B欄 日期 | `Order_Confirm_Date` | 確認訂單日期，非取模日 |
| C欄 客人 | `Customer_Name` | |
| D欄 刻字 | `Engraving_Text` | 放入對應 Order_Item |
| E欄 刻字日期 | — | 不匯入 |
| F欄 對象 | `Specification` | 自由文字 |
| G欄 零件 | `Specification` | 合併放入 Specification |
| H欄 產品 | SKU → `Product_Link` | 需對應 Product_Database |
| I欄 材質 | SKU 的一部分 | 已含在 SKU 名稱內 |
| J欄 數量 | `Quantity` | |
| K/L欄 批次 | `Batch_Number` | |
| M欄 金額 | `Final_Sale_Price` | 非P系列需 +$2,380 |
| N欄 成本 | **忽略** | 以 Airtable Product_Database 重算 |
| O欄 調整 | `Adjustment_Amount` | 若有差異才填 |
| P欄 利潤 | `Net_Profit` | 由腳本重算，不用 Excel 數字 |
