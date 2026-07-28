-- Migration 0081: 大寶/成人/家庭三個對象轉 V2 三層成本模型
-- cl-flow 2026-07-28-1121，Fat Mo 2026-07-28 兩輪拷問裁決（見 artifacts/2026-07-28-1121/cl-final-plan.md）
--
-- 內容：
--   PART 1：8 個大寶 V2 SKU（成本值＝嬰兒 tier，Cost Schema v2 §3.1「大寶與嬰兒共享成本層」）
--   PART 2：2 個家庭 V2 SKU（塊牌物理成本 only，畫圖費由 n8n 訂單層動態計算——documented exception）
--   PART 3：cost_configurations 新增 material_cost_keychain_family 鍵（$150）
--   PART 4：order_items 新增 family_member_config JSONB 欄（供 n8n 家庭動態畫圖+審計顯示）
--   PART 5：fhs_verify_new_sku_costs() 擴充覆蓋大寶 V2（家庭 V2 因無靜態方程式不納入此函式，改由
--     drift 檢查確認塊牌成本恆為 160 即可，見 PART 6 smoke test）
--   PART 6：smoke test
--
-- 家庭組合鎖匙扣正式定義（Fat Mo 2026-07-28 口述落檔，此前三份權威文件從缺）：
--   一件整合飾品（成員印同一塊大牌，非拆件）；只限鎖匙扣（吊飾冇家庭組合）；
--   嬰兒/大寶倒模為核心（冇主產品→拒單，Dashboard Phase D 落實）；
--   S系＝全員有倒模（必選玻璃瓶(家庭)）；成人一對手 $110(S)/$240(P) 一次過；
--   每個嬰兒/大寶部位 S/P 按該部位實際有冇倒模自動推導；
--   大牌物料/打印 $150（＞標準嬰兒牌 $125，體積較大）＋環扣 $10＝$160；
--   qty＝同設計複製塊數（畫圖一次，唔隨 qty 相乘）。

-- ═══════════════════════════════════════════════
-- PART 1：8 個大寶 V2 SKU（同 mode 嬰兒 tier 完全同值）
-- ═══════════════════════════════════════════════

