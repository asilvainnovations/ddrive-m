-- DDRiVE-M Phase 2: anticipatory action under RA 12287 (Declaration of State of Imminent Disaster Act, 2025).
-- See docs/adr/003-anticipatory-action-workflow.md. Safe to run more than once.
--
-- A case follows the Act:
--   triggered    a forecast (usually an official PAGASA alert) starts the case                   (s. 3(f), s. 4)
--   assessed     a pre-disaster risk assessment has been recorded                                 (s. 3(g), s. 6)
--   recommended  the DRRM council recommended a declaration, on an assessment meeting s. 6(a) and (b)  (s. 5)
--   declared     the President or local chief executive declared it by executive order           (s. 5)
--   lifted       lifted on a new assessment that impacts are not met, or because the hazard occurred  (s. 7)
--   closed       the report (status, fund use, costs minimised) has been submitted                (s. 8, s. 11)
--   not_declared the assessment or the declaring official decided against a declaration
--
-- The database enforces the order of steps and who may take them. It does not decide: every condition
-- is confirmed by a named person, and DDRiVE-M records the decision made by the competent authority.

-- ─── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.ddrive_aa_cases (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  title text not null check (length(btrim(title)) between 3 and 200),
  hazard text not null check (hazard in ('tropical_cyclone', 'flood', 'rainfall', 'storm_surge', 'drought', 'volcanic', 'tsunami', 'other')),
  areas text not null check (length(btrim(areas)) between 2 and 2000),           -- barangays, municipalities, provinces covered
  official_alert_id uuid references public.ddrive_official_alerts (id) on delete set null,
  forecast_source text not null check (length(btrim(forecast_source)) between 3 and 300),
  forecast_issued_at timestamptz not null,
  expected_onset timestamptz not null,                                            -- expected occurrence of the hazard
  status text not null default 'triggered'
    check (status in ('triggered', 'assessed', 'recommended', 'declared', 'lifted', 'closed', 'not_declared')),
  -- Recommendation (s. 5)
  recommending_body text,
  recommended_at timestamptz,
  request_letter text,
  -- Declaration (s. 5)
  declared_by_name text,
  declared_by_title text,
  declaration_eo text,
  declared_at timestamptz,
  -- Not declared
  not_declared_reason text,
  -- Lifting (s. 7)
  lift_reason text check (lift_reason in ('impacts_not_met', 'hazard_occurred')),
  lifted_at timestamptz,
  lifting_eo text,
  -- Report (s. 8, s. 11)
  costs_minimized_php numeric(16, 2) check (costs_minimized_php >= 0),
  costs_basis text,
  report_notes text,
  report_submitted_at timestamptz,
  report_submitted_by uuid,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (expected_onset > forecast_issued_at)
);
create unique index if not exists ddrive_aa_cases_ref on public.ddrive_aa_cases (tenant_id, ref);
create index if not exists ddrive_aa_cases_status on public.ddrive_aa_cases (tenant_id, status);

