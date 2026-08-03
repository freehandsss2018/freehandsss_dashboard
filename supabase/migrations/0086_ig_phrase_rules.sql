-- Migration 0086: IG 看門狗學習系統 Phase 2a — 詞句級規則（observe 模式）
-- cl-flow flow_id 2026-08-04-0244，Verdict CONDITIONAL_READY（Fat Mo 口頭批准二段式流程後 /execute）
--
-- 背景：現行學習系統（migration 0084）只能表達「呢單判錯」——規則以 thread 為 key，
-- 只影響單一客人。判斷引擎的真正輸入是 lib/order-match.mjs 內硬編碼 regex（DEAL_RE/
-- QUOTE_RE/INTENT_PATTERNS/CAT_*_RE），Fat Mo 無法在不改代碼、不重部署 n8n 的情況下調整。
-- 本表建立「詞句級」規則：Fat Mo 喺 IG thread 訊息檢視介面點選句子並標語意標籤
-- （deal 成交/quote_draft 報價傾價/noise 唔關事），落地成跨客人生效的全域規則。
--
-- ⚠️ Phase 2a 為 observe 模式：enforce 恆 false，本次不改 order-match.mjs、不改
-- build_n8n_workflow.cjs、不部署 n8n。判斷邏輯零變更，純標註收語料，供 Phase 2b 開
-- enforce 前累積真實語料並量測命中率。0084 rule_scope 欄位已預留 'pattern' 擴展位，
-- 本表即該擴展位的落地（設計為獨立表，非改 0084 表結構）。
--
-- 安全設計（A2/Gemini 對抗評審 BLOCKER #1/#2 修補，見 cl-final-plan.md §4）：
-- 原設計假定「phrase 必須真實出現喺來源訊息」（G3）已足夠防線。實測發現 ig_messages/
-- ig_watchdog_alerts/ig_thread_rules 三表 anon SELECT 全開（pg_policies 2026-08-04 實測
-- 確認），而 anon key 內嵌喺公開 Dashboard HTML——外人可自行 DM 任意文字入庫觸發自己
-- 個 thread 嘅警報，再引用該筆訊息通過 G3，寫入全域抑制規則癱瘓看門狗。修法：規則表
-- 加二段式狀態機（proposed/approved/rejected），anon 只能造 proposed；enforce=true
-- 由 DB CHECK 約束強制要求 status=approved，approved 只有 service_role 可設（見 PART 6）。
-- anon 的停用（PART 5）保留單向：只可 active=false（fail-safe），重啟收歸 service_role
-- （fail-open 方向）——Dashboard 只有 anon key 冇 auth session，全撤 anon 執行權會廢咗
-- Fat Mo 出事時嘅緊急停掣，故非「完全禁止 anon」而係「單向」。
--
-- 資料流向：
--   V42（anon key）→ fhs_add_ig_phrase_rule / fhs_disable_ig_phrase_rule / fhs_preview_ig_phrase RPC
--   Fat Mo（service_role，經 Supabase MCP execute_sql）→ fhs_admin_set_ig_phrase_rule（批准/否決/重啟/開enforce）
--   n8n（service_role，Phase 2b 起）→ fhs_touch_ig_phrase_rules（審計計數器，本次建立零呼叫端）
--
-- 業務表零寫入原則：本表為專用規則 log（比照 0043/0053/0084 先例），非業務表。

