-- DDRiVE hazard assessment tests (ADR-006). Runs after 40_phase3_rapid_mapping.sql in the same database.
-- The expected numbers are the DDRiVE workbook's own case study (Instructions sheet, rows 144–149 and 171–192).
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.ha(p_title text) returns text language sql security definer as $$
  select id from public.ddrive_hazard_assessments where title = p_title order by created_at desc limit 1
$$;
create or replace function tests.hae(p_title text, p_event text) returns text language sql security definer as $$
  select e.id from public.ddrive_hazard_assessment_entries e join public.ddrive_hazard_assessments a on a.id = e.assessment_id
  where a.title = p_title and e.hazard_event = p_event order by a.created_at desc limit 1
$$;
grant execute on function tests.ha(text), tests.hae(text, text) to authenticated;

-- ─── Scoring: the workbook's formulas ────────────────────────────────────────
-- exposure, four vulnerabilities, response → TV, LR, SR, risk (Instructions rows 144–149)
select tests.eq('Riverine flood: TV 80, LR 8, SR 40, M6', $q$ select concat_ws(' ', total_vulnerability, likelihood, severity, risk_code) from public.ddrive_ha_score('workbook', 9, 8, 8, 8, 8, 4) $q$, '80.0 8 40 M6');
select tests.eq('Flash flood: TV 87.5 (shown as 88), LR 8, SR 40, M6', $q$ select concat_ws(' ', total_vulnerability, likelihood, severity, risk_code) from public.ddrive_ha_score('workbook', 9, 9, 9, 9, 8, 4) $q$, '87.5 8 40 M6');
select tests.eq('Landslide: TV 57.5 (58), LR 5, SR 20, L4', $q$ select concat_ws(' ', total_vulnerability, likelihood, severity, risk_code) from public.ddrive_ha_score('workbook', 7, 7, 5, 6, 5, 3) $q$, '57.5 5 20 L4');
select tests.eq('Coastal flood: LR 8, SR 70, H7', $q$ select concat_ws(' ', likelihood, severity, risk_code) from public.ddrive_ha_score('workbook', 9, 9, 9, 9, 8, 1) $q$, '8 70 H7');
select tests.eq('Tropical cyclone wind: TV 90, LR 9, SR 40, H7', $q$ select concat_ws(' ', total_vulnerability, likelihood, severity, risk_code) from public.ddrive_ha_score('workbook', 10, 9, 9, 9, 9, 5) $q$, '90.0 9 40 H7');
select tests.eq('Storm surge: TV 92.5 (93), LR 8, SR 60, H7', $q$ select concat_ws(' ', total_vulnerability, likelihood, severity, risk_code) from public.ddrive_ha_score('workbook', 9, 10, 9, 9, 9, 2) $q$, '92.5 8 60 H7');
select tests.eq('Severity at or below zero is VL1 (outside the threshold of material risk)', $q$ select concat_ws(' ', severity, severity_class, risk_code) from public.ddrive_ha_score('workbook', 3, 2, 2, 2, 2, 9) $q$, '-70 Below threshold VL1');
select tests.eq('Nothing is scored until every input is given', $q$ select coalesce(risk_code, 'none') from public.ddrive_ha_score('workbook', 9, 8, 8, null, 8, 4) $q$, 'none');
select tests.eq('Continuous method (as the Instructions describe): LR 8.5, SR 45, H7', $q$ select concat_ws(' ', likelihood::numeric(4,2), severity::numeric(5,1), risk_code) from public.ddrive_ha_score('continuous', 9, 8, 8, 8, 8, 4) $q$, '8.50 45.0 H7');
select tests.eq('Top of the matrix: VH9', $q$ select risk_code from public.ddrive_ha_score('continuous', 10, 10, 10, 10, 10, 0) $q$, 'VH9');

-- ─── Scenarios (Instructions rows 166–192) ───────────────────────────────────
select tests.eq('Scenario 1: riverine flood alone (LR 8.5, SR 65) is H8', $q$ select concat_ws(' ', likelihood, severity, risk_code) from public.ddrive_ha_scenario_score(array['H2'], array[8.5], array[65.0]) $q$, '8.50 65.0 H8');
select tests.eq('Scenario 2: hail (4.0, 5.0) and wind (7.0, 40.0) in one family: LR 5.5, SR 30, M5', $q$ select concat_ws(' ', likelihood, severity, risk_code) from public.ddrive_ha_scenario_score(array['H3','H3'], array[4.0, 7.0], array[5.0, 40.0]) $q$, '5.50 30.00 M5');
select tests.eq('Scenario 3: ground movement + landslide (H1) and flood (H2): LR 7.5, SR 64.75, H7', $q$ select concat_ws(' ', likelihood, severity, risk_code) from public.ddrive_ha_scenario_score(array['H1','H1','H2'], array[6.5, 7.5, 8.5], array[45.0, 60.0, 65.0]) $q$, '7.50 64.75 H7');

