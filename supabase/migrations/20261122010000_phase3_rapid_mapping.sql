-- DDRiVE-M Phase 3: Rapid Mapping and geospatial intelligence (MVP).
-- See docs/adr/004-rapid-mapping.md and Rapid_Mapping_Technical_Specs.md. Safe to run more than once.
--
--   ddrive_incidents ─┬─ ddrive_rm_activations (M-001)
--   ddrive_aa_cases ──┘     ├── ddrive_rm_aois ── ddrive_rm_aoi_versions (append-only)
--                           ├── ddrive_rm_products (MP-001) ── ddrive_rm_product_versions
--                           │                                    ├── ddrive_rm_layers ── ddrive_rm_features
--                           │                                    ├── ddrive_rm_reviews (append-only)
--                           │                                    └── ddrive_rm_product_links
--                           └── ddrive_rm_observations (field reports, idempotent by client_key)
--   ddrive_rm_condition_codes: the organisation's own approved damage/severity classes.
--
-- Geometry is RFC 7946 GeoJSON in EPSG:4326, validated here. PostGIS is not assumed (ADR-004).
-- Status changes go only through the step functions below; the guards refuse them otherwise.

-- ─── 1. Geometry validation ──────────────────────────────────────────────────
-- Returns the first problem found (null when valid), the vertex count and the bounding box.
create or replace function public.ddrive_rm_geom_inspect(
  g jsonb, p_allowed text[] default null,
  out problem text, out vertices int, out min_lon double precision, out min_lat double precision,
  out max_lon double precision, out max_lat double precision)
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  t text;
  c jsonb;
  parts jsonb[] := '{}';
  mins int[] := '{}';
  closed boolean[] := '{}';
  poly jsonb;
  ring jsonb;
  i int;
  p jsonb;
  x double precision;
  y double precision;
  n int;
begin
  vertices := 0;
  if g is null or jsonb_typeof(g) <> 'object' then problem := 'The geometry is missing.'; return; end if;
  t := g ->> 'type';
  if t is null or t not in ('Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon') then
    problem := format('Geometry type "%s" is not supported. Use Point, LineString or Polygon (or their Multi- forms).', coalesce(t, 'none'));
    return;
  end if;
  if p_allowed is not null and not (t = any (p_allowed)) then
    problem := format('A %s is not allowed here. Allowed: %s.', t, array_to_string(p_allowed, ', '));
    return;
  end if;
  c := g -> 'coordinates';
  if c is null or jsonb_typeof(c) <> 'array' or jsonb_array_length(c) = 0 then
    problem := 'The geometry has no coordinates.'; return;
  end if;

  -- Collect every list of positions with its rule: minimum length, and whether it must close (polygon rings).
  if t = 'Point' then
    parts := array[jsonb_build_array(c)]; mins := array[1]; closed := array[false];
  elsif t in ('MultiPoint', 'LineString') then
    parts := array[c]; mins := array[case when t = 'LineString' then 2 else 1 end]; closed := array[false];
  elsif t = 'MultiLineString' then
    for i in 0 .. jsonb_array_length(c) - 1 loop
      parts := parts || (c -> i); mins := mins || 2; closed := closed || false;
    end loop;
  elsif t = 'Polygon' then
    for i in 0 .. jsonb_array_length(c) - 1 loop
      parts := parts || (c -> i); mins := mins || 4; closed := closed || true;
    end loop;
  else -- MultiPolygon
    for poly in select value from jsonb_array_elements(c) loop
      if jsonb_typeof(poly) <> 'array' or jsonb_array_length(poly) = 0 then
        problem := 'A polygon in the MultiPolygon has no rings.'; return;
      end if;
      for ring in select value from jsonb_array_elements(poly) loop
        parts := parts || ring; mins := mins || 4; closed := closed || true;
      end loop;
    end loop;
  end if;

  for i in 1 .. coalesce(array_length(parts, 1), 0) loop
    if jsonb_typeof(parts[i]) <> 'array' then problem := 'The coordinates are not nested correctly for a ' || t || '.'; return; end if;
    n := jsonb_array_length(parts[i]);
    if n < mins[i] then
      problem := case when closed[i] then 'A polygon ring needs at least 4 positions (the last repeats the first).'
                      else format('A %s needs at least %s positions.', t, mins[i]) end;
      return;
    end if;
    for p in select value from jsonb_array_elements(parts[i]) loop
      if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) not between 2 and 3
         or jsonb_typeof(p -> 0) <> 'number' or jsonb_typeof(p -> 1) <> 'number' then
        problem := 'Every position must be [longitude, latitude] in numbers.'; return;
      end if;
      x := (p ->> 0)::double precision;
      y := (p ->> 1)::double precision;
      if x not between -180 and 180 or y not between -90 and 90 then
        problem := format('Position [%s, %s] is outside longitude -180..180 / latitude -90..90. The data may be in a projected CRS, not EPSG:4326.', x, y);
        return;
      end if;
      vertices := vertices + 1;
      if vertices > 50000 then problem := 'The geometry has more than 50,000 positions. Simplify it first.'; return; end if;
      min_lon := least(coalesce(min_lon, x), x); max_lon := greatest(coalesce(max_lon, x), x);
      min_lat := least(coalesce(min_lat, y), y); max_lat := greatest(coalesce(max_lat, y), y);
    end loop;
    if closed[i] and ((parts[i] -> 0 ->> 0)::double precision <> (parts[i] -> -1 ->> 0)::double precision
                      or (parts[i] -> 0 ->> 1)::double precision <> (parts[i] -> -1 ->> 1)::double precision) then
      problem := 'A polygon ring must end at its first position.'; return;
    end if;
  end loop;
end;
$$;

-- ─── 2. Tables ───────────────────────────────────────────────────────────────
create table if not exists public.ddrive_rm_activations (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  incident_id text not null references public.ddrive_incidents (id),
  aa_case_id text references public.ddrive_aa_cases (id),
  title text not null check (length(btrim(title)) between 3 and 200),
  hazard_type text not null check (hazard_type in ('flood', 'tropical_cyclone', 'storm_surge', 'landslide', 'earthquake',
                                                   'volcanic', 'tsunami', 'fire', 'drought', 'other')),
  phase text not null default 'response' check (phase in ('preparedness', 'response', 'recovery')),
  priority text not null default 'routine' check (priority in ('routine', 'urgent', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'active', 'on_hold', 'closed', 'cancelled')),
  operational_objective text check (operational_objective is null or length(operational_objective) <= 2000),
  information_cutoff_at timestamptz,
  activated_at timestamptz, activated_by uuid,
  closed_at timestamptz, closed_by uuid, close_reason text,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_rm_activations_ref on public.ddrive_rm_activations (tenant_id, ref);
create index if not exists ddrive_rm_activations_incident on public.ddrive_rm_activations (incident_id);

create table if not exists public.ddrive_rm_aois (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  activation_id text not null references public.ddrive_rm_activations (id),
  name text not null check (length(btrim(name)) between 2 and 200),
  aoi_type text not null default 'custom' check (aoi_type in ('barangay', 'municipality', 'facility_cluster', 'watershed', 'corridor', 'custom')),
  psgc_code text check (psgc_code is null or psgc_code ~ '^[0-9]{10}$'),
  geometry jsonb not null,
  min_lon double precision, min_lat double precision, max_lon double precision, max_lat double precision,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'retired')),
  current_version int not null default 1,
  change_reason text,
  geometry_by uuid,
  submitted_by uuid, submitted_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  return_note text,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create index if not exists ddrive_rm_aois_activation on public.ddrive_rm_aois (activation_id);
create index if not exists ddrive_rm_aois_bbox on public.ddrive_rm_aois (tenant_id, min_lon, max_lon, min_lat, max_lat);

create table if not exists public.ddrive_rm_aoi_versions (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  aoi_id text not null references public.ddrive_rm_aois (id),
  version_no int not null,
  geometry jsonb not null,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (aoi_id, version_no)
);

