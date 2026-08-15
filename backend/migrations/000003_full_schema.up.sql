-- Migration 000003: Full Schema Alignment for Yadotena Frontend & Go backend architecture

-- Drop old prototype tables if present to ensure clean type & column alignment
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS dining_sessions CASCADE;
DROP TABLE IF EXISTS cafe_tables CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS menu_item_addons CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS restaurant_settings CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'WAITER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍽️',
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  category_id VARCHAR(50) REFERENCES menu_categories(id) ON DELETE SET NULL,
  image TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  preparation_time INT NOT NULL DEFAULT 15,
  dietary_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_addons (
  id VARCHAR(50) PRIMARY KEY,
  menu_item_id VARCHAR(50) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS tables (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  qr_token TEXT UNIQUE NOT NULL,
  current_order_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dining_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id VARCHAR(50) NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_code VARCHAR(20) UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'DINE_IN',
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  table_id VARCHAR(50) REFERENCES tables(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  service_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  idempotency_key VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id VARCHAR(50) REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  quantity INT NOT NULL DEFAULT 1,
  special_instructions TEXT,
  selected_addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  round_number INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS service_requests (
  id VARCHAR(50) PRIMARY KEY,
  table_id VARCHAR(50) NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'WAITER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(50) PRIMARY KEY,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Guest',
  rating INT NOT NULL DEFAULT 5,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'TELEBIRR',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PAID',
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  restaurant_name TEXT NOT NULL DEFAULT 'Yadotena Milk & Foods',
  phone TEXT NOT NULL DEFAULT '+251 91 123 4567',
  address TEXT NOT NULL DEFAULT 'Bole Road, Addis Ababa',
  service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  vat_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  guest_wifi_ssid TEXT NOT NULL DEFAULT 'Yadotena_Milk_5G',
  guest_wifi_password TEXT NOT NULL DEFAULT 'Yadotena2026',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings if empty
INSERT INTO restaurant_settings (id, restaurant_name, phone, address, service_charge_percent, vat_percent, guest_wifi_ssid, guest_wifi_password)
VALUES (1, 'Yadotena Milk & Foods', '+251 91 123 4567', 'Bole Road, Addis Ababa', 10.00, 15.00, 'Yadotena_Milk_5G', 'Yadotena2026')
ON CONFLICT (id) DO NOTHING;

-- Operational Performance & Defense-in-Depth Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_round ON order_items (order_id, round_number);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
