-- DDRiVE-M Phase 2 anticipatory action (RA 12287) tests. Runs after 20_phase2_alerts.sql in the same database.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.case_id(p_title text) returns text language sql as $$
  select id from public.ddrive_aa_cases where title = p_title
$$;
grant usage on schema tests to authenticated;
grant execute on function tests.case_id(text) to authenticated;

-- ─── Opening a case from a forecast ──────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot open an anticipatory action case', $q$
  insert into public.ddrive_aa_cases (title, hazard, areas, forecast_source, forecast_issued_at, expected_onset)
  values ('Typhoon Ada', 'tropical_cyclone', 'Tacloban City', 'PAGASA', now(), now() + interval '4 days') $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst opens a case from the PAGASA Signal No. 3 alert, claiming it is already declared', $q$
  insert into public.ddrive_aa_cases (title, hazard, areas, official_alert_id, forecast_source, forecast_issued_at, expected_onset, status, declared_at)
  select 'Typhoon Ada', 'tropical_cyclone', 'Tacloban City; Palo; Tanauan', id, 'PAGASA ' || event, sent, now() + interval '4 days', 'declared', now()
  from public.ddrive_active_alerts where identifier = 'tc-2' $q$);
select tests.eq('The case starts at the trigger, whatever was sent', $q$ select status || ' ' || coalesce(declared_at::text, 'no declaration') from public.ddrive_aa_cases where title = 'Typhoon Ada' $q$, 'triggered no declaration');
select tests.eq('The server issues the reference number', $q$ select ref from public.ddrive_aa_cases where title = 'Typhoon Ada' $q$, 'A-001');
select tests.refused('An onset before the forecast is refused', $q$
  insert into public.ddrive_aa_cases (title, hazard, areas, forecast_source, forecast_issued_at, expected_onset)
  values ('Backwards', 'flood', 'Palo', 'PAGASA', now(), now() - interval '1 hour') $q$);
select tests.refused('An analyst cannot set the status directly', $q$ update public.ddrive_aa_cases set status = 'recommended' where title = 'Typhoon Ada' $q$);
select tests.refused('An analyst cannot recommend a declaration (a DRRM officer step)', $q$ select public.ddrive_aa_recommend(tests.case_id('Typhoon Ada'), 'Regional DRRM Council VIII') $q$);
reset role;

-- ─── Pre-disaster risk assessment (s. 6) ─────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('No recommendation before an assessment', $q$ select public.ddrive_aa_recommend(tests.case_id('Typhoon Ada'), 'Regional DRRM Council VIII') $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('"Declare" without both section 6 conditions is refused', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'severe', true, false, 'PAGASA forecast track and storm surge outlook for Leyte Gulf', 'declare') $q$);
select tests.refused('An assessment without its basis is refused', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'severe', true, true, 'trust me', 'declare') $q$);
select tests.refused('"Lift" before any declaration is refused', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'not_severe', false, true, 'Updated forecast shows weakening before landfall', 'lift') $q$);
select tests.ok('An analyst records an assessment that meets both conditions and recommends a declaration', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, exposed_people, vulnerable_groups, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'severe', true, true, 48000, 'Coastal informal settlers; older persons',
          'PAGASA forecast track and storm surge outlook for Leyte Gulf; exposure from the 2020 census', 'declare') $q$);
select tests.eq('The server works out the lead time from the expected onset (about 96 hours)', $q$ select (lead_time_hours between 95 and 97)::text from public.ddrive_aa_assessments where case_id = tests.case_id('Typhoon Ada') $q$, 'true');
select tests.eq('The case is now assessed', $q$ select status from public.ddrive_aa_cases where title = 'Typhoon Ada' $q$, 'assessed');
select tests.refused('Assessments cannot be edited afterwards', $q$ update public.ddrive_aa_assessments set recommendation = 'do_not_declare' where case_id = tests.case_id('Typhoon Ada') $q$);
select tests.refused('The analyst still cannot recommend', $q$ select public.ddrive_aa_recommend(tests.case_id('Typhoon Ada'), 'Regional DRRM Council VIII') $q$);
reset role;

