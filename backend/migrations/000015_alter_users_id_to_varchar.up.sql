-- Migration 000015: Convert users.id from UUID to VARCHAR(50) for string seed compatibility

-- 1. Drop foreign key constraint on expenses if present
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_recorded_by_id_fkey;

-- 2. Alter column types for users.id and expenses.recorded_by_id
ALTER TABLE expenses ALTER COLUMN recorded_by_id TYPE VARCHAR(50) USING recorded_by_id::text;
ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(50) USING id::text;

-- 3. Re-add foreign key constraint
ALTER TABLE expenses ADD CONSTRAINT expenses_recorded_by_id_fkey FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL;
