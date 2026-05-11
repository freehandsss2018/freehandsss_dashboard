# Airtable Schema Snapshot
**Base**: app9GuLsW9frN4xaT
**Captured**: 2026-05-10 (via Airtable MCP, Phase 0 盤點)
**Table Count**: 6（實際）— 注意：Phase 0 前估計為 9，已修正

---

## 表一：Main_Orders (tbltCH0I9fknVCtmV)
**用途**：主訂單總表（核心樞紐）

| 欄位 ID | 欄位名稱 | 類型 | 說明 | Postgres 對應 |
|--------|---------|------|------|--------------|
| fldiTH9iGQpa7Xqau | Order_ID | singleLineText (PK) | FHS-XXXXX 格式，Dashboard 自動生成 | `order_id VARCHAR(20) UNIQUE NOT NULL` |
| fld4K63GzLWyW1y8a | Order_Confirm_Date | date | 訂單確認日期 | `confirmed_at DATE` |
| fldCxe9RM62FswD9G | Customer_Name | singleLineText | 客戶名稱 | `customer_name TEXT` |
| fldEJXnuXW5kgEgb0 | Appointment_Date | date | 取模日期 | `appointment_at DATE` |
| fldOcwzixJhIJ4e8Z | Deposit | number | 訂金 | `deposit NUMERIC(10,2)` |
| fldWCGqC19L143JZ6 | Balance | number | 尾款 | `balance NUMERIC(10,2)` |
| fldzxW4s1v36aJxZx | Additional_Fee | number | 附加費用 | `additional_fee NUMERIC(10,2) DEFAULT 0` |
| flda3qPXJVIug3714 | Adjustment_Amount | number | 改單差額（正/負） | `adjustment_amount NUMERIC(10,2) DEFAULT 0` |
| flduMLKYerq5aswNf | Final_Sale_Price | currency | 最終售價（前端傳入，不重算） | `final_sale_price NUMERIC(10,2)` ⚠️ 前端利潤真理守護 |
| fldK2rNdLS5O92suA | Total_Cost | currency | 總成本（n8n 計算寫入） | `total_cost NUMERIC(10,2)` |
| fldnNDzUvWy2mNCX9 | Handmodel_Cost | rollup | 手模成本（rollup from Order_Items） | `handmodel_cost NUMERIC(10,2)` — n8n 寫入 |
| flda10EwN6V6ecKi1 | Keychain_Cost | rollup | 鎖匙扣成本 | `keychain_cost NUMERIC(10,2)` — n8n 寫入 |
| fldm4GXOs5dwryOZt | Necklace_Cost | rollup | 頸鏈成本 | `necklace_cost NUMERIC(10,2)` — n8n 寫入 |
| flduPsfxg751GsJuk | Net_Profit | currency | 淨利潤（公式：Final_Sale_Price - Total_Cost） | `net_profit NUMERIC(10,2)` — n8n 計算後寫入 |
| flduvsrjsiENZf6PB | Full_Order_Text | multilineText | 完整 IG 訂單備份 | `full_order_text TEXT` |
| fldUA7Um14KkPR3rC | Order_Items | multipleRecordLinks | 關聯子項目 | FK 關係（不存欄位） |
| fld95XfD22Df4tedt | Batch_Number | singleLineText | 批次號 | `batch_number VARCHAR(50)` |
| fldsUWtDIEkvs4yjD | Admin_Notes | multilineText | 管理員備註 | `admin_notes TEXT` |
| fldcQcD39ze3atJUl | Process_Status | singleSelect | 訂單狀態 | `process_status VARCHAR(50)` + CHECK constraint |
| fldInv1bd9BSxpCVE | Raw_Form_State | multilineText | ⚠️ 系統還原用，**禁止刪除** | `raw_form_state JSONB NOT NULL` ⛔ 不可移除 |

