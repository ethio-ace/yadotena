-- Migration 000016 Down
DROP INDEX IF EXISTS idx_order_items_order_status;
DROP INDEX IF EXISTS idx_order_items_status;
ALTER TABLE order_items DROP COLUMN IF EXISTS completed_at;
ALTER TABLE order_items DROP COLUMN IF EXISTS started_at;
ALTER TABLE order_items DROP COLUMN IF EXISTS status;
