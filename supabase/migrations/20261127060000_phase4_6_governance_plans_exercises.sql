-- Phases 4–6: embed risk priorities in governance, plans and budgets (Integration); plan templates, forms and plan
-- reviews (Enhancement); exercises that test plans, capabilities, assumptions and coordination (Validation).
-- ADR-012 (governance and mainstreaming) and ADR-013 (plans and exercises).
--
-- Sources, all in the DDRiVE-M project files:
--   RA 10121 s. 3(j), 11(b)(1)-(2), 21; NDRRMC Memo 147 s. 2017 (LDRRMP review); NDRRMC Memo 131 s. 2018 (EOC);
--   NDRRMC Disaster Preparedness Minimum Standards Vol. 2; Gawad KALASAG LDRRMCO Assessment Toolkit CY 2026;
--   NDRRMP 2020-2030 RBMEP; HLURB-CCC Supplemental Guidelines on Mainstreaming CC and DRR in the CLUP;
--   RA 10821 (children in emergencies); OCD-NEDA Disaster Rehabilitation and Recovery Planning Guide;
--   RDRRMOC SOPG 2022.
-- Safe to run more than once.

-- ═══ Reference data ═══════════════════════════════════════════════════════════
create table if not exists public.ddrive_ndrrmp_outputs (
  code text primary key,
  outcome int not null check (outcome between 1 and 23),
  drrm_area text not null check (drrm_area in ('prevention_mitigation', 'preparedness', 'response', 'rehabilitation_recovery')),
  title text not null
);
create table if not exists public.ddrive_gk_sections (
  key text primary key,
  title text not null,
  weight numeric(4, 2) not null,
  sort int not null
);
create table if not exists public.ddrive_gk_items (
  code text primary key,
  section text not null references public.ddrive_gk_sections (key),
  title text not null,
  sort int not null
);
-- Weights from the toolkit's Summary sheet: (S x 0.25) + (C x 0.35) + (MS x 0.15) + (EP x 0.05) + (KMA x 0.1) + (PP x 0.1).
insert into public.ddrive_gk_sections (key, title, weight, sort) values
  ('structure', 'I. Structure', 0.25, 1),
  ('competency', 'II. Competency', 0.35, 2),
  ('management_systems', 'III. Management Systems', 0.15, 3),
  ('enabling_policies', 'IV. Enabling Policies', 0.05, 4),
  ('knowledge_management', 'V. Knowledge Management and Advocacy', 0.10, 5),
  ('partnership', 'VI. Partnership and Participation', 0.10, 6)
on conflict (key) do update set title = excluded.title, weight = excluded.weight, sort = excluded.sort;
insert into public.ddrive_gk_items (code, section, title, sort) values
  ('1.1', 'structure', 'Establishment of LDRRMC', 1),
  ('1.2', 'structure', 'Convene the LDRRMC quarterly or as necessary', 2),
  ('1.3', 'structure', 'Organization of DRRMC', 3),
  ('1.4', 'structure', 'Secretariat and Executive Arm of LDRRMC', 4),
  ('1.5', 'structure', 'Creation of LDRRM Office', 5),
  ('1.6', 'structure', 'LDRRMO Staffing / Personnel Complement', 6),
  ('1.7', 'structure', 'Local DRRM Officer', 7),
  ('1.8', 'structure', 'Establishment of Provincial / City / Municipal DRRM Operations Center', 8),
  ('1.9', 'structure', 'Organization and Competence of local Emergency Response Teams (ERTs)', 9),
  ('2.1', 'competency', 'Facilitation and Support to Risk Assessment', 10),
  ('2.2', 'competency', 'Maintenance of Local Risk Maps', 11),
  ('2.3', 'competency', 'Operation of multi-hazard end-to-end Early Warning System (EWS) to provide accurate and timely advice to national or local emergency response organizations and the general public', 12),
  ('2.4.A', 'competency', 'Designing, Programming and Coordination of DRRM Activities (consistent with NDRRM Council’s Standards and Guidelines)', 13),
  ('2.4.B', 'competency', 'Presence of updated C/M/BDRRM Plan', 14),
  ('2.4.C', 'competency', 'Presence of LCCAP', 15),
  ('2.4.D', 'competency', 'Presence of contingency plans', 16),
  ('2.5', 'competency', 'Monitor and evaluate the implementation of the LDRRMPs', 17),
  ('2.6', 'competency', 'Organization and conduct of training (including Training of Trainers), orientation and knowledge management activities on DRRM at the local level', 18),
  ('2.7', 'competency', 'Recommend the implementation of forced or pre-emptive evacuation of local residents, if necessary', 19),
  ('2.8', 'competency', 'Pre-positioning', 20),
  ('2.9', 'competency', 'Camp Coordination and Camp Management', 21),
  ('2.10', 'competency', 'Response to and management of adverse effects of emergencies / disasters', 22),
  ('2.11', 'competency', 'Facilitation of early recovery and rehabilitation interventions', 23),
  ('2.12', 'competency', 'Formulation of Rehabilitation and Recovery Program', 24),
  ('3.1', 'management_systems', 'Hazard-specific SOPs', 25),
  ('3.2', 'management_systems', 'Ensure the integration of risk reduction and climate change adaptation into local development plans, programs, and budgets as strategy in sustainable development and poverty reduction', 26),
  ('3.3', 'management_systems', 'Programming and budgeting for LDRRMF and other DRRM resources/funding and budgetary support to LDRRMO', 27),
  ('4.1', 'enabling_policies', 'Recommendation to enact DRRM- related ordinances through the LDRRMC', 28),
  ('5.1', 'knowledge_management', 'Local Disaster Database Resource', 29),
  ('5.2', 'knowledge_management', 'Conducted information dissemination and public awareness', 30),
  ('6.1', 'partnership', 'Develop, strengthen and operationalize mechanisms for partnership or networking with the private sector, CSOs, and volunteer groups.', 31),
  ('6.2', 'partnership', 'Participation on other external activities set by higher DRRM Councils', 32)
