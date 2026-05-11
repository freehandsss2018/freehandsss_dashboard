-- Migration 0002: Add soft-delete support to orders table
-- Reason: Mirror Delete path needs audit trail — hard delete loses history.
-- deleted_at NULL = active, deleted_at NOT NULL = soft-deleted from Dashboard.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN orders.deleted_at IS
  'Soft-delete timestamp. Set by n8n Mirror Delete node when Dashboard sends DELETE action. '
  'NULL = active order. Supabase retains record for audit trail.';
