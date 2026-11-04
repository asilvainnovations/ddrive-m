-- DDRiVE-M Phase 1 · part 3 of 3 · Access rules (Row Level Security), grants and server functions
-- Role ladder: viewer < responder < analyst < drrm_officer < tenant_admin (ADR-001). Safe to run more than once.

-- ─── 1. Guards on organisations, members and profiles ────────────────────────
create or replace function public.ddrive_tenant_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;
drop trigger if exists ddrive_10_touch on public.ddrive_tenants;
create trigger ddrive_10_touch before update on public.ddrive_tenants
  for each row execute function public.ddrive_tenant_touch();

create or replace function public.ddrive_membership_guard()
returns trigger
language plpgsql
security definer  -- counts administrators across the organisation
set search_path = public, pg_temp
as $$
declare
  v_admins int;
begin
  if public.ddrive_is_admin_context() then
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.role = 'tenant_admin' and old.status = 'active' then
    select count(*) into v_admins from public.ddrive_memberships
    where tenant_id = old.tenant_id and role = 'tenant_admin' and status = 'active';
    if v_admins <= 1 and (tg_op = 'DELETE' or new.role <> 'tenant_admin' or new.status <> 'active') then
      raise exception 'An organisation needs at least one active administrator. Add another administrator first.'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.tenant_id <> old.tenant_id or new.user_id <> old.user_id then
      raise exception 'Memberships cannot be moved. Remove and add the person instead.' using errcode = '42501';
    end if;
    if old.user_id = auth.uid() then
      raise exception 'You cannot change your own role. Ask another administrator.' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  return old;  -- DELETE
end;
$$;
drop trigger if exists ddrive_10_guard on public.ddrive_memberships;
create trigger ddrive_10_guard before insert or update or delete on public.ddrive_memberships
  for each row execute function public.ddrive_membership_guard();

create or replace function public.ddrive_profile_guard()
returns trigger
language plpgsql
security definer  -- reads the account's email from auth.users
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() then
    return new;
  end if;
  -- The profile email always matches the sign-in email.
  new.email := (select email from auth.users where id = new.id);
  if new.active_tenant_id is not null
     and (tg_op = 'INSERT' or new.active_tenant_id is distinct from old.active_tenant_id)
     and not public.ddrive_is_member(new.active_tenant_id) then
    raise exception 'You are not a member of that organisation.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists ddrive_10_profile_guard on public.ddrive_users;
create trigger ddrive_10_profile_guard before insert or update on public.ddrive_users
  for each row execute function public.ddrive_profile_guard();

-- Reference numbers may only be drawn for an organisation the caller belongs to.
create or replace function public.ddrive_next_ref(p_tenant uuid, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  if not public.ddrive_is_admin_context() and not public.ddrive_is_member(p_tenant) then
    raise exception 'Not a member of this organisation.' using errcode = '42501';
  end if;
  insert into public.ddrive_counters as c (tenant_id, prefix, last_value)
  values (p_tenant, p_prefix, 1)
  on conflict (tenant_id, prefix) do update set last_value = c.last_value + 1
  returning last_value into n;
  return p_prefix || '-' || lpad(n::text, 3, '0');
end;
$$;

-- ─── 2. Turn on Row Level Security everywhere ────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['ddrive_tenants', 'ddrive_memberships', 'ddrive_users', 'ddrive_counters', 'ddrive_audit_log',
                           'ddrive_hazards', 'ddrive_risks', 'ddrive_incidents', 'ddrive_undrr_scores',
                           'ddrive_scenarios', 'ddrive_plans', 'ddrive_messages', 'ddrive_documents'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Remove every existing policy so only the rules below apply.
    perform 1;
  end loop;
end $$;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'ddrive\_%'
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- ─── 3. Policies: organisations, members, profiles, audit ────────────────────
create policy tenants_select on public.ddrive_tenants for select to authenticated
  using (public.ddrive_is_member(id));
create policy tenants_update on public.ddrive_tenants for update to authenticated
  using (public.ddrive_has_role(id, 'tenant_admin'))
  with check (public.ddrive_has_role(id, 'tenant_admin'));

create policy memberships_select on public.ddrive_memberships for select to authenticated
  using (user_id = auth.uid() or public.ddrive_is_member(tenant_id));
create policy memberships_insert on public.ddrive_memberships for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'tenant_admin'));
create policy memberships_update on public.ddrive_memberships for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'tenant_admin'))
  with check (public.ddrive_has_role(tenant_id, 'tenant_admin'));
create policy memberships_delete on public.ddrive_memberships for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'tenant_admin') or user_id = auth.uid());

create policy users_select on public.ddrive_users for select to authenticated
  using (id = auth.uid() or public.ddrive_shares_tenant(id));
create policy users_insert on public.ddrive_users for insert to authenticated
  with check (id = auth.uid());
