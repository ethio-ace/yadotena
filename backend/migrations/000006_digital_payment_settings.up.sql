-- Migration 000006: Add receipt_url to payments and digital banking accounts to restaurant_settings

ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS telebirr_no TEXT DEFAULT '0911234567';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS telebirr_name TEXT DEFAULT 'Yadotena Milk & Foods PLC';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS cbe_account TEXT DEFAULT '1000123456789';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS cbe_name TEXT DEFAULT 'Yadotena Milk & Foods';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS boa_account TEXT DEFAULT '987654321';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS boa_name TEXT DEFAULT 'Yadotena Milk & Foods';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS ebirr_account TEXT DEFAULT '0911234567';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS ebirr_name TEXT DEFAULT 'Yadotena Milk & Foods PLC';
