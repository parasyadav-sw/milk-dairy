-- Potential Customers Module
-- Run this SQL in your Supabase SQL Editor to create the required table.

-- 1. Potential Customers table
CREATE TABLE IF NOT EXISTS potential_customers (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('FARMER', 'CHAIRMAN')),

  -- Shared fields
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  village TEXT NOT NULL,
  address TEXT NOT NULL,
  interest_status TEXT NOT NULL DEFAULT 'INTERESTED' CHECK (interest_status IN ('INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'CONVERTED')),
  remarks TEXT,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Farmer-specific fields
  cow_count INTEGER DEFAULT 0,
  buffalo_count INTEGER DEFAULT 0,
  total_animals INTEGER DEFAULT 0,
  avg_milk_per_animal DOUBLE PRECISION DEFAULT 0,
  total_daily_milk DOUBLE PRECISION DEFAULT 0,

  -- Chairman-specific fields
  dairy_society_name TEXT,
  daily_milk_capacity DOUBLE PRECISION DEFAULT 0,
  existing_dairy_partner TEXT,

  -- Conversion tracking
  converted_farmer_id TEXT,
  converted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_potential_customers_employee ON potential_customers(employee_id);
CREATE INDEX IF NOT EXISTS idx_potential_customers_category ON potential_customers(category);
CREATE INDEX IF NOT EXISTS idx_potential_customers_status ON potential_customers(interest_status);
CREATE INDEX IF NOT EXISTS idx_potential_customers_village ON potential_customers(village);
CREATE INDEX IF NOT EXISTS idx_potential_customers_created ON potential_customers(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_potential_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS potential_customers_updated_at ON potential_customers;
CREATE TRIGGER potential_customers_updated_at
  BEFORE UPDATE ON potential_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_potential_customers_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE potential_customers ENABLE ROW LEVEL SECURITY;

-- Employees can insert their own records
CREATE POLICY "Employees can insert potential customers"
  ON potential_customers FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Employees can read their own records
CREATE POLICY "Employees can read own potential customers"
  ON potential_customers FOR SELECT
  USING (auth.uid() = employee_id);

-- Admins can read all records
CREATE POLICY "Admins can read all potential customers"
  ON potential_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Admins can update all records
CREATE POLICY "Admins can update all potential customers"
  ON potential_customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Employees can update their own records
CREATE POLICY "Employees can update own potential customers"
  ON potential_customers FOR UPDATE
  USING (auth.uid() = employee_id);

-- Admins can delete all records
CREATE POLICY "Admins can delete all potential customers"
  ON potential_customers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Employees can delete their own records
CREATE POLICY "Employees can delete own potential customers"
  ON potential_customers FOR DELETE
  USING (auth.uid() = employee_id);
