-- Validation operations: response clusters, contingency plan activation sets and activations, ICS runs (ADR-019).
-- Runs after 110 in the same database: LGU A's current EOC status is BLUE.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.plan(p_title text) returns text language sql as $$ select id from public.ddrive_plans where title = p_title $$;
create or replace function tests.ex(p_title text) returns text language sql as $$ select id from public.ddrive_exercises where title = p_title $$;
create or replace function tests.ex_any(p_title text) returns text language sql security definer set search_path = public as $$ select id from public.ddrive_exercises where title = p_title $$;
grant execute on function tests.plan(text), tests.ex(text), tests.ex_any(text) to authenticated;

-- ─── Reference clusters ──────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('The twelve response clusters are listed with their lead agencies', $q$
  select count(*) || ' ' || (select lead_agency from public.ddrive_response_clusters where code = 'cccm') from public.ddrive_response_clusters $q$, '12 DSWD');
select tests.refused('and cannot be changed by users', $q$ update public.ddrive_response_clusters set lead_agency = 'X' where code = 'srr' $q$);
reset role;

-- ─── Activation sets ─────────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst drafts a Metro Manila flood contingency plan and an LDRRMP', $q$
  insert into public.ddrive_plans (title, type, template_key, hazard) values
  ('CP Flood Marikina-Pasig 2027', 'Contingency', 'contingency_plan', 'Flood'),
  ('LDRRMP for activation test', 'LDRRMP', 'ldrrmp', null) $q$);
select tests.ok('… and sets which clusters and EOC functions it brings in, from which level', $q$
  insert into public.ddrive_cp_items (plan_id, item_kind, item_code, state, min_level) values
  (tests.plan('CP Flood Marikina-Pasig 2027'), 'function', 'operations', 'lead', 'blue'),
  (tests.plan('CP Flood Marikina-Pasig 2027'), 'function', 'planning', 'on', 'blue'),
  (tests.plan('CP Flood Marikina-Pasig 2027'), 'cluster', 'cccm', 'lead', 'blue'),
  (tests.plan('CP Flood Marikina-Pasig 2027'), 'cluster', 'srr', 'on', 'red'),
  (tests.plan('CP Flood Marikina-Pasig 2027'), 'cluster', 'mdm', 'standby', 'red') $q$);
select tests.refused('An unknown cluster is refused', $q$
  insert into public.ddrive_cp_items (plan_id, item_kind, item_code, state) values (tests.plan('CP Flood Marikina-Pasig 2027'), 'cluster', 'intel', 'on') $q$);
select tests.refused('Only the five Memo 131 functions are accepted', $q$
  insert into public.ddrive_cp_items (plan_id, item_kind, item_code, state) values (tests.plan('CP Flood Marikina-Pasig 2027'), 'function', 'intelligence', 'on') $q$);
select tests.refused('Activation sets belong to contingency plans only', $q$
  insert into public.ddrive_cp_items (plan_id, item_kind, item_code, state) values (tests.plan('LDRRMP for activation test'), 'cluster', 'health', 'on') $q$);
select tests.refused('An item is listed once per plan', $q$
  insert into public.ddrive_cp_items (plan_id, item_kind, item_code, state) values (tests.plan('CP Flood Marikina-Pasig 2027'), 'cluster', 'cccm', 'on') $q$);
reset role;

select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot change an activation set', $q$
  insert into public.ddrive_cp_items (plan_id, item_kind, item_code, state) values (tests.plan('CP Flood Marikina-Pasig 2027'), 'cluster', 'health', 'on') $q$);
reset role;

-- ─── Exercise activation ─────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst plans a tabletop that tests the plan', $q$
  insert into public.ddrive_exercises (title, exercise_type, plan_id, hazard) values ('TTX: Marikina River 3rd alarm', 'tabletop', tests.plan('CP Flood Marikina-Pasig 2027'), 'Flood') $q$);
