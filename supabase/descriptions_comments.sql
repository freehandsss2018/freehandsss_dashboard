-- FHS Supabase 資料庫中文說明
-- 用途：供 Fat Mo 在 Supabase Dashboard > Table Editor 查閱每個欄位的業務含義
-- 執行方式：Supabase SQL Editor 全選貼上執行（一次性）
-- 更新記錄：2026-05-13 初版

-- ============================================================
-- TABLE: cost_configurations（成本配置表）
-- 對應 Airtable: Base_Costs
-- ============================================================

COMMENT ON TABLE cost_configurations IS
  '【成本配置表】對應 Airtable Base_Costs。記錄各類產品的基礎製作成本項目。
  由 Fat Mo 在 Airtable 人工維護後同步至此表。變動頻率極低（供應商調價時才改）。
  n8n 在計算訂單成本時讀取此表。';

COMMENT ON COLUMN cost_configurations.id IS
  '【系統主鍵】UUID，由 Supabase 自動生成，勿手動修改。';

COMMENT ON COLUMN cost_configurations.config_name IS
  '【配置名稱】對應 Airtable Linked_Base_Cost 欄位。必須唯一。
  例：「金屬鎖匙扣_嬰兒」、「純銀頸鏈吊飾_成人」等。';

COMMENT ON COLUMN cost_configurations.drawing_cost IS
  '【打樣/製圖成本】每件產品的打樣費用（港幣）。由供應商報價決定。';

COMMENT ON COLUMN cost_configurations.printing_cost IS
  '【印刷/打印成本】每件產品的打印費用（港幣）。';

COMMENT ON COLUMN cost_configurations.clasp_cost IS
  '【扣件成本】金屬扣件、鑰匙圈配件等硬件成本（港幣）。';

COMMENT ON COLUMN cost_configurations.shipping_cost IS
  '【運費成本】每件產品分攤的運費（港幣）。';

COMMENT ON COLUMN cost_configurations.updated_at IS
  '【最後更新時間】由系統 Trigger 自動維護，每次修改記錄時更新。';

-- ============================================================
-- TABLE: products（產品主檔）
-- 對應 Airtable: Product_Database
-- ============================================================

COMMENT ON TABLE products IS
  '【產品主檔】對應 Airtable Product_Database，共 104 個 SKU。
  sku 欄位是 n8n「Parse Items & Generate SKU」節點的精確比對鍵，
  任何格式變更都會導致 n8n 成本計算斷鏈。
  人工在 Airtable 維護後同步至此表。';

COMMENT ON COLUMN products.id IS
  '【系統主鍵】UUID，由 Supabase 自動生成，勿手動修改。';

COMMENT ON COLUMN products.sku IS
  '【產品 SKU】全系統唯一識別碼，必須與 n8n 輸出的 SKU 格式完全一致。
  ⚠️ 嚴禁修改已存在的 SKU 字串，會導致 n8n 成本計算失效。
  格式範例：「金屬鎖匙扣 嬰兒 4肢 左手+右手+左腳+右腳」';

COMMENT ON COLUMN products.main_category IS
  '【主分類】產品大類。例：「金屬鎖匙扣」、「純銀頸鏈吊飾」、「立體擺設」。
  對應 Dashboard 表單的產品類別選擇。';

COMMENT ON COLUMN products.target_object IS
  '【目標對象】嬰兒/小孩 或 成人/長輩。影響 n8n SKU 正規化邏輯。';

COMMENT ON COLUMN products.material IS
  '【材質】產品使用材質。例：「金屬」、「純銀 925」。';

COMMENT ON COLUMN products.mode IS
  '【模式/款式】產品款式或特殊規格說明。';

COMMENT ON COLUMN products.item_per_set IS
  '【每組件數】一個訂單項目包含幾件獨立產品。預設為 1。';

