-- ============================================================
-- Migration 0027 — order_items 四分量成本欄位
-- ============================================================
-- Purpose:
--   Task A（顆粒化成本架構）前置資產：為 order_items 補入成本四分量欄。
--   四欄現階段 DEFAULT 0；待 Task A 顆粒化 roll-up 完成後由 n8n 填值。
--   B2 範疇已收斂為 TRANSITION 標示收尾，不含四欄回寫（見 decisions.md 2026-06-03）。
--
-- 本 migration 執行：
--   PART 1: ADD COLUMN drawing_cost / printing_cost / chain_cost / shipping_cost
--   PART 2: COMMENT ON COLUMN（語義說明）
--   PART 3: Smoke tests（驗收欄位存在）
--
-- 注意：
--   - 四欄均為 DEFAULT 0，不影響現有資料
--   - 無 trigger / generated column（遵 Finance_Bible §十一 反模式禁令）
--   - n8n 於訂單處理時寫入；前端不直接讀取
--   - chain_cost 涵蓋吊飾頸鏈成本（$100）及鎖匙扣環扣成本（$10）
--   - shipping_cost 為淨運費（基礎運費 − 多件扣減後的實際值）
--
-- Rollback:
--   ALTER TABLE order_items DROP COLUMN IF EXISTS drawing_cost;
--   ALTER TABLE order_items DROP COLUMN IF EXISTS printing_cost;
--   ALTER TABLE order_items DROP COLUMN IF EXISTS chain_cost;
--   ALTER TABLE order_items DROP COLUMN IF EXISTS shipping_cost;
-- ============================================================


-- ============================================================
-- PART 1: ADD COLUMN
-- ============================================================

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS drawing_cost   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS printing_cost  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chain_cost     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost  NUMERIC(10,2) DEFAULT 0;


-- ============================================================
-- PART 2: COMMENT ON COLUMN
-- ============================================================

COMMENT ON COLUMN order_items.drawing_cost IS
  '繪圖費分量（$60 嬰兒 / $110 成人，免畫圖規則套用後的實際值）。'
  'n8n Calculate Profit & Pack Items 寫入，前端 calculatePricing() 為參考快照。';

COMMENT ON COLUMN order_items.printing_cost IS
  '打印/鑄造費分量（依 SKU 讀 cost_configurations 中對應 material_cost_* key）。'
  'n8n Calculate Profit & Pack Items 寫入。';

COMMENT ON COLUMN order_items.chain_cost IS
  '鏈扣成本分量：吊飾頸鏈（necklace_chain_cost=$100）或鎖匙扣環扣（keychain_clasp_cost=$10）。'
  '依 item_category 判斷（charm→頸鏈，keychain→環扣）。n8n 寫入。';

COMMENT ON COLUMN order_items.shipping_cost IS
  '淨運費分量：基礎運費 − 多件扣減後的實際值。'
  '吊飾：base=$140（1頸鏈+2吊飾），多件 deduction=$35/件；'
  '鎖匙扣：base=$60/件，多件 deduction=$20/件。n8n 寫入。';


-- ============================================================
-- PART 3: Smoke Tests
-- ============================================================

DO $$
DECLARE
  _col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'order_items'
    AND column_name  IN (
      'drawing_cost', 'printing_cost', 'chain_cost', 'shipping_cost'
    );

  IF _col_count != 4 THEN
    RAISE EXCEPTION '0027 Smoke FAIL: 預期 4 欄，實際只找到 % 欄。', _col_count;
  END IF;

  RAISE NOTICE '0027 PASS: order_items 四分量欄位已存在（drawing/printing/chain/shipping）';
  RAISE NOTICE '0027 ALL SMOKE TESTS PASSED';
END $$;
