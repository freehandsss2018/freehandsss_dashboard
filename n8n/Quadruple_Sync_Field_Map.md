# Quadruple Sync Field Map
**Version**: v1.0
**Created**: 2026-05-10 (Phase 0 盤點，升級自 Triple_Sync 概念)
**四端**: Airtable ↔ n8n ↔ Dashboard ↔ Supabase

> 本文件記錄 FHS 四端系統中每個核心欄位的「寫入方」「讀取方」「同步方向」與「真理來源」。
> 任何改動此對應關係的操作，必須先更新本文件。

---

## 核心原則

| 原則 | 內容 |
|------|------|
| **前端利潤真理** | `final_sale_price` 由 Dashboard 寫入，其餘三端只讀，n8n 禁止重算 |
| **n8n 計算職責** | 所有成本 / 利潤欄位由 n8n 計算後同時寫入 Airtable + Supabase |
| **Supabase 角色** | 高效能查詢層 + 數據備份；Airtable 為日常操作介面（永久共存） |
| **Raw_Form_State 不可侵犯** | 只由 Dashboard 寫入，n8n / Supabase 只讀，禁止修改 |
| **SKU 前置正規化** | 所有 SKU 必須先過 `Parse Items & Generate SKU` node 才能入庫 |

---

## 主訂單欄位映射（orders / Main_Orders）

| 欄位 | Airtable | n8n 動作 | Dashboard | Supabase | 真理來源 |
|-----|---------|---------|-----------|---------|---------|
| `order_id` | Main_Orders.Order_ID | 讀取 / 傳遞 | 生成 + 寫入 | `orders.order_id` (VARCHAR UNIQUE) | **Dashboard** |
| `final_sale_price` | Main_Orders.Final_Sale_Price | 讀取（不重算） | 計算 + 寫入 | `orders.final_sale_price NOT NULL` | **Dashboard** ⚠️ 禁止觸發重算 |
| `total_cost` | Main_Orders.Total_Cost | 計算 + 寫入 | 讀取顯示 | `orders.total_cost` | **n8n** |
| `handmodel_cost` | Main_Orders.Handmodel_Cost (rollup) | 計算 + 寫入 | 讀取顯示 | `orders.handmodel_cost` | **n8n** |
| `keychain_cost` | Main_Orders.Keychain_Cost (rollup) | 計算 + 寫入 | 讀取顯示 | `orders.keychain_cost` | **n8n** |
| `necklace_cost` | Main_Orders.Necklace_Cost (rollup) | 計算 + 寫入 | 讀取顯示 | `orders.necklace_cost` | **n8n** |
| `net_profit` | Main_Orders.Net_Profit | 計算 + 寫入 | 讀取顯示 | `orders.net_profit` | **n8n** |
| `raw_form_state` | Main_Orders.Raw_Form_State | 讀取（不修改） | 序列化 + 寫入 | `orders.raw_form_state JSONB` | **Dashboard** ⛔ 不可刪除 |
| `customer_name` | Main_Orders.Customer_Name | 讀取 / 傳遞 | 輸入 + 寫入 | `orders.customer_name` | Dashboard |
| `process_status` | Main_Orders.Process_Status | 讀取 / 寫入 | 讀取顯示 | `orders.process_status` | Airtable / n8n |
| `batch_number` | Main_Orders.Batch_Number | 讀取 / 寫入 | 讀取顯示 | `orders.batch_number` | n8n |
| `confirmed_at` | Main_Orders.Order_Confirm_Date | 傳遞 | 輸入 | `orders.confirmed_at DATE` | Dashboard |
| `appointment_at` | Main_Orders.Appointment_Date | 傳遞 | 輸入 | `orders.appointment_at DATE` | Dashboard |
| `deposit` | Main_Orders.Deposit | 傳遞 | 輸入 | `orders.deposit NUMERIC` | Dashboard |
| `balance` | Main_Orders.Balance | 傳遞 | 輸入 | `orders.balance NUMERIC` | Dashboard |
| `adjustment_amount` | Main_Orders.Adjustment_Amount | 傳遞 | 輸入 | `orders.adjustment_amount NUMERIC` | Dashboard |
| `additional_fee` | Main_Orders.Additional_Fee | 傳遞 | 輸入 | `orders.additional_fee NUMERIC` | Dashboard |
| `admin_notes` | Main_Orders.Admin_Notes | 不涉及 | 讀取顯示 | `orders.admin_notes TEXT` | Airtable |
| `full_order_text` | Main_Orders.Full_Order_Text | 傳遞 | 生成 + 寫入 | `orders.full_order_text TEXT` | Dashboard |