on conflict (code) do update set section = excluded.section, title = excluded.title, sort = excluded.sort;
insert into public.ddrive_ndrrmp_outputs (code, outcome, drrm_area, title) values
  ('1.1', 1, 'prevention_mitigation', 'Disaster and climate risk information'),
  ('1.2', 1, 'prevention_mitigation', 'Information management and systems'),
  ('1.3', 1, 'prevention_mitigation', 'Standards of DRR-related statistics'),
  ('2.1', 2, 'prevention_mitigation', 'DRRM CCA, and environmental policies, plans, and budgets at all levels'),
  ('2.2', 2, 'prevention_mitigation', 'DRRM Fund Monitoring System'),
  ('3.1', 3, 'prevention_mitigation', 'Resilient infrastructure System'),
  ('4.1', 4, 'prevention_mitigation', 'Operational end-to-end, and multi-hazard early warning systems'),
  ('5.1', 5, 'prevention_mitigation', 'Accessible disaster risk financing strategies'),
  ('5.2', 5, 'prevention_mitigation', 'Social Protection Program'),
  ('6.1', 6, 'prevention_mitigation', 'Nature-based solutions'),
  ('7.1', 7, 'prevention_mitigation', 'Resilience of Livelihoods'),
  ('7.2', 7, 'prevention_mitigation', 'Resilience of Businesses'),
  ('8.1', 8, 'prevention_mitigation', 'Resilient Communities'),
  ('9.1', 9, 'preparedness', 'Inclusive and comprehensive national and local DRRM and CCA information, education, and communication (IEC) plans and programs'),
  ('9.2', 9, 'preparedness', 'Increased understanding and application of DRRM measures'),
  ('9.3', 9, 'preparedness', 'Sustained DRRM and CCA education and research'),
  ('9.4', 9, 'preparedness', 'DRRM and CCA mainstreamed in formal and nonformal education'),
  ('10.1', 10, 'preparedness', 'Self-reliant, fully-functioning, adequately staffed, and financially capable national and local DRRM councils and offices'),
  ('11.1', 11, 'preparedness', 'Vertical and horizontal coordination'),
  ('11.2', 11, 'preparedness', 'Periodic reporting on country’s obligations with DRRM agreements/ treaties to which it is a party'),
  ('12.1', 12, 'preparedness', 'Enhanced preparedness and response strategies, including coordination and budgeting mechanisms'),
  ('12.2', 12, 'preparedness', 'Increased coordination for disaster response'),
  ('12.3', 12, 'preparedness', 'Coordination, complementation, and interoperability of work in DRRM'),
  ('12.4', 12, 'preparedness', 'Continuity of essential service'),
  ('13.1', 13, 'response', 'Activated functional Incident Command System (ICS) on-site to Activate functional IMT(s) on-site'),
  ('13.2', 13, 'response', 'Well-established system of information gathering, reporting, and dissemination'),
  ('13.3', 13, 'response', 'Implemented the pre-developed disaster response plans, policies, and protocol'),
  ('13.4', 13, 'response', 'Activated public and private sector partnerships for humanitarian response and logistics'),
  ('13.5', 13, 'response', 'Established grievance and redress mechanism'),
  ('13.6', 13, 'response', 'Implemented functioning system for coordinated and efficient relief operations'),
  ('14.1', 14, 'response', 'Activated forecast-based early actions'),
  ('15.1', 15, 'response', 'Loss and Damage Report'),
  ('15.2', 15, 'response', 'Rapid Damage and Needs Assessment Report'),
  ('16.1', 16, 'response', 'Provided basic necessities and services to the affected population prioritizing the marginalized sector'),
  ('16.2', 16, 'response', 'Restored communities’ economic and livelihood activities'),
  ('16.3', 16, 'response', 'Restored vital facilities'),
  ('16.4', 16, 'response', 'Provided support and assistance to the responders'),
  ('16.5', 16, 'response', 'Price freeze/ price ceiling of basic necessities and prime commodities'),
  ('16.6', 16, 'response', 'Prompt resumption of educational services for learners'),
  ('17.1', 17, 'rehabilitation_recovery', 'Mechanisms for coordinated and integrated early recovery established and essential services restored'),
  ('18.1', 18, 'rehabilitation_recovery', 'Post-disaster needs assessment'),
  ('18.2', 18, 'rehabilitation_recovery', 'Rehabilitation and recovery program for major disasters'),
  ('18.3', 18, 'rehabilitation_recovery', 'Periodic monitoring report covers the reporting of indicators for Global Targets C and D of the Sendai Framework'),
  ('19.1', 19, 'rehabilitation_recovery', 'Temporary Employment Program'),
  ('19.2', 19, 'rehabilitation_recovery', 'Livelihood program and support to businesses'),
  ('20.1', 20, 'rehabilitation_recovery', 'Agricultural production assistance program'),
  ('21.1', 21, 'rehabilitation_recovery', 'Comprehensive housing program covering shelter assistance for transitional and permanent housing'),
  ('22.1', 22, 'rehabilitation_recovery', 'Social services and programs on health and education'),
  ('22.2', 22, 'rehabilitation_recovery', 'Social protection services'),
  ('23.1', 23, 'rehabilitation_recovery', 'Public-and privately-owned infrastructure reconstructed or rehabilitated according to improved disaster resiliency standards')
