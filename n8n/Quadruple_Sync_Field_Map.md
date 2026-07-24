# Quadruple Sync Field Map

**Version**: v2.0
**Created**: 2026-05-10 (Phase 0 盤點，升級自 Triple_Sync 概念)
**Updated**: 2026-07-25（S189財務文件全面審查大改版——本文件2.5個月零更新，核心架構假設「Airtable過渡期SSoT」已被D43(2026-07-22~23)推翻，「n8n內部計算規則」整段描述嘅「Node 14 – Cost Calculator」節點自V47.4起已不存在，現行節點鏈完全改寫；新增order_items 4個V2欄位；已知問題表核對實際狀態）
**四端**: Airtable ↔ n8n ↔ Dashboard ↔ Supabase

> 本文件記錄 FHS 四端系統中每個核心欄位的「寫入方」「讀取方」「同步方向」與「真理來源」。
> 任何改動此對應關係的操作，必須先更新本文件。
> ⚠️ **v2.0 讀者須知**：本文件v1.1版本（2026-05-13）核心假設「Airtable過渡期SSoT」已於D43大幅剝離Airtable依賴後推翻；「n8n內部計算規則」章節描述嘅節點名/版本已對唔上現行V47.22——如果你係憑歷史記憶對照本文件，請以本次v2.0改版為準，唔好假設v1.1嘅框架仍然生效。

---

## 核心原則（v2.0 更新）

| 原則 | 內容 |
|------|------|
| **前端利潤真理** | `final_sale_price` 由 Dashboard 寫入，其餘三端只讀，n8n 禁止重算 |
| **n8n 計算職責** | 所有成本 / 利潤欄位由 n8n 計算後優先確保 Supabase 寫入，Airtable 作為同步備援 |
| **Supabase 角色** | **主導數據核心 (Primary Core)**，D43(2026-07-22~23)後確立——負責所有數據讀取、修改與新增；Airtable 為歷史備援（非過渡期，係長期定位） |
| **SKU 真源** | Supabase `products` 表（人工/migration 直接維護）——S189 Phase1（migration 0073）已示範16個V2 SKU直接寫入Supabase，完全無經Airtable，證明Airtable唔再係SKU嘅必經路徑；Airtable僅供舊SKU歷史對照 |
| **Raw_Form_State 不可侵犯** | 只由 Dashboard 寫入，n8n / Supabase 只讀，禁止修改 |
| **SKU 前置正規化** | 所有 SKU 必須先過 `Parse Items & Generate SKU` node 才能入庫（V47.13起含isV2Sku guard，V2格式SKU跳過舊式後綴邏輯） |

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
| `accessory_cost` | — (Airtable已剝離停用，D43) | 計算 + 寫入 | 讀取顯示 | `orders.accessory_cost` | **n8n**（migration 0079/0080，cl-flow 2026-07-25-0148） |
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
| `accessory_cost` | — (Airtable已剝離停用，D43) | 計算 + 寫入 | — | `order_items.accessory_cost NUMERIC` | **n8n**（migration 0079/0080，cl-flow 2026-07-25-0148） |
| `engraving_text` | Order_Items.Engraving_Text | 寫入 | 輸入 | `order_items.engraving_text TEXT` | Dashboard |
| `specification` | Order_Items.Specification | 寫入 | 輸入 | `order_items.specification TEXT` | Dashboard |
| `process_status` | Order_Items.Process_Status | 讀取 / 寫入 | 讀取 | `order_items.process_status` | Airtable |
| `batch_number` | Order_Items.Batch_Number | 寫入 | — | `order_items.batch_number` ⚠️ 冗餘，暫保留 | n8n |
| `cost_model_version` | 無對應（Supabase獨有） | 計算 + 寫入 | — | `order_items.cost_model_version TEXT` | **n8n**（migration 0073，2026-07-24起。`'v2_layered'`=V2品項／`NULL`=舊模型品項） |
| `position_code` | 無對應（Supabase獨有） | 計算 + 寫入 | — | `order_items.position_code TEXT` | **n8n**（左手/右手/左腳/右腳，由item_key尾綴`_LH/_RH/_LF/_RF`推導，僅V2品項有值） |
| `drawing_waived` | 無對應（Supabase獨有） | 計算 + 寫入 | — | `order_items.drawing_waived BOOLEAN` | **n8n**（該行是否有單位被同部位共享豁免） |
| `drawing_charged_count` | 無對應（Supabase獨有） | 計算 + 寫入 | — | `order_items.drawing_charged_count INTEGER` | **n8n**（該行實際收畫圖費嘅單位數，0或1） |