-- ─── Recommendation and declaration (s. 5) ───────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A declaration cannot be recorded before it is recommended', $q$ select public.ddrive_aa_record_declaration(tests.case_id('Typhoon Ada'), 'Hon. A. Reyes', 'City Mayor', 'EO 2026-41', now()) $q$);
select tests.eq('The DRRM officer records the council''s recommendation', $q$ select public.ddrive_aa_recommend(tests.case_id('Typhoon Ada'), 'Regional DRRM Council VIII', 'Draft request to the City Mayor') $q$, 'recommended');
select tests.refused('The forecast behind a recommended case cannot be rewritten', $q$ update public.ddrive_aa_cases set expected_onset = now() + interval '10 days' where title = 'Typhoon Ada' $q$);
select tests.refused('A declaration needs the executive order number', $q$ select public.ddrive_aa_record_declaration(tests.case_id('Typhoon Ada'), 'Hon. A. Reyes', 'City Mayor', '', now()) $q$);
select tests.refused('A declaration cannot be dated in the future', $q$ select public.ddrive_aa_record_declaration(tests.case_id('Typhoon Ada'), 'Hon. A. Reyes', 'City Mayor', 'EO 2026-41', now() + interval '1 day') $q$);
select tests.eq('The DRRM officer records the mayor''s executive order', $q$ select public.ddrive_aa_record_declaration(tests.case_id('Typhoon Ada'), 'Hon. A. Reyes', 'City Mayor', 'EO 2026-41', now() - interval '1 minute') $q$, 'declared');
select tests.ok('Editing the description is still allowed', $q$ update public.ddrive_aa_cases set areas = 'Tacloban City; Palo; Tanauan; Tolosa' where title = 'Typhoon Ada' $q$);
reset role;

-- ─── Measures and fund use (s. 9, s. 10) ─────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst plans pre-emptive evacuation funded from the LDRRMF', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, responsible, fund_source, amount_php)
  values (tests.case_id('Typhoon Ada'), 'preemptive_evacuation', 'Evacuate coastal barangays 1-12 to designated centres', 'CDRRMO', 'ldrrmf', 1500000) $q$);
select tests.ok('An analyst plans a public advisory with no funds', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description) values (tests.case_id('Typhoon Ada'), 'public_advisory', 'Radio and SMS advisory in Waray and Filipino') $q$);
select tests.refused('An analyst cannot record a disbursement', $q$ update public.ddrive_aa_actions set disbursed_php = 500000 where measure = 'preemptive_evacuation' $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A measure with no fund source cannot disburse', $q$ insert into public.ddrive_aa_actions (case_id, measure, description, disbursed_php) values (tests.case_id('Typhoon Ada'), 'volunteers', 'Mobilise accredited volunteers', 1000) $q$);
select tests.ok('The DRRM officer records a disbursement under the declaration', $q$ update public.ddrive_aa_actions set disbursed_php = 1200000, status = 'done' where measure = 'preemptive_evacuation' $q$);
select tests.refused('Disbursing more than the amount is refused', $q$ update public.ddrive_aa_actions set disbursed_php = 2000000 where measure = 'preemptive_evacuation' $q$);
select tests.eq('A completed measure gets its completion time', $q$ select (done_at is not null)::text from public.ddrive_aa_actions where measure = 'preemptive_evacuation' $q$, 'true');
reset role;

select tests.claims('viewer@a.ph'); set role authenticated;
select tests.refused('A viewer cannot add a measure to an open case', $q$ insert into public.ddrive_aa_actions (case_id, measure, description) values (tests.case_id('Typhoon Ada'), 'public_advisory', 'Extra advisory') $q$);
select tests.refused('A viewer cannot record an assessment', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'severe', true, true, 'Viewer trying to record an assessment here', 'maintain') $q$);
reset role;

