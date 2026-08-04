-- Migration: Add live tracking, notes, and trip history tables
-- Run this SQL in your Supabase SQL Editor if the tables don't already exist.

-- 1. Location Trips Table (each share→stop cycle is a permanent trip record)
create table if not exists public.location_trips (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_name text,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  start_lat double precision,
  start_lng double precision,
  start_location_name text,
  end_lat double precision,
  end_lng double precision,
  end_location_name text,
  total_distance_km double precision default 0,
  point_count integer default 0,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'ABANDONED')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_location_trips_user_id on public.location_trips(user_id);
create index if not exists idx_location_trips_started_at on public.location_trips(started_at desc);
create index if not exists idx_location_trips_status on public.location_trips(status);

-- 2. Employee Locations Table (live GPS tracking)
create table if not exists public.employee_locations (
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

create index if not exists idx_employee_locations_user_id on public.employee_locations(user_id);
create index if not exists idx_employee_locations_trip_id on public.employee_locations(trip_id);
create index if not exists idx_employee_locations_timestamp on public.employee_locations(timestamp desc);

-- 3. Add trip_id column to existing employee_locations if missing
do $$ begin
  alter table public.employee_locations add column trip_id bigint references public.location_trips(id) on delete set null;
exception when duplicate_column then null;
end $$;
create index if not exists idx_employee_locations_trip_id on public.employee_locations(trip_id);

-- 2. Geofences Table
create table if not exists public.geofences (
  id bigserial primary key,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters double precision not null,
  is_active boolean default true not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Geofence Alerts Table
create table if not exists public.geofence_alerts (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  geofence_id bigint references public.geofences(id) on delete cascade not null,
  geofence_name text not null,
  alert_type text not null check (alert_type in ('ENTER', 'EXIT')),
  latitude double precision not null,
  longitude double precision not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_geofence_alerts_user_id on public.geofence_alerts(user_id);
create index if not exists idx_geofence_alerts_timestamp on public.geofence_alerts(timestamp desc);

-- 4. Potential Customers Table
create table if not exists public.potential_customers (
  id bigserial primary key,
  category text not null check (category in ('FARMER', 'CHAIRMAN')),
  full_name text not null,
  mobile text not null,
  village text not null,
  address text not null,
  interest_status text default 'INTERESTED' not null check (interest_status in ('INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'CONVERTED')),
  remarks text,
  employee_id uuid references public.profiles(id) not null,
  cow_count integer default 0 not null,
  buffalo_count integer default 0 not null,
  total_animals integer default 0 not null,
  cow_milk_yield double precision default 0 not null,
  buffalo_milk_yield double precision default 0 not null,
  total_cow_milk double precision default 0 not null,
  total_buffalo_milk double precision default 0 not null,
  total_daily_milk double precision default 0 not null,
  avg_milk_per_animal double precision default 0 not null,
  dairy_society_name text,
  daily_milk_capacity double precision default 0 not null,
  existing_dairy_partner text,
  converted_farmer_id text,
  converted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Realtime for live location updates
do $$ begin
  alter publication supabase_realtime add table public.employee_locations;
exception when duplicate_object then null;
end $$;

-- 6. Employee Notes Table (shared notes from employees to admin)
create table if not exists public.employee_notes (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  note_text text not null,
  latitude double precision,
  longitude double precision,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_employee_notes_user_id on public.employee_notes(user_id);
create index if not exists idx_employee_notes_timestamp on public.employee_notes(timestamp desc);

-- Enable Realtime for employee_notes
do $$ begin
  alter publication supabase_realtime add table public.employee_notes;
exception when duplicate_object then null;
end $$;

-- 7. Enable RLS
alter table public.employee_locations enable row level security;
alter table public.geofences enable row level security;
alter table public.geofence_alerts enable row level security;
alter table public.potential_customers enable row level security;
alter table public.employee_notes enable row level security;

-- 8. RLS Policies
do $$ begin
  create policy "Allow all authenticated users full access on employee_locations"
    on public.employee_locations for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Allow all authenticated users full access on geofences"
    on public.geofences for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Allow all authenticated users full access on geofence_alerts"
    on public.geofence_alerts for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Allow all authenticated users full access on potential_customers"
    on public.potential_customers for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Allow all authenticated users full access on employee_notes"
    on public.employee_notes for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- 9. Add location_sharing column to profiles for persistence
do $$ begin
  alter table public.profiles add column location_sharing boolean default false not null;
exception when duplicate_column then null;
end $$;

-- 10. Enable RLS for location_trips
alter table public.location_trips enable row level security;
do $$ begin
  create policy "Allow all authenticated users full access on location_trips"
    on public.location_trips for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Enable Realtime for location_trips
do $$ begin
  alter publication supabase_realtime add table public.location_trips;
exception when duplicate_object then null;
end $$;
