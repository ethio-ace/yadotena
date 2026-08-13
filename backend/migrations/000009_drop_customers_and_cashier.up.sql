-- Migration 000009: Drop customers table and remove CASHIER role users

-- 1. Drop customers table if exists
DROP TABLE IF EXISTS customers CASCADE;

-- 2. Remove any remaining CASHIER users from users table
DELETE FROM users WHERE role = 'CASHIER';