---

## 子訂單欄位映射（order_items / Order_Items）

| 欄位 | Airtable | n8n 動作 | Dashboard | Supabase | 真理來源 |
|-----|---------|---------|-----------|---------|---------|
| `item_key` | Order_Items.Order_Item_Key | 寫入（Upsert key） | 生成 | `order_items.item_key VARCHAR UNIQUE` | **Dashboard + n8n** |
| `order_id` (FK) | Order_Items.Order_Link | 關聯 Airtable record | — | `order_items.order_fhs_id VARCHAR(20)` ⚠️ | n8n |
| `sku` | via Product_Link | 正規化後寫入 | 選擇 | `order_items.sku → products.sku` | n8n（正規化） |
| `quantity` | Order_Items.Quantity | 寫入 | 輸入 | `order_items.quantity INTEGER` | Dashboard |
| `item_base_cost` | Order_Items.Item_BaseCost (lookup) | 計算 + 寫入 | 讀取 | `order_items.item_base_cost NUMERIC` | **n8n** |
| `subtotal_cost` | Order_Items.Subtotal Cost (formula) | 計算 + 寫入 | 讀取 | `order_items.subtotal_cost NUMERIC` | **n8n** |
| `handmodel_cost` | Order_Items.Handmodel_Cost (formula) | 計算 + 寫入 | — | `order_items.handmodel_cost NUMERIC` | **n8n** |
| `keychain_cost` | Order_Items.Keychain_Cost (formula) | 計算 + 寫入 | — | `order_items.keychain_cost NUMERIC` | **n8n** |
| `necklace_cost` | Order_Items.Necklace_Cost (formula) | 計算 + 寫入 | — | `order_items.necklace_cost NUMERIC` | **n8n** |
| `engraving_text` | Order_Items.Engraving_Text | 寫入 | 輸入 | `order_items.engraving_text TEXT` | Dashboard |
| `specification` | Order_Items.Specification | 寫入 | 輸入 | `order_items.specification TEXT` | Dashboard |
| `process_status` | Order_Items.Process_Status | 讀取 / 寫入 | 讀取 | `order_items.process_status` | Airtable |
| `batch_number` | Order_Items.Batch_Number | 寫入 | — | `order_items.batch_number` ⚠️ 冗餘，暫保留 | n8n |

> ⚠️ **FK 設計注意**（database-reviewer Issue #3）：
> Supabase `order_items` 的 FK 需使用 `order_fhs_id VARCHAR(20)` 指向 `orders.order_id`，
> 而非 UUID，以便 n8n 直接寫入而無需先查 UUID。
> SQL: `FOREIGN KEY (order_fhs_id) REFERENCES orders(order_id) ON DELETE CASCADE`

---

## 產品庫欄位映射（products / Product_Database）