select tests.refused('An exercise activation states the EOC level the exercise assumes', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Marikina River at 16 m (2nd alarm)', tests.ex('TTX: Marikina River 3rd alarm'), null) $q$);
select tests.ok('At BLUE, the plan brings in BLUE items and holds RED items on standby', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Marikina River at 16 m (2nd alarm)', tests.ex('TTX: Marikina River 3rd alarm'), 'blue') $q$);
select tests.eq('… recorded with what came in and what waits', $q$
  select ref || ' ' || mode || ' ' || level || ' ' || (select string_agg(x->>'code' || '=' || (x->>'state'), ',' order by x->>'code') from jsonb_array_elements(items) x)
  from public.ddrive_cp_activations where level = 'blue' and mode = 'exercise' $q$, 'C-001 exercise blue cccm=lead,mdm=standby,operations=lead,planning=on,srr=standby');
select tests.ok('At RED the same plan brings SRR in; MDM stays on standby as planned', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Marikina River at 18 m (3rd alarm): forced evacuation', tests.ex('TTX: Marikina River 3rd alarm'), 'red') $q$);
select tests.eq('… recorded separately', $q$
  select (select string_agg(x->>'code' || '=' || (x->>'state'), ',' order by x->>'code') from jsonb_array_elements(items) x)
  from public.ddrive_cp_activations where ref = 'C-002' $q$, 'cccm=lead,mdm=standby,operations=lead,planning=on,srr=on');
select tests.eq('An exercise activation does not write to the EOC log', $q$
  select count(*)::text from public.ddrive_eoc_log where body like 'Contingency plan activated%' $q$, '0');
select tests.refused('A live activation needs the DRRM officer role', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Marikina River at 18 m (3rd alarm)') $q$);
select tests.refused('The basis says what triggered it', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'flood', tests.ex('TTX: Marikina River 3rd alarm'), 'red') $q$);
select tests.refused('Activations cannot be written directly', $q$
  insert into public.ddrive_cp_activations (plan_id, mode, level, exercise_id, basis, plan_status) values
  (tests.plan('CP Flood Marikina-Pasig 2027'), 'exercise', 'red', tests.ex('TTX: Marikina River 3rd alarm'), 'Direct insert attempt', 'Draft') $q$);
reset role;

-- ─── Live activation ─────────────────────────────────────────────────────────
select tests.claims('admin@a.ph'); set role authenticated;
select tests.refused('A live activation uses the current EOC level', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Marikina River at 16 m (2nd alarm)', null, 'red') $q$);
select tests.ok('An officer activates the plan on the current BLUE EOC status', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Marikina River at 16 m (2nd alarm); PAGASA heavy rainfall warning orange') $q$);
select tests.eq('… linked to the EOC status it was made on', $q$
  select a.mode || ' ' || a.level || ' ' || s.ref || ' ' || a.plan_status from public.ddrive_cp_activations a join public.ddrive_eoc_status s on s.id = a.eoc_status_id where a.mode = 'live' $q$, 'live blue E-004 Draft');
select tests.eq('… and logged as a decision that says the plan is not yet approved', $q$
  select count(*)::text from public.ddrive_eoc_log where entry_type = 'decision' and body like 'Contingency plan activated (C-003)%not yet approved%' $q$, '1');
select tests.refused('An activation record cannot be changed', $q$ update public.ddrive_cp_activations set level = 'red' where ref = 'C-003' $q$);
select tests.refused('nor deleted', $q$ delete from public.ddrive_cp_activations where ref = 'C-001' $q$);
select tests.ok('The officer approves the plan with its resolution', $q$
  update public.ddrive_plans set status = 'Approved', adoption_ref = 'MMDRRMC Res. No. 1, s. 2027' where id = tests.plan('CP Flood Marikina-Pasig 2027') $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('Once approved, an analyst cannot change the activation set', $q$
  update public.ddrive_cp_items set state = 'on' where plan_id = tests.plan('CP Flood Marikina-Pasig 2027') and item_code = 'mdm' $q$);
reset role;
select tests.claims('admin@a.ph'); set role authenticated;
select tests.ok('… a DRRM officer can', $q$
  update public.ddrive_cp_items set state = 'on' where plan_id = tests.plan('CP Flood Marikina-Pasig 2027') and item_code = 'mdm' $q$);
reset role;

-- ─── ICS runs ────────────────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.ok('Anyone in the organisation can save an ICS simulator run', $q$
  insert into public.ddrive_ics_runs (participant, office, mode, role, scenario_id, scenario_name, difficulty, seconds, total, scores, picks) values
  ('V. Viewer', 'Pasig CDRRMO', 'single', 'ic', 'mm-flood', 'Marikina–Pasig flood', 'intermediate', 610, 78, '{"command":80}', '[{"phase":0}]') $q$);
select tests.eq('… with a server-issued reference', $q$ select ref from public.ddrive_ics_runs $q$, 'S-001');
select tests.refused('A score is 0 to 100', $q$
  insert into public.ddrive_ics_runs (participant, mode, role, scenario_id, scenario_name, difficulty, seconds, total, scores, picks) values
  ('V. Viewer', 'single', 'ic', 'mm-flood', 'X', 'expert', 10, 140, '{}', '[]') $q$);
select tests.refused('A run cannot be edited', $q$ update public.ddrive_ics_runs set total = 100 $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder saves a tabletop run linked to the exercise', $q$
  insert into public.ddrive_ics_runs (participant, mode, role, scenario_id, scenario_name, difficulty, seconds, total, scores, picks, exercise_id) values
  ('Team Pasig', 'tabletop', 'osc', 'mm-flood', 'Marikina–Pasig flood', 'beginner', 1500, 82, '{}', '[]', tests.ex('TTX: Marikina River 3rd alarm')) $q$);
select tests.eq('A responder sees only their own runs', $q$ select count(*)::text from public.ddrive_ics_runs $q$, '1');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.eq('An analyst sees every run in the organisation', $q$ select count(*)::text from public.ddrive_ics_runs $q$, '2');
reset role;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of it', $q$
  select (select count(*) from public.ddrive_cp_items) + (select count(*) from public.ddrive_cp_activations) + (select count(*) from public.ddrive_ics_runs) || '' $q$, '0');
select tests.refused('nor can it activate LGU A''s plan', $q$
  select public.ddrive_cp_activate(tests.plan('CP Flood Marikina-Pasig 2027'), 'Trying from another organisation') $q$);
select tests.refused('nor link a run to LGU A''s exercise', $q$
  insert into public.ddrive_ics_runs (participant, mode, role, scenario_id, scenario_name, difficulty, seconds, total, scores, picks, exercise_id) values
  ('B person', 'single', 'ic', 'mm-flood', 'X', 'expert', 10, 50, '{}', '[]', tests.ex_any('TTX: Marikina River 3rd alarm')) $q$);
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select 1 / count(*) from public.ddrive_cp_activations $q$);
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