create table if not exists public.ddrive_aa_assessments (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  case_id text not null references public.ddrive_aa_cases (id),
  severity_class text not null check (severity_class in ('severe', 'equivalent', 'not_severe')),
  severe_condition_met boolean not null,       -- s. 6(a), confirmed by the assessor
  lead_time_hours numeric(8, 1),               -- set by the server from the case's expected onset
  lead_time_condition_met boolean not null,    -- s. 6(b), confirmed by the assessor
  exposed_people int check (exposed_people >= 0),
  vulnerable_groups text,
  sectors_affected text,
  cascading_hazards text,
  local_capacity text,
  basis text not null check (length(btrim(basis)) >= 20),   -- sources and reasoning
  recommendation text not null check (recommendation in ('declare', 'do_not_declare', 'maintain', 'lift')),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create index if not exists ddrive_aa_assessments_case on public.ddrive_aa_assessments (case_id, created_at);

create table if not exists public.ddrive_aa_actions (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  case_id text not null references public.ddrive_aa_cases (id),
  measure text not null check (measure in ('public_advisory', 'preposition_teams', 'preemptive_evacuation', 'forced_evacuation',
                                           'volunteers', 'preposition_relief', 'social_amelioration', 'agri_food_contingency',
                                           'public_health', 'other')),
  description text not null check (length(btrim(description)) between 3 and 2000),
  responsible text,
  fund_source text not null default 'none'
    check (fund_source in ('none', 'ldrrmf', 'ldrrmf_special_trust_fund', 'agency_budget', 'ndrrmf', 'grant_donation', 'other')),
  amount_php numeric(16, 2) check (amount_php >= 0),
  disbursed_php numeric(16, 2) check (disbursed_php >= 0),
  status text not null default 'planned' check (status in ('planned', 'done', 'cancelled')),
  done_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (disbursed_php is null or amount_php is null or disbursed_php <= amount_php),
  check (fund_source <> 'none' or coalesce(disbursed_php, 0) = 0)
);
create index if not exists ddrive_aa_actions_case on public.ddrive_aa_actions (case_id);

-- ─── Case guard: steps only through the functions below ──────────────────────
create or replace function public.ddrive_aa_case_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  -- Status changes are allowed only inside the step functions below. They run as the table owner
  -- (security definer), so current_user is not a user role there; a user cannot change that.
  stepping boolean := current_user not in ('authenticated', 'anon');
begin
  if public.ddrive_is_admin_context() then return new; end if;

  if tg_op = 'INSERT' then
    -- A new case always starts at the trigger, whatever the browser sent.
    new.status := 'triggered';
    new.recommending_body := null; new.recommended_at := null;
    new.declared_by_name := null; new.declared_by_title := null; new.declaration_eo := null; new.declared_at := null;
    new.not_declared_reason := null; new.lift_reason := null; new.lifted_at := null; new.lifting_eo := null;
    new.report_submitted_at := null; new.report_submitted_by := null;
    return new;
  end if;

  if old.status in ('closed', 'not_declared') and not stepping then
    raise exception 'This case is closed and can no longer be changed.' using errcode = '42501';
  end if;

  if not stepping and (
       new.status is distinct from old.status
    or new.recommending_body is distinct from old.recommending_body or new.recommended_at is distinct from old.recommended_at
    or new.declared_by_name is distinct from old.declared_by_name or new.declared_by_title is distinct from old.declared_by_title
    or new.declaration_eo is distinct from old.declaration_eo or new.declared_at is distinct from old.declared_at
    or new.not_declared_reason is distinct from old.not_declared_reason
    or new.lift_reason is distinct from old.lift_reason or new.lifted_at is distinct from old.lifted_at
    or new.lifting_eo is distinct from old.lifting_eo
    or new.report_submitted_at is distinct from old.report_submitted_at or new.report_submitted_by is distinct from old.report_submitted_by) then
    raise exception 'Use the case''s steps (recommend, declare, lift, submit report) to change its status.' using errcode = '42501';
  end if;

  -- The forecast cannot be rewritten once a declaration has been recommended on it.
  if not stepping and old.status not in ('triggered', 'assessed') and (
       new.expected_onset is distinct from old.expected_onset or new.forecast_issued_at is distinct from old.forecast_issued_at
    or new.forecast_source is distinct from old.forecast_source or new.official_alert_id is distinct from old.official_alert_id
    or new.hazard is distinct from old.hazard) then
    raise exception 'The forecast behind a recommended or declared case cannot be changed. Record a new assessment instead.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ─── Assessment guard: append-only, conditions checked ───────────────────────
create or replace function public.ddrive_aa_assessment_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases;
begin
  select * into c from public.ddrive_aa_cases where id = new.case_id;
  if c.id is null then raise exception 'No such case.' using errcode = '23503'; end if;
  if c.tenant_id is distinct from new.tenant_id then
    raise exception 'The assessment must belong to the case''s organisation.' using errcode = '42501';
  end if;
  if c.status in ('lifted', 'closed', 'not_declared') then
    raise exception 'This case is no longer open for assessments.' using errcode = '42501';
  end if;

  new.lead_time_hours := round((extract(epoch from (c.expected_onset - now())) / 3600)::numeric, 1);

  if new.recommendation = 'declare' then
    if c.status = 'declared' then
      raise exception 'The case is already declared. Recommend "maintain" or "lift".' using errcode = '22023';
    end if;
    if not (new.severe_condition_met and new.lead_time_condition_met) then
      raise exception 'A declaration needs both conditions of RA 12287 section 6: a severe forecast hazard (a) and enough lead time (b).' using errcode = '22023';
    end if;
    if new.lead_time_hours <= 0 then
      raise exception 'The expected onset has passed, so there is no lead time left for a declaration.' using errcode = '22023';
    end if;
  elsif new.recommendation in ('maintain', 'lift') and c.status <> 'declared' then
    raise exception '"Maintain" and "lift" apply only to a declared case.' using errcode = '22023';
  elsif new.recommendation = 'do_not_declare' and c.status = 'declared' then
    raise exception 'The case is already declared. Recommend "lift" if the projected impacts are no longer expected.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_aa_assessment_after()
returns trigger
language plpgsql
security definer   -- moves the case to "assessed" without giving users the right to change status
set search_path = public, pg_temp
as $$
begin
  update public.ddrive_aa_cases set status = 'assessed'
   where id = new.case_id and status = 'triggered';
  return null;
end;
$$;

-- ─── Action guard: money moves only under a declaration ──────────────────────
create or replace function public.ddrive_aa_action_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into c from public.ddrive_aa_cases where id = new.case_id;
  if c.id is null then raise exception 'No such case.' using errcode = '23503'; end if;
  if c.tenant_id is distinct from new.tenant_id then
    raise exception 'The measure must belong to the case''s organisation.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.case_id is distinct from old.case_id then
    raise exception 'A measure cannot be moved to another case.' using errcode = '42501';
  end if;
  if c.status in ('closed', 'not_declared') then
    raise exception 'This case is closed and its measures can no longer be changed.' using errcode = '42501';
  end if;

  -- RA 12287 s. 10: funds are released on the declaration and may be used until it is lifted.
  if coalesce(new.disbursed_php, 0) > coalesce(case when tg_op = 'UPDATE' then old.disbursed_php end, 0) then
    if c.status <> 'declared' then
      raise exception 'Funds can be disbursed only while the State of Imminent Disaster is declared (RA 12287 section 10).' using errcode = '22023';
    end if;
    if not public.ddrive_has_role(c.tenant_id, 'drrm_officer') then
      raise exception 'Only a DRRM officer or administrator can record disbursements.' using errcode = '42501';
    end if;
  end if;
  if c.status = 'lifted' and tg_op = 'INSERT' then
    raise exception 'The declaration has been lifted; no new measures can be added.' using errcode = '22023';
  end if;
  if new.status = 'done' and new.done_at is null then new.done_at := now(); end if;
  return new;
end;
$$;

-- ─── Steps ───────────────────────────────────────────────────────────────────
create or replace function public.ddrive_aa_latest_assessment(p_case text)
returns public.ddrive_aa_assessments
language sql stable
set search_path = public, pg_temp
as $$
  select * from public.ddrive_aa_assessments where case_id = p_case order by created_at desc, id desc limit 1
$$;

-- Used by the step functions: the case, locked, after checking the caller may take a step on it.
create or replace function public.ddrive_aa_step_case(p_case text)
returns public.ddrive_aa_cases
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases;
begin
  select * into c from public.ddrive_aa_cases where id = p_case for update;
  if c.id is null or not public.ddrive_is_member(c.tenant_id) then
    raise exception 'No such case.' using errcode = '42501';
  end if;
  if not public.ddrive_has_role(c.tenant_id, 'drrm_officer') then
    raise exception 'Only a DRRM officer or administrator can take this step.' using errcode = '42501';
  end if;
  return c;
end;
$$;

-- s. 5: the council recommends a declaration, on an assessment that meets s. 6.
create or replace function public.ddrive_aa_recommend(p_case text, p_body text, p_letter text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_aa_step_case)
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases := public.ddrive_aa_step_case(p_case);
  a public.ddrive_aa_assessments := public.ddrive_aa_latest_assessment(p_case);
begin
  if c.status <> 'assessed' then
    raise exception 'A declaration can be recommended only after a pre-disaster risk assessment, and only once.' using errcode = '22023';
  end if;
  if a.id is null or a.recommendation <> 'declare' then
    raise exception 'The latest pre-disaster risk assessment does not recommend a declaration.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_body, ''))) < 3 then
    raise exception 'Name the council that recommends the declaration.' using errcode = '22023';
  end if;
  update public.ddrive_aa_cases
     set status = 'recommended', recommending_body = btrim(p_body), recommended_at = now(),
         request_letter = coalesce(nullif(btrim(p_letter), ''), request_letter)
   where id = p_case;
  return 'recommended';
end;
$$;

-- s. 5: the declaring official issued an executive order. DDRiVE-M records it; it does not declare.
create or replace function public.ddrive_aa_record_declaration(p_case text, p_name text, p_title text, p_eo text, p_declared_at timestamptz)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_aa_step_case)
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases := public.ddrive_aa_step_case(p_case);
begin
  if c.status <> 'recommended' then
    raise exception 'A declaration can be recorded only after it has been recommended.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 3 or length(btrim(coalesce(p_title, ''))) < 3 or length(btrim(coalesce(p_eo, ''))) < 1 then
    raise exception 'Record who declared it, their title, and the executive order number.' using errcode = '22023';
  end if;
  if p_declared_at is null or p_declared_at > now() + interval '5 minutes' or p_declared_at < c.recommended_at - interval '1 day' then
    raise exception 'Give the date and time the declaration was made (not in the future).' using errcode = '22023';
  end if;
  update public.ddrive_aa_cases
     set status = 'declared', declared_by_name = btrim(p_name), declared_by_title = btrim(p_title),
         declaration_eo = btrim(p_eo), declared_at = p_declared_at
   where id = p_case;
  return 'declared';
