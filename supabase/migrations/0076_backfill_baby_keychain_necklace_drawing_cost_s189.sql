-- ============================================================================
-- 0076_backfill_baby_keychain_necklace_drawing_cost_s189.sql
-- Session 189 (2026-07-24) — Fat Mo 追加要求：「之前的算式是錯，為何不修正」，
-- 對全部歷史舊模型（cost_model_version IS NULL）嘅嬰兒鎖匙扣/吊飾訂單回填正確畫圖成本。
--
-- 範圍界定（精準最小改動，非重新套用 V2 目錄價）：
--   只修正「畫圖成本」呢一個分量本身（S55 語義漂移嘅根因），唔重新套用 V2 統一SKU
--   嘅單件全費（$205/$255/$660/$710 等），因為嗰啲數字帶埋新目錄嘅material/運費假設，
--   同呢個bug（畫圖費）無關，重新套用會混入不相關嘅改動。material/clasp/運費等原有
--   已記錄分量完全不變。
--
-- 方程式（同 cl-flow 2026-07-24-0213 Phase2 V47.22 現行邏輯一致，回填歷史舊單版）：
--   同一訂單、同一身體部位（由 item_key 尾綴 _LH/_RH/_LF/_RF 判斷），跨鎖匙扣/吊飾
--   共享「首件收畫圖費」資格（同一部位3D掃描只需一次）——组內第一件（鎖匙扣優先於
--   吊飾，再按 item_key 排序，純粹用嚟穩定排序，唔影響金額總數，因為同組內費率必然
--   一致，見下方驗證）收 tier_drawing 費率一次（baby S=$60／baby(P)=$110，按 SKU
--   是否含"(P)"判斷），組內其餘所有品項（包括同一行嘅第2件起）豁免。
--
-- 前置驗證（執行前已用 SELECT 逐行核對，非猜測）：
--   1. 掃描全部 cross-category 同部位分組，確認組內費率（S/P tier）永遠一致——
--      冇一組出現「一個S一個P」嘅費率衝突，故邊個品項排第一唔影響總金額，
--      只影響keychain_cost/necklace_cost嘅分攤（記帳慣例，非金額爭議）。
--   2. 揪出3行受「單購」drawing_cost×quantity相乘舊bug污染（0600803_K_LH/
--      07001007兩行）——回填後呢3行金額會下降（正確tier_drawing係固定一次性
--      收費，唔應該×quantity），非新增錯誤。
--   3. 家庭 composite SKU（0600107_K_FAM_COMBO）已排除，唔套用呢個回填公式
--      （D41 composite_drawing 係獨立方程式，Q3 待辦另案處理）。
--   4. 已核實全部受影響訂單 cost_override_locked 皆非 true（無人手覆蓋鎖定）。
--
-- 預期影響（執行前估算，用於pre-flight比對；實際執行結果見下）：
-- 25張訂單、58行品項，淨增加約$1,880。
--
-- 實際執行結果（已套用，finance-auditor獨立覆核PASS，2026-07-24）：
-- 23張訂單、keychain_cost/necklace_cost/total_cost/net_profit 淨增加 $2,000
-- （21張上升$60-$240，2張因單購drawing_cost×quantity舊bug回填修正後下降各$220）。
-- 執行前估算同實際結果落差原因：估算SQL同套用SQL嘅TEST單過濾條件寫法一致，
-- 落差純屬人手預估時漏數2張（0500719/0600722），非執行邏輯偏差；回填後全庫
-- 重新掃描 remaining_delta=0，完全收斂，冇漏改。
-- 附帶發現（非本次回填造成，屬既有schema缺口）：0600107/0600723 兩單
-- total_cost 比 handmodel+keychain+necklace 三分類加總多$30，原因係該兩單
-- 各有一件「配件」類（燈飾$30）未歸入任何分類欄位，同呢次回填無關，另案追蹤。
-- ============================================================================