COMMENT ON COLUMN products.total_base_cost IS
  '【基礎總成本】n8n 計算後寫入的每件產品總製作成本（港幣）。
  ⚠️ 此欄位由 n8n 寫入，禁止在 Supabase 使用 Generated Column 或 Trigger 重算。';

COMMENT ON COLUMN products.cost_config_id IS
  '【成本配置外鍵】指向 cost_configurations 表，關聯此產品使用的成本配置。
  若對應成本配置被刪除，此值設為 NULL（ON DELETE SET NULL）。';

COMMENT ON COLUMN products.suggested_price IS
  '【建議售價】系統建議的市場售價（港幣）。Dashboard 報價時的參考值。';

COMMENT ON COLUMN products.markup_factor IS
  '【加價倍數】建議售價 = 總成本 × 加價倍數。預設 2.5 倍。';

COMMENT ON COLUMN products.created_at IS
  '【建立時間】記錄首次新增此 SKU 的時間。';

COMMENT ON COLUMN products.updated_at IS
  '【最後更新時間】由系統 Trigger 自動維護。';

-- ============================================================
-- TABLE: orders（主訂單表）
-- 對應 Airtable: Main_Orders
-- ============================================================

COMMENT ON TABLE orders IS
  '【主訂單表】對應 Airtable Main_Orders。每筆記錄代表一個完整客戶訂單。
  raw_form_state 是訂單還原的唯一生命線，嚴禁刪除或清空。
  final_sale_price 由 Dashboard 寫入，n8n 禁止重算。
  成本/利潤欄位（total_cost, net_profit 等）由 n8n 計算後寫入，禁止 Trigger 重算。';

COMMENT ON COLUMN orders.id IS
  '【系統主鍵】UUID，Supabase 內部使用。其他表的 FK 使用 order_id（VARCHAR），而非此 UUID。';

COMMENT ON COLUMN orders.order_id IS
  '【訂單編號】格式為 FHS-XXXXX，由 Dashboard 生成。全系統唯一識別碼。
  n8n、order_items、sales_pipeline 均用此欄位（而非 UUID）關聯訂單。
  例：FHS-00001、FHS-00123。';

COMMENT ON COLUMN orders.confirmed_at IS
  '【確認日期】訂單正式確認的日期。由 Dashboard 在新增訂單時寫入（當天日期）。';

COMMENT ON COLUMN orders.customer_name IS
  '【客戶名稱】客戶姓名，由 Dashboard 用戶輸入。支援 LIKE 前綴搜尋（已建立 text_pattern_ops 索引）。';

COMMENT ON COLUMN orders.appointment_at IS
  '【取件預約日期】客戶預約取貨的日期。由 Dashboard 用戶輸入。';

COMMENT ON COLUMN orders.deposit IS
  '【訂金】客戶已支付的訂金金額（港幣）。Dashboard 真理，由 sbSyncOrder 寫入。';

COMMENT ON COLUMN orders.balance IS
  '【尾款】客戶尚未支付的餘額（港幣）。Dashboard 真理，由 sbSyncOrder 寫入。';

COMMENT ON COLUMN orders.additional_fee IS
  '【追加費用】訂單完成後的額外收費（港幣）。Dashboard 真理，由 sbSyncOrder 寫入。';

COMMENT ON COLUMN orders.adjustment_amount IS
  '【調整金額】手動調整的金額，可為正（加收）或負（折扣）（港幣）。';

COMMENT ON COLUMN orders.final_sale_price IS
  '【最終售價】訂單最終收取的總金額（港幣）。
  ⚠️ 前端最高真理（Dashboard SSoT）。n8n 嚴禁重算此值。
  DEFAULT 0 表示「未設定」，會觸發 Profit Auditor 警報。
  NOT NULL 約束：此欄位永遠不可為 NULL。';

COMMENT ON COLUMN orders.total_cost IS
  '【總成本】訂單所有產品的製作成本總和（港幣）。
  ⚠️ n8n SSoT。由 n8n 計算後寫入，禁止 Trigger/Dashboard 重算。';

