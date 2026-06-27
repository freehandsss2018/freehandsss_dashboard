-- Migration 0045: fhs_compute_keychain_cost RPC
-- S124 v2 點4修復：統一鎖匙扣成本計算公式（W1 dual-formula 消除）
-- 本 RPC 為所有鎖匙扣成本計算的單一真源（backfill / n8n / drift check）
-- Created: 2026-06-26

-- ============================================================
-- fhs_compute_keychain_cost()
-- 計算單一 order_item 行的 subtotal_cost（不含訂單層運費扣減）
--
-- 參數：
--   p_material_per_piece  物料費/飾（from cost_configurations）
--   p_qty                 N_飾（= item_per_set = order_items.quantity）
--   p_drawing_fee         畫圖費（加購/G2/G3 = 0；單購首件 = drawing_cost_baby_s/p）
--
-- 公式：drawing_fee + (material_per_piece + clasp_per_piece) × qty
--   加購：p_drawing_fee=0  → (115+10)×N = 125×N
--   單購(S)：p_drawing_fee=60 → 60+(115+10)×N
--   單購(P)：p_drawing_fee=110 → 110+(115+10)×N
--
-- 訂單層運費扣減（由呼叫方負責）：
--   orders.keychain_cost = SUM(item subtotals) - (SUM(item.quantity)-1)*20
--   件數 = SUM(order_items.quantity) across all 金屬鎖匙扣 rows for the order
-- ============================================================
CREATE OR REPLACE FUNCTION fhs_compute_keychain_cost(
  p_material_per_piece NUMERIC,
  p_qty                INTEGER,
  p_drawing_fee        NUMERIC DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
AS $$
  SELECT p_drawing_fee + (p_material_per_piece + 10) * p_qty
$$;

COMMENT ON FUNCTION fhs_compute_keychain_cost IS
  'S124 v2 — 單一鎖匙扣成本公式：drawing_fee + (material+10_clasp)*qty。加購G2/G3時drawing_fee=0。運費扣減在訂單層，不在此RPC。';

-- ============================================================
-- 快速單元驗證（以 SELECT 形式，不改表資料）
-- ============================================================
DO $$
DECLARE
  v_addon_1  NUMERIC;
  v_addon_2  NUMERIC;
  v_addon_4  NUMERIC;
  v_single_s NUMERIC;
  v_single_p NUMERIC;
BEGIN
  -- 嬰兒不銹鋼加購 (material=115, clasp=10)
  v_addon_1  := fhs_compute_keychain_cost(115, 1, 0);   -- 1飾加購: 125
  v_addon_2  := fhs_compute_keychain_cost(115, 2, 0);   -- 2飾加購: 250
  v_addon_4  := fhs_compute_keychain_cost(115, 4, 0);   -- 4飾加購: 500
  -- 嬰兒S/P 單購首件
  v_single_s := fhs_compute_keychain_cost(115, 1, 60);  -- 1飾單購S: 185
  v_single_p := fhs_compute_keychain_cost(115, 1, 110); -- 1飾單購P: 235

  ASSERT v_addon_1  = 125,  'FAIL: 1飾加購應=125,got ' || v_addon_1;
  ASSERT v_addon_2  = 250,  'FAIL: 2飾加購應=250,got ' || v_addon_2;
  ASSERT v_addon_4  = 500,  'FAIL: 4飾加購應=500,got ' || v_addon_4;
  ASSERT v_single_s = 185,  'FAIL: 1飾單購S應=185,got ' || v_single_s;
  ASSERT v_single_p = 235,  'FAIL: 1飾單購P應=235,got ' || v_single_p;

  RAISE NOTICE '[0045] fhs_compute_keychain_cost 單元驗證 PASS (125/250/500/185/235)';
END $$;