create policy users_update on public.ddrive_users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy audit_select on public.ddrive_audit_log for select to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer'));

-- ddrive_counters: no policies. Only server functions use it.

-- ─── 4. Policies: domain tables ──────────────────────────────────────────────
-- Read: every active member of the organisation.
do $$
declare
  t text;
begin
  foreach t in array array['ddrive_hazards', 'ddrive_risks', 'ddrive_incidents', 'ddrive_undrr_scores',
                           'ddrive_scenarios', 'ddrive_plans', 'ddrive_messages', 'ddrive_documents'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.ddrive_is_member(tenant_id))',
                   replace(t, 'ddrive_', '') || '_select', t);
  end loop;
end $$;

-- Hazards: responders report; analysts edit any; a responder may correct their own report. Never deleted.
create policy hazards_insert on public.ddrive_hazards for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'responder'));
create policy hazards_update on public.ddrive_hazards for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')
         or (created_by = auth.uid() and public.ddrive_has_role(tenant_id, 'responder')))
  with check (public.ddrive_has_role(tenant_id, 'analyst')
              or (created_by = auth.uid() and public.ddrive_has_role(tenant_id, 'responder')));

-- Risks: analysts manage; DRRM officers may delete.
create policy risks_insert on public.ddrive_risks for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy risks_update on public.ddrive_risks for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy risks_delete on public.ddrive_risks for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer'));

-- Incidents: responders open and update. Never deleted (cancel instead).
create policy incidents_insert on public.ddrive_incidents for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'responder'));
create policy incidents_update on public.ddrive_incidents for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'responder')) with check (public.ddrive_has_role(tenant_id, 'responder'));

-- UNDRR scorecard: analysts manage; DRRM officers may delete.
create policy undrr_scores_insert on public.ddrive_undrr_scores for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy undrr_scores_update on public.ddrive_undrr_scores for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy undrr_scores_delete on public.ddrive_undrr_scores for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer'));

-- Scenarios: DRRM officers manage. Participation goes through ddrive_record_participation().
create policy scenarios_insert on public.ddrive_scenarios for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'drrm_officer'));
create policy scenarios_update on public.ddrive_scenarios for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer')) with check (public.ddrive_has_role(tenant_id, 'drrm_officer'));
create policy scenarios_delete on public.ddrive_scenarios for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer'));

-- Plans: analysts draft and edit; approval and retirement are checked by ddrive_plan_guard. Never deleted.
create policy plans_insert on public.ddrive_plans for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy plans_update on public.ddrive_plans for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

-- Messages: responders post; only DRRM officers send critical ones. Append-only.
create policy messages_insert on public.ddrive_messages for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'responder')
              and (priority <> 'critical' or public.ddrive_has_role(tenant_id, 'drrm_officer')));

-- Documents: analysts manage; DRRM officers may delete.
create policy documents_insert on public.ddrive_documents for insert to authenticated
  with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy documents_update on public.ddrive_documents for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy documents_delete on public.ddrive_documents for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer'));

-- ─── 5. Table privileges (a second wall behind the policies) ─────────────────
do $$
declare
  t text;
