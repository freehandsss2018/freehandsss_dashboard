-- Migration 0005: 所有 Table & Field 中文說明
-- 目的：為每個欄位補充中文描述，說明用途及與其他 table/field 的關聯
-- 日期：2026-05-16
-- 執行方式：Supabase SQL Editor → 全部貼入 → Run

-- ============================================================
-- TABLE: cost_configurations（成本配置表）
-- ============================================================

COMMENT ON TABLE cost_configurations IS
  '【成本配置表】對應 Airtable Base_Costs 表。
   按產品類型（如「嬰兒-鎖匙扣-不銹鋼」）儲存四項原材料成本。
   由 n8n Smart Cache Strategist 讀取，透過 get_base_cost_by_skus() RPC 批量查詢。
   更新頻率低（僅供應商報價變動時才改），不應頻繁修改。
   關聯：products.cost_config_id → 此表 id（一對多，一個成本配置對應多個 SKU）。';

COMMENT ON COLUMN cost_configurations.id IS
  '【主鍵】UUID，系統自動生成。
   products.cost_config_id 引用此欄，建立產品與成本配置的連結。';

COMMENT ON COLUMN cost_configurations.config_name IS
  '【成本配置名稱】唯一識別符，格式為「目標物-產品類型-材質」，例如：嬰兒-鎖匙扣-不銹鋼。
   對應 Airtable Base_Costs 的 Linked_Base_Cost 欄位。
   products.cost_config_id 透過此名稱建立關聯（migration script 用 config_name 查出 UUID）。
   ⚠️ 此名稱需與 products 表中的 Linked_Base_Cost 值完全一致，否則 cost_config_id 無法連結。';

COMMENT ON COLUMN cost_configurations.drawing_cost IS
  '【繪圖成本】製作 3D 模型/繪圖的單件工序成本（港幣）。
   與 printing_cost + clasp_cost + shipping_cost 相加 = products.total_base_cost。
   由 recalculate_product_costs() function 用於重算產品總成本。';

COMMENT ON COLUMN cost_configurations.printing_cost IS
  '【打印成本】3D 打印/鑄造的單件工序成本（港幣）。
   與其他三項成本相加構成 products.total_base_cost。
   參考 drawing_cost 說明。';

COMMENT ON COLUMN cost_configurations.clasp_cost IS
  '【扣件成本】鎖匙扣扣件、吊飾配件等輔料成本（港幣）。
   部分產品（如立體擺設）此項為 0。
   與其他三項成本相加構成 products.total_base_cost。';

COMMENT ON COLUMN cost_configurations.shipping_cost IS
  '【運費成本】每件產品分攤的運輸費用（港幣）。
   與其他三項成本相加構成 products.total_base_cost。';

COMMENT ON COLUMN cost_configurations.updated_at IS
  '【最後更新時間】供應商調價時自動更新。
   更新此表後，應執行 SELECT recalculate_product_costs() 重算所有相關產品的 total_base_cost。';

-- ============================================================
-- TABLE: products（產品資料表）
-- ============================================================

COMMENT ON TABLE products IS
  '【產品資料表】對應 Airtable Product_Database，共 489 個 SKU。
   核心用途：n8n 透過 sku 欄位查詢 total_base_cost，用於利潤計算。
   關聯：cost_configurations（多對一）、order_items（一對多，透過 product_sku）。
   ⚠️ sku 欄位是 n8n 的精確匹配鍵，不可更名或更改格式。';

COMMENT ON COLUMN products.id IS
  '【主鍵】UUID，系統自動生成。
   內部使用，n8n 不直接引用此欄（n8n 用 sku 字串作為查詢鍵）。
   get_base_cost_by_skus() RPC 回傳此 id 的字串版本供參考。';

COMMENT ON COLUMN products.sku IS
  '【產品 SKU】唯一識別符，格式為完整產品名稱，例如：嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)。
   ⚠️ AGENTS.md 絕對保護：此值必須與 n8n Parse Items & Generate SKU 節點的輸出完全一致。
   任何格式變更都會導致成本查詢失敗，所有相關訂單利潤計算歸零。
   對應 Airtable Product_Database 的 Product_Name 欄位。
   被 order_items.product_sku 引用（外鍵）。';

