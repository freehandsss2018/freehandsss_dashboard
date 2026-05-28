-- ============================================================
-- Migration 0021 — fhs_batch_recalc_execute RPC
-- ============================================================
-- Purpose:
--   Server-side financial recalculation for orders marked by
--   fhs_apply_financial_batch_update (Migration 0020).
--   Called by n8n "💰 Financial Batch Recalculate" workflow via webhook.
--
-- Logic mirrors V47.12 Calculate Profit & Pack Items + Supabase Mirror Prep:
--   • item_base_cost = products.total_base_cost  (unit cost)
--   • subtotal_cost  = products.total_base_cost  (same — matches Mirror Prep)
--   • Category costs: handmodel/keychain/necklace = subtotal_cost when category matches
--   • Keychain deduction: (keychain_count - 1) * 20 when count > 1
--   • total_cost   = SUM(order_items.subtotal_cost) - keychain_deduction
--   • net_profit   = orders.final_sale_price - total_cost  (final_sale_price never touched)
--
-- Called by:
--   n8n HTTP Request → POST /rest/v1/rpc/fhs_batch_recalc_execute
--   Payload: { "p_batch_id": "<UUID>" }
--
-- Rollback:
--   DROP FUNCTION IF EXISTS fhs_batch_recalc_execute(UUID);
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_batch_recalc_execute(
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
    v_keychain_count     INTEGER;
    v_keychain_deduction NUMERIC(10,2);
    v_total_cost         NUMERIC(10,2);
    v_handmodel_cost     NUMERIC(10,2);
    v_keychain_cost      NUMERIC(10,2);
    v_necklace_cost      NUMERIC(10,2);
    v_net_profit         NUMERIC(10,2);
    v_final_sale_price   NUMERIC(10,2);
BEGIN
    -- 1. Mark batch as processing
    UPDATE financial_batch_logs
    SET n8n_status = 'processing'
    WHERE batch_id = p_batch_id AND n8n_status IN ('pending', 'submitted');

    -- 2. Collect all orders pending recalculation
    SELECT ARRAY_AGG(order_id) INTO v_order_ids
    FROM orders
    WHERE recalc_requested_at IS NOT NULL
      AND deleted_at IS NULL;

    IF v_order_ids IS NULL OR array_length(v_order_ids, 1) = 0 THEN
        UPDATE financial_batch_logs
        SET n8n_status = 'completed',
            completed_at = NOW(),
            affected_rows = 0
        WHERE batch_id = p_batch_id;

        RETURN jsonb_build_object(
            'success', true,
            'batch_id', p_batch_id,
            'processed', 0,
            'message', '無待重算訂單'
        );
    END IF;

    -- 3. Bulk-update order_items for all marked orders in one pass.
    --    Matches only items with a valid product_sku in products table.
    --    Items with no product match retain existing costs (safe fallback).
    UPDATE order_items oi
    SET
        item_base_cost = COALESCE(p.total_base_cost, 0),
        subtotal_cost  = COALESCE(p.total_base_cost, 0),  -- intentional: matches Mirror Prep behaviour
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

    -- 4. Recalculate each order's totals and apply keychain shipping deduction
    FOREACH v_order_id IN ARRAY v_order_ids LOOP
        BEGIN
            -- Count keychain items in this order
            SELECT COUNT(*) INTO v_keychain_count
            FROM order_items
            WHERE order_fhs_id = v_order_id
              AND product_sku LIKE '%鎖匙扣%';

            -- Deduction: (N-1) * 20 for multi-keychain orders (Product Bible V3.7 §2.5)
            v_keychain_deduction := GREATEST(0, (v_keychain_count - 1)::NUMERIC * 20);

            -- Sum from updated order_items
            SELECT
                COALESCE(SUM(subtotal_cost),  0),
                COALESCE(SUM(handmodel_cost), 0),
                COALESCE(SUM(keychain_cost),  0),
                COALESCE(SUM(necklace_cost),  0)
            INTO
                v_total_cost, v_handmodel_cost, v_keychain_cost, v_necklace_cost
            FROM order_items
            WHERE order_fhs_id = v_order_id;

            -- Apply keychain shipping deduction
            v_total_cost    := v_total_cost    - v_keychain_deduction;
            v_keychain_cost := GREATEST(0, v_keychain_cost - v_keychain_deduction);

            -- Get final_sale_price (frontend truth — never modify)
            SELECT COALESCE(final_sale_price, 0) INTO v_final_sale_price
            FROM orders
            WHERE order_id = v_order_id;

            v_net_profit := v_final_sale_price - v_total_cost;

            -- Update orders financial fields + clear recalc marker
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
            -- Log failure but continue with remaining orders
            v_failed := v_failed + 1;
        END;
    END LOOP;

    -- 5. Mark batch complete
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
        'success',    true,
        'batch_id',   p_batch_id,
        'processed',  v_processed,
        'failed',     v_failed
    );
END;
$$;

COMMENT ON FUNCTION fhs_batch_recalc_execute IS
  '財務批量重算執行器。由 n8n 💰 Financial Batch Recalculate workflow 呼叫。
   重新從 products 表讀取最新成本，套用 V47.12 利潤計算邏輯（含鎖匙扣運費折扣），
   更新 order_items + orders 財務欄位，清除 recalc_requested_at 標記。
   final_sale_price 永遠不修改（前端真理守護）。';

-- Called by n8n service key — grant to service_role only
GRANT EXECUTE ON FUNCTION fhs_batch_recalc_execute(UUID) TO service_role;