end;
$$;

create or replace function public.ddrive_aa_close_not_declared(p_case text, p_reason text)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_aa_step_case)
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases := public.ddrive_aa_step_case(p_case);
begin
  if c.status not in ('triggered', 'assessed', 'recommended') then
    raise exception 'Only a case that has not been declared can be closed this way.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Say why there was no declaration.' using errcode = '22023';
  end if;
  update public.ddrive_aa_cases set status = 'not_declared', not_declared_reason = btrim(p_reason) where id = p_case;
  return 'not_declared';
end;
$$;

-- s. 7: lifted on a new assessment that the projected impacts are not met, or automatically when the hazard occurs.
create or replace function public.ddrive_aa_record_lifting(p_case text, p_reason text, p_lifted_at timestamptz, p_eo text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_aa_step_case)
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases := public.ddrive_aa_step_case(p_case);
  a public.ddrive_aa_assessments := public.ddrive_aa_latest_assessment(p_case);
begin
  if c.status <> 'declared' then
    raise exception 'Only a declared case can be lifted.' using errcode = '22023';
  end if;
  if p_reason not in ('impacts_not_met', 'hazard_occurred') then
    raise exception 'Choose why it was lifted: the projected impacts are not met, or the hazard occurred.' using errcode = '22023';
  end if;
  if p_reason = 'impacts_not_met' then
    if a.id is null or a.recommendation <> 'lift' or a.created_at < c.declared_at then
      raise exception 'Lifting because the impacts are not met needs a new assessment, after the declaration, that recommends lifting (RA 12287 section 7).' using errcode = '22023';
    end if;
    if length(btrim(coalesce(p_eo, ''))) < 1 then
      raise exception 'Give the number of the order that lifted the declaration.' using errcode = '22023';
    end if;
  end if;
  if p_lifted_at is null or p_lifted_at > now() + interval '5 minutes' or p_lifted_at < c.declared_at then
    raise exception 'Give when it was lifted: after the declaration, and not in the future.' using errcode = '22023';
  end if;
  update public.ddrive_aa_cases
     set status = 'lifted', lift_reason = p_reason, lifted_at = p_lifted_at, lifting_eo = nullif(btrim(coalesce(p_eo, '')), '')
   where id = p_case;
  return 'lifted';
