-- Risk-informed response actions: proposed from Diagnosis or Detection, decided and coordinated in Response (ADR-008).
-- Runs after 70_phase3_aa_graduated.sql in the same database; works in "LGU A".
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

-- 70 moved the responder to organisation B; bring them back to A.
update public.ddrive_users set active_tenant_id = (select id from public.ddrive_tenants where name = 'LGU A') where email = 'responder@a.ph';

create or replace function tests.act(p_title text) returns text language sql as $$
  select id from public.ddrive_response_actions where title = p_title
$$;
create or replace function tests.a_risk(p_title text) returns text language sql as $$
  select r.id from public.ddrive_risks r join public.ddrive_tenants t on t.id = r.tenant_id where r.title = p_title and t.name = 'LGU A' limit 1
$$;
-- Reads another organisation's risk id past RLS, so the guard's own cross-organisation check is what is tested.
create or replace function tests.b_risk_id() returns text language sql security definer as $$
  select id from public.ddrive_risks where title = 'B warehouse floods'
$$;
grant execute on function tests.act(text), tests.a_risk(text), tests.b_risk_id() to authenticated;

-- Risks to treat, one in each organisation.
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('Organisation A registers a risk', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('EOC loses power in a typhoon', 'Operational', 4, 4) $q$);
select tests.ok('Organisation A starts a draft assessment', $q$ insert into public.ddrive_hazard_assessments (title) values ('Ormoc upland barangays') $q$);
select tests.ok('with a hazard event not yet scored', $q$ insert into public.ddrive_hazard_assessment_entries (assessment_id, family_code, main_hazard, hazard_event)
  select id, 'H8', 'Northeast monsoon (Amihan)', 'Rain' from public.ddrive_hazard_assessments where title = 'Ormoc upland barangays' $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('Organisation B registers a risk', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('B warehouse floods', 'Operational', 3, 4) $q$);
reset role;

-- ─── Proposing ───────────────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.refused('A viewer cannot propose an action', $q$
  insert into public.ddrive_response_actions (title, origin, risk_id, strategy, drrm_area) values ('Viewer action', 'diagnosis', tests.a_risk('EOC loses power in a typhoon'), 'reduce_consequences', 'preparedness') $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot propose treatment actions from Diagnosis', $q$
  insert into public.ddrive_response_actions (title, origin, risk_id, strategy, drrm_area) values ('Responder treatment', 'diagnosis', tests.a_risk('EOC loses power in a typhoon'), 'reduce_consequences', 'preparedness') $q$);
select tests.refused('An action from Detection must name the alert or report', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area) values ('Unlinked detection action', 'detection', 'reduce_consequences', 'response') $q$);
select tests.ok('A responder proposes an action on an official alert', $q$
  insert into public.ddrive_response_actions (title, origin, official_alert_id, strategy, drrm_area, priority)
  select 'Pre-position rescue boats', 'detection', id, 'reduce_consequences', 'response', 'high' from public.ddrive_official_alerts limit 1 $q$);
