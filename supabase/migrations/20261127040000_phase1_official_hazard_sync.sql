-- Detection: hazard records synchronised with the authorised agencies' official alerts (ADR-010).
--
-- Every official alert in force that covers one of an organisation's watch areas becomes one of that organisation's
-- hazard records, kept in step with the agency: an update moves the record to the new alert, a cancellation marks it
-- Retracted, expiry marks it Resolved. The ingest functions call ddrive_sync_official_hazards() after every run
-- (every 10 minutes), so the hazard feed no longer depends on someone typing alerts in. Field reports (origin
-- 'field') are unchanged. Synchronised records are read-only for users: the agency is the authority.
--
-- Severity is DDRiVE-M's own ranking for sorting, derived from what the agency published (wind signal, alert level,
-- magnitude); the agency's wording is shown beside it. PAGASA marks every CAP alert "Minor", so CAP severity is not used.
-- Safe to run more than once.

alter table public.ddrive_hazards add column if not exists origin text not null default 'field';
alter table public.ddrive_hazards add column if not exists synced_at timestamptz;
alter table public.ddrive_hazards add column if not exists status_reason text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_hazards_origin') then
    alter table public.ddrive_hazards add constraint ddrive_hazards_origin check (origin in ('field', 'official'));
  end if;
end $$;
-- One synchronised record per organisation and alert.
create unique index if not exists ddrive_hazards_official_uidx on public.ddrive_hazards (tenant_id, official_alert_id)
  where origin = 'official';

