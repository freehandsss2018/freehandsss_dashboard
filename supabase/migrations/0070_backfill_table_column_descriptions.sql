-- Migration 0070: 補全表/欄位 description（Fat Mo 要求：每個表每個欄都要有description）
-- 純 metadata 補寫，零業務邏輯改動，零風險

-- ─────────────────────────────────────────────
-- 表級 description（原缺 2 個）
-- ─────────────────────────────────────────────

COMMENT ON TABLE public.cost_configurations IS
  '【原子成本設定表】Layer 1 成本層——drawing/material/clasp/shipping 等最小單位成本，供 products.total_base_cost 組裝來源。前端成本設定中心讀寫，改動經 fhs_upsert_cost_config() RPC（同交易寫 audit_logs）。';

COMMENT ON TABLE public.expense_logs IS
  '【營運支出記錄】Dashboard 財務頁人工登錄的非產品成本支出（軟件/打印費/材料/雜項等），log_type 欄位預留未來擴充成通用日誌容器。經 fhs_write_expense_log() RPC 寫入。';

-- ─────────────────────────────────────────────
-- audit_logs（0/11 → 補全）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.audit_logs.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.audit_logs.created_at IS '事件發生時間，索引用於時序查詢。';
COMMENT ON COLUMN public.audit_logs.log_type IS '事件分類：cost_config_change（成本設定變更）| order_cost_adjust（訂單成本調整）| batch_recalc（批量重算）。';
COMMENT ON COLUMN public.audit_logs.action IS '動作類型：create | update | delete。';
COMMENT ON COLUMN public.audit_logs.actor IS '操作者標識，預設 dashboard（前端觸發）。';
COMMENT ON COLUMN public.audit_logs.entity_type IS '被改動的實體類型：cost_config | order。';
COMMENT ON COLUMN public.audit_logs.entity_id IS '被改動實體的 ID：entity_type=cost_config 時為 config_key；entity_type=order 時為 FHS order_id 字串。';
COMMENT ON COLUMN public.audit_logs.before_val IS '變更前快照（JSONB），create 事件為 NULL。';
COMMENT ON COLUMN public.audit_logs.after_val IS '變更後快照（JSONB）。';
COMMENT ON COLUMN public.audit_logs.summary IS '人類可讀一行摘要，格式如「key: 舊值 → 新值」。';
COMMENT ON COLUMN public.audit_logs.source IS '寫入來源：dashboard | n8n | rpc。';

-- ─────────────────────────────────────────────
-- expense_logs（0/10 → 補全）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.expense_logs.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.expense_logs.log_type IS '日誌分類 discriminator，現時固定 expense，預留未來擴充成通用容器。';
COMMENT ON COLUMN public.expense_logs.entry_date IS '支出發生日期（非 created_at 寫入時間，可補記過去日期）。';
COMMENT ON COLUMN public.expense_logs.category IS '支出分類：軟件支出 / 打印費 / 材料 / 運費 / 雜項（前端下拉 enum，非 DB CHECK 約束）。';
COMMENT ON COLUMN public.expense_logs.item_name IS '支出項目名稱，人工輸入自由文字。';
COMMENT ON COLUMN public.expense_logs.amount IS '支出金額（港幣）。';
COMMENT ON COLUMN public.expense_logs.remarks IS '備注，選填。';
COMMENT ON COLUMN public.expense_logs.operator IS '登錄操作者，預設 dashboard。';
COMMENT ON COLUMN public.expense_logs.payload IS '預留擴充欄位（JSONB），現時未使用。';
COMMENT ON COLUMN public.expense_logs.created_at IS '記錄寫入時間。';

-- ─────────────────────────────────────────────
-- reply_templates（0/7 → 補全）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.reply_templates.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.reply_templates.template_name IS '範本名稱，唯一鍵，人工維護。';
COMMENT ON COLUMN public.reply_templates.associated_intent_label IS '對應意圖標籤，CHECK 限定：cancel / complaint / modify_order / payment_inquiry / place_order（同 message_intents.intent_label 語彙一致）。';
COMMENT ON COLUMN public.reply_templates.template_content IS '範本回覆文字內容，Session 173 種子為佔位草稿，正式上線前需 Fat Mo 覆核修訂。';
COMMENT ON COLUMN public.reply_templates.is_active IS '是否啟用，停用範本不會被查詢邏輯選用但保留歷史。';
COMMENT ON COLUMN public.reply_templates.created_at IS '範本建立時間。';
COMMENT ON COLUMN public.reply_templates.updated_at IS '範本最後修改時間。';