| 欄位 | Airtable | n8n 動作 | Dashboard | Supabase | 真理來源 |
|-----|---------|---------|-----------|---------|---------|
| `sku` | Product_Database.Product_Name | 正規化比對 | 選擇 | `products.sku UNIQUE NOT NULL` | **Airtable**（唯一 SKU 表） |
| `main_category` | Product_Database.Main_Category | 讀取 | 顯示 | `products.main_category` | Airtable |
| `total_base_cost` | Product_Database.Total_Base_Cost (formula) | 讀取用於計算 | — | `products.total_base_cost NUMERIC` | n8n 維護 |
| `cost_config_id` | via Linked_Base_Cost | — | — | `products.cost_config_id UUID → cost_configurations(id) ON DELETE SET NULL` | Airtable |

---

## 成本配置欄位映射（cost_configurations / Base_Costs）

| 欄位 | Airtable | Supabase | 真理來源 |
|-----|---------|---------|---------|
| `config_name` | Base_Costs.Linked_Base_Cost | `cost_configurations.config_name UNIQUE` | Airtable |
| `drawing_cost` | Base_Costs.Drawing_Cost | `drawing_cost NUMERIC` | Airtable（人工維護） |
| `printing_cost` | Base_Costs.Printing_Cost | `printing_cost NUMERIC` | Airtable |
| `clasp_cost` | Base_Costs.Clasp_Cost | `clasp_cost NUMERIC` | Airtable |
| `shipping_cost` | Base_Costs.Shipping_Cost | `shipping_cost NUMERIC` | Airtable |

> 📌 成本配置變動低頻（廠商調價時才改），由人工在 Airtable 更新後同步至 Supabase。

---

## 同步觸發規則

| 觸發事件 | 寫入方向 | n8n 節點 | 備注 |
|---------|---------|---------|------|
| 新訂單 / 改單（Dashboard 提交） | Dashboard → Airtable + Supabase | `Create Main Order` + Mirror | 雙寫並行 |
| 新子項目 | Dashboard → Airtable + Supabase | `Create Sub Items` + Mirror | Upsert by item_key |
| 刪單 | Dashboard → Airtable + Supabase | `Delete Record` + Mirror | Supabase 建議軟刪 |
| 成本更新 | Airtable 人工 → Supabase | 定期同步腳本 | 低頻，不需即時 |
| 狀態更新 | Airtable → Supabase | 定期同步 or Webhook | 非核心財務欄位，容忍 30s 延遲 |
| Error Log | n8n Error Trigger → Airtable + Supabase | Error Monitor Workflow | 僅 INSERT，30 天 TTL |

---

## 同步健康指標（Phase 2 監控目標）

| 指標 | 目標值 | 監控方式 |
|------|-------|---------|
| 訂單雙寫延遲（訂單類） | < 10s | `sync_audit_quadruple.js` |
| 子項目雙寫延遲 | < 10s | 同上 |
| 成本配置同步延遲 | < 60s | 定期腳本 |
| 狀態欄位同步延遲 | < 60s | 可接受 |
| 雙寫差異告警 | 0（即時通知） | Telegram Bot |
| Supabase Free Tier 用量 | < 400 MB / 1.5 GB 頻寬 | Supabase Dashboard |

---

## ⚠️ 已知問題待解（Phase 1 修正）

來源：database-reviewer 稽核 (2026-05-10)

| 優先級 | 問題 | 修正方向 |
|-------|------|---------|
| P0 | `final_sale_price` 允許 NULL | 改為 `NOT NULL DEFAULT 0` |
| P0 | `order_items` FK 用 UUID 但 n8n 寫 VARCHAR order_id | 改用 `order_fhs_id VARCHAR(20)` FK |
| P1 | `process_status` 無強制約束 | 改為 ENUM 或 CHECK constraint |
| P1 | 缺少 `idx_orders_customer_name` 索引 | 新增 text_pattern_ops 索引 |
| P2 | `cost_configurations` 缺 `ON DELETE SET NULL` | 在 products FK 加上 |
| P2 | `sales_pipeline` 無 Upsert key | 新增 `pipeline_key VARCHAR UNIQUE` |
| P3 | `batch_number` 在 order_items 冗餘 | 文件化為刻意 denormalization 或移除 |
