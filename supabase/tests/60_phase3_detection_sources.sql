-- Detection sources and risk-informed warnings (ADR-005). Runs after 50_phase3_ddrive_assessment.sql in the same database.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

-- A USGS-style reading, shaped as ingest-official sends it.
create or replace function tests.quake(p_id text, p_updated text, p_mag numeric, p_lat double precision, p_lon double precision,
                                       p_msg text default 'Alert', p_age interval default interval '1 hour') returns jsonb language sql as $$
  select jsonb_build_object(
    'source', 'USGS', 'identifier', p_id || '@' || p_updated, 'event_key', p_id, 'sender', 'USGS NEIC',
    'sent', now() - p_age, 'status', 'Actual', 'msg_type', p_msg, 'event', 'Earthquake', 'category', 'Geo',
    'headline', 'M ' || p_mag || ' - test', 'expires', now() - p_age + interval '24 hours',
    'area_names', '[]'::jsonb, 'area_codes', '[]'::jsonb, 'cap_url', 'https://earthquake.usgs.gov/earthquakes/eventpage/' || p_id,
    'raw_xml', '{}', 'raw_format', 'usgs-geojson', 'latitude', p_lat, 'longitude', p_lon, 'depth_km', 10,
    'magnitude', p_mag, 'magnitude_type', 'mww', 'alert_level', null, 'tsunami_flag', false)
$$;

-- ─── Recording ───────────────────────────────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A user cannot record a USGS reading', $q$ select public.ddrive_apply_official_alert(tests.quake('us1', '1', 5.1, 11.2, 125.0)) $q$);
reset role;
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;  -- the ingest service

select tests.eq('The service records a M5.1 off Samar', $q$ select public.ddrive_apply_official_alert(tests.quake('us1', '1', 5.1, 11.6, 125.6)) $q$, 'new');
select tests.eq('It is typed as an earthquake from its event name', $q$ select hazard_type || ' ' || raw_format from public.ddrive_official_alerts where identifier = 'us1@1' $q$, 'earthquake usgs-geojson');
select tests.eq('A revised magnitude for the same event', $q$ select public.ddrive_apply_official_alert(tests.quake('us1', '2', 5.3, 11.6, 125.6, 'Alert', interval '50 minutes')) $q$, 'new');
select tests.eq('replaces the first reading', $q$ select string_agg(identifier || '=' || magnitude, ',') from public.ddrive_active_alerts where event_key = 'us1' $q$, 'us1@2=5.3');
select tests.eq('An older reading arriving late does not come back', $q$ select public.ddrive_apply_official_alert(tests.quake('us1', '0', 4.9, 11.6, 125.6, 'Alert', interval '2 hours')) $q$, 'new');
select tests.eq('(still only the latest is in force)', $q$ select string_agg(identifier, ',') from public.ddrive_active_alerts where event_key = 'us1' $q$, 'us1@2');
select tests.ok('A far-away quake (Taiwan)', $q$ select public.ddrive_apply_official_alert(tests.quake('us2', '1', 6.0, 23.8, 121.6)) $q$);
select tests.ok('A quake USGS later deletes', $q$ select public.ddrive_apply_official_alert(tests.quake('us3', '1', 4.6, 10.9, 124.9)) $q$);
select tests.eq('The deletion cancels the event', $q$ select public.ddrive_apply_official_alert(tests.quake('us3', '2', 4.6, 10.9, 124.9, 'Cancel')) $q$, 'new');
select tests.eq('(no reading of it is in force)', $q$ select count(*)::text from public.ddrive_active_alerts where event_key = 'us3' $q$, '0');
select tests.refused('Coordinates out of range are refused', $q$ select public.ddrive_apply_official_alert(tests.quake('us9', '1', 5.0, 95, 125)) $q$);
select tests.eq('A GDACS cyclone keeps its alert level as published', $q$ select public.ddrive_apply_official_alert(jsonb_build_object(
    'source', 'GDACS', 'identifier', 'TC1001300-4', 'event_key', 'TC1001300', 'sender', 'GDACS', 'sent', now() - interval '3 hours',
    'status', 'Actual', 'msg_type', 'Alert', 'event', 'Tropical cyclone', 'headline', 'Tropical Cyclone TEST-26', 'expires', now() + interval '2 days',
    'area_names', '["Philippines"]'::jsonb, 'country_codes', '["PHL"]'::jsonb, 'cap_url', 'https://www.gdacs.org/report.aspx?eventid=1001300',
    'raw_xml', '{}', 'raw_format', 'gdacs-geojson', 'latitude', 12.5, 'longitude', 127.9, 'alert_level', 'Orange')) $q$, 'new');
