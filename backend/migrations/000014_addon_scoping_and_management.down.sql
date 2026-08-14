-- Migration 000014 Down: Rollback addon scoping

DROP INDEX IF EXISTS idx_menu_item_addons_global;
DROP INDEX IF EXISTS idx_menu_item_addons_menu_item;
DROP INDEX IF EXISTS idx_menu_item_addons_category;

ALTER TABLE menu_item_addons DROP COLUMN IF EXISTS created_at;
ALTER TABLE menu_item_addons DROP COLUMN IF EXISTS sort_order;
ALTER TABLE menu_item_addons DROP COLUMN IF EXISTS is_active;
ALTER TABLE menu_item_addons DROP COLUMN IF EXISTS is_global;
ALTER TABLE menu_item_addons DROP COLUMN IF EXISTS category_id;
