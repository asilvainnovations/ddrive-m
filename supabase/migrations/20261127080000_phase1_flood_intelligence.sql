-- Phase 1 · Detection: Flood Intelligence (ADR-016).
-- Barangays with their flood hazard (UP NOAH 100-year high-hazard share, for example from Project CCHAIN's
-- project_noah_hazards table) and daily rainfall recorded or forecast for them. The app compares the two
-- with the rule in src/content/flood-rule-v1.json. Nothing here issues a warning (RA 10639; PAGASA warns).
-- Safe to run more than once.

-- ─── Flood areas: one row per barangay the organisation follows ─────────────
create table if not exists public.ddrive_flood_areas (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  adm4_pcode text check (adm4_pcode is null or adm4_pcode ~ '^[A-Za-z0-9]{6,12}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  flood_hazard_pct numeric(5, 2) not null check (flood_hazard_pct between 0 and 100),
  hazard_source text not null check (length(btrim(hazard_source)) between 3 and 300),
  lat double precision check (lat is null or lat between -90 and 90),
  lon double precision check (lon is null or lon between -180 and 180),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_flood_areas_name on public.ddrive_flood_areas (tenant_id, lower(name));
create unique index if not exists ddrive_flood_areas_code on public.ddrive_flood_areas (tenant_id, adm4_pcode) where adm4_pcode is not null;

-- ─── Daily rainfall per area ─────────────────────────────────────────────────
create table if not exists public.ddrive_rainfall (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  area_id text not null references public.ddrive_flood_areas (id) on delete cascade,
  obs_date date not null,
  rain_mm numeric(7, 1) not null check (rain_mm between 0 and 2000),
  kind text not null default 'observed' check (kind in ('observed', 'forecast')),
  source text not null check (length(btrim(source)) between 3 and 200),
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  unique (area_id, obs_date, kind)
);
create index if not exists ddrive_rainfall_recent on public.ddrive_rainfall (tenant_id, obs_date desc);

-- Rainfall belongs to an area of the same organisation; a forecast is for today or later.
create or replace function public.ddrive_20_rainfall_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare t uuid;
begin
  select tenant_id into t from public.ddrive_flood_areas where id = new.area_id;
  if t is distinct from new.tenant_id then
    raise exception 'That area is not in your organisation.' using errcode = '42501';
  end if;
  if new.kind = 'observed' and new.obs_date > (now() at time zone 'Asia/Manila')::date then
    raise exception 'Observed rainfall cannot be for a future day; record it as a forecast.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists ddrive_10_touch on public.ddrive_flood_areas;
create trigger ddrive_10_touch before insert or update on public.ddrive_flood_areas for each row execute function public.ddrive_touch();
drop trigger if exists ddrive_90_audit on public.ddrive_flood_areas;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_flood_areas for each row execute function public.ddrive_audit();
drop trigger if exists ddrive_10_touch on public.ddrive_rainfall;
create trigger ddrive_10_touch before insert or update on public.ddrive_rainfall for each row execute function public.ddrive_touch();
drop trigger if exists ddrive_20_guard on public.ddrive_rainfall;
create trigger ddrive_20_guard before insert or update on public.ddrive_rainfall for each row execute function public.ddrive_20_rainfall_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_rainfall;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_rainfall for each row execute function public.ddrive_audit();

-- ─── Bulk import (the caller's own rights apply: security invoker) ──────────
-- Areas: [{adm4_pcode, name, flood_hazard_pct, lat?, lon?}]; an existing area (same code, else same name) is updated.
create or replace function public.ddrive_import_flood_areas(p jsonb, p_source text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare r jsonb; v_id text; added int := 0; updated int := 0; t uuid := public.ddrive_active_tenant();
begin
  if t is null or not public.ddrive_has_role(t, 'analyst') then
    raise exception 'Importing flood areas needs the analyst role.' using errcode = '42501';
  end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 5000 then
    raise exception 'Expected a list of at most 5000 areas.' using errcode = '22023';
  end if;
  for r in select * from jsonb_array_elements(p) loop
    select id into v_id from public.ddrive_flood_areas a
     where a.tenant_id = t and ((r->>'adm4_pcode' is not null and a.adm4_pcode = r->>'adm4_pcode')
                                or (r->>'adm4_pcode' is null and lower(a.name) = lower(btrim(r->>'name'))))
     limit 1;
    if v_id is null then
      insert into public.ddrive_flood_areas (tenant_id, adm4_pcode, name, flood_hazard_pct, hazard_source, lat, lon)
      values (t, nullif(btrim(r->>'adm4_pcode'), ''), btrim(r->>'name'), (r->>'flood_hazard_pct')::numeric, p_source,
              (r->>'lat')::double precision, (r->>'lon')::double precision);
      added := added + 1;
    else
      update public.ddrive_flood_areas set flood_hazard_pct = (r->>'flood_hazard_pct')::numeric, hazard_source = p_source,
        name = coalesce(nullif(btrim(r->>'name'), ''), name), lat = coalesce((r->>'lat')::double precision, lat), lon = coalesce((r->>'lon')::double precision, lon)
       where id = v_id;
      updated := updated + 1;
    end if;
    v_id := null;
  end loop;
  return jsonb_build_object('added', added, 'updated', updated);
end;
$$;

-- Rainfall: [{area_id, obs_date, rain_mm, kind?}]; a value for the same area, day and kind is replaced.
create or replace function public.ddrive_record_rainfall(p jsonb, p_source text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare r jsonb; v_id text; added int := 0; updated int := 0; t uuid;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 20000 then
    raise exception 'Expected a list of at most 20000 readings.' using errcode = '22023';
  end if;
  for r in select * from jsonb_array_elements(p) loop
    -- The reading belongs to the area's organisation; the caller must be a responder there (RLS hides others' areas).
    select tenant_id into t from public.ddrive_flood_areas where id = r->>'area_id';
    if t is null then raise exception 'Unknown flood area.' using errcode = '42501'; end if;
    if not public.ddrive_has_role(t, 'responder') then
      raise exception 'Recording rainfall needs the responder role.' using errcode = '42501';
    end if;
    select id into v_id from public.ddrive_rainfall
     where area_id = r->>'area_id' and obs_date = (r->>'obs_date')::date and kind = coalesce(r->>'kind', 'observed');
    if v_id is null then
      insert into public.ddrive_rainfall (tenant_id, area_id, obs_date, rain_mm, kind, source)
      values (t, r->>'area_id', (r->>'obs_date')::date, (r->>'rain_mm')::numeric, coalesce(r->>'kind', 'observed'), p_source);
      added := added + 1;
    else
      update public.ddrive_rainfall set rain_mm = (r->>'rain_mm')::numeric, source = p_source where id = v_id;
      updated := updated + 1;
    end if;
    v_id := null;
  end loop;
  return jsonb_build_object('added', added, 'updated', updated);
end;
$$;

-- ─── Access ──────────────────────────────────────────────────────────────────
alter table public.ddrive_flood_areas enable row level security;
alter table public.ddrive_rainfall enable row level security;
drop policy if exists flood_areas_select on public.ddrive_flood_areas;
drop policy if exists flood_areas_write on public.ddrive_flood_areas;
drop policy if exists flood_areas_update on public.ddrive_flood_areas;
drop policy if exists flood_areas_delete on public.ddrive_flood_areas;
create policy flood_areas_select on public.ddrive_flood_areas for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy flood_areas_write on public.ddrive_flood_areas for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy flood_areas_update on public.ddrive_flood_areas for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy flood_areas_delete on public.ddrive_flood_areas for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

drop policy if exists rainfall_select on public.ddrive_rainfall;
drop policy if exists rainfall_insert on public.ddrive_rainfall;
drop policy if exists rainfall_update on public.ddrive_rainfall;
drop policy if exists rainfall_delete on public.ddrive_rainfall;
create policy rainfall_select on public.ddrive_rainfall for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy rainfall_insert on public.ddrive_rainfall for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'responder'));
create policy rainfall_update on public.ddrive_rainfall for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'responder')) with check (public.ddrive_has_role(tenant_id, 'responder'));
create policy rainfall_delete on public.ddrive_rainfall for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

revoke all on public.ddrive_flood_areas, public.ddrive_rainfall from anon;
grant select, insert, update, delete on public.ddrive_flood_areas, public.ddrive_rainfall to authenticated;
revoke all on function public.ddrive_import_flood_areas(jsonb, text), public.ddrive_record_rainfall(jsonb, text) from public, anon;
grant execute on function public.ddrive_import_flood_areas(jsonb, text), public.ddrive_record_rainfall(jsonb, text) to authenticated;
