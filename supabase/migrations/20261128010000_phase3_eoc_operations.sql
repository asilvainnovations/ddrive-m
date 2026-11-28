-- Phase 3 · Response: EOC operations (ADR-017).
-- NDRRMC Memorandum No. 131 s. 2018: activation and upgrading triggers (9.2.1), deactivation and downgrading
-- triggers (9.2.7), the five management functions (9.3.1), duty composition and tours of duty (9.3.3).
-- Alert status colours and meanings as defined in the DILG Region VIII harmonised disaster response reporting
-- SOP: WHITE (normal operations), BLUE (heightened alert, at least 50% of resources available), RED (full alert,
-- all resources available). The official text governs. Safe to run more than once.

-- ─── EOC status: an append-only log; the current status is the latest row ───
create table if not exists public.ddrive_eoc_status (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  level text not null check (level in ('white', 'blue', 'red')),
  previous_level text check (previous_level is null or previous_level in ('white', 'blue', 'red')),
  trigger text not null check (trigger in (
    -- Memo 131, 9.2.1: activation or upgrading
    'impending_hazard', 'planned_event', 'ongoing_incident', 'support_request', 'ro_directive_up',
    -- Memo 131, 9.2.7: deactivation or downgrading
    'situation_improved', 'no_tactical_support_needed', 'lower_level_can_manage', 'ro_directive_down',
    -- first record of the organisation's status
    'initial')),
  basis text not null check (length(btrim(basis)) between 10 and 2000),
  directed_by text not null check (length(btrim(directed_by)) between 3 and 200),   -- the Responsible Official
  alert_id uuid references public.ddrive_official_alerts (id),
  incident_id text references public.ddrive_incidents (id),
  effective_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_eoc_status_ref on public.ddrive_eoc_status (tenant_id, ref);
create index if not exists ddrive_eoc_status_recent on public.ddrive_eoc_status (tenant_id, created_at desc);

create or replace view public.ddrive_eoc_current with (security_invoker = true) as
select distinct on (tenant_id) id, ref, tenant_id, level, previous_level, trigger, basis, directed_by, alert_id, incident_id,
       effective_at, created_by, created_at
from public.ddrive_eoc_status
order by tenant_id, created_at desc, id desc;

-- ─── Duty roster: who holds which management function, for which tour of duty ─
create table if not exists public.ddrive_eoc_duty (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  function text not null check (function in ('management', 'operations', 'planning', 'logistics', 'finance_admin')),
  position text check (position is null or length(position) <= 120),
  person_name text not null check (length(btrim(person_name)) between 2 and 120),
  contact text check (contact is null or length(contact) <= 120),
  shift_start timestamptz not null,
  shift_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'on_duty', 'completed', 'cancelled')),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (shift_end > shift_start and shift_end <= shift_start + interval '24 hours')
);
create index if not exists ddrive_eoc_duty_time on public.ddrive_eoc_duty (tenant_id, shift_start);

-- ─── Operations log: situation notes, decisions, resource requests, handovers ─
create table if not exists public.ddrive_eoc_log (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  entry_type text not null check (entry_type in ('situation', 'decision', 'resource_request', 'communication', 'handover')),
  function text check (function is null or function in ('management', 'operations', 'planning', 'logistics', 'finance_admin')),
  body text not null check (length(btrim(body)) between 3 and 4000),
  handover_to text check (handover_to is null or length(btrim(handover_to)) between 2 and 120),
  incident_id text references public.ddrive_incidents (id),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (entry_type <> 'handover' or (handover_to is not null and length(btrim(body)) >= 20))
);
create unique index if not exists ddrive_eoc_log_ref on public.ddrive_eoc_log (tenant_id, ref);
create index if not exists ddrive_eoc_log_recent on public.ddrive_eoc_log (tenant_id, created_at desc);

-- ─── Rules ───────────────────────────────────────────────────────────────────
-- Status rows and log entries are records of what was decided and said: they are never changed or deleted.
create or replace function public.ddrive_20_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() then
    return coalesce(new, old);
  end if;
  raise exception 'This record cannot be changed or deleted; add a new entry instead.' using errcode = '42501';