-- ─── Lifting (s. 7) ──────────────────────────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Lifting because impacts are not met needs a new assessment recommending it', $q$ select public.ddrive_aa_record_lifting(tests.case_id('Typhoon Ada'), 'impacts_not_met', now(), 'EO 2026-42') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('"Declare" again on a declared case is refused', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'severe', true, true, 'Same forecast as before, still severe in Leyte Gulf', 'declare') $q$);
select tests.ok('A new assessment recommends lifting: the typhoon weakened', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'not_severe', false, true, 'PAGASA bulletin 14: tropical depression, recurving away from Leyte', 'lift') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Lifting needs the order number when impacts are not met', $q$ select public.ddrive_aa_record_lifting(tests.case_id('Typhoon Ada'), 'impacts_not_met', now(), '') $q$);
select tests.eq('The DRRM officer records the lifting', $q$ select public.ddrive_aa_record_lifting(tests.case_id('Typhoon Ada'), 'impacts_not_met', now(), 'EO 2026-42') $q$, 'lifted');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('No new measures after lifting', $q$ insert into public.ddrive_aa_actions (case_id, measure, description) values (tests.case_id('Typhoon Ada'), 'public_advisory', 'Late advisory') $q$);
select tests.refused('No assessments after lifting', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Typhoon Ada'), 'not_severe', false, false, 'Post-event review of the forecast and response', 'maintain') $q$);
reset role;

-- ─── Report (s. 8, s. 11) ────────────────────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('An estimate of costs minimised needs its basis', $q$ select public.ddrive_aa_submit_report(tests.case_id('Typhoon Ada'), 25000000, 'estimate') $q$);
select tests.eq('The DRRM officer submits the report, which closes the case', $q$ select public.ddrive_aa_submit_report(tests.case_id('Typhoon Ada'), 25000000, 'Avoided damage to boats and equipment moved inland, valued with the 2024 PDNA unit costs', 'Unused LDRRMF of PHP 300,000 returns to the Special Trust Fund') $q$, 'closed');
select tests.refused('A closed case cannot be changed', $q$ update public.ddrive_aa_cases set title = 'Typhoon Ada (edited)' where title = 'Typhoon Ada' $q$);
select tests.refused('Measures of a closed case cannot be changed', $q$ update public.ddrive_aa_actions set description = 'changed' where measure = 'public_advisory' $q$);
reset role;

-- ─── A case that ends without a declaration ──────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst opens a flood case', $q$
  insert into public.ddrive_aa_cases (title, hazard, areas, forecast_source, forecast_issued_at, expected_onset)
  values ('Flood watch Palo', 'flood', 'Palo', 'PAGASA General Flood Advisory', now(), now() + interval '2 days') $q$);
select tests.ok('The assessment finds it not severe', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.case_id('Flood watch Palo'), 'not_severe', false, true, 'Moderate flood advisory only; river levels below alert', 'do_not_declare') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('It cannot be recommended for declaration', $q$ select public.ddrive_aa_recommend(tests.case_id('Flood watch Palo'), 'Regional DRRM Council VIII') $q$);
select tests.eq('The DRRM officer closes it with the reason', $q$ select public.ddrive_aa_close_not_declared(tests.case_id('Flood watch Palo'), 'Assessment found the forecast hazard not severe') $q$, 'not_declared');
reset role;

-- ─── Others ──────────────────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer can follow the cases', $q$ select count(*)::text from public.ddrive_aa_cases $q$, '2');
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of these cases', $q$ select count(*)::text from public.ddrive_aa_cases $q$, '0');
select tests.refused('Another organisation cannot take a step on them', $q$ select public.ddrive_aa_close_not_declared((select id from public.ddrive_aa_cases limit 1), 'not ours to close at all') $q$);
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select count(*) from public.ddrive_aa_cases $q$);
reset role;
select tests.eq('Every step is in the audit log', $q$ select (count(*) >= 10)::text from public.ddrive_audit_log where table_name like 'ddrive_aa_%' $q$, 'true');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
