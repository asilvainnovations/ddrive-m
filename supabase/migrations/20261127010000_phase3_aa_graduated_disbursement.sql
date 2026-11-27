-- DDRiVE-M: graduated disbursement for anticipatory action, from the IRR of RA 12287.
-- See docs/adr/007-aa-graduated-disbursement.md. Requirements AA-02, AA-03; control C-05; acceptance test AT-016.
-- Safe to run more than once.
--
-- Source: Implementing Rules and Regulations of RA 12287, signed 14 September 2026 by the NDRRMC Chairperson
-- (OCD certified true copy). Rule V:
--   s. 1(b)  LGUs may include "no more than 10% of the 70% of the annual Local Disaster Risk Reduction and
--            Management Fund (LDRRMF) for anticipatory action measures"; other sources (unexpended LDRRMF in
--            the Special Trust Fund, partners, ODA, other LGUs) may also be used.
--   s. 1(c)  NDRRM Fund augmentation, subject to the approval of the President.
--   s. 2     For hydrometeorological and geological hazards, "disbursements for interventions to be undertaken
--            beyond a lead time of three (3) days shall not exceed 30% of the allocation for anticipatory
--            action, while up to 70% thereof shall be allowable to be disbursed for interventions to be
--            implemented within a maximum lead time of three (3) days." Slow-onset hazards such as drought:
--            timelines and rates "shall be further detailed in the operational guidelines". The graduation
--            "shall not apply to other funding sources ... including agency budgets, external grants or
--            donations, or other sources authorized by law".
--
-- DDRiVE-M records the allocation the competent body approved and refuses disbursements that would break
-- these limits. It does not approve allocations or disbursements.

-- ─── The rules, as data (national, read-only to users) ───────────────────────
create table if not exists public.ddrive_aa_rule_sets (
  code text primary key,
  title text not null,
  instrument text not null,
  signed_on date not null,
  effective_on date,                       -- on publication (Rule VIII s. 5); record the date once known
  ldrrmf_aa_ceiling_share numeric(5, 4) not null,   -- 10% of 70% = 0.07
  beyond_lead_share_max numeric(5, 4) not null,     -- 0.30
  within_lead_share_max numeric(5, 4) not null,     -- 0.70
  lead_threshold_hours int not null,                -- 72 (three days)
  graduated_sources text[] not null,
  graduated_hazards text[] not null,
  slow_onset_hazards text[] not null,
  citation text not null,
  active boolean not null default false
);

insert into public.ddrive_aa_rule_sets (code, title, instrument, signed_on, ldrrmf_aa_ceiling_share, beyond_lead_share_max,
  within_lead_share_max, lead_threshold_hours, graduated_sources, graduated_hazards, slow_onset_hazards, citation, active)
values ('IRR-RA12287-2026', 'Graduated disbursement for anticipatory action',
  'Implementing Rules and Regulations of RA 12287 (Declaration of State of Imminent Disaster Act)', '2026-09-14',
  0.0700, 0.3000, 0.7000, 72,
  array['ldrrmf', 'agency_budget', 'ndrrmf'],
  array['tropical_cyclone', 'flood', 'rainfall', 'storm_surge', 'volcanic', 'tsunami', 'other'],
  array['drought'],
  'IRR of RA 12287, Rule V, sections 1(b), 1(c) and 2', true)
on conflict (code) do nothing;

create or replace function public.ddrive_aa_rules()
returns public.ddrive_aa_rule_sets
language sql stable
set search_path = public, pg_temp
as $$
  select * from public.ddrive_aa_rule_sets where active order by signed_on desc limit 1
$$;

