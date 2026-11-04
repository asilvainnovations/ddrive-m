-- DDRiVE-M Phase 2 official-alert tests. Runs after 10_phase1_access.sql in the same database (reuses its people).
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

-- A signed-in member of each organisation works in it.
do $$ begin
  update public.ddrive_users set active_tenant_id = (select id from public.ddrive_tenants where name = 'LGU A') where email like '%@a.ph';
end $$;

-- Helper: an alert as the ingest service would send it.
create or replace function tests.alert(p_id text, p_msg text, p_refs text, p_event text, p_signal int,
                                       p_names text[], p_codes text[], p_expires interval default interval '6 hours')
returns jsonb language sql as $$
  select jsonb_build_object(
    'source', 'PAGASA', 'identifier', p_id, 'sender', 'PAGASA-DOST', 'sent', now() - interval '1 hour',
    'status', 'Actual', 'msg_type', p_msg, 'scope', 'Public', 'references', p_refs, 'event', p_event,
    'category', 'Met', 'urgency', 'Future', 'severity', 'Minor', 'certainty', 'Likely',
    'headline', p_event, 'description', 'test', 'expires', now() + p_expires, 'signal_level', p_signal,
    'area_names', to_jsonb(p_names), 'area_codes', to_jsonb(p_codes), 'areas', '[]'::jsonb,
    'cap_url', 'https://publicalert.pagasa.dost.gov.ph/output/test/' || p_id || '.cap',
    'license', 'CC BY 4.0', 'raw_xml', '<alert/>')
$$;

-- ─── PSGC matching across formats ────────────────────────────────────────────
select tests.eq('9-digit and 10-digit codes for Cagayan match', $q$ select (public.ddrive_psgc_key('021500000') = public.ddrive_psgc_key('0201500000'))::text $q$, 'true');
select tests.eq('Leyte 9-digit key', $q$ select public.ddrive_psgc_key('083700000') $q$, '08037');
select tests.eq('Metro Manila codes match at region level', $q$ select (public.ddrive_psgc_key('137600000') = public.ddrive_psgc_key('1380000000'))::text $q$, 'true');
select tests.eq('Different provinces do not match', $q$ select (public.ddrive_psgc_key('020900000') = public.ddrive_psgc_key('021500000'))::text $q$, 'false');
select tests.eq('Malformed codes give no key', $q$ select coalesce(public.ddrive_psgc_key('12ab'), 'none') $q$, 'none');

-- ─── Only the ingest service writes alerts ───────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A user cannot record an official alert', $q$ select public.ddrive_apply_official_alert(tests.alert('fake-1', 'Alert', '', 'Tropical Cyclone Warning', 5, '{Leyte}', '{083700000}')) $q$);
select tests.refused('A user cannot insert an alert directly', $q$ insert into public.ddrive_official_alerts (source, identifier, sent, status, msg_type, event, cap_url, raw_xml) values ('PAGASA', 'x', now(), 'Actual', 'Alert', 'Fake', 'https://x', '<a/>') $q$);
select tests.refused('A user cannot record a feed check', $q$ select public.ddrive_record_ingest_run('PAGASA', now(), true, 1, 1, null) $q$);
reset role;

select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.eq('The service records a Signal No. 2 warning for Leyte (10-digit code)', $q$ select public.ddrive_apply_official_alert(tests.alert('tc-1', 'Alert', '', 'Tropical Cyclone Warning', 2, '{Leyte,"Southern Leyte"}', '{0803700000,0806400000}')) $q$, 'new');
select tests.eq('The same alert again is ignored', $q$ select public.ddrive_apply_official_alert(tests.alert('tc-1', 'Alert', '', 'Tropical Cyclone Warning', 2, '{Leyte}', '{0803700000}')) $q$, 'exists');
select tests.eq('A flood advisory for Batanes (name only)', $q$ select public.ddrive_apply_official_alert(tests.alert('gfa-1', 'Alert', '', 'General Flood Advisory (Moderate)', null, '{Batanes}', '{}')) $q$, 'new');
select tests.eq('An advisory for Metro Manila', $q$ select public.ddrive_apply_official_alert(tests.alert('ncr-1', 'Alert', '', 'Heavy Rainfall Warning', null, '{"Metro Manila"}', '{137600000}')) $q$, 'new');
select tests.eq('An expired advisory', $q$ select public.ddrive_apply_official_alert(tests.alert('old-1', 'Alert', '', 'General Flood Advisory', null, '{Leyte}', '{083700000}', interval '-1 hour')) $q$, 'new');
select tests.eq('The service records a feed check', $q$ select public.ddrive_record_ingest_run('PAGASA', now() - interval '5 seconds', true, 4, 4, null)::text $q$, '');
reset role;

