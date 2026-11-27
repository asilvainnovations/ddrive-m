-- Graduated disbursement under the IRR of RA 12287 (Rule V, s. 1(b) and 2). Requirement AA-02, test AT-016.
-- Runs after 60_phase3_detection_sources.sql in the same database; uses organisation "Enterprise B".
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.b_case(p_title text) returns text language sql as $$
  select id from public.ddrive_aa_cases where title = p_title
$$;
create or replace function tests.b_action(p_desc text) returns text language sql as $$
  select id from public.ddrive_aa_actions where description = p_desc
$$;
grant execute on function tests.b_case(text), tests.b_action(text) to authenticated;

-- Organisation B gets an analyst, working in B.
select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('B''s administrator adds an analyst', $q$ select public.ddrive_add_member((select id from public.ddrive_tenants where name = 'Enterprise B'), 'responder@a.ph', 'analyst') $q$);
reset role;
update public.ddrive_users set active_tenant_id = (select id from public.ddrive_tenants where name = 'Enterprise B') where email in ('responder@a.ph', 'admin@b.ph');

-- ─── The rules are data, readable and not editable ───────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('The active rule set is the 2026 IRR, with its limits', $q$
  select code || ' ' || ldrrmf_aa_ceiling_share || ' ' || beyond_lead_share_max || ' ' || within_lead_share_max || ' ' || lead_threshold_hours
  from public.ddrive_aa_rules() $q$, 'IRR-RA12287-2026 0.0700 0.3000 0.7000 72');
select tests.refused('Nobody can change the rules from the app', $q$ update public.ddrive_aa_rule_sets set beyond_lead_share_max = 0.9 $q$);

-- ─── Allocations (Rule V s. 1(b)) ────────────────────────────────────────────
select tests.refused('An analyst cannot record an allocation', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, annual_ldrrmf_php, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ldrrmf', 10000000, 700000, 'LDRRMF Investment Plan 2026') $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.refused('More than 10% of the 70% of the annual LDRRMF is refused', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, annual_ldrrmf_php, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ldrrmf', 10000000, 700000.01, 'LDRRMF Investment Plan 2026') $q$);
select tests.refused('An LDRRMF allocation needs the annual LDRRMF', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ldrrmf', 500000, 'LDRRMF Investment Plan 2026') $q$);
select tests.refused('An allocation needs its basis', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, annual_ldrrmf_php, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ldrrmf', 10000000, 700000, 'trust me') $q$);
select tests.ok('Exactly 7% of a PHP 10,000,000 LDRRMF is accepted', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, annual_ldrrmf_php, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ldrrmf', 10000000, 700000, 'LDRRMF Investment Plan 2026, SP Resolution No. 2026-14') $q$);
select tests.refused('One LDRRMF allocation per year', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, annual_ldrrmf_php, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ldrrmf', 10000000, 100000, 'Supplemental budget No. 1, 2026') $q$);
select tests.ok('An NDRRM Fund augmentation is recorded with its approval', $q$
  insert into public.ddrive_aa_allocations (fiscal_year, fund_source, allocation_php, basis)
  values (extract(year from now() at time zone 'Asia/Manila')::int, 'ndrrmf', 100000, 'NDRRMF augmentation approved by the Office of the President, SARO 2026-0001') $q$);
reset role;

-- ─── A declared typhoon case ─────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('The analyst opens a typhoon case, onset in 5 days', $q$
  insert into public.ddrive_aa_cases (title, hazard, areas, forecast_source, forecast_issued_at, expected_onset)
  values ('Typhoon Bising', 'tropical_cyclone', 'Coastal barangays', 'PAGASA Tropical Cyclone Bulletin No. 3', now(), now() + interval '5 days') $q$);
select tests.ok('The assessment meets both section 6 conditions', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.b_case('Typhoon Bising'), 'severe', true, true, 'PAGASA track and storm surge outlook; exposure from the 2020 census', 'declare') $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Recommended', $q$ select public.ddrive_aa_recommend(tests.b_case('Typhoon Bising'), 'Regional DRRM Council VIII') $q$, 'recommended');
select tests.eq('Declared', $q$ select public.ddrive_aa_record_declaration(tests.b_case('Typhoon Bising'), 'Hon. B. Cruz', 'Municipal Mayor', 'EO 2026-7', now()) $q$, 'declared');
reset role;

select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('Pre-positioning relief now, about 5 days before onset (LDRRMF)', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, fund_source, amount_php, implement_by)
  values (tests.b_case('Typhoon Bising'), 'preposition_relief', 'Relief packs to evacuation centres', 'ldrrmf', 300000, now() + interval '1 hour') $q$);
select tests.ok('Pre-emptive evacuation one day before onset (LDRRMF)', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, fund_source, amount_php, implement_by)
  values (tests.b_case('Typhoon Bising'), 'preemptive_evacuation', 'Evacuate barangays 1 to 6', 'ldrrmf', 600000, now() + interval '4 days') $q$);
select tests.ok('An advisory funded by a donor grant', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, fund_source, amount_php, implement_by)
  values (tests.b_case('Typhoon Bising'), 'public_advisory', 'Radio advisories, donor funded', 'grant_donation', 1000000, now()) $q$);
select tests.ok('Volunteers from the LDRRMF, implementation time not yet known', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, fund_source, amount_php)
  values (tests.b_case('Typhoon Bising'), 'volunteers', 'Mobilise accredited volunteers', 'ldrrmf', 100000) $q$);
select tests.ok('Rescue boats from unexpended LDRRMF in the Special Trust Fund', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, fund_source, amount_php)
  values (tests.b_case('Typhoon Bising'), 'preposition_teams', 'Rescue boats on standby', 'ldrrmf_special_trust_fund', 50000) $q$);