select tests.ok('A responder proposes an action on a field hazard report', $q$
  insert into public.ddrive_response_actions (title, origin, hazard_record_id, strategy, drrm_area)
  select 'Clear the river debris', 'detection', id, 'reduce_likelihood', 'prevention_mitigation' from public.ddrive_hazards order by id limit 1 $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An action from Diagnosis must name the risk or the assessed hazard event', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area) values ('Unlinked treatment', 'diagnosis', 'avoid', 'prevention_mitigation') $q$);
select tests.ok('An analyst proposes a treatment for a register risk, claiming it is already done', $q$
  insert into public.ddrive_response_actions (title, origin, risk_id, strategy, drrm_area, owner_office, due_on, cost_php, status, progress, outcome)
  values ('Generator for the EOC', 'diagnosis', tests.a_risk('EOC loses power in a typhoon'), 'reduce_consequences', 'preparedness', 'CDRRMO', current_date + 30, 450000, 'done', 100, 'fake') $q$);
select tests.eq('It starts as a proposal, with a server reference number', $q$
  select status || ' ' || progress || ' ' || coalesce(outcome, 'no outcome') || ' ' || ref from public.ddrive_response_actions where title = 'Generator for the EOC' $q$, 'proposed 0 no outcome T-003');
select tests.ok('An analyst proposes a treatment for a scored DDRiVE hazard event', $q$
  insert into public.ddrive_response_actions (title, origin, hazard_entry_id, strategy, drrm_area)
  select 'Relocate the health centre above flood level', 'diagnosis', e.id, 'avoid', 'prevention_mitigation'
  from public.ddrive_hazard_assessment_entries e join public.ddrive_tenants t on t.id = e.tenant_id
  where t.name = 'LGU A' and e.hazard_event = 'Riverine Flood' limit 1 $q$);
select tests.refused('A hazard event that is not yet scored cannot be treated', $q$
  insert into public.ddrive_response_actions (title, origin, hazard_entry_id, strategy, drrm_area)
  select 'Treat an unscored event', 'diagnosis', e.id, 'avoid', 'prevention_mitigation'
  from public.ddrive_hazard_assessment_entries e join public.ddrive_tenants t on t.id = e.tenant_id
  where t.name = 'LGU A' and e.risk_code is null and e.hazard_event = 'Rain' limit 1 $q$);
select tests.eq('An entry linked to the register carries its risk to the action', $q$
  select (a.risk_id is not distinct from e.risk_id)::text from public.ddrive_response_actions a join public.ddrive_hazard_assessment_entries e on e.id = a.hazard_entry_id
  where a.title = 'Relocate the health centre above flood level' $q$, 'true');
select tests.refused('Another organisation''s risk cannot be treated here', $q$
  insert into public.ddrive_response_actions (title, origin, risk_id, strategy, drrm_area)
  values ('Foreign treatment', 'diagnosis', tests.b_risk_id(), 'share', 'preparedness') $q$);
select tests.refused('An unknown treatment option is refused', $q$
  insert into public.ddrive_response_actions (title, origin, risk_id, strategy, drrm_area) values ('Pray', 'diagnosis', tests.a_risk('EOC loses power in a typhoon'), 'hope', 'preparedness') $q$);
select tests.ok('A proposal can be edited before the decision', $q$ update public.ddrive_response_actions set cost_php = 480000 where id = tests.act('Generator for the EOC') $q$);
select tests.refused('The status cannot be set directly', $q$ update public.ddrive_response_actions set status = 'approved' where id = tests.act('Generator for the EOC') $q$);
select tests.refused('What an action responds to cannot be changed', $q$ update public.ddrive_response_actions set risk_id = null where id = tests.act('Generator for the EOC') $q$);
select tests.refused('An analyst cannot approve', $q$ select public.ddrive_response_decide(tests.act('Generator for the EOC'), true, 'ok') $q$);
reset role;

-- ─── Deciding ────────────────────────────────────────────────────────────────
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('Declining needs a reason', $q$ select public.ddrive_response_decide(tests.act('Pre-position rescue boats'), false, 'no') $q$);
select tests.eq('The DRRM officer approves the generator', $q$ select public.ddrive_response_decide(tests.act('Generator for the EOC'), true, 'Within the 2026 LDRRMF') $q$, 'approved');
select tests.eq('The DRRM officer declines the boats, with the reason', $q$ select public.ddrive_response_decide(tests.act('Pre-position rescue boats'), false, 'Boats already pre-positioned by the PDRRMO') $q$, 'declined');
select tests.refused('A decision cannot be made twice', $q$ select public.ddrive_response_decide(tests.act('Generator for the EOC'), false, 'changed my mind entirely') $q$);
select tests.ok('The DRRM officer reassigns the approved action', $q$ update public.ddrive_response_actions set owner_office = 'City Engineering Office', due_on = current_date + 45 where id = tests.act('Generator for the EOC') $q$);
select tests.eq('The decision is stamped with who and when', $q$ select (decided_by is not null and decided_at is not null)::text from public.ddrive_response_actions where id = tests.act('Generator for the EOC') $q$, 'true');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('An approved action''s content is fixed', $q$ update public.ddrive_response_actions set title = 'Two generators' where id = tests.act('Generator for the EOC') $q$);
select tests.refused('An analyst cannot reassign an approved action', $q$ update public.ddrive_response_actions set owner_office = 'Someone else' where id = tests.act('Generator for the EOC') $q$);
reset role;

-- ─── Coordinating ────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('No progress on a declined action', $q$ select public.ddrive_response_progress(tests.act('Pre-position rescue boats'), 10, 'Started work') $q$);
select tests.refused('No progress on a proposal not yet approved', $q$ select public.ddrive_response_progress(tests.act('Clear the river debris'), 10, 'Started work') $q$);
select tests.eq('The responder reports 40%', $q$ select public.ddrive_response_progress(tests.act('Generator for the EOC'), 40, 'Generator delivered; wiring scheduled') $q$, 'in_progress');
select tests.refused('Progress cannot go down', $q$ select public.ddrive_response_progress(tests.act('Generator for the EOC'), 20, 'Recount of the work') $q$);
select tests.refused('100% is reached by completing, not by progress', $q$ select public.ddrive_response_progress(tests.act('Generator for the EOC'), 100, 'All done now') $q$);
select tests.refused('Completing needs the outcome', $q$ select public.ddrive_response_complete(tests.act('Generator for the EOC'), 'done') $q$);
select tests.eq('The responder completes it with the outcome', $q$ select public.ddrive_response_complete(tests.act('Generator for the EOC'), 'Generator installed and load-tested; EOC runs 72 hours on backup power') $q$, 'done');
select tests.eq('Done means 100% with a completion time', $q$ select progress || ' ' || (completed_at is not null)::text from public.ddrive_response_actions where id = tests.act('Generator for the EOC') $q$, '100 true');
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.refused('A done action cannot be cancelled', $q$ select public.ddrive_response_cancel(tests.act('Generator for the EOC'), 'No longer needed at all') $q$);
select tests.refused('A done action cannot be edited', $q$ update public.ddrive_response_actions set owner_office = 'Late change' where id = tests.act('Generator for the EOC') $q$);
select tests.eq('The officer approves the debris clearing', $q$ select public.ddrive_response_decide(tests.act('Clear the river debris'), true) $q$, 'approved');
select tests.refused('Cancelling needs a reason', $q$ select public.ddrive_response_cancel(tests.act('Clear the river debris'), 'no') $q$);
select tests.eq('The officer cancels it, with the reason', $q$ select public.ddrive_response_cancel(tests.act('Clear the river debris'), 'DPWH is clearing the river under its own contract') $q$, 'cancelled');
reset role;

-- ─── Others ──────────────────────────────────────────────────────────────────
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer can follow all of the organisation''s actions', $q$ select count(*)::text from public.ddrive_response_actions $q$, '4');
select tests.refused('A viewer cannot take a step', $q$ select public.ddrive_response_progress(tests.act('Relocate the health centre above flood level'), 10, 'Viewer progress') $q$);
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of them', $q$ select count(*)::text from public.ddrive_response_actions $q$, '0');
select tests.refused('Another organisation cannot decide on them', $q$ select public.ddrive_response_decide((select id from public.ddrive_response_actions limit 1), true) $q$);
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select count(*) from public.ddrive_response_actions $q$);
reset role;
select tests.eq('Every step is in the audit log', $q$ select (count(*) >= 10)::text from public.ddrive_audit_log where table_name = 'ddrive_response_actions' $q$, 'true');

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