**Postgres DDL 草稿**:
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(20) UNIQUE NOT NULL,           -- FHS-XXXXX
  confirmed_at DATE,
  customer_name TEXT,
  appointment_at DATE,
  deposit NUMERIC(10,2) DEFAULT 0,
  balance NUMERIC(10,2) DEFAULT 0,
  additional_fee NUMERIC(10,2) DEFAULT 0,
  adjustment_amount NUMERIC(10,2) DEFAULT 0,
  final_sale_price NUMERIC(10,2),                 -- 前端傳入，禁止 trigger 重算
  total_cost NUMERIC(10,2),
  handmodel_cost NUMERIC(10,2),
  keychain_cost NUMERIC(10,2),
  necklace_cost NUMERIC(10,2),
  net_profit NUMERIC(10,2),                       -- n8n 計算後寫入
  full_order_text TEXT,
  batch_number VARCHAR(50),
  admin_notes TEXT,
  process_status VARCHAR(50),
  raw_form_state JSONB NOT NULL DEFAULT '{}',     -- 不可移除！
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_confirmed_at ON orders(confirmed_at);
CREATE INDEX idx_orders_process_status ON orders(process_status);
```

---

## 表二：Order_Items (tbljkptnNcUEyDRFH)
**用途**：子訂單 / 商品明細表

| 欄位名稱 | 類型 | Postgres 對應 |
|---------|------|--------------|
| Order_Item_ID | autoNumber | `id UUID PK` |
| Order_Item_Key | singleLineText (UNIQUE) | `item_key VARCHAR(100) UNIQUE` — Upsert 依據 |
| Item_ID | formula | `item_id GENERATED ALWAYS AS (...) STORED` |
| Order_Link | multipleRecordLinks → Main_Orders | `order_id UUID REFERENCES orders(id) ON DELETE CASCADE` |
| Product_Link | multipleRecordLinks → Product_Database | `product_id UUID REFERENCES products(id)` |
| Item_Category | multipleLookupValues | `item_category TEXT` — n8n denormalize 寫入 |
| Quantity | number | `quantity INTEGER NOT NULL DEFAULT 1` |
| Item_BaseCost | multipleLookupValues | `item_base_cost NUMERIC(10,2)` — n8n 計算寫入 |
| Engraving_Text | singleLineText | `engraving_text TEXT` |
| Specification | multilineText | `specification TEXT` |
| Process_Status | singleSelect | `process_status VARCHAR(50)` |
| Handmodel_Cost | formula | `handmodel_cost NUMERIC(10,2)` — n8n 寫入 |
| Keychain_Cost | formula | `keychain_cost NUMERIC(10,2)` — n8n 寫入 |
| Necklace_Cost | formula | `necklace_cost NUMERIC(10,2)` — n8n 寫入 |
| Reference_Image | multipleAttachments | `reference_image_url TEXT[]` — Supabase Storage URL |
| AI_Engraving_Suggestion | aiText | `ai_suggestion TEXT` |
| Subtotal Cost | formula | `subtotal_cost NUMERIC(10,2)` — n8n 計算寫入 |
| Batch_Number | singleLineText | `batch_number VARCHAR(50)` |

**Postgres DDL 草稿**:
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key VARCHAR(100) UNIQUE NOT NULL,          -- Upsert key
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  item_category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_base_cost NUMERIC(10,2),
  engraving_text TEXT,
  specification TEXT,
  process_status VARCHAR(50),
  handmodel_cost NUMERIC(10,2),
  keychain_cost NUMERIC(10,2),
  necklace_cost NUMERIC(10,2),
  subtotal_cost NUMERIC(10,2),
  reference_image_url TEXT[],
  ai_suggestion TEXT,
  batch_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_key ON order_items(item_key);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

---

## 表三：Product_Database (tblC3HDJAz9W0OF6R)
**用途**：產品 SKU 總表（104 個精準 SKU）

| 欄位名稱 | 類型 | Postgres 對應 |
|---------|------|--------------|
| Product_Name | singleLineText (PK) | `sku VARCHAR(200) UNIQUE NOT NULL` — n8n 比對關鍵 |
| Main_Category | singleSelect | `main_category VARCHAR(100)` |
| Target_Object | singleSelect | `target_object VARCHAR(100)` |
| Material | singleSelect | `material VARCHAR(100)` |
| Mode | singleSelect | `mode VARCHAR(50)` |
| Item_Per_Set | number | `item_per_set INTEGER DEFAULT 1` |
| Total_Base_Cost | formula | `total_base_cost NUMERIC(10,2)` — 由 n8n 計算 |
| 🔗 Linked_Base_Cost | multipleRecordLinks → Base_Costs | `cost_config_id UUID REFERENCES cost_configurations(id)` |
| 🔍 Drawing_Cost | multipleLookupValues | (來自 cost_configurations，不單獨存) |
| 🔍 Printing_Cost | multipleLookupValues | (來自 cost_configurations，不單獨存) |
| 🔍 Clasp_Cost | multipleLookupValues | (來自 cost_configurations，不單獨存) |
| 🔍 Shipping_Cost | multipleLookupValues | (來自 cost_configurations，不單獨存) |
| Suggested_Price_Manual | currency | `suggested_price NUMERIC(10,2)` |
| Markup_Factor | number | `markup_factor NUMERIC(5,2) DEFAULT 2.5` |

**Postgres DDL 草稿**:
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(200) UNIQUE NOT NULL,               -- n8n SKU 比對關鍵，禁止輕易修改
  main_category VARCHAR(100),
  target_object VARCHAR(100),
  material VARCHAR(100),
  mode VARCHAR(50),
  item_per_set INTEGER DEFAULT 1,
  total_base_cost NUMERIC(10,2),
  cost_config_id UUID REFERENCES cost_configurations(id),
  suggested_price NUMERIC(10,2),
  markup_factor NUMERIC(5,2) DEFAULT 2.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_main_category ON products(main_category);
```

