-- Migration 0047: 訂單層成本覆蓋（Audit Ledger Phase B）
-- Session 130 (2026-07-01)
-- 功能：手動調整訂單 total_cost，鎖定防批量重算覆蓋，並記錄審計歷史
--
-- PART 1: orders.cost_override_locked 欄位
-- PART 2: RPC fhs_adjust_order_cost（調整 + 鎖定）
-- PART 3: RPC fhs_unlock_order_cost（解鎖）
-- PART 4: UPDATE fhs_apply_financial_batch_update（跳過鎖定訂單）
-- PART 5: UPDATE fhs_batch_recalc_execute（雙重守衛）
--
-- Rollback:
--   ALTER TABLE orders DROP COLUMN IF EXISTS cost_override_locked;
--   DROP FUNCTION IF EXISTS fhs_adjust_order_cost(TEXT,NUMERIC,TEXT,TEXT);
--   DROP FUNCTION IF EXISTS fhs_unlock_order_cost(TEXT,TEXT);
--   -- restore fhs_apply_financial_batch_update and fhs_batch_recalc_execute from 0020/0021

-- ─────────────────────────────────────────────
-- PART 1: orders.cost_override_locked
-- ─────────────────────────────────────────────
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS cost_override_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.cost_override_locked IS
    '【Phase B】true = 成本已由操作者手動覆蓋，fhs_batch_recalc_execute 及 '
    'fhs_apply_financial_batch_update 跳過此單，防止批量重算覆蓋人工修正值。'
    '解鎖由 fhs_unlock_order_cost RPC 執行，並記錄 audit_logs。';

-- PART 1 smoke test
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'orders'
          AND column_name  = 'cost_override_locked'
    ) THEN RAISE EXCEPTION 'orders.cost_override_locked column missing after ALTER'; END IF;
END $$;

