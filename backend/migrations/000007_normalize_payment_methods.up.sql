-- Migration 000007: Create normalized payment_methods table and link to payments

CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'DIGITAL', -- DIGITAL or CASH
  account_number TEXT NOT NULL DEFAULT '',
  account_name TEXT NOT NULL DEFAULT '',
  instructions TEXT DEFAULT '',
  qr_code_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default normalized payment methods
INSERT INTO payment_methods (id, name, code, type, account_number, account_name, instructions, is_active)
VALUES 
  ('pm-cash', 'Cash Payment', 'CASH', 'CASH', '', 'Cashier / Register', 'Pay cash directly to waiter or cashier upon departure', true),
  ('pm-telebirr', 'Telebirr', 'TELEBIRR', 'DIGITAL', '0911234567', 'Yadotena Milk & Foods PLC', 'Transfer exact amount via Telebirr SuperApp to merchant number', true),
  ('pm-cbe', 'Commercial Bank of Ethiopia (CBE)', 'CBE', 'DIGITAL', '1000123456789', 'Yadotena Milk & Foods', 'Transfer to CBE account and provide transaction ref number', true),
  ('pm-boa', 'Bank of Abyssinia (BOA)', 'BOA', 'DIGITAL', '987654321', 'Yadotena Milk & Foods', 'Transfer to Bank of Abyssinia account number', true),
  ('pm-ebirr', 'E-Birr / Mobile Wallet', 'EBIRR', 'DIGITAL', '0911234567', 'Yadotena Milk & Foods PLC', 'Transfer via E-Birr or M-PESA mobile agent', true)
ON CONFLICT (id) DO UPDATE SET
  account_number = EXCLUDED.account_number,
  account_name = EXCLUDED.account_name;

-- Normalize payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(50) REFERENCES payment_methods(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_method_id ON payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
