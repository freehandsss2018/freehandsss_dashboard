-- Migration 0054: 內容比對層證據表（P2b，S150 §4.8 剝離範圍獨立 /cl-flow，flow_id 2026-07-13-1224）
-- Session 171, 2026-07-13
--
-- 背景：P2a 已把 IG 訊息（遮罩後）存入 ig_messages。本表記錄「訊息提及金額 vs 訂單實際
-- 記錄金額」的比對證據（v1 誠實收窄僅做 amount_mismatch——item_mismatch 需要 order_items
-- 明細，現行 n8n Fetch Orders 節點未攞，留待未來擴充）。
--
-- 職責分工：本表＝比對證據記錄（含具體金額數字，供人工追查）；操作/解決狀態＝寫一筆鏡像
-- 至既有 ig_watchdog_alerts（kind='content_mismatch'，見 migration 0055），複用既有
-- fhs_resolve_ig_alert RPC + V42 UI，避免雙軌 resolved 狀態 drift——本表不設 resolved 欄位。
--
-- 資料流向（單向，比照 migration 0043/0053 模式）：
--   n8n（service_role key）→ content_mismatch INSERT（冪等，見 PART 2）
--   V42（anon key）← content_mismatch SELECT（唯讀，供未來 UI 需要時查詢具體金額）
--
-- 軟性參照（非 FK）：order_id / message_ig_message_id 均為文字欄位，非外鍵約束——比照
-- ig_watchdog_alerts.order_id 既有設計（訂號可能查無對應 order；ig_message_id 若改用複合
-- 唯一鍵會令 FK 複雜化，soft reference 已足夠人工追查用途）。

-- ============================================================
-- PART 1: 比對證據表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_mismatch (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_date            date NOT NULL,                   -- Cron 跑日（比照 ig_watchdog_alerts.alert_date）
    order_id              text NOT NULL,                    -- FHS 訂單編號字串（非 UUID，軟性參照）
    message_thread        text NOT NULL,                    -- IG thread 資料夾名稱
    message_ig_message_id text NOT NULL,                    -- 軟性參照 ig_messages.ig_message_id（hashId 雜湊值）
    mismatch_type         text NOT NULL CHECK (mismatch_type IN ('amount_mismatch')), -- v1 僅此一值，未來擴充需新 migration（約束反映現實）
    ig_reported_amount    numeric NOT NULL,
    db_actual_amount      numeric NOT NULL,
    is_false_positive     boolean NOT NULL DEFAULT false,   -- 人工事後標記（獨立於 ig_watchdog_alerts.resolved 工作流狀態）
    created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.content_mismatch
    IS 'P2b 內容比對層證據記錄（Session 171）。n8n service_role 寫入，V42 anon 只讀。操作/解決狀態走 ig_watchdog_alerts 鏡像列（kind=content_mismatch），本表不重複追蹤 resolved。';

COMMENT ON COLUMN public.content_mismatch.mismatch_type
    IS 'v1 僅 amount_mismatch（金額比對）。item_mismatch（品項比對）需 order_items 明細，現行 pipeline 未攞，刻意不做假比對，留待未來擴充。';

COMMENT ON COLUMN public.content_mismatch.is_false_positive
    IS '人工事後標記「呢次判定係咪誤報」，供未來調整 lib/order-match.mjs compareToOrder() 閾值時參考；獨立於 ig_watchdog_alerts.resolved（後者是「已處理」工作流狀態，非「判定是否正確」）。';

-- ============================================================
-- PART 2: 索引
-- ============================================================
-- 冪等鍵：同一 Cron 日 + 同一訊息 + 同一比對類型 最多一筆
CREATE UNIQUE INDEX IF NOT EXISTS ix_content_mismatch_dedup
    ON public.content_mismatch (alert_date, message_thread, message_ig_message_id, mismatch_type);

CREATE INDEX IF NOT EXISTS ix_content_mismatch_order_id
    ON public.content_mismatch (order_id);

CREATE INDEX IF NOT EXISTS ix_content_mismatch_created_at
    ON public.content_mismatch (created_at DESC);

-- ============================================================
-- PART 3: RLS
-- ============================================================
ALTER TABLE public.content_mismatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_mismatch_anon_select
    ON public.content_mismatch
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- service_role 預設 bypass RLS（n8n 寫入用）。顯式不加 anon INSERT/UPDATE/DELETE policy。

-- ============================================================
-- PART 4: TTL 清理 job（pg_cron，比照 migration 0043/0053 模式）
-- ============================================================
SELECT cron.schedule(
    'delete-old-content-mismatch',
    '0 3 * * *',
    $$DELETE FROM public.content_mismatch
      WHERE created_at < now() - interval '90 days'$$
);
