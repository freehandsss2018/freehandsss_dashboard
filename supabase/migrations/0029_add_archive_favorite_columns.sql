-- Migration 0029: Add is_archived and is_favorite to orders table
-- Task: V42 手機訂單總覽 WhatsApp/Threads 視覺觸控改造
-- Session: 64 (2026-06-06)
-- Execution: Fat Mo 在 Supabase SQL Editor 手動執行
--
-- 用途：
--   is_archived: 封存訂單（true = 從「進行中」列表移出，顯示於「已封存」分頁）
--   is_favorite: 最愛訂單（true = 在列表置頂顯示 + 金色 accent bar）
--
-- 設計說明：
--   - DEFAULT false 確保既有訂單不受影響（向下相容）
--   - NOT NULL 防止 NULL 混入 boolean 過濾邏輯
--   - 前端直接 PATCH（沿用 saveInlineEdit 的 order-level PATCH 路徑，不經 n8n）
--   - anon UPDATE 政策由既有 admin_notes PATCH 路徑已實證可行，無需額外 RLS

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- 索引：加速「進行中」列表查詢（is_archived=false 的主要用途）
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON orders (is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_is_favorite ON orders (is_favorite);

-- Smoke test（執行後驗證）：
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
--   AND column_name IN ('is_archived', 'is_favorite');
-- 預期：兩欄存在，data_type = boolean，column_default = false
