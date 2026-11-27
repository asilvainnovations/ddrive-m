-- Governance self-assessment, risk mainstreaming, plan adoption, forms and exercises (ADR-012, ADR-013).
-- Runs after 97 in the same database; works in "LGU A".
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.ga() returns text language sql as $$
  select id from public.ddrive_governance_assessments where assessment_year = 2026 limit 1
$$;
create or replace function tests.plan(p_title text) returns text language sql as $$ select id from public.ddrive_plans where title = p_title $$;
create or replace function tests.ex(p_title text) returns text language sql as $$ select id from public.ddrive_exercises where title = p_title $$;
create or replace function tests.chk(p_statement text) returns text language sql as $$ select id from public.ddrive_exercise_checks where statement = p_statement $$;
create or replace function tests.form(p_title text) returns text language sql as $$ select id from public.ddrive_form_records where title = p_title $$;
grant execute on function tests.ga(), tests.plan(text), tests.ex(text), tests.chk(text), tests.form(text) to authenticated;

-- ─── Reference data ──────────────────────────────────────────────────────────
select tests.eq('The toolkit''s 32 indicators are loaded', $q$ select count(*)::text from public.ddrive_gk_items $q$, '32');
select tests.eq('in six sections whose weights add up to 1', $q$ select count(*) || ' ' || sum(weight) from public.ddrive_gk_sections $q$, '6 1.00');
select tests.eq('Competency has 15 scored items (2.4 counts four times)', $q$ select count(*)::text from public.ddrive_gk_items where section = 'competency' $q$, '15');
select tests.eq('The NDRRMP 2020-2030 has 50 outputs across 23 outcomes', $q$ select count(*) || ' ' || count(distinct outcome) from public.ddrive_ndrrmp_outputs $q$, '50 23');
select tests.eq('Outcomes 13-16 are Response', $q$ select string_agg(distinct drrm_area, ',') from public.ddrive_ndrrmp_outputs where outcome between 13 and 16 $q$, 'response');

-- ─── Gawad KALASAG self-assessment ───────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot start an assessment', $q$ insert into public.ddrive_governance_assessments (assessment_year, lgu_level) values (2026, 'province') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst starts the 2026 assessment, claiming it is final', $q$ insert into public.ddrive_governance_assessments (assessment_year, lgu_level, status) values (2026, 'province', 'final') $q$);
select tests.eq('It starts as a draft with a G- reference', $q$ select status || ' ' || ref from public.ddrive_governance_assessments where id = tests.ga() $q$, 'draft G-001');
select tests.refused('One assessment per year', $q$ insert into public.ddrive_governance_assessments (assessment_year, lgu_level) values (2026, 'city_municipality') $q$);
select tests.refused('A score above 3 is refused', $q$ insert into public.ddrive_governance_ratings (assessment_id, item_code, score) values (tests.ga(), '1.1', 4) $q$);
select tests.refused('An indicator outside the toolkit is refused', $q$ insert into public.ddrive_governance_ratings (assessment_id, item_code, score) values (tests.ga(), '9.9', 2) $q$);
-- Structure 3, Competency 2, Management Systems 2, Enabling Policies 1, KMA 3, Partnership 3 (all but one item).
select tests.ok('The analyst rates 31 indicators with their evidence', $q$
  insert into public.ddrive_governance_ratings (assessment_id, item_code, score, evidence)
  select tests.ga(), code, case section when 'structure' then 3 when 'competency' then 2 when 'management_systems' then 2
    when 'enabling_policies' then 1 else 3 end, 'MOV on file'
  from public.ddrive_gk_items where code <> '6.2' $q$);
select tests.eq('No weighted mean while an indicator is unrated', $q$ select coalesce(max(weighted_mean)::text, 'none') || ' ' || max(total_rated) from public.ddrive_governance_scores where assessment_id = tests.ga() $q$, 'none 31');
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Finalising needs every indicator rated', $q$ select public.ddrive_governance_finalise(tests.ga()) $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('The last indicator is rated', $q$ insert into public.ddrive_governance_ratings (assessment_id, item_code, score) values (tests.ga(), '6.2', 3) $q$);
select tests.eq('The weighted mean follows the toolkit: 3(0.25)+2(0.35)+2(0.15)+1(0.05)+3(0.1)+3(0.1) = 2.40, Silver',
  $q$ select max(weighted_mean) || ' ' || public.ddrive_gk_band(max(weighted_mean)) from public.ddrive_governance_scores where assessment_id = tests.ga() $q$, '2.40 Silver Recognition');
