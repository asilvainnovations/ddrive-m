-- Phase 5 · Validation: sub-regional operations exercises (ADR-019).
-- 1. Response clusters: the twelve clusters of the national cluster approach, as listed in the DILG Region VIII
--    harmonised disaster response reporting SOP (Shelter led by DHSUD under NDRRMC Res. No. 10 s. 2021).
-- 2. Contingency plan activation sets: for each contingency plan, which response clusters and EOC management
--    functions it brings in, as lead, on, or on standby, and from which EOC alert level (MODE ADR-017, adapted).
-- 3. Contingency plan activations: an append-only record of each activation, live (on the current BLUE or RED
--    EOC status, logged in the EOC operations log) or in an exercise (at the level the exercise sets).
-- 4. ICS simulator runs: the scored decisions of each run, kept as exercise evidence.
-- Nothing here raises an EOC level, orders an evacuation or opens a centre. Safe to run more than once.

-- ─── 1. Response clusters (reference data) ────────────────────────────────────
create table if not exists public.ddrive_response_clusters (
  code text primary key check (code ~ '^[a-z_]{2,20}$'),
  name text not null,
  lead_agency text not null,
  source text not null,
  sort int not null
);
insert into public.ddrive_response_clusters (code, name, lead_agency, source, sort) values
  ('srr', 'Search, Rescue and Retrieval', 'AFP', 'DILG VIII harmonised SOP, I (cluster approach)', 1),
  ('health', 'Health', 'DOH', 'DILG VIII harmonised SOP, I (cluster approach)', 2),
  ('education', 'Education', 'DepEd', 'DILG VIII harmonised SOP, I (cluster approach)', 3),
  ('law_order', 'Law and Order', 'PNP', 'DILG VIII harmonised SOP, I (cluster approach)', 4),
  ('piha', 'Philippine International Humanitarian Assistance', 'DFA', 'DILG VIII harmonised SOP, I (cluster approach)', 5),
  ('etc', 'Emergency Telecommunications', 'DICT', 'DILG VIII harmonised SOP, I (cluster approach)', 6),
  ('logistics', 'Logistics', 'OCD', 'DILG VIII harmonised SOP, I (cluster approach)', 7),
  ('cccm', 'Camp Coordination and Camp Management', 'DSWD', 'DILG VIII harmonised SOP, I (cluster approach)', 8),
  ('fni', 'Food and Non-food Items', 'DSWD', 'DILG VIII harmonised SOP, I (cluster approach)', 9),
  ('idp_protection', 'Internally Displaced Persons Protection', 'DSWD', 'DILG VIII harmonised SOP, I (cluster approach)', 10),
  ('shelter', 'Shelter', 'DHSUD', 'NDRRMC Res. No. 10 s. 2021; DILG VIII harmonised SOP', 11),
  ('mdm', 'Management of the Dead and the Missing', 'DILG', 'DILG VIII harmonised SOP, I (cluster approach)', 12)
on conflict (code) do update set name = excluded.name, lead_agency = excluded.lead_agency, source = excluded.source, sort = excluded.sort;

-- ─── 2. Activation set of a contingency plan ──────────────────────────────────
create table if not exists public.ddrive_cp_items (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  plan_id text not null references public.ddrive_plans (id) on delete cascade,
  item_kind text not null check (item_kind in ('cluster', 'function')),
  item_code text not null,
  state text not null check (state in ('lead', 'on', 'standby')),
  min_level text not null default 'red' check (min_level in ('blue', 'red')),
  note text check (note is null or length(note) <= 500),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  unique (plan_id, item_kind, item_code),
  check (item_kind <> 'function' or item_code in ('management', 'operations', 'planning', 'logistics', 'finance_admin'))
);
create index if not exists ddrive_cp_items_plan on public.ddrive_cp_items (plan_id);

