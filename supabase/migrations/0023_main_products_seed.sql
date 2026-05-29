-- ============================================================
-- Migration 0023 — Main Products Static Seed (G4 CI Fix)
-- ============================================================
-- Purpose:
--   Insert the 30 canonical main-product SKUs (BASE_PREFIXES from
--   V47.13 Smart Cache Strategist) as static migration records.
--   Addons (羊毛氈公仔 - 加購, 燈飾 - 加購) are seeded in 0014 / 0019.
--
-- Design decisions:
--   - ON CONFLICT (sku) DO NOTHING — never overwrite existing costs/prices
--   - total_base_cost = 0 placeholder; real values written by n8n after
--     each order sync (Mirror Prep) or via Financial Batch Recalculate
--   - suggested_price = 0 placeholder; set by Fat Mo in products table
--   - These SKUs are used as prefix-match anchors by Smart Cache V47.13
--     (products with longer variant SKUs fall back to prefix lookup)
--
-- Coverage: 4 立體擺設 + 14 金屬鎖匙扣 + 12 純銀頸鏈吊飾 = 30 SKUs
-- Note: External seeding script may have created additional variant SKUs
--       (total products table comment says ~104). This migration ensures
--       the prefix-anchor SKUs exist for FK and Smart Cache correctness.
--
-- Rollback:
--   DELETE FROM products WHERE sku IN (
--     '木框套裝 (4肢)', '木框套裝 (2肢)',
--     '玻璃瓶套裝 (4肢)', '玻璃瓶套裝 (2肢)',
--     '嬰兒鎖匙扣 - 不銹鋼', '嬰兒鎖匙扣 - 鋁合金',
--     '嬰兒(P)鎖匙扣 - 不銹鋼', '嬰兒(P)鎖匙扣 - 鋁合金',
--     '嬰兒吊飾 - 925銀', '嬰兒吊飾 - 925金',
--     '嬰兒(P)吊飾 - 925銀', '嬰兒(P)吊飾 - 925金',
--     '家庭(S1)鎖匙扣 - 不銹鋼', '家庭(S1)鎖匙扣 - 鋁合金',
--     '家庭(S2)鎖匙扣 - 不銹鋼', '家庭(S2)鎖匙扣 - 鋁合金',
--     '家庭(P1)鎖匙扣 - 不銹鋼', '家庭(P1)鎖匙扣 - 鋁合金',
--     '家庭(P2)鎖匙扣 - 不銹鋼', '家庭(P2)鎖匙扣 - 鋁合金',
--     '家庭(S1)吊飾 - 925銀', '家庭(S1)吊飾 - 925金',
--     '家庭(S2)吊飾 - 925銀', '家庭(S2)吊飾 - 925金',
--     '家庭(P1)吊飾 - 925銀', '家庭(P1)吊飾 - 925金',
--     '家庭(P2)吊飾 - 925銀', '家庭(P2)吊飾 - 925金',
--     '成人(P)鎖匙扣 - 不銹鋼', '成人(P)鎖匙扣 - 鋁合金',
--     '成人(P)吊飾 - 925銀', '成人(P)吊飾 - 925金'
--   );
-- ============================================================


-- ============================================================
-- GROUP A: 立體擺設 (4 SKUs)
-- ============================================================

INSERT INTO products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost, suggested_price)
VALUES
  ('木框套裝 (4肢)',   '立體擺設', '手模', NULL, NULL, 4, 0, 0),
  ('木框套裝 (2肢)',   '立體擺設', '手模', NULL, NULL, 2, 0, 0),
  ('玻璃瓶套裝 (4肢)', '立體擺設', '手模', NULL, NULL, 4, 0, 0),
  ('玻璃瓶套裝 (2肢)', '立體擺設', '手模', NULL, NULL, 2, 0, 0)
ON CONFLICT (sku) DO NOTHING;


-- ============================================================
-- GROUP B: 金屬鎖匙扣 (14 SKUs)
-- ============================================================

