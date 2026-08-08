-- Yadotena initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'waiter', 'chef')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_etb NUMERIC(12,2) NOT NULL CHECK (price_etb >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cafe_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  seats INT NOT NULL DEFAULT 2 CHECK (seats > 0),
  assigned_waiter_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cafe_name TEXT NOT NULL DEFAULT 'Yadotena',
  cafe_phone TEXT NOT NULL DEFAULT '',
  cafe_address TEXT NOT NULL DEFAULT '',
  accepting_orders BOOLEAN NOT NULL DEFAULT true,
  cash_enabled BOOLEAN NOT NULL DEFAULT true,
  digital_enabled BOOLEAN NOT NULL DEFAULT true,
  digital_methods JSONB NOT NULL DEFAULT '["Telebirr","CBE"]'::jsonb,
  public_base_url TEXT NOT NULL DEFAULT 'http://localhost:3000',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'pickup', 'delivery')),
  order_status TEXT NOT NULL CHECK (order_status IN ('placed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'rejected')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  table_id UUID REFERENCES cafe_tables(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  subtotal_etb NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_etb NUMERIC(12,2) NOT NULL DEFAULT 0,
  taken_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dine_in_needs_table CHECK (order_type <> 'dine_in' OR table_id IS NOT NULL),
  CONSTRAINT delivery_needs_address CHECK (order_type <> 'delivery' OR (delivery_address IS NOT NULL AND delivery_address <> ''))
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  unit_price_etb NUMERIC(12,2) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'digital')),
  digital_method TEXT,
  reference TEXT,
  verified_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders(order_status, payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_phone ON orders(customer_phone);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