-- ─── Allocations: what the organisation set aside for anticipatory action ────
create table if not exists public.ddrive_aa_allocations (
  id text primary key default gen_random_uuid()::text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  fiscal_year int not null check (fiscal_year between 2025 and 2100),
  fund_source text not null check (fund_source in ('ldrrmf', 'agency_budget', 'ndrrmf')),
  annual_ldrrmf_php numeric(16, 2) check (annual_ldrrmf_php > 0),
  allocation_php numeric(16, 2) not null check (allocation_php > 0),
  basis text not null check (length(btrim(basis)) >= 10),     -- e.g. LDRRMF Investment Plan, Sanggunian resolution, SARO
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int,
  check (fund_source <> 'ldrrmf' or annual_ldrrmf_php is not null)
);
create unique index if not exists ddrive_aa_allocations_one on public.ddrive_aa_allocations (tenant_id, fiscal_year, fund_source);

-- ─── Measures: when the intervention is undertaken, and the lead-time band ───
alter table public.ddrive_aa_actions add column if not exists implement_by timestamptz;
alter table public.ddrive_aa_actions add column if not exists lead_band text;
alter table public.ddrive_aa_actions add column if not exists slow_onset_basis text;
do $$ begin
  alter table public.ddrive_aa_actions add constraint ddrive_aa_actions_lead_band
    check (lead_band is null or lead_band in ('beyond_3_days', 'within_3_days', 'not_graduated'));
exception when duplicate_object then null; end $$;

-- Disbursed amounts under one allocation, by lead-time band (cancelled measures excluded).
create or replace function public.ddrive_aa_disbursed(p_tenant uuid, p_year int, p_fund text, p_band text, p_except text default null)
returns numeric
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(a.disbursed_php), 0)
  from public.ddrive_aa_actions a
  join public.ddrive_aa_cases c on c.id = a.case_id
  where a.tenant_id = p_tenant and a.fund_source = p_fund and a.status <> 'cancelled'
    and (p_band is null or a.lead_band = p_band)
    and (p_except is null or a.id <> p_except)
    and extract(year from (c.declared_at at time zone 'Asia/Manila'))::int = p_year
$$;

create or replace function public.ddrive_aa_action_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c public.ddrive_aa_cases;
  r public.ddrive_aa_rule_sets := public.ddrive_aa_rules();
  al public.ddrive_aa_allocations;
  fy int;
  hours numeric;
  band_total numeric;
  all_total numeric;
  cap numeric;
  graduated_source boolean;
  slow_onset boolean;
  disbursing boolean;