-- ─── Organisation A watches Leyte, Batanes and Metro Manila ──────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot change watch areas', $q$ insert into public.ddrive_watch_areas (label, psgc_code) values ('Leyte', '083700000') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('A DRRM officer adds Leyte with its 9-digit code', $q$ insert into public.ddrive_watch_areas (label, psgc_code) values ('Leyte', '083700000') $q$);
select tests.ok('A DRRM officer adds Batanes by name only', $q$ insert into public.ddrive_watch_areas (label) values ('Batanes') $q$);
select tests.ok('A DRRM officer adds Metro Manila with a 10-digit code', $q$ insert into public.ddrive_watch_areas (label, psgc_code) values ('Metro Manila', '1380000000') $q$);
select tests.refused('The same place twice is refused', $q$ insert into public.ddrive_watch_areas (label) values ('  leyte ') $q$);
select tests.refused('A malformed code is refused', $q$ insert into public.ddrive_watch_areas (label, psgc_code) values ('Samar', '12-34') $q$);
reset role;

-- ─── What a member sees ──────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('Three alerts are in force (expired one excluded)', $q$ select count(*)::text from public.ddrive_active_alerts $q$, '3');
select tests.eq('Leyte warning matches across code formats', $q$ select in_watch_area::text from public.ddrive_active_alerts where identifier = 'tc-1' $q$, 'true');
select tests.eq('Batanes advisory matches by name', $q$ select in_watch_area::text from public.ddrive_active_alerts where identifier = 'gfa-1' $q$, 'true');
select tests.eq('Metro Manila advisory matches at region level', $q$ select in_watch_area::text from public.ddrive_active_alerts where identifier = 'ncr-1' $q$, 'true');
select tests.eq('The signal number is kept separate from CAP severity', $q$ select signal_level || ' / ' || severity from public.ddrive_active_alerts where identifier = 'tc-1' $q$, '2 / Minor');
select tests.refused('The raw CAP document is not readable by users', $q$ select raw_xml from public.ddrive_official_alerts limit 1 $q$);
select tests.eq('Feed freshness is readable', $q$ select (count(*) >= 1)::text from public.ddrive_ingest_runs where ok $q$, 'true');
select tests.eq('Watch areas are visible to members', $q$ select count(*)::text from public.ddrive_watch_areas $q$, '3');
reset role;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Organisation B sees the same public alerts', $q$ select count(*)::text from public.ddrive_active_alerts $q$, '3');
select tests.eq('…but none is in B''s watch area', $q$ select count(*)::text from public.ddrive_active_alerts where in_watch_area $q$, '0');
select tests.eq('B cannot see A''s watch areas', $q$ select count(*)::text from public.ddrive_watch_areas $q$, '0');
reset role;

select set_config('request.jwt.claims', '{"role": "anon"}', false); set role anon;
select tests.refused('Anonymous visitors cannot read alerts', $q$ select count(*) from public.ddrive_active_alerts $q$);
reset role;

-- ─── Updates and cancellations ───────────────────────────────────────────────
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.eq('An update raises Leyte to Signal No. 3', $q$ select public.ddrive_apply_official_alert(tests.alert('tc-2', 'Update', 'PAGASA-DOST,tc-1,2026-11-03T08:00:00+08:00', 'Tropical Cyclone Warning', 3, '{Leyte}', '{083700000}')) $q$, 'new');
select tests.eq('A cancellation ends the Batanes advisory', $q$ select public.ddrive_apply_official_alert(tests.alert('gfa-x', 'Cancel', 'PAGASA-DOST,gfa-1,2026-11-03T08:00:00+08:00', 'General Flood Advisory (Moderate)', null, '{Batanes}', '{}')) $q$, 'new');
select tests.eq('An update that arrives before the alert it replaces', $q$ select public.ddrive_apply_official_alert(tests.alert('ncr-2', 'Update', 'PAGASA-DOST,ncr-0,2026-11-03T06:00:00+08:00', 'Heavy Rainfall Warning', null, '{"Metro Manila"}', '{137600000}')) $q$, 'new');
select tests.eq('…then the late original', $q$ select public.ddrive_apply_official_alert(tests.alert('ncr-0', 'Alert', '', 'Heavy Rainfall Warning', null, '{"Metro Manila"}', '{137600000}')) $q$, 'new');
reset role;

select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('Only the latest Leyte warning is in force', $q$ select string_agg(identifier || '=' || signal_level, ',') from public.ddrive_active_alerts where event = 'Tropical Cyclone Warning' $q$, 'tc-2=3');
select tests.eq('The cancelled advisory is gone', $q$ select count(*)::text from public.ddrive_active_alerts where identifier in ('gfa-1', 'gfa-x') $q$, '0');
select tests.eq('The late original is marked replaced', $q$ select string_agg(identifier, ',' order by identifier) from public.ddrive_active_alerts where event = 'Heavy Rainfall Warning' $q$, 'ncr-1,ncr-2');
reset role;

-- ─── Logging an alert as a hazard record ─────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder logs the Signal No. 3 warning as a hazard record', $q$
  insert into public.ddrive_hazards (agency, type, name, severity, location, lat, lng, official_alert_id, source_url)
  select 'PAGASA', 'Typhoon', headline, 'High', 'Leyte', 11.2, 124.9, id, cap_url from public.ddrive_active_alerts where identifier = 'tc-2' $q$);
select tests.eq('The hazard cites the alert and its link', $q$ select (official_alert_id is not null and source_url like 'https://publicalert.pagasa.dost.gov.ph/%')::text from public.ddrive_hazards where location = 'Leyte' and agency = 'PAGASA' $q$, 'true');
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
