-- ============================================================================
-- 0077_backfill_orders_append_drawing_dedup_notes.sql
-- Session 189 (2026-07-24) — 緊接 migration 0076。Fat Mo 檢視 0600723 生產頁面後
-- 指出：畫圖成本已扣減得啱（$560=$500+$60），但呢個「同部位第2件起免畫圖」嘅
-- 扣減資訊淨係收埋喺品項明細展開先見到，佢想同「頸鏈共用折扣」/「運費共享扣減」
-- 一樣，直接顯示喺②成本快照鏈嘅鎖匙扣/吊飾成本行 badge（同一類別嘅訂單層動態扣減）。
--
-- 0076 只改咗 order_items/orders 嘅數值本身（drawing_cost/keychain_cost/…），
-- 冇寫入 orders.n8n_adjustment_notes——V2/live 訂單嘅 section② badge 正正係讀呢個
-- 欄位（見 buildAuditLedgerHtml() `_noteBadges()`），所以歷史單缺呢個欄位就冇badge。
-- 本 migration 為 0076 涉及嘅同一批訂單，補寫一張 `drawing_position_dedup_deduction`
-- 筆記入 `n8n_adjustment_notes`（APPEND，非覆蓋，用 `||` 保留原有嘅運費/頸鏈折扣筆記），
-- 格式/type/detail結構同V2 live訂單嘅對應筆記（見 n8n「Calculate Profit & Pack Items」
-- V47.22）完全一致，令 buildAuditLedgerHtml() 現有嘅 keyword+item_key 拆分邏輯
-- 原樣適用，唔使額外改前端代碼。
--
-- 金額口徑（同 Phase0 `fhs_simulate_new_cost_model()` 一致，非 0076 backfill delta）：
--   amount = −(該訂單所有「同部位非首件」單位數 × tier_drawing 費率) 加總，
--   即「如果每件都要收畫圖費，因為同部位共用而豁免咗幾多」，同 V2 live 訂單
--   badge 嘅語意完全一致（0076 backfill delta 只反映「實際補回幾多蚊」，兩者
--   唔同概念，本 migration 用嘅係後者，即UI badge固定語意）。
-- ============================================================================

CREATE TEMP TABLE _s189_note_detail AS
WITH base AS (
    SELECT oi.order_fhs_id, oi.item_key, oi.item_category, oi.quantity,
           substring(oi.item_key FROM '_([A-Z]+)$') AS pos_suffix,
           CASE WHEN oi.product_sku LIKE '%(P)%' THEN 110 ELSE 60 END AS tier_drawing_rate
    FROM order_items oi
    WHERE oi.item_category IN ('金屬鎖匙扣', '純銀頸鏈吊飾')
      AND oi.cost_model_version IS NULL
      AND oi.order_fhs_id NOT LIKE 'FHS-TEST%'
      AND oi.order_fhs_id NOT LIKE 'test%'
      AND substring(oi.item_key FROM '_([A-Z]+)$') IN ('LH', 'RH', 'LF', 'RF')
),
ranked AS (
    SELECT *,
        row_number() OVER (
            PARTITION BY order_fhs_id, pos_suffix
            ORDER BY (CASE item_category WHEN '金屬鎖匙扣' THEN 0 ELSE 1 END), item_key
        ) AS rn
    FROM base
),
waived AS (
    SELECT order_fhs_id, item_key, pos_suffix, tier_drawing_rate,
           (CASE WHEN rn = 1 THEN quantity - 1 ELSE quantity END) AS waived_units,
           (CASE WHEN rn = 1 THEN quantity - 1 ELSE quantity END) * tier_drawing_rate AS deduction
    FROM ranked
)
SELECT order_fhs_id,
       count(*) AS row_count,
       sum(deduction) AS total_deduction,
       jsonb_agg(jsonb_build_object(
           'position_code', pos_suffix,
           'item_key', item_key,
           'waived_units', waived_units,
           'drawing_rate', tier_drawing_rate,
           'deduction', deduction
       ) ORDER BY pos_suffix, item_key) AS detail_arr
FROM waived
WHERE deduction > 0
GROUP BY order_fhs_id;

UPDATE orders o
SET n8n_adjustment_notes = COALESCE(o.n8n_adjustment_notes, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
        'type', 'drawing_position_dedup_deduction',
        'amount', -d.total_deduction,
        'desc', '同部位第2件起免畫圖費，共 ' || d.row_count || ' 個品項行受惠，合計扣減 $' || d.total_deduction,
        'basis', 'cl-flow 2026-07-24-0213 Phase2，同部位首件收畫圖第2件免（原始2024-09-15設計+S52 Finance Bible），歷史單回填(migration 0076/0077)',
        'detail', d.detail_arr
    )
)
FROM _s189_note_detail d
WHERE o.order_id = d.order_fhs_id
  AND COALESCE(o.cost_override_locked, false) = false;

DROP TABLE _s189_note_detail;