-- An item names a real cluster, belongs to a contingency plan of the same organisation, and the activation set of an
-- approved plan is changed only by a DRRM officer (the plan was adopted with it).
create or replace function public.ddrive_cp_item_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare p record;
begin
  if tg_op = 'DELETE' then
    select tenant_id, status, template_key into p from public.ddrive_plans where id = old.plan_id;
    if not public.ddrive_is_admin_context() and p.status in ('Approved', 'Retired') and not public.ddrive_has_role(old.tenant_id, 'drrm_officer') then
      raise exception 'This plan is approved; only a DRRM officer changes its activation set.' using errcode = '42501';
    end if;
    return old;
  end if;
  select tenant_id, status, template_key into p from public.ddrive_plans where id = new.plan_id;
  if p.tenant_id is distinct from new.tenant_id then
    raise exception 'That plan is not in your organisation.' using errcode = '42501';
  end if;
  if p.template_key is distinct from 'contingency_plan' then
    raise exception 'Activation sets belong to contingency plans.' using errcode = '22023';
  end if;
  if p.status = 'Retired' then
    raise exception 'This contingency plan is retired.' using errcode = '22023';
  end if;
  if not public.ddrive_is_admin_context() and p.status = 'Approved' and not public.ddrive_has_role(new.tenant_id, 'drrm_officer') then
    raise exception 'This plan is approved; only a DRRM officer changes its activation set.' using errcode = '42501';
  end if;
  if new.item_kind = 'cluster' and not exists (select 1 from public.ddrive_response_clusters c where c.code = new.item_code) then
    raise exception 'Unknown response cluster %.', new.item_code using errcode = '23503';
  end if;
  if tg_op = 'UPDATE' and (new.plan_id, new.item_kind, new.item_code) is distinct from (old.plan_id, old.item_kind, old.item_code) then
    raise exception 'Remove the item and add another instead.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists ddrive_10_touch on public.ddrive_cp_items;
create trigger ddrive_10_touch before insert or update on public.ddrive_cp_items for each row execute function public.ddrive_touch();
drop trigger if exists ddrive_20_guard on public.ddrive_cp_items;
create trigger ddrive_20_guard before insert or update or delete on public.ddrive_cp_items for each row execute function public.ddrive_cp_item_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_cp_items;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_cp_items for each row execute function public.ddrive_audit();

-- ─── 3. Activations ──────────────────────────────────────────────────────────
create table if not exists public.ddrive_cp_activations (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  plan_id text not null references public.ddrive_plans (id),
  mode text not null check (mode in ('live', 'exercise')),
  level text not null check (level in ('blue', 'red')),
  eoc_status_id text references public.ddrive_eoc_status (id),
  exercise_id text references public.ddrive_exercises (id),
  basis text not null check (length(btrim(basis)) between 10 and 2000),
  plan_status text not null,
  items jsonb not null default '[]'::jsonb,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check ((mode = 'live' and eoc_status_id is not null and exercise_id is null) or (mode = 'exercise' and exercise_id is not null and eoc_status_id is null))
);
create unique index if not exists ddrive_cp_activations_ref on public.ddrive_cp_activations (tenant_id, ref);
create index if not exists ddrive_cp_activations_recent on public.ddrive_cp_activations (tenant_id, created_at desc);

drop trigger if exists ddrive_10_touch on public.ddrive_cp_activations;
create trigger ddrive_10_touch before insert or update on public.ddrive_cp_activations for each row execute function public.ddrive_touch('C');
drop trigger if exists ddrive_20_append_only on public.ddrive_cp_activations;
create trigger ddrive_20_append_only before update or delete on public.ddrive_cp_activations for each row execute function public.ddrive_20_append_only();
drop trigger if exists ddrive_90_audit on public.ddrive_cp_activations;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_cp_activations for each row execute function public.ddrive_audit();

