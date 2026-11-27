-- DDRiVE-M: risk-informed response actions. See docs/adr/008-connected-detection-diagnosis-response.md.
-- Safe to run more than once.
--
-- Seven-phase design: Diagnosis interprets risk; Response makes and coordinates risk-informed decisions and actions.
-- An action is PROPOSED where the need is found (a risk in the register, a scored DDRiVE hazard event, an official
-- alert or a field hazard report) and DECIDED and COORDINATED in Response:
--
--   proposed ──approve──▶ approved ──progress──▶ in_progress ──complete──▶ done
--       │                    │                        │
--       └──decline──▶ declined   └────────cancel──────┴──▶ cancelled
--
-- Treatment options follow ISO 31000:2018 (6.5.2): avoid, change the likelihood, change the consequences, share, retain.
-- Each action is also tagged with the RA 10121 / NDRRMP thematic area it serves.

create table if not exists public.ddrive_response_actions (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  title text not null check (length(btrim(title)) between 3 and 200),
  description text check (description is null or length(description) <= 4000),
  origin text not null check (origin in ('diagnosis', 'detection', 'manual')),
  risk_id text references public.ddrive_risks (id) on delete set null,
  hazard_entry_id text references public.ddrive_hazard_assessment_entries (id) on delete set null,
  official_alert_id uuid references public.ddrive_official_alerts (id) on delete set null,
  hazard_record_id bigint references public.ddrive_hazards (id) on delete set null,
  strategy text not null check (strategy in ('avoid', 'reduce_likelihood', 'reduce_consequences', 'share', 'retain')),
  drrm_area text not null check (drrm_area in ('prevention_mitigation', 'preparedness', 'response', 'rehabilitation_recovery')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  owner_office text check (owner_office is null or length(owner_office) <= 200),
  due_on date,
  cost_php numeric(16, 2) check (cost_php >= 0),
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'declined', 'in_progress', 'done', 'cancelled')),
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  progress int not null default 0 check (progress between 0 and 100),
  last_update text,
  outcome text,
  completed_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_response_actions_ref on public.ddrive_response_actions (tenant_id, ref);
create index if not exists ddrive_response_actions_status on public.ddrive_response_actions (tenant_id, status);
create index if not exists ddrive_response_actions_risk on public.ddrive_response_actions (risk_id);
create index if not exists ddrive_response_actions_entry on public.ddrive_response_actions (hazard_entry_id);
create index if not exists ddrive_response_actions_alert on public.ddrive_response_actions (official_alert_id);

-- ─── Guard: what may be proposed, and what may change outside the steps ──────
create or replace function public.ddrive_response_action_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  -- Status and decision fields change only inside the step functions (security definer, run as the table owner).
  stepping boolean := current_user not in ('authenticated', 'anon');
  t uuid;