-- ─── Assessments and entries ─────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot start an assessment', $q$ insert into public.ddrive_hazard_assessments (title) values ('Tacloban City coastal barangays') $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst starts an assessment, claiming it is approved', $q$
  insert into public.ddrive_hazard_assessments (title, description, assessor, completed_on, status, template)
  values ('Tacloban City coastal barangays', 'Coastal barangays, port and city hall', 'CDRRMO planning unit (facilitator)', current_date, 'approved', 'coastal_lgu') $q$);
select tests.eq('It starts as a draft with a reference number and the workbook method', $q$ select status || ' ' || ref || ' ' || method from public.ddrive_hazard_assessments where title = 'Tacloban City coastal barangays' $q$, 'draft HA-001 workbook');
select tests.ok('Riverine flood entry', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event, exposure, v_infrastructure, v_productive, v_services, v_social, response, comments)
  values (tests.ha('Tacloban City coastal barangays'), 'H2', 'Flood', 'Riverine Flood', 9, 8, 8, 8, 8, 4, 'Riverbank settlements flooded in 2013 and 2024') $q$);
select tests.ok('Tropical cyclone: wind entry', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event, exposure, v_infrastructure, v_productive, v_services, v_social, response)
  values (tests.ha('Tacloban City coastal barangays'), 'H3', 'Tropical Cyclone', 'Wind', 10, 9, 9, 9, 9, 5) $q$);
select tests.ok('Tropical cyclone: storm surge entry', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event, exposure, v_infrastructure, v_productive, v_services, v_social, response)
  values (tests.ha('Tacloban City coastal barangays'), 'H3', 'Tropical Cyclone', 'Storm Surge', 9, 10, 9, 9, 9, 2) $q$);
select tests.eq('The server scores each entry', $q$ select string_agg(hazard_event || ':' || risk_code, ',' order by hazard_event) from public.ddrive_hazard_assessment_entries where assessment_id = tests.ha('Tacloban City coastal barangays') $q$, 'Riverine Flood:M6,Storm Surge:H7,Wind:H7');
select tests.refused('A main hazard from another family is refused', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event)
  values (tests.ha('Tacloban City coastal barangays'), 'H1', 'Flood', 'Tsunami') $q$);
select tests.refused('An event outside the family is refused', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event)
  values (tests.ha('Tacloban City coastal barangays'), 'H1', 'Earthquake', 'Riverine Flood') $q$);
select tests.ok('H8 takes a user-named main hazard and any listed event', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event)
  values (tests.ha('Tacloban City coastal barangays'), 'H8', 'Southwest monsoon (Habagat)', 'Rain') $q$);
select tests.refused('A score outside 0–10 is refused', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event, exposure)
  values (tests.ha('Tacloban City coastal barangays'), 'H1', 'Earthquake', 'Tsunami', 11) $q$);
select tests.refused('The computed rating cannot be typed in', $q$ update public.ddrive_hazard_assessment_entries set risk_code = 'VL1' where hazard_event = 'Wind' $q$);
select tests.ok('Re-scoring response measures recomputes the rating', $q$ update public.ddrive_hazard_assessment_entries set response = 9 where hazard_event = 'Riverine Flood' $q$);
select tests.eq('Riverine flood is now VL1 (severity 8 × 10 − 9 × 10 ≤ 0)', $q$ select risk_code from public.ddrive_hazard_assessment_entries where id = tests.hae('Tacloban City coastal barangays', 'Riverine Flood') $q$, 'VL1');
select tests.ok('and back', $q$ update public.ddrive_hazard_assessment_entries set response = 4 where hazard_event = 'Riverine Flood' $q$);
select tests.ok('A scenario of wind and storm surge', $q$ insert into public.ddrive_hazard_scenarios (assessment_id, name, entry_ids)
  values (tests.ha('Tacloban City coastal barangays'), 'Super typhoon landfall', array[tests.hae('Tacloban City coastal barangays', 'Wind'), tests.hae('Tacloban City coastal barangays', 'Storm Surge')]) $q$);
select tests.eq('The scenario is scored: LR 8.5, SR (9×40 + 8×60)/10 = 84, VH9', $q$ select concat_ws(' ', likelihood, severity, risk_code) from public.ddrive_hazard_scenarios_scored where name = 'Super typhoon landfall' $q$, '8.50 84.00 VH9');
select tests.refused('A scenario cannot use unscored events', $q$ insert into public.ddrive_hazard_scenarios (assessment_id, name, entry_ids)
  values (tests.ha('Tacloban City coastal barangays'), 'Monsoon', array[tests.hae('Tacloban City coastal barangays', 'Rain')]) $q$);
select tests.refused('An analyst cannot approve', $q$ select public.ddrive_ha_approve(tests.ha('Tacloban City coastal barangays')) $q$);
select tests.refused('The status cannot be set directly', $q$ update public.ddrive_hazard_assessments set status = 'approved' where title = 'Tacloban City coastal barangays' $q$);
reset role;

