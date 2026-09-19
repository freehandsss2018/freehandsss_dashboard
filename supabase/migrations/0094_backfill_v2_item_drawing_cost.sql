-- ============================================================================
-- 0094_backfill_v2_item_drawing_cost.sql
-- 2026-09-19 (D79) — V2 品項層 order_items.drawing_cost 回填，配合 n8n V47.25。
--
-- 背景：finance-auditor 2026-09-19 審查 0600804 時揭發，生產庫全部 V2 品項
-- （cost_model_version='v2_layered'）drawing_cost 恆為 0，即使 drawing_charged_count=1。
-- 違反 Cost Schema v2 §10.3「品項層 = 全額：drawing_cost 恆為 quantity × 單件全費」。
-- 成因：Dashboard calculatePricing() 仍沿用 S55 舊語義（有主商品＝已倒模部位視為
-- 「畫圖費已收」）令 V2 品項恆傳 Drawing_Cost=0，n8n「Calculate Profit & Pack Items」
-- V47.24 對非家庭 V2 品項原樣透傳。n8n V47.25 起改由 getDrawingRateForV2Sku(sku) × qty
-- 自行計算（同日部署）；本 migration 只回填部署前已入庫嘅歷史 5 行。
--
-- 順序鐵則：必須 n8n V47.25 部署【之後】才套用本 migration——否則任何重新同步都會
-- 用 Dashboard 傳來嘅 0 覆蓋回去（0600804 於 2026-09-19 04:43Z 重新同步即重設為 0）。
--
-- 費率（Cost Schema v2 §2.1 / §10.4；嬰兒與大寶共用同一費率）：
--   嬰兒/大寶  S=$60  P=$110
--   成人       S=$110 P=$240
-- 家庭組合鎖匙扣（SKU 含「家庭鎖匙扣」）屬 §10.6 exception（畫圖費按 family_member_config
-- 動態計算），不在本 migration 範圍。
--
-- 範圍與安全：
--   * 只改 order_items.drawing_cost；item_base_cost / subtotal_cost 本來就是全額，不動。
--   * orders 表（total_cost / net_profit / 四個分類成本 / n8n_adjustment_notes）完全不碰
--     ——Layer-2 訂單快照不可變（finance-gatekeeper §三 死線 2）。Drawing_Cost 從不進入
--     Total_Cost 或分類總數，只入 n8n 收斂律審計（amount=0 嘅 convergence_note）。
--   * 不變式守衛：只更新 (item_base_cost − printing − chain − shipping) 恰好等於
--     quantity × 費率 嘅行，即缺失嘅剛好就是畫圖分量；不符者一律跳過。
--   * 行數守衛：套用當日（2026-09-19）live 實測受影響行數 = 5（0600804 ×2 / 06009005 ×1 /
--     0600914 ×2，合計補回 $720）。命中行數不是 0 或 5 即 RAISE EXCEPTION 令整個
--     transaction 回滾。0 = 重放於全新 DB 或已回填過（冪等）。
--   * order_items_updated_at trigger 會更新該 5 行 updated_at（預期，無財務影響）。
--
-- 附帶（純標籤）：fhs_simulate_new_cost_model() 會把新補回嘅 3 行（qty>1 且
-- drawing_cost>0）計入其「已知 qty 相乘 bug 污染」診斷計數，屬唯讀診斷函數，無財務影響。
-- ============================================================================

DO $$
DECLARE
  v_rows INT;
BEGIN
  UPDATE order_items oi
  SET    drawing_cost = t.expected_drawing
  FROM (
    SELECT id,
           quantity * CASE
             WHEN product_sku LIKE '%成人%' THEN (CASE WHEN product_sku LIKE '%(S)%' THEN 110 ELSE 240 END)
             ELSE                                (CASE WHEN product_sku LIKE '%(S)%' THEN 60  ELSE 110 END)
           END AS expected_drawing
    FROM   order_items
    WHERE  cost_model_version = 'v2_layered'
      AND  product_sku NOT LIKE '%家庭鎖匙扣%'
      AND  drawing_cost = 0
  ) t
  WHERE  oi.id = t.id
    AND  (oi.item_base_cost - oi.printing_cost - oi.chain_cost - oi.shipping_cost) = t.expected_drawing;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows NOT IN (0, 5) THEN
    RAISE EXCEPTION '0094: expected 0 or 5 rows to backfill, matched % — aborting, transaction rolled back', v_rows;
  END IF;
END $$;
