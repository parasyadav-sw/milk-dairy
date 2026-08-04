-- Migration: Create location_trips table
-- Run this SQL in your Supabase SQL Editor

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

alter table public.location_trips enable row level security;

do $$ begin
  create policy "Allow all authenticated users full access on location_trips"
    on public.location_trips for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.location_trips;
exception when duplicate_object then null;
end $$;