COMMENT ON COLUMN products.main_category IS
  '【主分類】產品的頂層分類，例如：金屬鎖匙扣、純銀吊飾、立體擺設。
   Dashboard 用此欄位做分類篩選及 badge 顯示邏輯。
   對應 Airtable Product_Database 的 Main_Category 欄位。';

COMMENT ON COLUMN products.target_object IS
  '【目標對象/款式】描述產品的目標人物或款式，例如：嬰兒、父母、玻璃瓶套裝。
   Dashboard Overview badge 用此欄位顯示訂單中每類人物的產品。
   對應 Airtable Product_Database 的 Target_Object 欄位。';

COMMENT ON COLUMN products.material IS
  '【材質】產品使用的材質，例如：不銹鋼、鋁合金、925銀。
   Dashboard badge 顯示用，n8n 成本查詢以 sku 為準，不依賴此欄。
   對應 Airtable Product_Database 的 Material 欄位。';

COMMENT ON COLUMN products.mode IS
  '【款式/模式】區分產品的製作方式或形式，例如：平面、立體、單購、加購。
   意義視 main_category 而定。dashboard 展示用欄位，不影響成本計算。
   對應 Airtable Product_Database 的 Mode 欄位。';

COMMENT ON COLUMN products.item_per_set IS
  '【每套件數】此 SKU 一套包含的飾品數量，例如：鎖匙扣套裝可能是 2 件一套。
   n8n 計算成本時會用 quantity × item_per_set 得出實際總件數。
   預設為 1（大多數單件產品）。';

COMMENT ON COLUMN products.total_base_cost IS
  '【總基礎成本】此 SKU 的總原料成本（港幣）= drawing_cost + printing_cost + clasp_cost + shipping_cost。
   ⚠️ 由 n8n 寫入，或由 recalculate_product_costs() 從 cost_configurations 重算。
   AGENTS.md 禁止使用觸發器（trigger）自動計算此欄。
   n8n Smart Cache Strategist 透過 get_base_cost_by_skus() RPC 讀取此值用於利潤計算。';

COMMENT ON COLUMN products.cost_config_id IS
  '【成本配置外鍵】指向 cost_configurations.id，說明此產品使用哪套成本配置。
   多個 SKU 可共用同一套成本配置（例如所有「嬰兒-鎖匙扣-不銹鋼」不同件數的 SKU）。
   若成本配置被刪除，此欄設為 NULL（ON DELETE SET NULL），產品記錄不受影響。
   遷移腳本執行後 489/489 產品已全部連結。';

COMMENT ON COLUMN products.suggested_price IS
  '【建議售價】此 SKU 的市場建議零售價（港幣）。
   Dashboard 報價參考用，不參與 n8n 利潤計算（n8n 以 final_sale_price 為準）。
   對應 Airtable Product_Database 的 Suggested_Price_Manual 欄位。';

COMMENT ON COLUMN products.markup_factor IS
  '【加價倍數】建議售價 = total_base_cost × markup_factor 的參考倍率。
   展示用輔助欄位，實際售價以 orders.final_sale_price 為財務真理。
   預設值 2.5（即成本的 2.5 倍）。';

COMMENT ON COLUMN products.created_at IS
  '【建立時間】記錄首次同步至 Supabase 的時間，由系統自動填入。';

COMMENT ON COLUMN products.updated_at IS
  '【最後更新時間】每次 upsert 時自動更新，由 update_updated_at() 觸發器維護。';

-- ============================================================
-- TABLE: orders（訂單主表）
-- ============================================================

COMMENT ON TABLE orders IS
  '【訂單主表】對應 Airtable Main_Orders，每行代表一張客人訂單。
   核心財務欄位（final_sale_price、net_profit）以前端填入值為絕對真理，n8n 不得擅自重算。
   關聯：order_items（一對多，透過 order_items.order_fhs_id → orders.order_id）。
   ⚠️ raw_form_state 為訂單還原唯一生命線，絕對不可移除。';

