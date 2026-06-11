-- ============================================================
-- Migration 0037: order_items 加 item_sale_price + 存量補填
-- ============================================================
-- 目的：
--   1. 新增 order_items.item_sale_price NUMERIC
--   2. 補填已有 balanceSplitData 的 V42 訂單（balance + deposit 合計）
--
-- raw_form_state 是 jsonb column（非 text），直接 -> / ->> 操作
-- balanceSplitData 儲存為 nested JSON string（jsonb_typeof = 'string'）：
--   rfs ->>'balanceSplitData' = '{"TEMP_P_MAIN##":1680,"TEMP_K_rf#...":2000}'
--   需 ->> 取 text 再 ::jsonb 解析，再 jsonb_each_text 展開
--
-- Key 映射規則（2026-06-11 live 確認）：
--   "TEMP_P_MAIN##"           → UPPER(SPLIT_PART(REPLACE(key,'TEMP_',''),'#',1)) = 'P_MAIN'
--   "TEMP_K_rf#🦶 右腳#嬰兒"  → 'K_RF'
--   target_item_key = order_id || '_' || suffix
-- ============================================================

-- ── Step 1a: 加欄位 ──────────────────────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS item_sale_price NUMERIC;

-- ── Step 1b: 存量補填（balance + deposit 合計）─────────────
-- safe_orders: 先篩合法 JSON object，再操作（避免空字串在 LATERAL 裡拋錯）
WITH safe_orders AS (
  SELECT order_id,
         raw_form_state AS rfs
  FROM   orders
  WHERE  raw_form_state IS NOT NULL
    AND  jsonb_typeof(raw_form_state) = 'object'
),
balance_entries AS (
  SELECT so.order_id,
         pair.key                AS split_key,
         (pair.value)::numeric   AS balance_amount
  FROM   safe_orders so
  CROSS JOIN LATERAL jsonb_each_text(
    CASE
      WHEN jsonb_typeof(so.rfs -> 'balanceSplitData') = 'string'
           AND (so.rfs ->>'balanceSplitData') LIKE '{%'
        THEN (so.rfs ->>'balanceSplitData')::jsonb
      WHEN jsonb_typeof(so.rfs -> 'balanceSplitData') = 'object'
        THEN so.rfs -> 'balanceSplitData'
      ELSE '{}'::jsonb
    END
  ) AS pair(key, value)
),
deposit_entries AS (
  SELECT so.order_id,
         pair.key                AS split_key,
         (pair.value)::numeric   AS deposit_amount
  FROM   safe_orders so
  CROSS JOIN LATERAL jsonb_each_text(
    CASE
      WHEN jsonb_typeof(so.rfs -> 'depositSplitData') = 'string'
           AND (so.rfs ->>'depositSplitData') LIKE '{%'
        THEN (so.rfs ->>'depositSplitData')::jsonb
      WHEN jsonb_typeof(so.rfs -> 'depositSplitData') = 'object'
        THEN so.rfs -> 'depositSplitData'
      ELSE '{}'::jsonb
    END
  ) AS pair(key, value)
),
combined AS (
  SELECT b.order_id,
         b.split_key,
         b.balance_amount + COALESCE(d.deposit_amount, 0) AS total_amount,
         b.order_id || '_' ||
           UPPER(SPLIT_PART(REPLACE(b.split_key, 'TEMP_', ''), '#', 1))
           AS target_item_key
  FROM   balance_entries b
  LEFT JOIN deposit_entries d
    ON  b.order_id  = d.order_id
    AND b.split_key = d.split_key
)
UPDATE order_items oi
SET    item_sale_price = c.total_amount
FROM   combined c
WHERE  oi.item_key        = c.target_item_key
  AND  oi.item_sale_price IS NULL;

-- ── Smoke Test ──────────────────────────────────────────────
DO $$
DECLARE
  v_total_filled  INT;
  v_hm_price      NUMERIC;
  v_kc_price      NUMERIC;
  v_final_sp      NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total_filled
  FROM order_items WHERE item_sale_price IS NOT NULL;
  RAISE NOTICE '0037 backfill: % order_items have item_sale_price', v_total_filled;

  SELECT item_sale_price INTO v_hm_price
  FROM order_items
  WHERE order_fhs_id = '06001008' AND item_category = '立體擺設';

  SELECT item_sale_price INTO v_kc_price
  FROM order_items
  WHERE order_fhs_id = '06001008' AND item_category = '金屬鎖匙扣';

  SELECT final_sale_price INTO v_final_sp
  FROM orders WHERE order_id = '06001008';

  ASSERT v_hm_price IS NOT NULL,
    '06001008 立體擺設 item_sale_price should not be NULL';
  ASSERT v_kc_price IS NOT NULL,
    '06001008 金屬鎖匙扣 item_sale_price should not be NULL';
  ASSERT ABS((v_hm_price + v_kc_price) - v_final_sp) <= 1,
    format('06001008 split sum %s != final_sale_price %s',
           v_hm_price + v_kc_price, v_final_sp);

  RAISE NOTICE '0037 smoke PASS — 06001008: handmodel=%, keychain=%, total=%/%',
    v_hm_price, v_kc_price, v_hm_price + v_kc_price, v_final_sp;
END $$;