-- ============================================================
-- PART 1: 規則表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ig_phrase_rules (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phrase                text NOT NULL,          -- 原文（顯示用，與來源 content 逐字元相同）
    phrase_norm           text NOT NULL,          -- 比對用：lower(btrim(phrase))，內部空白保留
    signal_type           text NOT NULL CHECK (signal_type IN ('deal','quote_draft','noise')),
    match_mode            text NOT NULL DEFAULT 'contains' CHECK (match_mode IN ('contains')),
    status                text NOT NULL DEFAULT 'proposed'
                          CHECK (status IN ('proposed','approved','rejected')),
    enforce               boolean NOT NULL DEFAULT false,
    active                boolean NOT NULL DEFAULT true,
    source_alert_id       uuid REFERENCES public.ig_watchdog_alerts(id) ON DELETE SET NULL,
    source_thread         text NOT NULL,          -- 由 source_alert_id 反查取得，非前端自由傳入
    source_ig_message_id  text NOT NULL,          -- 軟性參照 ig_messages.ig_message_id
    source_excerpt        text,                   -- 來源句快照（已 redactPii 遮罩後），供 90 日 TTL 後審計追溯
    note                  text,
    created_by            text NOT NULL DEFAULT 'operator',
    created_at            timestamptz NOT NULL DEFAULT now(),
    applied_count         integer NOT NULL DEFAULT 0,
    last_applied_at       timestamptz,
    CONSTRAINT ig_phrase_rules_enforce_requires_approval
        CHECK (enforce = false OR status = 'approved')
);

COMMENT ON TABLE public.ig_phrase_rules
    IS 'IG 看門狗學習系統 Phase 2a（cl-flow 2026-08-04-0244）。詞句級全域規則，跨客人生效。二段式狀態機：anon 只能造 proposed，approved 只有 service_role 可設，enforce=true 由 CHECK 約束強制要求 status=approved。';

COMMENT ON COLUMN public.ig_phrase_rules.phrase_norm
    IS '比對契約：phrase_norm = lower(btrim(phrase))，內部空白保留。ig_messages.content 已是 redactPii() 輸出，而 redactPii() 第一步即 toHalfWidth()（order-match.mjs:159），故存庫內容已為半形，DB 端毋須實作 toHalfWidth。Phase 2b 引擎端對應寫法必須是 toHalfWidth(redactPii(text)).toLowerCase().includes(phrase_norm)——比對對象是 redactPii() 之後的文字，唔係原文，否則含 ADDR_UNIT_RE 改寫區段的規則永不命中。';

COMMENT ON COLUMN public.ig_phrase_rules.source_thread
    IS '由 source_alert_id 反查嘅 ig_watchdog_alerts.thread，非前端自由文字參數（同 0084 F3① 護欄）。';

COMMENT ON COLUMN public.ig_phrase_rules.source_excerpt
    IS '來源句快照（left(content,200)，已 redactPii() 遮罩），供 ig_messages 90 日 TTL 清走來源後仍可審計追溯。唔引入新明文，不與 0053 PII 政策衝突。';

COMMENT ON CONSTRAINT ig_phrase_rules_enforce_requires_approval ON public.ig_phrase_rules
    IS 'DB 層強制：enforce=true 一定要 status=approved 先過到，即使上層代碼寫錯都擋得住（A2/#1 BLOCKER 修補核心）。';

-- ============================================================
-- PART 2: 索引
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS ix_ig_phrase_rules_dedup
    ON public.ig_phrase_rules (phrase_norm, signal_type);

CREATE INDEX IF NOT EXISTS ix_ig_phrase_rules_live
    ON public.ig_phrase_rules (signal_type)
    WHERE status = 'approved' AND active;

CREATE INDEX IF NOT EXISTS ix_ig_phrase_rules_source_alert
    ON public.ig_phrase_rules (source_alert_id);

CREATE INDEX IF NOT EXISTS ix_ig_phrase_rules_created_at
    ON public.ig_phrase_rules (created_at DESC);

-- ============================================================
-- PART 3: RLS
-- ============================================================
ALTER TABLE public.ig_phrase_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ig_phrase_rules_anon_select
    ON public.ig_phrase_rules
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 顯式不加 anon INSERT/UPDATE/DELETE policy；寫入一律走下方 RPC（SECURITY DEFINER）。

