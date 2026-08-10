-- Commerce settings: tax percent and delivery fee (editable by owner).
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS delivery_fee_etb NUMERIC(12,2) NOT NULL DEFAULT 100;

ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_tax_percent_range;
ALTER TABLE settings
  ADD CONSTRAINT settings_tax_percent_range CHECK (tax_percent >= 0 AND tax_percent <= 100);

ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_delivery_fee_nonneg;
ALTER TABLE settings
  ADD CONSTRAINT settings_delivery_fee_nonneg CHECK (delivery_fee_etb >= 0);
