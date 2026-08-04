-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique,
  name text not null,
  role text check (role in ('ADMIN', 'EMPLOYEE')) not null,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', substring(new.email from '([^@]+)')),
    coalesce(new.raw_user_meta_data->>'name', 'New Employee'),
    coalesce(new.raw_user_meta_data->>'role', 'EMPLOYEE'),
    'ACTIVE'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Farmers Table
create table public.farmers (
  id text primary key, -- Custom ID format: FMR-XXXX
  name text not null,
  mobile text not null,
  alt_mobile text,
  gender text not null,
  age integer not null,
  aadhaar text,
  village text not null,
  taluka text not null,
  district text not null,
  address text not null,
  gps_location text,
  animal_type text not null, -- 'COW', 'BUFFALO', 'BOTH'
  cow_count integer default 0 not null,
  buffalo_count integer default 0 not null,
  total_animals integer default 0 not null,
  cow_milk_yield double precision default 0.0 not null,
  buffalo_milk_yield double precision default 0.0 not null,
  survey_date text,
  notes text,
  registered_by_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Routes Table
create table public.routes (
  id bigserial primary key,
  name text not null,
  description text,
  village text not null,
  admin_id uuid references public.profiles(id) not null,
  assigned_employee_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Payments Table (must be created before milk_collections so it can be referenced)
create table public.payments (
  id bigserial primary key,
  farmer_id text references public.farmers(id) on delete cascade not null,
  amount double precision not null,
  payment_date text not null, -- 'YYYY-MM-DD'
  status text not null, -- 'COMPLETED', 'FAILED'
  transaction_ref text,
  processed_by_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Milk Collections Table
create table public.milk_collections (
  id bigserial primary key,
  date text not null, -- 'YYYY-MM-DD'
  time_of_day text not null, -- 'MORNING', 'EVENING'
  quantity_litres double precision not null,
  fat_percent double precision not null,
  snf_percent double precision not null,
  clr double precision,
  rate_per_litre double precision not null,
  total_amount double precision not null,
  collected_by_id uuid references public.profiles(id) not null,
  farmer_id text references public.farmers(id) on delete cascade not null,
  payment_status text default 'PENDING' not null, -- 'PENDING', 'PAID'
  payment_id bigint references public.payments(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Attendance Table
create table public.attendance (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date text not null, -- 'YYYY-MM-DD'
  status text not null, -- 'PRESENT', 'ABSENT', 'LEAVE'
  clock_in text, -- 'HH:MM'
  clock_out text, -- 'HH:MM'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Leaves Table
create table public.leaves (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_date text not null, -- 'YYYY-MM-DD'
  end_date text not null, -- 'YYYY-MM-DD'
  reason text not null,
  status text default 'PENDING' not null, -- 'PENDING', 'APPROVED', 'REJECTED'
  approved_by_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Notifications Table
create table public.notifications (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Audit Logs Table
create table public.audit_logs (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null,
  action text not null,
  details text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Surveys Table
create table public.surveys (
  id bigserial primary key,
  customer_name text not null,
  mobile text not null,
  village text not null,
  address text not null,
  animals jsonb not null, -- e.g. [{"type": "COW", "count": 2, "milkPerAnimal": 6.5}]
  total_animals integer not null,
  total_milk_production double precision not null,
  interested boolean default false not null,
  remarks text,
  employee_id uuid references public.profiles(id) not null,
  survey_date text not null, -- 'YYYY-MM-DD'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Employee Locations Table (live GPS tracking)
create table public.employee_locations (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision not null,
  speed double precision,
  battery_level integer,
  note text,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_employee_locations_user_id on public.employee_locations(user_id);
create index idx_employee_locations_timestamp on public.employee_locations(timestamp desc);

-- 12. Geofences Table
create table public.geofences (
  id bigserial primary key,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters double precision not null,
  is_active boolean default true not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Geofence Alerts Table
create table public.geofence_alerts (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  geofence_id bigint references public.geofences(id) on delete cascade not null,
  geofence_name text not null,
  alert_type text not null check (alert_type in ('ENTER', 'EXIT')),
  latitude double precision not null,
  longitude double precision not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_geofence_alerts_user_id on public.geofence_alerts(user_id);
create index idx_geofence_alerts_timestamp on public.geofence_alerts(timestamp desc);

-- 14. Potential Customers Table
create table public.potential_customers (
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

-- Enable Realtime for employee_locations (so admin panel gets live updates)
do $$ begin
  alter publication supabase_realtime add table public.employee_locations;
exception when duplicate_object then null;
end $$;

-- 15. Employee Notes Table (shared notes from employees to admin)
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

-- Enable Realtime for employee_notes (so admin panel gets live note updates)
do $$ begin
  alter publication supabase_realtime add table public.employee_notes;
exception when duplicate_object then null;
end $$;

-- Enable RLS for all tables (for security)
alter table public.profiles enable row level security;
alter table public.farmers enable row level security;
alter table public.routes enable row level security;
alter table public.payments enable row level security;
alter table public.milk_collections enable row level security;
alter table public.attendance enable row level security;
alter table public.leaves enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.surveys enable row level security;

-- Simple permissive policies (allows logged in users full access to keep code direct)
create policy "Allow public read access on profiles" on public.profiles for select using (true);
create policy "Allow authenticated users full access on profiles" on public.profiles for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on farmers" on public.farmers for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on routes" on public.routes for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on payments" on public.payments for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on milk_collections" on public.milk_collections for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on attendance" on public.attendance for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on leaves" on public.leaves for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on notifications" on public.notifications for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on audit_logs" on public.audit_logs for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on surveys" on public.surveys for all to authenticated using (true) with check (true);
alter table public.employee_locations enable row level security;
alter table public.geofences enable row level security;
alter table public.geofence_alerts enable row level security;
alter table public.potential_customers enable row level security;
alter table public.employee_notes enable row level security;
create policy "Allow all authenticated users full access on employee_locations" on public.employee_locations for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on geofences" on public.geofences for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on geofence_alerts" on public.geofence_alerts for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on potential_customers" on public.potential_customers for all to authenticated using (true) with check (true);
create policy "Allow all authenticated users full access on employee_notes" on public.employee_notes for all to authenticated using (true) with check (true);
