-- Live Employee Tracking Module
-- Run this SQL in your Supabase SQL Editor to create the required tables.

-- 1. Employee location tracking table
CREATE TABLE IF NOT EXISTS employee_locations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed DOUBLE PRECISION,
  battery_level INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries by user and time
CREATE INDEX IF NOT EXISTS idx_employee_locations_user_time
  ON employee_locations(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_employee_locations_timestamp
  ON employee_locations(timestamp DESC);

-- 2. Geofences table
CREATE TABLE IF NOT EXISTS geofences (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Geofence alerts table
CREATE TABLE IF NOT EXISTS geofence_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  geofence_id BIGINT REFERENCES geofences(id) ON DELETE CASCADE,
  geofence_name TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('ENTER', 'EXIT')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_alerts_user
  ON geofence_alerts(user_id, timestamp DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_alerts ENABLE ROW LEVEL SECURITY;

-- Employee locations:
-- Employees can INSERT their own location
CREATE POLICY "Employees can insert own location"
  ON employee_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all locations (read-only)
CREATE POLICY "Admins can read all locations"
  ON employee_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Employees can read their own locations
CREATE POLICY "Employees can read own locations"
  ON employee_locations FOR SELECT
  USING (auth.uid() = user_id);

-- Geofences:
-- Admins can manage geofences
CREATE POLICY "Admins can manage geofences"
  ON geofences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Everyone authenticated can read geofences
CREATE POLICY "Authenticated users can read geofences"
  ON geofences FOR SELECT
  USING (auth.role() = 'authenticated');

-- Geofence alerts:
-- System inserts alerts (via service role or admin)
CREATE POLICY "Admins can manage geofence alerts"
  ON geofence_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Admins can read alerts
CREATE POLICY "Admins can read geofence alerts"
  ON geofence_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- ============================================================
-- Auto-cleanup: Remove location data older than 90 days
-- ============================================================
-- You can set up a cron job in Supabase to periodically clean old data:
-- DELETE FROM employee_locations WHERE timestamp < NOW() - INTERVAL '90 days';
