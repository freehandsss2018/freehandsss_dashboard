-- Migration: 0010_order_id_cascade_update
-- Purpose: (1) Add ON UPDATE CASCADE to order_items FK
--          (2) Create rename_order_id() RPC for atomic order rename
-- Created: 2026-05-22
-- Triggered by: Dashboard Order_ID edit feature debug
-- Related: AGENTS.md §3.12 Supabase-First, .fhs/notes/decisions.md

BEGIN;

-- ── Step 1: Rebuild FK with ON UPDATE CASCADE ─────────────────────────────
-- Original FK (0001_initial_schema.sql:176) only had ON DELETE CASCADE.
-- Without ON UPDATE CASCADE, any PATCH to orders.order_id throws FK violation.

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_order_fhs_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_order_fhs_id_fkey
  FOREIGN KEY (order_fhs_id)
  REFERENCES orders(order_id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ── Step 2: rename_order_id() RPC ─────────────────────────────────────────
-- Atomically renames an order_id in a single transaction:
--   1. Update item_key prefix (e.g. 06001005_K_LH → 0600105_K_LH)
--   2. Update orders.order_id (ON UPDATE CASCADE handles order_fhs_id)
-- Called by n8n Mirror_to_Supabase V47.7 when New_Order_ID is present.
-- process_status / batch_number are NOT touched — only the ID strings change.

CREATE OR REPLACE FUNCTION rename_order_id(old_id TEXT, new_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update item_key prefix BEFORE updating orders.order_id
  -- (CASCADE hasn't fired yet at this point)
  UPDATE order_items
    SET item_key = REPLACE(item_key, old_id, new_id)
    WHERE order_fhs_id = old_id;

  -- Update orders.order_id → ON UPDATE CASCADE auto-updates order_fhs_id
  UPDATE orders
    SET order_id = new_id
    WHERE order_id = old_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'rename_order_id: order % not found', old_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rename_order_id IS
  'Atomic order_id rename. Updates item_key prefix then orders.order_id '
  '(CASCADE handles order_fhs_id). Called by n8n Mirror_to_Supabase V47.7.';

COMMIT;