-- Activate a contingency plan.
--   Live (no exercise): a DRRM officer, on the current BLUE or RED EOC status; logged as a decision in the EOC log.
--   Exercise: an analyst, for a planned or held exercise of the organisation, at the level the exercise sets.
-- Items whose minimum level is above the level come in on standby. A plan not yet approved can be activated; the
-- record and the log say so.
create or replace function public.ddrive_cp_activate(p_plan_id text, p_basis text, p_exercise_id text default null, p_level text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t uuid := public.ddrive_active_tenant();
  p record; e record; cur record;
  v_level text; v_status text; v_items jsonb; v_id text; v_ref text; v_on int; v_standby int;
begin
  if t is null or not public.ddrive_is_member(t) then
    raise exception 'Choose an organisation to work in first.' using errcode = '42501';
  end if;
  select id, ref, title, status, template_key, tenant_id into p from public.ddrive_plans where id = p_plan_id;
  if p.id is null or p.tenant_id <> t then
    raise exception 'Contingency plan not found.' using errcode = 'P0002';
  end if;
  if p.template_key is distinct from 'contingency_plan' then
    raise exception 'Only a contingency plan is activated.' using errcode = '22023';
  end if;
  if p.status = 'Retired' then
    raise exception 'This contingency plan is retired.' using errcode = '22023';
  end if;
  if coalesce(length(btrim(p_basis)), 0) < 10 then
    raise exception 'Say what triggered the activation (at least 10 characters).' using errcode = '23514';
  end if;
  if not exists (select 1 from public.ddrive_cp_items where plan_id = p.id) then
    raise exception 'The plan has no activation set yet; add its clusters and EOC functions first.' using errcode = '22023';
  end if;

  if p_exercise_id is null then
    if not public.ddrive_has_role(t, 'drrm_officer') then
      raise exception 'Activating a contingency plan needs the DRRM officer role.' using errcode = '42501';
    end if;
    perform pg_advisory_xact_lock(hashtext('eoc_status:' || t::text));
    select id, level into cur from public.ddrive_eoc_current where tenant_id = t;
    if cur.id is null or cur.level not in ('blue', 'red') then
      raise exception 'Raise the EOC to BLUE or RED first; a plan is activated on an active EOC.' using errcode = '22023';
    end if;
    if p_level is not null and p_level <> cur.level then
      raise exception 'A live activation uses the current EOC level (%).', upper(cur.level) using errcode = '22023';
    end if;
    v_level := cur.level; v_status := cur.id;
  else
    if not public.ddrive_has_role(t, 'analyst') then
      raise exception 'Running an activation in an exercise needs the analyst role.' using errcode = '42501';
    end if;
    select id, tenant_id, status into e from public.ddrive_exercises where id = p_exercise_id;
    if e.id is null or e.tenant_id <> t then
      raise exception 'Exercise not found.' using errcode = 'P0002';
    end if;
    if e.status not in ('planned', 'conducted') then
      raise exception 'The exercise is closed.' using errcode = '22023';
    end if;
    if p_level is null or p_level not in ('blue', 'red') then
      raise exception 'Set the EOC level the exercise assumes (BLUE or RED).' using errcode = '22023';
    end if;
    v_level := p_level;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', i.item_kind, 'code', i.item_code, 'planned', i.state, 'min_level', i.min_level,
           'state', case when i.state = 'standby' or (v_level = 'blue' and i.min_level = 'red') then 'standby' else i.state end)
           order by i.item_kind, i.item_code), '[]'::jsonb)
    into v_items from public.ddrive_cp_items i where i.plan_id = p.id;
  select count(*) filter (where x->>'state' <> 'standby'), count(*) filter (where x->>'state' = 'standby')
    into v_on, v_standby from jsonb_array_elements(v_items) x;

  insert into public.ddrive_cp_activations (tenant_id, plan_id, mode, level, eoc_status_id, exercise_id, basis, plan_status, items)
  values (t, p.id, case when p_exercise_id is null then 'live' else 'exercise' end, v_level,
          v_status, p_exercise_id, btrim(p_basis), p.status, v_items)
  returning id, ref into v_id, v_ref;

  if p_exercise_id is null then
    insert into public.ddrive_eoc_log (tenant_id, entry_type, function, body)
    values (t, 'decision', 'management', format('Contingency plan activated (%s): %s %s at %s. %s cluster(s) or function(s) on, %s on standby. Trigger: %s%s',
            v_ref, p.ref, p.title, upper(v_level), v_on, v_standby, btrim(p_basis),
            case when p.status <> 'Approved' then '. The plan is not yet approved; its activation set is a draft.' else '' end));
  end if;
  return v_id;
end;
$$;

