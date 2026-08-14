-- Migration 000013: Relational Normalization (1NF-5NF) and Staff-Only Purge

-- 1. Explicitly drop all unnecessary and legacy prototype tables
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS cafe_tables CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 2. Drop transitive current_order_id from tables (3NF compliance)
ALTER TABLE tables DROP COLUMN IF EXISTS current_order_id;

-- 3. Create normalized dietary_tags and menu_item_dietary_tags (1NF / 4NF compliance)
CREATE TABLE IF NOT EXISTS dietary_tags (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_dietary_tags (
  menu_item_id VARCHAR(50) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  tag_id VARCHAR(50) NOT NULL REFERENCES dietary_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, tag_id)
);

-- 4. Create normalized order_item_addons join table (1NF / 4NF compliance)
CREATE TABLE IF NOT EXISTS order_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id VARCHAR(50) NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_id VARCHAR(50) REFERENCES menu_item_addons(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Clean up non-staff user roles from users table (Staff-Only System)
DELETE FROM users WHERE UPPER(role) NOT IN ('WAITER', 'CHEF', 'MANAGER', 'OWNER');

-- 6. Add foreign key index for order_item_addons
CREATE INDEX IF NOT EXISTS idx_order_item_addons_item_id ON order_item_addons(order_item_id);