begin
  if public.ddrive_is_admin_context() then return new; end if;
  select * into c from public.ddrive_aa_cases where id = new.case_id;
  if c.id is null then raise exception 'No such case.' using errcode = '23503'; end if;
  if c.tenant_id is distinct from new.tenant_id then
    raise exception 'The measure must belong to the case''s organisation.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.case_id is distinct from old.case_id then
    raise exception 'A measure cannot be moved to another case.' using errcode = '42501';
  end if;
  if c.status in ('closed', 'not_declared') then
    raise exception 'This case is closed and its measures can no longer be changed.' using errcode = '42501';
  end if;

  -- Once money has been disbursed, what determined its limit cannot change.
  if tg_op = 'UPDATE' and coalesce(old.disbursed_php, 0) > 0 and (
       new.fund_source is distinct from old.fund_source or new.implement_by is distinct from old.implement_by
    or new.amount_php < coalesce(old.disbursed_php, 0)) then
    raise exception 'After a disbursement, the fund source and implementation time cannot change, and the amount cannot fall below what was disbursed.' using errcode = '42501';
  end if;

  graduated_source := new.fund_source = any (r.graduated_sources);
  slow_onset := c.hazard = any (r.slow_onset_hazards);

  -- Lead-time band: how long before the expected onset the intervention is undertaken (IRR Rule V s. 2).
  if graduated_source and new.implement_by is not null and not slow_onset then
    hours := extract(epoch from (c.expected_onset - new.implement_by)) / 3600;
    new.lead_band := case when hours > r.lead_threshold_hours then 'beyond_3_days' else 'within_3_days' end;
  elsif not graduated_source or slow_onset then
    new.lead_band := 'not_graduated';
  else
    new.lead_band := null;
  end if;

  disbursing := coalesce(new.disbursed_php, 0) > coalesce(case when tg_op = 'UPDATE' then old.disbursed_php end, 0);
  if disbursing then
    -- RA 12287 s. 10; IRR Rule V s. 2: funds are released on the declaration and used until it is lifted.
    if c.status <> 'declared' then
      raise exception 'Funds can be disbursed only while the State of Imminent Disaster is declared (RA 12287 section 10).' using errcode = '22023';
    end if;
    if not public.ddrive_has_role(c.tenant_id, 'drrm_officer') then
      raise exception 'Only a DRRM officer or administrator can record disbursements.' using errcode = '42501';
    end if;

    if graduated_source then
      fy := extract(year from (c.declared_at at time zone 'Asia/Manila'))::int;
      -- One disbursement at a time per allocation, so two officers cannot both pass the same limit.
      perform pg_advisory_xact_lock(hashtext('ddrive_aa_alloc:' || c.tenant_id::text || ':' || fy || ':' || new.fund_source));
      select * into al from public.ddrive_aa_allocations
        where tenant_id = c.tenant_id and fiscal_year = fy and fund_source = new.fund_source;
      if al.id is null then
        raise exception 'Record the % anticipatory action allocation for this fund first (IRR of RA 12287, Rule V).', fy using errcode = '22023';
      end if;

      if slow_onset then
        -- Rule V s. 2: rates for slow-onset hazards are set by operational guidelines, not yet encoded here.
        if length(btrim(coalesce(new.slow_onset_basis, ''))) < 10 then
          raise exception 'For drought and other slow-onset hazards, cite the operational guidelines that set the disbursement rate (IRR of RA 12287, Rule V, section 2).' using errcode = '22023';
        end if;
      else
        if new.implement_by is null then
          raise exception 'Give when the intervention will be undertaken: the IRR limits disbursements by lead time (Rule V, section 2).' using errcode = '22023';
        end if;
        band_total := public.ddrive_aa_disbursed(c.tenant_id, fy, new.fund_source, new.lead_band, new.id) + new.disbursed_php;
        cap := al.allocation_php * case when new.lead_band = 'beyond_3_days' then r.beyond_lead_share_max else r.within_lead_share_max end;
        if band_total > cap then
          raise exception '% would reach PHP % against a limit of PHP % (% of the PHP % allocation; IRR of RA 12287, Rule V, section 2).',
            case when new.lead_band = 'beyond_3_days' then 'Disbursements for interventions more than 3 days before the expected onset'
                 else 'Disbursements for interventions within 3 days of the expected onset' end,
            round(band_total, 2), round(cap, 2),
            (case when new.lead_band = 'beyond_3_days' then r.beyond_lead_share_max else r.within_lead_share_max end * 100)::int || '%',
            al.allocation_php
            using errcode = '22023';
        end if;
      end if;

      -- Never more than the allocation as a whole.
      all_total := public.ddrive_aa_disbursed(c.tenant_id, fy, new.fund_source, null, new.id) + new.disbursed_php;
      if all_total > al.allocation_php then
        raise exception 'This would disburse PHP % from an allocation of PHP % for %.', round(all_total, 2), al.allocation_php, fy using errcode = '22023';
      end if;
    end if;
  end if;

  if c.status = 'lifted' and tg_op = 'INSERT' then
    raise exception 'The declaration has been lifted; no new measures can be added.' using errcode = '22023';
  end if;
  if new.status = 'done' and new.done_at is null then new.done_at := now(); end if;
  return new;
end;
$$;

-- Allocation guard: the LDRRMF ceiling, and never below what has already been disbursed.
create or replace function public.ddrive_aa_allocation_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  r public.ddrive_aa_rule_sets := public.ddrive_aa_rules();
  spent numeric;
