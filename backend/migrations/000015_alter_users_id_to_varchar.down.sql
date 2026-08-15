-- Migration 000015 Down
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_recorded_by_id_fkey;
ALTER TABLE expenses ALTER COLUMN recorded_by_id TYPE UUID USING recorded_by_id::uuid;
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE expenses ADD CONSTRAINT expenses_recorded_by_id_fkey FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL;
