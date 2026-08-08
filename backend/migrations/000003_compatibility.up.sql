-- Service requests (waiter / bill / assistance)
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES cafe_tables(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('WAITER', 'BILL', 'ASSISTANCE')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_table ON service_requests (table_id);

-- Customer reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Guest',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews (created_at DESC);

-- Order total breakdown (align with FE checkout)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tax_etb NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge_etb NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_etb NUMERIC(12,2) NOT NULL DEFAULT 0;
