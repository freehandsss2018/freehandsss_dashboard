-- Migration 0089: save_structured_order_items() 全欄位保留修復
--
-- 根因：Mode 2「儲存明細」用 DELETE+INSERT 重寫 order_items，但 INSERT 欄位清單
-- 只有 14 個（item_key/product_sku/item_category/quantity/engraving_text/specification/
-- item_base_cost/subtotal_cost/handmodel_cost/keychain_cost/necklace_cost/batch_number/
-- process_status），漏咗 14 個其後（D46/D64/D65）陸續加入嘅欄位：accessory_cost、
-- drawing_cost、printing_cost、chain_cost、shipping_cost、item_sale_price、
-- position_code、drawing_waived、drawing_charged_count、cost_model_version、
-- family_member_config、reference_image_url、ai_suggestion、precomplete_status。
-- 任何一次經 Mode 2 儲存（哪怕只改刻字/數量），呢 14 個欄位會被靜默清零/NULL。
--
-- 實測範圍：查全庫 order_items（133 筆），accessory_cost>0 嘅 3 筆同 V2 欄位缺失嘅
-- 0 筆完全冇重疊 —— 呢個 RPC 從未喺任何有相關資料嘅訂單度真正執行過，屬未爆地雷
-- 而非已發生嘅意外，不需要 backfill。
--
-- 修法：v_prev_map 由「淨存 batch_number/process_status 兩個」擴充做「存整行快照」，
-- INSERT 時對 Mode 2 UI 本身唔會編輯嘅全部欄位一律 COALESCE(新值, 快照值)——
-- 即使前端未來又漏傳某個欄位，資料層依然唔會被清走。Mode 2 UI 本身只編輯
-- engraving_text/quantity 兩個欄位（見 freehandsss_dashboardV42.html renderMode2Items()），
-- 其餘全部走 pass-through。
--
-- 沿用 0087/0088 防漂移先例：pg_get_functiondef() 攞 live 定義做 base，
-- 非假設某個舊 migration 檔案就係最新狀態。
--
-- Smoke test 揪出一個真 bug（非純理論）：v_prev_map 用 to_jsonb(reference_image_url)
-- 儲存，若原值為 SQL NULL，to_jsonb(NULL::text[]) 會存成 JSON null（scalar），
-- 令 jsonb_array_elements_text() 對其求值直接 22023 error（"cannot extract elements
-- from a scalar"），即使包喺 COALESCE 入面都會爆——COALESCE 唔係短路控制流，兩個分支
-- 都會被求值。修法：先用 jsonb_typeof(...) = 'array' 守衛，非 array 一律當 NULL。

