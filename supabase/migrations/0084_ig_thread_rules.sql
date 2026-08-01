-- Migration 0084: IG 看門狗學習系統 Phase 1（thread 級規則覆寫表 + RPC）
-- Session 2026-08-01，cl-flow flow_id 2026-07-31-2332 Phase C
--
-- 背景：Fat Mo 可喺 IG 看門狗警報 thread 檢視介面修正 AI 判斷（假警報 / 分類判錯），
-- 修正記錄落結構化規則表，以 thread 為 key 做覆寫層，order-match.mjs 判斷前先查表，
-- 同一客人未來警報自動套用修正（可審計：每條規則可見來源警報、生效次數、最後生效時間）。
--
-- F3 護欄（fresh-context 覆核 2026-07-31 揪出）：新增規則必須綁定真實存在嘅來源警報
-- （source_alert_id），thread 由該警報行反查取得，前端唔可以自由傳 thread 字串直接建規則——
-- 否則持 anon key 者可讀 ig_messages 全部 thread 名，批量建 false_alarm 規則永久靜默看門狗
-- （fail-open 攻擊面）。另加每 thread active 規則上限 3 條，防單一 thread 規則無限累積。
--
-- 資料流向（比照 migration 0043/0053 模式）：
--   V42（anon key）→ fhs_add_ig_thread_rule / fhs_toggle_ig_thread_rule RPC（SECURITY DEFINER）
--   n8n（anon key，唯讀）← 每次執行 SELECT active 規則
--   n8n（service_role key）→ fhs_touch_ig_thread_rules RPC（審計計數器，唔畀 anon 灌水）
--
-- 業務表零寫入原則：本表為專用規則 log（比照 ig_watchdog_alerts/ig_messages 先例），非業務表。

-- ============================================================
-- PART 1: 規則表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ig_thread_rules (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread          text NOT NULL,                     -- 由 source_alert_id 反查取得，非前端自由傳入
    rule_type       text NOT NULL CHECK (rule_type IN ('false_alarm', 'kind_correction')),
    from_kind       text,                               -- kind_correction 必填；false_alarm 可 NULL（該 thread 全部抑制）
    to_kind         text CHECK (to_kind IS NULL OR to_kind IN ('not_created', 'created_incomplete', 'content_mismatch')),
    rule_scope      text NOT NULL DEFAULT 'thread',      -- 擴展位：未來 Phase 2 'pattern' / 'few_shot'，本輪只用 'thread'
    source_alert_id uuid REFERENCES public.ig_watchdog_alerts(id) ON DELETE SET NULL,
    note            text,
    active          boolean NOT NULL DEFAULT true,
    created_by      text NOT NULL DEFAULT 'operator',
    created_at      timestamptz NOT NULL DEFAULT now(),
    applied_count   integer NOT NULL DEFAULT 0,          -- 可審計：規則影響過幾多次判斷
    last_applied_at timestamptz
);

COMMENT ON TABLE public.ig_thread_rules
    IS 'IG 看門狗學習系統 Phase 1（cl-flow 2026-07-31-2332）。Fat Mo 修正 AI 判斷落地，thread 級覆寫，order-match.mjs 判斷前查表。n8n service_role 寫 applied_count，V42 anon 經 RPC 建/停用規則。';

COMMENT ON COLUMN public.ig_thread_rules.thread
    IS '由 source_alert_id 反查嘅 ig_watchdog_alerts.thread，非前端自由文字參數（F3 護欄：防止 anon 憑空 thread 名建規則批量靜默警報）';

COMMENT ON COLUMN public.ig_thread_rules.rule_scope
    IS '本輪只用 thread（thread 級覆寫）；擴展位供未來 Phase 2 few-shot/LLM 判斷層或樣式匹配使用';

-- ============================================================
-- PART 2: 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS ix_ig_thread_rules_thread_active
    ON public.ig_thread_rules (thread)
    WHERE active;

CREATE INDEX IF NOT EXISTS ix_ig_thread_rules_source_alert
    ON public.ig_thread_rules (source_alert_id);

-- ============================================================
-- PART 3: RLS
-- ============================================================
ALTER TABLE public.ig_thread_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ig_thread_rules_anon_select
    ON public.ig_thread_rules
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 顯式不加 anon INSERT/UPDATE/DELETE policy；寫入一律走下方 RPC（SECURITY DEFINER）。

