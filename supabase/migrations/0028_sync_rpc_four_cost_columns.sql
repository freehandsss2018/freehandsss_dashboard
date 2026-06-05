-- ============================================================
-- Migration 0028 — sync_order_to_mirror RPC 四分量欄位支援
-- ============================================================
-- Purpose:
--   Task A 收尾：更新 sync_order_to_mirror RPC，使 order_items 的
--   INSERT/UPDATE 包含 drawing_cost / printing_cost / chain_cost / shipping_cost
--   四個欄位（由 migration 0027 建立，現在開始由 n8n 填值）。
--
-- 資料流：
--   前端 calculatePricing() 算好四分量
--   → payload 附掛 Drawing_Cost/Printing_Cost/Chain_Cost/Shipping_Cost
--   → n8n Parse Items 透傳
--   → n8n Calculate Profit & Pack Items 放入 Sub_Items
--   → n8n Supabase Mirror Prep 映射為 snake_case
--   → 此 RPC 寫入 order_items 四欄
--
-- 收斂律（§三-B Q2）：
--   SUM(四欄毛值) − 訂單層扣減 = orders.total_cost
--   n8n Calculate Profit 已加收斂律自我檢查（V47.16）
--
-- 注意：
--   - SECURITY DEFINER：維持與 0012 一致
--   - process_status COALESCE 保護：已確認訂單不被覆蓋
--   - 四欄用 COALESCE 防 NULL（舊訂單 p_items 不含四欄時保持 0）
--
-- Rollback（緊急）：
--   執行 0012_sync_order_rpc.sql 重建原始 RPC（四欄留著不影響）
-- ============================================================

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

  -- 2. Upsert orders 主表（與 0012 完全相同，不含四分量）
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

  -- 3. Upsert order_items 子表（含四分量欄位，COALESCE 保護舊訂單 NULL）
  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO order_items (
      order_fhs_id, item_key, product_sku, item_category, quantity,
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost,
      specification, process_status, batch_number,
      drawing_cost, printing_cost, chain_cost, shipping_cost
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
      v_item->>'batch_number',
      COALESCE((v_item->>'drawing_cost')::numeric,  0),
      COALESCE((v_item->>'printing_cost')::numeric, 0),
      COALESCE((v_item->>'chain_cost')::numeric,    0),
      COALESCE((v_item->>'shipping_cost')::numeric, 0)
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
      batch_number   = COALESCE(EXCLUDED.batch_number,   order_items.batch_number),
      drawing_cost   = EXCLUDED.drawing_cost,
      printing_cost  = EXCLUDED.printing_cost,
      chain_cost     = EXCLUDED.chain_cost,
      shipping_cost  = EXCLUDED.shipping_cost;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_effective_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Smoke test: 確認 RPC 函式簽名存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'sync_order_to_mirror'
  ) THEN
    RAISE EXCEPTION '0028 Smoke FAIL: sync_order_to_mirror RPC 不存在';
  END IF;
  RAISE NOTICE '0028 PASS: sync_order_to_mirror RPC 已更新（含四分量欄位）';
END $$;