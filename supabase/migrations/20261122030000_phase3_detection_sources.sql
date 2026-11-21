-- DDRiVE-M Phase 3: more official detection sources (PTWC, USGS, GDACS), watch points, and risk-informed warnings.
-- See docs/adr/005-official-detection-sources.md. Apply after 20261122020000_phase3_ddrive_assessment.sql. Safe to run more than once.

-- ─── 1. Alerts from non-CAP sources ──────────────────────────────────────────
alter table public.ddrive_official_alerts add column if not exists raw_format text not null default 'cap-xml';
alter table public.ddrive_official_alerts add column if not exists event_key text;         -- same event across revisions (USGS id, GDACS type+id)
alter table public.ddrive_official_alerts add column if not exists latitude double precision;
alter table public.ddrive_official_alerts add column if not exists longitude double precision;
alter table public.ddrive_official_alerts add column if not exists depth_km numeric;
alter table public.ddrive_official_alerts add column if not exists magnitude numeric;
alter table public.ddrive_official_alerts add column if not exists magnitude_type text;
alter table public.ddrive_official_alerts add column if not exists alert_level text;        -- GDACS level or USGS PAGER colour, as published
alter table public.ddrive_official_alerts add column if not exists tsunami_flag boolean;
alter table public.ddrive_official_alerts add column if not exists country_codes text[] not null default '{}';
alter table public.ddrive_official_alerts add column if not exists hazard_type text;
comment on column public.ddrive_official_alerts.raw_xml is 'The original document as received: CAP XML, or the JSON feature for non-CAP sources (see raw_format).';
create index if not exists ddrive_official_alerts_event_key on public.ddrive_official_alerts (source, event_key) where event_key is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_official_alerts_raw_format') then
    alter table public.ddrive_official_alerts add constraint ddrive_official_alerts_raw_format
      check (raw_format in ('cap-xml', 'usgs-geojson', 'gdacs-geojson'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ddrive_official_alerts_coords') then
    alter table public.ddrive_official_alerts add constraint ddrive_official_alerts_coords
      check ((latitude is null) = (longitude is null) and (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180)));
  end if;
end $$;

-- A normalised hazard type, from the agency's event name (used to match alerts with assessed risks).
create or replace function public.ddrive_alert_hazard_type(p_event text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_event ~* 'tsunami' then 'tsunami'
    when p_event ~* 'storm surge' then 'storm_surge'
    when p_event ~* 'tropical (cyclone|depression|storm)|typhoon|wind signal|storm warning signal' then 'tropical_cyclone'
    when p_event ~* 'flood' then 'flood'
    when p_event ~* 'rain|thunderstorm' then 'rainfall'
    when p_event ~* 'earthquake' then 'earthquake'
    when p_event ~* 'volcan' then 'volcano'
    when p_event ~* 'drought' then 'drought'
    when p_event ~* 'wild ?fire|forest fire' then 'wildfire'
    when p_event ~* 'landslide|mass movement' then 'landslide'
    else 'other'
  end
$$;

update public.ddrive_official_alerts set hazard_type = public.ddrive_alert_hazard_type(event) where hazard_type is null;

-- Great-circle distance in km (haversine, mean Earth radius 6371 km).
create or replace function public.ddrive_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision
language sql
immutable
set search_path = public, pg_temp
as $$
  select 2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
                              + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)))
$$;

