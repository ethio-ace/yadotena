ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_line_source;

ALTER TABLE order_items DROP COLUMN IF EXISTS product_id;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS delivery_needs_address;
ALTER TABLE orders ADD CONSTRAINT delivery_needs_address
  CHECK (order_type <> 'delivery' OR (delivery_address IS NOT NULL AND delivery_address <> ''));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('dine_in', 'pickup', 'delivery'));

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
