-- Migration 0073: cl-flow 2026-07-24-0213 Phase 1 — 新增統一 S/P tier SKU（新增不刪）
--
-- finance-gatekeeper §三B 完整方程式（本次改動依據）：
--   新統一SKU total_base_cost（每件全費）=
--     drawing_rate(tier×mode) + material_rate(tier) + clasp_rate($10,僅鎖匙扣)
--     + shipping_rate($20鎖匙扣/$35吊飾) + chain_rate($100,僅吊飾,D42)
--   drawing_rate：baby-S=60 / baby-P=110 / adult-S=110 / adult-P=240（cost_configurations 現行值）
--   material_rate：baby鎖匙扣(不銹鋼/鋁合金同價)=115 / adult鎖匙扣=125 / 吊飾(925銀/金同價)=465
--   order_items.subtotal_cost = total_base_cost × quantity（照字面契約，migration 0005 定義）
--
-- 對齊已驗證先例：
--   S124v2(migration 0045)：(material+clasp)×N 部分完全繼承
--   D40(migration 0046)：material_cost_necklace=465 直接沿用
--   D41(migrations 0058/0059)：家庭 composite 畫圖 — 本次 Phase1 明確排除家庭套裝，
--     家庭 SKU 繼續用舊(單購/加購)機制不受影響，待 Q3 獨立處理
--   D42(V47.20)：頸鏈 $100 品項層對稱摺入 + floor(N/2)×100 訂單層共用折扣 — 完整繼承不變
--
-- 範圍：僅新增，不改動/不刪除任何現有 products 行（含單購/加購全部保留）。
-- 命名加 "(V2)" 後綴：實測發現部分成人(P)-tier既有「單購」SKU本身已是裸格式
-- （如「成人(P)鎖匙扣 - 不銹鋼」，因成人tier歷來冇N飾變體，命名本已「collapse」），
-- 若沿用同名會直接撞現有生產SKU（UNIQUE constraint），故全部16個新SKU一律加(V2)後綴，
-- 零碰撞、同時方便operator過渡期肉眼分辨新舊模型。
-- 新增 order_items 結構化欄位供 Phase 2 n8n 動態扣減使用（取代純文字 n8n_adjustment_notes）。

-- ═══════════════════════════════════════════════
-- PART 1：新增 16 個統一 S/P tier SKU（鎖匙扣 8 + 吊飾 8，家庭/立體擺設/配件不受影響）
-- ═══════════════════════════════════════════════