create table if not exists public.ddrive_rm_products (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  activation_id text not null references public.ddrive_rm_activations (id),
  aoi_id text references public.ddrive_rm_aois (id),
  product_type text not null check (product_type in ('preliminary_estimate', 'delineation', 'grading', 'reference', 'situational_update')),
  title text not null check (length(btrim(title)) between 3 and 200),
  summary text check (summary is null or length(summary) <= 4000),
  methodology text check (methodology is null or length(methodology) <= 8000),
  limitations text check (limitations is null or length(limitations) <= 4000),
  confidence text not null default 'not_assessed' check (confidence in ('low', 'moderate', 'high', 'not_assessed')),
  -- Maintained by the server from the versions.
  status text not null default 'draft' check (status in ('draft', 'processing', 'preliminary', 'for_field_verification', 'under_review',
                                                         'verified', 'published', 'superseded', 'rejected', 'archived')),
  current_version int not null default 1,
  published_version int,
  audience text check (audience in ('internal_eoc', 'partner_restricted', 'public_approved')),
  archived_at timestamptz, archived_by uuid, archive_reason text,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (aoi_id is not null or product_type = 'reference')
);
create unique index if not exists ddrive_rm_products_ref on public.ddrive_rm_products (tenant_id, ref);
create index if not exists ddrive_rm_products_activation on public.ddrive_rm_products (activation_id);

create table if not exists public.ddrive_rm_product_versions (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  product_id text not null references public.ddrive_rm_products (id),
  version_no int not null,
  status text not null default 'draft' check (status in ('draft', 'processing', 'under_review', 'preliminary', 'for_field_verification',
                                                         'verified', 'published', 'superseded', 'rejected')),
  data_cutoff_at timestamptz,
  change_summary text check (change_summary is null or length(change_summary) <= 2000),
  -- Snapshot of the product's metadata when the version was submitted for review.
  title_snapshot text, summary_snapshot text, methodology_snapshot text, limitations_snapshot text, confidence_snapshot text,
  aoi_id text, aoi_version_no int,
  source_manifest jsonb not null default '[]'::jsonb,
  submitted_by uuid, submitted_at timestamptz,
  verified_by uuid, verified_at timestamptz, verification_note text,
  published_by uuid, published_at timestamptz, published_audience text, publication_level text, publication_note text,
  superseded_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  unique (product_id, version_no),
  check (publication_level is null or publication_level in ('preliminary', 'verified')),
  check (published_audience is null or published_audience in ('internal_eoc', 'partner_restricted', 'public_approved'))
);

