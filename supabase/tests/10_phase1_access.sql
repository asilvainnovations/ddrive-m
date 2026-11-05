-- DDRiVE-M Phase 1 access-rule tests. Run with scripts/test_db.sh (needs local Postgres 15+).
-- Each check signs in as a person with a given role and tries something they should or should not be able to do.
\set ON_ERROR_STOP on
\set QUIET on

\ir helpers.sql

-- ─── People ──────────────────────────────────────────────────────────────────
insert into auth.users (email, raw_user_meta_data) values
  ('admin@a.ph',     '{"full_name": "Ana Admin"}'),
  ('officer@a.ph',   '{"full_name": "Oscar Officer"}'),
  ('analyst@a.ph',   '{"full_name": "Alma Analyst"}'),
  ('responder@a.ph', '{"full_name": "Rico Responder"}'),
  ('viewer@a.ph',    '{"full_name": "Vina Viewer"}'),
  ('admin@b.ph',     '{"full_name": "Ben Admin B"}'),
  ('outsider@x.ph',  '{"full_name": "Olive Outsider"}');

select tests.eq('Every new account gets a profile', $q$ select count(*)::text from public.ddrive_users where email like '%.ph' $q$, '7');

-- Organisation A: its creator becomes the administrator and adds the team.
select tests.claims('admin@a.ph'); set role authenticated;
select tests.ok('Anyone signed in can create an organisation', $q$ select public.ddrive_create_tenant('LGU A', 'lgu') $q$);
select tests.ok('Admin adds a DRRM officer', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'officer@a.ph', 'drrm_officer') $q$);
select tests.ok('Admin adds an analyst', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'analyst@a.ph', 'analyst') $q$);
select tests.ok('Admin adds a responder', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'responder@a.ph', 'responder') $q$);
select tests.ok('Admin adds a viewer', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'viewer@a.ph', 'viewer') $q$);
select tests.refused('Adding an email with no account explains why', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'nobody@a.ph', 'viewer') $q$);
reset role;

-- Members start working in organisation A.
do $$
declare t uuid := (select id from public.ddrive_tenants where name = 'LGU A');
begin
  update public.ddrive_users set active_tenant_id = t where email like '%@a.ph';
end $$;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('A second organisation is created', $q$ select public.ddrive_create_tenant('Enterprise B', 'enterprise') $q$);
reset role;

-- Organisation ids for the tests, readable whatever the signed-in person can see.
create table tests.ids as select name, id from public.ddrive_tenants;
grant select on tests.ids to public;

-- ─── No anonymous access ─────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"role": "anon"}', false); set role anon;
select tests.refused('Anonymous visitors cannot read hazards', $q$ select count(*) from public.ddrive_hazards $q$);
select tests.refused('Anonymous visitors cannot read profiles', $q$ select count(*) from public.ddrive_users $q$);
select tests.refused('Anonymous visitors cannot call server functions', $q$ select public.ddrive_create_tenant('Spam', 'other') $q$);
reset role;

-- ─── Hazards ─────────────────────────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('Responder reports a hazard', $q$ insert into public.ddrive_hazards (agency, type, name, severity, location, lat, lng)
  values ('PAGASA', 'Flood', 'River overflow', 'High', 'Barangay 1', 11.0, 124.6) $q$);
select tests.eq('The server records who reported it', $q$ select (created_by = auth.uid())::text from public.ddrive_hazards where name = 'River overflow' $q$, 'true');
select tests.eq('The server files it under the responder''s organisation', $q$ select t.name from public.ddrive_hazards h join public.ddrive_tenants t on t.id = h.tenant_id where h.name = 'River overflow' $q$, 'LGU A');
select tests.refused('Invalid severity is refused', $q$ insert into public.ddrive_hazards (agency, type, name, severity, location) values ('PAGASA', 'Flood', 'Bad', 'Extreme', 'X') $q$);
select tests.refused('A hazard cannot be filed under another organisation', $q$ insert into public.ddrive_hazards (tenant_id, agency, type, name, severity, location)
  values ((select id from tests.ids where name = 'Enterprise B'), 'X', 'Flood', 'smuggled', 'Low', 'X') $q$);
select tests.eq('Responder corrects their own report', $q$ with u as (update public.ddrive_hazards set severity = 'Critical' where name = 'River overflow' returning 1) select count(*)::text from u $q$, '1');
select tests.refused('Hazards cannot be deleted, even by their reporter', $q$ delete from public.ddrive_hazards where name = 'River overflow' $q$);
reset role;

