-- Migration 0079: cl-flow 2026-07-25-0148 — 配件成本獨立欄位
-- 修復「配件」分類（羊毛氈公仔/燈飾加購，限玻璃瓶款式立體擺設）itemCost 已計入
-- total_cost 但漏落訂單層三分類 rollup 嘅顯示缺口。全庫僅3張單/$60，金額本身無誤，
-- 純分類標記缺失。欄位定義貼近 migration 0027（drawing_cost 等）precedent：
-- nullable + DEFAULT 0，非 NOT NULL（AG#6/PX#3 評審採納，草案原稿誤稱「與現有
-- handmodel_cost 等欄位約束一致」為事實錯誤，實測 migration 0001 顯示原三欄根本冇
-- NOT NULL 約束）。

ALTER TABLE orders      ADD COLUMN accessory_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN accessory_cost NUMERIC(10,2) DEFAULT 0;

-- Smoke test
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'accessory_cost'
  ) THEN
    RAISE EXCEPTION '0079 Smoke FAIL: orders.accessory_cost 欄位不存在';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'accessory_cost'
  ) THEN
    RAISE EXCEPTION '0079 Smoke FAIL: order_items.accessory_cost 欄位不存在';
  END IF;
  RAISE NOTICE '0079 PASS: accessory_cost 欄位已建立於 orders + order_items';
END $$;
