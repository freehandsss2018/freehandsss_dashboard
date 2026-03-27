# 三端對齊欄位地圖 (Triple-Sync Field Map)
# Dashboard ↔ n8n ↔ Airtable 完整欄位映射

> **版本:** V45.7.4+
> **日期:** 2026-03-26
> **用途:** 任何 AI (Claude / Antigravity / Cursor) 修改系統時，必須先讀此文件確認三端欄位對齊。
> **工作流:** FHS_Core_OrderProcessor (`6Ljih0hSKr9RpYNm`, 24 nodes)

---

## 目錄
1. [系統總覽圖](#1-系統總覽圖)
2. [Dashboard → n8n Webhook 完整 Payload](#2-dashboard--n8n-webhook-payload)
3. [n8n 節點鏈 — 逐節點欄位追蹤](#3-n8n-節點鏈--逐節點欄位追蹤)
4. [n8n → Airtable 寫入映射](#4-n8n--airtable-寫入映射)
5. [Airtable → n8n 讀取映射](#5-airtable--n8n-讀取映射)
6. [完整欄位生命週期表](#6-完整欄位生命週期表)
7. [SKU 轉換對照表](#7-sku-轉換對照表)
8. [Telegram 輸出欄位](#8-telegram-輸出欄位)
9. [快速查找索引](#9-快速查找索引)

---

## 1. 系統總覽圖

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (前端)                              │
│  Freehandsss_dashboard_current.html                             │
│                                                                 │
│  captureFormState() → Raw_Form_State                            │
│  buildPayload()    → JSON POST body                             │
│  getWebhookUrl()   → webhook URL                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP POST (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    n8n (中介層)                                   │
│  FHS_Core_OrderProcessor — 24 nodes                              │
│                                                                  │
│  Webhook → Normalize → Switch                                    │
│    ├─ DELETE: Search → Delete → Telegram                         │
│    └─ CREATE/EDIT:                                               │
│        ├─ Profit Auditor → Switch → Alert (side-channel)         │
│        └─ Parse Items → SKU Collector → Fetch Cost               │
│           → Map → Calculate → Create Main → Bind ID              │
│           → Create Sub Items → Pack Telegram → Send Report       │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ Airtable API (Write)         │ Airtable API (Read)
           ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AIRTABLE (儲存端)                              │
│  Base: app9GuLsW9frN4xaT                                        │
│                                                                  │
│  ┌─ Main_Orders (tbltCH0I9fknVCtmV)  ← 訂單主表                 │
│  ├─ Order_Items  (tbljkptnNcUEyDRFH)  ← 訂單細項表               │
│  └─ Product_Database (tblC3HDJAz9W0OF6R) ← SKU/成本 查找表       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Dashboard → n8n Webhook Payload

### Webhook URL
- **生產:** `https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b`
- **測試:** `https://yanhei.synology.me:8443/webhook-test/fetch-fhs-order`
- **Metadata:** `https://yanhei.synology.me:8443/webhook/update-order-meta`

### 2.1 訂單級欄位 (Order-Level Fields)

| Dashboard 欄位 | 型別 | 說明 | 範例值 |
|----------------|------|------|--------|
| `action` | String | 動作類型 | `"create"` / `"edit"` / `"delete"` |
| `Order_ID` | String | 訂單編號 | `"FHS-0695346"` |
| `Customer_Name` | String | 客人名稱 | `"Chan BB"` |
| `Appointment_Date` | Date/null | 預約日期 | `"2026-04-15"` / `null` |
| `Deposit` | Number | 訂金 | `1000` |
| `Balance` | Number | 尾數 | `2240` |
| `Additional_Fee` | Number | 附加費 | `0` |
| `System_Total_Cost` | Number | 系統計算總成本 | `395` |
| `System_Final_Sale_Price` | Number | 系統計算建議售價 | `3240` |
| `System_Additional_Fee` | Number | 系統計算附加費 | `0` |
| `Full_Order_Text` | String | 完整訂單描述 (含 emoji) | `"🖼️ 木框套裝 (4肢)..."` |
| `Clean_Order_Text` | String | 清潔版訂單描述 | `"木框套裝 (4肢)..."` |
| `Raw_Form_State` | JSON String | 表單完整快照 | `"{\"momName\":\"Chan\",...}"` |
| `Update_Note` | String | 變更摘要 (Edit only) | `"🔄 更新項目: 訂金, 部位"` |
| `Role` | String | 操作角色 | `"ling"` / `"fat"` |
| `Record_ID` | String | Airtable Record ID (Edit/Delete) | `"recABC123..."` |

### 2.2 商品級欄位 (Item-Level Fields — `Order_Items_List[]`)

| Item 欄位 | 型別 | 說明 | 範例值 |
|-----------|------|------|--------|
| `Product_Name` | String | 商品名稱 (Dashboard 原始格式) | `"木框套裝 (4肢)"` |
| `Quantity` | Number | 數量 | `1` |
| `Mode` | String | 加購/單購模式 | `"(加購)"` / `"(單購)"` |
| `Notes` | String | 刻字/備註 | `"[上排]JOHN [下排]2026"` |
| `Order_Item_Key` | String | 商品唯一鍵 | `"FHS-06990_P_MAIN"` |
| `part_id` | String | 部位代碼 (optional) | `"lh"`, `"rf"`, `"e_lf"` |
| `target` | String | 對象 (optional) | `"嬰兒"` / `"大寶"` |
| `isFamily` | Boolean | 家庭套裝標記 (optional) | `true` / `false` |
| `comboNote` | String | 套裝組合說明 (optional) | `"父母 ➕ 嬰兒"` |
| `isAccessory` | Boolean | 配件標記 (optional) | `true` |
| `Suggested_Price_Manual` | Number | 單品建議售價 | `2380` |
| `Drawing_Cost` | Number | 畫圖成本 | `60` |

### 2.3 Raw_Form_State 內嵌欄位 (序列化 JSON)

<details>
<summary>展開 Raw_Form_State 完整欄位列表</summary>

**基本資料:**
| 欄位 | 說明 |
|------|------|
| `momName` | 聯絡人名稱 |
| `appDate` | 預約日期 |
| `babyAgeMonths` | 嬰兒月齡 |
| `appTimeHour` | 預約時間 (小時) |
| `appTimeAmPm` | AM/PM |
| `deposit` | 訂金 (字串) |
| `balance` | 尾數 (字串) |
| `additional` | 附加費 (字串) |

**Category P (立體擺設):**
| 欄位 | 說明 |
|------|------|
| `enableP` | 立體擺設啟用 |
| `pSubCat` | 子類別: `"木框款式"` / `"玻璃瓶款式"` |
| `pEngraving` | 底板刻字 |

**Category K (鎖匙扣):**
| 欄位 | 說明 |
|------|------|
| `enableK` | 鎖匙扣主開關 |
| `k_baby_sec_en` | 嬰兒區段啟用 |
| `k_{part}_en` | 各部位啟用 (part: lh/rh/lf/rf) |
| `k_{part}_qty` | 各部位數量 |
| `k_{part}_top` | 上排刻字 (6字限) |
| `k_{part}_bot` | 下排刻字 (8字限) |
| `k_elder_sec_en` | 大寶區段啟用 |
| `k_e_{part}_en/qty/top/bot` | 大寶各部位欄位 |
| `k_family_en` | 家庭套裝啟用 |
| `k_family_combo` | 套裝型號: `"S1_B"` / `"S2_BB"` / `"S2_BE"` |
| `k_family_qty/top/bot` | 家庭套裝欄位 |
| `fam_p1_sel` / `fam_p2_sel` | 家庭部位選擇 |

**Category M (吊飾):**
| 欄位 | 說明 |
|------|------|
| `enableM` | 吊飾主開關 |
| `m_baby_sec_en` | 嬰兒區段啟用 |
| `m_{part}_en/qty/color/eng` | 各部位欄位 |
| `m_elder_sec_en` | 大寶區段啟用 |
| `m_e_{part}_en/qty/color` | 大寶各部位欄位 |

**Category W (配件):**
| 欄位 | 說明 |
|------|------|
| `enableW` | 配件區段啟用 |
| `w_wool_en` | 羊毛氈啟用 |
| `w_wool_qty` | 羊毛氈數量 |

**動態部位選擇:**
| 欄位 | 說明 |
|------|------|
| `limb_sel_{who}_{part}` | 部位選擇值 (如 `limb_sel_嬰兒_左手`) |

**系統注入 (以 __ 前綴):**
| 欄位 | 說明 |
|------|------|
| `__FHS_Quote_Mode` | `"(加購)"` / `"(單購)"` |
| `__FHS_Quote_HasAdult` | `"Yes"` / `"No"` |
| `__System_Total_Cost` | 系統計算成本 |
| `__System_Final_Sale_Price` | 系統計算售價 |
| `__System_Additional_Fee` | 系統計算附加費 |

</details>

---

## 3. n8n 節點鏈 — 逐節點欄位追蹤

### 3.0 節點 ID 快速對照

| # | 節點名稱 | 節點類型 | Node ID |
|---|---------|---------|---------|
| 1 | Receive Dashboard Order | Webhook | — |
| 2 | Input Normalizer | Code | — |
| 3 | Switch Action | Switch | — |
| 4 | Profit Auditor | Code | `008aca1b-15c9-43c9-a861-e8c602fcded3` |
| 5 | Auditor Logic Switch | Switch | `e6bc9cd3-a6ba-4574-9adf-b9a1d35afa9f` |
| 6 | Auditor Alert | Telegram | — |
| 7 | Parse Items & Generate SKU | Code | `97e25cdd-619b-4033-b189-8f2fbb654ac4` |
| 8 | Batch SKU Collector | Code | `94d1c0c0-5cd8-460c-be20-e3b328ccf8db` |
| 9 | Read Cache File | ReadBinaryFile | — |
| 10 | Smart Cache Strategist | Code | — |
| 11 | Cache Hit? | Switch | — (dead node, disconnected) |
| 12 | Fetch Exact Base Cost | Airtable | — |
| 13 | Local Data Mapper | Code | — |
| 14 | Calculate Profit & Pack Items | Code | — |
| 15 | Create Main Order | Airtable | — |
| 16 | Bind Main Order ID | Code | — |
| 17 | Create Sub Items | Airtable | — |
| 18 | Pack Telegram Data | Code | — |
| 19 | Send Profit Report | Telegram | — |
| 20 | Search Record to Delete | Airtable | — |
| 21 | Delete Record | Airtable | — |
| 22 | Notify Telegram (Delete) | Telegram | — |

### 3.1 Node 1: Receive Dashboard Order (Webhook)

```
輸入: HTTP POST body (JSON)
輸出: $json.body.{所有 Dashboard 欄位}
```

| 輸出欄位 | 來源 |
|----------|------|
| `body.*` | Dashboard POST payload 的完整 JSON |

---

### 3.2 Node 2: Input Normalizer (Code)

```
輸入: Receive Dashboard Order
輸出: 標準化後的動作 + 原始資料
```

| 輸出欄位 | 轉換邏輯 |
|----------|---------|
| `action` | `(body.action \|\| body.Action \|\| '').toLowerCase()` → `'create'`/`'edit'`/`'delete'` |
| `isDelete` | `action === 'delete'` |
| `Record_ID` | 直接傳遞 |
| `Order_ID` | 直接傳遞 |
| `Customer_Name` | 直接傳遞 |
| 其他所有欄位 | 原封不動傳遞 |

---

### 3.3 Node 3: Switch Action (Switch)

```
條件: $json.action === 'delete'
Output 0 → DELETE 路線 (Search → Delete → Telegram)
Output 1 → CREATE/EDIT 路線 (Profit Auditor + Parse Items)
```

---

### 3.4 Node 4: Profit Auditor (Code) ⚠️ V45.7.4 修復

```
輸入: Receive Dashboard Order (直接讀取 webhook body)
輸出: [{json: auditResults}]  ← 必須是此格式！
```

| 讀取欄位 | 來源 | 用途 |
|----------|------|------|
| `body.Deposit` | Dashboard | 計算實收金額 |
| `body.Balance` | Dashboard | 計算實收金額 |
| `body.Additional_Fee` | Dashboard | 計算實收金額 |
| `body.Order_Items_List` / `body.Items` | Dashboard | 逐品項計算理論售價 |
| `body.Order_ID` | Dashboard | 寫入審計結果 |
| `body.Customer_Name` | Dashboard | 寫入審計結果 |
| `body.Role` | Dashboard | 寫入審計結果 |

| 輸出欄位 | 型別 | 說明 |
|----------|------|------|
| `auditPassed` | Boolean | **關鍵！** 決定是否觸發 Telegram 警報 |
| `theoreticalTotal` | Number | Bible V3.7 理論售價 |
| `actualTotal` | Number | Deposit + Balance + Additional_Fee |
| `discrepancy` | Number | \|理論 - 實收\| |
| `reasons` | Array | 不通過原因列表 |
| `orderId` | String | 訂單編號 |
| `customer` | String | 客人名稱 |
| `role` | String | 操作角色 |

> ⚠️ **V45.7.4 教訓:** 此 node 必須回傳 `[{json: auditResults}]`，不是 `auditResults`。
> 裸物件會導致下游 Switch 收到 `undefined`，永遠觸發警報。

---

### 3.5 Node 5: Auditor Logic Switch (Switch)

```
條件: $json.auditPassed === false (boolean comparison)
Output 0 → Auditor Alert (auditPassed = false)
Output 1 → Fallback/dead end (auditPassed = true, 無連接)
```

> 此為 side-channel，不阻塞主訂單處理流程。

---

### 3.6 Node 6: Auditor Alert (Telegram)

```
輸入: Auditor Logic Switch Output 0
動作: 發送 Telegram 訊息到 Chat ID 7620524971
```

訊息模板:
```
🚨 【財務稽核異常警報】 🚨
單號：{{ $json.orderId }}
原因：稽核未通過！
```

---

### 3.7 Node 7: Parse Items & Generate SKU (Code) ⚠️ V45.7.4 修復

```
輸入: Receive Dashboard Order (直接讀取 webhook body)
輸出: [{json: {...}}, {json: {...}}, ...]  每個商品一個 item
```

| 讀取欄位 | 來源 |
|----------|------|
| `body.Order_ID` | Dashboard |
| `body.Customer_Name` | Dashboard |
| `body.Appointment_Date` | Dashboard |
| `body.Deposit + Balance + Additional_Fee` | Dashboard → 計算 `revenue` |
| `body.Full_Order_Text` | Dashboard |
| `body.Raw_Form_State` | Dashboard |
| `body.Order_Items_List` / `body.Items` | Dashboard 商品陣列 |

**每個商品的讀取欄位:**
| Item 欄位 | 用途 |
|-----------|------|
| `item.Product_Name` | SKU 正規化的輸入 |
| `item.Quantity` | 數量 (影響 SKU 後綴 `{N}飾`) |
| `item.Mode` | 加購/單購模式 (影響 SKU 後綴) |
| `item.Notes` | 刻字備註 |
| `item.Order_Item_Key` | 唯一鍵 (Airtable upsert 用) |

**每個商品的輸出欄位:**
| 輸出欄位 | 型別 | 說明 |
|----------|------|------|
| `Order_ID` | String | 訂單編號 |
| `Customer_Name` | String | 客人名稱 |
| `Appointment_Date` | Date | 預約日期 |
| `Total_Revenue` | Number | 總收入 |
| `Order_Text` | String | 訂單全文 |
| `Raw_Form_State` | String | 表單快照 |
| `Search_SKU` | String | **正規化後的 SKU** (用於 Airtable 查找) |
| `Original_Qty` | Number | 原始數量 |
| `Item_Notes` | String | 刻字備註 |
| `Order_Item_Key` | String | 唯一鍵 |
| `Shipping_Deduction` | Number | 運費扣減 (鎖匙扣 qty>1: (qty-1)×20) |
| `Necklace_Deduction` | Number | 頸鏈扣減 (吊飾: floor(qty/2)×220) |

---

### 3.8 Node 8: Batch SKU Collector (Code)

```
輸入: Parse Items 的所有 items
輸出: 單一物件 {batchFormula, hasItems}
```

| 輸出欄位 | 說明 | 範例 |
|----------|------|------|
| `batchFormula` | Airtable filterByFormula | `OR({Product_Name}='木框套裝 (4肢)',{Product_Name}='嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)')` |
| `hasItems` | 是否有有效商品 | `true` |

---

### 3.9 Node 9–11: Cache 路線 (Read Cache → Smart Cache Strategist → Cache Hit?)

```
Read Cache File: 讀取 .n8n/data/products.json (本地快取)
Smart Cache Strategist: V47.1 起強制 useCache=false (永遠走 Fetch)
Cache Hit?: 已斷開連接 (dead node)，不影響運行
```

> 實際流程: Smart Cache Strategist → 直接到 Fetch Exact Base Cost

---

### 3.10 Node 12: Fetch Exact Base Cost (Airtable READ)

```
操作: Search
表: Product_Database (tblC3HDJAz9W0OF6R)
篩選: batchFormula (動態 OR 公式)
```

| 讀取的 Airtable 欄位 | 用途 |
|----------------------|------|
| `Product_Name` | 匹配 SKU |
| `Total_Base_Cost` | 商品成本 |
| `id` | Airtable Record ID (用於 Product_Link) |

---

### 3.11 Node 13: Local Data Mapper (Code)

```
輸入源1: Fetch Exact Base Cost (成本資料)
輸入源2: Parse Items & Generate SKU (原始商品列表)
輸出: 合併後的商品陣列 (每項附帶成本)
```

| 合併邏輯 | 說明 |
|----------|------|
| `Search_SKU` ↔ `Product_Name` | 用 SKU 匹配成本記錄 |
| 找到匹配 → 附加 `Total_Base_Cost`, `id` | 成本和 Record ID |
| 未找到 → `Total_Base_Cost = 0` | Fallback |

---

### 3.12 Node 14: Calculate Profit & Pack Items (Code)

```
輸入源1: Receive Dashboard Order (直接讀取 Deposit/Balance/Additional_Fee)
輸入源2: Local Data Mapper (商品 + 成本)
輸出: 單一物件 (訂單總覽 + Sub_Items 陣列)
```

| 輸出欄位 | 計算方式 |
|----------|---------|
| `Total_Revenue` | Deposit + Balance + Additional_Fee |
| `Total_Cost` | Σ 所有 items 的 Total_Base_Cost |
| `Final_Profit` | Total_Revenue − Total_Cost |
| `Order_ID` | 直接傳遞 |
| `Customer_Name` | 直接傳遞 |
| `Appointment_Date` | 直接傳遞 |
| `Order_Text` | Full_Order_Text |
| `Raw_Form_State` | 直接傳遞 |
| `Deposit` | 直接傳遞 |
| `Balance` | 直接傳遞 |
| `Additional_Fee` | 直接傳遞 |
| `Sub_Items[]` | 打包的商品陣列 (見下) |

**Sub_Items 每項結構:**
| 欄位 | 來源 |
|------|------|
| `Product_Record_ID` | Fetch Exact Base Cost 的 `id` |
| `Product_Name` | 正規化後的 SKU |
| `Total_Base_Cost` | 商品成本 |
| `Quantity` | Original_Qty |
| `Notes` | Item_Notes |
| `Order_Item_Key` | 唯一鍵 |

---

### 3.13 Node 15: Create Main Order (Airtable WRITE — UPSERT)

```
操作: Upsert
表: Main_Orders (tbltCH0I9fknVCtmV)
匹配鍵: Order_ID
```

**⭐ 關鍵映射 — n8n 欄位 → Airtable 欄位:**

| n8n `$json` 欄位 | → | Airtable Main_Orders 欄位 | 型別 |
|-------------------|---|---------------------------|------|
| `$json.Order_ID` | → | `Order_ID` | String |
| `$json.Customer_Name` | → | `Customer_Name` | String |
| `$json.Deposit` | → | `Deposit` | Number |
| `$json.Balance` | → | `Balance` | Number |
| `$json.Additional_Fee` | → | `Additional_Fee` | Number |
| `$json.Total_Revenue` | → | `Final_Sale_Price` | Number |
| `$json.Total_Cost` | → | `Total_Cost` | Number |
| `$json.Final_Profit` | → | `Net_Profit` | Number |
| `$json.Order_Text` | → | `Full_Order_Text` | Long Text |
| `$json.Raw_Form_State` | → | `Raw_Form_State` | Long Text |
| `$json.Appointment_Date` | → | `Appointment_Date` | Date |

> ⚠️ **注意命名差異：**
> - Dashboard 的 `Deposit + Balance + Additional_Fee` 合計 = n8n 的 `Total_Revenue` = Airtable 的 `Final_Sale_Price`
> - n8n 的 `Final_Profit` = Airtable 的 `Net_Profit`
> - n8n 的 `Order_Text` = Airtable 的 `Full_Order_Text`

---

### 3.14 Node 16: Bind Main Order ID (Code)

```
輸入源1: Create Main Order 的回傳 (含 Airtable Record ID)
輸入源2: Calculate Profit & Pack Items 的 Sub_Items
輸出: 每個 sub item 附帶 Main_Order_ID
```

| 輸出欄位 | 來源 |
|----------|------|
| `Product_ID` | Sub_Items[].Product_Record_ID |
| `Quantity` | Sub_Items[].Quantity |
| `Notes` | Sub_Items[].Notes |
| `Main_Order_ID` | Create Main Order 回傳的 `id` (Airtable Record ID) |
| `Order_Item_Key` | Sub_Items[].Order_Item_Key |

---

### 3.15 Node 17: Create Sub Items (Airtable WRITE — UPSERT)

```
操作: Upsert
表: Order_Items (tbljkptnNcUEyDRFH)
匹配鍵: Order_Item_Key
```

**⭐ 關鍵映射 — n8n 欄位 → Airtable 欄位:**

| n8n `$json` 欄位 | → | Airtable Order_Items 欄位 | 型別 |
|-------------------|---|---------------------------|------|
| `[$json.Product_ID]` | → | `Product_Link` | Linked Record (→ Product_Database) |
| `Number($json.Quantity)` | → | `Quantity` | Number |
| `$json.Notes` | → | `Engraving_Text` | String |
| `[$json.Main_Order_ID]` | → | `Order_Link` | Linked Record (→ Main_Orders) |
| `$json.Order_Item_Key` | → | `Order_Item_Key` | String |

> ⚠️ **注意：** `Product_Link` 和 `Order_Link` 使用 `[recordId]` 陣列格式 (Airtable Linked Record 要求)。

---

### 3.16 Node 18: Pack Telegram Data (Code)

```
輸入: Calculate Profit & Pack Items
輸出: Telegram 訊息所需的欄位
```

| 輸出欄位 | 來源 |
|----------|------|
| `Action` | `calc.Action \|\| 'create'` |
| `Customer_Name` | 直接傳遞 |
| `Order_ID` | 直接傳遞 |
| `Order_Text` | 直接傳遞 |
| `Update_Note` | 直接傳遞 (僅 edit 模式有值) |
| `Total_Revenue` | 直接傳遞 |
| `Total_Cost` | 直接傳遞 |
| `Final_Profit` | 直接傳遞 |

---

### 3.17 Node 19: Send Profit Report (Telegram)

```
Chat ID: 7620524971
```

訊息模板:
```
✅ 【Freehandsss {新訂單/修正訂單} 成功】
👤 客人：{{ $json.Customer_Name }}
📝 單號：{{ $json.Order_ID }}
{{ Update_Note if exists }}
🛍️ 【訂單商品詳情】
{{ $json.Order_Text }}
💰 【財務核算】
總入帳：${{ $json.Total_Revenue }}
總成本：${{ $json.Total_Cost }}
🏆 淨利潤：${{ $json.Final_Profit }}
```

---

### 3.18 DELETE 路線 (Nodes 20–22)

**Node 20: Search Record to Delete (Airtable)**
```
操作: Search
表: Main_Orders (tbltCH0I9fknVCtmV)
篩選: TRIM({Order_ID}) = '{Order_ID}'
輸出: Record ID
```

**Node 21: Delete Record (Airtable)**
```
操作: Delete
表: Main_Orders (tbltCH0I9fknVCtmV)
Record ID: $json.id (from Search)
```

**Node 22: Notify Telegram (Delete)**
```
Chat ID: 7620524971
訊息:
🗑️ 【訂單已徹底刪除】
單號：{{ Search 結果的 Order_ID }}
客人：{{ Search 結果的 Customer_Name }}
```

---

## 4. n8n → Airtable 寫入映射 (完整對照)

### 4.1 Main_Orders 表 (tbltCH0I9fknVCtmV)

| Airtable 欄位名 | 寫入來源 (n8n node) | Dashboard 原始欄位 | 寫入操作 |
|-----------------|--------------------|--------------------|---------|
| `Order_ID` | Create Main Order | `Order_ID` | Upsert Key |
| `Customer_Name` | Create Main Order | `Customer_Name` | Upsert |
| `Deposit` | Create Main Order | `Deposit` | Upsert |
| `Balance` | Create Main Order | `Balance` | Upsert |
| `Additional_Fee` | Create Main Order | `Additional_Fee` | Upsert |
| `Final_Sale_Price` | Create Main Order | `Deposit+Balance+Additional_Fee` (計算) | Upsert |
| `Total_Cost` | Create Main Order | Σ Product_Database.Total_Base_Cost (查找) | Upsert |
| `Net_Profit` | Create Main Order | `Final_Sale_Price − Total_Cost` (計算) | Upsert |
| `Full_Order_Text` | Create Main Order | `Full_Order_Text` | Upsert |
| `Raw_Form_State` | Create Main Order | `Raw_Form_State` (JSON 字串) | Upsert |
| `Appointment_Date` | Create Main Order | `Appointment_Date` | Upsert |

### 4.2 Order_Items 表 (tbljkptnNcUEyDRFH)

| Airtable 欄位名 | 寫入來源 (n8n node) | Dashboard 原始欄位 | 寫入操作 |
|-----------------|--------------------|--------------------|---------|
| `Order_Item_Key` | Create Sub Items | `Order_Item_Key` | Upsert Key |
| `Product_Link` | Create Sub Items | Fetch Exact Base Cost 的 Record ID | Upsert (Linked Record) |
| `Quantity` | Create Sub Items | `Quantity` | Upsert |
| `Engraving_Text` | Create Sub Items | `Notes` | Upsert |
| `Order_Link` | Create Sub Items | Create Main Order 回傳的 Record ID | Upsert (Linked Record) |

### 4.3 Product_Database 表 (tblC3HDJAz9W0OF6R) — 唯讀

| Airtable 欄位名 | 讀取者 (n8n node) | 用途 |
|-----------------|-------------------|------|
| `Product_Name` | Fetch Exact Base Cost | SKU 匹配 |
| `Total_Base_Cost` | Fetch Exact Base Cost | 成本查找 |
| `id` (Record ID) | Fetch Exact Base Cost | Product_Link 連結 |

---

## 5. Airtable → n8n 讀取映射

| Airtable 表 | 讀取 Node | 查詢方式 | 讀取欄位 | 用途 |
|-------------|-----------|---------|----------|------|
| Product_Database | Fetch Exact Base Cost | `filterByFormula` (OR 公式) | Product_Name, Total_Base_Cost, id | SKU→成本映射 |
| Main_Orders | Search Record to Delete | `filterByFormula` (TRIM 比對) | id, Order_ID, Customer_Name | 刪除訂單 |

---

## 6. 完整欄位生命週期表

追蹤一個欄位從 Dashboard 出發，經過 n8n 每個節點，最終寫入 Airtable 的完整路徑。

### `Order_ID` 的生命週期
```
Dashboard (buildPayload)
  → body.Order_ID
    → [Node 2: Input Normalizer] $json.Order_ID
      → [Node 7: Parse Items] Order_ID (per item)
        → [Node 14: Calculate Profit] Order_ID
          → [Node 15: Create Main Order] → Airtable Main_Orders.Order_ID ✅
            → [Node 18: Pack Telegram] Order_ID
              → [Node 19: Send Profit Report] Telegram 訊息 ✅
```

### `Product_Name` → `Search_SKU` → `Product_Link` 的生命週期
```
Dashboard (Order_Items_List[].Product_Name)
  → body.Order_Items_List[].Product_Name (如 "木框款式 (4肢)")
    → [Node 7: Parse Items] SKU 正規化 → Search_SKU (如 "木框套裝 (4肢)")
      → [Node 8: Batch SKU Collector] batchFormula (OR 公式)
        → [Node 12: Fetch Exact Base Cost] filterByFormula 查詢
          → Airtable Product_Database 回傳 id + Total_Base_Cost
            → [Node 13: Local Data Mapper] 合併到原始 item
              → [Node 14: Calculate Profit] Sub_Items[].Product_Record_ID
                → [Node 16: Bind Main Order ID] Product_ID
                  → [Node 17: Create Sub Items] → Airtable Order_Items.Product_Link ✅
```

### `Deposit` → `Total_Revenue` → `Final_Sale_Price` 的生命週期
```
Dashboard (deposit input field)
  → body.Deposit
    → [Node 4: Profit Auditor] actualTotal = Deposit + Balance + Additional_Fee
    → [Node 7: Parse Items] revenue = Deposit + Balance + Additional_Fee
      → [Node 14: Calculate Profit] Total_Revenue
        → [Node 15: Create Main Order] → Airtable Main_Orders.Final_Sale_Price ✅
          → [Node 18: Pack Telegram] Total_Revenue
            → [Node 19: Telegram] "總入帳：$X" ✅
```

### 成本 (`Total_Base_Cost`) → `Total_Cost` → `Net_Profit` 的生命週期
```
Airtable Product_Database.Total_Base_Cost (每 SKU 的成本)
  → [Node 12: Fetch Exact Base Cost] 讀取
    → [Node 13: Local Data Mapper] 附加到每個 item
      → [Node 14: Calculate Profit] totalBaseCost = Σ Total_Base_Cost
        → Total_Cost = totalBaseCost
        → Final_Profit = Total_Revenue − Total_Cost
          → [Node 15: Create Main Order] → Airtable Main_Orders.Total_Cost ✅
          → [Node 15: Create Main Order] → Airtable Main_Orders.Net_Profit ✅
            → [Node 18: Pack Telegram] Total_Cost, Final_Profit
              → [Node 19: Telegram] "總成本：$X / 淨利潤：$X" ✅
```

---

## 7. SKU 轉換對照表

### Dashboard → n8n Parse Items → Airtable Product_Database

| Dashboard `Product_Name` | Parse Items 正規化後 `Search_SKU` | Airtable `Product_Name` (exact match) |
|--------------------------|-----------------------------------|---------------------------------------|
| `木框套裝 (4肢)` | `木框套裝 (4肢)` | `木框套裝 (4肢)` ✅ |
| `木框套裝 (2肢)` | `木框套裝 (2肢)` | `木框套裝 (2肢)` ✅ |
| `木框款式 (4肢)` | `木框套裝 (4肢)` | `木框套裝 (4肢)` ✅ |
| `木框款式 (3肢)` | `木框套裝 (4肢)` | `木框套裝 (4肢)` ✅ (3肢→4肢) |
| `立體擺設(木框) (2肢)` | `木框套裝 (2肢)` | `木框套裝 (2肢)` ✅ |
| `玻璃瓶套裝 (4肢)` | `玻璃瓶套裝 (4肢)` | `玻璃瓶套裝 (4肢)` ✅ |
| `玻璃瓶款式 (2肢)` | `玻璃瓶套裝 (2肢)` | `玻璃瓶套裝 (2肢)` ✅ |
| `嬰兒鎖匙扣 - 不銹鋼` + Mode `(加購)` + Qty 1 | `嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)` | `嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)` ✅ |
| `嬰兒鎖匙扣 - 不銹鋼` + Mode `(單購)` + Qty 2 | `嬰兒鎖匙扣 - 不銹鋼 - 2飾 (單購)` | `嬰兒鎖匙扣 - 不銹鋼 - 2飾 (單購)` ✅ |
| `嬰兒吊飾 - 925銀` + Mode `(加購)` + Qty 1 | `嬰兒吊飾 - 925銀 - 1飾 (加購)` | `嬰兒吊飾 - 925銀 - 1飾 (加購)` ✅ |
| `嬰兒吊飾 - 925金` + Mode `(加購)` + Qty 1 | `嬰兒吊飾 - 925金 - 1飾 (加購)` | `嬰兒吊飾 - 925金 - 1飾 (加購)` ✅ |

### 正規化規則摘要

```
Rule 1: includes("木框")     → sku = "木框套裝 (N肢)"     // N = 4肢 if 3肢 or 4肢, else 2肢
Rule 2: includes("玻璃瓶")   → sku = "玻璃瓶套裝 (N肢)"   // 同上
Rule 3: includes("鎖匙扣") + Mode → sku = "{sku} - {qty}飾 {mode}"
Rule 4: includes("吊飾") + Mode   → sku = "{sku} - {qty}飾 {mode}"
```

---

## 8. Telegram 輸出欄位

| 通知類型 | 觸發節點 | Chat ID | 使用的欄位 |
|---------|---------|---------|-----------|
| 財務稽核警報 🚨 | Auditor Alert | 7620524971 | orderId |
| 新訂單/修改通知 ✅ | Send Profit Report | 7620524971 | Customer_Name, Order_ID, Order_Text, Update_Note, Total_Revenue, Total_Cost, Final_Profit |
| 刪除通知 🗑️ | Notify Telegram (Delete) | 7620524971 | Order_ID, Customer_Name (from Search) |

---

## 9. 快速查找索引

**「我要改某個欄位，應該改哪個 node？」**

| 我想改... | 去找這個 Node | 原因 |
|-----------|--------------|------|
| SKU 匹配邏輯 | Parse Items & Generate SKU | SKU 正規化在這裡 |
| 售價審計邏輯 | Profit Auditor | Bible V3.7 定價表在這裡 |
| 成本來源 | Fetch Exact Base Cost | Airtable Product_Database 查詢 |
| 成本映射邏輯 | Local Data Mapper | SKU↔Cost 合併 |
| 利潤計算 | Calculate Profit & Pack Items | Revenue − Cost |
| Airtable 主訂單欄位 | Create Main Order | 欄位映射在 node parameters |
| Airtable 細項欄位 | Create Sub Items | 欄位映射在 node parameters |
| Telegram 訊息格式 | Send Profit Report / Auditor Alert | 訊息模板 |
| 刪除邏輯 | Search Record to Delete → Delete Record | DELETE 路線 |
| Webhook 欄位正規化 | Input Normalizer | action 欄位處理 |
| 快取策略 | Smart Cache Strategist | 目前強制 useCache=false |

**「Airtable 某個欄位值不對，是哪裡出了問題？」**

| Airtable 欄位 | 可能的問題節點 | 檢查方向 |
|---------------|--------------|---------|
| `Total_Cost = 0` | Parse Items / Fetch Exact Base Cost / Local Data Mapper | SKU 正規化失敗 → filterByFormula 查不到 |
| `Net_Profit = Revenue` | 同上 (Total_Cost=0 導致) | 同上 |
| `Final_Sale_Price` 不對 | Calculate Profit & Pack Items | Deposit/Balance/Additional_Fee 計算 |
| `Product_Link` 空白 | Fetch Exact Base Cost / Bind Main Order ID | Product_Database 無匹配 SKU |
| `Order_Link` 空白 | Create Main Order / Bind Main Order ID | Main Order 建立失敗 |
| `Engraving_Text` 空白 | Parse Items (Item_Notes) | Dashboard Notes 欄位未傳送 |

---

## 10. Airtable 表結構速查

### Main_Orders (tbltCH0I9fknVCtmV)
```
Order_ID          (String, Upsert Key)
Customer_Name     (String)
Appointment_Date  (Date)
Deposit           (Number)
Balance           (Number)
Additional_Fee    (Number)
Final_Sale_Price  (Number = Deposit + Balance + Additional_Fee)
Total_Cost        (Number = Σ Product_Database.Total_Base_Cost)
Net_Profit        (Number = Final_Sale_Price − Total_Cost)
Full_Order_Text   (Long Text)
Raw_Form_State    (Long Text, JSON)
```

### Order_Items (tbljkptnNcUEyDRFH)
```
Order_Item_Key    (String, Upsert Key)
Product_Link      (Linked Record → Product_Database)
Quantity          (Number)
Engraving_Text    (String)
Order_Link        (Linked Record → Main_Orders)
```

### Product_Database (tblC3HDJAz9W0OF6R) — 唯讀
```
Product_Name      (String, SKU 唯一鍵)
Total_Base_Cost   (Number)
id                (Record ID, 用於 Linked Record)
```

---

*文件撰寫：Claude (2026-03-26)*
*供 Claude / Antigravity / Cursor / Fat Mo 在修改系統時確認三端對齊*

---

## 10. MCP Agent Handoff Schema v1.0

> **新增日期:** 2026-03-27
> **用途:** Perplexity → Claude Code → Gemini 三段 AI pipeline 的標準交接格式

### Phase 1→2 (Perplexity → Claude Code)

```json
{
  "target_file": "freehandsss_dashboardV36.html",
  "change_type": "feature",
  "spec": [
    "具體變更描述1 (max 100字)",
    "具體變更描述2"
  ],
  "constraints": [
    "保持現有UI框架",
    "UTF-8 Windows curl compatible",
    "不改 business logic"
  ],
  "test_criteria": [
    "載入時間 <2s",
    "合規檢查通過",
    "無 console error"
  ]
}
```

> `change_type` 允許值：`feature` / `bugfix` / `refactor` / `compliance`

### Phase 2→3 (Claude Code → Gemini)

```json
{
  "commit_message": "feat: [方案ID] dashboard優化",
  "n8n_workflow_trigger": {
    "webhook_url": "https://yanhei.synology.me:8443/webhook/fhs-deploy",
    "payload": {
      "action": "deploy_staging",
      "repo": "freehandsss",
      "credentials": "windows_curl_utf8_fix_applied"
    }
  },
  "rollback_plan": "git revert HEAD if error_rate>5%",
  "monitoring_endpoints": [
    "https://yanhei.synology.me:8443/api/v1/executions?workflowId=6Ljih0hSKr9RpYNm&limit=5",
    "https://yanhei.synology.me:8443/api/v1/workflows/6Ljih0hSKr9RpYNm"
  ]
}
```

### 監控 + 回滾流程

1. Deploy 後 5min 查 metrics
2. `error_rate > 5%` → n8n rollback + Slack `@edwin`
3. 回報頻道：`#freehandsss-ops`
