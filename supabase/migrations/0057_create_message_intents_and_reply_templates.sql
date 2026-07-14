-- Migration 0057: 意圖標註 + 回覆範本庫（P2c，S150 §4.8 剝離範圍獨立 /cl-flow，flow_id 2026-07-13-1224）
-- Session 173, 2026-07-13
--
-- 背景：P2a 已把 IG 訊息（遮罩後）存入 ig_messages。本表把 lib/order-match.mjs 新增的
-- tagIntent() regex 分類結果落地（cancel/complaint/modify_order/payment_inquiry/place_order
-- 5 類，見 cl-final-plan §6.3 P2c 段），供未來人工覆核與回覆範本比對使用。
--
-- 編號調整（原計畫書寫 0056，執行時發現已被同日另案 task_e3a60daa（D33，Write Alerts
-- on_conflict 修復）佔用，改用 0057，不影響設計本體）。
--
-- 設計調整（比照 P2b/migration 0054 已審查通過的先例，非本次新開先例）：計畫書原文寫
-- message_intents.message_id 為 FK→ig_messages，但現行 n8n 寫入模式是 REST POST 批量
-- fire-and-forget（不取回 INSERT 產生的 UUID），P2b 已因同一理由改用 message_thread +
-- message_ig_message_id 軟性參照（見 migration 0054 PART1 註記），本表沿用同一模式，
-- 避免為 P2c 另開一套需要往返取 UUID 的寫入機制。
--
-- 資料流向（單向，比照 migration 0043/0053/0054 模式）：
--   n8n（service_role key）→ message_intents INSERT（冪等，見 PART 2）
--   V42（anon key）← message_intents SELECT（唯讀，供未來 UI 若需要才用）
--   reply_templates：人工維護種子資料（本 migration 一併寫入），非 pipeline 寫入對象。

-- ============================================================
-- PART 1: 意圖標註表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_intents (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_date             date NOT NULL,                   -- Cron 跑日（比照 content_mismatch.alert_date）
    message_thread         text NOT NULL,                   -- IG thread 資料夾名稱
    message_ig_message_id  text NOT NULL,                   -- 軟性參照 ig_messages.ig_message_id（hashId 雜湊值）
    intent_label           text NOT NULL CHECK (intent_label IN
        ('cancel', 'complaint', 'modify_order', 'payment_inquiry', 'place_order')),
    matched_regex          text NOT NULL,                   -- 命中的 regex pattern 原始碼（re.source，供未來調校規則庫追溯）
    is_primary             boolean NOT NULL DEFAULT false,   -- tagIntent() 命中陣列第一個（優先序見 lib 註記）
    created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.message_intents
    IS 'P2c 意圖標註記錄（Session 173）。n8n service_role 寫入，V42 anon 只讀。一則訊息可能命中多個意圖，各自一列，is_primary 標記優先序最高者。regex-first 零 LLM 起步，覆蓋率不足時才評估升級（見 cl-final-plan §6.5）。';

COMMENT ON COLUMN public.message_intents.matched_regex
    IS '記錄命中的 INTENT_PATTERNS regex pattern 原始碼（re.source），供未來人工覆核/調校規則庫命中率使用。';

-- ============================================================
-- PART 2: 索引
-- ============================================================
-- 冪等鍵：同一 Cron 日 + 同一訊息 + 同一意圖標籤 最多一筆
CREATE UNIQUE INDEX IF NOT EXISTS ix_message_intents_dedup
    ON public.message_intents (alert_date, message_thread, message_ig_message_id, intent_label);

CREATE INDEX IF NOT EXISTS ix_message_intents_label
    ON public.message_intents (intent_label);

CREATE INDEX IF NOT EXISTS ix_message_intents_created_at
    ON public.message_intents (created_at DESC);

-- ============================================================
-- PART 3: RLS（意圖標註表）
-- ============================================================
ALTER TABLE public.message_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_intents_anon_select
    ON public.message_intents
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- service_role 預設 bypass RLS（n8n 寫入用）。顯式不加 anon INSERT/UPDATE/DELETE policy。

-- ============================================================
-- PART 4: 回覆範本庫（人工維護靜態設定表，非 pipeline 寫入對象）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reply_templates (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name            text NOT NULL UNIQUE,
    associated_intent_label  text NOT NULL CHECK (associated_intent_label IN
        ('cancel', 'complaint', 'modify_order', 'payment_inquiry', 'place_order')),
    template_content         text NOT NULL,
    is_active                boolean NOT NULL DEFAULT true,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reply_templates
    IS 'P2c 回覆範本庫（Session 173）。人工維護種子資料，非 n8n pipeline 寫入對象；本 migration 寫入 5 類意圖各 1 筆草稿種子，文案為佔位草稿，正式上線前需 Fat Mo 覆核修訂。';

ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY reply_templates_anon_select
    ON public.reply_templates
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 種子資料：5 類意圖各 1 筆草稿範本（佔位文案，非正式對客文案，上線前需人工覆核）
INSERT INTO public.reply_templates (template_name, associated_intent_label, template_content, is_active)
VALUES
    ('cancel_default', 'cancel',
     '你好，已收到你想取消訂單嘅訊息。可以麻煩你提供訂單編號，我哋會盡快為你處理，如已開始製作可能需要另行商討安排，請見諒🙏', true),
    ('complaint_default', 'complaint',
     '你好，非常抱歉為你帶嚟唔好嘅體驗🙏 可以麻煩你提供訂單編號同詳細情況（可附相片），我哋會盡快跟進處理。', true),
    ('modify_order_default', 'modify_order',
     '你好，收到你想修改訂單嘅要求。可以麻煩你提供訂單編號同想修改嘅內容，我哋核對後會盡快回覆你是否可以更改。', true),
    ('payment_inquiry_default', 'payment_inquiry',
     '你好，關於付款事宜，可以麻煩你提供訂單編號，我哋核對記錄後會盡快回覆你。', true),
    ('place_order_default', 'place_order',
     '你好，多謝你落單！我哋會盡快為你確認訂單內容，請留意稍後嘅訂單確認訊息🙏', true)
ON CONFLICT (template_name) DO NOTHING;

-- ============================================================
-- PART 5: TTL 清理 job（僅 message_intents，比照 migration 0043/0053/0054 模式；
-- reply_templates 為長期維護的設定資料，不設 TTL）
-- ============================================================
SELECT cron.schedule(
    'delete-old-message-intents',
    '0 3 * * *',
    $$DELETE FROM public.message_intents
      WHERE created_at < now() - interval '90 days'$$
);
