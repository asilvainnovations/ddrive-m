-- EOC operations: status, duty roster, operations log (ADR-017). Runs after 100 in the same database.
-- analyst@a.ph and viewer@a.ph belong to LGU A only; officer actions use admin@a.ph (tenant admin of LGU A).
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.duty(p_name text) returns text language sql as $$ select id from public.ddrive_eoc_duty where person_name = p_name $$;
grant execute on function tests.duty(text) to authenticated;

-- ─── Status ──────────────────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An analyst cannot change the EOC status', $q$ select public.ddrive_eoc_set_status('blue', 'impending_hazard', 'Typhoon entering PAR', 'Mayor A. Santos') $q$);
select tests.refused('nor write the status table directly', $q$ insert into public.ddrive_eoc_status (level, trigger, basis, directed_by) values ('red', 'initial', 'Direct insert attempt', 'Nobody') $q$);
reset role;

select tests.claims('admin@a.ph'); set role authenticated;
select tests.eq('With no status recorded, there is no current status (not an assumed WHITE)', $q$ select count(*)::text from public.ddrive_eoc_current $q$, '0');
select tests.refused('A first WHITE status needs the trigger "initial"', $q$ select public.ddrive_eoc_set_status('white', 'situation_improved', 'Normal operations at start', 'Mayor A. Santos') $q$);
select tests.ok('An officer records the initial WHITE status', $q$ select public.ddrive_eoc_set_status('white', 'initial', 'Normal operations and monitoring', 'Mayor A. Santos') $q$);
select tests.refused('The same level again is refused', $q$ select public.ddrive_eoc_set_status('white', 'ro_directive_up', 'Same level again', 'Mayor A. Santos') $q$);
select tests.refused('Raising the status needs an activation trigger', $q$ select public.ddrive_eoc_set_status('blue', 'situation_improved', 'Wrong trigger for raising', 'Mayor A. Santos') $q$);
select tests.refused('The basis must say why', $q$ select public.ddrive_eoc_set_status('blue', 'impending_hazard', 'TC', 'Mayor A. Santos') $q$);
select tests.ok('BLUE on an impending hazard, directed by the Responsible Official', $q$ select public.ddrive_eoc_set_status('blue', 'impending_hazard', 'PAGASA Severe Weather Bulletin: TS entering PAR; PDRA result', 'Mayor A. Santos') $q$);
select tests.ok('RED on an ongoing incident', $q$ select public.ddrive_eoc_set_status('red', 'ongoing_incident', 'Flooding in 12 barangays; pre-emptive evacuation ongoing', 'Mayor A. Santos') $q$);
select tests.refused('Lowering the status needs a deactivation trigger', $q$ select public.ddrive_eoc_set_status('blue', 'ongoing_incident', 'Wrong trigger for lowering', 'Mayor A. Santos') $q$);
select tests.ok('Downgrade to BLUE when the situation improves', $q$ select public.ddrive_eoc_set_status('blue', 'situation_improved', 'Floodwaters receding; returnees being assisted', 'Mayor A. Santos') $q$);
select tests.eq('The current status is the latest change, with where it came from', $q$
  select level || ' from ' || previous_level || ' ' || trigger || ' ' || ref from public.ddrive_eoc_current $q$, 'blue from red situation_improved E-004');
select tests.eq('Each change is kept, in order', $q$ select string_agg(level, ',' order by created_at, ref) from public.ddrive_eoc_status $q$, 'white,blue,red,blue');
select tests.eq('… with who recorded it', $q$ select count(*)::text from public.ddrive_eoc_status where created_by = auth.uid() $q$, '4');
select tests.refused('A status record cannot be changed', $q$ update public.ddrive_eoc_status set level = 'white' where ref = 'E-004' $q$);
select tests.refused('nor deleted', $q$ delete from public.ddrive_eoc_status where ref = 'E-001' $q$);
select tests.eq('… all four records are still there', $q$ select count(*)::text from public.ddrive_eoc_status $q$, '4');
reset role;

-- ─── Duty roster ─────────────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst puts people on the roster by management function', $q$
  insert into public.ddrive_eoc_duty (function, position, person_name, contact, shift_start, shift_end) values
  ('operations', 'Operations chief', 'Rico Responder', '0917 000 0000', now() - interval '1 hour', now() + interval '11 hours'),
  ('planning', 'Situation unit', 'Ana Planner', null, now() + interval '11 hours', now() + interval '23 hours') $q$);
select tests.refused('A tour of duty is at most 24 hours', $q$
  insert into public.ddrive_eoc_duty (function, person_name, shift_start, shift_end) values ('logistics', 'Long Shift', now(), now() + interval '30 hours') $q$);
select tests.refused('Only the five Memo 131 functions are accepted', $q$
  insert into public.ddrive_eoc_duty (function, person_name, shift_start, shift_end) values ('intelligence', 'X Person', now(), now() + interval '8 hours') $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot add to the roster', $q$
  insert into public.ddrive_eoc_duty (function, person_name, shift_start, shift_end) values ('operations', 'Self Added', now(), now() + interval '8 hours') $q$);
select tests.ok('A responder marks a tour of duty as started', $q$ update public.ddrive_eoc_duty set status = 'on_duty' where id = tests.duty('Rico Responder') $q$);
select tests.refused('but cannot change its hours', $q$ update public.ddrive_eoc_duty set shift_end = shift_end + interval '1 hour' where id = tests.duty('Rico Responder') $q$);

-- ─── Operations log ──────────────────────────────────────────────────────────
select tests.ok('A responder logs a resource request', $q$
  insert into public.ddrive_eoc_log (entry_type, function, body) values ('resource_request', 'operations', 'Two rubber boats for Brgy. 5 from the Logistics cluster') $q$);
select tests.refused('A handover names who takes over', $q$
  insert into public.ddrive_eoc_log (entry_type, body) values ('handover', 'Status BLUE, two boats deployed, next sitrep due 18:00') $q$);
select tests.refused('and says enough to take over', $q$
  insert into public.ddrive_eoc_log (entry_type, body, handover_to) values ('handover', 'All fine', 'Ana Planner') $q$);
select tests.ok('A handover with the situation and who takes over', $q$
  insert into public.ddrive_eoc_log (entry_type, function, body, handover_to) values ('handover', 'operations', 'Status BLUE, two boats deployed, next sitrep due 18:00', 'Ana Planner') $q$);
select tests.eq('Log entries get references', $q$ select string_agg(ref, ',' order by ref) from public.ddrive_eoc_log $q$, 'L-001,L-002');
select tests.refused('A log entry cannot be edited', $q$ update public.ddrive_eoc_log set body = 'Rewritten history' where ref = 'L-001' $q$);
reset role;

select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer sees the status, roster and log', $q$
  select (select count(*) from public.ddrive_eoc_current) || ' ' || (select count(*) from public.ddrive_eoc_duty) || ' ' || (select count(*) from public.ddrive_eoc_log) $q$, '1 2 2');
select tests.refused('but cannot write to the log', $q$ insert into public.ddrive_eoc_log (entry_type, body) values ('situation', 'Viewer note') $q$);
reset role;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of it', $q$
  select (select count(*) from public.ddrive_eoc_status) + (select count(*) from public.ddrive_eoc_duty) + (select count(*) from public.ddrive_eoc_log) || '' $q$, '0');
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select 1 / count(*) from public.ddrive_eoc_current $q$);
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
