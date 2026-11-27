-- DDRiVER AI: organisation opt-in, daily limits, and an answer log (ADR-011; AI Use, Ethics and Governance Policy s. 4).
--
-- Off until an organisation administrator turns it on. Each answer is logged with the task, the model, the prompt
-- version, the sources given to the model and the answer, so it can be reviewed; the log is kept 90 days and is
-- visible to the person who asked and to the organisation's administrators. Only the ddriver-ai Edge Function
-- (service role) writes the log. AI-drafted action proposals are marked as such.
-- Safe to run more than once.

alter table public.ddrive_tenants add column if not exists ai_enabled boolean not null default false;
alter table public.ddrive_tenants add column if not exists ai_enabled_by uuid;
alter table public.ddrive_tenants add column if not exists ai_enabled_at timestamptz;
alter table public.ddrive_tenants add column if not exists ai_daily_user_limit int not null default 30;
alter table public.ddrive_tenants add column if not exists ai_daily_org_limit int not null default 300;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ddrive_tenants_ai_limits') then
    alter table public.ddrive_tenants add constraint ddrive_tenants_ai_limits
      check (ai_daily_user_limit between 1 and 500 and ai_daily_org_limit between 1 and 10000);
  end if;
end $$;

create table if not exists public.ddrive_ai_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.ddrive_tenants (id),
  user_id uuid not null,
  task text not null check (task in ('ask', 'explain_alert', 'explain_rating', 'suggest_treatments', 'situation_brief', 'funding_gaps')),
  subject_id text,                 -- the record the task was about, when there is one
  question text check (question is null or length(question) <= 2000),
  model text,
  prompt_version text,
  sources jsonb not null default '[]'::jsonb,   -- [{key, label, href}] given to the model
  answer text,
  unverified_citations int not null default 0,  -- citations the model made that were not among the sources (removed)
  input_tokens int,
  output_tokens int,
  ok boolean,
  error text,
  feedback text check (feedback is null or feedback in ('helpful', 'not_helpful')),
  feedback_note text check (feedback_note is null or length(feedback_note) <= 1000),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists ddrive_ai_log_user_day on public.ddrive_ai_log (user_id, created_at desc);
create index if not exists ddrive_ai_log_tenant_day on public.ddrive_ai_log (tenant_id, created_at desc);

alter table public.ddrive_response_actions add column if not exists ai_assisted boolean not null default false;

