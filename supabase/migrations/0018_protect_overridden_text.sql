-- 0018_protect_overridden_text.sql
-- Phase 4 of cl-flow 2026-05-27-1311 (V4 MAJOR解除)
-- Add is_text_overridden guard to sync_order_to_mirror so that n8n
-- Mirror Prep (V47.11) cannot overwrite Mode 1 manually-edited text.
--
-- Guard logic (DB level):
--   is_text_overridden = true  → KEEP existing full_order_text
--   is_text_overridden = false → OVERWRITE with incoming p_order->full_order_text
--
-- Note: full_order_text_a / full_order_text_b are NOT in this RPC's UPDATE path.
-- They are written directly by Dashboard sbSyncOrder and must not be touched here
-- (n8n does not pass these values so EXCLUDED would be null, clearing the columns).
--
-- This is a DROP-IN replacement for 0013 (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION sync_order_to_mirror(
  p_action text,
  p_old_order_id text,
  p_new_order_id text,
  p_order jsonb,
  p_items jsonb[]
) RETURNS jsonb AS $$
DECLARE
  v_effective_id text;
  v_item jsonb;
BEGIN
  -- 1. 處理重命名
  v_effective_id := p_old_order_id;
  IF p_action = 'edit' AND p_new_order_id IS NOT NULL AND p_new_order_id <> p_old_order_id THEN
    PERFORM rename_order_id(p_old_order_id, p_new_order_id);
    v_effective_id := p_new_order_id;
  END IF;

  -- 2. Upsert orders 主表
  p_order := p_order || jsonb_build_object('order_id', v_effective_id);
  INSERT INTO orders (
    order_id, customer_name, appointment_at, confirmed_at, process_status,
    final_sale_price, total_cost, net_profit, deposit, balance, additional_fee,
    full_order_text, handmodel_cost, keychain_cost, necklace_cost,
    n8n_cost_adjustments, n8n_adjustment_notes, raw_form_state
  ) VALUES (
    v_effective_id, p_order->>'customer_name',
    (p_order->>'appointment_at')::timestamptz,
    (p_order->>'confirmed_at')::timestamptz,
    (p_order->>'process_status')::order_status,
    (p_order->>'final_sale_price')::numeric,
    (p_order->>'total_cost')::numeric,
    (p_order->>'net_profit')::numeric,
    (p_order->>'deposit')::numeric,
    (p_order->>'balance')::numeric,
    (p_order->>'additional_fee')::numeric,
    p_order->>'full_order_text',
    (p_order->>'handmodel_cost')::numeric,
    (p_order->>'keychain_cost')::numeric,
    (p_order->>'necklace_cost')::numeric,
    (p_order->>'n8n_cost_adjustments')::numeric,
    p_order->'n8n_adjustment_notes',
    p_order->'raw_form_state'
  )
  ON CONFLICT (order_id) DO UPDATE SET
    customer_name          = EXCLUDED.customer_name,
    appointment_at         = EXCLUDED.appointment_at,
    confirmed_at           = COALESCE(EXCLUDED.confirmed_at, orders.confirmed_at),
    process_status         = COALESCE(EXCLUDED.process_status, orders.process_status),
    final_sale_price       = EXCLUDED.final_sale_price,
    total_cost             = EXCLUDED.total_cost,
    net_profit             = EXCLUDED.net_profit,
    deposit                = EXCLUDED.deposit,
    balance                = EXCLUDED.balance,
    additional_fee         = EXCLUDED.additional_fee,
    -- V47.11 guard: if Mode 1 human edit exists, n8n must not overwrite it
    full_order_text        = CASE
                               WHEN orders.is_text_overridden = true
                               THEN orders.full_order_text
                               ELSE EXCLUDED.full_order_text
                             END,
    handmodel_cost         = EXCLUDED.handmodel_cost,
    keychain_cost          = EXCLUDED.keychain_cost,
    necklace_cost          = EXCLUDED.necklace_cost,
    n8n_cost_adjustments   = EXCLUDED.n8n_cost_adjustments,
    n8n_adjustment_notes   = EXCLUDED.n8n_adjustment_notes,
    raw_form_state         = EXCLUDED.raw_form_state;

  -- 3. 清理孤兒項目（已從訂單移除的 items）
  IF array_length(p_items, 1) IS NOT NULL AND array_length(p_items, 1) > 0 THEN
    DELETE FROM order_items
    WHERE order_fhs_id = v_effective_id
      AND item_key NOT IN (
        SELECT val->>'item_key'
        FROM unnest(p_items) AS val
        WHERE val->>'item_key' IS NOT NULL
      );
  END IF;

  -- 4. Upsert order_items 子表
  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO order_items (
      order_fhs_id, item_key, product_sku, item_category, quantity,
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost,
      specification, process_status, batch_number
    ) VALUES (
      v_effective_id,
      v_item->>'item_key',
      v_item->>'product_sku',
      v_item->>'item_category',
      (v_item->>'quantity')::integer,
      (v_item->>'item_base_cost')::numeric,
      (v_item->>'subtotal_cost')::numeric,
      (v_item->>'handmodel_cost')::numeric,
      (v_item->>'keychain_cost')::numeric,
      (v_item->>'necklace_cost')::numeric,
      v_item->>'specification',
      v_item->>'process_status',
      v_item->>'batch_number'
    )
    ON CONFLICT (item_key) DO UPDATE SET
      order_fhs_id   = EXCLUDED.order_fhs_id,
      product_sku    = EXCLUDED.product_sku,
      item_category  = EXCLUDED.item_category,
      quantity       = EXCLUDED.quantity,
      item_base_cost = EXCLUDED.item_base_cost,
      subtotal_cost  = EXCLUDED.subtotal_cost,
      handmodel_cost = EXCLUDED.handmodel_cost,
      keychain_cost  = EXCLUDED.keychain_cost,
      necklace_cost  = EXCLUDED.necklace_cost,
      specification  = EXCLUDED.specification,
      process_status = COALESCE(EXCLUDED.process_status, order_items.process_status),
      batch_number   = COALESCE(EXCLUDED.batch_number, order_items.batch_number);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_effective_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
