-- Add per-animal-type milk yield fields to potential_customers
-- Run this SQL in your Supabase SQL Editor.

ALTER TABLE potential_customers
  ADD COLUMN IF NOT EXISTS cow_milk_yield DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffalo_milk_yield DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cow_milk DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_buffalo_milk DOUBLE PRECISION DEFAULT 0;