INSERT INTO public.products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost)
VALUES
  -- 金屬鎖匙扣：嬰兒層（drawing 60/110 + material 115 + clasp 10 + shipping 20）
  ('嬰兒(S)鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '嬰兒', '不銹鋼', 'S', 1, 205.00),
  ('嬰兒(P)鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '嬰兒', '不銹鋼', 'P', 1, 255.00),
  ('嬰兒(S)鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '嬰兒', '鋁合金', 'S', 1, 205.00),
  ('嬰兒(P)鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '嬰兒', '鋁合金', 'P', 1, 255.00),
  -- 金屬鎖匙扣：成人層（drawing 110/240 + material 125 + clasp 10 + shipping 20）
  ('成人(S)鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '成人', '不銹鋼', 'S', 1, 265.00),
  ('成人(P)鎖匙扣 - 不銹鋼 (V2)', '金屬鎖匙扣', '成人', '不銹鋼', 'P', 1, 395.00),
  ('成人(S)鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '成人', '鋁合金', 'S', 1, 265.00),
  ('成人(P)鎖匙扣 - 鋁合金 (V2)', '金屬鎖匙扣', '成人', '鋁合金', 'P', 1, 395.00),
  -- 純銀頸鏈吊飾：嬰兒層（drawing 60/110 + material 465 + chain 100 + shipping 35）
  ('嬰兒(S)吊飾 - 925銀 (V2)', '純銀頸鏈吊飾', '嬰兒', '925銀', 'S', 1, 660.00),
  ('嬰兒(P)吊飾 - 925銀 (V2)', '純銀頸鏈吊飾', '嬰兒', '925銀', 'P', 1, 710.00),
  ('嬰兒(S)吊飾 - 925金 (V2)', '純銀頸鏈吊飾', '嬰兒', '925金', 'S', 1, 660.00),
  ('嬰兒(P)吊飾 - 925金 (V2)', '純銀頸鏈吊飾', '嬰兒', '925金', 'P', 1, 710.00),
  -- 純銀頸鏈吊飾：成人層（drawing 110/240 + material 465 + chain 100 + shipping 35）
  ('成人(S)吊飾 - 925銀 (V2)', '純銀頸鏈吊飾', '成人', '925銀', 'S', 1, 710.00),
  ('成人(P)吊飾 - 925銀 (V2)', '純銀頸鏈吊飾', '成人', '925銀', 'P', 1, 840.00),
  ('成人(S)吊飾 - 925金 (V2)', '純銀頸鏈吊飾', '成人', '925金', 'S', 1, 710.00),
  ('成人(P)吊飾 - 925金 (V2)', '純銀頸鏈吊飾', '成人', '925金', 'P', 1, 840.00)
ON CONFLICT (sku) DO NOTHING;

-- ═══════════════════════════════════════════════
-- PART 2：order_items 新增結構化欄位（供 Phase 2 n8n 動態扣減使用）
-- ═══════════════════════════════════════════════

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS position_code TEXT
    CHECK (position_code IS NULL OR position_code IN ('左手','右手','左腳','右腳')),
  ADD COLUMN IF NOT EXISTS drawing_waived BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drawing_charged_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_model_version TEXT DEFAULT NULL;

COMMENT ON COLUMN public.order_items.position_code IS
  '【Phase1新增】身體部位穩定代碼（左手/右手/左腳/右腳），供 n8n Phase2「同部位」判斷用，取代字串後綴/DOM query（A1/#4 反饋）。NULL=非鎖匙扣/吊飾品項或未分類部位。';
COMMENT ON COLUMN public.order_items.drawing_waived IS
  '【Phase1新增】此品項行嘅畫圖費是否因同部位已收而豁免（n8n Phase2 動態扣減寫入），取代純文字 n8n_adjustment_notes 表達（A1/#2 反饋）。NULL=尚未套用新模型。';
COMMENT ON COLUMN public.order_items.drawing_charged_count IS
  '【Phase1新增】此訂單同部位實際收咗幾多次畫圖費（正常應為1），供稽核用（A1/#2 反饋）。NULL=尚未套用新模型。';
COMMENT ON COLUMN public.order_items.cost_model_version IS
  '【Phase1新增】此品項行使用嘅成本模型版本標記（如 v2_layered），供報表按版本分段避免新舊口徑混用（A1/#5 反饋）。NULL=舊模型（單購/加購）快照，不追溯改寫。';

-- ═══════════════════════════════════════════════
-- PART 3：fhs_verify_new_sku_costs() — 新 SKU 專屬驗證（不與舊 fhs_check_product_cost_drift() 混用，A2/#3）
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
    WHERE p.sku LIKE '%(V2)'  -- 精確鎖定本次新增嘅16個SKU（唔靠mode值，避免同既有$0佔位row或未來其他資料撞colomn語意）
      AND p.main_category IN ('金屬鎖匙扣','純銀頸鏈吊飾')
  )
  SELECT
    e.sku, e.target_object, e.material, e.mode,
    e.live_cost, e.expected_cost,
    (e.live_cost - e.expected_cost) AS drift
  FROM expected e
  WHERE e.live_cost <> e.expected_cost;
$$;

COMMENT ON FUNCTION public.fhs_verify_new_sku_costs() IS
  '【cl-flow 2026-07-24-0213 Phase 1】驗證新統一 S/P tier SKU（sku 含"(V2)"後綴）之 total_base_cost 是否符合方程式，唯讀，0 行=零漂移。不與舊 fhs_check_product_cost_drift()（單購/加購 SKU）混用（A2/#3 反饋）。';

GRANT EXECUTE ON FUNCTION public.fhs_verify_new_sku_costs() TO anon, authenticated;

-- ═══════════════════════════════════════════════
-- Smoke test：16 行已插入 + drift 檢查 0 行 + 舊 SKU 完全不受影響
-- ═══════════════════════════════════════════════
DO $$
DECLARE
    v_new_count INTEGER;
    v_drift_count INTEGER;
    v_old_sample_cost NUMERIC;
    v_old_adult_cost NUMERIC;
BEGIN
    SELECT count(*) INTO v_new_count FROM products WHERE sku LIKE '%(V2)';
    IF v_new_count <> 16 THEN
        RAISE EXCEPTION 'Phase1 新SKU數量不對：預期16，實得 %', v_new_count;
    END IF;

    SELECT count(*) INTO v_drift_count FROM fhs_verify_new_sku_costs();
    IF v_drift_count > 0 THEN
        RAISE EXCEPTION 'Phase1 新SKU方程式驗證失敗：% 行漂移', v_drift_count;
    END IF;

    -- 舊 SKU（0600723 先例，嬰兒層加購）完全未受影響
    SELECT total_base_cost INTO v_old_sample_cost
    FROM products WHERE sku = '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)';
    IF v_old_sample_cost <> 500.00 THEN
        RAISE EXCEPTION '舊SKU「嬰兒鎖匙扣-不銹鋼-4飾(加購)」被意外改動：預期500，實得 %', v_old_sample_cost;
    END IF;

    -- 曾撞名嘅成人(P)舊單購SKU亦完全未受影響（確認 ON CONFLICT DO NOTHING 冇誤傷）
    SELECT total_base_cost INTO v_old_adult_cost
    FROM products WHERE sku = '成人(P)鎖匙扣 - 不銹鋼';
    IF v_old_adult_cost <> 375.00 THEN
        RAISE EXCEPTION '舊SKU「成人(P)鎖匙扣 - 不銹鋼」被意外改動：預期375，實得 %', v_old_adult_cost;
    END IF;
END $$;
