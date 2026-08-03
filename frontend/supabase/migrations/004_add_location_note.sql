-- Add note column to employee_locations
-- Run this SQL in your Supabase SQL Editor.

ALTER TABLE employee_locations
  ADD COLUMN IF NOT EXISTS note TEXT;