select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('Viewer can read the organisation''s hazards', $q$ select count(*)::text from public.ddrive_hazards where name = 'River overflow' $q$, '1');
select tests.refused('Viewer cannot report a hazard', $q$ insert into public.ddrive_hazards (agency, type, name, severity, location) values ('PAGASA', 'Flood', 'v', 'Low', 'X') $q$);
reset role;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation cannot see the hazard', $q$ select count(*)::text from public.ddrive_hazards $q$, '0');
select tests.eq('Another organisation cannot change it', $q$ with u as (update public.ddrive_hazards set name = 'hacked' returning 1) select count(*)::text from u $q$, '0');
reset role;

select tests.claims('outsider@x.ph'); set role authenticated;
select tests.eq('Someone with no organisation sees nothing', $q$ select count(*)::text from public.ddrive_hazards $q$, '0');
select tests.refused('Someone with no organisation cannot add records', $q$ insert into public.ddrive_hazards (agency, type, name, severity, location) values ('X', 'Flood', 'o', 'Low', 'X') $q$);
reset role;

-- ─── Risks: server ids, per-organisation references, scores from thresholds ──
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('Responder cannot add risks', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('r', 'Operational', 1, 1) $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('Analyst adds a risk (sending a made-up id and level)', $q$ insert into public.ddrive_risks (id, ref, title, category, likelihood, impact, level, status)
  values ('R-999', 'R-999', 'Flooding of the city hall', 'Operational', 4, 5, 'Low', 'Open') $q$);
select tests.eq('The server issues the reference number', $q$ select ref from public.ddrive_risks where title = 'Flooding of the city hall' $q$, 'R-001');
select tests.eq('The id sent by the browser is ignored', $q$ select (id <> 'R-999')::text from public.ddrive_risks where title = 'Flooding of the city hall' $q$, 'true');
select tests.eq('Score and level come from the database (4 × 5 = 20, Critical)', $q$ select score || ' ' || level from public.ddrive_risks where title = 'Flooding of the city hall' $q$, '20 Critical');
select tests.ok('Analyst adds a second risk', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('Power outage', 'Operational', 3, 3) $q$);
select tests.eq('References count up within the organisation', $q$ select ref || ' ' || level from public.ddrive_risks where title = 'Power outage' $q$, 'R-002 Medium');
select tests.refused('Out-of-range likelihood is refused', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('bad', 'Operational', 9, 1) $q$);
select tests.refused('A risk cannot be moved to another organisation', $q$ update public.ddrive_risks set tenant_id = (select id from tests.ids where name = 'Enterprise B') where title = 'Power outage' $q$);
select tests.refused('A reference number cannot be changed', $q$ update public.ddrive_risks set ref = 'R-500' where title = 'Power outage' $q$);
select tests.eq('Analyst cannot delete a risk', $q$ with d as (delete from public.ddrive_risks where title = 'Power outage' returning 1) select count(*)::text from d $q$, '0');
select tests.eq('Editing a risk bumps its version', $q$ with u as (update public.ddrive_risks set owner = 'Engineering' where title = 'Power outage' returning version) select version::text from u $q$, '2');
reset role;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('Organisation B adds a risk', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('Supplier failure', 'Operational', 2, 2) $q$);
select tests.eq('Organisation B numbers its own risks from R-001', $q$ select ref from public.ddrive_risks where title = 'Supplier failure' $q$, 'R-001');
select tests.refused('Organisation B cannot draw reference numbers for A', $q$ select public.ddrive_next_ref((select id from tests.ids where name = 'LGU A'), 'R') $q$);
reset role;

-- Risk criteria are the organisation's own.
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('Analyst cannot change risk criteria', $q$ select public.ddrive_set_risk_thresholds(public.ddrive_active_tenant(), 16, 8, 4) $q$);
reset role;
select tests.claims('admin@a.ph'); set role authenticated;
select tests.refused('Thresholds cannot be edited directly (only through the function that re-grades risks)', $q$ update public.ddrive_tenants set risk_thresholds = '{"critical": 16, "high": 8, "medium": 4}' $q$);
select tests.ok('Admin changes risk criteria to 16 / 8 / 4', $q$ select public.ddrive_set_risk_thresholds(public.ddrive_active_tenant(), 16, 8, 4) $q$);
select tests.eq('Existing risks are re-graded (3 × 3 = 9 is now High)', $q$ select level from public.ddrive_risks where title = 'Power outage' $q$, 'High');
select tests.refused('Nonsensical criteria are refused', $q$ select public.ddrive_set_risk_thresholds(public.ddrive_active_tenant(), 5, 10, 20) $q$);
reset role;

select tests.claims('officer@a.ph'); set role authenticated;
select tests.eq('DRRM officer can delete a risk', $q$ with d as (delete from public.ddrive_risks where title = 'Power outage' returning 1) select count(*)::text from d $q$, '1');
reset role;

-- ─── Plans: drafts, approval, lock, retirement ───────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('Analyst creates a plan, claiming it is approved', $q$ insert into public.ddrive_plans (title, type, standard, status) values ('Typhoon contingency plan', 'Contingency', 'RA 10121', 'Approved') $q$);
select tests.eq('New plans always start as drafts', $q$ select status || ' ' || ref from public.ddrive_plans where title = 'Typhoon contingency plan' $q$, 'Draft P-001');
select tests.ok('Analyst edits the draft', $q$ update public.ddrive_plans set standard = 'RA 10121, RA 12287' where title = 'Typhoon contingency plan' $q$);
select tests.refused('Analyst cannot approve a plan', $q$ update public.ddrive_plans set status = 'Approved' where title = 'Typhoon contingency plan' $q$);
reset role;

select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('DRRM officer approves the plan', $q$ update public.ddrive_plans set status = 'Approved' where title = 'Typhoon contingency plan' $q$);
select tests.eq('The approver and time are recorded', $q$ select (approved_by = auth.uid() and approved_at is not null)::text from public.ddrive_plans where title = 'Typhoon contingency plan' $q$, 'true');
select tests.refused('Even a DRRM officer cannot edit an approved plan', $q$ update public.ddrive_plans set title = 'Edited' where title = 'Typhoon contingency plan' $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('Analyst cannot edit an approved plan', $q$ update public.ddrive_plans set standard = 'x' where title = 'Typhoon contingency plan' $q$);
select tests.refused('Analyst cannot retire an approved plan', $q$ update public.ddrive_plans set status = 'Retired' where title = 'Typhoon contingency plan' $q$);
select tests.refused('Plans cannot be deleted', $q$ delete from public.ddrive_plans where title = 'Typhoon contingency plan' $q$);
reset role;

select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('DRRM officer retires the plan', $q$ update public.ddrive_plans set status = 'Retired' where title = 'Typhoon contingency plan' $q$);
select tests.refused('A retired plan cannot be changed', $q$ update public.ddrive_plans set status = 'Draft' where title = 'Typhoon contingency plan' $q$);
reset role;

-- ─── Messages: real sender, critical needs authority, append-only ────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('Responder posts a message pretending to be NDRRMC', $q$ insert into public.ddrive_messages (user_name, role, message, priority) values ('NDRRMC EMERGENCY', 'System Broadcast', 'Team check-in at 5 PM', 'medium') $q$);
select tests.eq('The server shows the real sender and role', $q$ select user_name || ' / ' || role from public.ddrive_messages where message = 'Team check-in at 5 PM' $q$, 'Rico Responder / responder');
select tests.refused('Responder cannot send a critical message', $q$ insert into public.ddrive_messages (message, priority) values ('EVACUATE', 'critical') $q$);
select tests.refused('Messages cannot be edited', $q$ update public.ddrive_messages set message = 'changed' $q$);
select tests.refused('Messages cannot be deleted', $q$ delete from public.ddrive_messages $q$);
reset role;
select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('DRRM officer sends a critical message', $q$ insert into public.ddrive_messages (message, priority) values ('All teams report to zones', 'critical') $q$);
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.refused('Viewer cannot post messages', $q$ insert into public.ddrive_messages (message, priority) values ('hi', 'low') $q$);
reset role;

-- ─── Incidents, scenarios, documents, scorecard ──────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('Responder opens an incident', $q$ insert into public.ddrive_incidents (title, priority, status) values ('Road blocked', 'High', 'Open') $q$);
select tests.eq('Incident gets reference I-001', $q$ select ref from public.ddrive_incidents where title = 'Road blocked' $q$, 'I-001');
select tests.ok('Responder updates incident progress', $q$ update public.ddrive_incidents set progress = 50, status = 'In Progress' where title = 'Road blocked' $q$);
select tests.refused('Incidents cannot be deleted', $q$ delete from public.ddrive_incidents where title = 'Road blocked' $q$);
select tests.refused('Responder cannot create exercise scenarios', $q$ insert into public.ddrive_scenarios (name) values ('Drill') $q$);
select tests.refused('Responder cannot add documents', $q$ insert into public.ddrive_documents (name, category) values ('SOP', 'Protocol') $q$);
reset role;

select tests.claims('officer@a.ph'); set role authenticated;
select tests.ok('DRRM officer creates a scenario', $q$ insert into public.ddrive_scenarios (name, type, difficulty) values ('Earthquake drill', 'Tabletop', 'Advanced') $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.ok('Responder records participation', $q$ select public.ddrive_record_participation((select id::text from public.ddrive_scenarios where name = 'Earthquake drill')) $q$);
select tests.eq('Participation is counted', $q$ select participants::text from public.ddrive_scenarios where name = 'Earthquake drill' $q$, '1');
select tests.eq('Responder cannot edit the scenario directly', $q$ with u as (update public.ddrive_scenarios set participants = 999 where name = 'Earthquake drill' returning 1) select count(*)::text from u $q$, '0');
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.refused('Viewer cannot record participation', $q$ select public.ddrive_record_participation((select id::text from public.ddrive_scenarios where name = 'Earthquake drill')) $q$);
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('Analyst registers a document', $q$ insert into public.ddrive_documents (name, category) values ('Evacuation SOP', 'Protocol') $q$);
select tests.eq('Document gets reference D-001', $q$ select ref from public.ddrive_documents where name = 'Evacuation SOP' $q$, 'D-001');
select tests.ok('Analyst records a scorecard entry', $q$ insert into public.ddrive_undrr_scores (name, score) values ('Essential 1: Organise for resilience', 55) $q$);
select tests.refused('Scores above 100 are refused', $q$ insert into public.ddrive_undrr_scores (name, score) values ('x', 140) $q$);
reset role;

-- ─── Members and profiles ────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('Analyst cannot add members', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'outsider@x.ph', 'tenant_admin') $q$);
select tests.eq('Analyst cannot change anyone''s role directly', $q$ with u as (update public.ddrive_memberships set role = 'tenant_admin' returning 1) select count(*)::text from u $q$, '0');
select tests.refused('Nobody can edit the legacy role field on their profile', $q$ update public.ddrive_users set role = 'Super Admin' where id = auth.uid() $q$);
select tests.refused('Nobody can switch into an organisation they do not belong to', $q$ update public.ddrive_users set active_tenant_id = (select id from tests.ids where name = 'Enterprise B') where id = auth.uid() $q$);
select tests.ok('People can update their own display name', $q$ update public.ddrive_users set full_name = 'Alma A. Analyst' where id = auth.uid() $q$);
select tests.eq('Colleagues'' names are visible within the organisation', $q$ select count(*)::text from public.ddrive_users where email like '%@a.ph' $q$, '5');
select tests.eq('People in other organisations are not visible', $q$ select count(*)::text from public.ddrive_users where email = 'admin@b.ph' $q$, '0');
select tests.eq('Analyst cannot read the audit log', $q$ select count(*)::text from public.ddrive_audit_log $q$, '0');
select tests.refused('Nobody can call the SQL-editor role function from the app', $q$ select public.ddrive_admin_set_role('analyst@a.ph', 'tenant_admin') $q$);
reset role;

select tests.claims('admin@a.ph'); set role authenticated;
select tests.refused('Admin cannot change their own role', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'admin@a.ph', 'viewer') $q$);
select tests.refused('The only administrator cannot leave', $q$ delete from public.ddrive_memberships where user_id = auth.uid() $q$);
select tests.ok('Admin promotes the officer to administrator', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'officer@a.ph', 'tenant_admin') $q$);
select tests.ok('With two administrators, one may leave', $q$ delete from public.ddrive_memberships where user_id = auth.uid() $q$);
reset role;

select tests.claims('officer@a.ph'); set role authenticated;
select tests.eq('A DRRM officer or admin can read the audit log', $q$ select (count(*) > 10)::text from public.ddrive_audit_log $q$, 'true');
select tests.eq('The audit log shows who changed the plan', $q$ select count(*)::text from public.ddrive_audit_log where table_name = 'ddrive_plans' and action = 'UPDATE' $q$, '3');
select tests.refused('The audit log cannot be edited', $q$ update public.ddrive_audit_log set action = 'x' $q$);
select tests.refused('The audit log cannot be deleted', $q$ delete from public.ddrive_audit_log $q$);
reset role;

select tests.claims('admin@a.ph'); set role authenticated;
select tests.eq('Someone who left sees nothing', $q$ select count(*)::text from public.ddrive_hazards $q$, '0');
reset role;

-- ─── Service role and SQL editor ─────────────────────────────────────────────
select set_config('request.jwt.claims', '', false);
select tests.ok('SQL editor can assign a role', $q$ select public.ddrive_admin_set_role('admin@a.ph', 'tenant_admin', (select id from public.ddrive_tenants where name = 'LGU A')) $q$);

-- ─── Report ──────────────────────────────────────────────────────────────────
\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, coalesce(detail, '') as detail
from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