on conflict (code) do update set outcome = excluded.outcome, drrm_area = excluded.drrm_area, title = excluded.title;

alter table public.ddrive_budget_lines add column if not exists ndrrmp_output text references public.ddrive_ndrrmp_outputs (code);
-- The status view lists the line's columns; rebuild it so it includes the new one.
drop view if exists public.ddrive_budget_line_status;
create view public.ddrive_budget_line_status with (security_invoker = true) as
select l.*,
       coalesce(sum(a.cost_php) filter (where a.status not in ('declined', 'cancelled')), 0)::numeric(16, 2) as committed_php,
       (l.amount_php - coalesce(sum(a.cost_php) filter (where a.status not in ('declined', 'cancelled')), 0))::numeric(16, 2) as available_php,
       count(a.id) filter (where a.status not in ('declined', 'cancelled'))::int as action_count
from public.ddrive_budget_lines l
left join public.ddrive_response_actions a on a.budget_line_id = l.id
group by l.id;
revoke all on public.ddrive_budget_line_status from anon, authenticated;
grant select on public.ddrive_budget_line_status to authenticated;

-- ═══ Integration: Gawad KALASAG self-assessment ═══════════════════════════════
create table if not exists public.ddrive_governance_assessments (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  assessment_year int not null check (assessment_year between 2020 and 2100),
  lgu_level text not null check (lgu_level in ('province', 'city_municipality')),
  -- The toolkit's six minimum requirements for endorsement to the national awards (Checklist I).
  min_requirements jsonb not null default '{}'::jsonb,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'final')),
  finalized_by uuid,
  finalized_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  unique (tenant_id, assessment_year)
);
create unique index if not exists ddrive_governance_assessments_ref on public.ddrive_governance_assessments (tenant_id, ref);

create table if not exists public.ddrive_governance_ratings (
  assessment_id text not null references public.ddrive_governance_assessments (id) on delete cascade,
  item_code text not null references public.ddrive_gk_items (code),
  tenant_id uuid not null references public.ddrive_tenants (id),
  score int check (score between 0 and 3),
  evidence text check (evidence is null or length(evidence) <= 4000),   -- means of verification held, with references
  gap_note text check (gap_note is null or length(gap_note) <= 2000),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (assessment_id, item_code)
);

-- Scores per section and overall, computed as the toolkit does. The weighted mean is shown only when every item is rated.
create or replace view public.ddrive_governance_scores with (security_invoker = true) as
with s as (
  select a.id as assessment_id, sec.key as section, sec.title, sec.weight, sec.sort,
         count(i.code) as items, count(r.score) as rated, avg(r.score)::numeric(4, 2) as average
  from public.ddrive_governance_assessments a
  cross join public.ddrive_gk_sections sec
  join public.ddrive_gk_items i on i.section = sec.key
  left join public.ddrive_governance_ratings r on r.assessment_id = a.id and r.item_code = i.code
  group by a.id, sec.key, sec.title, sec.weight, sec.sort
)
select s.*,
       sum(s.items) over (partition by s.assessment_id) as total_items,
       sum(s.rated) over (partition by s.assessment_id) as total_rated,
       case when sum(s.rated) over (partition by s.assessment_id) = sum(s.items) over (partition by s.assessment_id)
            then round(sum(s.average * s.weight) over (partition by s.assessment_id), 2) end as weighted_mean
from s;

create or replace function public.ddrive_gk_band(p numeric)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case when p is null then null when p >= 2.5 then 'Gold Recognition' when p >= 2.0 then 'Silver Recognition'
              when p >= 1.5 then 'Bronze Recognition' when p >= 0.5 then 'Partially Compliant' else 'Non-Compliant' end
$$;

create or replace function public.ddrive_governance_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  stepping boolean := current_user not in ('authenticated', 'anon');
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.finalized_by := null; new.finalized_at := null;
    return new;
  end if;
  if stepping then return new; end if;
  if old.status = 'final' then
    raise exception 'This assessment is final. Start next year''s assessment to record changes.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status or new.finalized_by is distinct from old.finalized_by or new.finalized_at is distinct from old.finalized_at then
    raise exception 'Use "Finalise" to finish an assessment.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_governance_rating_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  a public.ddrive_governance_assessments;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into a from public.ddrive_governance_assessments where id = new.assessment_id;
  if a.id is null then raise exception 'No such assessment.' using errcode = '42501'; end if;
  new.tenant_id := a.tenant_id;
  if a.status = 'final' then
    raise exception 'This assessment is final and its ratings cannot change.' using errcode = '42501';
  end if;
  new.updated_by := auth.uid(); new.updated_at := now();
  return new;
