-- 0017_save_structured_items_rpc.sql
-- Mode 2 atomic write RPC: updates order_items + regenerates full_order_text snapshot
-- Phase 1 of cl-flow 2026-05-27-1311 (編輯系統 v2 雙模式重構)
--
-- Design decisions:
--   No DB-side multi-user lock (FHS single-user; client-side _sbSyncInFlight suffices)
--   _prevItemMap preserves batch_number + process_status (Session 6 Bug A pattern)
--   SECURITY DEFINER bypasses anon RLS on order_items INSERT/DELETE
--   is_text_overridden reset to false — Mode 2 structural truth supersedes Mode 1 manual text
--   full_order_text regenerated as structural summary; IG-template regeneration
--   happens on next full form submit via Dashboard sbSyncOrder webhook path
--
-- order_fhs_id is VARCHAR(20) referencing orders.order_id (FHS-XXXXX string),
-- NOT the UUID — do not look up UUID first.

CREATE OR REPLACE FUNCTION save_structured_order_items(
    p_order_id   TEXT,
    p_items_json JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_item       JSONB;
    v_prev_map   JSONB;
    v_new_text   TEXT;
    v_text_a     TEXT;
    v_text_b     TEXT;
BEGIN
    -- Guard: order must exist and not be soft-deleted
    IF NOT EXISTS (
        SELECT 1 FROM orders WHERE order_id = p_order_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Order % not found or deleted', p_order_id;
    END IF;

    -- Guard: items array must be non-empty
    IF p_items_json IS NULL OR jsonb_array_length(p_items_json) = 0 THEN
        RAISE EXCEPTION 'p_items_json must be a non-empty array';
    END IF;

    -- Guard: all quantities must be positive
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_json) LOOP
        IF COALESCE((v_item->>'quantity')::INTEGER, 0) <= 0 THEN
            RAISE EXCEPTION 'quantity must be positive for item_key: %',
                COALESCE(v_item->>'item_key', '(unknown)');
        END IF;
    END LOOP;

    -- 1. Snapshot _prevItemMap before DELETE (Session 6 Bug A: preserve batch + process)
    SELECT jsonb_object_agg(
        item_key,
        jsonb_build_object(
            'batch_number',   batch_number,
            'process_status', process_status::TEXT
        )
    ) INTO v_prev_map
    FROM order_items
    WHERE order_fhs_id = p_order_id;

    v_prev_map := COALESCE(v_prev_map, '{}'::JSONB);

    -- 2. DELETE existing items for this order (orphan cleanup before re-insert)
    DELETE FROM order_items WHERE order_fhs_id = p_order_id;

    -- 3. INSERT new items, restoring batch_number / process_status from _prevItemMap
    --    Priority: new value from p_items_json > preserved value from DB > safe default
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_json) LOOP
        INSERT INTO order_items (
            order_fhs_id,
            item_key,
            product_sku,
            item_category,
            quantity,
            engraving_text,
            specification,
            item_base_cost,
            subtotal_cost,
            handmodel_cost,
            keychain_cost,
            necklace_cost,
            batch_number,
            process_status
        ) VALUES (
            p_order_id,
            v_item->>'item_key',
            NULLIF(v_item->>'product_sku',    ''),
            v_item->>'item_category',
            (v_item->>'quantity')::INTEGER,
            NULLIF(v_item->>'engraving_text', ''),
            NULLIF(v_item->>'specification',  ''),
            (v_item->>'item_base_cost')::NUMERIC,
            (v_item->>'subtotal_cost')::NUMERIC,
            (v_item->>'handmodel_cost')::NUMERIC,
            (v_item->>'keychain_cost')::NUMERIC,
            (v_item->>'necklace_cost')::NUMERIC,
            -- batch_number: new > prev > null (intentional null = not yet batched)
            COALESCE(
                NULLIF(v_item->>'batch_number', ''),
                (v_prev_map -> (v_item->>'item_key')) ->> 'batch_number'
            ),
            -- process_status: new > prev > '待製作' (safe ENUM default)
            COALESCE(
                NULLIF(v_item->>'process_status', ''),
                (v_prev_map -> (v_item->>'item_key')) ->> 'process_status',
                '待製作'
            )::item_status
        );
    END LOOP;

    -- 4. Regenerate full_order_text_a (立體擺設 section)
    SELECT string_agg(
        format('[立體擺設] %s x%s%s',
            COALESCE(specification, ''),
            quantity,
            CASE
                WHEN engraving_text IS NOT NULL AND engraving_text <> ''
                THEN format(' (刻字: %s)', engraving_text)
                ELSE ''
            END
        ),
        E'\n' ORDER BY item_key
    ) INTO v_text_a
    FROM order_items
    WHERE order_fhs_id = p_order_id
      AND item_category = '立體擺設';

    -- 5. Regenerate full_order_text_b (金屬鎖匙扣 + 純銀頸鏈吊飾 sections)
    SELECT string_agg(
        format('[%s] %s x%s%s',
            item_category,
            COALESCE(specification, ''),
            quantity,
            CASE
                WHEN engraving_text IS NOT NULL AND engraving_text <> ''
                THEN format(' (刻字: %s)', engraving_text)
                ELSE ''
            END
        ),
        E'\n' ORDER BY item_category, item_key
    ) INTO v_text_b
    FROM order_items
    WHERE order_fhs_id = p_order_id
      AND item_category IN ('金屬鎖匙扣', '純銀頸鏈吊飾');

    v_text_a := COALESCE(v_text_a, '');
    v_text_b := COALESCE(v_text_b, '');

    -- Combined structural text (A then B, blank line separator when both present)
    v_new_text := CASE
        WHEN v_text_a <> '' AND v_text_b <> '' THEN v_text_a || E'\n\n' || v_text_b
        WHEN v_text_a <> ''                     THEN v_text_a
        WHEN v_text_b <> ''                     THEN v_text_b
        ELSE ''
    END;

    -- 6. Update orders: structural text + clear override flag (V7 解除)
    --    is_text_overridden = false signals next n8n sync can regenerate IG-template text
    UPDATE orders
    SET
        full_order_text    = v_new_text,
        full_order_text_a  = v_text_a,
        full_order_text_b  = v_text_b,
        is_text_overridden = false,
        updated_at         = NOW()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success',        true,
        'order_id',       p_order_id,
        'items_count',    jsonb_array_length(p_items_json),
        'full_order_text', v_new_text
    );
END;
$$;

-- anon role needs EXECUTE to call this function from the Dashboard frontend
-- (SECURITY DEFINER gives DB-level write access once called; GRANT controls who can call)
GRANT EXECUTE ON FUNCTION save_structured_order_items(TEXT, JSONB) TO anon;
