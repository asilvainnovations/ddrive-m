-- Hazard records synchronised with official alerts (ADR-010). Runs after 90 in the same database.
-- Uses the alerts and watch areas left by 20 and 60: USGS "us1" (M5.3, 76 km from A's Tacloban watch point) and the
-- PAGASA Signal No. 3 warning "tc-2" for Leyte.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.rec(p_identifier text) returns public.ddrive_hazards language sql security definer as $$
  select h.* from public.ddrive_hazards h join public.ddrive_official_alerts a on a.id = h.official_alert_id
  join public.ddrive_tenants t on t.id = h.tenant_id where a.identifier = p_identifier and t.name = 'LGU A' and h.origin = 'official'
$$;
grant execute on function tests.rec(text) to authenticated;

-- ─── Users cannot run or fake it ─────────────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A user cannot run the sync', $q$ select public.ddrive_sync_official_hazards() $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A user cannot add an "official" record', $q$
  insert into public.ddrive_hazards (agency, type, name, severity, location, origin) values ('PAGASA', 'Typhoon', 'Fake signal', 'Critical', 'Leyte', 'official') $q$);
select tests.ok('Field reports work as before', $q$
  insert into public.ddrive_hazards (agency, type, name, severity, location, lat, lng) values ('Field observation', 'Flood', 'Knee-deep water at the market', 'Medium', 'Ormoc City', 11.006, 124.607) $q$);
select tests.eq('and are marked as field reports', $q$ select origin from public.ddrive_hazards where name = 'Knee-deep water at the market' $q$, 'field');
reset role;

-- ─── First run ───────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.ok('The service syncs', $q$ select public.ddrive_sync_official_hazards() $q$);
select tests.eq('Records exist for the alerts in A''s watch areas (the watch point added in 60 already synchronised them)', $q$
  select (count(*) >= 2)::text from public.ddrive_hazards h join public.ddrive_tenants t on t.id = h.tenant_id where h.origin = 'official' and t.name = 'LGU A' $q$, 'true');
select tests.eq('A second run creates nothing twice', $q$ select public.ddrive_sync_official_hazards() ->> 'created' $q$, '0');
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('The nearby USGS quake is a record, attributed and ranked from its magnitude', $q$
  select (r).agency || ' | ' || (r).type || ' | ' || (r).name || ' | ' || (r).severity || ' | ' || (r).status from (select tests.rec('us1@2') r) x $q$,
  'USGS (international) | Earthquake | M5.3 Earthquake | Medium | Active');
select tests.eq('located by the watch point it fell in, with the epicentre', $q$ select (r).location || ' ' || (r).lat || ',' || (r).lng from (select tests.rec('us1@2') r) x $q$, 'Tacloban City hall 11.6,125.6');
select tests.eq('The PAGASA Signal No. 3 warning is a High record', $q$ select left((r).name, 17) || ' ' || (r).severity || ' ' || (r).agency from (select tests.rec('tc-2') r) x $q$, 'Wind Signal No. 3 High PAGASA');
select tests.eq('The far-away Taiwan quake is not', $q$ select count(*)::text from public.ddrive_hazards h join public.ddrive_official_alerts a on a.id = h.official_alert_id where a.event_key = 'us2' $q$, '0');
select tests.eq('A responder''s edit of a synchronised record changes nothing', $q$
  with u as (update public.ddrive_hazards set severity = 'Low' where id = (select (tests.rec('us1@2')).id) returning 1) select count(*)::text from u $q$, '0');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('not even by an analyst', $q$ update public.ddrive_hazards set status = 'Resolved' where id = (select (tests.rec('us1@2')).id) $q$);
select tests.refused('and a field report cannot be made official', $q$ update public.ddrive_hazards set origin = 'official' where name = 'Knee-deep water at the market' $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation does not see A''s records', $q$ select count(*)::text from public.ddrive_hazards where origin = 'official' and location like '%Tacloban%' $q$, '0');
reset role;

-- ─── The agency updates, cancels, or lets an alert expire ────────────────────
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.eq('USGS revises the quake to M5.6', $q$ select public.ddrive_apply_official_alert(tests.quake('us1', '3', 5.6, 11.6, 125.6, 'Alert', interval '40 minutes')) $q$, 'new');
select tests.eq('The sync moves the record to the update', $q$ select public.ddrive_sync_official_hazards() ->> 'moved_to_update' $q$, '1');
select tests.eq('One record for the event, now M5.6', $q$ select count(*) || ' ' || max(h.name) from public.ddrive_hazards h join public.ddrive_official_alerts a on a.id = h.official_alert_id
  join public.ddrive_tenants t on t.id = h.tenant_id where a.event_key = 'us1' and t.name = 'LGU A' $q$, '1 M5.6 Earthquake');
select tests.ok('A new quake near Tacloban', $q$ select public.ddrive_apply_official_alert(tests.quake('us5', '1', 6.2, 11.3, 125.1)) $q$);
select tests.ok('and one more', $q$ select public.ddrive_apply_official_alert(tests.quake('us6', '1', 4.4, 11.2, 125.0)) $q$);
select tests.eq('both become records', $q$ select public.ddrive_sync_official_hazards() ->> 'created' $q$, '2');
select tests.eq('M6.2 ranks High', $q$ select (tests.rec('us5@1')).severity $q$, 'High');
select tests.ok('USGS deletes the M5.6 event', $q$ select public.ddrive_apply_official_alert(tests.quake('us1', '4', 5.6, 11.6, 125.6, 'Cancel', interval '10 minutes')) $q$);
reset role;
update public.ddrive_official_alerts set expires = now() - interval '1 minute' where identifier = 'us6@1';   -- time passes
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.eq('The sync retracts the cancelled one and resolves the expired one', $q$
  select (r ->> 'retracted') || ' ' || (r ->> 'resolved') from (select public.ddrive_sync_official_hazards() r) x $q$, '1 1');
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('The cancelled quake is Retracted, saying so', $q$ select (r).status || ' ' || left((r).status_reason, 17) from (select tests.rec('us1@3') r) x $q$, 'Retracted Cancelled by USGS');
select tests.eq('The expired one is Resolved, saying so', $q$ select (r).status || ' ' || left((r).status_reason, 13) from (select tests.rec('us6@1') r) x $q$, 'Resolved Alert expired');
select tests.eq('The M6.2 is still Active', $q$ select (tests.rec('us5@1')).status $q$, 'Active');
select tests.eq('A viewer follows all records with their origin', $q$ select (count(*) filter (where origin = 'official') >= 4 and count(*) filter (where origin = 'field') >= 1)::text from public.ddrive_hazards $q$, 'true');
reset role;
select tests.eq('Every sync change is in the audit log', $q$ select (count(*) >= 5)::text from public.ddrive_audit_log where table_name = 'ddrive_hazards' $q$, 'true');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
