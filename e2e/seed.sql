-- People and organisations for the browser tests (run after the migrations).
insert into auth.users (email, raw_user_meta_data) values
  ('admin@a.ph',     '{"full_name": "Ana Admin"}'),
  ('analyst@a.ph',   '{"full_name": "Alma Analyst"}'),
  ('responder@a.ph', '{"full_name": "Rico Responder"}'),
  ('viewer@a.ph',    '{"full_name": "Vina Viewer"}'),
  ('newcomer@x.ph',  '{"full_name": "Nora Newcomer"}');

insert into public.ddrive_tenants (name, kind) values ('LGU A', 'lgu');
select public.ddrive_admin_set_role('admin@a.ph', 'tenant_admin');
select public.ddrive_admin_set_role('analyst@a.ph', 'analyst');
select public.ddrive_admin_set_role('responder@a.ph', 'responder');
select public.ddrive_admin_set_role('viewer@a.ph', 'viewer');

-- PostgREST connects as "authenticator" and switches to the role in each request's token, as on Supabase.
do $$ begin create role authenticator login noinherit; exception when duplicate_object then null; end $$;
grant anon, authenticated, service_role to authenticator;