begin
  if public.ddrive_is_admin_context() then return new; end if;

  if tg_op = 'INSERT' then
    new.status := 'proposed';
    new.decision_note := null; new.decided_by := null; new.decided_at := null;
    new.progress := 0; new.last_update := null; new.outcome := null; new.completed_at := null;

    if new.origin = 'diagnosis' and not public.ddrive_has_role(new.tenant_id, 'analyst') then
      raise exception 'Only an analyst or higher can propose treatment actions from Diagnosis.' using errcode = '42501';
    end if;
    -- Where the need was found must be named, and must belong to the same organisation.
    if new.origin = 'diagnosis' and new.risk_id is null and new.hazard_entry_id is null then
      raise exception 'An action proposed from Diagnosis must name the risk or the assessed hazard event it treats.' using errcode = '22023';
    end if;
    if new.origin = 'detection' and new.official_alert_id is null and new.hazard_record_id is null then
      raise exception 'An action proposed from Detection must name the official alert or hazard report it responds to.' using errcode = '22023';
    end if;
    if new.risk_id is not null then
      select tenant_id into t from public.ddrive_risks where id = new.risk_id;
      if t is distinct from new.tenant_id then raise exception 'That risk is not in your organisation.' using errcode = '42501'; end if;
    end if;
    if new.hazard_entry_id is not null then
      select tenant_id into t from public.ddrive_hazard_assessment_entries where id = new.hazard_entry_id;
      if t is distinct from new.tenant_id then raise exception 'That assessed hazard event is not in your organisation.' using errcode = '42501'; end if;
      -- A treatment answers an interpreted risk: the hazard event must be scored first.
      if (select risk_code from public.ddrive_hazard_assessment_entries where id = new.hazard_entry_id) is null then
        raise exception 'Score this hazard event (exposure, vulnerability and response) before proposing an action for it.' using errcode = '22023';
      end if;
      -- An entry linked to the register carries its risk along, so the action shows on both.
      if new.risk_id is null then
        select risk_id into new.risk_id from public.ddrive_hazard_assessment_entries where id = new.hazard_entry_id;
      end if;
    end if;
    if new.hazard_record_id is not null then
      select tenant_id into t from public.ddrive_hazards where id = new.hazard_record_id;
      if t is distinct from new.tenant_id then raise exception 'That hazard report is not in your organisation.' using errcode = '42501'; end if;
    end if;
    -- Official alerts are shared by all organisations: any alert may be referenced.
    return new;
  end if;

  if stepping then return new; end if;

  -- Plain updates. The decision, progress and outcome never change here.
  if new.status is distinct from old.status or new.decision_note is distinct from old.decision_note
     or new.decided_by is distinct from old.decided_by or new.decided_at is distinct from old.decided_at
     or new.progress is distinct from old.progress or new.last_update is distinct from old.last_update
     or new.outcome is distinct from old.outcome or new.completed_at is distinct from old.completed_at then
    raise exception 'Use the action''s steps (approve, decline, update progress, complete, cancel) to change its status.' using errcode = '42501';
  end if;
  if new.origin is distinct from old.origin or new.risk_id is distinct from old.risk_id or new.hazard_entry_id is distinct from old.hazard_entry_id
     or new.official_alert_id is distinct from old.official_alert_id or new.hazard_record_id is distinct from old.hazard_record_id then
    raise exception 'What an action responds to cannot be changed. Propose a new action instead.' using errcode = '42501';
  end if;
  if old.status in ('done', 'declined', 'cancelled') then
    raise exception 'This action is closed and can no longer be changed.' using errcode = '42501';
  end if;
  if old.status <> 'proposed' then
    -- After the decision, only reassignment (owner, due date) is allowed, by a DRRM officer.
    if new.title is distinct from old.title or new.description is distinct from old.description or new.strategy is distinct from old.strategy
       or new.drrm_area is distinct from old.drrm_area or new.priority is distinct from old.priority or new.cost_php is distinct from old.cost_php then
      raise exception 'An approved action''s content is fixed. Cancel it and propose a new one to change what is done.' using errcode = '42501';
    end if;
    if not public.ddrive_has_role(old.tenant_id, 'drrm_officer') then
      raise exception 'Only a DRRM officer or administrator can reassign an approved action.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- ─── Steps ───────────────────────────────────────────────────────────────────
create or replace function public.ddrive_response_action_for_step(p_id text, p_min public.ddrive_role)
returns public.ddrive_response_actions
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions;
begin
  select * into a from public.ddrive_response_actions where id = p_id for update;
  if a.id is null or not public.ddrive_is_member(a.tenant_id) then
    raise exception 'No such action.' using errcode = '42501';
  end if;
  if not public.ddrive_has_role(a.tenant_id, p_min) then
    raise exception 'This step needs the % role or higher.', replace(p_min::text, '_', ' ') using errcode = '42501';
  end if;
  return a;
end;
$$;

