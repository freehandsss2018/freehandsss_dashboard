-- Migration: add full_order_text_a and full_order_text_b columns to orders
-- Phase B of cl-flow 2026-05-26-0627
-- Stores hand-model (A) and metal/jewelry (B) IG message sections separately
-- to allow per-category display in Modal without parsing the combined full_order_text.
-- Backfill is handled by the Dashboard write path on next save; historical orders
-- fall back to client-side extraction via _extractOrderText().

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS full_order_text_a TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_order_text_b TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN orders.full_order_text_a IS
  'Hand-model (立體擺設) section of the IG order confirmation message. Populated by Dashboard sbSyncOrder on each save.';
COMMENT ON COLUMN orders.full_order_text_b IS
  'Metal/jewelry (吊飾產品) section of the IG order confirmation message. Populated by Dashboard sbSyncOrder on each save.';
