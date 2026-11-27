-- Actions linked to incidents and funded from DRRM budget lines (ADR-009).
-- Runs after 80_phase3_response_actions.sql in the same database; works in "LGU A".
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.line(p_title text) returns text language sql as $$
  select id from public.ddrive_budget_lines where title = p_title
$$;
create or replace function tests.inc(p_title text) returns text language sql as $$
  select id from public.ddrive_incidents where title = p_title
$$;
-- Reads another organisation's ids past RLS, so the functions' own checks are what is tested.
create or replace function tests.b_incident() returns text language sql security definer as $$
  select i.id from public.ddrive_incidents i join public.ddrive_tenants t on t.id = i.tenant_id where t.name <> 'LGU A' limit 1
$$;
create or replace function tests.b_line() returns text language sql security definer as $$
  select id from public.ddrive_budget_lines where title = 'B warehouse fund'
$$;
grant execute on function tests.line(text), tests.inc(text), tests.b_incident(), tests.b_line() to authenticated;

-- Organisation B's incident and budget line, for the cross-organisation checks.
select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('Organisation B opens an incident', $q$ insert into public.ddrive_incidents (title, priority, status, progress) values ('B warehouse flooding', 'High', 'Open', 0) $q$);
select tests.ok('Organisation B adds a budget line', $q$ insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php) values (2026, 'other', 'preparedness', 'B warehouse fund', 1000000) $q$);
reset role;

-- ─── Incidents ───────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder opens an incident', $q$ insert into public.ddrive_incidents (title, priority, status, progress) values ('Typhoon Bising: river barangays', 'Critical', 'Open', 0) $q$);
select tests.ok('and proposes an action for it, from the incident', $q$
  insert into public.ddrive_response_actions (title, origin, incident_id, strategy, drrm_area, cost_php)
  values ('Run the evacuation shuttle', 'manual', tests.inc('Typhoon Bising: river barangays'), 'reduce_consequences', 'response', 120000) $q$);
select tests.eq('The action carries the incident', $q$
  select (incident_id = tests.inc('Typhoon Bising: river barangays'))::text from public.ddrive_response_actions where title = 'Run the evacuation shuttle' $q$, 'true');
select tests.refused('An action cannot name another organisation''s incident', $q$
  insert into public.ddrive_response_actions (title, origin, incident_id, strategy, drrm_area) values ('Foreign help', 'manual', tests.b_incident(), 'share', 'response') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst proposes sandbags, with a cost', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area, cost_php) values ('Stockpile sandbags', 'manual', 'reduce_consequences', 'preparedness', 300000) $q$);
select tests.ok('and fuel for the generators, with a cost', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area, cost_php) values ('Generator fuel reserve', 'manual', 'reduce_consequences', 'preparedness', 20000) $q$);
select tests.ok('and a drainage study, with no cost yet', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area) values ('Drainage study', 'manual', 'reduce_likelihood', 'prevention_mitigation') $q$);
select tests.refused('The incident link cannot be changed by a plain update', $q$
  update public.ddrive_response_actions set incident_id = tests.inc('Typhoon Bising: river barangays') where id = tests.act('Stockpile sandbags') $q$);
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.refused('A viewer cannot link an action to an incident', $q$ select public.ddrive_response_link_incident(tests.act('Stockpile sandbags'), tests.inc('Typhoon Bising: river barangays')) $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A responder links the sandbags to the incident', $q$ select public.ddrive_response_link_incident(tests.act('Stockpile sandbags'), tests.inc('Typhoon Bising: river barangays')) $q$);
select tests.refused('but not to another organisation''s incident', $q$ select public.ddrive_response_link_incident(tests.act('Stockpile sandbags'), tests.b_incident()) $q$);
select tests.eq('The incident has two actions', $q$ select count(*)::text from public.ddrive_response_actions where incident_id = tests.inc('Typhoon Bising: river barangays') $q$, '2');
reset role;

-- ─── Budget lines ────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot add a budget line', $q$ insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php) values (2026, 'ldrrmf_70', 'preparedness', 'Nope', 1) $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('An analyst drafts an LDRRMF 70% preparedness line, claiming it is approved', $q$
  insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, aip_code, amount_php, status)
  values (2026, 'ldrrmf_70', 'preparedness', 'Prepositioning of relief and flood-fighting supplies', '9990-000-1-01', 350000, 'approved') $q$);