select tests.refused('An analyst cannot finalise', $q$ select public.ddrive_governance_finalise(tests.ga()) $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Finalising needs the six minimum requirements answered', $q$ select public.ddrive_governance_finalise(tests.ga()) $q$);
select tests.ok('The officer answers them', $q$ update public.ddrive_governance_assessments set min_requirements =
  '{"ldrrmc": true, "non_state_members": true, "ldrrmo": true, "ldrrm_officer": true, "operations_center": true, "ldrrmp": false}' where id = tests.ga() $q$);
select tests.eq('and finalises the assessment', $q$ select public.ddrive_governance_finalise(tests.ga()) $q$, 'final');
select tests.refused('A final assessment''s ratings are frozen', $q$ update public.ddrive_governance_ratings set score = 0 where assessment_id = tests.ga() and item_code = '1.1' $q$);
select tests.eq('Bands: 2.5 Gold, 1.5 Bronze, 0.49 Non-Compliant', $q$ select public.ddrive_gk_band(2.5) || ', ' || public.ddrive_gk_band(1.5) || ', ' || public.ddrive_gk_band(0.49) $q$,
  'Gold Recognition, Bronze Recognition, Non-Compliant');
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of it', $q$ select count(*)::text from public.ddrive_governance_ratings $q$, '0');
reset role;

-- ─── Risk mainstreaming ──────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst carries a priority risk into the CLUP, with the CDRA decision-area analysis', $q$
  insert into public.ddrive_mainstreaming (risk_id, instrument, instrument_ref, decision_area, technical_findings, implications, policy_intervention)
  values (tests.a_risk('EOC loses power in a typhoon'), 'clup', 'CLUP 2024-2032', 'City hall compound', 'Within the 5-year flood zone',
          'EOC offline in a typhoon', 'Relocate critical facilities above the 100-year flood level') $q$);
select tests.refused('A policy intervention is required', $q$ insert into public.ddrive_mainstreaming (risk_id, instrument, policy_intervention) values (tests.a_risk('EOC loses power in a typhoon'), 'aip', 'x') $q$);
select tests.refused('An unknown instrument is refused', $q$ insert into public.ddrive_mainstreaming (risk_id, instrument, policy_intervention) values (tests.a_risk('EOC loses power in a typhoon'), 'wish_list', 'Something useful') $q$);
select tests.refused('Another organisation''s risk cannot be mainstreamed here', $q$ insert into public.ddrive_mainstreaming (risk_id, instrument, policy_intervention) values (tests.b_risk_id(), 'aip', 'Something useful') $q$);
select tests.refused('An analyst cannot record the adoption', $q$ update public.ddrive_mainstreaming set status = 'adopted', adoption_ref = 'SP Res 1' where instrument = 'clup' $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Adoption needs its reference', $q$ update public.ddrive_mainstreaming set status = 'adopted' where instrument = 'clup' $q$);
select tests.ok('The officer records the adoption with the ordinance number', $q$ update public.ddrive_mainstreaming set status = 'adopted', adoption_ref = 'Ordinance No. 2026-14' where instrument = 'clup' $q$);
select tests.refused('An adopted entry is a record and cannot change', $q$ update public.ddrive_mainstreaming set policy_intervention = 'Something else entirely' where instrument = 'clup' $q$);
select tests.eq('The risk shows where it is embedded and what is funded', $q$
  select instruments_adopted || ' ' || array_to_string(adopted_in, ',') || ' ' || actions_approved from public.ddrive_risk_integration where risk_id = tests.a_risk('EOC loses power in a typhoon') $q$, '1 clup 1');
reset role;

-- ─── Budget lines aligned with the NDRRMP ────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('A budget line can name the NDRRMP output it serves', $q$
  insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php, ndrrmp_output) values (2027, 'ldrrmf_70', 'preparedness', 'EOC equipment', 800000, '12.1') $q$);
select tests.refused('An output not in the NDRRMP is refused', $q$
  insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php, ndrrmp_output) values (2027, 'ldrrmf_70', 'preparedness', 'Mystery', 1, '99.9') $q$);
select tests.eq('The status view carries it', $q$ select ndrrmp_output from public.ddrive_budget_line_status where title = 'EOC equipment' $q$, '12.1');

-- ─── Plans from templates ────────────────────────────────────────────────────
select tests.ok('An analyst drafts an LDRRMP from the template', $q$
  insert into public.ddrive_plans (title, type, standard, template_key, period_from, period_to, content)
  values ('LDRRMP 2026-2031', 'DRRM', 'NDRRMC Memo 147 s. 2017', 'ldrrmp', 2026, 2031, '{"risk_profile": {"hazard": "Typhoon, flood"}}') $q$);
select tests.ok('and a typhoon contingency plan', $q$
  insert into public.ddrive_plans (title, type, standard, template_key, hazard) values ('Typhoon contingency plan 2026', 'Contingency', 'JMC 1 s. 2016', 'contingency_plan', 'Tropical cyclone') $q$);
