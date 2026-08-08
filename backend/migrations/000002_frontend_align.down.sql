-- backend/migrations/000002_frontend_align.down.sql
DROP TABLE IF EXISTS expenses;
ALTER TABLE settings DROP COLUMN IF EXISTS service_charge_percent;
ALTER TABLE menu_items DROP COLUMN IF EXISTS preparation_time_minutes;
-- Note: narrowing order_status check is unsafe if confirmed/served rows exist; leave widened check or document manual cleanup.