select tests.eq('It starts as a draft with a B- reference', $q$ select status || ' ' || ref from public.ddrive_budget_lines where title = 'Prepositioning of relief and flood-fighting supplies' $q$, 'draft B-001');
select tests.ok('and a Quick Response Fund line', $q$
  insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php) values (2026, 'ldrrmf_qrf_30', 'response', 'QRF: relief operations', 500000) $q$);
select tests.refused('An amount must be positive', $q$ insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php) values (2026, 'gad', 'response', 'Zero', 0) $q$);
select tests.refused('An unknown fund source is refused', $q$ insert into public.ddrive_budget_lines (fiscal_year, fund_source, drrm_area, title, amount_php) values (2026, 'petty_cash', 'response', 'Cash', 10) $q$);
select tests.ok('A draft can be edited', $q$ update public.ddrive_budget_lines set amount_php = 400000 where id = tests.line('Prepositioning of relief and flood-fighting supplies') $q$);
select tests.refused('The status cannot be set directly', $q$ update public.ddrive_budget_lines set status = 'approved' where id = tests.line('Prepositioning of relief and flood-fighting supplies') $q$);
select tests.refused('An analyst cannot approve a line', $q$ select public.ddrive_budget_approve(tests.line('Prepositioning of relief and flood-fighting supplies'), 'SP Resolution 12-2026') $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Approving needs the basis', $q$ select public.ddrive_budget_approve(tests.line('Prepositioning of relief and flood-fighting supplies'), '') $q$);
select tests.eq('The DRRM officer approves the line, citing the resolution', $q$ select public.ddrive_budget_approve(tests.line('Prepositioning of relief and flood-fighting supplies'), 'SP Resolution No. 12, s. 2026 (AIP)') $q$, 'approved');
select tests.eq('and the QRF line', $q$ select public.ddrive_budget_approve(tests.line('QRF: relief operations'), 'SP Resolution No. 12, s. 2026 (AIP)') $q$, 'approved');
select tests.refused('Another organisation''s line cannot be approved here', $q$ select public.ddrive_budget_approve(tests.b_line(), 'Not ours at all') $q$);
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An approved line is fixed', $q$ update public.ddrive_budget_lines set amount_php = 9000000 where id = tests.line('Prepositioning of relief and flood-fighting supplies') $q$);
reset role;

-- ─── Funding ─────────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('A proposal that names a budget line is accepted', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area, budget_line_id)
  values ('Self-funded', 'manual', 'retain', 'response', tests.line('QRF: relief operations')) $q$);
select tests.eq('but arrives unfunded: funding is a decision', $q$ select coalesce(budget_line_id, 'none') from public.ddrive_response_actions where title = 'Self-funded' $q$, 'none');
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A proposal not yet approved cannot be funded', $q$ select public.ddrive_response_fund(tests.act('Stockpile sandbags'), tests.line('Prepositioning of relief and flood-fighting supplies')) $q$);
select tests.eq('The officer approves the sandbags', $q$ select public.ddrive_response_decide(tests.act('Stockpile sandbags'), true, null) $q$, 'approved');
select tests.eq('the fuel reserve', $q$ select public.ddrive_response_decide(tests.act('Generator fuel reserve'), true, null) $q$, 'approved');
select tests.eq('the drainage study', $q$ select public.ddrive_response_decide(tests.act('Drainage study'), true, null) $q$, 'approved');
select tests.eq('and the shuttle', $q$ select public.ddrive_response_decide(tests.act('Run the evacuation shuttle'), true, null) $q$, 'approved');
select tests.refused('An action without an estimated cost cannot be funded', $q$ select public.ddrive_response_fund(tests.act('Drainage study'), tests.line('Prepositioning of relief and flood-fighting supplies')) $q$);
select tests.refused('The QRF does not fund preparedness', $q$ select public.ddrive_response_fund(tests.act('Stockpile sandbags'), tests.line('QRF: relief operations')) $q$);
select tests.refused('Another organisation''s line cannot fund our action', $q$ select public.ddrive_response_fund(tests.act('Stockpile sandbags'), tests.b_line()) $q$);
select tests.eq('The officer funds the sandbags from the 70% line', $q$ select public.ddrive_response_fund(tests.act('Stockpile sandbags'), tests.line('Prepositioning of relief and flood-fighting supplies')) $q$, 'B-001');
select tests.eq('The line shows PHP 300,000 committed and PHP 100,000 available', $q$
  select committed_php || ' ' || available_php || ' ' || action_count from public.ddrive_budget_line_status where title = 'Prepositioning of relief and flood-fighting supplies' $q$, '300000.00 100000.00 1');
