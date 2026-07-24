-- ============================================================================
-- 0078_backfill_item_level_gross_drawing_cost_s189.sql
-- Session 189 (2026-07-24) — 緊接 0076/0077。Fat Mo 第三次糾正：品項細明
-- （order_items 層）嘅金額必須係「全額」（每件如果獨立計算會使幾多），唔可以
-- 夾埋任何「同部位共享豁免」嘅折扣喺入面——折扣淨係應該喺訂單層（②成本快照鏈）
-- 用badge顯示，同 V2/live 訂單嘅現行架構完全一致（已用真實V2測試單核實：
-- item_base_cost 恆為 quantity×單件全費，唔理呢件係咪同部位第2件起被豁免）。
--
-- 0076 錯誤地將 order_items.drawing_cost/item_base_cost/subtotal_cost 改成「淨額」
-- （只計首件，其餘豁免件=$0），令品項細明睇落好似已經扣咗折扣。本 migration
-- 將呢23張訂單38行受影響品項嘅 item 層數值改返做「全額」（quantity×tier_drawing_rate，
-- 唔理呢件係咪首件），需要加返嘅金額 = 0077 已經計算過嘅 detail[].deduction
-- （呢個係同一份數字，兩個地方共用：0077用嚟做badge顯示金額，0078用嚟補返
-- item層被0076錯誤扣走嘅部份）。
--
-- **orders 表（total_cost/keychain_cost/necklace_cost/net_profit）完全唔改**——
-- 呢啲聚合欄位喺0076已經計啱（已用「gross加總－dedup」反推公式驗證完全吻合
-- 現存數值，例如0600723 keychain_cost=980=gross(1480)−運費扣減(140)−畫圖扣減(360)），
-- 淨係 item 層代表方式錯咗，唔係總額錯。
-- ============================================================================

CREATE TEMP TABLE _s189_gross_delta AS
SELECT oi.id,
       oi.drawing_cost AS old_drawing_cost,
       (oi.quantity * CASE WHEN oi.product_sku LIKE '%(P)%' THEN 110 ELSE 60 END) AS gross_drawing_cost,
       ((oi.quantity * CASE WHEN oi.product_sku LIKE '%(P)%' THEN 110 ELSE 60 END) - oi.drawing_cost) AS delta
FROM order_items oi
WHERE oi.item_category IN ('金屬鎖匙扣', '純銀頸鏈吊飾')
  AND oi.cost_model_version IS NULL
  AND oi.order_fhs_id NOT LIKE 'FHS-TEST%'
  AND oi.order_fhs_id NOT LIKE 'test%'
  AND substring(oi.item_key FROM '_([A-Z]+)$') IN ('LH', 'RH', 'LF', 'RF');

UPDATE order_items oi
SET drawing_cost   = d.gross_drawing_cost,
    item_base_cost = oi.item_base_cost + d.delta,
    subtotal_cost  = oi.subtotal_cost + d.delta
FROM _s189_gross_delta d
WHERE oi.id = d.id AND d.delta <> 0;

DROP TABLE _s189_gross_delta;

-- 驗證：orders 聚合總額必須完全唔變（跑 migration 前後對比 total_cost/keychain_cost/
-- necklace_cost/net_profit 應該 bit-for-bit 一致，只有 order_items 個別行改咗）。