select tests.claims('officer2@a.ph'); set role authenticated;
select tests.refused('Approval needs every event scored', $q$ select public.ddrive_ha_approve(tests.ha('Tacloban City coastal barangays')) $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('The analyst removes the unscored monsoon row', $q$ delete from public.ddrive_hazard_assessment_entries where hazard_event = 'Rain' $q$);
reset role;
select tests.claims('officer2@a.ph'); set role authenticated;
select tests.eq('A DRRM officer approves it', $q$ select public.ddrive_ha_approve(tests.ha('Tacloban City coastal barangays')) $q$, 'approved');
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An approved assessment is locked', $q$ update public.ddrive_hazard_assessments set title = 'Changed' where title = 'Tacloban City coastal barangays' $q$);
select tests.refused('and so are its entries', $q$ update public.ddrive_hazard_assessment_entries set exposure = 1 where hazard_event = 'Wind' $q$);
select tests.refused('and they cannot be deleted', $q$ delete from public.ddrive_hazard_assessment_entries where hazard_event = 'Wind' $q$);
select tests.eq('Wind is added to the risk register and gets a register reference', $q$ select (public.ddrive_ha_add_to_register(tests.hae('Tacloban City coastal barangays', 'Wind'), 'CDRRMO Operations') ~ '^R-[0-9]{3}$')::text $q$, 'true');
select tests.eq('mapped to likelihood 5 (Very High) and impact 3 (Moderate), keeping the DDRiVE rating', $q$
  select likelihood || 'x' || impact || ' ' || level || ' ' || ddrive_risk_code || ' ' || total_vulnerability from public.ddrive_risks where hazard_entry_id = tests.hae('Tacloban City coastal barangays', 'Wind') $q$, '5x3 High H7 90.0');
select tests.refused('Adding it twice is refused', $q$ select public.ddrive_ha_add_to_register(tests.hae('Tacloban City coastal barangays', 'Wind'), 'CDRRMO Operations') $q$);
select tests.ok('A typed-in risk cannot claim a DDRiVE rating', $q$ insert into public.ddrive_risks (title, category, likelihood, impact, owner, ddrive_risk_code) values ('Manual risk', 'Operational', 2, 2, 'X', 'VH9') $q$);
select tests.eq('(the claimed rating was dropped)', $q$ select coalesce(ddrive_risk_code, 'none') from public.ddrive_risks where title = 'Manual risk' $q$, 'none');
select tests.ok('Scenarios can still be added to an approved assessment', $q$ insert into public.ddrive_hazard_scenarios (assessment_id, name, entry_ids)
  values (tests.ha('Tacloban City coastal barangays'), 'Flood alone', array[tests.hae('Tacloban City coastal barangays', 'Riverine Flood')]) $q$);
select tests.ok('The analyst starts version 2', $q$ select public.ddrive_ha_new_version(tests.ha('Tacloban City coastal barangays')) $q$);
select tests.eq('Version 2 is a draft copy with the same three events', $q$
  select a.status || ' ' || count(e.*) from public.ddrive_hazard_assessments a join public.ddrive_hazard_assessment_entries e on e.assessment_id = a.id
  where a.supersedes_id is not null group by a.status $q$, 'draft 3');
select tests.refused('A second draft version is refused', $q$ select public.ddrive_ha_new_version((select id from public.ddrive_hazard_assessments where title = 'Tacloban City coastal barangays' and status = 'approved')) $q$);
select tests.ok('Version 2 improves response to storm surge', $q$
  update public.ddrive_hazard_assessment_entries set response = 6, comments = 'Evacuation plan for coastal barangays approved'
  where hazard_event = 'Storm Surge' and assessment_id = (select id from public.ddrive_hazard_assessments where supersedes_id is not null) $q$);
select tests.ok('and records its completion date', $q$ update public.ddrive_hazard_assessments set completed_on = current_date, version_label = 'v2' where supersedes_id is not null $q$);
reset role;
select tests.claims('officer2@a.ph'); set role authenticated;
select tests.eq('Approving version 2', $q$ select public.ddrive_ha_approve((select id from public.ddrive_hazard_assessments where supersedes_id is not null)) $q$, 'approved');
select tests.eq('supersedes version 1', $q$ select string_agg(coalesce(version_label, 'v1') || ':' || status, ',' order by created_at) from public.ddrive_hazard_assessments where title = 'Tacloban City coastal barangays' $q$, 'v1:superseded,v2:approved');
reset role;

-- ─── Other organisations ─────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer can read the assessments', $q$ select count(*)::text from public.ddrive_hazard_assessments $q$, '2');
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of them', $q$ select (select count(*) from public.ddrive_hazard_assessments) + (select count(*) from public.ddrive_hazard_assessment_entries) || '' $q$, '0');
select tests.refused('and cannot add them to its register', $q$ select public.ddrive_ha_add_to_register((select id from public.ddrive_hazard_assessment_entries limit 1), 'Thief') $q$);
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select count(*) from public.ddrive_hazard_assessments $q$);
reset role;
select tests.eq('The catalogue has the workbook''s 84 rows', $q$ select count(*)::text from public.ddrive_hazard_catalogue $q$, '84');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