CREATE OR REPLACE FUNCTION public.save_structured_order_items(p_order_id text, p_items_json jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_item       JSONB;
    v_prev_map   JSONB;
    v_new_text   TEXT;
    v_text_a     TEXT;
    v_text_b     TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM orders WHERE order_id = p_order_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Order % not found or deleted', p_order_id;
    END IF;

    IF p_items_json IS NULL OR jsonb_array_length(p_items_json) = 0 THEN
        RAISE EXCEPTION 'p_items_json must be a non-empty array';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_json) LOOP
        IF COALESCE((v_item->>'quantity')::INTEGER, 0) <= 0 THEN
            RAISE EXCEPTION 'quantity must be positive for item_key: %',
                COALESCE(v_item->>'item_key', '(unknown)');
        END IF;
    END LOOP;

    -- 全欄位快照（migration 0089 擴充，原版只存 batch_number/process_status 兩個）
    SELECT jsonb_object_agg(
        item_key,
        jsonb_build_object(
            'batch_number',           batch_number,
            'process_status',         process_status::TEXT,
            'product_sku',            product_sku,
            'item_base_cost',         item_base_cost,
            'subtotal_cost',          subtotal_cost,
            'handmodel_cost',         handmodel_cost,
            'keychain_cost',          keychain_cost,
            'necklace_cost',          necklace_cost,
            'accessory_cost',         accessory_cost,
            'drawing_cost',           drawing_cost,
            'printing_cost',          printing_cost,
            'chain_cost',             chain_cost,
            'shipping_cost',          shipping_cost,
            'item_sale_price',        item_sale_price,
            'position_code',          position_code,
            'drawing_waived',         drawing_waived,
            'drawing_charged_count',  drawing_charged_count,
            'cost_model_version',     cost_model_version,
            'family_member_config',   family_member_config,
            'reference_image_url',    to_jsonb(reference_image_url),
            'ai_suggestion',          ai_suggestion,
            'precomplete_status',     precomplete_status
        )
    ) INTO v_prev_map
    FROM order_items
    WHERE order_fhs_id = p_order_id;

    v_prev_map := COALESCE(v_prev_map, '{}'::JSONB);

    DELETE FROM order_items WHERE order_fhs_id = p_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_json) LOOP
        INSERT INTO order_items (
            order_fhs_id, item_key, product_sku, item_category, quantity,
            engraving_text, specification, item_base_cost, subtotal_cost,
            handmodel_cost, keychain_cost, necklace_cost, accessory_cost,
            drawing_cost, printing_cost, chain_cost, shipping_cost,
            item_sale_price, position_code, drawing_waived,
            drawing_charged_count, cost_model_version, family_member_config,
            reference_image_url, ai_suggestion, precomplete_status,
            batch_number, process_status
        ) VALUES (
            p_order_id,
            v_item->>'item_key',
            COALESCE(
                NULLIF(v_item->>'product_sku', ''),
                (v_prev_map -> (v_item->>'item_key')) ->> 'product_sku'
            ),
            v_item->>'item_category',
            (v_item->>'quantity')::INTEGER,
            NULLIF(v_item->>'engraving_text', ''),
            NULLIF(v_item->>'specification',  ''),
            COALESCE(
                (v_item->>'item_base_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'item_base_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'subtotal_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'subtotal_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'handmodel_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'handmodel_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'keychain_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'keychain_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'necklace_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'necklace_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'accessory_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'accessory_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'drawing_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'drawing_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'printing_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'printing_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'chain_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'chain_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'shipping_cost')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'shipping_cost')::NUMERIC
            ),
            COALESCE(
                (v_item->>'item_sale_price')::NUMERIC,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'item_sale_price')::NUMERIC
            ),
            COALESCE(
                v_item->>'position_code',
                (v_prev_map -> (v_item->>'item_key')) ->> 'position_code'
            ),
            COALESCE(
                (v_item->>'drawing_waived')::BOOLEAN,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'drawing_waived')::BOOLEAN
            ),
            COALESCE(
                (v_item->>'drawing_charged_count')::INTEGER,
                ((v_prev_map -> (v_item->>'item_key')) ->> 'drawing_charged_count')::INTEGER
            ),
            COALESCE(
                v_item->>'cost_model_version',
                (v_prev_map -> (v_item->>'item_key')) ->> 'cost_model_version'
            ),
            COALESCE(
                v_item->'family_member_config',
                (v_prev_map -> (v_item->>'item_key')) -> 'family_member_config'
            ),
            COALESCE(
                CASE WHEN jsonb_typeof(v_item->'reference_image_url') = 'array'
                     THEN (SELECT array_agg(x) FROM jsonb_array_elements_text(v_item->'reference_image_url') x)
                     ELSE NULL END,
                CASE WHEN jsonb_typeof((v_prev_map -> (v_item->>'item_key')) -> 'reference_image_url') = 'array'
                     THEN (SELECT array_agg(x) FROM jsonb_array_elements_text((v_prev_map -> (v_item->>'item_key')) -> 'reference_image_url') x)
                     ELSE NULL END
            ),
            COALESCE(
                v_item->>'ai_suggestion',
                (v_prev_map -> (v_item->>'item_key')) ->> 'ai_suggestion'
            ),
            COALESCE(
                v_item->>'precomplete_status',
                (v_prev_map -> (v_item->>'item_key')) ->> 'precomplete_status'
            ),
            COALESCE(
                NULLIF(v_item->>'batch_number', ''),
                (v_prev_map -> (v_item->>'item_key')) ->> 'batch_number'
            ),
            COALESCE(
                NULLIF(v_item->>'process_status', ''),
                (v_prev_map -> (v_item->>'item_key')) ->> 'process_status',
                '待製作'
            )::item_status
        );
    END LOOP;

    SELECT string_agg(
        format('[立體擺設] %s x%s%s',
            COALESCE(specification, ''),
            quantity,
            CASE WHEN engraving_text IS NOT NULL AND engraving_text <> ''
                 THEN format(' (刻字: %s)', engraving_text) ELSE '' END
        ), E'\n' ORDER BY item_key
    ) INTO v_text_a
    FROM order_items
    WHERE order_fhs_id = p_order_id AND item_category = '立體擺設';

    SELECT string_agg(
        format('[%s] %s x%s%s',
            item_category, COALESCE(specification, ''), quantity,
            CASE WHEN engraving_text IS NOT NULL AND engraving_text <> ''
                 THEN format(' (刻字: %s)', engraving_text) ELSE '' END
        ), E'\n' ORDER BY item_category, item_key
    ) INTO v_text_b
    FROM order_items
    WHERE order_fhs_id = p_order_id
      AND item_category IN ('金屬鎖匙扣', '純銀頸鏈吊飾');

    v_text_a := COALESCE(v_text_a, '');
    v_text_b := COALESCE(v_text_b, '');

    v_new_text := CASE
        WHEN v_text_a <> '' AND v_text_b <> '' THEN v_text_a || E'\n\n' || v_text_b
        WHEN v_text_a <> '' THEN v_text_a
        WHEN v_text_b <> '' THEN v_text_b
        ELSE ''
    END;

    UPDATE orders SET
        full_order_text    = v_new_text,
        full_order_text_a  = v_text_a,
        full_order_text_b  = v_text_b,
        is_text_overridden = false,
        updated_at         = NOW()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success',         true,
        'order_id',        p_order_id,
        'items_count',     jsonb_array_length(p_items_json),
        'full_order_text', v_new_text
    );
END;
$function$;