select tests.refused('An unknown template is refused', $q$ insert into public.ddrive_plans (title, template_key) values ('Plan X', 'astrology') $q$);
select tests.refused('A period that ends before it starts is refused', $q$ insert into public.ddrive_plans (title, template_key, period_from, period_to) values ('Plan Y', 'ldrrmp', 2030, 2026) $q$);
select tests.ok('The draft is edited', $q$ update public.ddrive_plans set content = content || '{"thematic": {"preparedness": "Stockpile 500 packs"}}' where id = tests.plan('LDRRMP 2026-2031') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A template plan is not approved without its adopting resolution', $q$ update public.ddrive_plans set status = 'Approved' where id = tests.plan('LDRRMP 2026-2031') $q$);
select tests.ok('The officer approves it with the resolution', $q$ update public.ddrive_plans set status = 'Approved', adoption_ref = 'SP Resolution No. 30, s. 2026' where id = tests.plan('LDRRMP 2026-2031') $q$);
select tests.refused('An approved plan''s content is locked', $q$ update public.ddrive_plans set content = '{}' where id = tests.plan('LDRRMP 2026-2031') $q$);
reset role;

-- ─── Forms ───────────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder files an initial report', $q$ insert into public.ddrive_form_records (form_key, title, data) values ('initial_report', 'Initial report: Brgy. 5 flooding', '{"what": "Flooding"}') $q$);
select tests.refused('but not a plan review', $q$ insert into public.ddrive_form_records (form_key, title, plan_id) values ('ldrrmp_review', 'Review', tests.plan('LDRRMP 2026-2031')) $q$);
select tests.eq('and finalises the report', $q$ with u as (update public.ddrive_form_records set status = 'final' where title = 'Initial report: Brgy. 5 flooding' returning status) select status from u $q$, 'final');
select tests.refused('A final form cannot change', $q$ update public.ddrive_form_records set data = '{}' where title = 'Initial report: Brgy. 5 flooding' $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst records the Memo 147 review of the LDRRMP', $q$ insert into public.ddrive_form_records (form_key, title, plan_id, data)
  values ('ldrrmp_review', 'Review of LDRRMP 2026-2031', tests.plan('LDRRMP 2026-2031'), '{"criteria": {"contents": true, "approved": true, "aligned": true, "appropriate": true}}') $q$);
select tests.refused('An unknown form is refused', $q$ insert into public.ddrive_form_records (form_key, title) values ('tax_return', 'Taxes') $q$);
select tests.refused('An analyst cannot finalise the review', $q$ update public.ddrive_form_records set status = 'final' where id = tests.form('Review of LDRRMP 2026-2031') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('The officer finalises it', $q$ update public.ddrive_form_records set status = 'final' where id = tests.form('Review of LDRRMP 2026-2031') $q$);
reset role;

-- ─── Exercises ───────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot plan an exercise', $q$ insert into public.ddrive_exercises (title, exercise_type) values ('Nope', 'drill') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst plans a tabletop exercise of the contingency plan, claiming it is already evaluated', $q$
  insert into public.ddrive_exercises (title, exercise_type, plan_id, hazard, scenario, status, scheduled_on)
  values ('TTX: Typhoon Signal No. 3', 'tabletop', tests.plan('Typhoon contingency plan 2026'), 'Tropical cyclone', 'Signal No. 3 in 24 hours', 'evaluated', current_date + 7) $q$);
select tests.eq('It starts as planned with an X- reference', $q$ select status || ' ' || ref from public.ddrive_exercises where id = tests.ex('TTX: Typhoon Signal No. 3') $q$, 'planned X-001');
select tests.refused('It cannot be recorded as conducted before it tests something', $q$ select public.ddrive_exercise_conducted(tests.ex('TTX: Typhoon Signal No. 3'), current_date) $q$);
select tests.ok('The analyst adds what it tests', $q$
  insert into public.ddrive_exercise_checks (exercise_id, sort, kind, statement, expected, source) values
  (tests.ex('TTX: Typhoon Signal No. 3'), 1, 'capability', 'Initial report within two hours', 'Initial report submitted by H+2', 'RDRRMOC SOPG 2022'),
  (tests.ex('TTX: Typhoon Signal No. 3'), 2, 'assumption', 'Evacuation centres hold 1,200 families', 'Capacity confirmed by CSWDO', 'Contingency plan'),
  (tests.ex('TTX: Typhoon Signal No. 3'), 3, 'coordination', 'EOC and ICP are not co-located', 'Separate locations', 'NDRRMC Memo 131 s. 2018, 9.2.5.3') $q$);
select tests.refused('Results are not rated before the exercise is held', $q$ update public.ddrive_exercise_checks set result = 'met' where id = tests.chk('Initial report within two hours') $q$);
select tests.refused('A future date is refused', $q$ select public.ddrive_exercise_conducted(tests.ex('TTX: Typhoon Signal No. 3'), current_date + 1) $q$);
select tests.eq('The analyst records it as conducted', $q$ select public.ddrive_exercise_conducted(tests.ex('TTX: Typhoon Signal No. 3'), current_date) $q$, 'conducted');
select tests.refused('What was tested cannot change afterwards', $q$ update public.ddrive_exercise_checks set statement = 'Initial report within six hours' where id = tests.chk('Initial report within two hours') $q$);
select tests.ok('The observations are recorded', $q$ update public.ddrive_exercise_checks set observed = 'Report sent at H+3', result = 'not_met' where id = tests.chk('Initial report within two hours') $q$);
select tests.ok('The assumption held', $q$ update public.ddrive_exercise_checks set observed = 'Capacity confirmed', result = 'met' where id = tests.chk('Evacuation centres hold 1,200 families') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Evaluation needs every check rated', $q$ select public.ddrive_exercise_evaluate(tests.ex('TTX: Typhoon Signal No. 3'), 'A long enough summary of the exercise.') $q$);
select tests.ok('The coordination check is rated', $q$ update public.ddrive_exercise_checks set observed = 'ICP at the barangay hall', result = 'met' where id = tests.chk('EOC and ICP are not co-located') $q$);
select tests.refused('and a recommendation for every gap', $q$ select public.ddrive_exercise_evaluate(tests.ex('TTX: Typhoon Signal No. 3'), 'A long enough summary of the exercise.') $q$);
select tests.ok('The gap gets a recommendation', $q$ update public.ddrive_exercise_checks set recommendation = 'Pre-fill the initial report template; assign a reporting officer per shift' where id = tests.chk('Initial report within two hours') $q$);
select tests.refused('and the evaluation a real summary', $q$ select public.ddrive_exercise_evaluate(tests.ex('TTX: Typhoon Signal No. 3'), 'ok') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An analyst cannot close the evaluation', $q$ select public.ddrive_exercise_evaluate(tests.ex('TTX: Typhoon Signal No. 3'), 'Reporting was late; coordination worked as planned.') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.eq('The DRRM officer closes the evaluation', $q$ select public.ddrive_exercise_evaluate(tests.ex('TTX: Typhoon Signal No. 3'), 'Reporting was late; coordination worked as planned.') $q$, 'evaluated');
select tests.refused('A closed exercise cannot change', $q$ update public.ddrive_exercise_checks set observed = 'rewritten' where id = tests.chk('EOC and ICP are not co-located') $q$);
select tests.eq('The plan shows when it was last tested and the gaps found', $q$
  select (last_tested_on = current_date)::text || ' ' || exercises_evaluated || ' ' || gaps_found from public.ddrive_plan_test_status where plan_id = tests.plan('Typhoon contingency plan 2026') $q$, 'true 1 1');
reset role;

-- ─── Improvement actions from exercise gaps ──────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot propose an improvement action from an exercise', $q$
  insert into public.ddrive_response_actions (title, origin, exercise_check_id, strategy, drrm_area) values ('Fix reporting', 'validation', tests.chk('Initial report within two hours'), 'reduce_consequences', 'preparedness') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst proposes the improvement for the gap', $q$
  insert into public.ddrive_response_actions (title, origin, exercise_check_id, strategy, drrm_area) values ('Assign a reporting officer per EOC shift', 'validation', tests.chk('Initial report within two hours'), 'reduce_consequences', 'preparedness') $q$);
select tests.eq('It waits for a decision like any other action', $q$ select status || ' ' || origin from public.ddrive_response_actions where title = 'Assign a reporting officer per EOC shift' $q$, 'proposed validation');
select tests.refused('A finding that was met needs no improvement action', $q$
  insert into public.ddrive_response_actions (title, origin, exercise_check_id, strategy, drrm_area) values ('Gold-plate it', 'validation', tests.chk('EOC and ICP are not co-located'), 'retain', 'preparedness') $q$);
select tests.refused('An improvement action must name its finding', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area) values ('Vague improvement', 'validation', 'retain', 'preparedness') $q$);
select tests.refused('Other actions cannot name an exercise finding', $q$
  insert into public.ddrive_response_actions (title, origin, exercise_check_id, strategy, drrm_area) values ('Sneaky', 'manual', tests.chk('Initial report within two hours'), 'retain', 'preparedness') $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees no exercises, checks or forms', $q$
  select (select count(*) from public.ddrive_exercises) + (select count(*) from public.ddrive_exercise_checks) + (select count(*) from public.ddrive_form_records) || '' $q$, '0');
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select 1 / count(*) from public.ddrive_exercises $q$);
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
