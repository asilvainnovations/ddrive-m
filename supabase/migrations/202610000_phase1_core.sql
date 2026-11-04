-- DDRiVE-M Phase 1 · part 1 of 3 · Organisations, members, roles and helper functions
-- See docs/adr/001-multi-tenancy-and-access.md. Safe to run more than once.
-- Apply after 20261103000000_phase0_profile_guard.sql and before parts 2 and 3.

-- ─── Roles ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'ddrive_role' and n.nspname = 'public') then
    create type public.ddrive_role as enum ('viewer', 'responder', 'analyst', 'drrm_officer', 'tenant_admin');
  end if;
end $$;

-- Higher rank = more authority. Each role includes everything below it.
create or replace function public.ddrive_role_rank(r public.ddrive_role)
returns int
language sql
immutable
set search_path = public, pg_temp
as $$
  select case r
    when 'viewer' then 1
    when 'responder' then 2
    when 'analyst' then 3
    when 'drrm_officer' then 4
    when 'tenant_admin' then 5
  end
$$;

-- True for the SQL editor and server jobs (no API credentials, connected as the owner) and for the
-- service role. Their changes skip per-user stamping and locks.
-- Based on the request's credentials, not current_user: inside SECURITY DEFINER functions current_user
-- is always the owner, which would make every caller look like an administrator.
create or replace function public.ddrive_is_admin_context()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or (nullif(current_setting('request.jwt.claims', true), '') is null
          and session_user in ('postgres', 'supabase_admin'))
$$;

-- The Phase 0 role guard now uses the same test.
create or replace function public.ddrive_users_guard_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := null;
    new.organization := null;
  elsif new.role is distinct from old.role or new.organization is distinct from old.organization then
    raise exception 'Only an administrator can change your role or organisation.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ─── Organisations (tenants) ──────────────────────────────────────────────────
create table if not exists public.ddrive_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'other',
  psgc_code text,
  -- Risk level thresholds on the likelihood × impact score (1–25). ISO 31000 leaves criteria to the organisation.
  risk_thresholds jsonb not null default '{"critical": 20, "high": 12, "medium": 6}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_tenants_name_len') then
    alter table public.ddrive_tenants add constraint ddrive_tenants_name_len
      check (length(btrim(name)) between 2 and 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ddrive_tenants_kind') then
    alter table public.ddrive_tenants add constraint ddrive_tenants_kind
      check (kind in ('lgu', 'national_agency', 'enterprise', 'ngo', 'academe', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ddrive_tenants_psgc') then
    alter table public.ddrive_tenants add constraint ddrive_tenants_psgc
      check (psgc_code is null or psgc_code ~ '^[0-9]{10}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ddrive_tenants_thresholds') then
    alter table public.ddrive_tenants add constraint ddrive_tenants_thresholds check (
      jsonb_typeof(risk_thresholds -> 'critical') = 'number'
      and jsonb_typeof(risk_thresholds -> 'high') = 'number'
      and jsonb_typeof(risk_thresholds -> 'medium') = 'number'
      and (risk_thresholds ->> 'critical')::numeric <= 25
      and (risk_thresholds ->> 'critical')::numeric > (risk_thresholds ->> 'high')::numeric
      and (risk_thresholds ->> 'high')::numeric > (risk_thresholds ->> 'medium')::numeric
      and (risk_thresholds ->> 'medium')::numeric >= 2
    );
  end if;
end $$;

-- ─── User profiles ────────────────────────────────────────────────────────────
create table if not exists public.ddrive_users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text,          -- legacy display field from before Phase 1; authority now comes from ddrive_memberships
  organization text,  -- legacy display field; organisations are now ddrive_tenants
  avatar_initials text,
  created_at timestamptz not null default now()
);
alter table public.ddrive_users add column if not exists active_tenant_id uuid
  references public.ddrive_tenants (id) on delete set null;

-- ─── Memberships ──────────────────────────────────────────────────────────────
create table if not exists public.ddrive_memberships (
  tenant_id uuid not null references public.ddrive_tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.ddrive_role not null default 'viewer',
  status text not null default 'active',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index if not exists ddrive_memberships_user_idx on public.ddrive_memberships (user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_memberships_status') then
    alter table public.ddrive_memberships add constraint ddrive_memberships_status
      check (status in ('active', 'suspended'));
  end if;
end $$;

-- ─── Helper functions used by every access rule ───────────────────────────────
-- SECURITY DEFINER so they can read memberships without recursing into its own RLS policies.

create or replace function public.ddrive_my_role(p_tenant uuid)
returns public.ddrive_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.ddrive_memberships m
  where m.tenant_id = p_tenant and m.user_id = auth.uid() and m.status = 'active'
$$;

create or replace function public.ddrive_is_member(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ddrive_my_role(p_tenant) is not null
$$;

create or replace function public.ddrive_has_role(p_tenant uuid, p_min public.ddrive_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.ddrive_role_rank(public.ddrive_my_role(p_tenant)) >= public.ddrive_role_rank(p_min), false)
$$;

-- The organisation the caller is working in, or null if they are not an active member of it.
create or replace function public.ddrive_active_tenant()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.active_tenant_id
  from public.ddrive_users u
  where u.id = auth.uid() and public.ddrive_is_member(u.active_tenant_id)
$$;

-- True when the caller and the given user share at least one organisation (to show colleagues' names).
create or replace function public.ddrive_shares_tenant(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.ddrive_memberships me
    join public.ddrive_memberships them on them.tenant_id = me.tenant_id
    where me.user_id = auth.uid() and me.status = 'active' and them.user_id = p_user
  )
$$;

-- ─── Reference numbers per organisation (R-001, P-001 …) ─────────────────────
create table if not exists public.ddrive_counters (
  tenant_id uuid not null references public.ddrive_tenants (id) on delete cascade,
  prefix text not null,
  last_value int not null default 0,
  primary key (tenant_id, prefix)
);

create or replace function public.ddrive_next_ref(p_tenant uuid, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  insert into public.ddrive_counters as c (tenant_id, prefix, last_value)
  values (p_tenant, p_prefix, 1)
  on conflict (tenant_id, prefix) do update set last_value = c.last_value + 1
  returning last_value into n;
  return p_prefix || '-' || lpad(n::text, 3, '0');
end;
$$;

-- ─── Profile row for every new account ────────────────────────────────────────
create or replace function public.ddrive_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
begin
  insert into public.ddrive_users (id, full_name, email, avatar_initials)
  values (
    new.id,
    v_name,
    new.email,
    upper(left(regexp_replace(coalesce(v_name, ''), '[^A-Za-z ]', '', 'g'), 1)
          || coalesce(left(split_part(v_name, ' ', 2), 1), ''))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ddrive_on_auth_user_created on auth.users;
create trigger ddrive_on_auth_user_created
  after insert on auth.users
  for each row execute function public.ddrive_handle_new_user();

-- Profiles for accounts that already exist.
insert into public.ddrive_users (id, full_name, email)
select a.id, coalesce(a.raw_user_meta_data ->> 'full_name', split_part(a.email, '@', 1)), a.email
from auth.users a
where not exists (select 1 from public.ddrive_users u where u.id = a.id);