---

## 表四：Base_Costs (tbl6jzLkzU9WcSoKH)
**用途**：最底層基礎成本控制台

| 欄位名稱 | 類型 | Postgres 對應 |
|---------|------|--------------|
| 🔗 Linked_Base_Cost | singleLineText (PK) | `config_name VARCHAR(100) UNIQUE NOT NULL` |
| 🔍 Drawing_Cost | currency | `drawing_cost NUMERIC(10,2)` |
| 🔍 Printing_Cost | currency | `printing_cost NUMERIC(10,2)` |
| 🔍 Clasp_Cost | currency | `clasp_cost NUMERIC(10,2)` |
| 🔍 Shipping_Cost | currency | `shipping_cost NUMERIC(10,2)` |

**Postgres DDL 草稿**:
```sql
CREATE TABLE cost_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name VARCHAR(100) UNIQUE NOT NULL,
  drawing_cost NUMERIC(10,2) DEFAULT 0,
  printing_cost NUMERIC(10,2) DEFAULT 0,
  clasp_cost NUMERIC(10,2) DEFAULT 0,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 表五：Sales_Pipeline (tbldEfrN6EL2y3tUA)
**用途**：銷售漏斗追蹤（前線接洽）

| 欄位名稱 | 類型 | Postgres 對應 |
|---------|------|--------------|
| Customer_Name | singleLineText | `customer_name TEXT` |
| Stage | singleSelect | `stage VARCHAR(50)` |
| Order_Type | singleSelect | `order_type VARCHAR(50)` |
| Source | singleSelect | `source VARCHAR(50)` |
| Query_Items_Details | singleLineText | `query_details TEXT` |
| Estimated_Amount | number | `estimated_amount NUMERIC(10,2)` |
| AI_Next_Step | aiText | `ai_next_step TEXT` |
| Raw_Message | multilineText | `raw_message TEXT` |
| AI_Status | singleSelect | `ai_status VARCHAR(50)` |

```sql
CREATE TABLE sales_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  stage VARCHAR(50),
  order_type VARCHAR(50),
  source VARCHAR(50),
  query_details TEXT,
  estimated_amount NUMERIC(10,2),
  ai_next_step TEXT,
  raw_message TEXT,
  ai_status VARCHAR(50) DEFAULT '待處理',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 表六：Error_Logs (tblLeQv831Oc2hgNt)
**用途**：系統監控 / n8n 錯誤自動推播

| 欄位名稱 | 類型 | Postgres 對應 |
|---------|------|--------------|
| Time | singleLineText | `occurred_at TIMESTAMPTZ` |
| Workflow_Name | singleLineText | `workflow_name TEXT` |
| Error_Message | multilineText | `error_message TEXT` |
| Node | singleLineText | `node_name TEXT` |

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL,
  workflow_name TEXT,
  error_message TEXT,
  node_name TEXT
);
CREATE INDEX idx_error_logs_occurred_at ON error_logs(occurred_at DESC);
-- append-only，建議 TTL: 30 天後自動清除（pg_cron 或 Supabase scheduled function）
```

---

## 關鍵發現 ⚠️

1. **表數量修正**：實際 6 張表（Main_Orders / Order_Items / Product_Database / Base_Costs / Sales_Pipeline / Error_Logs），Phase 0 前估計 9 張 → **已更正**
2. **無 Triple_Sync 表**：Triple_Sync 是系統概念（Airtable ↔ n8n ↔ Dashboard），非實體 Airtable 表。Supabase 加入後升為 Quadruple_Sync 概念
3. **無 Profit_Audit 表**：利潤稽核透過 n8n `Profit Auditor` code node + Telegram 告警完成，非 Airtable 表
4. **rollup/formula 欄位**：Handmodel_Cost / Keychain_Cost / Necklace_Cost 在 Airtable 為 rollup，在 Supabase 改為 n8n 直接寫入數值（禁用 generated column 取代）
5. **Raw_Form_State 已確認存在**：`fldInv1bd9BSxpCVE`，AGENTS.md 硬規則守護，Supabase 對應 `raw_form_state JSONB NOT NULL`
