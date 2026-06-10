-- ============================================================
-- Migration 0034 — sync_order_to_mirror 補 engraving_text 持久化
-- ============================================================
-- Session 84 (2026-06-10) — 根治：鎖匙扣/吊飾刻字失效
--
-- 根因（git 考古 + Supabase REST 直查 + n8n 三層讀碼坐實）：
--   新單主寫入路徑 = n8n webhook → sync_order_to_mirror RPC。
--   此 RPC（0012→0028）order_items 的 INSERT/UPSERT *從未* 包含 engraving_text 欄
--   → 所有 order_items.engraving_text = NULL（含 P_MAIN；立體擺設靠前端 mapOrder 的
--     raw_form_state.pEngraving fallback 才顯示，鎖匙扣/吊飾無 fallback → 失效）。
--   前端 sbSyncOrder（會寫 engraving_text）僅在 webhook 失敗時 fallback，正常不執行。
--   參考正確範本：0017_save_structured_items_rpc.sql（save_structured_order_items 用
--     NULLIF(v_item->>'engraving_text','') 寫入）。
--
-- 配套（已於本 session 同步部署）：
--   n8n「Supabase Mirror Prep」節點 items.map 已補
--     engraving_text: (item_category ∈ {金屬鎖匙扣, 純銀頸鏈吊飾}) ? (item.Notes||'') : ''
--   （手模刻字走 raw_form_state.pEngraving，不經此欄，故 gated 排除）
--
-- 本 migration：CREATE OR REPLACE，於 order_items INSERT 欄位 / VALUES / ON CONFLICT
--   三處補 engraving_text；ON CONFLICT 採 COALESCE(NULLIF(...),既有) 防 null-wipe 回歸。
--   其餘邏輯與 0028 完全一致（僅新增 engraving_text，未動任何既有欄位/行為）。
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_order_to_mirror(
    p_action text,
    p_old_order_id text,
    p_new_order_id text,
    p_order jsonb,
    p_items jsonb[]
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

  -- 3. Upsert order_items（含四分量 + ★engraving_text 新增★）
  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO order_items (
      order_fhs_id, item_key, product_sku, item_category, quantity,
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost,
      specification, engraving_text, process_status, batch_number,
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
      NULLIF(v_item->>'engraving_text', ''),          -- ★ 0034 新增（範本：0017）
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
      -- ★ 0034 新增：COALESCE 防 null-wipe（新值為空時保留既有刻字，正是本次回歸的反制）
      engraving_text = COALESCE(NULLIF(EXCLUDED.engraving_text, ''), order_items.engraving_text),
      process_status = COALESCE(EXCLUDED.process_status, order_items.process_status),
      batch_number   = COALESCE(EXCLUDED.batch_number,   order_items.batch_number),
      drawing_cost   = EXCLUDED.drawing_cost,
      printing_cost  = EXCLUDED.printing_cost,
      chain_cost     = EXCLUDED.chain_cost,
      shipping_cost  = EXCLUDED.shipping_cost;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_effective_id);
END;
$function$;

-- ============================================================
-- 煙霧測試（手動於 Supabase SQL Editor 執行驗證；不寫入生產資料）
-- ============================================================
-- 驗證 1：函式定義含 engraving_text
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'sync_order_to_mirror'
      AND pg_get_functiondef(p.oid) ILIKE '%engraving_text%'
  ) THEN
    RAISE EXCEPTION '0034 FAIL: sync_order_to_mirror 仍不含 engraving_text';
  END IF;
  RAISE NOTICE '0034 OK: sync_order_to_mirror 已含 engraving_text 寫入';
END $$;