-- ─────────────────────────────────────────────
-- system_config（0/3 → 補全）
-- ⚠️ 發現：此表無對應 repo migration 檔案（疑似曾用 apply_migration 直接建表未同步落 repo，
--    見 feedback_migration_repo_db_drift.md 已知模式），本次一併補上結構化註解降低未來風險。
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.system_config.key IS '設定鍵，主鍵，取代舊有借用 Airtable Main_Orders FHS-SYSTEM-CONFIG 記錄的做法（D43）。';
COMMENT ON COLUMN public.system_config.value IS '設定值（JSONB，可存任意結構）。';
COMMENT ON COLUMN public.system_config.updated_at IS '最後更新時間。寫入需經 update_system_config() RPC，anon 只讀。';

-- ─────────────────────────────────────────────
-- content_mismatch（2/10 → 補全剩餘 8 個）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.content_mismatch.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.content_mismatch.alert_date IS '比對發生日期。';
COMMENT ON COLUMN public.content_mismatch.order_id IS 'FHS 訂單編號字串（非 Supabase UUID），關聯 orders.order_id。';
COMMENT ON COLUMN public.content_mismatch.message_thread IS '對應 IG 訊息串 thread 標識，關聯 ig_messages.thread。';
COMMENT ON COLUMN public.content_mismatch.message_ig_message_id IS '對應 ig_messages.ig_message_id（冪等鍵，非 IG 平台原生 ID）。';
COMMENT ON COLUMN public.content_mismatch.ig_reported_amount IS 'IG 訊息中客戶/系統回報的金額。';
COMMENT ON COLUMN public.content_mismatch.db_actual_amount IS 'Supabase 訂單記錄的實際金額，同 ig_reported_amount 比對用。';
COMMENT ON COLUMN public.content_mismatch.created_at IS '記錄寫入時間。';

-- ─────────────────────────────────────────────
-- ig_messages（2/11 → 補全剩餘 9 個）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.ig_messages.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.ig_messages.thread IS 'IG 訊息串標識，同一客戶對話分組用。';
COMMENT ON COLUMN public.ig_messages.sender_is_business IS '發送者是否為商家帳號（true=商家回覆，false=客戶發送）。';
COMMENT ON COLUMN public.ig_messages.customer_name IS '客戶名稱，由 n8n 解析 thread 參與者取得。';
COMMENT ON COLUMN public.ig_messages.pii_policy_applied IS '記錄套用咗邊個版本嘅 PII 遮罩政策，供日後政策升級時追溯舊記錄套用狀態。';
COMMENT ON COLUMN public.ig_messages.has_receipt IS '此訊息是否附帶收據/截圖（由 n8n 判斷附件類型寫入）。';
COMMENT ON COLUMN public.ig_messages.sent_at IS '訊息原始發送時間（IG 平台時間戳，非 created_at 入庫時間）。';
COMMENT ON COLUMN public.ig_messages.order_id IS '解析出的關聯 FHS 訂單編號，NULL 表示未能匹配到訂單。';
COMMENT ON COLUMN public.ig_messages.created_at IS '記錄入庫時間。';