begin
  if tg_op = 'UPDATE' and (new.fiscal_year is distinct from old.fiscal_year or new.fund_source is distinct from old.fund_source) then
    raise exception 'An allocation''s year and fund cannot change. Record a new allocation instead.' using errcode = '42501';
  end if;
  if new.fund_source = 'ldrrmf' and new.allocation_php > round(new.annual_ldrrmf_php * r.ldrrmf_aa_ceiling_share, 2) then
    raise exception 'An LGU may set aside no more than 10%% of the 70%% of its annual LDRRMF for anticipatory action: at most PHP % of PHP % (IRR of RA 12287, Rule V, section 1(b)).',
      round(new.annual_ldrrmf_php * r.ldrrmf_aa_ceiling_share, 2), new.annual_ldrrmf_php using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    spent := public.ddrive_aa_disbursed(new.tenant_id, new.fiscal_year, new.fund_source, null);
    if new.allocation_php < spent then
      raise exception 'PHP % has already been disbursed from this allocation; it cannot be reduced below that.', spent using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

-- Where each allocation stands, by lead-time band. Security invoker: members see their own organisation only.
create or replace view public.ddrive_aa_allocation_status with (security_invoker = true) as
select al.id, al.tenant_id, al.fiscal_year, al.fund_source, al.annual_ldrrmf_php, al.allocation_php, al.basis,
       r.code as rule_set, r.citation,
       round(al.allocation_php * r.beyond_lead_share_max, 2) as beyond_cap_php,
       round(al.allocation_php * r.within_lead_share_max, 2) as within_cap_php,
       public.ddrive_aa_disbursed(al.tenant_id, al.fiscal_year, al.fund_source, 'beyond_3_days') as beyond_disbursed_php,
       public.ddrive_aa_disbursed(al.tenant_id, al.fiscal_year, al.fund_source, 'within_3_days') as within_disbursed_php,
       public.ddrive_aa_disbursed(al.tenant_id, al.fiscal_year, al.fund_source, null) as total_disbursed_php
from public.ddrive_aa_allocations al
cross join lateral (select * from public.ddrive_aa_rules()) r;

-- ─── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists ddrive_10_touch on public.ddrive_aa_allocations;
create trigger ddrive_10_touch before insert or update on public.ddrive_aa_allocations
  for each row execute function public.ddrive_touch('');
drop trigger if exists ddrive_20_guard on public.ddrive_aa_allocations;
create trigger ddrive_20_guard before insert or update on public.ddrive_aa_allocations
  for each row execute function public.ddrive_aa_allocation_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_aa_allocations;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_aa_allocations
  for each row execute function public.ddrive_audit();
-- ddrive_20_guard on ddrive_aa_actions already calls ddrive_aa_action_guard(), replaced above.

-- ─── Access rules ────────────────────────────────────────────────────────────
alter table public.ddrive_aa_rule_sets enable row level security;
alter table public.ddrive_aa_allocations enable row level security;
drop policy if exists aa_rule_sets_select on public.ddrive_aa_rule_sets;
create policy aa_rule_sets_select on public.ddrive_aa_rule_sets for select to authenticated using (true);
drop policy if exists aa_allocations_select on public.ddrive_aa_allocations;
drop policy if exists aa_allocations_insert on public.ddrive_aa_allocations;
drop policy if exists aa_allocations_update on public.ddrive_aa_allocations;
create policy aa_allocations_select on public.ddrive_aa_allocations for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy aa_allocations_insert on public.ddrive_aa_allocations for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'drrm_officer'));
create policy aa_allocations_update on public.ddrive_aa_allocations for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'drrm_officer')) with check (public.ddrive_has_role(tenant_id, 'drrm_officer'));

revoke all on public.ddrive_aa_rule_sets, public.ddrive_aa_allocations, public.ddrive_aa_allocation_status from anon, authenticated;
grant select on public.ddrive_aa_rule_sets to authenticated;
grant select, insert, update on public.ddrive_aa_allocations to authenticated;   -- never deleted: financial record
grant select on public.ddrive_aa_allocation_status to authenticated;
revoke all on function public.ddrive_aa_disbursed(uuid, int, text, text, text) from public, anon;
grant execute on function public.ddrive_aa_disbursed(uuid, int, text, text, text) to authenticated;
grant execute on function public.ddrive_aa_rules() to authenticated;