COMMENT ON COLUMN orders.id IS
  '【主鍵】UUID，系統內部使用。
   n8n 和 order_items 均不使用此 UUID 做關聯，改用 order_id（VARCHAR）以降低複雜度。';

COMMENT ON COLUMN orders.order_id IS
  '【訂單編號】人類可讀的唯一訂單號，格式：0600802 等數字編號。
   由 Dashboard 生成，全系統唯一識別符。
   order_items.order_fhs_id 外鍵引用此欄（VARCHAR 直接匹配，避免 UUID 查詢開銷）。
   n8n 所有寫入操作均以此欄作為訂單識別鍵。';

COMMENT ON COLUMN orders.confirmed_at IS
  '【訂單確認日期】客人確認訂單的日期（DATE 格式，非時間戳）。
   Dashboard 訂單列表按此欄排序。對應 Airtable 的 Order_Confirm_Date。';

COMMENT ON COLUMN orders.customer_name IS
  '【客人姓名】自由文字，由前端表單填入。
   Dashboard 搜尋功能使用 LIKE 查詢（idx_orders_customer_name 支援前綴搜尋）。';

COMMENT ON COLUMN orders.appointment_at IS
  '【預約取件日期】客人預約取件的日期（DATE 格式）。
   對應 Airtable 的 Appointment_Date。非必填。';

COMMENT ON COLUMN orders.deposit IS
  '【訂金金額】客人已繳付的訂金（港幣）。
   財務參考欄位，不參與 n8n 利潤計算公式。';

COMMENT ON COLUMN orders.balance IS
  '【尾款金額】客人尚未繳付的餘款（港幣）。
   財務參考欄位，不參與 n8n 利潤計算公式。';

COMMENT ON COLUMN orders.additional_fee IS
  '【附加費用】訂單的額外收費，例如急單附加費（港幣）。
   計入 final_sale_price 的組成部分，由前端計算後寫入。';

COMMENT ON COLUMN orders.adjustment_amount IS
  '【調整金額】訂單的價格調整（正數為加收，負數為折扣）（港幣）。
   由前端填入，不由 n8n 計算。';

COMMENT ON COLUMN orders.final_sale_price IS
  '【最終售價】訂單實收總金額（港幣）。
   ⚠️ AGENTS.md 財務真理守護：此值由前端 Dashboard 填入，n8n 絕對不可重算。
   NOT NULL DEFAULT 0：值為 0 時 n8n Profit Auditor 會觸發零售價警告。
   n8n 計算利潤時以此值為基礎：net_profit = final_sale_price - total_cost。';

COMMENT ON COLUMN orders.total_cost IS
  '【訂單總成本】此訂單所有產品的成本合計（港幣）。
   由 n8n Calculate Profit & Pack Items 節點計算後寫入，不由前端填入。
   = 所有 order_items.subtotal_cost 之和。';

COMMENT ON COLUMN orders.handmodel_cost IS
  '【手模成本（訂單級）】此訂單中所有手模產品的成本小計（港幣）。
   由 n8n 按產品類型分類計算，與 order_items.handmodel_cost（單項）不同語意。
   用於 Telegram 利潤報告的成本明細分類。';

COMMENT ON COLUMN orders.keychain_cost IS
  '【鎖匙扣成本（訂單級）】此訂單中所有鎖匙扣產品的成本小計（港幣）。
   參考 handmodel_cost 說明，語意相同。';

COMMENT ON COLUMN orders.necklace_cost IS
  '【吊飾成本（訂單級）】此訂單中所有吊飾產品的成本小計（港幣）。
   參考 handmodel_cost 說明，語意相同。';

COMMENT ON COLUMN orders.net_profit IS
  '【淨利潤】= final_sale_price - total_cost（港幣）。
   由 n8n 計算後寫入，前端展示用。
   Dashboard Overview 財務統計讀取此欄彙總利潤。';

COMMENT ON COLUMN orders.full_order_text IS
  '【完整訂單文字】完整的訂單描述文字，通常是 Telegram 訊息格式的訂單摘要。
   由前端生成，Telegram 通知節點使用此欄格式化訊息。';