-- ─────────────────────────────────────────────
-- ig_watchdog_alerts（3/16 → 補全剩餘 13 個）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.ig_watchdog_alerts.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.ig_watchdog_alerts.alert_date IS '警報產生日期。';
COMMENT ON COLUMN public.ig_watchdog_alerts.kind IS '警報種類（如 content_mismatch），對應 content_mismatch 表鏡像列的 kind 值。';
COMMENT ON COLUMN public.ig_watchdog_alerts.category IS '警報分類細項，供前端篩選/分組顯示。';
COMMENT ON COLUMN public.ig_watchdog_alerts.customer_name IS '關聯客戶名稱。';
COMMENT ON COLUMN public.ig_watchdog_alerts.snippet IS '觸發警報嘅訊息片段摘錄，供人工快速預覽毋須跳轉全文。';
COMMENT ON COLUMN public.ig_watchdog_alerts.thread IS '關聯 IG 訊息串標識。';
COMMENT ON COLUMN public.ig_watchdog_alerts.has_receipt IS '此警報相關訊息是否附收據。';
COMMENT ON COLUMN public.ig_watchdog_alerts.db_matched IS '系統是否已成功將此警報匹配到 Supabase 訂單記錄。';
COMMENT ON COLUMN public.ig_watchdog_alerts.resolved IS '人工是否已處理此警報（工作流狀態，非「判定是否正確」，後者見 content_mismatch.is_false_positive）。';
COMMENT ON COLUMN public.ig_watchdog_alerts.resolved_at IS '人工處理時間，經 fhs_resolve_ig_alert() RPC 寫入。';
COMMENT ON COLUMN public.ig_watchdog_alerts.resolved_by IS '處理人員標識。';
COMMENT ON COLUMN public.ig_watchdog_alerts.created_at IS '警報產生時間。';

-- ─────────────────────────────────────────────
-- message_intents（1/8 → 補全剩餘 7 個）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.message_intents.id IS '主鍵 UUID。';
COMMENT ON COLUMN public.message_intents.alert_date IS '意圖標註日期。';
COMMENT ON COLUMN public.message_intents.message_thread IS '關聯 IG 訊息串標識。';
COMMENT ON COLUMN public.message_intents.message_ig_message_id IS '關聯 ig_messages.ig_message_id（冪等鍵）。';
COMMENT ON COLUMN public.message_intents.intent_label IS '意圖標籤：cancel / complaint / modify_order / payment_inquiry / place_order 等（同 reply_templates.associated_intent_label 語彙一致）。';
COMMENT ON COLUMN public.message_intents.is_primary IS '同一則訊息命中多個意圖時，標記優先序最高者（true）；一則訊息可有多列，僅一列 is_primary=true。';
COMMENT ON COLUMN public.message_intents.created_at IS '標註寫入時間。';

-- ─────────────────────────────────────────────
-- order_items（23/25 → 補全剩餘 2 個）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.order_items.item_sale_price IS '單品建議售價（稀疏欄位，僅新訂單有值），供 Audit Ledger 財務分頁對照顯示，非確收金額（確收真理見 orders.final_sale_price）。';
COMMENT ON COLUMN public.order_items.precomplete_status IS '「完成」前的 process_status 快照，供精準退回用。fhs_complete_order() 寫入，fhs_uncomplete_order() 讀取後清空（migration 0042）。';

-- ─────────────────────────────────────────────
-- orders（31/33 → 補全剩餘 2 個）
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.orders.is_archived IS '訂單是否已封存（完成流程自動設定）。fhs_complete_order() 設 true，fhs_uncomplete_order() 設 false（migration 0042）；前端列表預設過濾封存訂單。';
COMMENT ON COLUMN public.orders.is_favorite IS '訂單是否被人工加星標記，供 Dashboard 快速篩選重點訂單，用戶手動切換（updateOrderMeta）。';

-- ─────────────────────────────────────────────
-- Smoke test：確認補寫後零遺漏
-- ─────────────────────────────────────────────
DO $$
DECLARE
    v_missing_count INTEGER;
BEGIN
    SELECT count(*) INTO v_missing_count
    FROM information_schema.columns c
    LEFT JOIN pg_catalog.pg_statio_all_tables st ON st.relname = c.table_name
    LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
    WHERE c.table_schema = 'public'
      AND c.table_name IN (
        'audit_logs','expense_logs','reply_templates','system_config',
        'content_mismatch','ig_messages','ig_watchdog_alerts','message_intents',
        'order_items','orders'
      )
      AND pgd.description IS NULL;

    IF v_missing_count > 0 THEN
        RAISE EXCEPTION 'Migration 0070 未完全覆蓋：仍有 % 個欄位缺 description', v_missing_count;
    END IF;
END $$;
