-- Phase 3 → 4: link response actions to incidents, and fund them from DRRM budget lines in Integration (ADR-009).
--
-- An action can name the incident it serves (coordination, Phase 3) and the budget line that funds it (Phase 4,
-- Integration: risk priorities embedded in budgets). Budget lines follow the LDRRMF rules: at least 5% of the LGU's
-- estimated revenue from regular sources, of which 30% is the Quick Response Fund and 70% is for prevention and
-- mitigation, preparedness, response, and rehabilitation and recovery (RA 10121 s. 21; NDRRMC-DBM-DILG JMC 2013-1),
-- reflected in the Annual Investment Plan. Other sources (20% Development Fund, GAD, national, external) are kept
-- apart so totals per fund stay honest.
--
--   draft ──approve──▶ approved ──close──▶ closed
--
-- Funding an action commits its estimated cost to an approved line; a line cannot be committed beyond its amount.
-- Safe to run more than once.

-- ─── Budget lines ────────────────────────────────────────────────────────────
create table if not exists public.ddrive_budget_lines (
  id text primary key default gen_random_uuid()::text,
  ref text,
  tenant_id uuid not null references public.ddrive_tenants (id),
  fiscal_year int not null check (fiscal_year between 2000 and 2100),
  fund_source text not null check (fund_source in (
    'ldrrmf_70',          -- LDRRMF, 70% portion: prevention/mitigation, preparedness, response, rehabilitation/recovery
    'ldrrmf_qrf_30',      -- LDRRMF, 30% Quick Response Fund: only under a state of calamity
    'ldrrmf_trust_fund',  -- unexpended LDRRMF in the Special Trust Fund (usable within five years)
    'development_fund_20',
    'gad',
    'agency_budget',      -- a national agency's or company's own budget line
    'external',           -- grants, donations, ODA, partners
    'other')),
  drrm_area text not null check (drrm_area in ('prevention_mitigation', 'preparedness', 'response', 'rehabilitation_recovery')),
  title text not null check (length(btrim(title)) between 3 and 200),
  description text check (description is null or length(description) <= 4000),
  aip_code text check (aip_code is null or length(aip_code) <= 60),
  amount_php numeric(16, 2) not null check (amount_php > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'closed')),
  approval_basis text,          -- e.g. Sanggunian resolution or AIP approval reference
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz, version int
);
create unique index if not exists ddrive_budget_lines_ref on public.ddrive_budget_lines (tenant_id, ref);
create index if not exists ddrive_budget_lines_year on public.ddrive_budget_lines (tenant_id, fiscal_year);

-- ─── Links on actions ────────────────────────────────────────────────────────
alter table public.ddrive_response_actions add column if not exists incident_id text
  references public.ddrive_incidents (id) on delete set null;
alter table public.ddrive_response_actions add column if not exists budget_line_id text
  references public.ddrive_budget_lines (id) on delete restrict;
alter table public.ddrive_response_actions add column if not exists funded_by uuid;
alter table public.ddrive_response_actions add column if not exists funded_at timestamptz;
create index if not exists ddrive_response_actions_incident on public.ddrive_response_actions (incident_id);
create index if not exists ddrive_response_actions_budget on public.ddrive_response_actions (budget_line_id);

-- Committed amount per line: the estimated cost of every funded action that is not declined or cancelled.
drop view if exists public.ddrive_budget_line_status;
create view public.ddrive_budget_line_status with (security_invoker = true) as
select l.*,
       coalesce(sum(a.cost_php) filter (where a.status not in ('declined', 'cancelled')), 0)::numeric(16, 2) as committed_php,
       (l.amount_php - coalesce(sum(a.cost_php) filter (where a.status not in ('declined', 'cancelled')), 0))::numeric(16, 2) as available_php,
       count(a.id) filter (where a.status not in ('declined', 'cancelled'))::int as action_count
from public.ddrive_budget_lines l
left join public.ddrive_response_actions a on a.budget_line_id = l.id
group by l.id;

-- ─── Guard: links on actions change only through the steps ───────────────────
create or replace function public.ddrive_response_action_link_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  stepping boolean := current_user not in ('authenticated', 'anon');
  t uuid;
