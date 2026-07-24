-- Migration 0075: cl-flow 2026-07-24-0213 Phase 2 — sync_order_to_mirror() 支援
-- position_code / drawing_waived / drawing_charged_count / cost_model_version
-- 四個 migration 0073 已建但未被 RPC 讀寫嘅結構化欄位。
-- 純新增 INSERT 欄位 + ON CONFLICT UPDATE 對應，其餘邏輯逐字不變（無業務行為改動）。

CREATE OR REPLACE FUNCTION public.sync_order_to_mirror(p_action text, p_old_order_id text, p_new_order_id text, p_order jsonb, p_items jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_effective_id text;
  v_item jsonb;
BEGIN
  v_effective_id := p_old_order_id;
  IF p_action = 'edit' AND p_new_order_id IS NOT NULL AND p_new_order_id <> p_old_order_id THEN
    PERFORM rename_order_id(p_old_order_id, p_new_order_id);
    v_effective_id := p_new_order_id;
  END IF;

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
    full_order_text        = EXCLUDED.full_order_text,
    handmodel_cost         = EXCLUDED.handmodel_cost,
    keychain_cost           = EXCLUDED.keychain_cost,
    necklace_cost           = EXCLUDED.necklace_cost,
    n8n_cost_adjustments    = EXCLUDED.n8n_cost_adjustments,
    n8n_adjustment_notes    = EXCLUDED.n8n_adjustment_notes,
    raw_form_state          = EXCLUDED.raw_form_state;

  IF array_length(p_items, 1) > 0 THEN
    DELETE FROM order_items
    WHERE order_fhs_id = v_effective_id
      AND item_key NOT IN (
        SELECT v_elem->>'item_key'
        FROM UNNEST(p_items) AS t(v_elem)
      );
  END IF;

  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO order_items (
      order_fhs_id, item_key, product_sku, item_category, quantity,
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost,
      specification, engraving_text, process_status, batch_number,
      drawing_cost, printing_cost, chain_cost, shipping_cost,
      item_sale_price,
      position_code, drawing_waived, drawing_charged_count, cost_model_version
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
      NULLIF(v_item->>'engraving_text', ''),
      v_item->>'process_status',
      v_item->>'batch_number',
      COALESCE((v_item->>'drawing_cost')::numeric,  0),
      COALESCE((v_item->>'printing_cost')::numeric, 0),
      COALESCE((v_item->>'chain_cost')::numeric,    0),
      COALESCE((v_item->>'shipping_cost')::numeric, 0),
      (v_item->>'item_sale_price')::numeric,
      v_item->>'position_code',
      (v_item->>'drawing_waived')::boolean,
      (v_item->>'drawing_charged_count')::integer,
      v_item->>'cost_model_version'
    )
    ON CONFLICT (item_key) DO UPDATE SET
      order_fhs_id    = EXCLUDED.order_fhs_id,
      product_sku     = EXCLUDED.product_sku,
      item_category   = EXCLUDED.item_category,
      quantity        = EXCLUDED.quantity,
      item_base_cost  = EXCLUDED.item_base_cost,
      subtotal_cost   = EXCLUDED.subtotal_cost,
      handmodel_cost  = EXCLUDED.handmodel_cost,
      keychain_cost   = EXCLUDED.keychain_cost,
      necklace_cost   = EXCLUDED.necklace_cost,
      specification   = EXCLUDED.specification,
      engraving_text  = COALESCE(NULLIF(EXCLUDED.engraving_text, ''), order_items.engraving_text),
      process_status  = COALESCE(EXCLUDED.process_status, order_items.process_status),
      batch_number    = COALESCE(EXCLUDED.batch_number,   order_items.batch_number),
      drawing_cost    = EXCLUDED.drawing_cost,
      printing_cost   = EXCLUDED.printing_cost,
      chain_cost      = EXCLUDED.chain_cost,
      shipping_cost   = EXCLUDED.shipping_cost,
      item_sale_price = COALESCE(EXCLUDED.item_sale_price, order_items.item_sale_price),
      position_code           = EXCLUDED.position_code,
      drawing_waived           = EXCLUDED.drawing_waived,
      drawing_charged_count    = EXCLUDED.drawing_charged_count,
      cost_model_version       = EXCLUDED.cost_model_version;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_effective_id);
END;
$function$;

-- Smoke test：函式仍可正常呼叫（純SELECT定義存在性+參數簽名檢查，唔跑實際INSERT）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'sync_order_to_mirror' AND pronargs = 5
  ) THEN
    RAISE EXCEPTION 'sync_order_to_mirror(5-param) 函式簽名遺失，migration失敗';
  END IF;
END $$;
