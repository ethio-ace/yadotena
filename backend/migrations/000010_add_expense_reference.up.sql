-- Migration 000010: Add reference column to expenses table for digital non-cash transaction IDs
ALTER TABLE IF EXISTS expenses ADD COLUMN IF NOT EXISTS reference TEXT;