begin
  if public.ddrive_is_admin_context() or stepping then return new; end if;
  if tg_op = 'INSERT' then
    new.budget_line_id := null; new.funded_by := null; new.funded_at := null;   -- funding is a decision, not a proposal
    if new.incident_id is not null then
      select tenant_id into t from public.ddrive_incidents where id = new.incident_id;
      if t is distinct from new.tenant_id then raise exception 'That incident is not in your organisation.' using errcode = '42501'; end if;
    end if;
    return new;
  end if;
  if new.incident_id is distinct from old.incident_id then
    raise exception 'Use "Link to incident" to change the incident an action serves.' using errcode = '42501';
  end if;
  if new.budget_line_id is distinct from old.budget_line_id or new.funded_by is distinct from old.funded_by
     or new.funded_at is distinct from old.funded_at then
    raise exception 'Use "Fund from budget line" to change how an action is funded.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ─── Guard: budget lines ─────────────────────────────────────────────────────
create or replace function public.ddrive_budget_line_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  stepping boolean := current_user not in ('authenticated', 'anon');
begin
  if public.ddrive_is_admin_context() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.approval_basis := null; new.approved_by := null; new.approved_at := null;
    return new;
  end if;
  if stepping then return new; end if;
  if new.status is distinct from old.status or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at or new.approval_basis is distinct from old.approval_basis then
    raise exception 'Use the budget line''s steps (approve, close) to change its status.' using errcode = '42501';
  end if;
  if old.status <> 'draft' then
    raise exception 'An approved budget line is fixed. Close it and add a new line to change it.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ─── Steps ───────────────────────────────────────────────────────────────────