INSERT INTO public.products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost)
VALUES
  ('大寶(S)鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '大寶', '不銹鋼', 'S', 1, 205.00),
  ('大寶(P)鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '大寶', '不銹鋼', 'P', 1, 255.00),
  ('大寶(S)鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '大寶', '鋁合金', 'S', 1, 205.00),
  ('大寶(P)鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '大寶', '鋁合金', 'P', 1, 255.00),
  ('大寶(S)吊飾 - 925銀 (V2)', '純銀頸鏈吊飾', '大寶', '925銀', 'S', 1, 660.00),
  ('大寶(P)吊飾 - 925銀 (V2)', '純銀頸鏈吊飾', '大寶', '925銀', 'P', 1, 710.00),
  ('大寶(S)吊飾 - 925金 (V2)', '純銀頸鏈吊飾', '大寶', '925金', 'S', 1, 660.00),
  ('大寶(P)吊飾 - 925金 (V2)', '純銀頸鏈吊飾', '大寶', '925金', 'P', 1, 710.00)
ON CONFLICT (sku) DO NOTHING;

-- ═══════════════════════════════════════════════
-- PART 2：2 個家庭 V2 SKU（塊牌成本 only，畫圖費不 bake——n8n 訂單層動態計算）
-- total_base_cost=160（材質/打印150+環扣10）僅代表「一塊大牌物理成本」，
-- 非完整品項成本；完整成本＝160×qty + n8n動態畫圖（見 n8n Phase C2b）。
-- 此為 V2「單件全費」原則之 documented exception（家庭畫圖費隨成員結構變動，
-- 無法喺 SKU 層靜態定值），已記入 Cost Schema v2 §10。
-- ═══════════════════════════════════════════════

INSERT INTO public.products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost)
VALUES
  ('家庭鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '家庭', '不銹鋼', NULL, 1, 160.00),
  ('家庭鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '家庭', '鋁合金', NULL, 1, 160.00)
ON CONFLICT (sku) DO NOTHING;

-- ═══════════════════════════════════════════════
-- PART 3：cost_configurations 新增家庭大牌物料鍵
-- ═══════════════════════════════════════════════

INSERT INTO public.cost_configurations
  (config_key, config_value, display_name, data_type, description, version, schema_version, display_group, is_deprecated)
VALUES
  ('material_cost_keychain_family', '150', '家庭鎖匙扣大牌 物料/打印費', 'number',
   'Fat Mo 2026-07-28 口述定案：家庭組合大牌體積＞標準嬰兒/大寶牌（$125），故物料/打印費獨立定為 $150；環扣仍沿用通用 $10。合計每飾 $160，見 migration 0081。',
   0, 'v2', 'material_jewelry', false)
ON CONFLICT (config_key) DO NOTHING;

-- ═══════════════════════════════════════════════
-- PART 4：order_items 新增 family_member_config（家庭組合成員結構，供 n8n 動態畫圖 + 審計顯示）
-- ═══════════════════════════════════════════════

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS family_member_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.order_items.family_member_config IS
  '【Migration 0081新增】家庭組合鎖匙扣(V2)成員結構，格式 [{role:"adult",mode:"S|P"},{role:"baby"|"elder",part:"左手|右手|左腳|右腳",mode:"S|P"},...]。供 n8n 動態畫圖計算 + buildAuditLedgerHtml() 畫圖拆解顯示。NULL=非家庭組合品項。';

-- ⚠️ 更正（見 migration 0082）：此處原註解誤稱「CHECK值域無需改動」——實測 live CHECK
-- constraint 僅准 左手/右手/左腳/右腳 四值，大寶新值（大寶左手/大寶右手/大寶左腳/大寶右腳，
-- 用以令大寶同嬰兒各自獨立豁免分組）會被拒絕，已於 migration 0082 即時修正擴充。
-- 家庭組合單行 position_code 恆為 NULL（不參與跨行豁免分組，見 cl-final-plan.md §5.2）。

-- ═══════════════════════════════════════════════
-- PART 5：fhs_verify_new_sku_costs() 擴充覆蓋大寶 V2（家庭 V2 無靜態方程式，excluded）
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fhs_verify_new_sku_costs()
RETURNS TABLE(
  sku TEXT,
  target_object TEXT,
  material TEXT,
  mode TEXT,
  live_total_base_cost NUMERIC,
  expected_total_base_cost NUMERIC,
  drift NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH expected AS (
    SELECT
      p.sku, p.target_object, p.material, p.mode, p.total_base_cost AS live_cost,
      (
        (CASE WHEN p.target_object='成人' THEN
            (CASE WHEN p.mode='S' THEN 110 ELSE 240 END)
         ELSE
            -- 嬰兒/大寶共用 baby rate（Cost Schema v2 §3.1）
            (CASE WHEN p.mode='S' THEN 60 ELSE 110 END)
         END)
        + (CASE
            WHEN p.main_category='金屬鎖匙扣' AND p.target_object='成人' THEN 125
            WHEN p.main_category='金屬鎖匙扣' THEN 115
            WHEN p.main_category='純銀頸鏈吊飾' THEN 465
            ELSE NULL
          END)
        + (CASE WHEN p.main_category='金屬鎖匙扣' THEN 10 ELSE 0 END)
        + (CASE WHEN p.main_category='純銀頸鏈吊飾' THEN 100 ELSE 0 END)
        + (CASE WHEN p.main_category='金屬鎖匙扣' THEN 20 ELSE 35 END)
      ) AS expected_cost
    FROM products p
    WHERE p.sku LIKE '%(V2)'
      AND p.main_category IN ('金屬鎖匙扣','純銀頸鏈吊飾')
      AND p.target_object <> '家庭'  -- 家庭V2係塊牌成本only，無此方程式，見PART6單獨smoke test
  )
  SELECT
    e.sku, e.target_object, e.material, e.mode,
    e.live_cost, e.expected_cost,
    (e.live_cost - e.expected_cost) AS drift
  FROM expected e
  WHERE e.live_cost <> e.expected_cost;
$$;

COMMENT ON FUNCTION public.fhs_verify_new_sku_costs() IS
  '【Migration 0081擴充】驗證統一 S/P tier SKU（sku 含"(V2)"後綴，嬰兒/大寶/成人）之 total_base_cost 是否符合方程式，唯讀，0 行=零漂移。家庭V2 SKU（塊牌成本only，無畫圖方程式）不納入本函式，另見 PART6 smoke test 驗證恆為160。';

GRANT EXECUTE ON FUNCTION public.fhs_verify_new_sku_costs() TO anon, authenticated;

-- ═══════════════════════════════════════════════
-- PART 6a：sync_order_to_mirror() 擴充支援 family_member_config 透傳
-- （對齊 migration 0075 precedent：純新增 INSERT 欄位 + ON CONFLICT UPDATE 對應，
--  其餘邏輯逐字不變）
-- ═══════════════════════════════════════════════

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
$function$;

-- ═══════════════════════════════════════════════
-- PART 6：Smoke test
-- ═══════════════════════════════════════════════
DO $$
DECLARE
    v_baby_elder_count INTEGER;
    v_family_count INTEGER;
    v_drift_count INTEGER;
    v_family_cost NUMERIC;
    v_cost_key_value TEXT;
    v_old_sample_cost NUMERIC;
BEGIN
    SELECT count(*) INTO v_baby_elder_count FROM products WHERE sku LIKE '大寶%(V2)';
    IF v_baby_elder_count <> 8 THEN
        RAISE EXCEPTION '0081 Smoke FAIL: 大寶V2 SKU數量不對，預期8，實得 %', v_baby_elder_count;
    END IF;

    SELECT count(*) INTO v_family_count FROM products WHERE sku LIKE '家庭%(V2)';
    IF v_family_count <> 2 THEN
        RAISE EXCEPTION '0081 Smoke FAIL: 家庭V2 SKU數量不對，預期2，實得 %', v_family_count;
    END IF;

    SELECT total_base_cost INTO v_family_cost FROM products WHERE sku = '家庭鎖匙扣 - 不銹鋼 (V2)';
    IF v_family_cost <> 160.00 THEN
        RAISE EXCEPTION '0081 Smoke FAIL: 家庭鎖匙扣塊牌成本應為160，實得 %', v_family_cost;
    END IF;

    SELECT config_value INTO v_cost_key_value FROM cost_configurations WHERE config_key = 'material_cost_keychain_family';
    IF v_cost_key_value <> '150' THEN
        RAISE EXCEPTION '0081 Smoke FAIL: material_cost_keychain_family 應為150，實得 %', v_cost_key_value;
    END IF;

    SELECT count(*) INTO v_drift_count FROM fhs_verify_new_sku_costs();
    IF v_drift_count > 0 THEN
        RAISE EXCEPTION '0081 Smoke FAIL: 新SKU方程式驗證失敗，% 行漂移', v_drift_count;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'order_items' AND column_name = 'family_member_config'
    ) THEN
        RAISE EXCEPTION '0081 Smoke FAIL: order_items.family_member_config 欄位不存在';
    END IF;

    -- 舊 SKU（0600723 先例，嬰兒層加購）完全未受影響
    SELECT total_base_cost INTO v_old_sample_cost
    FROM products WHERE sku = '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)';
    IF v_old_sample_cost <> 500.00 THEN
        RAISE EXCEPTION '0081 Smoke FAIL: 舊SKU「嬰兒鎖匙扣-不銹鋼-4飾(加購)」被意外改動：預期500，實得 %', v_old_sample_cost;
    END IF;

    RAISE NOTICE '0081 PASS: 8個大寶V2 SKU + 2個家庭V2 SKU + material_cost_keychain_family + family_member_config 全部就位，零漂移，舊SKU零回歸';
END $$;
