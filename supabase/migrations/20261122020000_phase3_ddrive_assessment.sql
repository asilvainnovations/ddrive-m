-- DDRiVE-M Phase 3: DDRiVE hazard, vulnerability and risk assessment (Diagnosis). See docs/adr/006-ddrive-hazard-assessment.md.
-- Ports the DDRiVE workbook (DDRiVE_Diagnosis_Tool.xlsm, after UNDRR's Quick Risk Estimation tool). Safe to run more than once.
--
--   ddrive_hazard_assessments (HA-001)      the workbook's Information sheet, method, approval
--     └── ddrive_hazard_assessment_entries  one row per hazard event: exposure, 4 vulnerabilities, response → scores
--     └── ddrive_hazard_scenarios           compound scenarios over chosen entries
--   ddrive_hazard_catalogue                 families, main hazards and hazard events (reference data)
--   ddrive_risks gains a link to the entry it came from.

-- ─── 1. Reference data: hazard catalogue ─────────────────────────────────────
create table if not exists public.ddrive_hazard_catalogue (
  family_code text not null check (family_code ~ '^H[1-8]$'),
  family text not null,
  kind text not null check (kind in ('main', 'event')),
  name text not null,
  primary key (family_code, kind, name)
);

-- Seeded from the workbook's Assumptions sheet (src/lib/ddriveAssessment/catalogue.json is the same list).
insert into public.ddrive_hazard_catalogue (family_code, family, kind, name) values
('H1', 'Geophysical', 'main', 'Earthquake'),
('H1', 'Geophysical', 'main', 'Mass Movement'),
('H1', 'Geophysical', 'main', 'Volcanic Activity'),
('H1', 'Geophysical', 'event', 'Ash fall'),
('H1', 'Geophysical', 'event', 'Fire following event'),
('H1', 'Geophysical', 'event', 'Ground movement'),
('H1', 'Geophysical', 'event', 'Landslide following event'),
('H1', 'Geophysical', 'event', 'Lahar'),
('H1', 'Geophysical', 'event', 'Lava flow'),
('H1', 'Geophysical', 'event', 'Liquefaction'),
('H1', 'Geophysical', 'event', 'Pyroclastic flow'),
('H1', 'Geophysical', 'event', 'Tsunami'),
('H2', 'Hydrological', 'main', 'Flood'),
('H2', 'Hydrological', 'main', 'Landslide'),
('H2', 'Hydrological', 'main', 'Wave Action'),
('H2', 'Hydrological', 'event', 'Avalanche/Snow/Debris'),
('H2', 'Hydrological', 'event', 'Coastal Flood'),
('H2', 'Hydrological', 'event', 'Coastal Erosion'),
('H2', 'Hydrological', 'event', 'Landslide following event'),
('H2', 'Hydrological', 'event', 'Mudfall/Rockfall/Debris'),
('H2', 'Hydrological', 'event', 'Expansive Soil'),
('H2', 'Hydrological', 'event', 'Flash Flood'),
('H2', 'Hydrological', 'event', 'Ice Jam Flood'),
('H2', 'Hydrological', 'event', 'Riverine Flood'),
('H2', 'Hydrological', 'event', 'Rogue Wave'),
('H2', 'Hydrological', 'event', 'Seiche'),
('H2', 'Hydrological', 'event', 'Sinkhole'),
('H3', 'Meteorological', 'main', 'Convective Storm'),
('H3', 'Meteorological', 'main', 'Extratropical Storm'),
('H3', 'Meteorological', 'main', 'Extreme Temperature'),
('H3', 'Meteorological', 'main', 'Fog'),
('H3', 'Meteorological', 'main', 'Tropical Cyclone'),
('H3', 'Meteorological', 'event', 'Cold Wave'),
('H3', 'Meteorological', 'event', 'Derecho'),
('H3', 'Meteorological', 'event', 'Frost/Freeze'),
('H3', 'Meteorological', 'event', 'Hail'),
('H3', 'Meteorological', 'event', 'Heatwave'),
('H3', 'Meteorological', 'event', 'Lightning'),
('H3', 'Meteorological', 'event', 'Rain'),
('H3', 'Meteorological', 'event', 'Sandstorm/Duststorm'),
('H3', 'Meteorological', 'event', 'Snow/Ice'),
('H3', 'Meteorological', 'event', 'Storm Surge'),
('H3', 'Meteorological', 'event', 'Tornado'),
('H3', 'Meteorological', 'event', 'Wind'),
('H3', 'Meteorological', 'event', 'Winter Storm/Blizzard'),
('H4', 'Climatological', 'main', 'Drought'),
('H4', 'Climatological', 'main', 'Glacial Lake Outburst'),
('H4', 'Climatological', 'main', 'Wildfire'),
('H4', 'Climatological', 'event', 'Forest Fire'),
('H4', 'Climatological', 'event', 'Land Fire of Brush/Bush/Pasture'),
('H4', 'Climatological', 'event', 'Subsidence'),
('H5', 'Biological', 'main', 'Animal Incident'),
('H5', 'Biological', 'main', 'Disease'),
('H5', 'Biological', 'main', 'Insect Infestation'),
('H5', 'Biological', 'event', 'Bacterial Disease'),
('H5', 'Biological', 'event', 'Fungal Disease'),
('H5', 'Biological', 'event', 'Parasitic Disease'),
('H5', 'Biological', 'event', 'Prion Disease'),
('H5', 'Biological', 'event', 'Viral Disease'),
('H6', 'Extraterrestrial', 'main', 'Impact to ground or water'),
('H6', 'Extraterrestrial', 'main', 'Space Weather'),
('H6', 'Extraterrestrial', 'event', 'Airburst'),
('H6', 'Extraterrestrial', 'event', 'Collision'),
('H6', 'Extraterrestrial', 'event', 'Energetic Particles'),
('H6', 'Extraterrestrial', 'event', 'Geomagnetic Storm'),
('H6', 'Extraterrestrial', 'event', 'Radio Disturbance'),
('H6', 'Extraterrestrial', 'event', 'Shockwave'),
('H7', 'Anthropogenic', 'main', 'Technological hazard'),
('H7', 'Anthropogenic', 'main', 'Chemical and radiological hazard'),
('H7', 'Anthropogenic', 'main', 'Transportation accidents'),
('H7', 'Anthropogenic', 'event', 'Industrial disaster'),
('H7', 'Anthropogenic', 'event', 'Structural collapse'),
('H7', 'Anthropogenic', 'event', 'Power outage'),
('H7', 'Anthropogenic', 'event', 'Fire following event'),
('H7', 'Anthropogenic', 'event', 'Industrial explosion'),
('H7', 'Anthropogenic', 'event', 'Mine disaster'),
('H7', 'Anthropogenic', 'event', 'Chemical spill'),
('H7', 'Anthropogenic', 'event', 'Oil spill'),
('H7', 'Anthropogenic', 'event', 'Radiation contamination, nuclear incident'),
('H7', 'Anthropogenic', 'event', 'Aviation accident'),
('H7', 'Anthropogenic', 'event', 'Rail accident'),
('H7', 'Anthropogenic', 'event', 'Road accident'),
('H7', 'Anthropogenic', 'event', 'Navigation accident'),
('H7', 'Anthropogenic', 'event', 'Space accident')
on conflict do nothing;

-- ─── 2. Scoring (the workbook's formulas) ────────────────────────────────────
-- Inputs are the 0–10 scale positions. Returns nulls until every input is given (as the workbook does).
--   TV = (V1 + V2 + V3 + V4) × 0.25 × 10
--   workbook:   LR = INDEX(scores, MATCH(E) × 0.5 + (TV/10) × 0.5) = max(0, floor((4E + 4 + ΣV) / 8) − 1)
--   continuous: LR = 0.5 E + 0.05 TV
--   SR = 10 LR − 10 R;  risk = VL1 when SR ≤ 0, else matrix(SR band, LR band)
create or replace function public.ddrive_ha_score(
  p_method text, e int, v1 int, v2 int, v3 int, v4 int, r int,
  out total_vulnerability numeric, out likelihood numeric, out severity numeric,
  out likelihood_level text, out severity_class text, out risk_code text, out risk_rank int)
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  s int;
  li int;  -- likelihood band 0..4
  si int;  -- severity band 0..4
begin
  if e is null or v1 is null or v2 is null or v3 is null or v4 is null or r is null then return; end if;
  s := v1 + v2 + v3 + v4;
  total_vulnerability := s * 2.5;
  if p_method = 'continuous' then
    likelihood := 0.5 * e + s / 8.0;
  else
    likelihood := greatest(0, floor((4 * e + 4 + s) / 8.0) - 1);
  end if;
  severity := likelihood * 10 - r * 10;
  li := case when likelihood <= 2 then 0 when likelihood <= 4 then 1 when likelihood <= 6 then 2 when likelihood <= 8 then 3 else 4 end;
  likelihood_level := (array['Very Low', 'Low', 'Moderate', 'High', 'Very High'])[li + 1];
  if severity <= 0 then
    severity_class := 'Below threshold';
    risk_rank := 1;
  else
    si := case when severity <= 10 then 0 when severity <= 25 then 1 when severity <= 50 then 2 when severity <= 75 then 3 else 4 end;
    severity_class := (array['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'])[si + 1];
    risk_rank := si + li + 1;
  end if;
  risk_code := (case when risk_rank <= 2 then 'VL' when risk_rank <= 4 then 'L' when risk_rank <= 6 then 'M' when risk_rank <= 8 then 'H' else 'VH' end)
               || risk_rank;
end;
$$;

-- Compound scenario (Instructions, "Risk Matrix Scenarios"): average LR; severity is the event's own SR for one event,
-- otherwise the mean over hazard families of Σ(LR × SR) / 10, capped at 100.
create or replace function public.ddrive_ha_scenario_score(
  p_families text[], p_lr numeric[], p_sr numeric[],
  out likelihood numeric, out severity numeric, out likelihood_level text, out severity_class text, out risk_code text, out risk_rank int)
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  n int := coalesce(array_length(p_lr, 1), 0);
  li int;
  si int;
begin
  if n = 0 then return; end if;
  likelihood := round((select avg(x) from unnest(p_lr) x), 2);
  if n = 1 then
    severity := p_sr[1];
  else
    select round(avg(fam_sev), 2) into severity from (
      select sum(lr * sr) / 10 as fam_sev
      from unnest(p_families, p_lr, p_sr) as t(fam, lr, sr)
      group by fam
    ) f;
  end if;
  severity := least(severity, 100);
  li := case when likelihood <= 2 then 0 when likelihood <= 4 then 1 when likelihood <= 6 then 2 when likelihood <= 8 then 3 else 4 end;
  likelihood_level := (array['Very Low', 'Low', 'Moderate', 'High', 'Very High'])[li + 1];
  if severity <= 0 then
    severity_class := 'Below threshold'; risk_rank := 1;
  else
    si := case when severity <= 10 then 0 when severity <= 25 then 1 when severity <= 50 then 2 when severity <= 75 then 3 else 4 end;
    severity_class := (array['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'])[si + 1];
    risk_rank := si + li + 1;
  end if;
  risk_code := (case when risk_rank <= 2 then 'VL' when risk_rank <= 4 then 'L' when risk_rank <= 6 then 'M' when risk_rank <= 8 then 'H' else 'VH' end)
               || risk_rank;
end;
$$;

-- ─── 3. Tables ───────────────────────────────────────────────────────────────
create table if not exists public.ddrive_hazard_assessments (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  title text not null check (length(btrim(title)) between 3 and 200),        -- Location / region name
  description text check (description is null or length(description) <= 4000), -- including assets under examination
  assessor text check (assessor is null or length(assessor) <= 200),           -- facilitator of the workshop
  participants text check (participants is null or length(participants) <= 2000),
  completed_on date,
  review_on date,
  version_label text check (version_label is null or length(version_label) <= 40),
  psgc_code text check (psgc_code is null or psgc_code ~ '^[0-9]{9,10}$'),
  method text not null default 'workbook' check (method in ('workbook', 'continuous')),
  template text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  approved_by uuid, approved_at timestamptz,
  supersedes_id text references public.ddrive_hazard_assessments (id),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (review_on is null or completed_on is null or review_on >= completed_on)
);
create unique index if not exists ddrive_hazard_assessments_ref on public.ddrive_hazard_assessments (tenant_id, ref);

create table if not exists public.ddrive_hazard_assessment_entries (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  assessment_id text not null references public.ddrive_hazard_assessments (id) on delete cascade,
  sort_order int not null default 0,
  family_code text not null check (family_code ~ '^H[1-8]$'),
  main_hazard text not null check (length(btrim(main_hazard)) between 2 and 80),
  hazard_event text not null,
  exposure int check (exposure between 0 and 10),
  v_infrastructure int check (v_infrastructure between 0 and 10),
  v_productive int check (v_productive between 0 and 10),
  v_services int check (v_services between 0 and 10),
  v_social int check (v_social between 0 and 10),
  response int check (response between 0 and 10),
  comments text check (comments is null or length(comments) <= 4000),          -- justification for the scores
  -- Computed by the server.
  total_vulnerability numeric, likelihood numeric, severity numeric,
  likelihood_level text, severity_class text, risk_code text, risk_rank int,
  risk_id text references public.ddrive_risks (id) on delete set null,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create index if not exists ddrive_hazard_entries_assessment on public.ddrive_hazard_assessment_entries (assessment_id, sort_order);
create index if not exists ddrive_hazard_entries_main on public.ddrive_hazard_assessment_entries (tenant_id, main_hazard);

create table if not exists public.ddrive_hazard_scenarios (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  assessment_id text not null references public.ddrive_hazard_assessments (id) on delete cascade,
  name text not null check (length(btrim(name)) between 3 and 200),
  description text check (description is null or length(description) <= 2000),
  entry_ids text[] not null check (cardinality(entry_ids) between 1 and 20),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);

-- The risk register remembers which assessment entry a risk came from.
alter table public.ddrive_risks add column if not exists hazard_entry_id text;
alter table public.ddrive_risks add column if not exists ddrive_risk_code text;
alter table public.ddrive_risks add column if not exists total_vulnerability numeric;
alter table public.ddrive_risks add column if not exists hazard_family text;
alter table public.ddrive_risks add column if not exists main_hazard text;
alter table public.ddrive_risks add column if not exists hazard_event text;

-- ─── 4. Guards ───────────────────────────────────────────────────────────────
create or replace function public.ddrive_ha_stepping()
returns boolean language sql stable set search_path = public, pg_temp
as $$ select current_user not in ('authenticated', 'anon') $$;

create or replace function public.ddrive_ha_assessment_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if tg_op = 'INSERT' then
    if not public.ddrive_ha_stepping() then
      new.status := 'draft'; new.approved_by := null; new.approved_at := null; new.supersedes_id := null;
    end if;
    return new;
  end if;
  if public.ddrive_ha_stepping() then return new; end if;
  if old.status <> 'draft' then
    raise exception 'This assessment is % and locked. Start a new version to change it.', old.status using errcode = '42501';
  end if;
  if new.status is distinct from old.status or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at or new.supersedes_id is distinct from old.supersedes_id then
    raise exception 'Use Approve or New version to change an assessment''s status.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_ha_entry_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_hazard_assessments;
  sc record;
begin
  if public.ddrive_is_admin_context() and tg_op = 'DELETE' then return old; end if;
  select * into a from public.ddrive_hazard_assessments where id = coalesce(new.assessment_id, old.assessment_id);
  if a.id is null or a.tenant_id is distinct from coalesce(new.tenant_id, old.tenant_id) then
    raise exception 'The entry must belong to an assessment in your organisation.' using errcode = '42501';
  end if;
  if not public.ddrive_ha_stepping() and a.status <> 'draft' then
    raise exception 'This assessment is % and locked. Start a new version to change it.', a.status using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' and new.assessment_id is distinct from old.assessment_id then
    raise exception 'An entry cannot be moved to another assessment.' using errcode = '42501';
  end if;
  if not public.ddrive_ha_stepping() and tg_op = 'UPDATE' and new.risk_id is distinct from old.risk_id then
    raise exception 'Use "Add to risk register" to link an entry to the register.' using errcode = '42501';
  end if;

  -- The hazard must come from the catalogue. H8 ("Other") takes a user-named main hazard and any listed event.
  new.main_hazard := btrim(new.main_hazard);
  if new.family_code <> 'H8' and not exists (
       select 1 from public.ddrive_hazard_catalogue where family_code = new.family_code and kind = 'main' and name = new.main_hazard) then
    raise exception '"%" is not a main hazard of family %.', new.main_hazard, new.family_code using errcode = '22023';
  end if;
  if not exists (
       select 1 from public.ddrive_hazard_catalogue
       where kind = 'event' and name = new.hazard_event and (new.family_code = 'H8' or family_code = new.family_code)) then
    raise exception '"%" is not a hazard event of family %.', new.hazard_event, new.family_code using errcode = '22023';
  end if;

  select * into sc from public.ddrive_ha_score(a.method, new.exposure, new.v_infrastructure, new.v_productive, new.v_services, new.v_social, new.response);
  new.total_vulnerability := sc.total_vulnerability; new.likelihood := sc.likelihood; new.severity := sc.severity;
  new.likelihood_level := sc.likelihood_level; new.severity_class := sc.severity_class;
  new.risk_code := sc.risk_code; new.risk_rank := sc.risk_rank;
  if tg_op = 'INSERT' and not public.ddrive_ha_stepping() then new.risk_id := null; end if;
  return new;
end;
$$;

create or replace function public.ddrive_ha_scenario_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_hazard_assessments;
  n int;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into a from public.ddrive_hazard_assessments where id = new.assessment_id;
  if a.id is null or a.tenant_id is distinct from new.tenant_id then
    raise exception 'The scenario must belong to an assessment in your organisation.' using errcode = '42501';
  end if;
  if a.status = 'superseded' then raise exception 'This assessment has been superseded.' using errcode = '42501'; end if;
  select count(*) into n from public.ddrive_hazard_assessment_entries
   where assessment_id = new.assessment_id and id = any (new.entry_ids) and risk_code is not null;
  if n <> cardinality(array(select distinct unnest(new.entry_ids))) then
    raise exception 'A scenario can use only scored hazard events of the same assessment.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Only ddrive_ha_add_to_register may set a risk's DDRiVE fields; a typed-in risk cannot claim an assessed rating.
create or replace function public.ddrive_ha_risk_link_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() or public.ddrive_ha_stepping() then return new; end if;
  if tg_op = 'INSERT' then
    new.hazard_entry_id := null; new.ddrive_risk_code := null; new.total_vulnerability := null;
    new.hazard_family := null; new.main_hazard := null; new.hazard_event := null;
  else
    new.hazard_entry_id := old.hazard_entry_id; new.ddrive_risk_code := old.ddrive_risk_code;
    new.total_vulnerability := old.total_vulnerability; new.hazard_family := old.hazard_family;
    new.main_hazard := old.main_hazard; new.hazard_event := old.hazard_event;
  end if;
  return new;
end;
$$;
drop trigger if exists ddrive_25_ddrive_link on public.ddrive_risks;
create trigger ddrive_25_ddrive_link before insert or update on public.ddrive_risks
  for each row execute function public.ddrive_ha_risk_link_guard();

-- ─── 5. Steps ────────────────────────────────────────────────────────────────
create or replace function public.ddrive_ha_approve(p_assessment text)
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_hazard_assessments;
begin
  select * into a from public.ddrive_hazard_assessments where id = p_assessment for update;
  if a.id is null or not public.ddrive_is_member(a.tenant_id) then raise exception 'No such assessment.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(a.tenant_id, 'drrm_officer') then
    raise exception 'Only a DRRM officer or administrator can approve an assessment.' using errcode = '42501';
  end if;
  if a.status <> 'draft' then raise exception 'Only a draft can be approved.' using errcode = '22023'; end if;
  if not exists (select 1 from public.ddrive_hazard_assessment_entries where assessment_id = a.id and risk_code is not null) then
    raise exception 'Score at least one hazard event before approving.' using errcode = '22023';
  end if;
  if exists (select 1 from public.ddrive_hazard_assessment_entries where assessment_id = a.id and risk_code is null) then
    raise exception 'Some hazard events are not fully scored. Score them or remove them first.' using errcode = '22023';
  end if;
  if a.completed_on is null then raise exception 'Record the completion date first.' using errcode = '22023'; end if;
  update public.ddrive_hazard_assessments set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = a.id;
  if a.supersedes_id is not null then
    update public.ddrive_hazard_assessments set status = 'superseded' where id = a.supersedes_id and status = 'approved';
  end if;
  return 'approved';
end;
$$;

-- A new draft copying an approved assessment and its entries (not its register links or scenarios).
create or replace function public.ddrive_ha_new_version(p_assessment text)
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_hazard_assessments;
  v_new text;
begin
  select * into a from public.ddrive_hazard_assessments where id = p_assessment;
  if a.id is null or not public.ddrive_is_member(a.tenant_id) then raise exception 'No such assessment.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(a.tenant_id, 'analyst') then
    raise exception 'Only an analyst or higher can start a new version.' using errcode = '42501';
  end if;
  if a.status <> 'approved' then raise exception 'Start a new version from the approved assessment.' using errcode = '22023'; end if;
  if exists (select 1 from public.ddrive_hazard_assessments where supersedes_id = a.id and status = 'draft') then
    raise exception 'A draft of the next version already exists.' using errcode = '22023';
  end if;
  insert into public.ddrive_hazard_assessments (tenant_id, title, description, assessor, participants, review_on, version_label, psgc_code,
                                                method, template, status, supersedes_id)
  values (a.tenant_id, a.title, a.description, a.assessor, a.participants, a.review_on, null, a.psgc_code, a.method, a.template, 'draft', a.id)
  returning id into v_new;
  insert into public.ddrive_hazard_assessment_entries (tenant_id, assessment_id, sort_order, family_code, main_hazard, hazard_event,
    exposure, v_infrastructure, v_productive, v_services, v_social, response, comments)
  select tenant_id, v_new, sort_order, family_code, main_hazard, hazard_event,
         exposure, v_infrastructure, v_productive, v_services, v_social, response, comments
  from public.ddrive_hazard_assessment_entries where assessment_id = a.id;
  return v_new;
end;
$$;

-- Adds a scored entry to the risk register. Likelihood band → 1–5, severity class → 1–5 (Below threshold → 1).
create or replace function public.ddrive_ha_add_to_register(p_entry text, p_owner text, p_category text default 'Environmental')
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  e public.ddrive_hazard_assessment_entries;
  a public.ddrive_hazard_assessments;
  v_risk text;
  v_ref text;
begin
  select * into e from public.ddrive_hazard_assessment_entries where id = p_entry for update;
  if e.id is null or not public.ddrive_is_member(e.tenant_id) then raise exception 'No such hazard event.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(e.tenant_id, 'analyst') then
    raise exception 'Only an analyst or higher can add risks to the register.' using errcode = '42501';
  end if;
  if e.risk_code is null then raise exception 'Score the hazard event first.' using errcode = '22023'; end if;
  if e.risk_id is not null and exists (select 1 from public.ddrive_risks where id = e.risk_id) then
    raise exception 'This hazard event is already in the risk register (%).', (select ref from public.ddrive_risks where id = e.risk_id) using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_owner, ''))) < 2 then raise exception 'Name the risk owner.' using errcode = '22023'; end if;
  select * into a from public.ddrive_hazard_assessments where id = e.assessment_id;
  insert into public.ddrive_risks (tenant_id, title, category, likelihood, impact, owner, status,
                                   hazard_entry_id, ddrive_risk_code, total_vulnerability, hazard_family, main_hazard, hazard_event)
  values (e.tenant_id,
          left(e.main_hazard || ': ' || e.hazard_event || ' — ' || a.title, 200),
          coalesce(nullif(btrim(p_category), ''), 'Environmental'),
          array_position(array['Very Low', 'Low', 'Moderate', 'High', 'Very High'], e.likelihood_level),
          coalesce(array_position(array['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'], e.severity_class), 1),
          btrim(p_owner), 'Open', e.id, e.risk_code, e.total_vulnerability, e.family_code, e.main_hazard, e.hazard_event)
  returning id, ref into v_risk, v_ref;
  update public.ddrive_hazard_assessment_entries set risk_id = v_risk where id = e.id;
  return v_ref;