-- ─── 4. ICS simulator runs ───────────────────────────────────────────────────
create table if not exists public.ddrive_ics_runs (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  participant text not null check (length(btrim(participant)) between 2 and 120),
  office text check (office is null or length(office) <= 120),
  mode text not null check (mode in ('single', 'tabletop')),
  role text not null check (role ~ '^[a-z]{2,6}$'),
  scenario_id text not null check (scenario_id ~ '^[a-z0-9-]{2,40}$'),
  scenario_name text not null check (length(scenario_name) <= 200),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'expert')),
  seconds int not null check (seconds between 0 and 86400),
  total int not null check (total between 0 and 100),
  scores jsonb not null,
  picks jsonb not null,
  exercise_id text references public.ddrive_exercises (id),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_ics_runs_ref on public.ddrive_ics_runs (tenant_id, ref);
create index if not exists ddrive_ics_runs_recent on public.ddrive_ics_runs (tenant_id, created_at desc);

create or replace function public.ddrive_ics_run_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare et uuid;
begin
  if new.exercise_id is not null then
    select tenant_id into et from public.ddrive_exercises where id = new.exercise_id;
    if et is distinct from new.tenant_id then raise exception 'That exercise is not in your organisation.' using errcode = '42501'; end if;
  end if;
  if jsonb_typeof(new.picks) <> 'array' or jsonb_array_length(new.picks) > 40 then
    raise exception 'A run has at most 40 decisions.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists ddrive_10_touch on public.ddrive_ics_runs;
create trigger ddrive_10_touch before insert or update on public.ddrive_ics_runs for each row execute function public.ddrive_touch('S');
drop trigger if exists ddrive_20_append_only on public.ddrive_ics_runs;
create trigger ddrive_20_append_only before update or delete on public.ddrive_ics_runs for each row execute function public.ddrive_20_append_only();
drop trigger if exists ddrive_21_guard on public.ddrive_ics_runs;
create trigger ddrive_21_guard before insert on public.ddrive_ics_runs for each row execute function public.ddrive_ics_run_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_ics_runs;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_ics_runs for each row execute function public.ddrive_audit();

-- ─── Access ──────────────────────────────────────────────────────────────────
alter table public.ddrive_response_clusters enable row level security;
alter table public.ddrive_cp_items enable row level security;
alter table public.ddrive_cp_activations enable row level security;
alter table public.ddrive_ics_runs enable row level security;

drop policy if exists response_clusters_select on public.ddrive_response_clusters;
create policy response_clusters_select on public.ddrive_response_clusters for select to authenticated using (true);

drop policy if exists cp_items_select on public.ddrive_cp_items;
drop policy if exists cp_items_insert on public.ddrive_cp_items;
drop policy if exists cp_items_update on public.ddrive_cp_items;
drop policy if exists cp_items_delete on public.ddrive_cp_items;
create policy cp_items_select on public.ddrive_cp_items for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy cp_items_insert on public.ddrive_cp_items for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy cp_items_update on public.ddrive_cp_items for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy cp_items_delete on public.ddrive_cp_items for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

drop policy if exists cp_activations_select on public.ddrive_cp_activations;
create policy cp_activations_select on public.ddrive_cp_activations for select to authenticated using (public.ddrive_is_member(tenant_id));
-- No insert policy: activations are made only through ddrive_cp_activate.

-- Everyone in the organisation may train; a participant sees their own runs, analysts see all of them.
drop policy if exists ics_runs_select on public.ddrive_ics_runs;
drop policy if exists ics_runs_insert on public.ddrive_ics_runs;
create policy ics_runs_select on public.ddrive_ics_runs for select to authenticated
  using (public.ddrive_is_member(tenant_id) and (created_by = auth.uid() or public.ddrive_has_role(tenant_id, 'analyst')));
create policy ics_runs_insert on public.ddrive_ics_runs for insert to authenticated with check (public.ddrive_is_member(tenant_id));

revoke all on public.ddrive_response_clusters, public.ddrive_cp_items, public.ddrive_cp_activations, public.ddrive_ics_runs from anon, authenticated;
grant select on public.ddrive_response_clusters, public.ddrive_cp_activations to authenticated;
grant select, insert, update, delete on public.ddrive_cp_items to authenticated;
grant select, insert on public.ddrive_ics_runs to authenticated;
revoke all on function public.ddrive_cp_activate(text, text, text, text) from public, anon;
grant execute on function public.ddrive_cp_activate(text, text, text, text) to authenticated;
