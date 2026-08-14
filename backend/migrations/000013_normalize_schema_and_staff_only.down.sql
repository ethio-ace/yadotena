-- Migration 000013 Down: Rollback normalization changes

DROP INDEX IF EXISTS idx_order_item_addons_item_id;
DROP TABLE IF EXISTS order_item_addons CASCADE;
DROP TABLE IF EXISTS menu_item_dietary_tags CASCADE;
DROP TABLE IF EXISTS dietary_tags CASCADE;

ALTER TABLE tables ADD COLUMN IF NOT EXISTS current_order_id VARCHAR(50);
