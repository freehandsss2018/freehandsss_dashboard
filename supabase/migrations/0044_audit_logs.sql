-- Migration 0044: audit_logs 綜合審計日誌
-- Session 124 (2026-06-25)
-- 建立通用審計表 + RLS + 查詢 RPC + 升級 fhs_upsert_cost_config 加寫 audit

-- ─────────────────────────────────────────────
-- PART 1: audit_logs 表
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    log_type     TEXT NOT NULL,          -- 'cost_config_change' | 'order_cost_adjust' | 'batch_recalc'
    action       TEXT NOT NULL,          -- 'create' | 'update' | 'delete'
    actor        TEXT NOT NULL DEFAULT 'dashboard',
    entity_type  TEXT NOT NULL,          -- 'cost_config' | 'order'
    entity_id    TEXT,                   -- config_key 或 order_id (FHS string)
    before_val   JSONB,
    after_val    JSONB,
    summary      TEXT,
    source       TEXT DEFAULT 'dashboard'  -- 'dashboard' | 'n8n' | 'rpc'
);

COMMENT ON TABLE public.audit_logs IS
    '【審計日誌】記錄財務參數/訂單成本等人工變更事件（Session 124）。'
    'log_type=cost_config_change → entity_id=config_key；'
    'log_type=order_cost_adjust → entity_id=FHS order_id；'
    'anon 只讀，寫入只經 SECURITY DEFINER RPC。';

-- PART 1 smoke test
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='audit_logs'
    ) THEN RAISE EXCEPTION 'audit_logs table missing after CREATE'; END IF;
END $$;

-- ─────────────────────────────────────────────
-- PART 2: 索引
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS audit_logs_log_type_created_at_idx
    ON public.audit_logs (log_type, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_id_created_at_idx
    ON public.audit_logs (entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
    ON public.audit_logs (created_at DESC);

-- ─────────────────────────────────────────────
-- PART 3: RLS — anon 只讀，寫入只經 RPC
-- ─────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- anon 可 SELECT（查閱日誌）
DROP POLICY IF EXISTS "audit_logs_anon_select" ON public.audit_logs;
CREATE POLICY "audit_logs_anon_select"
    ON public.audit_logs FOR SELECT
    TO anon USING (true);

-- anon 不可直寫表（寫入只走 SECURITY DEFINER RPC）
-- service_role bypass RLS by default, no policy needed

-- PART 3 smoke test
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename='audit_logs' AND policyname='audit_logs_anon_select'
    ) THEN RAISE EXCEPTION 'audit_logs RLS policy missing'; END IF;
END $$;

-- ─────────────────────────────────────────────
-- PART 4: fhs_query_audit_logs — 查詢 RPC（anon EXECUTE）
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fhs_query_audit_logs(
    p_log_type   TEXT     DEFAULT NULL,
    p_entity_id  TEXT     DEFAULT NULL,
    p_from       DATE     DEFAULT NULL,
    p_to         DATE     DEFAULT NULL,
    p_limit      INTEGER  DEFAULT 50,
    p_offset     INTEGER  DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows JSONB;
BEGIN
    SELECT jsonb_agg(row_to_json(r.*) ORDER BY r.created_at DESC)
    INTO v_rows
    FROM (
        SELECT id, created_at, log_type, action, actor,
               entity_type, entity_id, before_val, after_val, summary, source
        FROM public.audit_logs
        WHERE (p_log_type  IS NULL OR log_type  = p_log_type)
          AND (p_entity_id IS NULL OR entity_id = p_entity_id)
          AND (p_from      IS NULL OR created_at >= p_from::TIMESTAMPTZ)
          AND (p_to        IS NULL OR created_at <  (p_to + INTERVAL '1 day')::TIMESTAMPTZ)
        ORDER BY created_at DESC
        LIMIT  COALESCE(p_limit, 50)
        OFFSET COALESCE(p_offset, 0)
    ) r;

    RETURN jsonb_build_object(
        'success', true,
        'rows',    COALESCE(v_rows, '[]'::JSONB),
        'count',   jsonb_array_length(COALESCE(v_rows, '[]'::JSONB))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fhs_query_audit_logs(TEXT,TEXT,DATE,DATE,INTEGER,INTEGER)
    TO anon, authenticated;

-- ─────────────────────────────────────────────
-- PART 5: 升級 fhs_upsert_cost_config（4-param overload）
-- 在同一交易內加寫 audit_logs，保證「有改必有記錄」
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fhs_upsert_cost_config(
    p_key              TEXT,
    p_value            TEXT,
    p_expected_version INTEGER DEFAULT NULL,
    p_updated_by       TEXT    DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version INTEGER;
    v_old_value       TEXT;
    v_rows_updated    INTEGER;
    v_new_version     INTEGER;
BEGIN
    IF p_key IS NULL OR trim(p_key) = '' THEN
        RAISE EXCEPTION 'config_key 不可為空';
    END IF;

    -- Fetch current state with row lock
    SELECT version, config_value
    INTO v_current_version, v_old_value
    FROM cost_configurations
    WHERE config_key = p_key
    FOR UPDATE;

    -- Optimistic lock check
    IF v_current_version IS NOT NULL
       AND p_expected_version IS NOT NULL
       AND v_current_version <> p_expected_version
    THEN
        RAISE EXCEPTION 'version_conflict: expected % but got %',
            p_expected_version, v_current_version
            USING ERRCODE = 'P0001';
    END IF;

    -- Upsert cost_configurations
    INSERT INTO cost_configurations (config_key, config_value, version, updated_at, updated_by)
    VALUES (p_key, p_value, 1, NOW(), p_updated_by)
    ON CONFLICT (config_key) DO UPDATE SET
        config_value = EXCLUDED.config_value,
        version      = cost_configurations.version + 1,
        updated_at   = NOW(),
        updated_by   = EXCLUDED.updated_by;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_new_version := COALESCE(v_current_version, 0) + 1;

    -- Write audit log (same transaction — atomic)
    INSERT INTO public.audit_logs
        (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
    VALUES (
        'cost_config_change',
        CASE WHEN v_old_value IS NULL THEN 'create' ELSE 'update' END,
        p_updated_by,
        'cost_config',
        p_key,
        CASE WHEN v_old_value IS NOT NULL
             THEN jsonb_build_object('config_key', p_key, 'config_value', v_old_value,
                                    'version', v_current_version)
             ELSE NULL END,
        jsonb_build_object('config_key', p_key, 'config_value', p_value,
                           'version', v_new_version),
        p_key || ': ' || COALESCE(v_old_value, '(新建)') || ' → ' || p_value,
        'dashboard'
    );

    RETURN jsonb_build_object(
        'success',     true,
        'config_key',  p_key,
        'config_value', p_value,
        'new_version', v_new_version,
        'rows',        v_rows_updated
    );
END;
$$;

-- Smoke test: verify RPC exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'fhs_upsert_cost_config'
          AND pronargs = 4
    ) THEN RAISE EXCEPTION 'fhs_upsert_cost_config 4-param not found after CREATE'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'fhs_query_audit_logs'
    ) THEN RAISE EXCEPTION 'fhs_query_audit_logs not found after CREATE'; END IF;
END $$;