end;
$$;

-- ─── 6. Scored scenarios ─────────────────────────────────────────────────────
drop view if exists public.ddrive_hazard_scenarios_scored;
create view public.ddrive_hazard_scenarios_scored
with (security_invoker = true)
as
select s.id, s.tenant_id, s.assessment_id, s.name, s.description, s.entry_ids, s.created_at,
       sc.likelihood, sc.severity, sc.likelihood_level, sc.severity_class, sc.risk_code, sc.risk_rank
from public.ddrive_hazard_scenarios s
cross join lateral (
  select * from public.ddrive_ha_scenario_score(
    array(select e.family_code from public.ddrive_hazard_assessment_entries e where e.id = any (s.entry_ids) order by e.id),
    array(select e.likelihood from public.ddrive_hazard_assessment_entries e where e.id = any (s.entry_ids) order by e.id),
    array(select e.severity from public.ddrive_hazard_assessment_entries e where e.id = any (s.entry_ids) order by e.id))
) sc;

-- ─── 7. Triggers ─────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in select * from (values ('ddrive_hazard_assessments', 'HA'), ('ddrive_hazard_assessment_entries', ''), ('ddrive_hazard_scenarios', '')) as t(tbl, prefix) loop
    execute format('drop trigger if exists ddrive_10_touch on public.%I', r.tbl);
    execute format('create trigger ddrive_10_touch before insert or update on public.%I for each row execute function public.ddrive_touch(%L)', r.tbl, r.prefix);
    execute format('drop trigger if exists ddrive_90_audit on public.%I', r.tbl);
    execute format('create trigger ddrive_90_audit after insert or update or delete on public.%I for each row execute function public.ddrive_audit()', r.tbl);
  end loop;