-- Decide on a proposal (DRRM officer): approve or decline, with the reason.
create or replace function public.ddrive_response_decide(p_id text, p_approve boolean, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions := public.ddrive_response_action_for_step(p_id, 'drrm_officer');
begin
  if a.status <> 'proposed' then
    raise exception 'Only a proposed action can be approved or declined.' using errcode = '22023';
  end if;
  if not p_approve and length(btrim(coalesce(p_note, ''))) < 10 then
    raise exception 'Say why the action is declined.' using errcode = '22023';
  end if;
  update public.ddrive_response_actions
     set status = case when p_approve then 'approved' else 'declined' end,
         decision_note = nullif(btrim(coalesce(p_note, '')), ''), decided_by = auth.uid(), decided_at = now()
   where id = p_id;
  return case when p_approve then 'approved' else 'declined' end;
end;
$$;

-- Report progress on an approved action (responder or higher).
create or replace function public.ddrive_response_progress(p_id text, p_progress int, p_update text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions := public.ddrive_response_action_for_step(p_id, 'responder');
begin
  if a.status not in ('approved', 'in_progress') then
    raise exception 'Progress can be reported only on an approved action.' using errcode = '22023';
  end if;
  if p_progress is null or p_progress < 0 or p_progress > 99 then
    raise exception 'Give progress from 0 to 99%%; use "complete" when it is done.' using errcode = '22023';
  end if;
  if p_progress < a.progress then
    raise exception 'Progress cannot go down (it is at % percent).', a.progress using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_update, ''))) < 5 then
    raise exception 'Say what was done.' using errcode = '22023';
  end if;
  update public.ddrive_response_actions
     set status = 'in_progress', progress = p_progress, last_update = btrim(p_update)
   where id = p_id;
  return 'in_progress';
end;
$$;

-- Complete with the outcome (responder or higher). Checking the result belongs to Validation and Monitoring.
create or replace function public.ddrive_response_complete(p_id text, p_outcome text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions := public.ddrive_response_action_for_step(p_id, 'responder');
begin
  if a.status not in ('approved', 'in_progress') then
    raise exception 'Only an approved action can be completed.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_outcome, ''))) < 10 then
    raise exception 'Describe the outcome: what was done and what it changed.' using errcode = '22023';
  end if;
  update public.ddrive_response_actions
     set status = 'done', progress = 100, outcome = btrim(p_outcome), completed_at = now()
   where id = p_id;
  return 'done';
end;
$$;

-- Cancel a proposed or approved action (DRRM officer), with the reason.
create or replace function public.ddrive_response_cancel(p_id text, p_reason text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions := public.ddrive_response_action_for_step(p_id, 'drrm_officer');
begin
  if a.status not in ('proposed', 'approved', 'in_progress') then
    raise exception 'This action is already closed.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Say why the action is cancelled.' using errcode = '22023';
  end if;
  update public.ddrive_response_actions
     set status = 'cancelled', decision_note = btrim(p_reason), decided_by = auth.uid(), decided_at = now()
   where id = p_id;
  return 'cancelled';
end;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists ddrive_10_touch on public.ddrive_response_actions;
create trigger ddrive_10_touch before insert or update on public.ddrive_response_actions
  for each row execute function public.ddrive_touch('T');
drop trigger if exists ddrive_20_guard on public.ddrive_response_actions;
create trigger ddrive_20_guard before insert or update on public.ddrive_response_actions
  for each row execute function public.ddrive_response_action_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_response_actions;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_response_actions
  for each row execute function public.ddrive_audit();

-- ─── Access rules ────────────────────────────────────────────────────────────
alter table public.ddrive_response_actions enable row level security;
drop policy if exists response_actions_select on public.ddrive_response_actions;
drop policy if exists response_actions_insert on public.ddrive_response_actions;
drop policy if exists response_actions_update on public.ddrive_response_actions;
-- Everyone in the organisation can follow actions; responders propose from Detection, analysts from Diagnosis
-- (checked in the guard); edits before the decision need an analyst; steps check their own role.
create policy response_actions_select on public.ddrive_response_actions for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy response_actions_insert on public.ddrive_response_actions for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'responder'));
create policy response_actions_update on public.ddrive_response_actions for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

revoke all on public.ddrive_response_actions from anon, authenticated;
grant select, insert, update on public.ddrive_response_actions to authenticated;   -- never deleted: cancel instead
revoke all on function public.ddrive_response_action_for_step(text, public.ddrive_role) from public, anon, authenticated;
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.ddrive_response_decide(text, boolean, text)',
    'public.ddrive_response_progress(text, int, text)',
    'public.ddrive_response_complete(text, text)',
    'public.ddrive_response_cancel(text, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.ddrive_response_actions;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
