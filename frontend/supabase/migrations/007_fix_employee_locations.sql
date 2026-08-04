-- Migration: Fix employee_locations table schema
-- Run this SQL in your Supabase SQL Editor
-- This drops the old table (which had wrong FK and missing columns) and recreates it correctly.

DROP TABLE IF EXISTS public.employee_locations CASCADE;

CREATE TABLE public.employee_locations (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trip_id bigint references public.location_trips(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision not null,
  speed double precision,
  battery_level integer,
  note text,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX idx_employee_locations_user_id ON public.employee_locations(user_id);
CREATE INDEX idx_employee_locations_trip_id ON public.employee_locations(trip_id);
CREATE INDEX idx_employee_locations_timestamp ON public.employee_locations(timestamp desc);

ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all authenticated users full access on employee_locations"
    ON public.employee_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_locations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