COMMENT ON COLUMN orders.batch_number IS
  '【批次編號】訂單所屬的製作批次，例如 B2026-05。
   用於將多張訂單歸入同一生產批次管理。
   order_items.batch_number 從此欄複製（反正規化設計，方便單行查詢）。';

COMMENT ON COLUMN orders.admin_notes IS
  '【管理員備註】內部使用的自由文字備註，不對客人顯示。
   前端 Dashboard 管理介面填入，不由 n8n 處理。';

COMMENT ON COLUMN orders.process_status IS
  '【訂單狀態】使用 order_status ENUM：待確認 → 製作中 → 完成 → 已取件（或已取消）。
   新訂單預設「待確認」。由前端 Dashboard 手動更新，n8n 寫入時也設為「待確認」。
   Dashboard 訂單列表用此欄篩選進行中的訂單。';

COMMENT ON COLUMN orders.raw_form_state IS
  '【表單原始狀態】前端 captureFormState() 序列化的完整表單 JSON。
   ⚠️ AGENTS.md 絕對保護（不可侵犯）：此欄是修改訂單和還原舊訂單的唯一生命線。
   只由 Dashboard 前端寫入，n8n 和所有後端服務均為唯讀。
   絕對禁止刪除、更名、或修改此欄的結構和寫入邏輯。';

COMMENT ON COLUMN orders.deleted_at IS
  '【軟刪除時間戳】NULL = 有效訂單；非 NULL = 已從 Dashboard 刪除。
   由 n8n Mirror Delete to Supabase 節點在收到 DELETE 動作時寫入當前時間。
   保留記錄以維持審計追蹤，不做實體刪除。
   v_order_cost_breakdown VIEW 以 WHERE deleted_at IS NULL 過濾，只顯示有效訂單。';

COMMENT ON COLUMN orders.created_at IS
  '【建立時間】訂單首次寫入 Supabase 的時間，系統自動填入，不可修改。';

COMMENT ON COLUMN orders.updated_at IS
  '【最後更新時間】每次 UPDATE 時由 orders_updated_at 觸發器自動更新為當前時間。';

-- ============================================================
-- TABLE: order_items（訂單明細表）
-- ============================================================

COMMENT ON TABLE order_items IS
  '【訂單明細表】對應 Airtable Order_Items，每行代表一張訂單中的一件產品。
   子表：多對一連結至 orders（一張訂單可有多件產品）。
   關聯：orders.order_id ← order_items.order_fhs_id（父訂單）
         products.sku ← order_items.product_sku（產品資料）。
   由 n8n Create Sub Items 節點寫入，以 item_key 作為 upsert 唯一鍵。';

COMMENT ON COLUMN order_items.id IS
  '【主鍵】UUID，系統內部使用。n8n 使用 item_key 作為業務主鍵，不使用此 UUID。';

COMMENT ON COLUMN order_items.item_key IS
  '【明細唯一鍵】格式：[訂單編號]_[類別縮寫]_[肢體縮寫]，例如：0600802_K_RH。
   n8n Create Sub Items 節點的 upsert 衝突解析鍵，防止重複寫入。
   歷史訂單使用 Airtable Item_ID 格式（如 0600800 | 嬰兒鎖匙扣...）。';

COMMENT ON COLUMN order_items.order_fhs_id IS
  '【父訂單編號】VARCHAR 外鍵，引用 orders.order_id。
   設計為 VARCHAR（而非 UUID）原因：n8n 直接寫入 FHS-XXXXX 字串，
   避免先查詢 UUID 再寫入的額外開銷。
   ON DELETE CASCADE：父訂單刪除時，所有相關明細自動刪除。';

COMMENT ON COLUMN order_items.product_sku IS
  '【產品 SKU】引用 products.sku 的外鍵，連結此明細與產品資料。
   允許 NULL（歷史訂單可能因 SKU 格式不匹配而無法連結）。
   ON UPDATE CASCADE：products.sku 更名時自動同步（但 AGENTS.md 禁止改 sku）。
   n8n 透過 product_sku → products → total_base_cost 計算成本。';

COMMENT ON COLUMN order_items.item_category IS
  '【產品分類】此明細的產品類別，例如：金屬鎖匙扣、純銀吊飾、立體擺設。
   從 n8n Parse Items 節點解析，與 products.main_category 語意相同但來源不同。';