end $$;
drop trigger if exists ddrive_20_guard on public.ddrive_hazard_assessments;
create trigger ddrive_20_guard before insert or update on public.ddrive_hazard_assessments for each row execute function public.ddrive_ha_assessment_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_hazard_assessment_entries;
create trigger ddrive_20_guard before insert or update or delete on public.ddrive_hazard_assessment_entries for each row execute function public.ddrive_ha_entry_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_hazard_scenarios;
create trigger ddrive_20_guard before insert or update on public.ddrive_hazard_scenarios for each row execute function public.ddrive_ha_scenario_guard();

-- ─── 8. Access rules ─────────────────────────────────────────────────────────
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['ddrive_hazard_catalogue', 'ddrive_hazard_assessments', 'ddrive_hazard_assessment_entries', 'ddrive_hazard_scenarios'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

create policy hazard_catalogue_select on public.ddrive_hazard_catalogue for select to authenticated using (true);

create policy ha_select on public.ddrive_hazard_assessments for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy ha_insert on public.ddrive_hazard_assessments for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ha_update on public.ddrive_hazard_assessments for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ha_delete on public.ddrive_hazard_assessments for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst') and status = 'draft');

create policy hae_select on public.ddrive_hazard_assessment_entries for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy hae_insert on public.ddrive_hazard_assessment_entries for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy hae_update on public.ddrive_hazard_assessment_entries for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy hae_delete on public.ddrive_hazard_assessment_entries for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

create policy hs_select on public.ddrive_hazard_scenarios for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy hs_insert on public.ddrive_hazard_scenarios for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy hs_update on public.ddrive_hazard_scenarios for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy hs_delete on public.ddrive_hazard_scenarios for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

grant select on public.ddrive_hazard_catalogue to authenticated;
grant select, insert, update, delete on public.ddrive_hazard_assessments, public.ddrive_hazard_scenarios to authenticated;
grant select, insert, delete, update (sort_order, family_code, main_hazard, hazard_event, exposure, v_infrastructure, v_productive,
  v_services, v_social, response, comments) on public.ddrive_hazard_assessment_entries to authenticated;
revoke all on public.ddrive_hazard_scenarios_scored from anon, authenticated;
grant select on public.ddrive_hazard_scenarios_scored to authenticated;

-- An entry's delete removes nothing from the register: the risk keeps its copy of the rating.
do $$
declare
  f text;
begin
  foreach f in array array['public.ddrive_ha_approve(text)', 'public.ddrive_ha_new_version(text)',
                           'public.ddrive_ha_add_to_register(text, text, text)',
                           'public.ddrive_ha_score(text, int, int, int, int, int, int)',
                           'public.ddrive_ha_scenario_score(text[], numeric[], numeric[])', 'public.ddrive_ha_stepping()'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
