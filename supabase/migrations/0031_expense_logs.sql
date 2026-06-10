-- Migration: 0031_expense_logs.sql
-- Description: Create expense_logs table for manual expense tracking (Log Sheet Phase 1).
--              log_type field enables future universal log container expansion.
-- Phase: Log Sheet Phase 1
-- Author: Claude (Session 69)
-- Date: 2026-06-10

BEGIN;

CREATE TABLE IF NOT EXISTS public.expense_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type    TEXT        NOT NULL DEFAULT 'expense',   -- discriminator for universal log container
    entry_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    category    TEXT        NOT NULL,                     -- 軟件支出 / 打印費 / 材料 / 運費 / 雜項 (frontend enum)
    item_name   TEXT        NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    remarks     TEXT,
    operator    TEXT        NOT NULL DEFAULT 'dashboard',
    payload     JSONB,                                    -- reserved for future log types
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_expense_logs_date ON public.expense_logs(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_logs_type ON public.expense_logs(log_type);

-- RLS: append-only (no UPDATE/DELETE for anon — audit trail integrity)
ALTER TABLE public.expense_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation (DROP IF EXISTS before CREATE)
DROP POLICY IF EXISTS expense_logs_anon_read   ON public.expense_logs;
DROP POLICY IF EXISTS expense_logs_anon_insert ON public.expense_logs;

CREATE POLICY expense_logs_anon_read
    ON public.expense_logs FOR SELECT TO anon USING (true);

CREATE POLICY expense_logs_anon_insert
    ON public.expense_logs FOR INSERT TO anon WITH CHECK (true);

-- Smoke test: verify table + constraints exist
DO $$
DECLARE
    v_count INT;
BEGIN
    -- Verify table exists
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'expense_logs';
    IF v_count = 0 THEN
        RAISE EXCEPTION '0031 smoke: expense_logs table not found';
    END IF;

    -- Verify CHECK constraint on amount
    SELECT COUNT(*) INTO v_count
    FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
        ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_schema = 'public'
      AND ccu.table_name   = 'expense_logs'
      AND ccu.column_name  = 'amount';
    IF v_count = 0 THEN
        RAISE EXCEPTION '0031 smoke: amount CHECK constraint not found';
    END IF;

    -- Verify RLS enabled
    SELECT COUNT(*) INTO v_count
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'expense_logs' AND c.relrowsecurity = true;
    IF v_count = 0 THEN
        RAISE EXCEPTION '0031 smoke: RLS not enabled on expense_logs';
    END IF;

    RAISE NOTICE '0031 smoke: expense_logs OK (table ✓, CHECK ✓, RLS ✓)';
END $$;

COMMIT;