-- ─────────────────────────────────────────────
-- PART 2: fhs_adjust_order_cost
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fhs_adjust_order_cost(
    p_order_id       TEXT,
    p_new_total_cost NUMERIC,
    p_reason         TEXT,
    p_actor          TEXT DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_total_cost     NUMERIC;
    v_old_net_profit     NUMERIC;
    v_final_sale_price   NUMERIC;
    v_new_net_profit     NUMERIC;
BEGIN
    -- Validate inputs
    IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
        RAISE EXCEPTION '訂單號不可為空';
    END IF;
    IF p_new_total_cost IS NULL OR p_new_total_cost < 0 THEN
        RAISE EXCEPTION 'new_total_cost 不可為 NULL 或負數';
    END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION '原因說明不可為空';
    END IF;

    -- Fetch current values (row lock)
    SELECT total_cost, net_profit, final_sale_price
    INTO   v_old_total_cost, v_old_net_profit, v_final_sale_price
    FROM   public.orders
    WHERE  order_id = p_order_id
      AND  deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '找不到訂單：%', p_order_id;
    END IF;

    v_new_net_profit := COALESCE(v_final_sale_price, 0) - p_new_total_cost;

    -- Update orders: total_cost + net_profit + lock + clear recalc marker
    UPDATE public.orders SET
        total_cost            = p_new_total_cost,
        net_profit            = v_new_net_profit,
        cost_override_locked  = true,
        recalc_requested_at   = NULL
    WHERE order_id = p_order_id;

    -- Write audit log (same transaction — atomic)
    INSERT INTO public.audit_logs
        (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
    VALUES (
        'order_cost_adjust',
        'update',
        p_actor,
        'order',
        p_order_id,
        jsonb_build_object(
            'total_cost',  v_old_total_cost,
            'net_profit',  v_old_net_profit
        ),
        jsonb_build_object(
            'total_cost',  p_new_total_cost,
            'net_profit',  v_new_net_profit,
            'reason',      p_reason
        ),
        p_order_id || ': total_cost ' ||
            COALESCE(v_old_total_cost::TEXT, 'NULL') || ' → $' || p_new_total_cost::TEXT ||
            '（' || p_reason || '）',
        'dashboard'
    );

    RETURN jsonb_build_object(
        'success',         true,
        'order_id',        p_order_id,
        'old_total_cost',  v_old_total_cost,
        'new_total_cost',  p_new_total_cost,
        'new_net_profit',  v_new_net_profit,
        'locked',          true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fhs_adjust_order_cost(TEXT, NUMERIC, TEXT, TEXT)
    TO anon, authenticated;

-- PART 2 smoke test
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fhs_adjust_order_cost'
    ) THEN RAISE EXCEPTION 'fhs_adjust_order_cost not found after CREATE'; END IF;
END $$;

-- ─────────────────────────────────────────────
-- PART 3: fhs_unlock_order_cost
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fhs_unlock_order_cost(
    p_order_id TEXT,
    p_actor    TEXT DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_cost  NUMERIC;
    v_was_locked  BOOLEAN;
BEGIN
    IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
        RAISE EXCEPTION '訂單號不可為空';
    END IF;

    SELECT total_cost, cost_override_locked
    INTO   v_total_cost, v_was_locked
    FROM   public.orders
    WHERE  order_id = p_order_id
      AND  deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '找不到訂單：%', p_order_id;
    END IF;

    IF NOT COALESCE(v_was_locked, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '此訂單本來未鎖定，無需解鎖'
        );
    END IF;

    UPDATE public.orders SET
        cost_override_locked = false
    WHERE order_id = p_order_id;

    -- Write audit log
    INSERT INTO public.audit_logs
        (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
    VALUES (
        'order_cost_adjust',
        'unlock',
        p_actor,
        'order',
        p_order_id,
        jsonb_build_object('cost_override_locked', true,  'total_cost', v_total_cost),
        jsonb_build_object('cost_override_locked', false, 'total_cost', v_total_cost),
        p_order_id || ': 解鎖成本覆蓋，下次批量重算將重新計算此單',
        'dashboard'
    );

    RETURN jsonb_build_object(
        'success',  true,
        'order_id', p_order_id,
        'unlocked', true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fhs_unlock_order_cost(TEXT, TEXT)
    TO anon, authenticated;

-- PART 3 smoke test
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fhs_unlock_order_cost'
    ) THEN RAISE EXCEPTION 'fhs_unlock_order_cost not found after CREATE'; END IF;
END $$;

-- ─────────────────────────────────────────────
-- PART 4: fhs_apply_financial_batch_update — 跳過鎖定訂單
-- 原始定義於 0020；此版本加入 cost_override_locked 守衛
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fhs_apply_financial_batch_update(
    p_scope       TEXT,
    p_target_date DATE    DEFAULT NULL,
    p_order_ids   TEXT[]  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id   UUID := gen_random_uuid();
    v_count      INTEGER;
BEGIN
    IF p_scope = 'all' THEN
        UPDATE orders
        SET recalc_requested_at = NOW()
        WHERE deleted_at IS NULL
          AND (cost_override_locked IS NULL OR cost_override_locked = false);  -- Phase B guard

    ELSIF p_scope = 'date_after' THEN
        IF p_target_date IS NULL THEN
            RAISE EXCEPTION 'date_after scope requires p_target_date';
        END IF;
        UPDATE orders
        SET recalc_requested_at = NOW()
        WHERE deleted_at IS NULL
          AND created_at >= p_target_date::TIMESTAMPTZ
          AND (cost_override_locked IS NULL OR cost_override_locked = false);  -- Phase B guard

    ELSIF p_scope = 'specific' THEN
        IF p_order_ids IS NULL OR array_length(p_order_ids, 1) = 0 THEN
            RAISE EXCEPTION 'specific scope requires p_order_ids';
        END IF;
        UPDATE orders
        SET recalc_requested_at = NOW()
        WHERE order_id = ANY(p_order_ids)
          AND deleted_at IS NULL
          AND (cost_override_locked IS NULL OR cost_override_locked = false);  -- Phase B guard

    ELSE
        RAISE EXCEPTION 'Unknown scope: %. Use all / date_after / specific', p_scope;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    INSERT INTO public.audit_logs
        (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
    VALUES (
        'batch_recalc',
        'create',
        'dashboard',
        'batch',
        v_batch_id::TEXT,
        NULL,
        jsonb_build_object('scope', p_scope, 'target_date', p_target_date, 'order_ids', p_order_ids),
        '批量重算觸發：scope=' || p_scope || '，標記 ' || v_count || ' 筆（已跳過鎖定訂單）',
        'dashboard'
    );

    RETURN jsonb_build_object(
        'success',   true,
        'batch_id',  v_batch_id,
        'marked',    v_count,
        'note',      'cost_override_locked=true 的訂單已自動跳過'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fhs_apply_financial_batch_update(TEXT, DATE, TEXT[])
    TO anon, authenticated;

-- ─────────────────────────────────────────────
-- PART 5: fhs_batch_recalc_execute — 雙重守衛
-- 原始定義於 0021；此版本在 COLLECT 階段過濾鎖定訂單
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fhs_batch_recalc_execute(
    p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_ids          TEXT[];
    v_order_id           TEXT;
    v_processed          INTEGER := 0;
    v_failed             INTEGER := 0;
    v_skipped_locked     INTEGER := 0;
    v_keychain_count     INTEGER;
    v_keychain_deduction NUMERIC(10,2);
    v_total_cost         NUMERIC(10,2);
    v_handmodel_cost     NUMERIC(10,2);
    v_keychain_cost      NUMERIC(10,2);
    v_necklace_cost      NUMERIC(10,2);
    v_net_profit         NUMERIC(10,2);
    v_final_sale_price   NUMERIC(10,2);
BEGIN
    UPDATE financial_batch_logs
    SET n8n_status = 'processing'
    WHERE batch_id = p_batch_id AND n8n_status IN ('pending', 'submitted');

    -- Collect orders: recalc_requested_at IS NOT NULL AND NOT locked (Phase B double guard)
    SELECT ARRAY_AGG(order_id) INTO v_order_ids
    FROM orders
    WHERE recalc_requested_at IS NOT NULL
      AND deleted_at IS NULL
      AND (cost_override_locked IS NULL OR cost_override_locked = false);  -- Phase B guard

    -- Also count how many locked orders were skipped (for reporting)
    SELECT COUNT(*) INTO v_skipped_locked
    FROM orders
    WHERE recalc_requested_at IS NOT NULL
      AND deleted_at IS NULL
      AND cost_override_locked = true;

    IF v_order_ids IS NULL OR array_length(v_order_ids, 1) = 0 THEN
        UPDATE financial_batch_logs
        SET n8n_status    = 'completed',
            completed_at  = NOW(),
            affected_rows = 0
        WHERE batch_id = p_batch_id;

        RETURN jsonb_build_object(
            'success',         true,
            'batch_id',        p_batch_id,
            'processed',       0,
            'skipped_locked',  v_skipped_locked,
            'message',         '無待重算訂單'
        );
    END IF;

    UPDATE order_items oi
    SET
        item_base_cost = COALESCE(p.total_base_cost, 0),
        subtotal_cost  = COALESCE(p.total_base_cost, 0),
        item_category  = CASE
            WHEN oi.product_sku LIKE '%羊毛氈%' OR oi.product_sku LIKE '%燈飾%'      THEN '配件'
            WHEN oi.product_sku LIKE '%木框%'
              OR oi.product_sku LIKE '%玻璃瓶%'
              OR oi.product_sku LIKE '%立體擺設%'                                    THEN '立體擺設'
            WHEN oi.product_sku LIKE '%鎖匙扣%'                                      THEN '金屬鎖匙扣'
            WHEN oi.product_sku LIKE '%吊飾%'                                        THEN '純銀頸鏈吊飾'
            ELSE '其他'
        END,
        handmodel_cost = CASE
            WHEN oi.product_sku LIKE '%木框%'
              OR oi.product_sku LIKE '%玻璃瓶%'
              OR oi.product_sku LIKE '%立體擺設%' THEN COALESCE(p.total_base_cost, 0)
            ELSE 0
        END,
        keychain_cost  = CASE
            WHEN oi.product_sku LIKE '%鎖匙扣%' THEN COALESCE(p.total_base_cost, 0)
            ELSE 0
        END,
        necklace_cost  = CASE
            WHEN oi.product_sku LIKE '%吊飾%' THEN COALESCE(p.total_base_cost, 0)
            ELSE 0
        END
    FROM products p
    WHERE oi.product_sku = p.sku
      AND oi.order_fhs_id = ANY(v_order_ids);

    FOREACH v_order_id IN ARRAY v_order_ids LOOP
        BEGIN
            SELECT COUNT(*) INTO v_keychain_count
            FROM order_items
            WHERE order_fhs_id = v_order_id
              AND product_sku LIKE '%鎖匙扣%';

            v_keychain_deduction := GREATEST(0, (v_keychain_count - 1)::NUMERIC * 20);

            SELECT
                COALESCE(SUM(subtotal_cost),  0),
                COALESCE(SUM(handmodel_cost), 0),
                COALESCE(SUM(keychain_cost),  0),
                COALESCE(SUM(necklace_cost),  0)
            INTO v_total_cost, v_handmodel_cost, v_keychain_cost, v_necklace_cost
            FROM order_items
            WHERE order_fhs_id = v_order_id;

            v_total_cost    := v_total_cost    - v_keychain_deduction;
            v_keychain_cost := GREATEST(0, v_keychain_cost - v_keychain_deduction);

            SELECT COALESCE(final_sale_price, 0) INTO v_final_sale_price
            FROM orders WHERE order_id = v_order_id;

            v_net_profit := v_final_sale_price - v_total_cost;

            UPDATE orders SET
                total_cost          = v_total_cost,
                handmodel_cost      = v_handmodel_cost,
                keychain_cost       = v_keychain_cost,
                necklace_cost       = v_necklace_cost,
                net_profit          = v_net_profit,
                recalc_requested_at = NULL
            WHERE order_id = v_order_id;

            v_processed := v_processed + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    UPDATE financial_batch_logs
    SET n8n_status    = CASE WHEN v_failed = 0 THEN 'completed' ELSE 'error' END,
        completed_at  = NOW(),
        affected_rows = v_processed,
        error_message = CASE
            WHEN v_failed > 0 THEN v_failed || ' 筆訂單重算失敗（其餘已完成）'
            ELSE NULL
        END
    WHERE batch_id = p_batch_id;

    RETURN jsonb_build_object(
        'success',        true,
        'batch_id',       p_batch_id,
        'processed',      v_processed,
        'failed',         v_failed,
        'skipped_locked', v_skipped_locked
    );
END;
$$;

COMMENT ON FUNCTION public.fhs_batch_recalc_execute IS
    '財務批量重算執行器（Phase B 更新：cost_override_locked=true 的訂單雙重跳過）。'
    '由 n8n 💰 Financial Batch Recalculate workflow 呼叫。';

-- PART 5 smoke test
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fhs_batch_recalc_execute'
    ) THEN RAISE EXCEPTION 'fhs_batch_recalc_execute not found after CREATE OR REPLACE'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fhs_apply_financial_batch_update'
    ) THEN RAISE EXCEPTION 'fhs_apply_financial_batch_update not found after CREATE OR REPLACE'; END IF;
END $$;
