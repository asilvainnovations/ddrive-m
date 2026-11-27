-- Flood Intelligence: flood areas and rainfall (ADR-016). Runs after 99 in the same database; works in "LGU A".
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql
truncate tests.results restart identity;

create or replace function tests.area(p_name text) returns text language sql as $$ select id from public.ddrive_flood_areas where name = p_name $$;
create or replace function tests.b_area() returns text language sql security definer as $$ select id from public.ddrive_flood_areas where name = 'B riverside' $$;
grant execute on function tests.area(text), tests.b_area() to authenticated;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.ok('Organisation B adds a flood area', $q$ insert into public.ddrive_flood_areas (name, flood_hazard_pct, hazard_source) values ('B riverside', 70, 'CLUP hazard map') $q$);
reset role;

-- ─── Areas ───────────────────────────────────────────────────────────────────
select tests.claims('analyst@a.ph'); set role authenticated;
select tests.eq('An analyst imports barangays with their NOAH flood hazard', $q$
  select public.ddrive_import_flood_areas('[{"adm4_pcode":"PH083738001","name":"Brgy. 5","flood_hazard_pct":62.5},{"adm4_pcode":"PH083738002","name":"Brgy. 6","flood_hazard_pct":4}]'::jsonb,
    'Project CCHAIN project_noah_hazards (CC BY 4.0)')::text $q$, '{"added": 2, "updated": 0}');
select tests.eq('Importing again updates them instead of adding duplicates', $q$
  select public.ddrive_import_flood_areas('[{"adm4_pcode":"PH083738001","name":"Brgy. 5","flood_hazard_pct":65}]'::jsonb, 'UP NOAH map, checked 2026-11-27')::text $q$, '{"added": 0, "updated": 1}');
select tests.eq('… with the new value and its source', $q$ select flood_hazard_pct || ' ' || hazard_source from public.ddrive_flood_areas where adm4_pcode = 'PH083738001' $q$, '65.00 UP NOAH map, checked 2026-11-27');
select tests.refused('A hazard share above 100% is refused', $q$ insert into public.ddrive_flood_areas (name, flood_hazard_pct, hazard_source) values ('Bad', 120, 'test source') $q$);
select tests.refused('An area needs the source of its hazard value', $q$ insert into public.ddrive_flood_areas (name, flood_hazard_pct, hazard_source) values ('No source', 10, '') $q$);
reset role;

select tests.claims('responder@a.ph'); set role authenticated;
select tests.refused('A responder cannot import areas', $q$ select public.ddrive_import_flood_areas('[{"name":"X","flood_hazard_pct":1}]'::jsonb, 'test source') $q$);
select tests.eq('A responder sees the organisation''s areas', $q$ select count(*)::text from public.ddrive_flood_areas where name like 'Brgy.%' $q$, '2');

-- ─── Rainfall ────────────────────────────────────────────────────────────────
select tests.eq('A responder records rainfall for three days', format($q$
  select public.ddrive_record_rainfall(jsonb_build_array(
    jsonb_build_object('area_id', tests.area('Brgy. 5'), 'obs_date', %L, 'rain_mm', 40),
    jsonb_build_object('area_id', tests.area('Brgy. 5'), 'obs_date', %L, 'rain_mm', 70),
    jsonb_build_object('area_id', tests.area('Brgy. 5'), 'obs_date', %L, 'rain_mm', 30)), 'LGU rain gauge, Brgy. 5 hall')::text $q$,
  current_date - 3, current_date - 2, current_date - 1), '{"added": 3, "updated": 0}');
select tests.eq('A corrected reading replaces the earlier one', format($q$
  select public.ddrive_record_rainfall(jsonb_build_array(jsonb_build_object('area_id', tests.area('Brgy. 5'), 'obs_date', %L, 'rain_mm', 35)), 'LGU rain gauge, corrected')::text $q$, current_date - 1),
  '{"added": 0, "updated": 1}');
select tests.ok('A forecast for tomorrow is kept apart from observations', format($q$
  select public.ddrive_record_rainfall(jsonb_build_array(jsonb_build_object('area_id', tests.area('Brgy. 5'), 'obs_date', %L, 'rain_mm', 120, 'kind', 'forecast')), 'PAGASA forecast, read by the duty officer') $q$, current_date + 1));
select tests.refused('Observed rainfall cannot be for a future day', format($q$
  insert into public.ddrive_rainfall (area_id, obs_date, rain_mm, source) values (tests.area('Brgy. 5'), %L, 10, 'gauge') $q$, current_date + 2));
select tests.refused('Rainfall cannot be negative', format($q$
  insert into public.ddrive_rainfall (area_id, obs_date, rain_mm, source) values (tests.area('Brgy. 6'), %L, -1, 'gauge') $q$, current_date));
select tests.eq('Four readings in all', $q$ select count(*)::text from public.ddrive_rainfall $q$, '4');
select tests.ok('A responder''s delete removes nothing', $q$ delete from public.ddrive_rainfall where rain_mm = 40 $q$);
select tests.eq('… the reading is still there', $q$ select count(*)::text from public.ddrive_rainfall where rain_mm = 40 $q$, '1');
reset role;

select tests.claims('analyst@a.ph'); set role authenticated;
select tests.refused('Rainfall cannot be recorded for another organisation''s area', format($q$
  select public.ddrive_record_rainfall(jsonb_build_array(jsonb_build_object('area_id', tests.b_area(), 'obs_date', %L, 'rain_mm', 10)), 'gauge') $q$, current_date));
select tests.refused('nor inserted directly into it', $q$
  insert into public.ddrive_rainfall (area_id, obs_date, rain_mm, source) values (tests.b_area(), current_date, 10, 'gauge') $q$);
reset role;
select tests.claims('viewer@a.ph'); set role authenticated;
select tests.eq('A viewer can read rainfall', $q$ select count(*)::text from public.ddrive_rainfall $q$, '4');
select tests.eq('and sees no other organisation''s areas', $q$ select count(*)::text from public.ddrive_flood_areas where name = 'B riverside' $q$, '0');
select tests.refused('but not record it', format($q$ select public.ddrive_record_rainfall(jsonb_build_array(jsonb_build_object('area_id', tests.area('Brgy. 6'), 'obs_date', %L, 'rain_mm', 1)), 'gauge') $q$, current_date));
reset role;

select tests.claims('admin@b.ph'); set role authenticated;
select tests.eq('Another organisation sees none of it', $q$ select count(*)::text from public.ddrive_rainfall $q$, '0');
reset role;
set role anon;
select tests.refused('Anonymous visitors see nothing', $q$ select 1 / count(*) from public.ddrive_flood_areas $q$);
reset role;

\set QUIET off
\pset format aligned
\pset border 0
select case when ok then 'PASS' else 'FAIL' end as result, label, case when ok then '' else coalesce(detail, '') end as detail from tests.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from tests.results;