end;
$$;

-- s. 8 and s. 11: the report on status, fund use and costs minimised. Submitting it closes the case.
create or replace function public.ddrive_aa_submit_report(p_case text, p_costs numeric, p_basis text, p_notes text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_aa_step_case)
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases := public.ddrive_aa_step_case(p_case);
begin
  if c.status <> 'lifted' then
    raise exception 'The report is submitted after the declaration is lifted.' using errcode = '22023';
  end if;
  if p_costs is not null and (p_costs < 0 or length(btrim(coalesce(p_basis, ''))) < 20) then
    raise exception 'An estimate of costs minimised needs its basis: how it was worked out and from what data.' using errcode = '22023';
  end if;
  update public.ddrive_aa_cases
     set status = 'closed', costs_minimized_php = p_costs, costs_basis = nullif(btrim(coalesce(p_basis, '')), ''),
         report_notes = nullif(btrim(coalesce(p_notes, '')), ''), report_submitted_at = now(), report_submitted_by = auth.uid()
   where id = p_case;
  return 'closed';
end;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['ddrive_aa_cases', 'ddrive_aa_assessments', 'ddrive_aa_actions'] loop
    execute format('drop trigger if exists ddrive_10_touch on public.%I', t);
    execute format('create trigger ddrive_10_touch before insert or update on public.%I for each row execute function public.ddrive_touch(%L)',
                   t, case when t = 'ddrive_aa_cases' then 'A' else '' end);
    execute format('drop trigger if exists ddrive_90_audit on public.%I', t);
    execute format('create trigger ddrive_90_audit after insert or update or delete on public.%I for each row execute function public.ddrive_audit()', t);
  end loop;