create table if not exists public.ddrive_rm_layers (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  version_id text not null references public.ddrive_rm_product_versions (id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 200),
  layer_role text not null check (layer_role in ('observed', 'modelled', 'inferred', 'reference')),
  source_type text not null check (source_type in ('field', 'imagery', 'drone', 'agency', 'model', 'baseline', 'other')),
  source_name text not null check (length(btrim(source_name)) between 2 and 300),
  source_acquired_at timestamptz,
  source_reference text check (source_reference is null or length(source_reference) <= 500),
  source_file_name text check (source_file_name is null or length(source_file_name) <= 300),
  source_format text not null default 'geojson' check (source_format in ('geojson', 'gpkg', 'drawn', 'observations')),
  source_checksum text check (source_checksum is null or source_checksum ~ '^[0-9a-f]{64}$'),
  source_crs text not null default 'EPSG:4326' check (source_crs = 'EPSG:4326'),
  -- Maintained by the server from the features.
  geometry_type text,
  feature_count int not null default 0,
  min_lon double precision, min_lat double precision, max_lon double precision, max_lat double precision,
  style jsonb not null default '{}'::jsonb check (jsonb_typeof(style) = 'object' and pg_column_size(style) < 2000),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create index if not exists ddrive_rm_layers_version on public.ddrive_rm_layers (version_id);

create table if not exists public.ddrive_rm_observations (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  activation_id text not null references public.ddrive_rm_activations (id),
  aoi_id text references public.ddrive_rm_aois (id),
  client_key uuid not null,   -- generated on the device; a retried submission is a duplicate, not a second report
  observed_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  observation_type text not null check (observation_type in ('flood_extent', 'water_depth', 'road_access', 'structure_damage', 'landslide',
                                                             'debris', 'utility', 'facility_status', 'other')),
  access_status text check (access_status in ('passable', 'restricted', 'impassable')),
  description text not null check (length(btrim(description)) between 3 and 2000),
  geometry jsonb not null,
  min_lon double precision, min_lat double precision, max_lon double precision, max_lat double precision,
  condition_code text,
  confidence text not null default 'not_assessed' check (confidence in ('low', 'moderate', 'high', 'not_assessed')),
  verification_status text not null default 'submitted' check (verification_status in ('submitted', 'triaged', 'field_verified', 'rejected')),
  triage_note text, triaged_by uuid, triaged_at timestamptz,
  evidence_ref text check (evidence_ref is null or length(evidence_ref) <= 500),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_rm_observations_client_key on public.ddrive_rm_observations (client_key);
create index if not exists ddrive_rm_observations_activation on public.ddrive_rm_observations (activation_id, observed_at);

create table if not exists public.ddrive_rm_features (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  layer_id text not null references public.ddrive_rm_layers (id) on delete cascade,
  external_feature_id text,
  geometry jsonb not null,
  min_lon double precision, min_lat double precision, max_lon double precision, max_lat double precision,
  properties jsonb not null default '{}'::jsonb,
  observation_id text references public.ddrive_rm_observations (id),
  condition_code text,
  confidence text not null default 'not_assessed' check (confidence in ('low', 'moderate', 'high', 'not_assessed')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'field_checked', 'verified', 'disputed')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists ddrive_rm_features_layer on public.ddrive_rm_features (layer_id);

create table if not exists public.ddrive_rm_reviews (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  product_id text not null references public.ddrive_rm_products (id),
  version_id text not null references public.ddrive_rm_product_versions (id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('accept', 'return', 'reject')),
  needs_field_verification boolean not null default false,
  comments text,
  reviewed_at timestamptz not null default now()
);
create index if not exists ddrive_rm_reviews_version on public.ddrive_rm_reviews (version_id);

create table if not exists public.ddrive_rm_product_links (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  version_id text not null references public.ddrive_rm_product_versions (id),
  target_module text not null check (target_module in ('incident', 'aa_case', 'document', 'plan')),
  target_id text not null,
  relationship text not null default 'supports' check (relationship in ('supports', 'referenced_in', 'evidence_for')),
  note text check (note is null or length(note) <= 1000),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  unique (version_id, target_module, target_id)
);

create table if not exists public.ddrive_rm_condition_codes (
  tenant_id uuid not null references public.ddrive_tenants (id),
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,39}$' and code not in ('unknown', 'not_assessed')),
  label text not null check (length(btrim(label)) between 2 and 120),
  asset_class text not null default 'any' check (asset_class in ('any', 'building', 'road', 'bridge', 'utility', 'facility', 'land')),
  definition text not null check (length(btrim(definition)) >= 10),
  approval_basis text not null check (length(btrim(approval_basis)) >= 5),   -- e.g. "CDRRMC Resolution 2026-14"
  active boolean not null default true,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  primary key (tenant_id, code)
);

-- ─── 3. Helpers ──────────────────────────────────────────────────────────────
-- unknown and not_assessed are always valid: absence of evidence is not evidence of no damage (spec §3.1).
create or replace function public.ddrive_rm_code_ok(p_tenant uuid, p_code text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p_code is null or p_code in ('unknown', 'not_assessed')
      or exists (select 1 from public.ddrive_rm_condition_codes where tenant_id = p_tenant and code = p_code and active)
$$;

-- Who may read a published version, by its audience.
create or replace function public.ddrive_rm_audience_ok(p_tenant uuid, p_audience text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select case p_audience
    when 'internal_eoc' then public.ddrive_has_role(p_tenant, 'responder')
    when 'partner_restricted' then public.ddrive_is_member(p_tenant)
    when 'public_approved' then public.ddrive_is_member(p_tenant)
    else false end
$$;

create or replace function public.ddrive_rm_version_visible(p_version text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.ddrive_rm_product_versions v
    where v.id = p_version
      and (public.ddrive_has_role(v.tenant_id, 'analyst')
           or (v.published_at is not null and public.ddrive_rm_audience_ok(v.tenant_id, v.published_audience))))
$$;

create or replace function public.ddrive_rm_stepping()
returns boolean
language sql stable
set search_path = public, pg_temp
as $$
  -- Inside the security definer step functions current_user is the table owner, not a user role (ADR-003).
  select current_user not in ('authenticated', 'anon')
$$;

-- ─── 4. Guards ───────────────────────────────────────────────────────────────
create or replace function public.ddrive_rm_activation_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  if public.ddrive_is_admin_context() then return new; end if;

  if tg_op = 'INSERT' or new.incident_id is distinct from old.incident_id then
    select tenant_id into v_tenant from public.ddrive_incidents where id = new.incident_id;
    if v_tenant is distinct from new.tenant_id then
      raise exception 'Choose an incident from your organisation.' using errcode = '42501';
    end if;
  end if;
  if new.aa_case_id is not null and (tg_op = 'INSERT' or new.aa_case_id is distinct from old.aa_case_id) then
    select tenant_id into v_tenant from public.ddrive_aa_cases where id = new.aa_case_id;
    if v_tenant is distinct from new.tenant_id then
      raise exception 'Choose an anticipatory action case from your organisation.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.activated_at := null; new.activated_by := null;
    new.closed_at := null; new.closed_by := null; new.close_reason := null;
    return new;
  end if;

  if public.ddrive_rm_stepping() then return new; end if;
  if old.status in ('closed', 'cancelled') then
    raise exception 'This mapping activation is closed and can no longer be changed.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status
     or new.activated_at is distinct from old.activated_at or new.activated_by is distinct from old.activated_by
     or new.closed_at is distinct from old.closed_at or new.closed_by is distinct from old.closed_by
     or new.close_reason is distinct from old.close_reason then
    raise exception 'Use the activation''s steps (activate, hold, close, cancel) to change its status.' using errcode = '42501';
  end if;
  if old.status <> 'draft' and new.incident_id is distinct from old.incident_id then
    raise exception 'An active mapping activation cannot be moved to another incident.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_rm_aoi_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_rm_activations;
  gi record;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into a from public.ddrive_rm_activations where id = new.activation_id;
  if a.id is null or a.tenant_id is distinct from new.tenant_id then
    raise exception 'The area of interest must belong to a mapping activation in your organisation.' using errcode = '42501';
  end if;
  if a.status in ('closed', 'cancelled') and not public.ddrive_rm_stepping() then
    raise exception 'This mapping activation is closed.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.activation_id is distinct from old.activation_id then
    raise exception 'An area of interest cannot be moved to another activation.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' or new.geometry is distinct from old.geometry then
    if new.geometry ->> 'type' = 'Polygon' then
      new.geometry := jsonb_build_object('type', 'MultiPolygon', 'coordinates', jsonb_build_array(new.geometry -> 'coordinates'));
    end if;
    select * into gi from public.ddrive_rm_geom_inspect(new.geometry, array['MultiPolygon']);
    if gi.problem is not null then
      raise exception 'Area of interest boundary: %', gi.problem using errcode = '22023';
    end if;
    new.min_lon := gi.min_lon; new.min_lat := gi.min_lat; new.max_lon := gi.max_lon; new.max_lat := gi.max_lat;
  else
    new.min_lon := old.min_lon; new.min_lat := old.min_lat; new.max_lon := old.max_lon; new.max_lat := old.max_lat;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.current_version := 1;
    new.geometry_by := auth.uid();
    new.submitted_by := null; new.submitted_at := null; new.approved_by := null; new.approved_at := null; new.return_note := null;
    new.change_reason := coalesce(nullif(btrim(new.change_reason), ''), 'Initial boundary');
    return new;
  end if;

  if public.ddrive_rm_stepping() then return new; end if;
  if old.status = 'retired' then
    raise exception 'This area of interest is retired and can no longer be changed.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status or new.current_version is distinct from old.current_version
     or new.geometry_by is distinct from old.geometry_by
     or new.submitted_by is distinct from old.submitted_by or new.submitted_at is distinct from old.submitted_at
     or new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at
     or new.return_note is distinct from old.return_note then
    raise exception 'Use the area''s steps (submit, approve, return, reopen, retire) to change its status.' using errcode = '42501';
  end if;
  if old.status <> 'draft' and (new.geometry is distinct from old.geometry or new.name is distinct from old.name
                                or new.aoi_type is distinct from old.aoi_type or new.psgc_code is distinct from old.psgc_code) then
    raise exception 'Only a draft area of interest can be edited. Reopen it first; the approved boundary stays in its history.' using errcode = '42501';
  end if;
  if new.geometry is distinct from old.geometry then
    if length(btrim(coalesce(new.change_reason, ''))) < 3 then
      raise exception 'Say why the boundary changed.' using errcode = '22023';
    end if;
    new.current_version := old.current_version + 1;
    new.geometry_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Every boundary is kept: a new version row on creation and on each geometry change.
create or replace function public.ddrive_rm_aoi_history()
returns trigger
language plpgsql
security definer  -- writes the history table, which users cannot write to
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.geometry is distinct from old.geometry then
    insert into public.ddrive_rm_aoi_versions (tenant_id, aoi_id, version_no, geometry, change_reason, created_by)
    values (new.tenant_id, new.id, new.current_version, new.geometry, new.change_reason, auth.uid())
    on conflict (aoi_id, version_no) do nothing;
  end if;
  return null;
end;
$$;

create or replace function public.ddrive_rm_latest_version(p_product text)
returns public.ddrive_rm_product_versions
language sql stable
set search_path = public, pg_temp
as $$
  select * from public.ddrive_rm_product_versions where product_id = p_product order by version_no desc limit 1
$$;

create or replace function public.ddrive_rm_product_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_rm_activations;
  v_aoi_act text;
  lv public.ddrive_rm_product_versions;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into a from public.ddrive_rm_activations where id = new.activation_id;
  if a.id is null or a.tenant_id is distinct from new.tenant_id then
    raise exception 'The product must belong to a mapping activation in your organisation.' using errcode = '42501';
  end if;
  if new.aoi_id is not null and (tg_op = 'INSERT' or new.aoi_id is distinct from old.aoi_id) then
    select activation_id into v_aoi_act from public.ddrive_rm_aois where id = new.aoi_id;
    if v_aoi_act is distinct from new.activation_id then
      raise exception 'Choose an area of interest from the same activation.' using errcode = '22023';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if a.status in ('closed', 'cancelled') then
      raise exception 'This mapping activation is closed.' using errcode = '42501';
    end if;
    new.status := 'draft'; new.current_version := 1; new.published_version := null; new.audience := null;
    new.archived_at := null; new.archived_by := null; new.archive_reason := null;
    return new;
  end if;

  if public.ddrive_rm_stepping() then return new; end if;
  if new.activation_id is distinct from old.activation_id or new.product_type is distinct from old.product_type then
    raise exception 'A product''s activation and type cannot be changed. Create a new product instead.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status or new.current_version is distinct from old.current_version
     or new.published_version is distinct from old.published_version or new.audience is distinct from old.audience
     or new.archived_at is distinct from old.archived_at or new.archived_by is distinct from old.archived_by
     or new.archive_reason is distinct from old.archive_reason then
    raise exception 'Use the product''s steps (submit, review, verify, publish, new version, archive) to change its status.' using errcode = '42501';
  end if;
  if old.archived_at is not null or a.status in ('closed', 'cancelled') then
    raise exception 'This product is archived or its activation is closed.' using errcode = '42501';
  end if;
  lv := public.ddrive_rm_latest_version(old.id);
  if lv.status <> 'draft' then
    raise exception 'The product''s details can be edited only while its latest version is a draft. Start a new version first.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Version 1 is created with the product.
create or replace function public.ddrive_rm_product_after()
returns trigger
language plpgsql
security definer  -- creates the first version, which users cannot insert directly
set search_path = public, pg_temp
as $$
begin
  insert into public.ddrive_rm_product_versions (tenant_id, product_id, version_no, status)
  values (new.tenant_id, new.id, 1, 'draft');
  return null;
end;
$$;

create or replace function public.ddrive_rm_version_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() or public.ddrive_rm_stepping() then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'Versions are created by the product''s steps.' using errcode = '42501';
  end if;
  if old.status <> 'draft' then
    raise exception 'Only a draft version can be edited. Submitted, reviewed and published versions are frozen.' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['data_cutoff_at', 'change_summary', 'updated_at', 'updated_by', 'version'])
     <> (to_jsonb(old) - array['data_cutoff_at', 'change_summary', 'updated_at', 'updated_by', 'version']) then
    raise exception 'Only the information cut-off and change summary of a draft version can be edited.' using errcode = '42501';
  end if;
  if new.data_cutoff_at > now() + interval '5 minutes' then
    raise exception 'The information cut-off cannot be in the future.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_rm_layer_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions;
begin
  if public.ddrive_is_admin_context() then return coalesce(new, old); end if;
  select * into v from public.ddrive_rm_product_versions where id = coalesce(new.version_id, old.version_id);
  if v.id is null or v.tenant_id is distinct from coalesce(new.tenant_id, old.tenant_id) then
    raise exception 'The layer must belong to a product version in your organisation.' using errcode = '42501';
  end if;
  if public.ddrive_rm_stepping() then return coalesce(new, old); end if;
  if v.status <> 'draft' then
    raise exception 'Layers can be added, changed or removed only on a draft version.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' and new.version_id is distinct from old.version_id then
    raise exception 'A layer cannot be moved to another version.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.feature_count := 0; new.geometry_type := null;
    new.min_lon := null; new.min_lat := null; new.max_lon := null; new.max_lat := null;
  else
    new.feature_count := old.feature_count; new.geometry_type := old.geometry_type;
    new.min_lon := old.min_lon; new.min_lat := old.min_lat; new.max_lon := old.max_lon; new.max_lat := old.max_lat;
  end if;
  if new.source_acquired_at > now() + interval '5 minutes' then
    raise exception 'The source acquisition time cannot be in the future.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_rm_observation_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_rm_activations;
  gi record;
  v_aoi_act text;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if tg_op = 'UPDATE' then
    if public.ddrive_rm_stepping() then return new; end if;
    raise exception 'A submitted observation cannot be edited. Send a new observation to correct it.' using errcode = '42501';
  end if;
  select * into a from public.ddrive_rm_activations where id = new.activation_id;
  if a.id is null or a.tenant_id is distinct from new.tenant_id then
    raise exception 'The observation must belong to a mapping activation in your organisation.' using errcode = '42501';
  end if;
  if a.status <> 'active' then
    raise exception 'Field observations can be sent only while the mapping activation is active.' using errcode = '42501';
  end if;
  if new.aoi_id is not null then
    select activation_id into v_aoi_act from public.ddrive_rm_aois where id = new.aoi_id;
    if v_aoi_act is distinct from new.activation_id then
      raise exception 'Choose an area of interest from the same activation.' using errcode = '22023';
    end if;
  end if;
  select * into gi from public.ddrive_rm_geom_inspect(new.geometry, null);
  if gi.problem is not null then raise exception 'Observation location: %', gi.problem using errcode = '22023'; end if;
  new.min_lon := gi.min_lon; new.min_lat := gi.min_lat; new.max_lon := gi.max_lon; new.max_lat := gi.max_lat;
  if new.observed_at > now() + interval '5 minutes' then
    raise exception 'The observation time cannot be in the future.' using errcode = '22023';
  end if;
  if not public.ddrive_rm_code_ok(new.tenant_id, new.condition_code) then
    raise exception 'Condition "%" is not in your organisation''s approved list. Use unknown or not_assessed.', new.condition_code using errcode = '22023';
  end if;
  if new.access_status is not null and new.observation_type <> 'road_access' then
    raise exception 'Access status applies only to road access observations.' using errcode = '22023';
  end if;
  new.submitted_at := now();   -- server receipt time; observed_at keeps the device's time
  new.verification_status := 'submitted';
  new.triage_note := null; new.triaged_by := null; new.triaged_at := null;
  return new;
end;
$$;

create or replace function public.ddrive_rm_link_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions;
  v_tenant uuid;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into v from public.ddrive_rm_product_versions where id = new.version_id;
  if v.id is null or v.tenant_id is distinct from new.tenant_id then
    raise exception 'Choose a product version from your organisation.' using errcode = '42501';
  end if;
  if v.published_at is null then
    raise exception 'Only a published product version can be linked to other records.' using errcode = '22023';
  end if;
  v_tenant := case new.target_module
    when 'incident' then (select tenant_id from public.ddrive_incidents where id = new.target_id)
    when 'aa_case' then (select tenant_id from public.ddrive_aa_cases where id = new.target_id)
    when 'document' then (select tenant_id from public.ddrive_documents where id = new.target_id)
    when 'plan' then (select tenant_id from public.ddrive_plans where id = new.target_id)
  end;
  if v_tenant is distinct from new.tenant_id then
    raise exception 'The linked record was not found in your organisation.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ─── 5. Product status follows its latest version ────────────────────────────
create or replace function public.ddrive_rm_sync_product(p_product text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  lv public.ddrive_rm_product_versions := public.ddrive_rm_latest_version(p_product);
begin
  update public.ddrive_rm_products p
     set status = case when p.archived_at is not null then 'archived' else lv.status end,
         current_version = lv.version_no,
         published_version = (select max(version_no) from public.ddrive_rm_product_versions
                               where product_id = p_product and status = 'published'),
         audience = coalesce((select published_audience from public.ddrive_rm_product_versions
                               where product_id = p_product and status = 'published'), p.audience)
   where p.id = p_product;
end;
$$;

-- Recomputes a layer's feature count, geometry type and extent.
create or replace function public.ddrive_rm_refresh_layer(p_layer text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.ddrive_rm_layers l set
    feature_count = s.n,
    geometry_type = case when s.types is null then null when array_length(s.types, 1) = 1 then s.types[1] else 'mixed' end,
    min_lon = s.min_lon, min_lat = s.min_lat, max_lon = s.max_lon, max_lat = s.max_lat
  from (
    select count(*)::int as n, array_agg(distinct geometry ->> 'type') filter (where geometry is not null) as types,
           min(f.min_lon) as min_lon, min(f.min_lat) as min_lat, max(f.max_lon) as max_lon, max(f.max_lat) as max_lat
    from public.ddrive_rm_features f where f.layer_id = p_layer
  ) s
  where l.id = p_layer;
end;
$$;

-- ─── 6. Step functions: activations ──────────────────────────────────────────
create or replace function public.ddrive_rm_set_activation_status(p_activation text, p_status text, p_note text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_rm_activations;
begin
  select * into a from public.ddrive_rm_activations where id = p_activation for update;
  if a.id is null or not public.ddrive_is_member(a.tenant_id) then
    raise exception 'No such mapping activation.' using errcode = '42501';
  end if;
  if not public.ddrive_has_role(a.tenant_id, 'drrm_officer') then
    raise exception 'Only a DRRM officer or administrator can activate, hold, close or cancel a mapping activation.' using errcode = '42501';
  end if;
  if not ((a.status = 'draft' and p_status in ('active', 'cancelled'))
          or (a.status = 'active' and p_status in ('on_hold', 'closed', 'cancelled'))
          or (a.status = 'on_hold' and p_status in ('active', 'closed', 'cancelled'))) then
    raise exception 'A % activation cannot be set to %.', a.status, p_status using errcode = '22023';
  end if;
  if p_status = 'active' and a.status = 'draft' and length(btrim(coalesce(a.operational_objective, ''))) < 10 then
    raise exception 'State the operational question this mapping must answer before activating it.' using errcode = '22023';
  end if;
  if p_status in ('closed', 'cancelled') then
    if length(btrim(coalesce(p_note, ''))) < 10 then
      raise exception 'Give the reason for closing or cancelling.' using errcode = '22023';
    end if;
    if p_status = 'closed' and exists (
      select 1 from public.ddrive_rm_product_versions v join public.ddrive_rm_products p on p.id = v.product_id
      where p.activation_id = a.id and p.archived_at is null and v.status in ('draft', 'processing', 'under_review')) then
      raise exception 'Resolve the drafts and reviews first: submit, publish or archive every product.' using errcode = '22023';
    end if;
  end if;
  update public.ddrive_rm_activations
     set status = p_status,
         activated_at = case when p_status = 'active' and activated_at is null then now() else activated_at end,
         activated_by = case when p_status = 'active' and activated_by is null then auth.uid() else activated_by end,
         closed_at = case when p_status in ('closed', 'cancelled') then now() else closed_at end,
         closed_by = case when p_status in ('closed', 'cancelled') then auth.uid() else closed_by end,
         close_reason = case when p_status in ('closed', 'cancelled') then btrim(p_note) else close_reason end
   where id = a.id;
  return p_status;
end;
$$;

-- ─── 7. Step functions: areas of interest ────────────────────────────────────
create or replace function public.ddrive_rm_aoi_step(p_aoi text, p_action text, p_note text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  o public.ddrive_rm_aois;
  a public.ddrive_rm_activations;
  v_new text;
begin
  select * into o from public.ddrive_rm_aois where id = p_aoi for update;
  if o.id is null or not public.ddrive_is_member(o.tenant_id) then
    raise exception 'No such area of interest.' using errcode = '42501';
  end if;
  select * into a from public.ddrive_rm_activations where id = o.activation_id;
  if a.status in ('closed', 'cancelled') then raise exception 'This mapping activation is closed.' using errcode = '42501'; end if;

  if p_action in ('submit', 'reopen') then
    if not public.ddrive_has_role(o.tenant_id, 'analyst') then
      raise exception 'Only an analyst or higher can submit or reopen an area of interest.' using errcode = '42501';
    end if;
  elsif not public.ddrive_has_role(o.tenant_id, 'drrm_officer') then
    raise exception 'Only a DRRM officer or administrator can approve, return or retire an area of interest.' using errcode = '42501';
  end if;

  if p_action = 'submit' and o.status = 'draft' then
    update public.ddrive_rm_aois set status = 'submitted', submitted_by = auth.uid(), submitted_at = now(), return_note = null where id = o.id;
    v_new := 'submitted';
  elsif p_action = 'approve' and o.status = 'submitted' then
    if o.geometry_by = auth.uid() then
      raise exception 'You drew this boundary, so another DRRM officer must approve it.' using errcode = '42501';
    end if;
    update public.ddrive_rm_aois set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = o.id;
    v_new := 'approved';
  elsif p_action = 'return' and o.status = 'submitted' then
    if length(btrim(coalesce(p_note, ''))) < 10 then raise exception 'Say what needs to change.' using errcode = '22023'; end if;
    update public.ddrive_rm_aois set status = 'draft', return_note = btrim(p_note), submitted_by = null, submitted_at = null where id = o.id;
    v_new := 'draft';
  elsif p_action = 'reopen' and o.status = 'approved' then
    if length(btrim(coalesce(p_note, ''))) < 10 then raise exception 'Say why the approved boundary needs to change.' using errcode = '22023'; end if;
    update public.ddrive_rm_aois set status = 'draft', approved_by = null, approved_at = null, change_reason = btrim(p_note) where id = o.id;
    v_new := 'draft';
  elsif p_action = 'retire' and o.status in ('draft', 'submitted', 'approved') then
    update public.ddrive_rm_aois set status = 'retired' where id = o.id;
    v_new := 'retired';
  else
    raise exception 'A % area of interest cannot be %.', o.status,
      case p_action when 'submit' then 'submitted' when 'approve' then 'approved' when 'return' then 'returned'
                    when 'reopen' then 'reopened' when 'retire' then 'retired' else p_action end using errcode = '22023';
  end if;
  return v_new;
end;
$$;

-- ─── 8. Step functions: products and versions ────────────────────────────────
-- The version, locked, after checking the caller is a member with at least the given role.
create or replace function public.ddrive_rm_step_version(p_version text, p_min public.ddrive_role)
returns public.ddrive_rm_product_versions
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions;
  p public.ddrive_rm_products;
  a public.ddrive_rm_activations;
begin
  select * into v from public.ddrive_rm_product_versions where id = p_version for update;
  if v.id is null or not public.ddrive_is_member(v.tenant_id) then
    raise exception 'No such product version.' using errcode = '42501';
  end if;
  if not public.ddrive_has_role(v.tenant_id, p_min) then
    raise exception 'Your role cannot take this step. It needs the % role or higher.', p_min using errcode = '42501';
  end if;
  select * into p from public.ddrive_rm_products where id = v.product_id for update;
  if p.archived_at is not null then raise exception 'This product is archived.' using errcode = '42501'; end if;
  select * into a from public.ddrive_rm_activations where id = p.activation_id;
  if a.status in ('closed', 'cancelled') then raise exception 'This mapping activation is closed.' using errcode = '42501'; end if;
  return v;
end;
$$;

-- Submit the exact draft version for review. The product's metadata and the layers' sources are frozen into it.
create or replace function public.ddrive_rm_submit_version(p_version text)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_rm_step_version)
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions := public.ddrive_rm_step_version(p_version, 'analyst');
  p public.ddrive_rm_products;
  o public.ddrive_rm_aois;
  missing text[] := '{}';
begin
  select * into p from public.ddrive_rm_products where id = v.product_id;
  if v.status <> 'draft' then raise exception 'Only a draft version can be submitted for review.' using errcode = '22023'; end if;
  if length(btrim(coalesce(p.methodology, ''))) < 10 then missing := missing || 'methodology'::text; end if;
  if length(btrim(coalesce(p.limitations, ''))) < 10 then missing := missing || 'limitations'::text; end if;
  if v.data_cutoff_at is null then missing := missing || 'information cut-off'::text; end if;
  if not exists (select 1 from public.ddrive_rm_layers where version_id = v.id and feature_count > 0) then
    missing := missing || 'at least one layer with features'::text;
  end if;
  if v.version_no > 1 and length(btrim(coalesce(v.change_summary, ''))) < 10 then missing := missing || 'change summary'::text; end if;
  if array_length(missing, 1) > 0 then
    raise exception 'Before review, add: %.', array_to_string(missing, ', ') using errcode = '22023';
  end if;
  if p.aoi_id is not null then
    select * into o from public.ddrive_rm_aois where id = p.aoi_id;
    if o.status <> 'approved' then
      raise exception 'The product''s area of interest must be approved first.' using errcode = '22023';
    end if;
  end if;
  update public.ddrive_rm_product_versions set
    status = 'under_review', submitted_by = auth.uid(), submitted_at = now(),
    title_snapshot = p.title, summary_snapshot = p.summary, methodology_snapshot = p.methodology,
    limitations_snapshot = p.limitations, confidence_snapshot = p.confidence,
    aoi_id = p.aoi_id, aoi_version_no = o.current_version,
    source_manifest = coalesce((
      select jsonb_agg(jsonb_build_object(
        'layer', l.name, 'role', l.layer_role, 'source_type', l.source_type, 'source_name', l.source_name,
        'acquired_at', l.source_acquired_at, 'reference', l.source_reference, 'file', l.source_file_name,
        'format', l.source_format, 'sha256', l.source_checksum, 'crs', l.source_crs, 'features', l.feature_count) order by l.created_at)
      from public.ddrive_rm_layers l where l.version_id = v.id), '[]'::jsonb)
  where id = v.id;
  perform public.ddrive_rm_sync_product(v.product_id);
  return 'under_review';
end;
$$;

create or replace function public.ddrive_rm_review_version(p_version text, p_decision text, p_comments text default null,
                                                           p_needs_field_verification boolean default false)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_rm_step_version)
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions := public.ddrive_rm_step_version(p_version, 'analyst');
  v_new text;
begin
  if v.status <> 'under_review' then raise exception 'This version is not waiting for review.' using errcode = '22023'; end if;
  if v.submitted_by = auth.uid() then
    raise exception 'You submitted this version, so someone else must review it.' using errcode = '42501';
  end if;
  if p_decision not in ('accept', 'return', 'reject') then
    raise exception 'Choose accept, return or reject.' using errcode = '22023';
  end if;
  if p_decision in ('return', 'reject') and length(btrim(coalesce(p_comments, ''))) < 10 then
    raise exception 'Explain what needs to change, or why it is rejected.' using errcode = '22023';
  end if;
  v_new := case p_decision
    when 'accept' then case when p_needs_field_verification then 'for_field_verification' else 'preliminary' end
    when 'return' then 'draft'
    else 'rejected' end;
  insert into public.ddrive_rm_reviews (tenant_id, product_id, version_id, reviewer_id, decision, needs_field_verification, comments)
  values (v.tenant_id, v.product_id, v.id, auth.uid(), p_decision, coalesce(p_needs_field_verification, false), nullif(btrim(coalesce(p_comments, '')), ''));
  update public.ddrive_rm_product_versions
     set status = v_new,
         submitted_by = case when v_new = 'draft' then null else submitted_by end,
         submitted_at = case when v_new = 'draft' then null else submitted_at end
   where id = v.id;
  perform public.ddrive_rm_sync_product(v.product_id);
  return v_new;
end;
$$;

create or replace function public.ddrive_rm_verify_version(p_version text, p_note text)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_rm_step_version)
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions := public.ddrive_rm_step_version(p_version, 'drrm_officer');
begin
  if v.status not in ('preliminary', 'for_field_verification') then
    raise exception 'Only a reviewed (accepted) version can be verified.' using errcode = '22023';
  end if;
  if v.submitted_by = auth.uid() then
    raise exception 'You submitted this version, so another DRRM officer must verify it.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 10 then
    raise exception 'Record what was verified and how (for example the field checks done).' using errcode = '22023';
  end if;
  update public.ddrive_rm_product_versions
     set status = 'verified', verified_by = auth.uid(), verified_at = now(), verification_note = btrim(p_note)
   where id = v.id;
  update public.ddrive_rm_features f set verification_status = 'verified'
   from public.ddrive_rm_layers l where l.id = f.layer_id and l.version_id = v.id and f.verification_status = 'field_checked';
  perform public.ddrive_rm_sync_product(v.product_id);
  return 'verified';
end;
$$;

create or replace function public.ddrive_rm_publish_version(p_version text, p_audience text, p_note text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_rm_step_version)
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions := public.ddrive_rm_step_version(p_version, 'drrm_officer');
  v_level text;
begin
  if v.status not in ('preliminary', 'for_field_verification', 'verified') then
    raise exception 'Only a reviewed (accepted) or verified version can be published.' using errcode = '22023';
  end if;
  if v.submitted_by = auth.uid() then
    raise exception 'You submitted this version, so another DRRM officer must publish it.' using errcode = '42501';
  end if;
  if p_audience not in ('internal_eoc', 'partner_restricted', 'public_approved') then
    raise exception 'Choose an audience.' using errcode = '22023';
  end if;
  v_level := case when v.status = 'verified' then 'verified' else 'preliminary' end;
  if v_level = 'preliminary' and p_audience <> 'internal_eoc' then
    raise exception 'A preliminary (unverified) product can be published only to the internal EOC audience. Verify it first.' using errcode = '22023';
  end if;
  if p_audience = 'public_approved' and not public.ddrive_has_role(v.tenant_id, 'tenant_admin') then
    raise exception 'Only an administrator can approve a product for public release.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(v.title_snapshot, ''))) < 3 or length(btrim(coalesce(v.methodology_snapshot, ''))) < 10
     or length(btrim(coalesce(v.limitations_snapshot, ''))) < 10 or v.confidence_snapshot is null or v.data_cutoff_at is null then
    raise exception 'The version is missing its title, methodology, limitations, confidence or information cut-off.' using errcode = '22023';
  end if;
  -- The previously published version stays readable, marked superseded.
  update public.ddrive_rm_product_versions set status = 'superseded', superseded_at = now()
   where product_id = v.product_id and status = 'published' and id <> v.id;
  update public.ddrive_rm_product_versions
     set status = 'published', published_by = auth.uid(), published_at = now(), published_audience = p_audience,
         publication_level = v_level, publication_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = v.id;
  perform public.ddrive_rm_sync_product(v.product_id);
  return 'published';
end;
$$;

-- Start a new version from the latest one (its layers and features are copied). Corrections never edit a frozen version.
create or replace function public.ddrive_rm_new_version(p_product text, p_change_summary text)
returns text
language plpgsql
security definer  -- checks membership and role itself (ddrive_rm_step_version)
set search_path = public, pg_temp
as $$
declare
  lv public.ddrive_rm_product_versions := public.ddrive_rm_latest_version(p_product);
  v public.ddrive_rm_product_versions;
  v_new text;
  l record;
  v_layer text;
begin
  if lv.id is null then raise exception 'No such product.' using errcode = '42501'; end if;
  v := public.ddrive_rm_step_version(lv.id, 'analyst');
  if v.status in ('draft', 'processing', 'under_review') then
    raise exception 'The latest version is still a draft or under review. Finish it first.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_change_summary, ''))) < 10 then
    raise exception 'Summarise what will change in the new version.' using errcode = '22023';
  end if;
  -- Accepted or verified versions that were never published are replaced by the new one.
  update public.ddrive_rm_product_versions set status = 'superseded', superseded_at = now()
   where product_id = p_product and status in ('preliminary', 'for_field_verification', 'verified');
  insert into public.ddrive_rm_product_versions (tenant_id, product_id, version_no, status, data_cutoff_at, change_summary)
  values (v.tenant_id, p_product, v.version_no + 1, 'draft', null, btrim(p_change_summary))
  returning id into v_new;
  for l in select * from public.ddrive_rm_layers where version_id = v.id order by created_at loop
    insert into public.ddrive_rm_layers (tenant_id, version_id, name, layer_role, source_type, source_name, source_acquired_at,
                                         source_reference, source_file_name, source_format, source_checksum, source_crs, style)
    values (l.tenant_id, v_new, l.name, l.layer_role, l.source_type, l.source_name, l.source_acquired_at,
            l.source_reference, l.source_file_name, l.source_format, l.source_checksum, l.source_crs, l.style)
    returning id into v_layer;
    insert into public.ddrive_rm_features (tenant_id, layer_id, external_feature_id, geometry, min_lon, min_lat, max_lon, max_lat,
                                           properties, observation_id, condition_code, confidence, verification_status, created_by)
    select tenant_id, v_layer, external_feature_id, geometry, min_lon, min_lat, max_lon, max_lat,
           properties, observation_id, condition_code, confidence, verification_status, created_by
    from public.ddrive_rm_features where layer_id = l.id;
    perform public.ddrive_rm_refresh_layer(v_layer);
  end loop;
  perform public.ddrive_rm_sync_product(p_product);
  return v_new;
end;
$$;

create or replace function public.ddrive_rm_archive_product(p_product text, p_reason text)
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  p public.ddrive_rm_products;
begin
  select * into p from public.ddrive_rm_products where id = p_product for update;
  if p.id is null or not public.ddrive_is_member(p.tenant_id) then raise exception 'No such product.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(p.tenant_id, 'drrm_officer') then
    raise exception 'Only a DRRM officer or administrator can archive a product.' using errcode = '42501';
  end if;
  if p.archived_at is not null then raise exception 'This product is already archived.' using errcode = '22023'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then raise exception 'Give the reason for archiving.' using errcode = '22023'; end if;
  -- Unfinished versions are rejected; published versions stay readable.
  update public.ddrive_rm_product_versions set status = 'rejected'
   where product_id = p_product and status in ('draft', 'processing', 'under_review');
  update public.ddrive_rm_products set archived_at = now(), archived_by = auth.uid(), archive_reason = btrim(p_reason) where id = p_product;
  perform public.ddrive_rm_sync_product(p_product);
  return 'archived';
end;
$$;

-- ─── 9. Step functions: features and observations ────────────────────────────
-- Adds validated GeoJSON features to a draft layer. All or nothing: one bad feature refuses the batch, naming it.
create or replace function public.ddrive_rm_add_features(p_layer text, p_features jsonb, p_confidence text default 'not_assessed')
returns int
language plpgsql
security definer  -- checks membership, role and version status itself
set search_path = public, pg_temp
as $$
declare
  l public.ddrive_rm_layers;
  v public.ddrive_rm_product_versions;
  f jsonb;
  i int := 0;
  gi record;
  props jsonb;
begin
  select * into l from public.ddrive_rm_layers where id = p_layer for update;
  if l.id is null then raise exception 'No such layer.' using errcode = '42501'; end if;
  v := public.ddrive_rm_step_version(l.version_id, 'analyst');
  if v.status <> 'draft' then raise exception 'Features can be added only to a draft version.' using errcode = '42501'; end if;
  if p_features is null or jsonb_typeof(p_features) <> 'array' then
    raise exception 'Send the features as a list.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_features) > 5000 then
    raise exception 'Send at most 5,000 features at a time.' using errcode = '54000';
  end if;
  if l.feature_count + jsonb_array_length(p_features) > 20000 then
    raise exception 'A layer holds at most 20,000 features. Split the data into several layers, or wait for the processing service.' using errcode = '54000';
  end if;
  if p_confidence not in ('low', 'moderate', 'high', 'not_assessed') then
    raise exception 'Unknown confidence level.' using errcode = '22023';
  end if;
  for f in select value from jsonb_array_elements(p_features) loop
    i := i + 1;
    if jsonb_typeof(f) <> 'object' or f ->> 'type' <> 'Feature' then
      raise exception 'Feature %: not a GeoJSON Feature.', i using errcode = '22023';
    end if;
    select * into gi from public.ddrive_rm_geom_inspect(f -> 'geometry', null);
    if gi.problem is not null then raise exception 'Feature %: %', i, gi.problem using errcode = '22023'; end if;
    props := coalesce(f -> 'properties', '{}'::jsonb);
    if jsonb_typeof(props) = 'null' then props := '{}'::jsonb; end if;
    if jsonb_typeof(props) <> 'object' then raise exception 'Feature %: properties must be an object.', i using errcode = '22023'; end if;
    if pg_column_size(props) > 8000 then raise exception 'Feature %: properties are too large (over 8 kB).', i using errcode = '54000'; end if;
    if not public.ddrive_rm_code_ok(l.tenant_id, props ->> 'condition_code') then
      raise exception 'Feature %: condition "%" is not in your organisation''s approved list.', i, props ->> 'condition_code' using errcode = '22023';
    end if;
    insert into public.ddrive_rm_features (tenant_id, layer_id, external_feature_id, geometry, min_lon, min_lat, max_lon, max_lat,
                                           properties, condition_code, confidence, created_by)
    values (l.tenant_id, l.id, left(f ->> 'id', 200), f -> 'geometry', gi.min_lon, gi.min_lat, gi.max_lon, gi.max_lat,
            props, props ->> 'condition_code', p_confidence, auth.uid());
  end loop;
  perform public.ddrive_rm_refresh_layer(l.id);
  return i;
end;
$$;

-- Builds a layer from the activation's field observations, keeping the link from each feature to its observation.
create or replace function public.ddrive_rm_layer_from_observations(p_version text, p_name text, p_include_triaged boolean default false)
returns text
language plpgsql
security definer  -- checks membership, role and version status itself
set search_path = public, pg_temp
as $$
declare
  v public.ddrive_rm_product_versions := public.ddrive_rm_step_version(p_version, 'analyst');
  p public.ddrive_rm_products;
  v_layer text;
begin
  if v.status <> 'draft' then raise exception 'Layers can be added only to a draft version.' using errcode = '42501'; end if;
  select * into p from public.ddrive_rm_products where id = v.product_id;
  if not exists (select 1 from public.ddrive_rm_observations where activation_id = p.activation_id
                 and (verification_status = 'field_verified' or (p_include_triaged and verification_status = 'triaged'))) then
    raise exception 'There are no field-verified observations to use yet.' using errcode = '22023';
  end if;
  insert into public.ddrive_rm_layers (tenant_id, version_id, name, layer_role, source_type, source_name, source_acquired_at, source_format)
  values (v.tenant_id, v.id, coalesce(nullif(btrim(p_name), ''), 'Field observations'), 'observed', 'field',
          'DDRiVE-M field observations', (select max(observed_at) from public.ddrive_rm_observations where activation_id = p.activation_id),
          'observations')
  returning id into v_layer;
  insert into public.ddrive_rm_features (tenant_id, layer_id, external_feature_id, geometry, min_lon, min_lat, max_lon, max_lat,
                                         properties, observation_id, condition_code, confidence, verification_status, created_by)
  select o.tenant_id, v_layer, o.id, o.geometry, o.min_lon, o.min_lat, o.max_lon, o.max_lat,
         jsonb_strip_nulls(jsonb_build_object('observation_type', o.observation_type, 'description', o.description,
                                              'observed_at', o.observed_at, 'access_status', o.access_status,
                                              'condition_code', o.condition_code, 'evidence_ref', o.evidence_ref)),
         o.id, o.condition_code, o.confidence,
         case when o.verification_status = 'field_verified' then 'field_checked' else 'unverified' end, auth.uid()
  from public.ddrive_rm_observations o
  where o.activation_id = p.activation_id
    and (o.verification_status = 'field_verified' or (p_include_triaged and o.verification_status = 'triaged'));
  perform public.ddrive_rm_refresh_layer(v_layer);
  return v_layer;
end;
$$;

create or replace function public.ddrive_rm_triage_observation(p_observation text, p_status text, p_note text default null)
returns text
language plpgsql
security definer  -- checks membership and role itself
set search_path = public, pg_temp
as $$
declare
  o public.ddrive_rm_observations;
begin
  select * into o from public.ddrive_rm_observations where id = p_observation for update;
  if o.id is null or not public.ddrive_is_member(o.tenant_id) then raise exception 'No such observation.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(o.tenant_id, 'analyst') then
    raise exception 'Only an analyst or higher can triage or verify observations.' using errcode = '42501';
  end if;
  if p_status not in ('triaged', 'field_verified', 'rejected') then
    raise exception 'Choose triaged, field verified or rejected.' using errcode = '22023';
  end if;
  if o.created_by = auth.uid() and p_status = 'field_verified' then
    raise exception 'You sent this observation, so someone else must verify it.' using errcode = '42501';
  end if;
  if p_status in ('field_verified', 'rejected') and length(btrim(coalesce(p_note, ''))) < 5 then
    raise exception 'Say how it was verified, or why it is rejected.' using errcode = '22023';
  end if;
  update public.ddrive_rm_observations
     set verification_status = p_status, triage_note = nullif(btrim(coalesce(p_note, '')), ''), triaged_by = auth.uid(), triaged_at = now()
   where id = o.id;
  return p_status;
end;
$$;

-- ─── 10. Condition codes are approved by a DRRM officer ──────────────────────
create or replace function public.ddrive_rm_code_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and (new.code is distinct from old.code or new.tenant_id is distinct from old.tenant_id) then
    raise exception 'A condition code cannot be renamed. Deactivate it and add a new one.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ─── 11. Triggers ────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in select * from (values
    ('ddrive_rm_activations', 'M'), ('ddrive_rm_aois', ''), ('ddrive_rm_products', 'MP'), ('ddrive_rm_product_versions', ''),
    ('ddrive_rm_layers', ''), ('ddrive_rm_observations', ''), ('ddrive_rm_product_links', ''), ('ddrive_rm_condition_codes', '')
  ) as t(tbl, prefix) loop
    execute format('drop trigger if exists ddrive_10_touch on public.%I', r.tbl);
    execute format('create trigger ddrive_10_touch before insert or update on public.%I for each row execute function public.ddrive_touch(%L)', r.tbl, r.prefix);
    execute format('drop trigger if exists ddrive_90_audit on public.%I', r.tbl);
    execute format('create trigger ddrive_90_audit after insert or update or delete on public.%I for each row execute function public.ddrive_audit()', r.tbl);
  end loop;
  -- Reviews are written only by the review step; audit them too. Features are high-volume and audited through their layer.
  drop trigger if exists ddrive_90_audit on public.ddrive_rm_reviews;
  create trigger ddrive_90_audit after insert on public.ddrive_rm_reviews for each row execute function public.ddrive_audit();
end $$;

drop trigger if exists ddrive_20_guard on public.ddrive_rm_activations;
create trigger ddrive_20_guard before insert or update on public.ddrive_rm_activations for each row execute function public.ddrive_rm_activation_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_aois;
create trigger ddrive_20_guard before insert or update on public.ddrive_rm_aois for each row execute function public.ddrive_rm_aoi_guard();
drop trigger if exists ddrive_80_history on public.ddrive_rm_aois;
create trigger ddrive_80_history after insert or update on public.ddrive_rm_aois for each row execute function public.ddrive_rm_aoi_history();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_products;
create trigger ddrive_20_guard before insert or update on public.ddrive_rm_products for each row execute function public.ddrive_rm_product_guard();
drop trigger if exists ddrive_80_after on public.ddrive_rm_products;
create trigger ddrive_80_after after insert on public.ddrive_rm_products for each row execute function public.ddrive_rm_product_after();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_product_versions;
create trigger ddrive_20_guard before insert or update on public.ddrive_rm_product_versions for each row execute function public.ddrive_rm_version_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_layers;
create trigger ddrive_20_guard before insert or update or delete on public.ddrive_rm_layers for each row execute function public.ddrive_rm_layer_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_observations;
create trigger ddrive_20_guard before insert or update on public.ddrive_rm_observations for each row execute function public.ddrive_rm_observation_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_product_links;
create trigger ddrive_20_guard before insert on public.ddrive_rm_product_links for each row execute function public.ddrive_rm_link_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_rm_condition_codes;
create trigger ddrive_20_guard before update on public.ddrive_rm_condition_codes for each row execute function public.ddrive_rm_code_guard();

-- ─── 12. Access rules ────────────────────────────────────────────────────────
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['ddrive_rm_activations', 'ddrive_rm_aois', 'ddrive_rm_aoi_versions', 'ddrive_rm_products',
                           'ddrive_rm_product_versions', 'ddrive_rm_layers', 'ddrive_rm_features', 'ddrive_rm_observations',
                           'ddrive_rm_reviews', 'ddrive_rm_product_links', 'ddrive_rm_condition_codes'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Activations: every member follows them; analysts open and edit drafts; DRRM officers take the steps.
create policy rm_activations_select on public.ddrive_rm_activations for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy rm_activations_insert on public.ddrive_rm_activations for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy rm_activations_update on public.ddrive_rm_activations for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

-- AOIs: approved boundaries are visible to everyone (field teams need them); drafts and history to analysts.
create policy rm_aois_select on public.ddrive_rm_aois for select to authenticated
  using (public.ddrive_is_member(tenant_id) and (status in ('approved', 'retired') or public.ddrive_has_role(tenant_id, 'analyst')));
create policy rm_aois_insert on public.ddrive_rm_aois for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy rm_aois_update on public.ddrive_rm_aois for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy rm_aoi_versions_select on public.ddrive_rm_aoi_versions for select to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

-- Products: analysts see all; others see only what has been published to an audience they belong to.
create policy rm_products_select on public.ddrive_rm_products for select to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')
         or exists (select 1 from public.ddrive_rm_product_versions v
                    where v.product_id = ddrive_rm_products.id and v.published_at is not null
                      and public.ddrive_rm_audience_ok(v.tenant_id, v.published_audience)));
create policy rm_products_insert on public.ddrive_rm_products for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy rm_products_update on public.ddrive_rm_products for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

create policy rm_versions_select on public.ddrive_rm_product_versions for select to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')
         or (published_at is not null and public.ddrive_rm_audience_ok(tenant_id, published_audience)));
create policy rm_versions_update on public.ddrive_rm_product_versions for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));