-- Step 1: 計算逐行 delta（暫存表，供後續 order_items/orders/audit_logs 三處共用同一份數字）
CREATE TEMP TABLE _s189_backfill_delta AS
WITH base AS (
    SELECT oi.id, oi.order_fhs_id, oi.item_key, oi.item_category, oi.drawing_cost,
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
)
SELECT id, order_fhs_id, item_category,
       (CASE WHEN rn = 1 THEN tier_drawing_rate ELSE 0 END) AS new_drawing_cost,
       (CASE WHEN rn = 1 THEN tier_drawing_rate ELSE 0 END - drawing_cost) AS delta
FROM ranked;

-- Step 2: 按訂單彙總（keychain_cost / necklace_cost / total_cost 三個子總額分開累加）
CREATE TEMP TABLE _s189_backfill_agg AS
SELECT order_fhs_id,
       sum(delta) AS total_delta,
       sum(delta) FILTER (WHERE item_category = '金屬鎖匙扣')   AS keychain_delta,
       sum(delta) FILTER (WHERE item_category = '純銀頸鏈吊飾') AS necklace_delta
FROM _s189_backfill_delta
GROUP BY order_fhs_id
HAVING sum(delta) <> 0;

-- Step 3: audit_logs 先寫入（用改動前嘅 orders 現值做 before_val，改動後幾行先做 after_val）
INSERT INTO audit_logs (log_type, action, actor, entity_type, entity_id, before_val, after_val, summary, source)
SELECT
    'order_cost_adjust',
    'backfill_drawing_cost_s189',
    'AI_migration_0076',
    'order',
    o.order_id,
    jsonb_build_object(
        'total_cost', o.total_cost,
        'keychain_cost', o.keychain_cost,
        'necklace_cost', o.necklace_cost,
        'net_profit', o.net_profit
    ),
    jsonb_build_object(
        'total_cost', o.total_cost + agg.total_delta,
        'keychain_cost', o.keychain_cost + COALESCE(agg.keychain_delta, 0),
        'necklace_cost', o.necklace_cost + COALESCE(agg.necklace_delta, 0),
        'net_profit', o.final_sale_price - (o.total_cost + agg.total_delta)
    ),
    'S189回填：修正嬰兒鎖匙扣/吊飾「加購/單購」畫圖成本語義漂移(S55)——同部位首件收畫圖費、跨鎖匙扣吊飾共享豁免資格，其餘豁免；delta=$' || agg.total_delta || '（Fat Mo 2026-07-24 明確授權：不論訂單已完成/進行中一律修正）',
    'migration_0076'
FROM _s189_backfill_agg agg
JOIN orders o ON o.order_id = agg.order_fhs_id
WHERE COALESCE(o.cost_override_locked, false) = false;

-- Step 4: 更新 order_items（drawing_cost + item_base_cost/subtotal_cost 同步加減 delta，material/clasp/運費分量不變）
UPDATE order_items oi
SET drawing_cost   = d.new_drawing_cost,
    item_base_cost = oi.item_base_cost + d.delta,
    subtotal_cost  = oi.subtotal_cost + d.delta
FROM _s189_backfill_delta d
WHERE oi.id = d.id AND d.delta <> 0;

-- Step 5: 更新 orders（keychain_cost/necklace_cost/total_cost/net_profit，final_sale_price 絕不觸碰）
UPDATE orders o
SET keychain_cost = o.keychain_cost + COALESCE(agg.keychain_delta, 0),
    necklace_cost  = o.necklace_cost + COALESCE(agg.necklace_delta, 0),
    total_cost     = o.total_cost + agg.total_delta,
    net_profit     = o.final_sale_price - (o.total_cost + agg.total_delta)
FROM _s189_backfill_agg agg
WHERE o.order_id = agg.order_fhs_id
  AND COALESCE(o.cost_override_locked, false) = false;

DROP TABLE _s189_backfill_delta;
DROP TABLE _s189_backfill_agg;

-- ============================================================================
-- Smoke test（套用後手動執行核對，非自動阻斷）：
-- SELECT order_id, total_cost, keychain_cost, necklace_cost, net_profit
--   FROM orders WHERE order_id IN ('0600723','0600106','0600803','07001007');
-- 預期：0600723/0600106 total_cost 各增加$120；0600803/07001007 total_cost 各降低$220
--   （單購drawing_cost×quantity舊bug回填修正，非新增錯誤，見migration開頭說明）。
-- ============================================================================