end;
$$;

create or replace function public.ddrive_governance_finalise(p_id text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.ddrive_governance_assessments;
  missing int;
begin
  select * into a from public.ddrive_governance_assessments where id = p_id for update;
  if a.id is null or not public.ddrive_is_member(a.tenant_id) then raise exception 'No such assessment.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(a.tenant_id, 'drrm_officer') then
    raise exception 'Only a DRRM officer or administrator can finalise an assessment.' using errcode = '42501';
  end if;
  if a.status <> 'draft' then raise exception 'This assessment is already final.' using errcode = '22023'; end if;
  select count(*) into missing from public.ddrive_gk_items i
   where not exists (select 1 from public.ddrive_governance_ratings r where r.assessment_id = p_id and r.item_code = i.code and r.score is not null);
  if missing > 0 then
    raise exception 'Not rated yet: % of the 32 indicators.', missing using errcode = '22023';
  end if;
  if (select count(*) from jsonb_each(a.min_requirements) where value in ('true'::jsonb, 'false'::jsonb)) < 6 then
    raise exception 'Answer all six minimum requirements first.' using errcode = '22023';
  end if;
  update public.ddrive_governance_assessments set status = 'final', finalized_by = auth.uid(), finalized_at = now() where id = p_id;
  return 'final';
end;
$$;

-- ═══ Integration: risk mainstreaming register ═════════════════════════════════
-- A priority risk carried into a governance instrument, with the CDRA decision-area analysis
-- (decision area, technical findings, implications, policy intervention) from the CLUP supplemental guidelines.
create table if not exists public.ddrive_mainstreaming (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  risk_id text not null references public.ddrive_risks (id),
  instrument text not null check (instrument in ('ldrrmp', 'contingency_plan', 'clup', 'zoning_ordinance', 'cdp', 'pdpfp', 'ldip', 'aip',
                                                 'lccap', 'ordinance', 'executive_order', 'pscp', 'other')),
  instrument_ref text check (instrument_ref is null or length(instrument_ref) <= 300),   -- e.g. "CLUP 2024-2032, Policy 3.2"
  plan_id text references public.ddrive_plans (id) on delete set null,                -- when the instrument is a plan kept in DDRiVE-M
  decision_area text check (decision_area is null or length(decision_area) <= 500),
  technical_findings text check (technical_findings is null or length(technical_findings) <= 4000),
  implications text check (implications is null or length(implications) <= 4000),
  policy_intervention text not null check (length(btrim(policy_intervention)) between 5 and 4000),
  status text not null default 'proposed' check (status in ('proposed', 'included', 'adopted')),
  adoption_ref text check (adoption_ref is null or length(adoption_ref) <= 300),         -- resolution or ordinance number
  adopted_by uuid,
  adopted_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_mainstreaming_ref on public.ddrive_mainstreaming (tenant_id, ref);
create index if not exists ddrive_mainstreaming_risk on public.ddrive_mainstreaming (risk_id);

create or replace function public.ddrive_mainstreaming_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  t uuid;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select tenant_id into t from public.ddrive_risks where id = new.risk_id;
  if t is distinct from new.tenant_id then raise exception 'That risk is not in your organisation.' using errcode = '42501'; end if;
  if new.plan_id is not null then
    select tenant_id into t from public.ddrive_plans where id = new.plan_id;
    if t is distinct from new.tenant_id then raise exception 'That plan is not in your organisation.' using errcode = '42501'; end if;
  end if;
  if tg_op = 'UPDATE' and old.status = 'adopted' then
    raise exception 'An adopted entry is a record of the adopted instrument. Add a new entry for a revision.' using errcode = '42501';
  end if;
  if new.status = 'adopted' then
    if not public.ddrive_has_role(new.tenant_id, 'drrm_officer') then
      raise exception 'Only a DRRM officer or administrator can record an adoption.' using errcode = '42501';
    end if;
    if length(btrim(coalesce(new.adoption_ref, ''))) < 3 then
      raise exception 'Record the adopting resolution, ordinance or approval reference.' using errcode = '22023';
    end if;
    new.adopted_by := auth.uid(); new.adopted_at := now();
  else
    new.adopted_by := null; new.adopted_at := null;
  end if;
  return new;
end;
$$;

-- Each register risk with what has been done to embed it: instruments (adopted / all), actions (approved / funded) and money committed.
create or replace view public.ddrive_risk_integration with (security_invoker = true) as
select r.id as risk_id, r.ref, r.title, r.level, r.score, r.ddrive_risk_code, r.tenant_id,
       (select count(*) from public.ddrive_mainstreaming m where m.risk_id = r.id) as instruments,
       (select count(*) from public.ddrive_mainstreaming m where m.risk_id = r.id and m.status = 'adopted') as instruments_adopted,
       (select array_agg(distinct m.instrument) from public.ddrive_mainstreaming m where m.risk_id = r.id and m.status = 'adopted') as adopted_in,
       (select count(*) from public.ddrive_response_actions a where a.risk_id = r.id and a.status in ('approved', 'in_progress', 'done')) as actions_approved,
       (select count(*) from public.ddrive_response_actions a where a.risk_id = r.id and a.budget_line_id is not null and a.status not in ('declined', 'cancelled')) as actions_funded,
       (select coalesce(sum(a.cost_php), 0) from public.ddrive_response_actions a where a.risk_id = r.id and a.budget_line_id is not null and a.status not in ('declined', 'cancelled')) as funded_php
from public.ddrive_risks r;

-- ═══ Enhancement: plan content, adoption, forms ═══════════════════════════════
alter table public.ddrive_plans add column if not exists template_key text;
alter table public.ddrive_plans add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.ddrive_plans add column if not exists hazard text;
alter table public.ddrive_plans add column if not exists period_from int;
alter table public.ddrive_plans add column if not exists period_to int;
alter table public.ddrive_plans add column if not exists adoption_ref text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_plans_template') then
    alter table public.ddrive_plans add constraint ddrive_plans_template check (template_key is null or template_key in
      ('ldrrmp', 'contingency_plan', 'eoc_manual', 'recovery_program', 'pscp', 'lccap', 'communication_plan'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ddrive_plans_period') then
    alter table public.ddrive_plans add constraint ddrive_plans_period check (period_from is null or period_to is null or period_to >= period_from);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ddrive_plans_content_size') then
    alter table public.ddrive_plans add constraint ddrive_plans_content_size check (pg_column_size(content) <= 2000000);
  end if;
end $$;

-- Plans made from a template are approved only with their adopting resolution (Minimum Standards Vol. 2: "Adopted thru SP/SB Resolution").
create or replace function public.ddrive_plan_adoption_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if new.status = 'Approved' and old.status <> 'Approved' and new.template_key is not null
     and length(btrim(coalesce(new.adoption_ref, ''))) < 3 then
    raise exception 'Record the adopting resolution (Sanggunian or council) before approving this plan.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create table if not exists public.ddrive_form_records (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  form_key text not null check (form_key in ('ldrrmp_review', 'initial_report', 'situation_report', 'school_ec_notice', 'after_action_report')),
  title text not null check (length(btrim(title)) between 3 and 200),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 500000),
  plan_id text references public.ddrive_plans (id) on delete set null,
  incident_id text references public.ddrive_incidents (id) on delete set null,
  exercise_id text,   -- foreign key added below, once the table exists
  status text not null default 'draft' check (status in ('draft', 'final')),
  finalized_by uuid,
  finalized_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_form_records_ref on public.ddrive_form_records (tenant_id, ref);

create or replace function public.ddrive_form_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  t uuid;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.finalized_by := null; new.finalized_at := null;
  elsif old.status = 'final' then
    raise exception 'This form is final and cannot be changed.' using errcode = '42501';
  end if;
  if new.plan_id is not null then
    select tenant_id into t from public.ddrive_plans where id = new.plan_id;
    if t is distinct from new.tenant_id then raise exception 'That plan is not in your organisation.' using errcode = '42501'; end if;
  end if;
  if new.incident_id is not null then
    select tenant_id into t from public.ddrive_incidents where id = new.incident_id;
    if t is distinct from new.tenant_id then raise exception 'That incident is not in your organisation.' using errcode = '42501'; end if;
  end if;
  if new.status = 'final' and old.status = 'draft' then
    -- A review result (certificate) and an after-action report are signed off by a DRRM officer; reports by a responder.
    if new.form_key in ('ldrrmp_review', 'after_action_report') and not public.ddrive_has_role(new.tenant_id, 'drrm_officer') then
      raise exception 'Only a DRRM officer or administrator can finalise this form.' using errcode = '42501';
    end if;
    new.finalized_by := auth.uid(); new.finalized_at := now();
  end if;
  return new;
end;
$$;

-- ═══ Validation: exercises that test plans ════════════════════════════════════
create table if not exists public.ddrive_exercises (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  plan_id text references public.ddrive_plans (id) on delete set null,
  title text not null check (length(btrim(title)) between 3 and 200),
  exercise_type text not null check (exercise_type in ('tabletop', 'drill', 'functional', 'full_scale')),
  hazard text,
  scenario text check (scenario is null or length(scenario) <= 8000),
  participants text check (participants is null or length(participants) <= 2000),
  scheduled_on date,
  conducted_on date,
  status text not null default 'planned' check (status in ('planned', 'conducted', 'evaluated', 'cancelled')),
  evaluation_summary text,
  evaluated_by uuid,
  evaluated_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_exercises_ref on public.ddrive_exercises (tenant_id, ref);
create index if not exists ddrive_exercises_plan on public.ddrive_exercises (plan_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_form_records_exercise_fk') then
    alter table public.ddrive_form_records add constraint ddrive_form_records_exercise_fk
      foreign key (exercise_id) references public.ddrive_exercises (id) on delete set null;
  end if;
end $$;

-- What an exercise tests: its objectives, the plan's assumptions, capabilities (from the standards) and coordination,
-- each with what is expected, what was observed and the result.
create table if not exists public.ddrive_exercise_checks (
  id text primary key default gen_random_uuid()::text,
  exercise_id text not null references public.ddrive_exercises (id) on delete cascade,
  tenant_id uuid not null references public.ddrive_tenants (id),
  sort int not null default 0,
  kind text not null check (kind in ('objective', 'assumption', 'capability', 'coordination')),
  statement text not null check (length(btrim(statement)) between 3 and 1000),
  expected text check (expected is null or length(expected) <= 2000),
  source text check (source is null or length(source) <= 300),     -- the standard or plan section it comes from
  observed text check (observed is null or length(observed) <= 4000),
  result text check (result is null or result in ('met', 'partly', 'not_met', 'not_tested')),
  recommendation text check (recommendation is null or length(recommendation) <= 2000),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create index if not exists ddrive_exercise_checks_ex on public.ddrive_exercise_checks (exercise_id, sort);

create or replace function public.ddrive_exercise_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  stepping boolean := current_user not in ('authenticated', 'anon');
  t uuid;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if new.plan_id is not null then
    select tenant_id into t from public.ddrive_plans where id = new.plan_id;
    if t is distinct from new.tenant_id then raise exception 'That plan is not in your organisation.' using errcode = '42501'; end if;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'planned'; new.conducted_on := null; new.evaluation_summary := null; new.evaluated_by := null; new.evaluated_at := null;
    return new;
  end if;
  if stepping then return new; end if;
  if old.status in ('evaluated', 'cancelled') then
    raise exception 'This exercise is closed. Plan a new exercise to test again.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status or new.conducted_on is distinct from old.conducted_on
     or new.evaluation_summary is distinct from old.evaluation_summary or new.evaluated_by is distinct from old.evaluated_by
     or new.evaluated_at is distinct from old.evaluated_at then
    raise exception 'Use the exercise''s steps (record as conducted, evaluate, cancel).' using errcode = '42501';
  end if;
  if new.plan_id is distinct from old.plan_id and old.status <> 'planned' then
    raise exception 'The plan tested cannot change after the exercise is conducted.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.ddrive_exercise_check_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  e public.ddrive_exercises;
begin
  if public.ddrive_is_admin_context() then return coalesce(new, old); end if;
  select * into e from public.ddrive_exercises where id = coalesce(new.exercise_id, old.exercise_id);
  if e.id is null then raise exception 'No such exercise.' using errcode = '42501'; end if;
  if e.status in ('evaluated', 'cancelled') then raise exception 'This exercise is closed.' using errcode = '42501'; end if;
  if tg_op = 'DELETE' then
    if e.status <> 'planned' then raise exception 'Checks cannot be removed after the exercise is conducted.' using errcode = '42501'; end if;
    return old;
  end if;
  new.tenant_id := e.tenant_id;
  if new.result is not null and new.result <> 'not_tested' and e.status = 'planned' then
    raise exception 'Record the exercise as conducted before rating what was observed.' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and e.status <> 'planned' and (new.statement is distinct from old.statement or new.expected is distinct from old.expected or new.kind is distinct from old.kind) then
    raise exception 'What was tested cannot change after the exercise; record what was observed instead.' using errcode = '42501';
  end if;
  new.updated_by := auth.uid(); new.updated_at := now();
  return new;
end;
$$;

create or replace function public.ddrive_exercise_for_step(p_id text, p_min public.ddrive_role)
returns public.ddrive_exercises language plpgsql set search_path = public, pg_temp as $$
declare
  e public.ddrive_exercises;
begin
  select * into e from public.ddrive_exercises where id = p_id for update;
  if e.id is null or not public.ddrive_is_member(e.tenant_id) then raise exception 'No such exercise.' using errcode = '42501'; end if;
  if not public.ddrive_has_role(e.tenant_id, p_min) then
    raise exception 'This step needs the % role or higher.', replace(p_min::text, '_', ' ') using errcode = '42501';
  end if;
  return e;
end;
$$;

-- Record that the exercise took place (analyst or higher). It must test something.
create or replace function public.ddrive_exercise_conducted(p_id text, p_on date)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  e public.ddrive_exercises := public.ddrive_exercise_for_step(p_id, 'analyst');
begin
  if e.status <> 'planned' then raise exception 'Only a planned exercise can be recorded as conducted.' using errcode = '22023'; end if;
  if p_on is null or p_on > current_date then raise exception 'Give the date the exercise was held (not in the future).' using errcode = '22023'; end if;
  if not exists (select 1 from public.ddrive_exercise_checks where exercise_id = p_id) then
    raise exception 'Add what the exercise tests (objectives, assumptions, capabilities) first.' using errcode = '22023';
  end if;
  update public.ddrive_exercises set status = 'conducted', conducted_on = p_on where id = p_id;
  return 'conducted';
end;
$$;

-- Close the evaluation (DRRM officer). Every check needs a result; every gap needs a recommendation.
create or replace function public.ddrive_exercise_evaluate(p_id text, p_summary text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  e public.ddrive_exercises := public.ddrive_exercise_for_step(p_id, 'drrm_officer');
  n int;
begin
  if e.status <> 'conducted' then raise exception 'Only a conducted exercise can be evaluated.' using errcode = '22023'; end if;
  select count(*) into n from public.ddrive_exercise_checks where exercise_id = p_id and result is null;
  if n > 0 then raise exception 'Checks without a result: %.', n using errcode = '22023'; end if;
  select count(*) into n from public.ddrive_exercise_checks
   where exercise_id = p_id and result in ('partly', 'not_met') and length(btrim(coalesce(recommendation, ''))) < 5;
  if n > 0 then raise exception 'Gaps without a recommendation: %.', n using errcode = '22023'; end if;
  if length(btrim(coalesce(p_summary, ''))) < 20 then
    raise exception 'Write the evaluation summary: what worked, what did not, and what changes.' using errcode = '22023';
  end if;
  update public.ddrive_exercises set status = 'evaluated', evaluation_summary = btrim(p_summary), evaluated_by = auth.uid(), evaluated_at = now() where id = p_id;
  return 'evaluated';
end;
$$;

create or replace function public.ddrive_exercise_cancel(p_id text, p_reason text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  e public.ddrive_exercises := public.ddrive_exercise_for_step(p_id, 'drrm_officer');
begin
  if e.status <> 'planned' then raise exception 'Only a planned exercise can be cancelled.' using errcode = '22023'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then raise exception 'Say why the exercise is cancelled.' using errcode = '22023'; end if;
  update public.ddrive_exercises set status = 'cancelled', evaluation_summary = 'Cancelled: ' || btrim(p_reason), evaluated_by = auth.uid(), evaluated_at = now() where id = p_id;
  return 'cancelled';
end;
$$;

-- When each plan was last tested, and how it went. Toolkit 3.1 asks for an AAR of a SIMEX within the last three years.
create or replace view public.ddrive_plan_test_status with (security_invoker = true) as
select p.id as plan_id, p.tenant_id,
       max(e.conducted_on) filter (where e.status = 'evaluated') as last_tested_on,
       count(e.id) filter (where e.status = 'evaluated') as exercises_evaluated,
       count(e.id) filter (where e.status in ('planned', 'conducted')) as exercises_open,
       (select count(*) from public.ddrive_exercise_checks c join public.ddrive_exercises x on x.id = c.exercise_id
         where x.plan_id = p.id and x.status = 'evaluated' and c.result in ('partly', 'not_met')) as gaps_found
from public.ddrive_plans p
left join public.ddrive_exercises e on e.plan_id = p.id
group by p.id, p.tenant_id;

-- ═══ Improvement actions from exercise gaps (Validation → Response) ═══════════
alter table public.ddrive_response_actions drop constraint if exists ddrive_response_actions_origin_check;
alter table public.ddrive_response_actions add constraint ddrive_response_actions_origin_check
  check (origin in ('diagnosis', 'detection', 'manual', 'validation'));
alter table public.ddrive_response_actions add column if not exists exercise_check_id text
  references public.ddrive_exercise_checks (id) on delete set null;

create or replace function public.ddrive_response_action_validation_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  c record;
begin
  if public.ddrive_is_admin_context() or current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'UPDATE' then
    if new.exercise_check_id is distinct from old.exercise_check_id then
      raise exception 'What an action responds to cannot be changed. Propose a new action instead.' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.origin = 'validation' then
    if new.exercise_check_id is null then
      raise exception 'An improvement action from Validation must name the exercise finding it addresses.' using errcode = '22023';
    end if;
    select ch.result, ch.tenant_id into c from public.ddrive_exercise_checks ch where ch.id = new.exercise_check_id;
    if c.tenant_id is distinct from new.tenant_id then raise exception 'That exercise finding is not in your organisation.' using errcode = '42501'; end if;
    if c.result not in ('partly', 'not_met') then
      raise exception 'Only a finding rated "partly met" or "not met" needs an improvement action.' using errcode = '22023';
    end if;
    if not public.ddrive_has_role(new.tenant_id, 'analyst') then
      raise exception 'Only an analyst or higher can propose improvement actions from an exercise.' using errcode = '42501';
    end if;
  elsif new.exercise_check_id is not null then
    raise exception 'Only improvement actions from Validation name an exercise finding.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ═══ Triggers ═════════════════════════════════════════════════════════════════
do $$
declare
  r record;
begin
  for r in select * from (values ('ddrive_governance_assessments', 'G'), ('ddrive_mainstreaming', 'M'), ('ddrive_form_records', 'F'),
                                 ('ddrive_exercises', 'X')) as v(tbl, prefix) loop
    execute format('drop trigger if exists ddrive_10_touch on public.%I', r.tbl);
    execute format('create trigger ddrive_10_touch before insert or update on public.%I for each row execute function public.ddrive_touch(%L)', r.tbl, r.prefix);
    execute format('drop trigger if exists ddrive_90_audit on public.%I', r.tbl);
    execute format('create trigger ddrive_90_audit after insert or update or delete on public.%I for each row execute function public.ddrive_audit()', r.tbl);
  end loop;
end $$;
drop trigger if exists ddrive_20_guard on public.ddrive_governance_assessments;
create trigger ddrive_20_guard before insert or update on public.ddrive_governance_assessments for each row execute function public.ddrive_governance_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_governance_ratings;
create trigger ddrive_20_guard before insert or update on public.ddrive_governance_ratings for each row execute function public.ddrive_governance_rating_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_governance_ratings;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_governance_ratings for each row execute function public.ddrive_audit();
drop trigger if exists ddrive_20_guard on public.ddrive_mainstreaming;
create trigger ddrive_20_guard before insert or update on public.ddrive_mainstreaming for each row execute function public.ddrive_mainstreaming_guard();
drop trigger if exists ddrive_25_adoption on public.ddrive_plans;
create trigger ddrive_25_adoption before update on public.ddrive_plans for each row execute function public.ddrive_plan_adoption_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_form_records;
create trigger ddrive_20_guard before insert or update on public.ddrive_form_records for each row execute function public.ddrive_form_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_exercises;
create trigger ddrive_20_guard before insert or update on public.ddrive_exercises for each row execute function public.ddrive_exercise_guard();
drop trigger if exists ddrive_20_guard on public.ddrive_exercise_checks;
create trigger ddrive_20_guard before insert or update or delete on public.ddrive_exercise_checks for each row execute function public.ddrive_exercise_check_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_exercise_checks;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_exercise_checks for each row execute function public.ddrive_audit();
drop trigger if exists ddrive_26_validation on public.ddrive_response_actions;
create trigger ddrive_26_validation before insert or update on public.ddrive_response_actions for each row execute function public.ddrive_response_action_validation_guard();

-- ═══ Access ═══════════════════════════════════════════════════════════════════
alter table public.ddrive_ndrrmp_outputs enable row level security;
alter table public.ddrive_gk_sections enable row level security;
alter table public.ddrive_gk_items enable row level security;
drop policy if exists ndrrmp_outputs_read on public.ddrive_ndrrmp_outputs;
drop policy if exists gk_sections_read on public.ddrive_gk_sections;
drop policy if exists gk_items_read on public.ddrive_gk_items;
create policy ndrrmp_outputs_read on public.ddrive_ndrrmp_outputs for select to authenticated using (true);
create policy gk_sections_read on public.ddrive_gk_sections for select to authenticated using (true);
create policy gk_items_read on public.ddrive_gk_items for select to authenticated using (true);
revoke all on public.ddrive_ndrrmp_outputs, public.ddrive_gk_sections, public.ddrive_gk_items from anon, authenticated;
grant select on public.ddrive_ndrrmp_outputs, public.ddrive_gk_sections, public.ddrive_gk_items to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['ddrive_governance_assessments', 'ddrive_governance_ratings', 'ddrive_mainstreaming', 'ddrive_form_records',
                           'ddrive_exercises', 'ddrive_exercise_checks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.ddrive_is_member(tenant_id))', t || '_select', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
-- Analysts keep the assessment, register, plans' exercises and forms; responders write reports.
create policy ddrive_governance_assessments_insert on public.ddrive_governance_assessments for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_governance_assessments_update on public.ddrive_governance_assessments for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_governance_ratings_insert on public.ddrive_governance_ratings for insert to authenticated
  with check (exists (select 1 from public.ddrive_governance_assessments a where a.id = assessment_id and public.ddrive_has_role(a.tenant_id, 'analyst')));
create policy ddrive_governance_ratings_update on public.ddrive_governance_ratings for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_mainstreaming_insert on public.ddrive_mainstreaming for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_mainstreaming_update on public.ddrive_mainstreaming for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_mainstreaming_delete on public.ddrive_mainstreaming for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst') and status = 'proposed');
create policy ddrive_form_records_insert on public.ddrive_form_records for insert to authenticated with check (
  public.ddrive_has_role(tenant_id, case when form_key in ('initial_report', 'situation_report', 'school_ec_notice') then 'responder'::public.ddrive_role else 'analyst'::public.ddrive_role end));
create policy ddrive_form_records_update on public.ddrive_form_records for update to authenticated
  using (public.ddrive_has_role(tenant_id, case when form_key in ('initial_report', 'situation_report', 'school_ec_notice') then 'responder'::public.ddrive_role else 'analyst'::public.ddrive_role end))
  with check (public.ddrive_has_role(tenant_id, case when form_key in ('initial_report', 'situation_report', 'school_ec_notice') then 'responder'::public.ddrive_role else 'analyst'::public.ddrive_role end));
create policy ddrive_form_records_delete on public.ddrive_form_records for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst') and status = 'draft');
create policy ddrive_exercises_insert on public.ddrive_exercises for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_exercises_update on public.ddrive_exercises for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_exercise_checks_insert on public.ddrive_exercise_checks for insert to authenticated
  with check (exists (select 1 from public.ddrive_exercises e where e.id = exercise_id and public.ddrive_has_role(e.tenant_id, 'analyst')));
create policy ddrive_exercise_checks_update on public.ddrive_exercise_checks for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy ddrive_exercise_checks_delete on public.ddrive_exercise_checks for delete to authenticated using (public.ddrive_has_role(tenant_id, 'analyst'));

grant select, insert, update on public.ddrive_governance_assessments, public.ddrive_governance_ratings, public.ddrive_exercises to authenticated;
grant select, insert, update, delete on public.ddrive_mainstreaming, public.ddrive_form_records, public.ddrive_exercise_checks to authenticated;
revoke all on public.ddrive_governance_scores, public.ddrive_risk_integration, public.ddrive_plan_test_status from anon, authenticated;
grant select on public.ddrive_governance_scores, public.ddrive_risk_integration, public.ddrive_plan_test_status to authenticated;
revoke all on function public.ddrive_exercise_for_step(text, public.ddrive_role) from public, anon, authenticated;
do $$
declare
  f text;
begin
  foreach f in array array['public.ddrive_governance_finalise(text)', 'public.ddrive_exercise_conducted(text, date)',
                           'public.ddrive_exercise_evaluate(text, text)', 'public.ddrive_exercise_cancel(text, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