-- ─── Mapping from an alert to a hazard record ────────────────────────────────
create or replace function public.ddrive_alert_agency(p_source text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case p_source when 'PTWC' then 'PTWC (NOAA)' when 'USGS' then 'USGS (international)'
                       when 'GDACS' then 'GDACS (international)' else p_source end
$$;

create or replace function public.ddrive_alert_record_type(p_hazard_type text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case p_hazard_type
    when 'tropical_cyclone' then 'Typhoon' when 'storm_surge' then 'Storm Surge' when 'tsunami' then 'Tsunami'
    when 'flood' then 'Flood' when 'rainfall' then 'Rainfall' when 'earthquake' then 'Earthquake'
    when 'volcano' then 'Volcanic' when 'landslide' then 'Landslide' when 'drought' then 'Drought'
    when 'wildfire' then 'Wildfire' else 'Other hazard' end
$$;

create or replace function public.ddrive_alert_record_severity(a public.ddrive_official_alerts)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case
    when a.signal_level >= 4 then 'Critical'
    when a.signal_level = 3 then 'High'
    when a.signal_level is not null then 'Medium'
    when lower(a.alert_level) = 'red' then 'Critical'
    when lower(a.alert_level) = 'orange' then 'High'
    when lower(a.alert_level) = 'yellow' then 'Medium'
    when lower(a.alert_level) = 'green' then 'Low'
    when a.magnitude >= 7 then 'Critical'
    when a.magnitude >= 6 then 'High'
    when a.magnitude >= 5 then 'Medium'
    when a.magnitude is not null then 'Low'
    when a.source = 'PTWC' or a.hazard_type = 'tsunami' then 'High'
    else 'Medium' end
$$;

create or replace function public.ddrive_alert_record_name(a public.ddrive_official_alerts)
returns text language sql immutable set search_path = public, pg_temp as $$
  select left(case
    when a.signal_level is not null then 'Wind Signal No. ' || a.signal_level || ': ' || coalesce(a.headline, a.event)
    when a.magnitude is not null then 'M' || to_char(a.magnitude, 'FM990.0') || ' ' || a.event
    else coalesce(nullif(btrim(a.headline), ''), a.event) end, 200)
$$;

create or replace function public.ddrive_alert_in_force(a public.ddrive_official_alerts)
returns boolean language sql stable set search_path = public, pg_temp as $$
  select a.status = 'Actual' and a.msg_type in ('Alert', 'Update') and not a.cancelled and a.superseded_by is null
     and coalesce(a.expires, a.sent + interval '24 hours') > now()
$$;

-- ─── The sync ────────────────────────────────────────────────────────────────
-- Run by the ingest functions (service role) after each run; also safe to run by hand. Returns what changed.
create or replace function public.ddrive_sync_official_hazards()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_moved int := 0; v_created int := 0; v_resolved int := 0; v_retracted int := 0; n int; i int := 0;
begin
  -- 1. Follow updates: a record whose alert was superseded moves to the newer alert (chains followed step by step).
  loop
    update public.ddrive_hazards h
       set official_alert_id = a.superseded_by, synced_at = now()
      from public.ddrive_official_alerts a
     where h.origin = 'official' and h.official_alert_id = a.id and a.superseded_by is not null
       and not exists (select 1 from public.ddrive_hazards h2
                        where h2.origin = 'official' and h2.tenant_id = h.tenant_id and h2.official_alert_id = a.superseded_by);
    get diagnostics n = row_count;
    v_moved := v_moved + n;
    i := i + 1;
    exit when n = 0 or i >= 20;
  end loop;

  -- 2. New alerts in force in an organisation's watch areas become records.
  insert into public.ddrive_hazards (tenant_id, origin, official_alert_id, agency, type, name, severity, location, lat, lng,
                                     status, detected_at, source_url, synced_at)
  select w.tenant_id, 'official', a.id, public.ddrive_alert_agency(a.source), public.ddrive_alert_record_type(a.hazard_type),
         public.ddrive_alert_record_name(a), public.ddrive_alert_record_severity(a), left(w.places, 500),
         a.latitude, a.longitude, 'Active', a.sent,
         case when a.cap_url ~* '^https://' then a.cap_url when a.web ~* '^https://' then a.web end, now()
  from public.ddrive_official_alerts a
  join lateral (
    select wa.tenant_id, string_agg(distinct wa.label, ', ' order by wa.label) as places
    from public.ddrive_watch_areas wa
    where (wa.psgc_code is not null and public.ddrive_psgc_key(wa.psgc_code) = any (a.area_keys))
       or public.ddrive_norm_place(wa.label) = any (array(select public.ddrive_norm_place(x) from unnest(a.area_names) x))
       or (wa.lat is not null and a.latitude is not null and public.ddrive_km(wa.lat, wa.lon, a.latitude, a.longitude) <= wa.radius_km)
    group by wa.tenant_id
  ) w on true
  where public.ddrive_alert_in_force(a)
  on conflict (tenant_id, official_alert_id) where origin = 'official' do nothing;
  get diagnostics v_created = row_count;

  -- 3. Refresh what the agency changed on records whose alert is still in force.
  update public.ddrive_hazards h
     set name = public.ddrive_alert_record_name(a), severity = public.ddrive_alert_record_severity(a),
         type = public.ddrive_alert_record_type(a.hazard_type), lat = coalesce(a.latitude, h.lat), lng = coalesce(a.longitude, h.lng),
         status = 'Active', status_reason = null, synced_at = now()
    from public.ddrive_official_alerts a
   where h.origin = 'official' and h.official_alert_id = a.id and public.ddrive_alert_in_force(a)
     and (h.name, h.severity, h.type, h.status) is distinct from
         (public.ddrive_alert_record_name(a), public.ddrive_alert_record_severity(a), public.ddrive_alert_record_type(a.hazard_type), 'Active');

  -- 4. Close records the agency withdrew or that ran out.
  update public.ddrive_hazards h
     set status = 'Retracted', status_reason = 'Cancelled by ' || a.source || ' on ' || to_char(coalesce(
           (select c.sent from public.ddrive_official_alerts c where c.source = a.source and c.msg_type = 'Cancel'
              and c.references_raw like '%' || a.identifier || '%' order by c.sent desc limit 1), now()) at time zone 'Asia/Manila',
           'DD Mon YYYY HH24:MI') || ' PHT', synced_at = now()
    from public.ddrive_official_alerts a
   where h.origin = 'official' and h.official_alert_id = a.id and h.status in ('Active', 'Monitoring') and a.cancelled;
  get diagnostics v_retracted = row_count;

  update public.ddrive_hazards h
     set status = 'Resolved', status_reason = 'Alert expired ' || to_char(coalesce(a.expires, a.sent + interval '24 hours') at time zone 'Asia/Manila',
           'DD Mon YYYY HH24:MI') || ' PHT, with no update from ' || a.source, synced_at = now()
    from public.ddrive_official_alerts a
   where h.origin = 'official' and h.official_alert_id = a.id and h.status in ('Active', 'Monitoring')
     and not a.cancelled and a.superseded_by is null and coalesce(a.expires, a.sent + interval '24 hours') <= now();
  get diagnostics v_resolved = row_count;

  -- A record left on a superseded alert (its update already has a record of its own) is closed as replaced.
  update public.ddrive_hazards h
     set status = 'Resolved', status_reason = 'Replaced by the agency''s update, shown as its own record', synced_at = now()
    from public.ddrive_official_alerts a
   where h.origin = 'official' and h.official_alert_id = a.id and h.status in ('Active', 'Monitoring') and a.superseded_by is not null;
  get diagnostics n = row_count;
  v_resolved := v_resolved + n;

  return jsonb_build_object('created', v_created, 'moved_to_update', v_moved, 'retracted', v_retracted, 'resolved', v_resolved);
end;
$$;

-- ─── Guard: synchronised records belong to the agency ────────────────────────
create or replace function public.ddrive_hazard_origin_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.ddrive_is_admin_context() or current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    if new.origin = 'official' then
      raise exception 'Records from official alerts are added automatically. Report what you observed as a field report.' using errcode = '42501';
    end if;
    new.synced_at := null; new.status_reason := null;
    return new;
  end if;
  if old.origin = 'official' then
    raise exception 'This record follows the agency''s alert and cannot be edited. Propose an action or report a field observation instead.' using errcode = '42501';
  end if;
  if new.origin is distinct from old.origin then
    raise exception 'A field report cannot be turned into an official record.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists ddrive_20_origin_guard on public.ddrive_hazards;
create trigger ddrive_20_origin_guard before insert or update on public.ddrive_hazards
  for each row execute function public.ddrive_hazard_origin_guard();

-- A new or removed watch area takes effect at once, not at the next ingest run.
create or replace function public.ddrive_watch_area_resync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ddrive_sync_official_hazards();
  return null;
end;
$$;
revoke all on function public.ddrive_watch_area_resync() from public, anon, authenticated;
drop trigger if exists ddrive_95_resync on public.ddrive_watch_areas;
create trigger ddrive_95_resync after insert or delete on public.ddrive_watch_areas
  for each statement execute function public.ddrive_watch_area_resync();

-- ─── Access ──────────────────────────────────────────────────────────────────
revoke all on function public.ddrive_sync_official_hazards() from public, anon, authenticated;
grant execute on function public.ddrive_sync_official_hazards() to service_role;

-- Existing installations: bring current alerts in now rather than at the next ingest run.
select public.ddrive_sync_official_hazards();