select tests.refused('A line cannot be committed beyond its amount', $q$ select public.ddrive_response_fund(tests.act('Run the evacuation shuttle'), tests.line('Prepositioning of relief and flood-fighting supplies')) $q$);
select tests.eq('The QRF funds the evacuation shuttle (response)', $q$ select public.ddrive_response_fund(tests.act('Run the evacuation shuttle'), tests.line('QRF: relief operations')) $q$, 'B-002');
select tests.refused('Funding cannot be changed by a plain update, even by the officer', $q$ update public.ddrive_response_actions set budget_line_id = null where id = tests.act('Stockpile sandbags') $q$);
select tests.eq('Funding is stamped with who and when', $q$ select (funded_by is not null and funded_at is not null)::text from public.ddrive_response_actions where id = tests.act('Stockpile sandbags') $q$, 'true');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An analyst cannot fund an action', $q$ select public.ddrive_response_fund(tests.act('Run the evacuation shuttle'), null) $q$);
select tests.refused('An approved line cannot be deleted', $q$
  with d as (delete from public.ddrive_budget_lines where id = tests.line('Prepositioning of relief and flood-fighting supplies') returning 1) select 1 / count(*) from d $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.eq('The officer cancels the shuttle', $q$ select public.ddrive_response_cancel(tests.act('Run the evacuation shuttle'), 'Barangay buses deployed instead') $q$, 'cancelled');
select tests.eq('A cancelled action no longer counts against its line', $q$ select committed_php::text from public.ddrive_budget_line_status where title = 'QRF: relief operations' $q$, '0.00');
select tests.refused('A cancelled action cannot be linked to an incident', $q$ select public.ddrive_response_link_incident(tests.act('Run the evacuation shuttle'), null) $q$);
select tests.eq('The officer removes the sandbag funding', $q$ select public.ddrive_response_fund(tests.act('Stockpile sandbags'), null) $q$, 'unfunded');
select tests.eq('The officer funds it again and closes the line', $q$
  select public.ddrive_response_fund(tests.act('Stockpile sandbags'), tests.line('Prepositioning of relief and flood-fighting supplies')) || ' ' ||
         public.ddrive_budget_close(tests.line('Prepositioning of relief and flood-fighting supplies')) $q$, 'B-001 closed');
select tests.refused('A closed line funds nothing new', $q$ select public.ddrive_response_fund(tests.act('Generator fuel reserve'), tests.line('Prepositioning of relief and flood-fighting supplies')) $q$);
reset role;

-- ─── Visibility ──────────────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer follows the organisation''s budget lines', $q$ select count(*)::text from public.ddrive_budget_line_status $q$, '2');
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees only its own line', $q$ select string_agg(title, ',') from public.ddrive_budget_line_status $q$, 'B warehouse fund');
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select 1 / count(*) from public.ddrive_budget_lines $q$);
reset role;
select tests.eq('Approvals and funding are in the audit log', $q$
  select (count(*) >= 3)::text from public.ddrive_audit_log where table_name in ('ddrive_budget_lines', 'ddrive_response_actions') $q$, 'true');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
