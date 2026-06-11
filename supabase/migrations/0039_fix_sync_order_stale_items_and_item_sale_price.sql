-- ============================================================
-- Migration 0039: sync_order_to_mirror 兩項修正
-- ============================================================
-- Fix 1: 品類切換後 stale order_items 殘留
--   sync_order_to_mirror Step 3 原本純 UPSERT（無 DELETE），
--   換品類後舊行永不刪除，導致手模→純金屬後立體擺設行殘留。
--   修正：FOREACH 前先刪除不在 payload 中的舊行。
--
-- Fix 2: item_sale_price 未寫入
--   Mirror Prep 已計算 item_sale_price，但原 RPC INSERT/UPDATE 無此欄，值被丟棄。
--   修正：INSERT 欄位列表補 item_sale_price；
--         ON CONFLICT 補 COALESCE 保護（null 不覆蓋現有值）。
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_order_to_mirror(
  p_action      text,
  p_old_order_id text,
  p_new_order_id text,
  p_order       jsonb,
  p_items       jsonb[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- 2. Upsert orders 主表（未改動）
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
    keychain_cost          = EXCLUDED.keychain_cost,
    necklace_cost          = EXCLUDED.necklace_cost,
    n8n_cost_adjustments   = EXCLUDED.n8n_cost_adjustments,
    n8n_adjustment_notes   = EXCLUDED.n8n_adjustment_notes,
    raw_form_state         = EXCLUDED.raw_form_state;

  -- 3a. Fix 1: 刪除不在本次 payload 的 stale order_items（品類切換根治）
  --     guard: 只在 p_items 非空時執行，防止意外全刪
  IF array_length(p_items, 1) > 0 THEN
    DELETE FROM order_items
    WHERE order_fhs_id = v_effective_id
      AND item_key NOT IN (
        SELECT v_elem->>'item_key'
        FROM UNNEST(p_items) AS t(v_elem)
      );
  END IF;

  -- 3b. Upsert order_items（Fix 2: 補 item_sale_price）
  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO order_items (
      order_fhs_id, item_key, product_sku, item_category, quantity,
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost,
      specification, engraving_text, process_status, batch_number,
      drawing_cost, printing_cost, chain_cost, shipping_cost,
      item_sale_price
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
      (v_item->>'item_sale_price')::numeric
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
      item_sale_price = COALESCE(EXCLUDED.item_sale_price, order_items.item_sale_price);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_effective_id);
END;
$function$;

-- Smoke test
DO $$
BEGIN
  RAISE NOTICE '0039 smoke: sync_order_to_mirror updated — stale DELETE + item_sale_price write enabled';
END $$;