-- ============================================================
-- PART 4: RPC — fhs_add_ig_thread_rule
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_add_ig_thread_rule(
    p_source_alert_id  uuid,
    p_rule_type        text,
    p_from_kind        text DEFAULT NULL,
    p_to_kind          text DEFAULT NULL,
    p_note             text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_thread text;
    v_active_count int;
BEGIN
    IF p_rule_type NOT IN ('false_alarm', 'kind_correction') THEN
        RAISE EXCEPTION 'fhs_add_ig_thread_rule: p_rule_type 必須係 false_alarm 或 kind_correction，收到 %', p_rule_type;
    END IF;

    -- F3 護欄①：thread 一律由來源警報行反查，前端唔可以自由傳 thread 字串
    SELECT thread INTO v_thread FROM public.ig_watchdog_alerts WHERE id = p_source_alert_id;
    IF v_thread IS NULL THEN
        RAISE EXCEPTION 'fhs_add_ig_thread_rule: source_alert_id % 查無對應警報或該警報無 thread', p_source_alert_id;
    END IF;

    -- F3 護欄②：每 thread active 規則上限 3 條
    SELECT count(*) INTO v_active_count FROM public.ig_thread_rules WHERE thread = v_thread AND active;
    IF v_active_count >= 3 THEN
        RAISE EXCEPTION 'fhs_add_ig_thread_rule: thread % 已有 % 條 active 規則，達上限 3 條，請先停用舊規則', v_thread, v_active_count;
    END IF;

    IF p_rule_type = 'kind_correction' THEN
        IF p_to_kind IS NULL THEN
            RAISE EXCEPTION 'fhs_add_ig_thread_rule: kind_correction 必須提供 p_to_kind';
        END IF;
        UPDATE public.ig_watchdog_alerts
        SET kind = p_to_kind, category = p_to_kind
        WHERE id = p_source_alert_id;
    ELSIF p_rule_type = 'false_alarm' THEN
        UPDATE public.ig_watchdog_alerts
        SET resolved = true, resolved_at = now(), resolved_by = 'operator:false_alarm_rule'
        WHERE id = p_source_alert_id;
    END IF;

    INSERT INTO public.ig_thread_rules (thread, rule_type, from_kind, to_kind, source_alert_id, note)
    VALUES (v_thread, p_rule_type, p_from_kind, p_to_kind, p_source_alert_id, p_note);
END;
$$;

COMMENT ON FUNCTION public.fhs_add_ig_thread_rule(uuid, text, text, text, text)
    IS 'V42 前端呼叫，建立 IG 看門狗學習規則（thread 由來源警報反查，非自由參數；每 thread 上限 3 條 active）。SECURITY DEFINER 同步更新來源警報 kind/resolved。';

GRANT EXECUTE ON FUNCTION public.fhs_add_ig_thread_rule(uuid, text, text, text, text)
    TO anon, authenticated;

-- ============================================================
-- PART 5: RPC — fhs_toggle_ig_thread_rule
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_toggle_ig_thread_rule(
    p_id      uuid,
    p_active  boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ig_thread_rules
    SET active = p_active
    WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION public.fhs_toggle_ig_thread_rule(uuid, boolean)
    IS 'V42 前端呼叫，停用/重啟 IG 看門狗學習規則。uuid-gated（唔支援憑 thread 名批量操作），停用=警報重現屬 fail-safe 方向。';

GRANT EXECUTE ON FUNCTION public.fhs_toggle_ig_thread_rule(uuid, boolean)
    TO anon, authenticated;

-- ============================================================
-- PART 6: RPC — fhs_touch_ig_thread_rules（service_role only，審計計數器）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_touch_ig_thread_rules(
    p_ids  uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ig_thread_rules
    SET applied_count = applied_count + 1, last_applied_at = now()
    WHERE id = ANY(p_ids);
END;
$$;

COMMENT ON FUNCTION public.fhs_touch_ig_thread_rules(uuid[])
    IS 'n8n service_role 呼叫，規則喺 Classify 節點實際生效時累加 applied_count（審計用）。刻意唔 GRANT anon，防前端灌水審計數字。';

GRANT EXECUTE ON FUNCTION public.fhs_touch_ig_thread_rules(uuid[])
    TO service_role;

-- ============================================================
-- PART 7: TTL 清理 job（pg_cron，比照 migration 0043/0053 模式）
-- 已停用超過 180 天嘅規則自動清理；active 規則永不自動刪
-- ============================================================
SELECT cron.schedule(
    'delete-old-inactive-ig-thread-rules',
    '0 3 * * *',      -- 每日 03:00 UTC（= 11:00 HKT），與 igwatch_alerts/ig_messages 清理同時段
    $$DELETE FROM public.ig_thread_rules
      WHERE active = false
        AND created_at < now() - interval '180 days'$$
);