-- ─── Settings (organisation administrator) ───────────────────────────────────
create or replace function public.ddrive_ai_configure(p_enabled boolean, p_user_limit int default null, p_org_limit int default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t uuid := public.ddrive_active_tenant();
begin
  if t is null or not public.ddrive_has_role(t, 'tenant_admin') then
    raise exception 'Only an organisation administrator can change DDRiVER AI settings.' using errcode = '42501';
  end if;
  update public.ddrive_tenants
     set ai_enabled = p_enabled,
         ai_enabled_by = case when p_enabled then auth.uid() else ai_enabled_by end,
         ai_enabled_at = case when p_enabled and not ai_enabled then now() else ai_enabled_at end,
         ai_daily_user_limit = coalesce(p_user_limit, ai_daily_user_limit),
         ai_daily_org_limit = coalesce(p_org_limit, ai_daily_org_limit)
   where id = t;
  return case when p_enabled then 'enabled' else 'disabled' end;
end;
$$;

-- The active organisation's AI status and today's use, for the screens.
create or replace function public.ddrive_ai_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'enabled', t.ai_enabled, 'enabled_at', t.ai_enabled_at,
    'user_limit', t.ai_daily_user_limit, 'org_limit', t.ai_daily_org_limit,
    'used_by_me_today', (select count(*) from public.ddrive_ai_log l where l.user_id = auth.uid() and l.tenant_id = t.id
                          and l.created_at >= date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'),
    'used_by_org_today', (select count(*) from public.ddrive_ai_log l where l.tenant_id = t.id
                          and l.created_at >= date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'))
  from public.ddrive_tenants t
  where t.id = public.ddrive_active_tenant() and public.ddrive_is_member(t.id)
$$;

-- ─── Used by the ddriver-ai Edge Function only (service role) ────────────────
-- Checks that the user may ask now (member, organisation opted in, within limits) and opens a log row.
create or replace function public.ddrive_ai_begin(p_user uuid, p_task text, p_subject text, p_question text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t public.ddrive_tenants;
  tid uuid;
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';
  mine int; theirs int;
  v_id uuid;
begin
  select u.active_tenant_id into tid from public.ddrive_users u where u.id = p_user;
  if tid is null or not exists (select 1 from public.ddrive_memberships m where m.user_id = p_user and m.tenant_id = tid and m.status = 'active') then
    raise exception 'Choose an organisation to work in first.' using errcode = '42501';
  end if;
  select * into t from public.ddrive_tenants tt where tt.id = tid for update;
  if not t.ai_enabled then
    raise exception 'DDRiVER AI is off for your organisation. An administrator can turn it on in Settings → DDRiVER AI.' using errcode = '42501';
  end if;
  select count(*) filter (where user_id = p_user), count(*) into mine, theirs
    from public.ddrive_ai_log where tenant_id = tid and created_at >= day_start;
  if mine >= t.ai_daily_user_limit then
    raise exception 'You have used today''s % DDRiVER AI requests. The limit resets at midnight (Philippine time).', t.ai_daily_user_limit using errcode = '54000';
  end if;
  if theirs >= t.ai_daily_org_limit then
    raise exception 'Your organisation has used today''s % DDRiVER AI requests. The limit resets at midnight (Philippine time).', t.ai_daily_org_limit using errcode = '54000';
  end if;
  insert into public.ddrive_ai_log (tenant_id, user_id, task, subject_id, question)
  values (tid, p_user, p_task, p_subject, left(p_question, 2000)) returning ddrive_ai_log.id into v_id;
  return v_id;
end;
$$;

create or replace function public.ddrive_ai_finish(p_id uuid, p_ok boolean, p_model text, p_prompt_version text, p_sources jsonb,
                                                   p_answer text, p_unverified int, p_in int, p_out int, p_error text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.ddrive_ai_log
     set ok = p_ok, model = p_model, prompt_version = p_prompt_version, sources = coalesce(p_sources, '[]'::jsonb),
         answer = left(p_answer, 20000), unverified_citations = coalesce(p_unverified, 0), input_tokens = p_in, output_tokens = p_out,
         error = left(p_error, 1000), finished_at = now()
   where id = p_id and finished_at is null
$$;

-- The person who asked can rate an answer.
create or replace function public.ddrive_ai_feedback(p_id uuid, p_feedback text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.ddrive_ai_log set feedback = p_feedback, feedback_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_id and user_id = auth.uid();
  if not found then raise exception 'No such answer.' using errcode = '42501'; end if;
  return p_feedback;
end;
$$;

-- Retention: answers older than 90 days are deleted. Scheduled daily (DEPLOY.md § 5).
create or replace function public.ddrive_ai_purge()
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  with d as (delete from public.ddrive_ai_log where created_at < now() - interval '90 days' returning 1) select count(*)::int from d
$$;

-- ─── Access ──────────────────────────────────────────────────────────────────
alter table public.ddrive_ai_log enable row level security;
drop policy if exists ai_log_select on public.ddrive_ai_log;
create policy ai_log_select on public.ddrive_ai_log for select to authenticated
  using (user_id = auth.uid() or public.ddrive_has_role(tenant_id, 'tenant_admin'));
revoke all on public.ddrive_ai_log from anon, authenticated;
grant select on public.ddrive_ai_log to authenticated;   -- written only through the functions above

-- Users cannot switch AI on by editing the organisation row.
revoke update (ai_enabled, ai_enabled_by, ai_enabled_at, ai_daily_user_limit, ai_daily_org_limit) on public.ddrive_tenants from authenticated;

revoke all on function public.ddrive_ai_begin(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.ddrive_ai_finish(uuid, boolean, text, text, jsonb, text, int, int, int, text) from public, anon, authenticated;
revoke all on function public.ddrive_ai_purge() from public, anon, authenticated;
grant execute on function public.ddrive_ai_begin(uuid, text, text, text), public.ddrive_ai_finish(uuid, boolean, text, text, jsonb, text, int, int, int, text),
  public.ddrive_ai_purge() to service_role;
revoke all on function public.ddrive_ai_configure(boolean, int, int), public.ddrive_ai_status(), public.ddrive_ai_feedback(uuid, text, text) from public, anon;
grant execute on function public.ddrive_ai_configure(boolean, int, int), public.ddrive_ai_status(), public.ddrive_ai_feedback(uuid, text, text) to authenticated;
