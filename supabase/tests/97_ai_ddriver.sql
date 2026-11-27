-- DDRiVER AI settings, limits and log (ADR-011). Runs after 95 in the same database.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.uid(p_email text) returns uuid language sql security definer as $$
  select id from public.ddrive_users where email = p_email
$$;
grant execute on function tests.uid(text) to authenticated, service_role;

-- ─── Off by default ──────────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.eq('AI is off for a new organisation', $q$ select (public.ddrive_ai_status() ->> 'enabled') $q$, 'false');
select tests.refused('A member cannot switch it on', $q$ select public.ddrive_ai_configure(true) $q$);
select tests.refused('nor by editing the organisation', $q$ update public.ddrive_tenants set ai_enabled = true where id = public.ddrive_active_tenant() $q$);
select tests.refused('A user cannot open a log entry themselves', $q$ select public.ddrive_ai_begin(auth.uid(), 'ask', null, 'hi') $q$);
reset role;
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.refused('The function refuses while the organisation has not opted in', $q$ select public.ddrive_ai_begin(tests.uid('analyst@a.ph'), 'ask', null, 'What is the QRF?') $q$);
reset role;

-- ─── The administrator opts in ───────────────────────────────────────────────
select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot switch it on either', $q$ select public.ddrive_ai_configure(true) $q$);
reset role;
select tests.claims('admin@a.ph'); set role authenticated;
select tests.refused('Limits stay within range', $q$ select public.ddrive_ai_configure(true, 0, 10) $q$);
select tests.eq('The administrator switches it on with a limit of 2 a day per person', $q$ select public.ddrive_ai_configure(true, 2, 300) $q$, 'enabled');
select tests.eq('It records who and when', $q$ select (ai_enabled_by is not null and ai_enabled_at is not null)::text from public.ddrive_tenants where id = public.ddrive_active_tenant() $q$, 'true');
reset role;

-- ─── Asking ──────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.ok('The function opens a log entry for the analyst', $q$ select public.ddrive_ai_begin(tests.uid('analyst@a.ph'), 'ask', null, 'What is the QRF?') $q$);
select tests.ok('and records the answer', $q$ select public.ddrive_ai_finish((select id from public.ddrive_ai_log where question = 'What is the QRF?'), true, 'claude-sonnet-5-5', 'v1',
  '[{"key": "S1", "label": "RA 10121 s. 21"}]', 'The QRF is 30% of the LDRRMF [S1].', 1, 900, 120, null) $q$);
select tests.refused('An unknown task is refused', $q$ select public.ddrive_ai_begin(tests.uid('analyst@a.ph'), 'order_evacuation', null, 'x') $q$);
select tests.ok('A second question', $q$ select public.ddrive_ai_begin(tests.uid('analyst@a.ph'), 'situation_brief', null, null) $q$);
select tests.refused('A third is over the daily limit of 2', $q$ select public.ddrive_ai_begin(tests.uid('analyst@a.ph'), 'ask', null, 'one more') $q$);
select tests.ok('Another person still has their own allowance', $q$ select public.ddrive_ai_begin(tests.uid('responder@a.ph'), 'ask', null, 'What does Signal No. 3 mean?') $q$);
select tests.refused('Someone in an organisation that has not opted in is refused', $q$ select public.ddrive_ai_begin(tests.uid('admin@b.ph'), 'ask', null, 'hi') $q$);
reset role;

-- ─── Seeing and rating answers ───────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.eq('The analyst sees their own answers, with the sources and the removed citation count', $q$
  select count(*) || ' ' || max(model) || ' ' || max(unverified_citations) from public.ddrive_ai_log $q$, '2 claude-sonnet-5-5 1');
select tests.eq('and their use today', $q$ select public.ddrive_ai_status() ->> 'used_by_me_today' $q$, '2');
select tests.eq('The analyst rates the answer', $q$ select public.ddrive_ai_feedback((select id from public.ddrive_ai_log where question = 'What is the QRF?'), 'helpful') $q$, 'helpful');
select tests.refused('An unknown rating is refused', $q$ select public.ddrive_ai_feedback((select id from public.ddrive_ai_log where question = 'What is the QRF?'), 'meh') $q$);
select tests.refused('A user cannot change an answer', $q$ update public.ddrive_ai_log set answer = 'edited' $q$);
reset role;
select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('Another member sees only their own', $q$ select count(*)::text from public.ddrive_ai_log $q$, '1');
select tests.refused('and cannot rate someone else''s answer', $q$ select public.ddrive_ai_feedback((select id from public.ddrive_ai_log where question = 'What is the QRF?' limit 1), 'not_helpful') $q$);
reset role;
select tests.claims('admin@a.ph'); set role authenticated;
select tests.eq('The administrator reviews every answer in the organisation', $q$ select count(*)::text from public.ddrive_ai_log $q$, '3');
reset role;
select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none', $q$ select count(*)::text from public.ddrive_ai_log $q$, '0');
reset role;

-- ─── Retention and AI-drafted proposals ──────────────────────────────────────
update public.ddrive_ai_log set created_at = now() - interval '91 days' where question = 'What does Signal No. 3 mean?';
select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.eq('Answers older than 90 days are purged', $q$ select public.ddrive_ai_purge()::text $q$, '1');
reset role;
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.ok('A proposal drafted with DDRiVER AI is marked as such', $q$
  insert into public.ddrive_response_actions (title, origin, strategy, drrm_area, ai_assisted) values ('Elevate the records room', 'manual', 'reduce_consequences', 'prevention_mitigation', true) $q$);
select tests.eq('and still waits for a person to decide', $q$ select status || ' ' || ai_assisted from public.ddrive_response_actions where title = 'Elevate the records room' $q$, 'proposed true');
reset role;
select tests.claims('admin@a.ph'); set role authenticated;
select tests.eq('The administrator switches it off again', $q$ select public.ddrive_ai_configure(false) $q$, 'disabled');
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
