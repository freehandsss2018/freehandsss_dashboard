-- Migration: add is_text_overridden flag to orders table
-- Phase A of cl-flow 2026-05-26-0627
-- Tracks whether full_order_text has been manually overridden via Modal edit
-- (prevents future generate() or batch sync from silently overwriting manual edits)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_text_overridden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.is_text_overridden IS
  'True when full_order_text was manually edited via Dashboard Modal. Prevents automated re-generation from silently overwriting manual edits.';