> ⚠️ **FK 設計注意**（database-reviewer Issue #3）：
> Supabase `order_items` 的 FK 需使用 `order_fhs_id VARCHAR(20)` 指向 `orders.order_id`，
> 而非 UUID，以便 n8n 直接寫入而無需先查 UUID。
> SQL: `FOREIGN KEY (order_fhs_id) REFERENCES orders(order_id) ON DELETE CASCADE`

---

## 產品庫欄位映射（products / Product_Database）

| 欄位 | Airtable | n8n 動作 | Dashboard | Supabase | 真理來源 |
|-----|---------|---------|-----------|---------|---------|
| `sku` | Product_Database.Product_Name | 正規化比對 | 選擇 | `products.sku UNIQUE NOT NULL` | **Supabase**（2026-07-25起，S189 Phase1已示範16個V2 SKU直接寫入Supabase無經Airtable；Airtable僅供舊SKU歷史對照） |
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

---

## 🏗️ 成本計算雙層架構（架構決策 v1.1 — 2026-05-13）

> **決策背景**：Antigravity 建議將成本計算從 n8n 移至 Supabase。
> 正確落實方式是「雙層架構」，而非全部移交 Supabase。

### 核心原則：兩層不可混用

```
Layer 1 — 即時報價層（Supabase View，可動態）
  用途：Dashboard 報價時取得目前產品成本
  實體：v_products_with_costs（VIEW，不儲存數值）
  特性：產品漲價 → 立即反映最新定價 ✅

Layer 2 — 歷史快照層（n8n 靜態寫入，不可變）
  用途：訂單確認時鎖定成本，永久稽核依據
  實體：orders.total_cost / net_profit / *_cost（靜態 NUMERIC）
  特性：訂單確認後任何產品漲價均不影響此值 ✅
```

**絕對禁止跨層操作**：禁止用 Trigger / Generated Column / View 動態重算 `orders.total_cost` 等歷史快照欄位。違反者等同財務資料造假。

---

### 實施路線圖

| Phase | 動作 | 效益 | 狀態 |
|-------|------|------|------|
| **Phase A** | 建立 `v_products_with_costs` VIEW | Dashboard 報價直讀，不觸發 n8n | ⏳ 待執行 |
| **Phase B** | n8n 讀取來源從 Airtable 改為 Supabase View | 減少 Airtable API 調用，提速 3–5x | ⏳ 待執行 |
| **Phase C** | Dashboard 報價階段直讀 View，n8n 僅在確認訂單時觸發 | 減少 80% n8n 觸發次數 | 🔮 長期 |

**Phase A SQL（在 Supabase SQL Editor 執行）**：
```sql
CREATE VIEW v_products_with_costs AS
SELECT
  p.sku,
  p.main_category,
  p.target_object,
  p.material,
  p.total_base_cost,
  p.suggested_price,
  p.markup_factor,
  c.drawing_cost,
  c.printing_cost,
  c.clasp_cost,
  c.shipping_cost,
  (p.total_base_cost
    + COALESCE(c.drawing_cost, 0)
    + COALESCE(c.printing_cost, 0)
    + COALESCE(c.clasp_cost, 0)
    + COALESCE(c.shipping_cost, 0)
  ) AS estimated_unit_cost
FROM products p
LEFT JOIN cost_configurations c ON p.cost_config_id = c.id;
```

