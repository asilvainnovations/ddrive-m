# Deploying DDRiVE-M

## 1. New installation

1. Create a Supabase project (or use any Supabase-compatible host).
2. In the SQL editor, run every file in `supabase/migrations/` in filename order.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your host's environment (see `.env.example`) and deploy the build (`npm run build`, output in `dist/`).
4. Sign up in the app. With no organisation yet, you are offered to set one up; you become its administrator and can add colleagues from **Settings → Organisation**.

## 2. Before you deploy to real users

- Name a Data Protection Officer and check whether NPC registration applies (NPC Circular 2022-04).
- In Supabase **Authentication → Providers → Email**, require email confirmation, and set a minimum password length of 12.
- Confirm Realtime is enabled for the `ddrive_` tables that should update live (hazards, incidents, messages). Realtime respects the access rules.
- Run the database tests (`npm run test:db`) and browser tests (`npm run test:e2e`) on the release you deploy.

## 3. Updating an existing database

Apply the steps for every version between yours and the new one, in order. Each migration is safe to run twice.

### To 0.1.0 (Phase 0)

1. Run `supabase/migrations/20261103000000_phase0_profile_guard.sql`.

### To 0.2.0 (Phase 1: organisations, roles and access rules)

**This change requires sign-in for everyone and changes who can do what. Plan a short maintenance window and tell users first.**

1. Back up the database (Supabase **Database → Backups**, or `pg_dump`).
2. In the SQL editor, run in this order:
   1. `supabase/migrations/20261103010000_phase1_core.sql`
   2. `supabase/migrations/20261103010100_phase1_domain.sql`
   3. `supabase/migrations/20261103010200_phase1_access.sql`
3. All existing data now belongs to one organisation called **Migrated organisation**, and every existing user is a **viewer** in it. Nobody can add or change records until you promote people. Promote at least one administrator:
   ```sql
   select public.ddrive_admin_set_role('you@yourorg.gov.ph', 'tenant_admin');
   ```
   That person can then manage everyone else from **Settings → Organisation** in the app.
4. Rename the organisation:
   ```sql
   update public.ddrive_tenants set name = 'City of …' where name = 'Migrated organisation';
   ```
5. Check that the rules are in place (every row should say `true`):
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename like 'ddrive\_%';
   ```
6. Deploy the 0.2.0 app build.

What changes for users:

| Before | After |
| --- | --- |
| Anyone with the link could read and write | Sign-in required; access by organisation and role |
| The browser chose record ids (`R-004`) | The database issues ids and reference numbers per organisation |
| Risk level computed in the browser | Computed by the database from the organisation's risk criteria (default Critical 20, High 12, Medium 6) |
| Any change, by anyone, untraced | Every change is recorded in the audit log (DRRM officers and administrators can read it) |

To roll back: restore the backup from step 1 and redeploy the 0.1.0 build.

## Roles

| Role | Can |
| --- | --- |
| Viewer | Read everything in the organisation |
| Responder | + report hazards and incidents, update incident progress, post messages, log exercise participation |
| Analyst | + manage risks, scorecard entries, plan drafts and documents; edit hazards |
| DRRM officer | + approve or retire plans, manage exercises, send critical messages, delete risks, scorecard entries and documents, read the audit log |
| Administrator | + manage members, roles and risk criteria |

Details and reasoning: `docs/adr/001-multi-tenancy-and-access.md`.