COMMENT ON COLUMN orders.handmodel_cost IS
  '【手模成本】立體擺設（手/腳模）的製作成本（港幣）。由 n8n 計算後寫入。';

COMMENT ON COLUMN orders.keychain_cost IS
  '【鎖匙扣成本】金屬鎖匙扣的製作成本（港幣）。由 n8n 計算後寫入。';

COMMENT ON COLUMN orders.necklace_cost IS
  '【頸鏈成本】純銀頸鏈吊飾的製作成本（港幣）。由 n8n 計算後寫入。';

COMMENT ON COLUMN orders.net_profit IS
  '【淨利潤】final_sale_price - total_cost（港幣）。
  ⚠️ n8n SSoT。由 n8n 計算後寫入，禁止 Trigger/View 動態重算（歷史不可變原則）。';

COMMENT ON COLUMN orders.full_order_text IS
  '【完整訂單文字】Dashboard 生成的訂單 IG 預覽訊息全文。用於發送給客戶確認。';

COMMENT ON COLUMN orders.batch_number IS
  '【批次號碼】生產批次識別碼。由 n8n 在批次管理時寫入。';

COMMENT ON COLUMN orders.admin_notes IS
  '【管理備注】Fat Mo 或管理員手動填寫的內部備注。主要在 Airtable 維護，同步至此。';

COMMENT ON COLUMN orders.process_status IS
  '【訂單狀態】ENUM 類型，可選值：待確認、製作中、完成、已取件、已取消。
  由 n8n 或 Airtable 在流程推進時更新。Dashboard 顯示用。';

COMMENT ON COLUMN orders.raw_form_state IS
  '【原始表單狀態】⛔ 不可侵犯。
  Dashboard captureFormState() 序列化的完整 JSON 物件。
  這是舊訂單還原與修改訂單的唯一生命線。
  只有 Dashboard 可寫入，n8n 和直接 SQL 操作只讀。
  關鍵 key 說明：enableK/enableM/enableP（各類別開關）、
  k_lh_en/k_rh_en/k_lf_en/k_rf_en（鎖匙扣嬰兒各肢體）、
  k_e_lh_en 等（鎖匙扣成人各肢體）、deposit/balance（收款金額）。';

COMMENT ON COLUMN orders.deleted_at IS
  '【軟刪除時間戳】NULL = 有效訂單。有值 = 已從 Dashboard 刪除。
  保留記錄用於財務稽核。n8n Mirror Delete 節點在刪單時設定此欄位。';

COMMENT ON COLUMN orders.created_at IS
  '【建立時間】訂單記錄首次寫入 Supabase 的時間。';

COMMENT ON COLUMN orders.updated_at IS
  '【最後更新時間】由系統 Trigger 自動維護，每次修改時更新。';

-- ============================================================
-- TABLE: order_items（訂單子項目表）
-- 對應 Airtable: Order_Items
-- ============================================================

COMMENT ON TABLE order_items IS
  '【訂單子項目表】對應 Airtable Order_Items。每筆記錄代表訂單中的一個產品項目。
  item_key 是 n8n 的 Upsert 主鍵，格式為 [order_id]_[類別]_[肢體]。
  order_fhs_id 使用 VARCHAR FK（而非 UUID），方便 n8n 直接寫入。';

COMMENT ON COLUMN order_items.id IS
  '【系統主鍵】UUID，由 Supabase 自動生成。';

COMMENT ON COLUMN order_items.item_key IS
  '【項目鍵】全系統唯一識別碼，n8n Upsert 的依據。
  格式：[order_id]_[類別代碼]_[肢體代碼]
  例：FHS-00123_K_B_LH（鎖匙扣 嬰兒 左手）、FHS-00123_K_E_RH（鎖匙扣 成人 右手）
  類別代碼：K=金屬鎖匙扣 / M=銀飾 / P=立體擺設
  肢體修飾：B=嬰兒/小孩 / E=成人/長輩 / LH=左手 / RH=右手 / LF=左腳 / RF=右腳';

