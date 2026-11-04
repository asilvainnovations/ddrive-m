-- DDRiVE-M Phase 0 · 2026-11-03
-- 1. Users can no longer set their own role or organisation from the browser.
--    Only the service role (server functions) or a database admin (SQL editor) can change them.
-- 2. Columns the app used to fill with made-up defaults may now be empty:
--    ddrive_users.role / organization (unassigned until an admin sets them)
--    ddrive_plans.compliance (null = not yet assessed)
--
-- Safe to run more than once. Each step checks that the table and column exist first.
-- Run in the Supabase SQL editor as the project owner, then run the checks at the bottom.

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ddrive_users' and column_name = 'role') then
    execute 'alter table public.ddrive_users alter column role drop not null';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ddrive_users' and column_name = 'organization') then
    execute 'alter table public.ddrive_users alter column organization drop not null';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ddrive_plans' and column_name = 'compliance') then
    execute 'alter table public.ddrive_plans alter column compliance drop not null';
  end if;
end $$;

-- Guard: role and organisation are set by administrators only.
create or replace function public.ddrive_users_guard_role()
returns trigger
language plpgsql
-- Deliberately NOT security definer: current_user must be the caller's role
-- (authenticated / anon via the API, postgres in the SQL editor), not the function owner.
set search_path = public, pg_temp
as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  is_admin boolean := jwt_role = 'service_role' or current_user in ('postgres', 'supabase_admin');
begin
  if is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- New self-registered users start unassigned, whatever the browser sends.
    new.role := null;
    new.organization := null;
  elsif new.role is distinct from old.role or new.organization is distinct from old.organization then
    raise exception 'Only an administrator can change your role or organisation.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.ddrive_users') is not null then
    execute 'drop trigger if exists ddrive_users_guard_role on public.ddrive_users';
    execute 'create trigger ddrive_users_guard_role
               before insert or update on public.ddrive_users
               for each row execute function public.ddrive_users_guard_role()';
  end if;
end $$;

-- Checks (run by hand after applying):
-- 1. Who currently holds which role? Every user who registered before this change gave themselves
--    'Operator' and organisation 'NDRRMC' from the browser. Review these and correct them:
--      select id, email, role, organization from public.ddrive_users order by email;
--    To clear the self-assigned NDRRMC label (decide first; real NDRRMC staff may exist):
--      update public.ddrive_users set organization = null where organization = 'NDRRMC';
-- 2. Confirm RLS is on for every ddrive_ table (Phase 1 adds the full policy set):
--      select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename like 'ddrive_%';