---

### 欄位寫入方責任表（更新版）

| 欄位 | Layer 1 Supabase View | Layer 2 n8n 靜態 | Dashboard sbSyncOrder | 備注 |
|------|-----------------------|-----------------|-----------------------|------|
| `v_products_with_costs.estimated_unit_cost` | ✅ 動態計算 | — | — | 僅報價參考 |
| `orders.total_cost` | ❌ 禁止動態 | ✅ 計算後寫入 | ❌ 禁寫 | 歷史快照 |
| `orders.net_profit` | ❌ 禁止動態 | ✅ 計算後寫入 | ❌ 禁寫 | 歷史快照 |
| `orders.handmodel_cost` | ❌ 禁止動態 | ✅ 計算後寫入 | ❌ 禁寫 | 歷史快照 |
| `orders.final_sale_price` | — | ❌ 禁止重算 | ✅ 必須寫入 | 前端真理 |
| `orders.deposit` / `balance` / `additional_fee` | — | — | ✅ 必須寫入 | 用戶輸入 |
| `orders.raw_form_state` | — | ❌ 只讀 | ✅ 序列化寫入 | 不可侵犯 |

---

## 📦 sbSyncOrder 寫入邊界（V41 架構決策）

> Dashboard 直接寫 Supabase 的欄位白名單。超出此表的欄位嚴禁在 sbSyncOrder 中出現。

### ✅ 允許寫入（Dashboard SSoT）

| 欄位 | payload key | 說明 |
|------|-------------|------|
| `order_id` | `Order_ID` | Upsert 主鍵 |
| `customer_name` | `Customer_Name` | 用戶輸入 |
| `appointment_at` | `Appointment_Date` | 用戶輸入 |
| `deposit` | `Deposit` | 用戶輸入收款 |
| `balance` | `Balance` | 用戶輸入收款 |
| `additional_fee` | `Additional_Fee` | 用戶輸入收款 |
| `final_sale_price` | `System_Final_Sale_Price` | ⚠️ 前端真理，**必須寫** |
| `full_order_text` | `Full_Order_Text` | Dashboard 生成 |
| `raw_form_state` | `Raw_Form_State` | ⛔ 不可侵犯，只有 Dashboard 寫 |

### ❌ 嚴禁寫入（n8n SSoT）

| 欄位 | 真理來源 | 違反後果 |
|------|---------|---------|
| `total_cost` | n8n 計算 | 覆蓋歷史成本快照 |
| `net_profit` | n8n 計算 | 財務數字失真 |
| `handmodel_cost` / `keychain_cost` / `necklace_cost` | n8n 計算 | 同上 |
| `process_status` | Airtable / n8n | 狀態混亂 |
| `batch_number` | n8n | 批次管理混亂 |
| `admin_notes` | Airtable 人工 | 覆蓋管理員備注 |

> ⚠️ **已知 Bug（2026-05-13 發現）**：V41 `sbSyncOrder()` 目前缺少 `final_sale_price` 寫入，導致新訂單同步後此欄位為 0，觸發 Profit Auditor 警報。修正：在 orderRow 加入 `final_sale_price: payload.System_Final_Sale_Price || 0`。

---

## 🔑 raw_form_state 關鍵字解碼表

> 用途：前端表單狀態的還原依據。當 `reconstructOrderFromSupabase()` 需要從 order_items 補充時，對照此表。