COMMENT ON COLUMN order_items.order_fhs_id IS
  '【訂單編號外鍵】VARCHAR(20) FK，指向 orders.order_id（如 FHS-00123）。
  使用 VARCHAR 而非 UUID，讓 n8n 無需先查 UUID 即可直接寫入。
  ON DELETE CASCADE：主訂單刪除時，所有子項目一併刪除。';

COMMENT ON COLUMN order_items.product_sku IS
  '【產品 SKU】關聯 products.sku，指明此項目是哪個產品。
  ON UPDATE CASCADE：products.sku 更名時自動跟新（雖不建議更名）。';

COMMENT ON COLUMN order_items.item_category IS
  '【產品類別文字】中文類別名稱。例：「金屬鎖匙扣」、「純銀頸鏈吊飾」、「立體擺設」。
  由 Dashboard sbSyncOrder 的 _deriveCat() 從 item_key 推導。';

COMMENT ON COLUMN order_items.quantity IS
  '【數量】此項目的訂購數量。預設 1。由 Dashboard 用戶輸入。';

COMMENT ON COLUMN order_items.item_base_cost IS
  '【單件基礎成本】此產品 SKU 的製作成本（港幣）。由 n8n 從 products 表查找後寫入。';

COMMENT ON COLUMN order_items.subtotal_cost IS
  '【小計成本】item_base_cost × quantity（港幣）。由 n8n 計算後寫入。';

COMMENT ON COLUMN order_items.handmodel_cost IS
  '【手模成本（項目級）】此項目的手模製作成本。由 n8n 計算後寫入。';

COMMENT ON COLUMN order_items.keychain_cost IS
  '【鎖匙扣成本（項目級）】此項目的鎖匙扣製作成本。由 n8n 計算後寫入。';

COMMENT ON COLUMN order_items.necklace_cost IS
  '【頸鏈成本（項目級）】此項目的頸鏈製作成本。由 n8n 計算後寫入。';

COMMENT ON COLUMN order_items.engraving_text IS
  '【刻字內容】此項目的刻字文字。
  格式：「[上排]文字 [下排]文字」或純文字。
  由 Dashboard 用戶輸入，sbSyncOrder 寫入。';

COMMENT ON COLUMN order_items.specification IS
  '【規格說明】肢體方向等規格。例：「手 / 左手」、「腳 / 右腳」。
  由 Dashboard sbSyncOrder 的 _deriveSpec() 從 item_key 推導。';

COMMENT ON COLUMN order_items.process_status IS
  '【製作狀態】ENUM 類型，可選值：待製作、製作中、完成、已取件。
  個別項目的生產進度，由 n8n 或 Airtable 更新。';

COMMENT ON COLUMN order_items.reference_image_url IS
  '【參考圖片網址】TEXT[] 陣列，可存放多個圖片 URL。客戶提供的參考圖片。';

COMMENT ON COLUMN order_items.ai_suggestion IS
  '【AI 建議】未來功能預留欄位，供 AI 提供製作建議或注意事項。';

COMMENT ON COLUMN order_items.batch_number IS
  '【批次號碼（冗餘）】從父訂單複製的批次號碼。
  ⚠️ 刻意的反正規化設計：方便 n8n 在不 JOIN 的情況下直接查詢項目批次。
  風險：若父訂單批次號碼變更後子項目未同步，可能產生漂移。
  sync_audit_quadruple.js 負責監控此漂移。';

COMMENT ON COLUMN order_items.created_at IS
  '【建立時間】此子項目記錄首次寫入的時間。';

COMMENT ON COLUMN order_items.updated_at IS
  '【最後更新時間】由系統 Trigger 自動維護。';

-- ============================================================
-- TABLE: sales_pipeline（銷售管道追蹤表）
-- 對應 Airtable: Sales_Pipeline
-- ============================================================

