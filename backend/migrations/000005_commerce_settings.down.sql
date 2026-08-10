ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_tax_percent_range;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_delivery_fee_nonneg;
ALTER TABLE settings DROP COLUMN IF EXISTS tax_percent;
ALTER TABLE settings DROP COLUMN IF EXISTS delivery_fee_etb;