-- Link an action to an incident, or unlink it (p_incident_id null). Responder or higher; not on declined or
-- cancelled actions. Linking records coordination and does not change what the action is.
create or replace function public.ddrive_response_link_incident(p_id text, p_incident_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions := public.ddrive_response_action_for_step(p_id, 'responder');
  t uuid;
begin
  if a.status in ('declined', 'cancelled') then
    raise exception 'A declined or cancelled action cannot be linked.' using errcode = '22023';
  end if;
  if p_incident_id is not null then
    select tenant_id into t from public.ddrive_incidents where id = p_incident_id;
    if t is distinct from a.tenant_id then raise exception 'That incident is not in your organisation.' using errcode = '42501'; end if;
  end if;
  update public.ddrive_response_actions set incident_id = p_incident_id where id = p_id;
  return coalesce(p_incident_id, 'unlinked');
end;
$$;

-- Fund an action from an approved budget line of the same organisation, or remove its funding (p_line_id null).
-- DRRM officer. The action must be approved, in progress or done, and have an estimated cost; the line must have
-- that much uncommitted. Lines are locked while checking, so two officers cannot over-commit the same line.
create or replace function public.ddrive_response_fund(p_id text, p_line_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.ddrive_response_actions := public.ddrive_response_action_for_step(p_id, 'drrm_officer');
  l public.ddrive_budget_lines;
  committed numeric;
begin
  if p_line_id is null then
    if a.status = 'done' then
      raise exception 'A completed action keeps its funding record.' using errcode = '22023';
    end if;
    update public.ddrive_response_actions set budget_line_id = null, funded_by = null, funded_at = null where id = p_id;
    return 'unfunded';
  end if;
  if a.status not in ('approved', 'in_progress', 'done') then
    raise exception 'Only an approved action can be funded.' using errcode = '22023';
  end if;
  if a.cost_php is null or a.cost_php <= 0 then
    raise exception 'Add the action''s estimated cost before funding it (cancel and re-propose it with a cost).' using errcode = '22023';
  end if;
  select * into l from public.ddrive_budget_lines where id = p_line_id for update;
  if l.id is null or l.tenant_id is distinct from a.tenant_id then
    raise exception 'That budget line is not in your organisation.' using errcode = '42501';
  end if;
  if l.status <> 'approved' then
    raise exception 'Only an approved budget line can fund actions.' using errcode = '22023';
  end if;
  if l.fund_source = 'ldrrmf_qrf_30' and a.drrm_area not in ('response', 'rehabilitation_recovery') then
    raise exception 'The Quick Response Fund is for response, relief and recovery under a state of calamity (RA 10121 s. 21). Use the 70%% portion for this action.' using errcode = '22023';
  end if;
  select coalesce(sum(cost_php), 0) into committed from public.ddrive_response_actions
   where budget_line_id = l.id and id <> a.id and status not in ('declined', 'cancelled');
  if committed + a.cost_php > l.amount_php then
    raise exception 'This would commit PHP % of PHP % on %; PHP % is left.',
      to_char(committed + a.cost_php, 'FM999,999,999,990.00'), to_char(l.amount_php, 'FM999,999,999,990.00'), l.ref,
      to_char(l.amount_php - committed, 'FM999,999,999,990.00') using errcode = '22023';
  end if;
  update public.ddrive_response_actions set budget_line_id = l.id, funded_by = auth.uid(), funded_at = now() where id = p_id;
  return l.ref;
end;
$$;

create or replace function public.ddrive_budget_line_for_step(p_id text)
returns public.ddrive_budget_lines
language plpgsql
set search_path = public, pg_temp
as $$
declare
  l public.ddrive_budget_lines;
begin
  select * into l from public.ddrive_budget_lines where id = p_id for update;
  if l.id is null or not public.ddrive_is_member(l.tenant_id) then
    raise exception 'No such budget line.' using errcode = '42501';
  end if;
  if not public.ddrive_has_role(l.tenant_id, 'drrm_officer') then
    raise exception 'This step needs the drrm officer role or higher.' using errcode = '42501';
  end if;
  return l;
end;
$$;

-- Approve a draft line, citing its basis (Sanggunian resolution, approved AIP, board approval).
create or replace function public.ddrive_budget_approve(p_id text, p_basis text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.ddrive_budget_lines := public.ddrive_budget_line_for_step(p_id);
begin
  if l.status <> 'draft' then raise exception 'Only a draft budget line can be approved.' using errcode = '22023'; end if;
  if length(btrim(coalesce(p_basis, ''))) < 5 then
    raise exception 'Cite the approval (for example the Sanggunian resolution or the approved AIP).' using errcode = '22023';
  end if;
  update public.ddrive_budget_lines set status = 'approved', approval_basis = btrim(p_basis), approved_by = auth.uid(), approved_at = now()
   where id = p_id;
  return 'approved';
end;
$$;

-- Close a line at year end or when spent. Funded actions keep their record; no new funding.
create or replace function public.ddrive_budget_close(p_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.ddrive_budget_lines := public.ddrive_budget_line_for_step(p_id);
begin
  if l.status <> 'approved' then raise exception 'Only an approved budget line can be closed.' using errcode = '22023'; end if;
  update public.ddrive_budget_lines set status = 'closed' where id = p_id;
  return 'closed';
end;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists ddrive_25_link_guard on public.ddrive_response_actions;
create trigger ddrive_25_link_guard before insert or update on public.ddrive_response_actions
  for each row execute function public.ddrive_response_action_link_guard();

drop trigger if exists ddrive_10_touch on public.ddrive_budget_lines;
create trigger ddrive_10_touch before insert or update on public.ddrive_budget_lines
  for each row execute function public.ddrive_touch('B');
drop trigger if exists ddrive_20_guard on public.ddrive_budget_lines;
create trigger ddrive_20_guard before insert or update on public.ddrive_budget_lines
  for each row execute function public.ddrive_budget_line_guard();
drop trigger if exists ddrive_90_audit on public.ddrive_budget_lines;
create trigger ddrive_90_audit after insert or update or delete on public.ddrive_budget_lines
  for each row execute function public.ddrive_audit();

-- ─── Access rules ────────────────────────────────────────────────────────────
alter table public.ddrive_budget_lines enable row level security;
drop policy if exists budget_lines_select on public.ddrive_budget_lines;
drop policy if exists budget_lines_insert on public.ddrive_budget_lines;
drop policy if exists budget_lines_update on public.ddrive_budget_lines;
drop policy if exists budget_lines_delete on public.ddrive_budget_lines;
create policy budget_lines_select on public.ddrive_budget_lines for select to authenticated using (public.ddrive_is_member(tenant_id));
create policy budget_lines_insert on public.ddrive_budget_lines for insert to authenticated with check (public.ddrive_has_role(tenant_id, 'analyst'));
create policy budget_lines_update on public.ddrive_budget_lines for update to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst')) with check (public.ddrive_has_role(tenant_id, 'analyst'));
-- A draft line with nothing funded from it can be deleted (the foreign key refuses otherwise).
create policy budget_lines_delete on public.ddrive_budget_lines for delete to authenticated
  using (public.ddrive_has_role(tenant_id, 'analyst') and status = 'draft');

revoke all on public.ddrive_budget_lines from anon, authenticated;
grant select, insert, update, delete on public.ddrive_budget_lines to authenticated;
revoke all on public.ddrive_budget_line_status from anon, authenticated;
grant select on public.ddrive_budget_line_status to authenticated;
revoke all on function public.ddrive_budget_line_for_step(text) from public, anon, authenticated;
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.ddrive_response_link_incident(text, text)',
    'public.ddrive_response_fund(text, text)',
    'public.ddrive_budget_approve(text, text)',
    'public.ddrive_budget_close(text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.ddrive_budget_lines;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