begin
  foreach t in array array['ddrive_tenants', 'ddrive_memberships', 'ddrive_users', 'ddrive_counters', 'ddrive_audit_log',
                           'ddrive_hazards', 'ddrive_risks', 'ddrive_incidents', 'ddrive_undrr_scores',
                           'ddrive_scenarios', 'ddrive_plans', 'ddrive_messages', 'ddrive_documents'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  -- The unused second risk model from before Phase 1, if present: no access from the API.
  if to_regclass('public.risks') is not null then execute 'revoke all on public.risks from anon, authenticated'; end if;
  if to_regclass('public.risk_categories') is not null then execute 'revoke all on public.risk_categories from anon, authenticated'; end if;
end $$;

grant select, update (name, kind, psgc_code) on public.ddrive_tenants to authenticated;
grant select, insert, update (role, status), delete on public.ddrive_memberships to authenticated;
grant select, insert (id, full_name, email, avatar_initials), update (full_name, avatar_initials, active_tenant_id)
  on public.ddrive_users to authenticated;
grant select on public.ddrive_audit_log to authenticated;

grant select, insert, update on public.ddrive_hazards, public.ddrive_incidents, public.ddrive_plans to authenticated;
grant select, insert, update, delete on public.ddrive_risks, public.ddrive_undrr_scores, public.ddrive_scenarios,
  public.ddrive_documents to authenticated;
grant select, insert on public.ddrive_messages to authenticated;
grant usage on all sequences in schema public to authenticated;

-- ─── 6. Server functions ─────────────────────────────────────────────────────
create or replace function public.ddrive_create_tenant(p_name text, p_kind text default 'other', p_psgc text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if (select count(*) from public.ddrive_tenants where created_by = auth.uid()) >= 5 then
    raise exception 'You have reached the limit of 5 organisations. Contact support to add more.' using errcode = '54000';
  end if;
  insert into public.ddrive_tenants (name, kind, psgc_code, created_by)
  values (btrim(p_name), coalesce(p_kind, 'other'), p_psgc, auth.uid())
  returning id into v_id;
  insert into public.ddrive_memberships (tenant_id, user_id, role, created_by)
  values (v_id, auth.uid(), 'tenant_admin', auth.uid());
  update public.ddrive_users set active_tenant_id = v_id where id = auth.uid();
  return v_id;
end;
$$;

create or replace function public.ddrive_set_active_tenant(p_tenant uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ddrive_is_member(p_tenant) then
    raise exception 'You are not a member of that organisation.' using errcode = '42501';
  end if;
  update public.ddrive_users set active_tenant_id = p_tenant where id = auth.uid();
end;
$$;

-- An administrator adds an existing account to their organisation, or changes its role.
create or replace function public.ddrive_add_member(p_tenant uuid, p_email text, p_role public.ddrive_role)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
begin
  if not public.ddrive_has_role(p_tenant, 'tenant_admin') then
    raise exception 'Only an administrator of this organisation can add members.' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No account uses that email. Ask the person to sign up first, then add them.' using errcode = 'P0002';
  end if;
  if v_user = auth.uid() then
    raise exception 'You cannot change your own role. Ask another administrator.' using errcode = '42501';
  end if;
  insert into public.ddrive_memberships (tenant_id, user_id, role, created_by)
  values (p_tenant, v_user, p_role, auth.uid())
  on conflict (tenant_id, user_id) do update set role = excluded.role, status = 'active', updated_at = now();
end;
$$;

-- Responders log that they took part in an exercise.
create or replace function public.ddrive_record_participation(p_scenario_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.ddrive_scenarios where id::text = p_scenario_id;
  if v_tenant is null or not public.ddrive_has_role(v_tenant, 'responder') then
    raise exception 'You cannot record participation for this exercise.' using errcode = '42501';
  end if;
  update public.ddrive_scenarios set participants = participants + 1 where id::text = p_scenario_id;
end;
$$;

-- Administrators set their organisation's risk criteria; existing risks are re-graded at once.
create or replace function public.ddrive_set_risk_thresholds(p_tenant uuid, p_critical int, p_high int, p_medium int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ddrive_has_role(p_tenant, 'tenant_admin') then
    raise exception 'Only an administrator can change risk criteria.' using errcode = '42501';
  end if;
  update public.ddrive_tenants
  set risk_thresholds = jsonb_build_object('critical', p_critical, 'high', p_high, 'medium', p_medium)
  where id = p_tenant;
  update public.ddrive_risks set likelihood = likelihood where tenant_id = p_tenant;  -- fires the level trigger
end;
$$;

-- For the SQL editor only: set anyone's role. Not callable from the app.
create or replace function public.ddrive_admin_set_role(p_email text, p_role public.ddrive_role, p_tenant uuid default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_tenant uuid := p_tenant;
begin
  if not public.ddrive_is_admin_context() then
    raise exception 'Run this from the SQL editor.' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No account uses %.', p_email;
  end if;
  if v_tenant is null then
    if (select count(*) from public.ddrive_tenants) <> 1 then
      raise exception 'There is more than one organisation. Pass its id as the third argument.';
    end if;
    select id into v_tenant from public.ddrive_tenants;
  end if;
  insert into public.ddrive_memberships (tenant_id, user_id, role)
  values (v_tenant, v_user, p_role)
  on conflict (tenant_id, user_id) do update set role = excluded.role, status = 'active', updated_at = now();
  update public.ddrive_users set active_tenant_id = coalesce(active_tenant_id, v_tenant) where id = v_user;
  return format('%s is now %s in %s', p_email, p_role, (select name from public.ddrive_tenants where id = v_tenant));
end;
$$;

-- ─── 7. Function privileges ──────────────────────────────────────────────────
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'ddrive\_%'
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
end $$;

grant execute on function
  public.ddrive_role_rank(public.ddrive_role),
  public.ddrive_is_admin_context(),
  public.ddrive_my_role(uuid),
  public.ddrive_is_member(uuid),
  public.ddrive_has_role(uuid, public.ddrive_role),
  public.ddrive_active_tenant(),
  public.ddrive_shares_tenant(uuid),
  public.ddrive_next_ref(uuid, text),
  public.ddrive_create_tenant(text, text, text),
  public.ddrive_set_active_tenant(uuid),
  public.ddrive_add_member(uuid, text, public.ddrive_role),
  public.ddrive_record_participation(text),
  public.ddrive_set_risk_thresholds(uuid, int, int, int)
to authenticated;
revoke all on function public.ddrive_admin_set_role(text, public.ddrive_role, uuid) from authenticated;