COMMENT ON TABLE sales_pipeline IS
  '【銷售管道追蹤表】對應 Airtable Sales_Pipeline。記錄潛在客戶的詢問與跟進狀態。
  由 n8n 自動化從 IG/WhatsApp 訊息觸發新增，Fat Mo 人工跟進更新階段。';

COMMENT ON COLUMN sales_pipeline.id IS
  '【系統主鍵】UUID，由 Supabase 自動生成。';

COMMENT ON COLUMN sales_pipeline.pipeline_key IS
  '【管道鍵（防重複）】格式：客戶名稱_日期（YYYY-MM-DD）。
  n8n 在新增記錄前應設定此值，防止重試時重複新增。';

COMMENT ON COLUMN sales_pipeline.customer_name IS
  '【客戶名稱】潛在客戶或已成交客戶的名稱。';

COMMENT ON COLUMN sales_pipeline.stage IS
  '【銷售階段】ENUM 類型，可選值：新查詢、跟進中、已報價、已成交、已取消。
  代表客戶在銷售流程中的當前位置。';

COMMENT ON COLUMN sales_pipeline.order_type IS
  '【訂單類型】詢問的產品類別或訂單性質。例：「金屬鎖匙扣」、「生日禮物套裝」。';

COMMENT ON COLUMN sales_pipeline.source IS
  '【來源渠道】客戶從哪個渠道接觸。例：「Instagram」、「WhatsApp」、「朋友介紹」。';

COMMENT ON COLUMN sales_pipeline.query_details IS
  '【詢問詳情】客戶的原始詢問內容摘要。';

COMMENT ON COLUMN sales_pipeline.estimated_amount IS
  '【預估金額】根據詢問內容估算的潛在訂單金額（港幣）。';

COMMENT ON COLUMN sales_pipeline.ai_next_step IS
  '【AI 建議下一步】n8n AI 節點分析後建議的跟進行動。';

COMMENT ON COLUMN sales_pipeline.raw_message IS
  '【原始訊息】客戶發送的完整原始訊息文字，供參考或 AI 分析。';

COMMENT ON COLUMN sales_pipeline.ai_status IS
  '【AI 處理狀態】ENUM 類型，可選值：待處理、已處理、忽略。
  標記 AI 是否已分析並處理此條詢問。';

COMMENT ON COLUMN sales_pipeline.created_at IS
  '【建立時間】此詢問記錄的建立時間。';

COMMENT ON COLUMN sales_pipeline.updated_at IS
  '【最後更新時間】由系統 Trigger 自動維護。';

-- ============================================================
-- TABLE: error_logs（錯誤日誌表）
-- ============================================================

COMMENT ON TABLE error_logs IS
  '【錯誤日誌表】僅供 n8n Error Trigger 自動寫入，不對外開放讀取（anon 無 SELECT 權限）。
  為追加型（Append-only），不修改已有記錄。
  保留期限：30 天，由 pg_cron 每日凌晨 3 時自動清理過期記錄。
  ⚠️ 若 Supabase Free Tier 超過 7 天無活動，pg_cron 會暫停，需手動喚醒。';

COMMENT ON COLUMN error_logs.id IS
  '【系統主鍵】UUID，由 Supabase 自動生成。';

COMMENT ON COLUMN error_logs.occurred_at IS
  '【發生時間】錯誤發生的精確時間（含時區）。已建立 DESC 索引，方便查詢最近錯誤。';

COMMENT ON COLUMN error_logs.workflow_name IS
  '【工作流名稱】發生錯誤的 n8n Workflow 名稱。例：「FHS Main Order Sync V45」。';

COMMENT ON COLUMN error_logs.error_message IS
  '【錯誤訊息】n8n 捕獲的完整錯誤訊息文字。';

COMMENT ON COLUMN error_logs.node_name IS
  '【節點名稱】發生錯誤的 n8n 節點名稱。例：「Create Main Order」、「Mirror Supabase」。';