COMMENT ON COLUMN order_items.quantity IS
  '【數量】此明細的產品數量，預設為 1。
   subtotal_cost = item_base_cost × quantity，由 n8n 計算。';

COMMENT ON COLUMN order_items.item_base_cost IS
  '【單件基礎成本】此 SKU 的單件成本（港幣），等於 products.total_base_cost。
   由 n8n 從 Supabase get_base_cost_by_skus() 取得後寫入。
   subtotal_cost = item_base_cost × quantity。';

COMMENT ON COLUMN order_items.subtotal_cost IS
  '【小計成本】= item_base_cost × quantity（港幣）。
   由 n8n 計算後寫入。所有明細的 subtotal_cost 相加 = orders.total_cost。';

COMMENT ON COLUMN order_items.handmodel_cost IS
  '【手模成本（明細級）】此單項明細的手模工序成本（港幣）。
   注意：與 orders.handmodel_cost（訂單級別彙總）語意不同。
   此欄為 n8n 按 item_category 分類後，針對此單項的成本分配。';

COMMENT ON COLUMN order_items.keychain_cost IS
  '【鎖匙扣成本（明細級）】此單項明細的鎖匙扣工序成本（港幣）。
   參考 handmodel_cost 說明，語意相同。';

COMMENT ON COLUMN order_items.necklace_cost IS
  '【吊飾成本（明細級）】此單項明細的吊飾工序成本（港幣）。
   參考 handmodel_cost 說明，語意相同。';

COMMENT ON COLUMN order_items.engraving_text IS
  '【刻字文字】此件產品需要刻上的文字內容，例如名字縮寫或日期。
   由前端表單填入，Telegram 通知中顯示給師傅參考。';

COMMENT ON COLUMN order_items.specification IS
  '【規格備註】產品製作規格的自由文字說明，例如尺寸要求、特殊要求。
   由前端填入，不影響成本計算。';

COMMENT ON COLUMN order_items.process_status IS
  '【明細製作狀態】使用 item_status ENUM：待製作 → 製作中 → 完成 → 已取件。
   記錄此件產品的製作進度，與 orders.process_status（訂單整體狀態）獨立管理。
   新訂單明細預設「待製作」。';

COMMENT ON COLUMN order_items.reference_image_url IS
  '【參考圖片 URL 陣列】TEXT[] 類型，儲存多張參考圖片的 URL。
   由前端上傳至圖床後，將 URL 存入此欄。師傅製作時參考。';

COMMENT ON COLUMN order_items.ai_suggestion IS
  '【AI 製作建議】由 AI 根據刻字或規格自動生成的製作提示，例如字體建議。
   輔助用途，不影響訂單流程。n8n AI 節點寫入（如有啟用）。';

COMMENT ON COLUMN order_items.batch_number IS
  '【批次編號（反正規化複製）】從父訂單 orders.batch_number 複製而來。
   設計目的：允許直接查詢明細級批次，無需 JOIN orders 表。
   風險：若父訂單批次號更新，此欄不自動同步（需手動或腳本更新）。';

COMMENT ON COLUMN order_items.created_at IS
  '【建立時間】此明細首次寫入 Supabase 的時間，系統自動填入。';

COMMENT ON COLUMN order_items.updated_at IS
  '【最後更新時間】每次 UPDATE 時由 order_items_updated_at 觸發器自動更新。';

-- ============================================================
-- TABLE: sales_pipeline（銷售管道表）
-- ============================================================

COMMENT ON TABLE sales_pipeline IS
  '【銷售管道表】記錄未成交的客人查詢及跟進狀態，類似 CRM 的 lead 管理。
   當 AI 收到新查詢時寫入，人工跟進後更新 stage。
   此表記錄不會自動轉為 orders，需人工確認後在 Dashboard 建立正式訂單。';

COMMENT ON COLUMN sales_pipeline.id IS
  '【主鍵】UUID，系統自動生成，內部使用。';

COMMENT ON COLUMN sales_pipeline.pipeline_key IS
  '【去重鍵】格式：客人姓名_YYYY-MM-DD，用於防止同一查詢重複寫入。
   n8n 在 upsert 前應設定此值。若為 NULL 則不做去重保護。';