-- ─── 2. Applying an alert: new fields, and revisions of the same event ──────
create or replace function public.ddrive_apply_official_alert(p jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_ref text;
  v_ref_identifier text;
  v_codes text[] := coalesce(array(select jsonb_array_elements_text(p -> 'area_codes')), '{}');
  v_key text := nullif(p ->> 'event_key', '');
  v_sent timestamptz := (p ->> 'sent')::timestamptz;
begin
  if not public.ddrive_is_admin_context() then
    raise exception 'Only the ingest service can record official alerts.' using errcode = '42501';
  end if;

  insert into public.ddrive_official_alerts (
    source, identifier, sender, sent, status, msg_type, scope, references_raw, event, category,
    urgency, severity, certainty, headline, description, instruction, effective, onset, expires, web,
    signal_level, region_label, area_names, area_codes, area_keys, areas, cap_url, license, raw_xml,
    raw_format, event_key, latitude, longitude, depth_km, magnitude, magnitude_type, alert_level, tsunami_flag, country_codes, hazard_type)
  values (
    p ->> 'source', p ->> 'identifier', p ->> 'sender', v_sent, p ->> 'status',
    p ->> 'msg_type', p ->> 'scope', p ->> 'references', p ->> 'event', p ->> 'category',
    p ->> 'urgency', p ->> 'severity', p ->> 'certainty', p ->> 'headline', p ->> 'description',
    p ->> 'instruction', (p ->> 'effective')::timestamptz, (p ->> 'onset')::timestamptz,
    (p ->> 'expires')::timestamptz, p ->> 'web', (p ->> 'signal_level')::int, p ->> 'region_label',
    coalesce(array(select jsonb_array_elements_text(p -> 'area_names')), '{}'),
    v_codes,
    coalesce(array(select distinct public.ddrive_psgc_key(c) from unnest(v_codes) c where public.ddrive_psgc_key(c) is not null), '{}'),
    coalesce(p -> 'areas', '[]'::jsonb), p ->> 'cap_url', p ->> 'license', p ->> 'raw_xml',
    coalesce(p ->> 'raw_format', 'cap-xml'), v_key, (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
    (p ->> 'depth_km')::numeric, (p ->> 'magnitude')::numeric, p ->> 'magnitude_type', p ->> 'alert_level',
    (p ->> 'tsunami_flag')::boolean, coalesce(array(select jsonb_array_elements_text(p -> 'country_codes')), '{}'),
    coalesce(p ->> 'hazard_type', public.ddrive_alert_hazard_type(p ->> 'event')))
  on conflict (source, identifier) do nothing
  returning id into v_id;

  if v_id is null then
    return 'exists';
  end if;

  -- CAP references: "sender,identifier,sent", separated by spaces.
  foreach v_ref in array coalesce(string_to_array(btrim(coalesce(p ->> 'references', '')), ' '), '{}') loop
    v_ref_identifier := split_part(v_ref, ',', 2);
    continue when v_ref_identifier = '';
    if p ->> 'msg_type' = 'Cancel' then
      update public.ddrive_official_alerts set cancelled = true
      where source = p ->> 'source' and identifier = v_ref_identifier;
    else
      update public.ddrive_official_alerts set superseded_by = v_id
      where source = p ->> 'source' and identifier = v_ref_identifier and superseded_by is null;
    end if;
  end loop;

  -- A later-arriving alert may be referenced by one already stored.
  if exists (select 1 from public.ddrive_official_alerts o
             where o.source = p ->> 'source' and o.id <> v_id
               and o.references_raw like '%,' || (p ->> 'identifier') || ',%') then
    update public.ddrive_official_alerts set superseded_by = (
      select o.id from public.ddrive_official_alerts o
      where o.source = p ->> 'source' and o.id <> v_id and o.references_raw like '%,' || (p ->> 'identifier') || ',%'
      order by o.sent desc limit 1)
    where id = v_id;
  end if;

  -- Non-CAP sources: a newer reading of the same event replaces the older ones; a deletion cancels the event.
  if v_key is not null then
    if p ->> 'msg_type' = 'Cancel' then
      update public.ddrive_official_alerts set cancelled = true where source = p ->> 'source' and event_key = v_key;
    else
      update public.ddrive_official_alerts set superseded_by = v_id
       where source = p ->> 'source' and event_key = v_key and id <> v_id and superseded_by is null and sent <= v_sent;
      update public.ddrive_official_alerts set superseded_by = (
        select o.id from public.ddrive_official_alerts o
        where o.source = p ->> 'source' and o.event_key = v_key and o.id <> v_id and o.sent > v_sent
        order by o.sent desc limit 1)
      where id = v_id and exists (select 1 from public.ddrive_official_alerts o
                                  where o.source = p ->> 'source' and o.event_key = v_key and o.id <> v_id and o.sent > v_sent);
    end if;
  end if;

  return 'new';
end;
$$;

-- ─── 3. Watch points: a place and a radius ───────────────────────────────────
alter table public.ddrive_watch_areas add column if not exists lat double precision;
alter table public.ddrive_watch_areas add column if not exists lon double precision;
alter table public.ddrive_watch_areas add column if not exists radius_km numeric;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_watch_areas_point') then
    alter table public.ddrive_watch_areas add constraint ddrive_watch_areas_point check (
      (lat is null and lon is null and radius_km is null)
      or (lat is not null and lon is not null and radius_km is not null
          and lat between -90 and 90 and lon between -180 and 180 and radius_km between 1 and 1000));
  end if;
end $$;

-- True when an alert covers one of the organisation's watch areas: by PSGC code, by name, or (for alerts with
-- coordinates) within a watch point's radius.
create or replace function public.ddrive_alert_in_watch_area(p_alert_keys text[], p_alert_names text[], p_lat double precision,
                                                             p_lon double precision, p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.ddrive_watch_areas w
    where w.tenant_id = p_tenant
      and ((w.psgc_code is not null and public.ddrive_psgc_key(w.psgc_code) = any (p_alert_keys))
           or public.ddrive_norm_place(w.label) = any (array(select public.ddrive_norm_place(n) from unnest(p_alert_names) n))
           or (w.lat is not null and p_lat is not null and public.ddrive_km(w.lat, w.lon, p_lat, p_lon) <= w.radius_km))
  )
$$;

-- Distance from an alert's point to the organisation's nearest watch point, in km.
create or replace function public.ddrive_alert_nearest_km(p_lat double precision, p_lon double precision, p_tenant uuid)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select round(min(public.ddrive_km(w.lat, w.lon, p_lat, p_lon))::numeric, 0)
  from public.ddrive_watch_areas w
  where w.tenant_id = p_tenant and w.lat is not null and p_lat is not null
$$;

-- ─── 4. Alerts in force (now from every source) ──────────────────────────────
drop view if exists public.ddrive_alert_risk_context;
drop view if exists public.ddrive_active_alerts;
create view public.ddrive_active_alerts
with (security_invoker = true)
as
select a.id, a.source, a.identifier, a.sender, a.sent, a.status, a.msg_type, a.event, a.category,
       a.urgency, a.severity, a.certainty, a.headline, a.description, a.instruction, a.effective, a.onset,
       a.expires, a.web, a.signal_level, a.region_label, a.area_names, a.area_codes, a.cap_url, a.license,
       a.raw_format, a.event_key, a.latitude, a.longitude, a.depth_km, a.magnitude, a.magnitude_type, a.alert_level,
       a.tsunami_flag, a.country_codes, a.hazard_type,
       public.ddrive_alert_in_watch_area(a.area_keys, a.area_names, a.latitude, a.longitude, public.ddrive_active_tenant()) as in_watch_area,
       public.ddrive_alert_nearest_km(a.latitude, a.longitude, public.ddrive_active_tenant()) as nearest_watch_km
from public.ddrive_official_alerts a
where a.status = 'Actual'
  and a.msg_type in ('Alert', 'Update')
  and not a.cancelled
  and a.superseded_by is null
  and coalesce(a.expires, a.sent + interval '24 hours') > now();

-- ─── 5. Risk-informed warnings ───────────────────────────────────────────────
-- Which assessed main hazards and hazard events an alert's hazard type speaks to (DDRiVE catalogue names).
create or replace function public.ddrive_alert_hazard_match(p_hazard_type text, out mains text[], out events text[])
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_hazard_type
           when 'tropical_cyclone' then array['Tropical Cyclone']
           when 'storm_surge' then array['Tropical Cyclone']
           when 'flood' then array['Flood']
           when 'rainfall' then array['Flood', 'Convective Storm']
           when 'earthquake' then array['Earthquake']
           when 'volcano' then array['Volcanic Activity']
           when 'drought' then array['Drought']
           when 'wildfire' then array['Wildfire']
           when 'landslide' then array['Landslide', 'Mass Movement']
           else '{}'::text[] end,
         case p_hazard_type
           when 'tsunami' then array['Tsunami', 'Coastal Flood']
           when 'storm_surge' then array['Storm Surge', 'Coastal Flood']
           when 'rainfall' then array['Rain', 'Flash Flood']
           else '{}'::text[] end
$$;

-- For every alert in force in the organisation's watch areas: the matching hazard events of its approved
-- DDRiVE assessments, with their rating, vulnerability and response capacity. Context for the duty officer, not a forecast.
-- Reads the table, not ddrive_active_alerts, so the Phase 2 migration can still drop and recreate that view when re-run.
create view public.ddrive_alert_risk_context
with (security_invoker = true)
as
select al.id as alert_id, al.source, al.event, al.hazard_type,
       h.id as assessment_id, h.ref as assessment_ref, h.title as assessment_title, h.approved_at,
       e.id as entry_id, e.family_code, e.main_hazard, e.hazard_event, e.risk_code, e.risk_rank, e.likelihood, e.likelihood_level,
       e.severity, e.severity_class, e.total_vulnerability, e.exposure, e.v_infrastructure, e.v_productive, e.v_services,
       e.v_social, e.response, e.risk_id
from public.ddrive_official_alerts al
cross join lateral public.ddrive_alert_hazard_match(al.hazard_type) m
join public.ddrive_hazard_assessments h on h.status = 'approved' and h.tenant_id = public.ddrive_active_tenant()
join public.ddrive_hazard_assessment_entries e on e.assessment_id = h.id and e.risk_code is not null
  and (e.main_hazard = any (m.mains) or e.hazard_event = any (m.events))
where al.status = 'Actual' and al.msg_type in ('Alert', 'Update') and not al.cancelled and al.superseded_by is null
  and coalesce(al.expires, al.sent + interval '24 hours') > now()
  and public.ddrive_alert_in_watch_area(al.area_keys, al.area_names, al.latitude, al.longitude, h.tenant_id);

-- ─── 6. Access ───────────────────────────────────────────────────────────────
grant select (raw_format, event_key, latitude, longitude, depth_km, magnitude, magnitude_type, alert_level, tsunami_flag,
              country_codes, hazard_type) on public.ddrive_official_alerts to authenticated;
revoke all on public.ddrive_active_alerts, public.ddrive_alert_risk_context from anon, authenticated;
grant select on public.ddrive_active_alerts, public.ddrive_alert_risk_context to authenticated;
grant insert (label, psgc_code, lat, lon, radius_km) on public.ddrive_watch_areas to authenticated;

revoke all on function public.ddrive_alert_in_watch_area(text[], text[], double precision, double precision, uuid) from public, anon;
grant execute on function public.ddrive_alert_in_watch_area(text[], text[], double precision, double precision, uuid) to authenticated;
revoke all on function public.ddrive_alert_nearest_km(double precision, double precision, uuid) from public, anon;
grant execute on function public.ddrive_alert_nearest_km(double precision, double precision, uuid) to authenticated;
grant execute on function public.ddrive_alert_hazard_type(text), public.ddrive_km(double precision, double precision, double precision, double precision),
  public.ddrive_alert_hazard_match(text) to authenticated;
revoke all on function public.ddrive_apply_official_alert(jsonb) from public, anon, authenticated;
grant execute on function public.ddrive_apply_official_alert(jsonb) to service_role;
