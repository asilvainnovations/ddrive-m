-- A copy of the database as it looked before Phase 1 (shape inferred from the app's reads and writes), with sample data.
-- Used by: bash scripts/test_db.sh --legacy
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'early.user@lgu.ph', '{"full_name": "Early User"}'),
  ('22222222-2222-2222-2222-222222222222', 'second.user@lgu.ph', '{"full_name": "Second User"}');

create table public.ddrive_users (
  id uuid primary key,
  full_name text, email text,
  role text not null default 'Operator',
  organization text not null,
  avatar_initials text
);
insert into public.ddrive_users values
  ('11111111-1111-1111-1111-111111111111', 'Early User', 'early.user@lgu.ph', 'Operator', 'NDRRMC', 'EU'),
  ('22222222-2222-2222-2222-222222222222', 'Second User', 'second.user@lgu.ph', 'Operator', 'NDRRMC', 'SU');

create table public.ddrive_hazards (id serial primary key, agency text, type text, name text, severity text, location text,
  lat double precision, lng double precision, status text, detected_at timestamptz default now());
insert into public.ddrive_hazards (agency, type, name, severity, location, lat, lng, status)
  values ('PAGASA', 'Typhoon', 'Typhoon Example', 'Critical', 'Eastern Visayas', 11.2, 125.0, 'Active');

create table public.ddrive_risks (id text primary key, title text, category text, likelihood int, impact int,
  score int generated always as (likelihood * impact) stored, level text, owner text, status text);
insert into public.ddrive_risks (id, title, category, likelihood, impact, level, owner, status) values
  ('R-001', 'Flooding', 'Environmental', 5, 5, 'Low', 'CDRRMO', 'Open'),
  ('R-002', 'Power grid failure', 'Operational', 3, 4, 'Low', 'Engineering', 'Open'),
  ('R-003', 'Cyber attack', 'Operational', 2, 2, 'Critical', 'IT', 'Open');

create table public.ddrive_incidents (id text primary key, title text, priority text, assignee_name text, status text, progress int, eta text);
insert into public.ddrive_incidents values ('INC-007', 'Landslide on road', 'High', 'Team A', 'In Progress', 40, '2h');

create table public.ddrive_undrr_scores (id serial primary key, name text, score int, trend int, status text);
insert into public.ddrive_undrr_scores (name, score, trend, status) values ('Organise for resilience', 70, 3, 'Good');

create table public.ddrive_scenarios (id serial primary key, name text, type text, difficulty text, duration text, participants int, completion int);
insert into public.ddrive_scenarios (name, type, difficulty, duration, participants, completion) values ('Typhoon tabletop', 'Tabletop', 'Advanced', '3h', 12, 80);

create table public.ddrive_plans (id text primary key, title text, type text, standard text, status text, compliance int not null, last_updated date);
insert into public.ddrive_plans values ('P-004', 'DRRM Plan 2025', 'DRRM', 'RA 10121', 'Approved', 70, '2025-01-15');

create table public.ddrive_messages (id serial primary key, user_id uuid, user_name text, role text, message text, priority text, created_at timestamptz default now());
insert into public.ddrive_messages (user_id, user_name, role, message, priority)
  values ('11111111-1111-1111-1111-111111111111', 'Juan Dela Cruz', 'Super Admin', 'Hello team', 'medium');

create table public.ddrive_documents (id text primary key, name text, category text, size text, updated_at date);
insert into public.ddrive_documents values ('D-002', 'Evacuation SOP', 'Protocol', '1.0 MB', '2025-02-01');

-- The unused second risk model.
create table public.risk_categories (id uuid primary key default gen_random_uuid(), name text);
create table public.risks (id uuid primary key default gen_random_uuid(), name text);

-- A wide-open policy of the kind prototypes often have; Phase 1 must remove it.
alter table public.ddrive_hazards enable row level security;
create policy "Allow all" on public.ddrive_hazards for all using (true) with check (true);
