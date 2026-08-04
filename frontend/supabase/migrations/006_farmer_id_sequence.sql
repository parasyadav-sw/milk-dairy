-- Migration: Add farmer ID sequence and generation function
-- Run this SQL in your Supabase SQL Editor

-- Create a sequence for farmer IDs
CREATE SEQUENCE IF NOT EXISTS farmer_id_seq START 1;

-- Function to generate next farmer ID
CREATE OR REPLACE FUNCTION generate_farmer_id()
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('farmer_id_seq');
  RETURN 'FMR-' || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