INSERT INTO products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost, suggested_price)
VALUES
  -- 嬰兒 S（掃描建模）
  ('嬰兒鎖匙扣 - 不銹鋼',     '金屬鎖匙扣', '嬰兒', '不銹鋼', 'S',  1, 0, 0),
  ('嬰兒鎖匙扣 - 鋁合金',     '金屬鎖匙扣', '嬰兒', '鋁合金', 'S',  1, 0, 0),
  -- 嬰兒 P（照片建模）
  ('嬰兒(P)鎖匙扣 - 不銹鋼',  '金屬鎖匙扣', '嬰兒', '不銹鋼', 'P',  1, 0, 0),
  ('嬰兒(P)鎖匙扣 - 鋁合金',  '金屬鎖匙扣', '嬰兒', '鋁合金', 'P',  1, 0, 0),
  -- 家庭 S1/S2（掃描建模，單人 / 多人）
  ('家庭(S1)鎖匙扣 - 不銹鋼', '金屬鎖匙扣', '家庭', '不銹鋼', 'S1', 1, 0, 0),
  ('家庭(S1)鎖匙扣 - 鋁合金', '金屬鎖匙扣', '家庭', '鋁合金', 'S1', 1, 0, 0),
  ('家庭(S2)鎖匙扣 - 不銹鋼', '金屬鎖匙扣', '家庭', '不銹鋼', 'S2', 1, 0, 0),
  ('家庭(S2)鎖匙扣 - 鋁合金', '金屬鎖匙扣', '家庭', '鋁合金', 'S2', 1, 0, 0),
  -- 家庭 P1/P2（照片建模）
  ('家庭(P1)鎖匙扣 - 不銹鋼', '金屬鎖匙扣', '家庭', '不銹鋼', 'P1', 1, 0, 0),
  ('家庭(P1)鎖匙扣 - 鋁合金', '金屬鎖匙扣', '家庭', '鋁合金', 'P1', 1, 0, 0),
  ('家庭(P2)鎖匙扣 - 不銹鋼', '金屬鎖匙扣', '家庭', '不銹鋼', 'P2', 1, 0, 0),
  ('家庭(P2)鎖匙扣 - 鋁合金', '金屬鎖匙扣', '家庭', '鋁合金', 'P2', 1, 0, 0),
  -- 成人 P（Bible §1: 成人僅限照片建模）
  ('成人(P)鎖匙扣 - 不銹鋼',  '金屬鎖匙扣', '成人', '不銹鋼', 'P',  1, 0, 0),
  ('成人(P)鎖匙扣 - 鋁合金',  '金屬鎖匙扣', '成人', '鋁合金', 'P',  1, 0, 0)
ON CONFLICT (sku) DO NOTHING;


-- ============================================================
-- GROUP C: 純銀頸鏈吊飾 (12 SKUs)
-- ============================================================

INSERT INTO products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost, suggested_price)
VALUES
  -- 嬰兒吊飾
  ('嬰兒吊飾 - 925銀',        '純銀頸鏈吊飾', '嬰兒', '925銀', 'S',  1, 0, 0),
  ('嬰兒吊飾 - 925金',        '純銀頸鏈吊飾', '嬰兒', '925金', 'S',  1, 0, 0),
  ('嬰兒(P)吊飾 - 925銀',     '純銀頸鏈吊飾', '嬰兒', '925銀', 'P',  1, 0, 0),
  ('嬰兒(P)吊飾 - 925金',     '純銀頸鏈吊飾', '嬰兒', '925金', 'P',  1, 0, 0),
  -- 家庭吊飾
  ('家庭(S1)吊飾 - 925銀',    '純銀頸鏈吊飾', '家庭', '925銀', 'S1', 1, 0, 0),
  ('家庭(S1)吊飾 - 925金',    '純銀頸鏈吊飾', '家庭', '925金', 'S1', 1, 0, 0),
  ('家庭(S2)吊飾 - 925銀',    '純銀頸鏈吊飾', '家庭', '925銀', 'S2', 1, 0, 0),
  ('家庭(S2)吊飾 - 925金',    '純銀頸鏈吊飾', '家庭', '925金', 'S2', 1, 0, 0),
  ('家庭(P1)吊飾 - 925銀',    '純銀頸鏈吊飾', '家庭', '925銀', 'P1', 1, 0, 0),
  ('家庭(P1)吊飾 - 925金',    '純銀頸鏈吊飾', '家庭', '925金', 'P1', 1, 0, 0),
  ('家庭(P2)吊飾 - 925銀',    '純銀頸鏈吊飾', '家庭', '925銀', 'P2', 1, 0, 0),
  ('家庭(P2)吊飾 - 925金',    '純銀頸鏈吊飾', '家庭', '925金', 'P2', 1, 0, 0),
  -- 成人吊飾（Bible §1: 成人 P 僅照片建模，drawing_cost_adult_p = $240）
  ('成人(P)吊飾 - 925銀',     '純銀頸鏈吊飾', '成人', '925銀', 'P',  1, 0, 0),
  ('成人(P)吊飾 - 925金',     '純銀頸鏈吊飾', '成人', '925金', 'P',  1, 0, 0)
ON CONFLICT (sku) DO NOTHING;


COMMENT ON TABLE products IS
  '集中式產品資料表。104 SKUs（估算）。
   主力 SKU 靜態基準由 0023 保證；成本由 n8n Mirror Prep / Financial Batch Recalculate 寫入。
   Addon SKUs 由 0014（羊毛氈）/ 0019（燈飾）個別管理。
   total_base_cost 永遠不在此 migration 硬編碼（避免與 n8n 運行時寫入衝突）。';