create policy rm_layers_select on public.ddrive_rm_layers for select to authenticated using (public.ddrive_rm_version_visible(version_id));
create policy rm_layers_insert on public.ddrive_rm_layers for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy rm_layers_update on public.ddrive_rm_layers for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy rm_layers_delete on public.ddrive_rm_layers for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

create policy rm_features_select on public.ddrive_rm_features for select to authenticated
  using (public.ddrive_is_member(tenant_id)
         and public.ddrive_rm_version_visible((select l.version_id from public.ddrive_rm_layers l where l.id = layer_id)));

-- Field observations: responders send them; the sender and analysts read them.
create policy rm_observations_select on public.ddrive_rm_observations for select to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst') or (created_by = auth.uid() and public.ddrive_is_member(tenant_id)));
create policy rm_observations_insert on public.ddrive_rm_observations for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'responder'));

create policy rm_reviews_select on public.ddrive_rm_reviews for select to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

create policy rm_links_select on public.ddrive_rm_product_links for select to authenticated using (public.ddrive_rm_version_visible(version_id));
create policy rm_links_insert on public.ddrive_rm_product_links for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));

create policy rm_codes_select on public.ddrive_rm_condition_codes for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy rm_codes_insert on public.ddrive_rm_condition_codes for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'drrm_officer'));
create policy rm_codes_update on public.ddrive_rm_condition_codes for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer')) with check (public.ddrive_has_role(tenant_id, 'drrm_officer'));