select tests.eq('Each measure gets its lead-time band from the expected onset', $q$
  select string_agg(measure || '=' || coalesce(lead_band, 'unknown'), ' ' order by measure) from public.ddrive_aa_actions where case_id = tests.b_case('Typhoon Bising') $q$,
  'preemptive_evacuation=within_3_days preposition_relief=beyond_3_days preposition_teams=not_graduated public_advisory=not_graduated volunteers=unknown');
reset role;

-- ─── Disbursement limits (Rule V s. 2) ───────────────────────────────────────
select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('Up to 30% of the allocation for interventions more than 3 days ahead (PHP 210,000)', $q$
  update public.ddrive_aa_actions set disbursed_php = 210000 where id = tests.b_action('Relief packs to evacuation centres') $q$);
select tests.refused('One peso more beyond 3 days is refused', $q$
  update public.ddrive_aa_actions set disbursed_php = 210000.01 where id = tests.b_action('Relief packs to evacuation centres') $q$);
select tests.ok('Up to 70% for interventions within 3 days (PHP 490,000)', $q$
  update public.ddrive_aa_actions set disbursed_php = 490000 where id = tests.b_action('Evacuate barangays 1 to 6') $q$);
select tests.refused('One peso more within 3 days is refused', $q$
  update public.ddrive_aa_actions set disbursed_php = 490000.01 where id = tests.b_action('Evacuate barangays 1 to 6') $q$);
select tests.refused('An LDRRMF disbursement without an implementation time is refused', $q$
  update public.ddrive_aa_actions set disbursed_php = 1000 where id = tests.b_action('Mobilise accredited volunteers') $q$);
select tests.ok('A donor grant is not graduated and needs no allocation', $q$
  update public.ddrive_aa_actions set disbursed_php = 900000 where id = tests.b_action('Radio advisories, donor funded') $q$);
select tests.ok('Unexpended LDRRMF in the Special Trust Fund is not graduated', $q$
  update public.ddrive_aa_actions set disbursed_php = 50000 where id = tests.b_action('Rescue boats on standby') $q$);
select tests.refused('After a disbursement, the implementation time cannot be moved to another band', $q$
  update public.ddrive_aa_actions set implement_by = now() + interval '4 days' where id = tests.b_action('Relief packs to evacuation centres') $q$);
select tests.refused('After a disbursement, the fund source cannot change', $q$
  update public.ddrive_aa_actions set fund_source = 'grant_donation' where id = tests.b_action('Relief packs to evacuation centres') $q$);
select tests.refused('The allocation cannot be reduced below what was disbursed', $q$
  update public.ddrive_aa_allocations set allocation_php = 600000 where fund_source = 'ldrrmf' $q$);
select tests.eq('The allocation status shows each band against its limit', $q$
  select beyond_cap_php || '/' || beyond_disbursed_php || ' ' || within_cap_php || '/' || within_disbursed_php || ' ' || total_disbursed_php
  from public.ddrive_aa_allocation_status where fund_source = 'ldrrmf' $q$, '210000.00/210000.00 490000.00/490000.00 700000.00');
reset role;

-- ─── Slow-onset hazards: operational guidelines govern ───────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('The analyst opens a drought case', $q$
  insert into public.ddrive_aa_cases (title, hazard, areas, forecast_source, forecast_issued_at, expected_onset)
  values ('Drought watch', 'drought', 'Upland barangays', 'PAGASA El Niño advisory No. 2', now(), now() + interval '30 days') $q$);
select tests.ok('Assessed for a declaration', $q$
  insert into public.ddrive_aa_assessments (case_id, severity_class, severe_condition_met, lead_time_condition_met, basis, recommendation)
  values (tests.b_case('Drought watch'), 'severe', true, true, 'PAGASA drought outlook; crop calendar and irrigation data', 'declare') $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Drought case recommended', $q$ select public.ddrive_aa_recommend(tests.b_case('Drought watch'), 'Regional DRRM Council VIII') $q$, 'recommended');
select tests.eq('Drought case declared', $q$ select public.ddrive_aa_record_declaration(tests.b_case('Drought watch'), 'Hon. B. Cruz', 'Municipal Mayor', 'EO 2026-9', now()) $q$, 'declared');
select tests.ok('A water-trucking measure from the NDRRM Fund augmentation', $q$
  insert into public.ddrive_aa_actions (case_id, measure, description, fund_source, amount_php)
  values (tests.b_case('Drought watch'), 'agri_food_contingency', 'Water trucking to farms', 'ndrrmf', 80000) $q$);
select tests.refused('A slow-onset disbursement must cite the operational guidelines', $q$
  update public.ddrive_aa_actions set disbursed_php = 40000 where id = tests.b_action('Water trucking to farms') $q$);
select tests.ok('With the guideline cited, it is accepted', $q$
  update public.ddrive_aa_actions set slow_onset_basis = 'NDRRMC operational guidelines on drought AA, Memo No. ___ s. 2026', disbursed_php = 40000
  where id = tests.b_action('Water trucking to farms') $q$);
select tests.refused('Never more than the allocation, even for slow-onset hazards', $q$
  update public.ddrive_aa_actions set amount_php = 200000, disbursed_php = 100000.01 where id = tests.b_action('Water trucking to farms') $q$);
reset role;

-- ─── Others ──────────────────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('Another organisation sees none of B''s allocations', $q$ select count(*)::text from public.ddrive_aa_allocation_status where fund_source = 'ndrrmf' $q$, '0');
reset role;
select tests.eq('Allocations are in the audit log', $q$ select (count(*) >= 2)::text from public.ddrive_audit_log where table_name = 'ddrive_aa_allocations' $q$, 'true');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
