ALTER TABLE orders DROP COLUMN IF EXISTS delivery_fee_etb;
ALTER TABLE orders DROP COLUMN IF EXISTS service_charge_etb;
ALTER TABLE orders DROP COLUMN IF EXISTS tax_etb;

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS service_requests;
