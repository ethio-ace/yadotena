-- Migration 000014: Addon Scoping & Management (Global, Category, Item-Level)

-- 1. Modify menu_item_id to be nullable so addons can be scoped globally or to whole categories
ALTER TABLE menu_item_addons ALTER COLUMN menu_item_id DROP NOT NULL;

-- 2. Add category_id, is_global, is_active, sort_order, and created_at columns to menu_item_addons
ALTER TABLE menu_item_addons ADD COLUMN IF NOT EXISTS category_id VARCHAR(50) REFERENCES menu_categories(id) ON DELETE CASCADE;
ALTER TABLE menu_item_addons ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE menu_item_addons ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE menu_item_addons ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE menu_item_addons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. Indexes for fast retrieval of respective addons
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_category ON menu_item_addons(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_menu_item ON menu_item_addons(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_global ON menu_item_addons(is_global);
