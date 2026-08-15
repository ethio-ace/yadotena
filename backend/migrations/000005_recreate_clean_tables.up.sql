-- Migration 000005: Recreate clean table structures for service_requests, expenses, reviews, customers

DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE service_requests (
  id VARCHAR(50) PRIMARY KEY,
  table_id VARCHAR(50) NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'WAITER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE expenses (
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

CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Guest',
  rating INT NOT NULL DEFAULT 5,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