grant select, insert, update on public.ddrive_rm_activations, public.ddrive_rm_aois, public.ddrive_rm_products to authenticated;
grant select on public.ddrive_rm_aoi_versions, public.ddrive_rm_features, public.ddrive_rm_reviews to authenticated;
grant select, update (data_cutoff_at, change_summary) on public.ddrive_rm_product_versions to authenticated;
grant select, insert, update, delete on public.ddrive_rm_layers to authenticated;
grant select, insert on public.ddrive_rm_observations, public.ddrive_rm_product_links to authenticated;
grant select, insert, update on public.ddrive_rm_condition_codes to authenticated;

-- Functions: helpers are internal; steps are for signed-in users (each checks the caller's role).
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.ddrive_rm_step_version(text, public.ddrive_role)', 'public.ddrive_rm_sync_product(text)',
    'public.ddrive_rm_refresh_layer(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.ddrive_rm_geom_inspect(jsonb, text[])', 'public.ddrive_rm_code_ok(uuid, text)', 'public.ddrive_rm_audience_ok(uuid, text)',
    'public.ddrive_rm_version_visible(text)', 'public.ddrive_rm_stepping()', 'public.ddrive_rm_latest_version(text)',
    'public.ddrive_rm_set_activation_status(text, text, text)', 'public.ddrive_rm_aoi_step(text, text, text)',
    'public.ddrive_rm_submit_version(text)', 'public.ddrive_rm_review_version(text, text, text, boolean)',
    'public.ddrive_rm_verify_version(text, text)', 'public.ddrive_rm_publish_version(text, text, text)',
    'public.ddrive_rm_new_version(text, text)', 'public.ddrive_rm_archive_product(text, text)',
    'public.ddrive_rm_add_features(text, jsonb, text)', 'public.ddrive_rm_layer_from_observations(text, text, boolean)',
    'public.ddrive_rm_triage_observation(text, text, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
