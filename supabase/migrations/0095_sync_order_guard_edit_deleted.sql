-- 0095_sync_order_guard_edit_deleted.sql
-- 2026-09-20 (D81) — sync_order_to_mirror：拒絕對已軟刪訂單嘅 edit（封死「舊分頁儲存令已刪單復活」）
--
-- 【背景】finance-auditor 2026-09-20 影響評估揭出：0087（D63續）令 ON CONFLICT 無條件 `deleted_at = NULL`，
-- 所以任何對已軟刪訂單嘅同步都會令佢復活入返 KPI。0087 嘅原意係「create 重用已刪 order_id」
-- （/fhs-check 用固定 test ID 反覆 create→delete），該語義保留；但「edit 一張已刪單」永遠唔係合法操作
-- （Dashboard 開單／編輯讀取全部帶 deleted_at=is.null，正常操作開唔到已刪單。注意 Dashboard 刪單實為硬刪，
-- 軟刪 deleted_at 主要來自 n8n Mirror Delete／手動 SQL／測試腳本，故守衛主要保護該類軟刪單；見 decisions D81）。
--
-- 【修法】函數開首加守衛：p_action='edit' 且 p_old_order_id 對應列 deleted_at IS NOT NULL → RAISE EXCEPTION。
-- 守衛喺 rename_order_id 同所有寫入之前，失敗零副作用。create／update 等其他 action 行為完全不變。
-- 注意：n8n webhook 為 responseMode=onReceived（先回 200），操作員 Dashboard 唔會見到此錯誤，
-- 錯誤只留喺 n8n execution log；失敗 execution 會存 apikey header（D79 未根治殘留，見 handoff）。
--
-- 【生成方式】由 0088 函數本文程式化插入單一守衛區塊；「移除守衛後」全文 md5 與 live pg_get_functiondef 比對一致。
-- 冇改任何訂單資料；Layer-2 快照不碰。

CREATE OR REPLACE FUNCTION public.sync_order_to_mirror(p_action text, p_old_order_id text, p_new_order_id text, p_order jsonb, p_items jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_effective_id text;
  v_item jsonb;
BEGIN
  -- 0095 (D81)：已軟刪訂單嘅「edit」一律拒絕，防止舊分頁／殘留表單儲存令已刪單復活。
  -- 「create」重用已刪 order_id 仍然復活（0087 語義，/fhs-check 固定 ID 測試單依賴）；
  -- 守衛喺 rename_order_id 同任何寫入之前，失敗時零副作用。
  IF p_action = 'edit' AND EXISTS (
    SELECT 1 FROM orders WHERE order_id = p_old_order_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'sync_order_to_mirror: order % is soft-deleted; refusing edit (would resurrect it)', p_old_order_id
      USING ERRCODE = 'P0001';
  END IF;

  v_effective_id := p_old_order_id;
  IF p_action = 'edit' AND p_new_order_id IS NOT NULL AND p_new_order_id <> p_old_order_id THEN
    PERFORM rename_order_id(p_old_order_id, p_new_order_id);
    v_effective_id := p_new_order_id;
  END IF;

  p_order := p_order || jsonb_build_object('order_id', v_effective_id);
  INSERT INTO orders (
    order_id, customer_name, appointment_at, confirmed_at, process_status,
    final_sale_price, total_cost, net_profit, deposit, balance, additional_fee,
    full_order_text, handmodel_cost, keychain_cost, necklace_cost, accessory_cost,
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
    COALESCE((p_order->>'accessory_cost')::numeric, 0),
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
    accessory_cost          = EXCLUDED.accessory_cost,
    n8n_cost_adjustments    = EXCLUDED.n8n_cost_adjustments,
    n8n_adjustment_notes    = EXCLUDED.n8n_adjustment_notes,
    raw_form_state          = EXCLUDED.raw_form_state,
    deleted_at              = NULL;

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
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost, accessory_cost,
      specification, engraving_text, process_status, batch_number,
      drawing_cost, printing_cost, chain_cost, shipping_cost,
      item_sale_price,
      position_code, drawing_waived, drawing_charged_count, cost_model_version,
      family_member_config
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
      COALESCE((v_item->>'accessory_cost')::numeric, 0),
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
      v_item->>'cost_model_version',
      v_item->'family_member_config'
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
      accessory_cost  = EXCLUDED.accessory_cost,
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
      cost_model_version       = EXCLUDED.cost_model_version,
      family_member_config     = EXCLUDED.family_member_config;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_effective_id);
END;
$function$;