select tests.eq('(typed as a tropical cyclone, level Orange)', $q$ select hazard_type || ' ' || alert_level from public.ddrive_official_alerts where identifier = 'TC1001300-4' $q$, 'tropical_cyclone Orange');
reset role;

-- ─── Watch points ────────────────────────────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A watch point needs a radius', $q$ insert into public.ddrive_watch_areas (label, lat, lon) values ('Tacloban City hall', 11.244, 125.004) $q$);
select tests.ok('A DRRM officer adds a 150 km watch point on Tacloban', $q$ insert into public.ddrive_watch_areas (label, lat, lon, radius_km) values ('Tacloban City hall', 11.244, 125.004, 150) $q$);
select tests.eq('The Samar quake is within the radius', $q$ select in_watch_area || ' ' || nearest_watch_km from public.ddrive_active_alerts where event_key = 'us1' $q$, 'true 76');
select tests.eq('The Taiwan quake is not', $q$ select in_watch_area::text from public.ddrive_active_alerts where event_key = 'us2' $q$, 'false');
select tests.eq('The GDACS cyclone centre (about 345 km away) is not either', $q$ select in_watch_area::text from public.ddrive_active_alerts where event_key = 'TC1001300' $q$, 'false');
reset role;

-- ─── Risk-informed warnings ──────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('The Leyte Signal No. 3 warning brings up the assessed tropical cyclone risks, highest first', $q$
  select string_agg(hazard_event || ':' || risk_code, ',' order by risk_rank desc, hazard_event)
  from public.ddrive_alert_risk_context c join public.ddrive_active_alerts a on a.id = c.alert_id where a.identifier = 'tc-2' $q$, 'Wind:H7,Storm Surge:M5');
select tests.eq('with vulnerability and response capacity', $q$
  select total_vulnerability || ' / ' || response from public.ddrive_alert_risk_context c join public.ddrive_active_alerts a on a.id = c.alert_id
  where a.identifier = 'tc-2' and hazard_event = 'Wind' $q$, '90.0 / 5');
select tests.eq('from the approved version only (v2), not the superseded one', $q$
  select count(distinct assessment_id)::text from public.ddrive_alert_risk_context c join public.ddrive_active_alerts a on a.id = c.alert_id where a.identifier = 'tc-2' $q$, '1');
select tests.eq('An earthquake nearby finds no assessed earthquake risk (none was assessed)', $q$
  select count(*)::text from public.ddrive_alert_risk_context c join public.ddrive_active_alerts a on a.id = c.alert_id where a.event_key = 'us1' $q$, '0');
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation gets no risk context from A''s assessments', $q$ select count(*)::text from public.ddrive_alert_risk_context $q$, '0');
select tests.eq('but sees the same official alerts', $q$ select (count(*) >= 3)::text from public.ddrive_active_alerts where source in ('USGS', 'GDACS') $q$, 'true');
reset role;
set role anon;
select tests.refused('Anonymous visitors see no alerts', $q$ select count(*) from public.ddrive_active_alerts $q$);
reset role;

-- ─── Matching rules ──────────────────────────────────────────────────────────
select tests.eq('Event names map to hazard types', $q$ select string_agg(public.ddrive_alert_hazard_type(e), ',') from unnest(array[
  'Tropical Cyclone Warning', 'General Flood Advisory (Moderate)', 'Heavy Rainfall Warning', 'Tsunami Information Statement', 'Storm Surge Warning',
  'Volcanic eruption', 'Thunderstorm Advisory', 'Unknown thing']) e $q$, 'tropical_cyclone,flood,rainfall,tsunami,storm_surge,volcano,rainfall,other');
select tests.eq('Great-circle distance Manila to Tacloban is about 574 km', $q$ select round(public.ddrive_km(14.5995, 120.9842, 11.244, 125.004))::text $q$, '574');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