| raw_form_state key | 含義 | 對應 order_items 特徵 |
|-------------------|------|----------------------|
| `enableK` | 金屬鎖匙扣區塊已啟用 | `item_key` 含 `_K_` |
| `enableM` | 銀飾區塊已啟用 | `item_key` 含 `_M_` |
| `enableP` | 立體擺設區塊已啟用 | `item_key` 含 `_P_` |
| `k_baby_sec_en` | K 嬰兒/小孩子區段展開 | `item_key` 含 `_K_B_` 或 `_K_LH/RH/LF/RF`（無 `_E_`） |
| `k_elder_sec_en` | K 成人/長輩區段展開 | `item_key` 含 `_K_E_` |
| `k_lh_en` | K 嬰兒 — 左手 | `_K_LH` 或 `_K_B_LH` |
| `k_rh_en` | K 嬰兒 — 右手 | `_K_RH` 或 `_K_B_RH` |
| `k_lf_en` | K 嬰兒 — 左腳 | `_K_LF` 或 `_K_B_LF` |
| `k_rf_en` | K 嬰兒 — 右腳 | `_K_RF` 或 `_K_B_RF` |
| `k_e_lh_en` | K 成人 — 左手 | `_K_E_LH` |
| `k_e_rh_en` | K 成人 — 右手 | `_K_E_RH` |
| `k_e_lf_en` | K 成人 — 左腳 | `_K_E_LF` |
| `k_e_rf_en` | K 成人 — 右腳 | `_K_E_RF` |
| `m_baby_sec_en` | M 嬰兒/小孩子區段展開 | `item_key` 含 `_M_` 且無 `_E_` |
| `m_elder_sec_en` | M 成人/長輩區段展開 | `item_key` 含 `_M_E_` |
| `deposit` | 已付訂金（原始輸入） | → `orders.deposit` |
| `balance` | 未付尾款（原始輸入） | → `orders.balance` |
| `additional_fee` | 追加費用 | → `orders.additional_fee` |
| `__System_Final_Sale_Price` | 系統計算建議售價（嵌入備存） | → `orders.final_sale_price` |
| `__System_Total_Cost` | 系統計算總成本（嵌入備存） | 參考用，非寫入來源 |

> **還原優先順序**：`raw_form_state` 完整 → 直接還原。`enableK/M: true` 但肢體 key 全缺 → 降級至 `order_items` 重建（hybrid supplement mode）。

---

## ⚠️ 已知問題待解（Phase 1 修正）

來源：database-reviewer 稽核 (2026-05-10)
> **2026-07-25 核對**：本表2.5個月未覆核，以下僅核實有直接證據嘅項目，其餘維持原狀非重新逐項驗證（非本次審查範圍，如需確認請重新派database-reviewer）。

### 已解決

| 優先級 | 問題 | 解決方式 |
|-------|------|---------|
| P0 | `order_items` FK 用 UUID 但 n8n 寫 VARCHAR order_id | ✅ 已改用 `order_fhs_id VARCHAR(20)` FK（`FHS_Finance_Bible.md` §六已確認現行架構） |

### 待解（未重新核實，維持原狀）

| 優先級 | 問題 | 修正方向 |
|-------|------|---------|
| P0 | `final_sale_price` 允許 NULL | 改為 `NOT NULL DEFAULT 0` |
| P1 | `process_status` 無強制約束 | 改為 ENUM 或 CHECK constraint |
| P1 | 缺少 `idx_orders_customer_name` 索引 | 新增 text_pattern_ops 索引 |
| P2 | `cost_configurations` 缺 `ON DELETE SET NULL` | 在 products FK 加上 |
| P2 | `sales_pipeline` 無 Upsert key | 新增 `pipeline_key VARCHAR UNIQUE` |
| P3 | `batch_number` 在 order_items 冗餘 | 文件化為刻意 denormalization 或移除 |

---

## 🧮 n8n 內部計算規則（非持久化，2026-07-25 全面重寫）

> 原「補完日期：2026-05-17」版本描述嘅係 `Node 14 – Cost Calculator`（V47.4 workflow），呢個節點已經唔存在——現行 workflow `FHS_Core_OrderProcessor`（workflowId `6Ljih0hSKr9RpYNm`）節點鏈同計算邏輯已升級到 V47.22，本段落完全重寫對齊現行代碼（非僅改節點名，公式亦已不同）。
> 以下計算值僅存在於 n8n workflow 執行記憶體，寫入結果進入 `orders`/`order_items` 持久層，但中間扣減值（deduction）本身**不建獨立 column**。