-- ============================================================
-- PART 4: RPC — fhs_add_ig_phrase_rule（anon，建提案）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_add_ig_phrase_rule(
    p_source_alert_id      uuid,
    p_source_ig_message_id text,
    p_phrase                text,
    p_signal_type            text,
    p_note                   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_thread          text;
    v_content         text;
    v_phrase_trim     text := btrim(p_phrase);
    v_phrase_norm     text;
    v_active_total    int;
    v_active_type     int;
    v_proposed_thread int;
    v_recent_total    int;
BEGIN
    -- G1：signal_type 白名單
    IF p_signal_type NOT IN ('deal','quote_draft','noise') THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: p_signal_type 必須係 deal/quote_draft/noise，收到 %', p_signal_type;
    END IF;

    -- G2：thread 由來源警報反查，前端唔可以自由傳 thread 字串（同 0084 F3①）
    SELECT thread INTO v_thread FROM public.ig_watchdog_alerts WHERE id = p_source_alert_id;
    IF v_thread IS NULL THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: source_alert_id % 查無對應警報或該警報無 thread', p_source_alert_id;
    END IF;

    -- G3：核心護欄——phrase 必須真實出現喺來源訊息（大小寫不敏感，同 phrase_norm 契約一致，
    -- 同時綁定 thread 防止拿 A 客人嘅 alert 配 B 客人嘅 message id）
    SELECT content INTO v_content
    FROM public.ig_messages
    WHERE thread = v_thread AND ig_message_id = p_source_ig_message_id;
    IF v_content IS NULL THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: source_ig_message_id % 喺 thread % 查無對應訊息', p_source_ig_message_id, v_thread;
    END IF;
    IF position(lower(v_phrase_trim) IN lower(v_content)) = 0 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 呢句字喺來源訊息搵唔到，唔可以建規則';
    END IF;

    -- G4：長度 2-40
    IF char_length(v_phrase_trim) < 2 OR char_length(v_phrase_trim) > 40 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 揀嘅字太短或太長（需 2-40 字），收到 % 字', char_length(v_phrase_trim);
    END IF;

    -- G5：純數字拒收（可能係訂號/金額/電話）
    IF v_phrase_trim ~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 純數字唔可以做語意規則';
    END IF;

    -- G6：含方括號一律拒收（PII chip 及其殘片一併擋）
    IF v_phrase_trim ~ '[\[\]]' THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 揀嘅字含遮罩符號，唔可以做規則';
    END IF;

    -- G7：抑制類（quote_draft/noise）誤傷面大，額外收緊 >= 3 字
    IF p_signal_type IN ('quote_draft','noise') AND char_length(v_phrase_trim) < 3 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 抑制類規則（報價/唔關事）最少 3 字';
    END IF;

    -- G8：全表生效規則上限 200（只計 approved+active，未批准嘅提案唔計入）
    SELECT count(*) INTO v_active_total FROM public.ig_phrase_rules WHERE status = 'approved' AND active;
    IF v_active_total >= 200 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 全域生效規則已達上限 200 條';
    END IF;

    -- G9：每 signal_type 生效規則上限 50
    SELECT count(*) INTO v_active_type
    FROM public.ig_phrase_rules WHERE status = 'approved' AND active AND signal_type = p_signal_type;
    IF v_active_type >= 50 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: % 類生效規則已達上限 50 條', p_signal_type;
    END IF;

    -- G11：單一 thread 待審提案上限 5（防止「自己 DM 自己」灌爆，A2/#1+#6 修補）
    SELECT count(*) INTO v_proposed_thread
    FROM public.ig_phrase_rules WHERE source_thread = v_thread AND status = 'proposed';
    IF v_proposed_thread >= 5 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 呢個客人已有 5 條待審提案，請等管理員審批';
    END IF;

    -- G12：全表 24 小時提案速率上限 30（防止批量灌爆，A2/#1+#6 修補）
    SELECT count(*) INTO v_recent_total
    FROM public.ig_phrase_rules WHERE created_at > now() - interval '24 hours';
    IF v_recent_total >= 30 THEN
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 過去 24 小時提案數已達上限 30 條，請稍後再試';
    END IF;

    v_phrase_norm := lower(v_phrase_trim);

    BEGIN
        INSERT INTO public.ig_phrase_rules (
            phrase, phrase_norm, signal_type, status, enforce, active,
            source_alert_id, source_thread, source_ig_message_id, source_excerpt, note
        ) VALUES (
            v_phrase_trim, v_phrase_norm, p_signal_type, 'proposed', false, true,
            p_source_alert_id, v_thread, p_source_ig_message_id, left(v_content, 200), p_note
        );
    EXCEPTION WHEN unique_violation THEN
        -- G10
        RAISE EXCEPTION 'fhs_add_ig_phrase_rule: 呢句已經有同類規則（重複）';
    END;
END;
$$;

COMMENT ON FUNCTION public.fhs_add_ig_phrase_rule(uuid, text, text, text, text)
    IS 'V42 前端呼叫，建立 IG 看門狗全域詞句規則提案（status=proposed，enforce 恆 false）。G1-G12 護欄逐條見函式體註解，核心係 G3（phrase 必須真實出現喺來源訊息）防止 anon key 持有者塞任意字串癱瘓看門狗。';

GRANT EXECUTE ON FUNCTION public.fhs_add_ig_phrase_rule(uuid, text, text, text, text)
    TO anon, authenticated;

-- ============================================================
-- PART 5: RPC — fhs_disable_ig_phrase_rule（anon，單向停用）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_disable_ig_phrase_rule(
    p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ig_phrase_rules SET active = false WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION public.fhs_disable_ig_phrase_rule(uuid)
    IS 'V42 前端呼叫，停用（唔可重啟）IG 看門狗全域詞句規則。刻意單向：只做 active=false，冇參數可傳 true。Dashboard 只有 anon key 冇 auth session，撤晒 anon 執行權會廢咗 Fat Mo 出事時嘅緊急停掣；停用屬 fail-safe 方向（最壞後果=退回今日行為），重啟（fail-open 方向）收歸 service_role 走 fhs_admin_set_ig_phrase_rule（A2/#2 修補）。';

GRANT EXECUTE ON FUNCTION public.fhs_disable_ig_phrase_rule(uuid)
    TO anon, authenticated;

-- ============================================================
-- PART 6: RPC — fhs_admin_set_ig_phrase_rule（service_role only，批准/否決/重啟/開enforce）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_admin_set_ig_phrase_rule(
    p_id       uuid,
    p_status   text DEFAULT NULL,
    p_active   boolean DEFAULT NULL,
    p_enforce  boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_status IS NOT NULL AND p_status NOT IN ('proposed','approved','rejected') THEN
        RAISE EXCEPTION 'fhs_admin_set_ig_phrase_rule: p_status 必須係 proposed/approved/rejected，收到 %', p_status;
    END IF;

    UPDATE public.ig_phrase_rules
    SET status  = COALESCE(p_status, status),
        active  = COALESCE(p_active, active),
        enforce = COALESCE(p_enforce, enforce)
    WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION public.fhs_admin_set_ig_phrase_rule(uuid, text, boolean, boolean)
    IS 'service_role 專用管理員函式：批准/否決提案、重啟已停用規則、開關 enforce。三個參數皆 optional，NULL=唔改動該欄。DB CHECK 約束 ig_phrase_rules_enforce_requires_approval 保證 enforce=true 一定要 status=approved 先過到。刻意唔畀 anon/authenticated（見下方 REVOKE），批准/重啟屬 fail-open 方向（A2/#1+#2 修補）。';

GRANT EXECUTE ON FUNCTION public.fhs_admin_set_ig_phrase_rule(uuid, text, boolean, boolean)
    TO service_role;
REVOKE EXECUTE ON FUNCTION public.fhs_admin_set_ig_phrase_rule(uuid, text, boolean, boolean)
    FROM anon, authenticated, PUBLIC;

-- ============================================================
-- PART 7: RPC — fhs_touch_ig_phrase_rules（service_role only，審計計數器）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_touch_ig_phrase_rules(
    p_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ig_phrase_rules
    SET applied_count = applied_count + 1, last_applied_at = now()
    WHERE id = ANY(p_ids);
END;
$$;

COMMENT ON FUNCTION public.fhs_touch_ig_phrase_rules(uuid[])
    IS 'n8n service_role 呼叫（Phase 2b 接引擎後使用；Phase 2a 本函式建立但零呼叫端）。規則喺 Classify 節點實際生效時累加 applied_count（審計用）。刻意唔 GRANT anon，防前端灌水審計數字（照 0084 PART 6 同一模式）。';

GRANT EXECUTE ON FUNCTION public.fhs_touch_ig_phrase_rules(uuid[])
    TO service_role;
REVOKE EXECUTE ON FUNCTION public.fhs_touch_ig_phrase_rules(uuid[])
    FROM anon, authenticated, PUBLIC;

-- ============================================================
-- PART 8: RPC — fhs_preview_ig_phrase（anon，建規則前影響預覽）
-- ============================================================
CREATE OR REPLACE FUNCTION public.fhs_preview_ig_phrase(
    p_phrase text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phrase_norm text := lower(btrim(p_phrase));
    v_hit_messages int;
    v_hit_threads  int;
    v_samples      jsonb;
BEGIN
    IF char_length(v_phrase_norm) < 2 THEN
        RETURN jsonb_build_object('error', 'too_short');
    END IF;

    SELECT count(*), count(DISTINCT thread)
    INTO v_hit_messages, v_hit_threads
    FROM public.ig_messages
    WHERE sent_at > now() - interval '90 days'
      AND position(v_phrase_norm IN lower(content)) > 0;

    SELECT jsonb_agg(jsonb_build_object('excerpt', left(s.content, 60), 'sent_at', s.sent_at))
    INTO v_samples
    FROM (
        SELECT content, sent_at
        FROM public.ig_messages
        WHERE sent_at > now() - interval '90 days'
          AND position(v_phrase_norm IN lower(content)) > 0
        ORDER BY sent_at DESC
        LIMIT 3
    ) s;

    RETURN jsonb_build_object(
        'hit_messages', v_hit_messages,
        'hit_threads', v_hit_threads,
        'samples', COALESCE(v_samples, '[]'::jsonb)
    );
END;
$$;

COMMENT ON FUNCTION public.fhs_preview_ig_phrase(text)
    IS '建規則前嘅影響預覽：查 90 日內 ig_messages 命中則數/客人數 + 3 條例句。用 position() 精確子字串比對（同 G3 護欄單一真源，兩側 lower() 大小寫不敏感），刻意唔用 PostgREST ilike（值含 ,.() 會破壞 query string；使用者揀嘅句子含 %/_ 會被當 SQL LIKE wildcard 造成命中數虛高）。隱私評估：唔新增洩漏面，ig_messages RLS 本來就 anon 可讀全表（0053 PART 3），content 已 redactPii() 遮罩。';

GRANT EXECUTE ON FUNCTION public.fhs_preview_ig_phrase(text)
    TO anon, authenticated;

-- ============================================================
-- PART 9: TTL 清理 job（pg_cron，比照 0043/0053/0084 模式）
-- 已停用且未曾批准過嘅規則超過 180 天自動清理；已批准過嘅規則（即使現已停用）保留審計價值，永不自動刪
-- ============================================================
SELECT cron.schedule(
    'delete-old-inactive-ig-phrase-rules',
    '0 3 * * *',      -- 每日 03:00 UTC（= 11:00 HKT），與 igwatch_alerts/ig_messages/ig_thread_rules 清理同時段
    $$DELETE FROM public.ig_phrase_rules
      WHERE active = false
        AND status <> 'approved'
        AND created_at < now() - interval '180 days'$$
);