end $$;

drop trigger if exists ddrive_20_guard on public.ddrive_aa_cases;
create trigger ddrive_20_guard before insert or update on public.ddrive_aa_cases
  for each row execute function public.ddrive_aa_case_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_aa_assessments;
create trigger ddrive_20_guard before insert on public.ddrive_aa_assessments
  for each row execute function public.ddrive_aa_assessment_guard();
drop trigger if exists ddrive_80_after on public.ddrive_aa_assessments;
create trigger ddrive_80_after after insert on public.ddrive_aa_assessments
  for each row execute function public.ddrive_aa_assessment_after();
drop trigger if exists ddrive_20_guard on public.ddrive_aa_actions;
create trigger ddrive_20_guard before insert or update on public.ddrive_aa_actions
  for each row execute function public.ddrive_aa_action_guard();

-- ─── Access rules ────────────────────────────────────────────────────────────
alter table public.ddrive_aa_cases enable row level security;
alter table public.ddrive_aa_assessments enable row level security;
alter table public.ddrive_aa_actions enable row level security;

drop policy if exists aa_cases_select on public.ddrive_aa_cases;
drop policy if exists aa_cases_insert on public.ddrive_aa_cases;
drop policy if exists aa_cases_update on public.ddrive_aa_cases;
drop policy if exists aa_assessments_select on public.ddrive_aa_assessments;
drop policy if exists aa_assessments_insert on public.ddrive_aa_assessments;
drop policy if exists aa_actions_select on public.ddrive_aa_actions;
drop policy if exists aa_actions_insert on public.ddrive_aa_actions;
drop policy if exists aa_actions_update on public.ddrive_aa_actions;

-- Everyone in the organisation can follow a case; analysts open cases and record assessments and measures;
-- the steps (recommend, declare, lift, report) need a DRRM officer (checked in the step functions).
create policy aa_cases_select on public.ddrive_aa_cases for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy aa_cases_insert on public.ddrive_aa_cases for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy aa_cases_update on public.ddrive_aa_cases for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

create policy aa_assessments_select on public.ddrive_aa_assessments for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy aa_assessments_insert on public.ddrive_aa_assessments for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));

create policy aa_actions_select on public.ddrive_aa_actions for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy aa_actions_insert on public.ddrive_aa_actions for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy aa_actions_update on public.ddrive_aa_actions for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

revoke all on public.ddrive_aa_cases, public.ddrive_aa_assessments, public.ddrive_aa_actions from anon, authenticated;
grant select, insert, update on public.ddrive_aa_cases to authenticated;
grant select, insert on public.ddrive_aa_assessments to authenticated;   -- assessments are never edited: record a new one
grant select, insert, update on public.ddrive_aa_actions to authenticated;

revoke all on function public.ddrive_aa_step_case(text) from public, anon, authenticated;  -- only for the step functions
revoke all on function public.ddrive_aa_latest_assessment(text) from public, anon;
grant execute on function public.ddrive_aa_latest_assessment(text) to authenticated;
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.ddrive_aa_recommend(text, text, text)',
    'public.ddrive_aa_record_declaration(text, text, text, text, timestamptz)',
    'public.ddrive_aa_close_not_declared(text, text)',
    'public.ddrive_aa_record_lifting(text, text, timestamptz, text)',
    'public.ddrive_aa_submit_report(text, numeric, text, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Realtime, so everyone following a case sees steps as they happen (ignored where the publication is absent).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.ddrive_aa_cases;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
