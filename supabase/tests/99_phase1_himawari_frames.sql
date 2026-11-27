-- Himawari frames (ADR-015). Runs after 98 in the same database.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

select set_config('request.jwt.claims', '{"role": "service_role"}', false); set role service_role;
select tests.eq('The ingest service records verified frames', $q$
  select public.ddrive_record_satellite_frames(jsonb_build_array(
    jsonb_build_object('sector','se2','product','b13','slot', to_char(date_trunc('hour', now()) at time zone 'UTC','HH24MI'),
      'observed_at', date_trunc('hour', now()), 'url','https://www.data.jma.go.jp/mscweb/data/himawari/img/se2/se2_b13_x.jpg',
      'last_modified', date_trunc('hour', now()) + interval '20 minutes')))::text $q$, '1');
select tests.eq('Recording the same frame again changes nothing', $q$
  select public.ddrive_record_satellite_frames(jsonb_build_array(
    jsonb_build_object('sector','se2','product','b13','slot', to_char(date_trunc('hour', now()) at time zone 'UTC','HH24MI'),
      'observed_at', date_trunc('hour', now()), 'url','https://www.data.jma.go.jp/mscweb/data/himawari/img/se2/se2_b13_x.jpg',
      'last_modified', date_trunc('hour', now()) + interval '20 minutes')))::text $q$, '0');
select tests.refused('A file modified a day before its slot (yesterday''s image) is refused', $q$
  select public.ddrive_record_satellite_frames(jsonb_build_array(
    jsonb_build_object('sector','se2','product','b13','slot','0010','observed_at', now() - interval '10 minutes',
      'url','https://x/img.jpg','last_modified', now() - interval '1 day'))) $q$);
select tests.refused('An unknown product is refused', $q$
  select public.ddrive_record_satellite_frames(jsonb_build_array(
    jsonb_build_object('sector','se2','product','tre','slot','0010','observed_at', now(),'url','https://x/img.jpg','last_modified', now()))) $q$);
select tests.ok('Frames older than 24 hours are removed on the next write', $q$
  insert into public.ddrive_satellite_frames (sector, product, observed_at, slot, url, last_modified)
  values ('se2','b03', now() - interval '25 hours', '0000', 'https://x/old.jpg', now() - interval '25 hours' + interval '10 minutes') $q$);
select public.ddrive_record_satellite_frames('[]'::jsonb);
select tests.eq('… so the old frame is gone', $q$ select count(*)::text from public.ddrive_satellite_frames where url = 'https://x/old.jpg' $q$, '0');
reset role;

select tests.claims('responder@a.ph'); set role authenticated;
select tests.eq('Signed-in users can read the frames', $q$ select count(*)::text from public.ddrive_satellite_frames $q$, '1');
select tests.refused('but cannot record frames', $q$ select public.ddrive_record_satellite_frames('[]'::jsonb) $q$);
select tests.refused('nor write the table directly', $q$ insert into public.ddrive_satellite_frames (sector, product, observed_at, slot, url, last_modified) values ('se2','b13', now(), '0000', 'https://x', now()) $q$);
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select 1 / count(*) from public.ddrive_satellite_frames $q$);
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
