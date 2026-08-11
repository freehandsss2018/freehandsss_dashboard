-- 0087_sync_order_to_mirror_reset_deleted_at.sql
-- 2026-08-11 (D63 續) — sync_order_to_mirror UPSERT 漏 reset deleted_at 修復
--
-- 【問題】ON CONFLICT (order_id) DO UPDATE SET 清單有 17 個欄位，但完全冇 deleted_at。
-- 任何 order_id 一旦被軟刪除過（deleted_at 有值），之後再用同一 order_id 建立新訂單時，
-- RPC 只更新其他欄位，deleted_at 保持舊值 —— 新訂單永遠卡喺「已刪除」狀態，前端所有
-- 帶 `deleted_at=is.null` 過濾嘅查詢（訂單總覽/財務/交付提醒）都會睇唔到張單。
--
-- 【發現經過】D63 為 /fhs-check 加 DEGRADED 偵測層後，LIFECYCLE 測試首次「真正」FAIL
-- （此前因短路邏輯 bug 一直假 PASS）。查 test9999003：updated_at=2026-08-11（今日重新
-- 建立）但 deleted_at 仍停留 2026-08-03（8 日前那次刪除），直接暴露此 bug。
--
-- 【影響範圍實測】全庫 58 筆訂單，6 筆有 deleted_at，其中 updated_at 明顯晚於 deleted_at
-- （即撞到此 bug）僅 1 筆，且係測試單 test9999003 本身 —— **真實客戶訂單零受影響**。
-- 原因：正常業務極少重用已刪除嘅 order_id，只有固定 ID 反覆跑嘅測試腳本會命中。
--
-- 【修法語義】走到 sync_order_to_mirror 就代表 n8n 收到 create/edit 動作（delete 分支走
-- 完全獨立嘅 `Mirror Delete to Supabase` httpRequest node，唔經此 RPC），所以喺此處無條件
-- 清 deleted_at 係正確語義：「有人 create/edit 呢張單」必然蘊含「呢張單而家生效」。
--
-- 【生成方式】本檔由 live 定義（pg_get_functiondef）程式化插入單一行生成，非人手抄寫，
-- 並經程式驗證「除該行外逐字不變」，避免 CREATE OR REPLACE 全量覆蓋打回未落 repo 嘅
-- 既有修復（見 feedback_migration_repo_db_drift 教訓）。注意 live 版本本身唔含
-- accessory_cost（實測 0 次出現），本次刻意不順手補，維持單一改動原則。

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
    raw_form_state          = EXCLUDED.raw_form_state,
    -- 0087 新增（唯一改動）：create/edit 動作必然代表訂單生效，清走任何舊軟刪除標記。
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
      item_base_cost, subtotal_cost, handmodel_cost, keychain_cost, necklace_cost,
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
$function$
