-- Migration: 0011_rename_order_id_security_definer
-- Purpose: Improved rename_order_id with:
--   (1) SECURITY DEFINER — runs as postgres, anon/service_role both work
--   (2) Row-level locking — prevents concurrent rename race condition
--   (3) Merge-on-collision — handles case where sbSyncOrder creates new_id first
--   (4) Idempotent — safe to call twice
-- Created: 2026-05-22
-- Related: migration 0010, a2_implementation_plan.md

BEGIN;

CREATE OR REPLACE FUNCTION rename_order_id(old_id TEXT, new_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_old_exists BOOLEAN;
  v_new_exists BOOLEAN;
BEGIN
  -- No-op if IDs are the same
  IF old_id = new_id THEN RETURN; END IF;

  -- Row-level locking to prevent concurrent transaction deadlocks
  PERFORM 1 FROM orders WHERE order_id IN (old_id, new_id) FOR UPDATE;

  SELECT EXISTS(SELECT 1 FROM orders WHERE order_id = old_id) INTO v_old_exists;
  SELECT EXISTS(SELECT 1 FROM orders WHERE order_id = new_id) INTO v_new_exists;

  -- Idempotent: rename already completed
  IF v_new_exists AND NOT v_old_exists THEN
    RETURN;
  END IF;

  -- Race condition: sbSyncOrder created new_id before n8n rename ran.
  -- Merge critical fields from old_id → new_id, then delete ghost old_id.
  IF v_new_exists AND v_old_exists THEN
    UPDATE orders n
      SET
        confirmed_at   = COALESCE(n.confirmed_at,   o.confirmed_at),
        process_status = COALESCE(n.process_status, o.process_status),
        batch_number   = COALESCE(n.batch_number,   o.batch_number),
        admin_notes    = COALESCE(n.admin_notes,     o.admin_notes)
      FROM orders o
      WHERE o.order_id = old_id AND n.order_id = new_id;

    DELETE FROM orders WHERE order_id = old_id;
    RETURN;
  END IF;

  -- Normal rename flow
  UPDATE order_items
    SET item_key = REPLACE(item_key, old_id, new_id)
    WHERE order_fhs_id = old_id;

  UPDATE orders
    SET order_id = new_id
    WHERE order_id = old_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'rename_order_id: order % not found', old_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rename_order_id IS
  'Idempotent order_id rename with row-level lock and merge-on-collision. '
  'SECURITY DEFINER runs as postgres. Handles race where frontend creates new_id '
  'before n8n rename runs. Called by n8n V47.9 (service_role).';

COMMIT;
