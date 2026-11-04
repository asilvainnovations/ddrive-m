-- Shared test helpers for the DDRiVE-M database tests.
create schema if not exists tests;
create table if not exists tests.results (n serial primary key, ok boolean not null, label text not null, detail text);
grant usage on schema tests to public;
grant all on tests.results to public;
grant usage on all sequences in schema tests to public;

-- Sign in as a person (sets the JWT claims Supabase would set). Follow with: set role authenticated;
create or replace function tests.claims(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select id from auth.users where email = p_email), 'role', 'authenticated', 'email', p_email)::text,
    false);
end $$;

-- Expect the statement to succeed.
create or replace function tests.ok(p_label text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into tests.results (ok, label) values (true, p_label);
exception when others then
  insert into tests.results (ok, label, detail) values (false, p_label, sqlstate || ' ' || sqlerrm);
end $$;

-- Expect the statement to be refused with an error.
create or replace function tests.refused(p_label text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into tests.results (ok, label, detail) values (false, p_label, 'was allowed');
exception when others then
  insert into tests.results (ok, label, detail) values (true, p_label, sqlstate || ' ' || sqlerrm);
end $$;

-- Expect a query to return the given value (as text).
create or replace function tests.eq(p_label text, p_sql text, p_expected text) returns void language plpgsql as $$
declare
  v text;
begin
  execute p_sql into v;
  insert into tests.results (ok, label, detail)
  values (v is not distinct from p_expected, p_label, 'got ' || coalesce(v, 'NULL') || ', expected ' || coalesce(p_expected, 'NULL'));
exception when others then
  insert into tests.results (ok, label, detail) values (false, p_label, sqlstate || ' ' || sqlerrm);
end $$;
grant execute on all functions in schema tests to public;