end;
$$;

-- Links stay inside the organisation.
create or replace function public.ddrive_21_eoc_links()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare t uuid;
begin
  if new.incident_id is not null then
    select tenant_id into t from public.ddrive_incidents where id = new.incident_id;
    if t is distinct from new.tenant_id then raise exception 'That incident is not in your organisation.' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;

-- Changing the EOC status: a DRRM officer records it with a Memo 131 trigger, the basis and the Responsible
-- Official who directed it. Raising the level needs an activation trigger; lowering it, a deactivation trigger.
create or replace function public.ddrive_eoc_set_status(
  p_level text, p_trigger text, p_basis text, p_directed_by text, p_alert_id uuid default null, p_incident_id text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t uuid := public.ddrive_active_tenant();
  cur text;
  rank_new int; rank_cur int;
  v_id text;
begin
  if t is null or not public.ddrive_has_role(t, 'drrm_officer') then
    raise exception 'Changing the EOC status needs the DRRM officer role.' using errcode = '42501';
  end if;
  if p_level not in ('white', 'blue', 'red') then
    raise exception 'The EOC status is WHITE, BLUE or RED.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('eoc_status:' || t::text));
  select level into cur from public.ddrive_eoc_current where tenant_id = t;
  rank_new := array_position(array['white', 'blue', 'red'], p_level);
  rank_cur := array_position(array['white', 'blue', 'red'], cur);
  if cur = p_level then
    raise exception 'The EOC is already on % alert.', upper(cur) using errcode = '22023';
  end if;
  if cur is null and p_trigger <> 'initial' and rank_new = 1 then
    raise exception 'Record the first status with the trigger "initial".' using errcode = '22023';
  end if;
  if p_trigger = 'initial' and cur is not null then
    raise exception 'The organisation already has an EOC status; use an activation or deactivation trigger.' using errcode = '22023';
  end if;
  if p_trigger <> 'initial' and (cur is null or rank_new > rank_cur)
     and p_trigger not in ('impending_hazard', 'planned_event', 'ongoing_incident', 'support_request', 'ro_directive_up') then
    raise exception 'Raising the EOC status needs an activation trigger (NDRRMC Memo 131, 9.2.1).' using errcode = '22023';
  end if;
  if cur is not null and rank_new < rank_cur
     and p_trigger not in ('situation_improved', 'no_tactical_support_needed', 'lower_level_can_manage', 'ro_directive_down') then
    raise exception 'Lowering the EOC status needs a deactivation trigger (NDRRMC Memo 131, 9.2.7).' using errcode = '22023';
  end if;
  if p_alert_id is not null and not exists (select 1 from public.ddrive_official_alerts where id = p_alert_id) then
    raise exception 'Unknown official alert.' using errcode = '22023';
  end if;
  insert into public.ddrive_eoc_status (tenant_id, level, previous_level, trigger, basis, directed_by, alert_id, incident_id, effective_at, created_by)
  values (t, p_level, cur, p_trigger, btrim(p_basis), btrim(p_directed_by), p_alert_id, p_incident_id, now(), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

drop trigger if exists ddrive_10_touch on public.ddrive_eoc_status;
create trigger ddrive_10_touch before insert or update on public.ddrive_eoc_status for each row execute function public.ddrive_touch('E');
drop trigger if exists ddrive_20_append_only on public.ddrive_eoc_status;
create trigger ddrive_20_append_only before update or delete on public.ddrive_eoc_status for each row execute function public.ddrive_20_append_only();
drop trigger if exists ddrive_21_links on public.ddrive_eoc_status;
create trigger ddrive_21_links before insert on public.ddrive_eoc_status for each row execute function public.ddrive_21_eoc_links();
drop trigger if exists ddrive_90_audit on public.ddrive_eoc_status;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_eoc_status for each row execute function public.ddrive_audit();

drop trigger if exists ddrive_10_touch on public.ddrive_eoc_duty;
create trigger ddrive_10_touch before insert or update on public.ddrive_eoc_duty for each row execute function public.ddrive_touch();
drop trigger if exists ddrive_90_audit on public.ddrive_eoc_duty;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_eoc_duty for each row execute function public.ddrive_audit();

drop trigger if exists ddrive_10_touch on public.ddrive_eoc_log;
create trigger ddrive_10_touch before insert or update on public.ddrive_eoc_log for each row execute function public.ddrive_touch('L');
drop trigger if exists ddrive_20_append_only on public.ddrive_eoc_log;
create trigger ddrive_20_append_only before update or delete on public.ddrive_eoc_log for each row execute function public.ddrive_20_append_only();
drop trigger if exists ddrive_21_links on public.ddrive_eoc_log;
create trigger ddrive_21_links before insert on public.ddrive_eoc_log for each row execute function public.ddrive_21_eoc_links();
drop trigger if exists ddrive_90_audit on public.ddrive_eoc_log;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_eoc_log for each row execute function public.ddrive_audit();

-- ─── Access ──────────────────────────────────────────────────────────────────
alter table public.ddrive_eoc_status enable row level security;
alter table public.ddrive_eoc_duty enable row level security;
alter table public.ddrive_eoc_log enable row level security;

drop policy if exists eoc_status_select on public.ddrive_eoc_status;
create policy eoc_status_select on public.ddrive_eoc_status for select to authenticated using (public.ddrive_is_member(tenant_id));
-- No insert policy: the status changes only through ddrive_eoc_set_status.

drop policy if exists eoc_duty_select on public.ddrive_eoc_duty;
drop policy if exists eoc_duty_insert on public.ddrive_eoc_duty;
drop policy if exists eoc_duty_update on public.ddrive_eoc_duty;
drop policy if exists eoc_duty_delete on public.ddrive_eoc_duty;
create policy eoc_duty_select on public.ddrive_eoc_duty for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy eoc_duty_insert on public.ddrive_eoc_duty for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
-- Responders mark their tour of duty started or completed; analysts edit the roster.
create policy eoc_duty_update on public.ddrive_eoc_duty for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'responder')) with check (public.ddrive_has_role(tenant_id, 'responder'));
create policy eoc_duty_delete on public.ddrive_eoc_duty for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst') and status = 'scheduled');