### 現行節點鏈

```
Receive Dashboard Order（webhook觸發）
    ↓
Parse Items & Generate SKU（V47.13）
    職責：SKU正規化，isV2Sku guard（V2格式SKU跳過舊式「-N飾 Mode」後綴/扣減邏輯）
    ↓
Batch SKU Collector → Smart Cache Strategist（Supabase v_products_with_costs 查詢）
    ↓
Local Data Mapper
    ↓
Calculate Profit & Pack Items（V47.22，核心計算節點）
    ↓
Supabase Mirror Prep → HTTP: Supabase Sync RPC（呼叫 sync_order_to_mirror()）
```

### keychainShippingDeduction（鎖匙扣運費共享扣減）

```
keychainShippingDeduction = keychainItemCount > 1 ? (keychainItemCount - 1) × 20 : 0
```

- **keychainItemCount** = SUM(quantity) across all 鎖匙扣 order_items（件數，非行數，P0修正見 Finance Bible §四）
- **使用方式**：從 `orders.total_cost`／`orders.keychain_cost` 扣減，寫入 `n8n_adjustment_notes`（type=`keychain_shipping_deduction`）

### charmShippingDeduction（吊飾運費共享扣減）

```
charmShippingDeduction = charmItemCount > 1 ? (charmItemCount - 1) × 35 : 0
```

- **charmItemCount** = SUM(quantity) across all 吊飾 order_items
- 寫入 `n8n_adjustment_notes`（type=`charm_shipping_deduction`）

### charmChainSharingDiscount（頸鏈共用折扣）

```
charmChainSharingDiscount = charmItemCount > 1 ? floor(charmItemCount / 2) × 100 : 0
```

- 每件吊飾已於品項層對稱計 $100 頸鏈費（`chain_cost`），此為「每2條共用1條頸鏈」嘅共用折扣（訂單層扣減，非額外收費），寫入 `n8n_adjustment_notes`（type=`necklace_chain_sharing_discount`）

### drawingDedupDeduction（同部位畫圖動態扣減，V47.22 新增，僅V2 SKU適用）

```
按 position_code（左手/右手/左腳/右腳，由Order_Item_Key後綴推導）分組，
跨鎖匙扣/吊飾共享豁免資格（同一部位3D掃描只需一次）：
  組內第一件（按packedItems原始順序）：drawing_charged_count=1，收tier_drawing_rate
  組內其餘所有品項：drawing_charged_count=0，豁免

drawingDedupDeduction = Σ(每組waived_units × tier_drawing_rate)
```

- 寫入 `n8n_adjustment_notes`（type=`drawing_position_dedup_deduction`，含逐行 detail：position_code/item_key/waived_units/drawing_rate/deduction）
- 同步寫入 `order_items.position_code`/`drawing_waived`/`drawing_charged_count`（migration 0073新欄位，非持久化中間值，實際落地欄位）
- 完整公式同適用範圍見 `FHS_Product_Cost_Schema_v2.md` §10.4（唯一SSoT）

### 設計原則

| 規則 | 說明 |
|------|------|
| **Deduction中間值非持久化** | 上述4個deduction數字本身唔建獨立column，每次workflow執行重新計算；但計算結果（扣減後嘅keychain_cost/necklace_cost/total_cost）+ 審計筆記（n8n_adjustment_notes）+ V2 metadata（position_code等）會持久化 |
| **改動觸發** | `Calculate Profit & Pack Items` 節點邏輯改動時，必須同步更新本段落，並在 CHANGELOG 標註 |

> **歷史背景**：Triple_Sync_Field_Map.md 曾在「Node 14」章節描述呢類計算值，Triple_Sync 文件已廢棄。本段落 2026-05-17 首次遷移補完，2026-07-25（S189）因節點鏈+公式整體升版（V47.4→V47.22）而全面重寫。


---
[[FHS_Knowledge_Map]]
