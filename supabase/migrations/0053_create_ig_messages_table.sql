-- Migration 0053: IG 訊息入庫表（P2a，S150 §4.8 剝離範圍獨立 /cl-flow，flow_id 2026-07-13-1224）
-- Session 171, 2026-07-13
--
-- 背景：IG 看門狗 v3（workflow D4LK6VrQbiXlju0V）目前只把「已分類判定結果」寫入
-- ig_watchdog_alerts（migration 0043），原始訊息文字只存在 n8n execution 記憶體，未落地。
-- 本表把 Parse Inbox 節點已組好的 orderMsgs（每則新訊息）持久化，供後續 P2b 內容比對層
-- 與 P2c 意圖標註使用。入庫前訊息內容經 lib/order-match.mjs redactPii() 遮罩處理，
-- 不落地未遮罩明文（PII 明文剝離政策，見 cl-final-plan §6.1）。
--
-- 資料流向（單向，比照 migration 0043 模式）：
--   n8n（service_role key）→ ig_messages INSERT（冪等，ig_message_id 唯一鍵）
--   V42（anon key）← ig_messages SELECT（唯讀，未來 P2b/P2c UI 若需要才用）
--
-- 業務表零寫入原則：本表為專用訊息 log（比照 ig_watchdog_alerts 先例），非業務表。

-- ============================================================
-- PART 1: 訊息表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ig_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ig_message_id       text NOT NULL,                  -- 冪等鍵：thread + 時間戳組合（IG 匯出無穩定訊息 ID，見 PART 2 註記）
    thread              text NOT NULL,                  -- IG thread 資料夾名稱（比照 ig_watchdog_alerts.thread）
    sender_is_business  boolean NOT NULL DEFAULT false,  -- 是否商家自發（isBusiness() 判定結果透傳）
    customer_name       text,
    content             text NOT NULL,                  -- redactPii() 處理後文字，禁止存未遮罩明文
    pii_policy_applied  text NOT NULL DEFAULT 'regex_v1', -- 遮罩策略版本（未來規則變動可追溯）
    has_receipt         boolean NOT NULL DEFAULT false,
    sent_at             timestamptz NOT NULL,           -- 來源 m.timestamp_ms 轉換
    order_id            text,                            -- extractOrderIds() 抽得的訂號（NULL=無可信訂號），非 FK（比照 ig_watchdog_alerts.order_id 設計，訂號可能查無對應 order）
    created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ig_messages
    IS 'IG 看門狗 v3 P2a 訊息入庫（Session 171）。n8n service_role 寫入，V42 anon 只讀。content 一律已經 redactPii() 遮罩，不存明文。';

COMMENT ON COLUMN public.ig_messages.content
    IS '已經 lib/order-match.mjs redactPii() 遮罩處理的訊息文字；嚴禁寫入未處理明文（PII 政策，cl-final-plan 2026-07-13-1224 §6.1）';

COMMENT ON COLUMN public.ig_messages.ig_message_id
    IS 'Meta DYI 匯出無穩定訊息級 ID，冪等鍵組成＝thread+timestamp_ms+sender（n8n 端組字串），非 IG 平台原生 ID';

-- ============================================================
-- PART 2: 索引
-- ============================================================
-- 冪等鍵：同一訊息（thread+ig_message_id）最多一筆，防重複匯出重複入庫
CREATE UNIQUE INDEX IF NOT EXISTS ix_ig_messages_dedup
    ON public.ig_messages (thread, ig_message_id);

CREATE INDEX IF NOT EXISTS ix_ig_messages_order_id
    ON public.ig_messages (order_id)
    WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ig_messages_sent_at
    ON public.ig_messages (sent_at DESC);

-- ============================================================
-- PART 3: RLS
-- ============================================================
ALTER TABLE public.ig_messages ENABLE ROW LEVEL SECURITY;

-- anon / authenticated：只讀（V42 未來 P2b/P2c UI 若需要查詢原文用）
CREATE POLICY ig_messages_anon_select
    ON public.ig_messages
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- service_role 預設 bypass RLS（n8n 寫入用）。顯式不加 anon INSERT/UPDATE/DELETE policy，
-- 防止前端偽造或竄改訊息記錄（比照 ig_watchdog_alerts 先例）。

-- ============================================================
-- PART 4: TTL 清理 job（pg_cron，比照 migration 0043 模式，PII 保留期落地）
-- ============================================================
SELECT cron.schedule(
    'delete-old-ig-messages',
    '0 3 * * *',      -- 每日 03:00 UTC（= 11:00 HKT），與 igwatch_alerts 清理同時段
    $$DELETE FROM public.ig_messages
      WHERE created_at < now() - interval '90 days'$$
);