drop policy if exists eoc_log_select on public.ddrive_eoc_log;
drop policy if exists eoc_log_insert on public.ddrive_eoc_log;
create policy eoc_log_select on public.ddrive_eoc_log for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy eoc_log_insert on public.ddrive_eoc_log for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'responder'));

-- A responder may only change the status of a tour of duty, not who, when or which function.
create or replace function public.ddrive_22_duty_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() or public.ddrive_has_role(new.tenant_id, 'analyst') then
    return new;
  end if;
  if (new.function, new.position, new.person_name, new.contact, new.shift_start, new.shift_end)
     is distinct from (old.function, old.position, old.person_name, old.contact, old.shift_start, old.shift_end)
     or new.status not in ('on_duty', 'completed') then
    raise exception 'Responders can only mark a tour of duty as started or completed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists ddrive_22_duty_guard on public.ddrive_eoc_duty;
create trigger ddrive_22_duty_guard before update on public.ddrive_eoc_duty for each row execute function public.ddrive_22_duty_guard();

revoke all on public.ddrive_eoc_status, public.ddrive_eoc_duty, public.ddrive_eoc_log, public.ddrive_eoc_current from anon, authenticated;
grant select on public.ddrive_eoc_status, public.ddrive_eoc_current to authenticated;
grant select, insert, update, delete on public.ddrive_eoc_duty to authenticated;
grant select, insert on public.ddrive_eoc_log to authenticated;
revoke all on function public.ddrive_eoc_set_status(text, text, text, text, uuid, text) from public, anon;
grant execute on function public.ddrive_eoc_set_status(text, text, text, text, uuid, text) to authenticated;
