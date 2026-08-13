-- Migration 000010 Down
ALTER TABLE IF EXISTS expenses DROP COLUMN IF EXISTS reference;