COMMENT ON COLUMN sales_pipeline.customer_name IS
  '【客人姓名/來源識別】查詢客人的姓名或 Telegram 用戶名。';

COMMENT ON COLUMN sales_pipeline.stage IS
  '【跟進階段】使用 pipeline_stage ENUM：新查詢 → 跟進中 → 已報價 → 已成交 → 已取消。
   代表此潛在訂單的銷售進度。已成交後在 orders 表建立正式訂單。';

COMMENT ON COLUMN sales_pipeline.order_type IS
  '【查詢產品類型】客人查詢的產品大類，例如：鎖匙扣、吊飾、立體擺設。
   輔助分類，非強制填寫。';

COMMENT ON COLUMN sales_pipeline.source IS
  '【查詢來源】客人的查詢渠道，例如：Telegram、Instagram、朋友介紹。';

COMMENT ON COLUMN sales_pipeline.query_details IS
  '【查詢詳情】客人的具體需求描述，由 AI 或人工整理後填入的結構化摘要。
   區別於 raw_message（原始文字），此欄為整理後的重點記錄。';

COMMENT ON COLUMN sales_pipeline.estimated_amount IS
  '【預估金額】根據查詢內容估算的可能成交金額（港幣）。
   非確認數字，僅作銷售預測參考。';

COMMENT ON COLUMN sales_pipeline.ai_next_step IS
  '【AI 建議下一步】AI 根據查詢內容生成的跟進行動建議，例如「請提供寶寶照片」。
   供 Fat Mo 跟進時參考，非強制執行。';

COMMENT ON COLUMN sales_pipeline.raw_message IS
  '【原始查詢訊息】客人傳送的未經處理原始文字，完整保留作記錄。
   AI 處理時以此為輸入，生成 query_details 和 ai_next_step。';

COMMENT ON COLUMN sales_pipeline.ai_status IS
  '【AI 處理狀態】使用 ai_status_type ENUM：待處理 → 已處理 → 忽略。
   記錄 AI 是否已對此查詢生成回覆建議。
   n8n AI 節點處理後更新為「已處理」。';

COMMENT ON COLUMN sales_pipeline.created_at IS
  '【建立時間】查詢首次記錄的時間，系統自動填入。';

COMMENT ON COLUMN sales_pipeline.updated_at IS
  '【最後更新時間】跟進狀態或 AI 結果更新時自動更新。';

-- ============================================================
-- TABLE: error_logs（錯誤日誌表）
-- ============================================================

COMMENT ON TABLE error_logs IS
  '【錯誤日誌表】n8n Error Trigger 工作流寫入的系統錯誤記錄。
   僅供追蹤問題，不觸發任何業務邏輯。
   TTL 設定：30 天後自動刪除（需啟用 pg_cron，參考 ANTI_IDLE_SETUP.md）。
   此表只寫不讀（正常運作時），出錯時查閱診斷。';

COMMENT ON COLUMN error_logs.id IS
  '【主鍵】UUID，系統自動生成。';

COMMENT ON COLUMN error_logs.occurred_at IS
  '【錯誤發生時間】n8n 偵測到錯誤的時間戳（含時區）。
   idx_error_logs_occurred_at 索引按此欄倒序排列，方便查詢最新錯誤。
   pg_cron TTL 清理依此欄判斷是否超過 30 天。';

COMMENT ON COLUMN error_logs.workflow_name IS
  '【n8n 工作流名稱】發生錯誤的 n8n workflow 名稱，例如：FHS_Core_OrderProcessor。
   方便快速定位是哪個工作流出問題。';

COMMENT ON COLUMN error_logs.error_message IS
  '【錯誤訊息】n8n 捕獲的錯誤詳細文字，包含節點名稱、錯誤類型和堆疊追蹤。
   診斷問題的主要依據。';

COMMENT ON COLUMN error_logs.node_name IS
  '【n8n 節點名稱】發生錯誤的具體節點，例如：Fetch Exact Base Cost、Mirror to Supabase。
   配合 workflow_name 可精確定位錯誤源頭。';
