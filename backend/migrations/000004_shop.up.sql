-- Retail shop: product catalog + shop order types

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_etb NUMERIC(12,2) NOT NULL CHECK (price_etb >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products (is_available);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('dine_in', 'pickup', 'delivery', 'shop_pickup', 'shop_delivery'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS delivery_needs_address;
ALTER TABLE orders ADD CONSTRAINT delivery_needs_address
  CHECK (
    order_type NOT IN ('delivery', 'shop_delivery')
    OR (delivery_address IS NOT NULL AND delivery_address <> '')
  );

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Allow menu-only or product-only lines
ALTER TABLE order_items ALTER COLUMN menu_item_id DROP NOT NULL;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_line_source;
ALTER TABLE order_items ADD CONSTRAINT order_items_line_source CHECK (
  (menu_item_id IS NOT NULL AND product_id IS NULL)
  OR (menu_item_id IS NULL AND product_id IS NOT NULL)
);
