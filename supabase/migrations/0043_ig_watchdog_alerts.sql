-- Migration 0043: IG 看門狗警報表（單向事件資料鏈 Phase 1a）
-- Session 119, 2026-06-23
--
-- 背景：IG 看門狗 v3（workflow D4LK6VrQbiXlju0V）每日 06:00 HKT Cron 掃描 IG 匯出，
-- 分三類（created_full 靜默 / created_incomplete 資訊不齊通知 / not_created 未建立通知）
-- → Telegram 純文字推播。本 migration 打通「Supabase 持久化」層，使警報可查、可追蹤。
--
-- 資料流向（單向）：
--   n8n（service_role key）→ ig_watchdog_alerts INSERT（冪等）
--   V42（anon key）← ig_watchdog_alerts SELECT
--   V42（anon key）→ fhs_resolve_ig_alert RPC（SECURITY DEFINER，只改 resolved 三欄）
--
-- 業務表零寫入原則：本表為專用警報 log，非業務表，為既有原則的例外豁免（S119 決策 Q4）。

-- ============================================================
-- PART 1: 警報表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ig_watchdog_alerts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_date      date NOT NULL,                     -- Cron 跑日（匯出覆蓋日）
    order_id        text,                              -- FHS string（非 UUID），NULL = 弱訊號/無訂號
    kind            text NOT NULL CHECK (kind IN ('not_created', 'created_incomplete')),
    category        text,                              -- classifyMessage 原始 category 值
    customer_name   text,
    snippet         text,                              -- om.text 前 40 字摘要
    thread          text,                              -- IG thread 資料夾名稱（追蹤來源）
    has_receipt     boolean DEFAULT false,             -- 是否含收據 photo metadata（唯讀偵測）
    db_matched      boolean DEFAULT false,             -- order_id 是否在 Supabase orders 找到
    raw             jsonb,                             -- 完整事件 payload（PX 風險1緩解：供人工雙確認）
    resolved        boolean NOT NULL DEFAULT false,
    resolved_at     timestamptz,
    resolved_by     text,
    created_at      timestamptz NOT NULL DEFAULT now()
    -- 冪等鍵由 expression index 實現（見 PART 2），PostgreSQL CONSTRAINT 不支援函式表達式（COALESCE）
);

COMMENT ON TABLE public.ig_watchdog_alerts
    IS 'IG 看門狗 v3 每日警報記錄（Session 119）。n8n service_role 寫入，V42 anon 只讀，resolve 走 RPC。';

COMMENT ON COLUMN public.ig_watchdog_alerts.order_id
    IS 'FHS 訂單編號字串（非 Supabase UUID）；NULL 表示該訊息無可識別訂號（弱訊號）';

COMMENT ON COLUMN public.ig_watchdog_alerts.raw
    IS '完整 notify item payload（om + cls），供人工雙確認匹配正確性';

-- ============================================================
-- PART 2: 索引
-- ============================================================
-- 冪等鍵（expression index）：同一 Cron 日 + thread + order_id + kind 最多一筆
-- COALESCE(order_id,'') 令 NULL order_id 也能參與唯一性比對
CREATE UNIQUE INDEX IF NOT EXISTS ix_igwatch_alerts_dedup
    ON public.ig_watchdog_alerts (alert_date, thread, COALESCE(order_id, ''), kind);

CREATE INDEX IF NOT EXISTS ix_igwatch_alerts_resolved_date
    ON public.ig_watchdog_alerts (resolved, alert_date DESC);

CREATE INDEX IF NOT EXISTS ix_igwatch_alerts_order_id
    ON public.ig_watchdog_alerts (order_id)
    WHERE order_id IS NOT NULL;

-- ============================================================
-- PART 3: RLS
-- ============================================================
ALTER TABLE public.ig_watchdog_alerts ENABLE ROW LEVEL SECURITY;

-- anon / authenticated：只讀（V42 前端用 anon key 查詢）
CREATE POLICY igwatch_anon_select
    ON public.ig_watchdog_alerts
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- service_role 預設 bypass RLS，享有完整存取（n8n 批量寫入用）。
-- 顯式不加 INSERT policy → anon 無法偽造 alert（PX 風險 2 緩解）。

-- ============================================================
-- PART 4: SECURITY DEFINER RPC（resolved 回寫，Q2 決策）
-- 僅改 resolved 三欄，anon 無法直接 UPDATE 其他欄位（PX 風險 5 緩解）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_resolve_ig_alert(
    p_id        uuid,
    p_resolved  boolean,
    p_by        text DEFAULT 'operator'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ig_watchdog_alerts
    SET
        resolved    = p_resolved,
        resolved_at = CASE WHEN p_resolved THEN now() ELSE NULL END,
        resolved_by = CASE WHEN p_resolved THEN p_by  ELSE NULL END
    WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION public.fhs_resolve_ig_alert(uuid, boolean, text)
    IS 'V42 前端呼叫，標記/取消標記 IG 看門狗警報已處理。SECURITY DEFINER 僅允許修改 resolved 三欄。';

-- anon 與 authenticated 可呼叫（函式以 owner 身份執行，不繞過表層 RLS）
GRANT EXECUTE ON FUNCTION public.fhs_resolve_ig_alert(uuid, boolean, text)
    TO anon, authenticated;

-- ============================================================
-- PART 5: TTL 清理 job（pg_cron，複用 S87 error_logs 模式）
-- 已處理且超過 90 天的警報自動清理；未處理者永不自動刪
-- ============================================================
SELECT cron.schedule(
    'delete-old-resolved-igwatch-alerts',
    '0 3 * * *',      -- 每日 03:00 UTC（= 11:00 HKT），低流量時段
    $$DELETE FROM public.ig_watchdog_alerts
      WHERE resolved = true
        AND resolved_at < now() - interval '90 days'$$
);