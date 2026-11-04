-- Checks after migrating the legacy fixture. Used by: bash scripts/test_db.sh --legacy
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql

select tests.eq('Existing data moves into one organisation', $q$ select string_agg(name, ',') from public.ddrive_tenants $q$, 'Migrated organisation');
select tests.eq('Every existing row is filed under it', $q$
  select (select count(*) from public.ddrive_hazards where tenant_id is null) + (select count(*) from public.ddrive_risks where tenant_id is null)
       + (select count(*) from public.ddrive_plans where tenant_id is null) + (select count(*) from public.ddrive_messages where tenant_id is null) $q$, '0');
select tests.eq('Old ids become reference numbers', $q$ select string_agg(ref, ',' order by ref) from public.ddrive_risks $q$, 'R-001,R-002,R-003');
select tests.eq('Old incident ids are kept as references', $q$ select ref from public.ddrive_incidents $q$, 'INC-007');
select tests.eq('Stored levels are recomputed from scores (5×5 Critical, 3×4 High, 2×2 Low)', $q$
  select string_agg(ref || '=' || score || ' ' || level, ',' order by ref) from public.ddrive_risks $q$, 'R-001=25 Critical,R-002=12 High,R-003=4 Low');
select tests.eq('The computed score column became a normal column', $q$
  select attgenerated::text from pg_attribute where attrelid = 'public.ddrive_risks'::regclass and attname = 'score' $q$, '');
select tests.eq('Existing users become viewers, not operators', $q$ select string_agg(distinct role::text, ',') from public.ddrive_memberships $q$, 'viewer');
select tests.eq('The wide-open policy is gone', $q$ select count(*)::text from pg_policies where policyname = 'Allow all' $q$, '0');
select tests.eq('Approved legacy plan is still approved', $q$ select status from public.ddrive_plans where ref = 'P-004' $q$, 'Approved');

-- Before anyone is promoted, existing users can read but not write.
select tests.claims('early.user@lgu.ph'); set role authenticated;
select tests.eq('An existing user can still read the data', $q$ select count(*)::text from public.ddrive_risks $q$, '3');
select tests.refused('An existing user can no longer write until promoted', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('x', 'Operational', 1, 1) $q$);
reset role;

select set_config('request.jwt.claims', '', false);
select tests.ok('SQL editor promotes the first administrator', $q$ select public.ddrive_admin_set_role('early.user@lgu.ph', 'tenant_admin') $q$);

select tests.claims('early.user@lgu.ph'); set role authenticated;
select tests.ok('The administrator adds a risk', $q$ insert into public.ddrive_risks (title, category, likelihood, impact) values ('Heat wave', 'Environmental', 4, 3) $q$);
select tests.eq('Numbering continues after the highest old reference', $q$ select ref from public.ddrive_risks where title = 'Heat wave' $q$, 'R-004');
select tests.ok('The administrator promotes a colleague', $q$ select public.ddrive_add_member(public.ddrive_active_tenant(), 'second.user@lgu.ph', 'analyst') $q$);
select tests.refused('The legacy approved plan is locked', $q$ update public.ddrive_plans set title = 'x' where ref = 'P-004' $q$);
select tests.ok('A new plan saves with no compliance score', $q$ insert into public.ddrive_plans (title, type, standard) values ('PSCP 2026', 'PSCP', 'OCD PSCP guidance') $q$);
reset role;

select set_config('request.jwt.claims', '{"role": "anon"}', false); set role anon;
select tests.refused('Anonymous access is closed', $q$ select count(*) from public.ddrive_hazards $q$);
select tests.refused('The old second risk model is closed to the API', $q$ select count(*) from public.risks $q$);
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, coalesce(detail, '') as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
