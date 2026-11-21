# Deploying DDRiVE-M

This guide takes DDRiVE-M from this repository to a running service: the database and access rules on Supabase, the alert-ingest functions and their schedule, sign-in, and the web app on Vercel. It also covers upgrades, checks after each step, and handover.

Production today: app at `https://ddrive-m.asilvainnovations.com` (Vercel), database and functions on Supabase project `mytnwrctkubhrfjwloln`. Replace these with your own values for another deployment.

Time needed: about two hours for a new deployment; 15 minutes for an upgrade.

## Contents

1. [Before you start](#1-before-you-start)
2. [Supabase project](#2-supabase-project)
3. [Database: migrations](#3-database-migrations)
4. [Sign-in](#4-sign-in)
5. [Official alerts: functions and schedule](#5-official-alerts-functions-and-schedule)
6. [Web app on Vercel](#6-web-app-on-vercel)
7. [First administrator, organisation and watch areas](#7-first-administrator-organisation-and-watch-areas)
8. [Checks after deployment](#8-checks-after-deployment)
9. [Upgrading an existing deployment](#9-upgrading-an-existing-deployment)
10. [Keys: which goes where](#10-keys-which-goes-where)
11. [Tests before every release](#11-tests-before-every-release)
12. [Data protection notes](#12-data-protection-notes)
13. [Roles](#13-roles)
14. [Rollback and switching things off](#14-rollback-and-switching-things-off)

## 1. Before you start

- [ ] An organisation account that will **own** the Supabase project, the Vercel project, the Google Cloud project and the GitHub repository (not a personal account), and a password manager or vault for keys.
- [ ] A workstation with Node 20 or later, Git, the Supabase CLI (`npm i -g supabase` or `brew install supabase/tap/supabase`) and, optionally, `psql` (PostgreSQL 15+ client).
- [ ] The Data Protection Officer has read the privacy notice (`/policies/privacy`) and the facts in `src/content/legal/facts.ts`, including where the Supabase project is hosted.
- [ ] Decide the region DDRiVE-M watches for earthquakes and regional alerts (default: the Philippine Area of Responsibility with a margin; see section 5).

## 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard). Choose the region the DPO approved; note the **project ref** (the `xxxx` in `https://xxxx.supabase.co`) and the database password.
2. **Settings → API Keys**: note the **publishable key** (`sb_publishable_…`) for the app. Create a **secret key** (`sb_secret_…`) named `default` for the functions and the schedule. Never put a secret key in the app or in Git.
3. **Database → Extensions**: enable `pg_cron` and `pg_net` (needed by the schedule in section 5). `pgcrypto` is on by default. PostGIS is **not** needed (ADR-004).
4. Link the repository to the project once, from the repository folder:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

## 3. Database: migrations

The migrations in `supabase/migrations/` build every table, access rule (Row Level Security), server function and reference list. Apply them **in file-name order**. Each file is safe to run more than once; never edit a file that has been applied (add a new one instead).

| # | File | What it adds |
| --- | --- | --- |
| 1 | `20261103000000_phase0_profile_guard.sql` | Profiles; users cannot set their own role |
| 2 | `20261103010000_phase1_core.sql` | Organisations, memberships, the role ladder, reference numbers |
| 3 | `20261103010100_phase1_domain.sql` | Hazards, risks, incidents, plans, documents, messages; server stamping; audit log |
| 4 | `20261103010200_phase1_access.sql` | Row Level Security on every table; server functions for members and roles |
| 5 | `20261103020000_phase2_official_alerts.sql` | Official alerts (PAGASA CAP), feed runs, watch areas |
| 6 | `20261105010000_phase2_anticipatory_action.sql` | RA 12287 anticipatory action cases, assessments and measures |
| 7 | `20261122010000_phase3_rapid_mapping.sql` | Rapid Mapping: activations, areas of interest, versioned map products, field observations |
| 8 | `20261122020000_phase3_ddrive_assessment.sql` | DDRiVE hazard, vulnerability and risk assessments; hazard catalogue; link to the risk register |
| 9 | `20261122030000_phase3_detection_sources.sql` | PTWC, USGS and GDACS alerts; watch points; risk-informed warnings. **Needs #8 first** |

**Option A, Supabase CLI (recommended):**

```bash
supabase db push          # applies every file not yet applied, in order
```

**Option B, SQL editor:** Supabase dashboard → SQL Editor → New query. Paste and run each file in the order above, one at a time, waiting for "Success" before the next.

**Option C, psql:**

```bash
export DATABASE_URL='postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres'
for f in supabase/migrations/*.sql; do echo "$f"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f" || break; done
```

Check: Table Editor shows the `ddrive_*` tables, each marked "RLS enabled", and `ddrive_hazard_catalogue` has 84 rows.

## 4. Sign-in

### 4a. Email and password

1. **Authentication → URL Configuration**: Site URL `https://ddrive-m.asilvainnovations.com`; Redirect URLs add `https://ddrive-m.asilvainnovations.com/**` (and `http://localhost:8080/**` for development).
2. **Authentication → Sign In / Providers → Email**: on, with "Confirm email" on. Minimum password length 12.
3. **Email templates**: install the branded templates in `supabase/templates/` (see its README), from the dashboard or with `SUPABASE_ACCESS_TOKEN=sbp_… node scripts/push-email-templates.mjs <project-ref>`.
4. **Custom SMTP** (Authentication → Emails → SMTP): Supabase's built-in sender is for testing only. Send from an address on your own domain with SPF and DKIM set.

### 4b. Google (optional)

DDRiVE-M uses Google's own button (Google Identity Services) and Supabase's `signInWithIdToken`, so the consent screen shows DDRiVE-M's domain (see `src/lib/googleSignIn.ts`).

1. Google Cloud console → APIs & Services → **OAuth consent screen**: app name DDRiVE-M, the home page, `/privacy-policy` and `/terms-of-service` (fixed addresses served by the app), authorised domain `asilvainnovations.com`. Submit for verification if needed.
2. **Credentials → Create OAuth client ID → Web application**. Authorised JavaScript origins: `https://ddrive-m.asilvainnovations.com` and `http://localhost:8080`. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (used by the fallback redirect flow).
3. Supabase → Authentication → Sign In / Providers → **Google**: on; paste the Client ID and the **Client Secret**. The secret goes only here.
4. Vercel: set `VITE_GOOGLE_CLIENT_ID` to the Client ID (section 6). The build refuses to run if a `VITE_` variable holds a Google client secret.

## 5. Official alerts: functions and schedule

Two Edge Functions read official sources every 10 minutes and store what they find. Both relay and attribute; neither originates a warning (RA 10639).

| Function | Reads | ADR |
| --- | --- | --- |
| `ingest-pagasa` | PAGASA-DOST CAP feed (`publicalert.pagasa.dost.gov.ph/feeds/`) | ADR-002 |
| `ingest-official` | NOAA Pacific Tsunami Warning Center (CAP), USGS earthquakes (FDSN GeoJSON), GDACS (GeoJSON) | ADR-005 |

PHIVOLCS publishes no data feed; DDRiVE-M links to `phivolcs.dost.gov.ph` for official earthquake, tsunami and volcano information.

### 5a. Deploy the functions

```bash
supabase functions deploy ingest-pagasa
supabase functions deploy ingest-official
```

`supabase/config.toml` sets `verify_jwt = false` for both: the schedule calls them with a secret key, which is not a JWT, and each function checks the key itself (`supabase/functions/_shared/auth.ts`). A call without a valid server key gets `401`.

### 5b. Function settings (optional)

Supabase sets `SUPABASE_URL` and the server keys automatically. These are optional (Edge Functions → Secrets, or `supabase secrets set NAME=value`):

| Name | Default | Meaning |
| --- | --- | --- |
| `PAGASA_FEED_URL` | PAGASA's official feed | Only change for testing |
| `DETECTION_SOURCES` | `PTWC,USGS,GDACS` | Which sources `ingest-official` reads |
| `DETECTION_BBOX` | `114,2,136,26` | Region for USGS and GDACS: `minLon,minLat,maxLon,maxLat` |
| `DETECTION_COUNTRIES` | `PHL` | ISO3 codes; a GDACS event affecting one of them is kept even outside the region |
| `USGS_MIN_MAGNITUDE` | `4.0` | Smallest earthquake stored |
| `PTWC_FEED_URL` | `https://www.tsunami.gov/events/xml/PHEBAtom.xml` | Only change for testing |

For a tenant outside the Philippines, set the region and countries to that country and name its national agencies in the organisation's guidance; never assume Philippine rules apply.

### 5c. Schedule (pg_cron and pg_net)

Run once in the SQL editor, replacing `<project-ref>` and the secret key. The key is kept in Supabase Vault, not in the job text.

```sql
select vault.create_secret('sb_secret_REPLACE_ME', 'ddrive_ingest_key', 'Server key for the alert-ingest schedule');

select cron.schedule('ddrive-ingest-pagasa', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/ingest-pagasa',
    headers := jsonb_build_object('apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'ddrive_ingest_key'),
                                  'content-type', 'application/json'),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);

select cron.schedule('ddrive-ingest-official', '3-59/10 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/ingest-official',
    headers := jsonb_build_object('apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'ddrive_ingest_key'),
                                  'content-type', 'application/json'),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);
```

`ingest-official` runs three minutes after `ingest-pagasa`, so the two do not start together.

Check, after 15 minutes:

```sql
select source, max(finished_at) filter (where ok) as last_ok, count(*) filter (where not ok) as failures
from public.ddrive_ingest_runs where started_at > now() - interval '1 hour' group by source;
```

All four sources (PAGASA, PTWC, USGS, GDACS) should have a recent `last_ok`. In the app, Detection → Official alerts shows the same per source and warns when a source has not been read for 30 minutes (PAGASA, PTWC) or 60 minutes (USGS, GDACS).

To run a function by hand: `curl -X POST -H "apikey: sb_secret_…" https://<project-ref>.supabase.co/functions/v1/ingest-official`.

If the host has no Edge Functions or pg_cron, run the same functions on a schedule elsewhere (for example a GitHub Actions workflow with Deno 2) with the same secret key.

## 6. Web app on Vercel

1. Vercel → Add New → Project → import the GitHub repository. Framework: Vite. `vercel.json` sets the build (`npm run build`), the output (`dist`), the policy page addresses and the security headers.
2. **Settings → Environment Variables** (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key |
   | `VITE_GOOGLE_CLIENT_ID` | the Google Client ID, if Google sign-in is used |

   These values are public by design: Row Level Security protects the data, not the key. `VITE_SUPABASE_ANON_KEY` is still read as a fallback until Supabase retires legacy keys (end of 2026). The build stops if any `VITE_` variable holds a secret.
3. **Settings → Domains**: add `ddrive-m.asilvainnovations.com` and set the DNS record Vercel shows.
4. Deploy. Every push to `main` redeploys production; pull requests get preview URLs (add those origins to Supabase redirect URLs if you sign in on previews).

For local development: create `.env.local` with the same three variables, then `npm ci && npm run dev` (http://localhost:8080).

## 7. First administrator, organisation and watch areas

1. Sign up in the app with the administrator's email and confirm it.
2. Signed in, open Settings → Organisation and **create the organisation** (the creator becomes its administrator). If an organisation already exists (for example "Migrated organisation" after an upgrade), give yourself the role in the SQL editor instead:

   ```sql
   select public.ddrive_admin_set_role('admin@example.ph', 'tenant_admin');             -- one organisation
   select public.ddrive_admin_set_role('admin@example.ph', 'tenant_admin', '<tenant-id>'); -- several
   ```

   This function works only from the SQL editor (admin context), never from the app.
3. Add members (they must sign up first) and give each the lowest role they need (section 13).
4. **Watch areas** (DRRM officer): the provinces whose alerts concern you, as PAGASA writes them, with the PSGC code if known; and at least one **watch point** with a radius (for example the city hall, 100 km) so nearby earthquakes and GDACS events are flagged.
5. **Diagnosis**: run a DDRiVE hazard assessment workshop (start from a template, or import the filled DDRiVE workbook), score it, and have a DRRM officer approve it. Approved assessments feed the "assessed risk" shown beside official alerts.
6. **Rapid Mapping** (optional): a DRRM officer approves the local damage/severity classes under Rapid Mapping → Damage classes before grading products use them.

## 8. Checks after deployment

- [ ] Home, `/privacy-policy` and `/terms-of-service` load without signing in.
- [ ] Sign-up email arrives from your domain; the link opens `/dashboard`.
- [ ] Google sign-in works (if set up).
- [ ] A viewer cannot add a risk; an analyst can; nobody can change their own role.
- [ ] Detection shows all four sources with a recent read time; a watch point near a recent earthquake flags it "In your watch area".
- [ ] With an approved DDRiVE assessment that rates Tropical Cyclone, a wind-signal alert in a watch area shows "Your assessed risk for this hazard".
- [ ] Diagnosis: importing the DDRiVE workbook creates a draft; the ratings match the workbook (for the case study: riverine flood M6, coastal flood H7).
- [ ] Rapid Mapping: an activation, an approved area, and a preliminary product published to the internal EOC show the PRELIMINARY label.
- [ ] The app installs (Add to Home Screen) and opens its shell offline with the offline notice.

## 9. Upgrading an existing deployment

Apply new migrations **before** deploying the app that uses them (`supabase db push`, or the SQL editor in file order). Then redeploy the functions if they changed, then the app.

| Version | Steps |
| --- | --- |
| **0.4 → 0.5** (Rapid Mapping, 22 Nov 2026) | Run `20261122010000_phase3_rapid_mapping.sql`. Redeploy the app. No new settings |
| **0.5 → 0.6** (Detection sources and DDRiVE assessment, 22 Nov 2026) | 1. Run `20261122020000_phase3_ddrive_assessment.sql`, then `20261122030000_phase3_detection_sources.sql` (in that order). 2. `supabase functions deploy ingest-official` (`ingest-pagasa` is unchanged). 3. Add the `ddrive-ingest-official` schedule (section 5c). 4. Redeploy the app. 5. Officers add watch points (section 7). Existing alerts, risks and watch areas are kept |

## 10. Keys: which goes where

| Key | Where it lives | Never |
| --- | --- | --- |
| Supabase publishable key `sb_publishable_…` | Vercel `VITE_SUPABASE_PUBLISHABLE_KEY`, `.env.local` | — (public by design) |
| Supabase secret key `sb_secret_…` | Supabase (functions get it automatically); Vault secret `ddrive_ingest_key` for the schedule | In the app, a `VITE_` variable, Git, or chat |
| Legacy service_role key | Supabase only, until it is retired | Same as above |
| Database password | Password manager; `DATABASE_URL` on the operator's machine only | In Git |
| Google Client ID | Vercel `VITE_GOOGLE_CLIENT_ID` | — (public) |
| Google Client Secret | Supabase → Auth → Google | In the app or Git |
| Supabase access token `sbp_…` (Management API) | The operator's shell, for `push-email-templates.mjs` only | In Git |

Rotate a key at once if it is ever exposed: create a new one, update where it lives, delete the old one.

## 11. Tests before every release

| Command | Needs | What it proves |
| --- | --- | --- |
| `npm run check` | Node 20 | Type-check (strict), lint, production build |
| `npm run test:unit` | Node 20 | Geometry and CRS checks, GeoPackage and DDRiVE workbook readers, DDRiVE scoring against the workbook's case study, exports, offline queue, rendering |
| `npm run test:db` | PostgreSQL 15+ | Every migration, twice (safe to re-run); access rules for each role; a database upgraded from before Phase 1; Rapid Mapping, DDRiVE assessment and detection-source rules |
| `npm run test:functions` | Deno 2 | CAP parser and PAGASA ingest on real PAGASA documents; PTWC, USGS and GDACS readers |
| `npm run test:e2e` | PostgREST 12, Playwright with Chromium | The production build against a local API, in a browser |

Record the counts in the release notes (`docs/governance/TEST-REPORT-TEMPLATE.md`). A suite that was not run is reported as not run, never as passed.

## 12. Data protection notes

- **Official alerts** are public agency information, stored once for all organisations, never edited. The original documents are kept for provenance but not shown to users, who get the agency's link instead. USGS and GDACS readings are labelled as international.
- **DDRiVE assessments** hold scores and justifications about places and assets, not people. Do not record names of residents or households in comments.
- **Rapid Mapping field observations** must not contain residents' names or contact details; the form says so and the import check warns about personal-data columns (Data Privacy Act, RA 10173).
- **Audit log**: every change to governed records is logged with who and when. Agree a retention period with the records officer.
- The **FPIC tracker** page is for practice only until secure server storage exists; it must not hold real community or household data.
- If DDRiVE-M is used for automated decision-making or profiling, check NPC registration (NPC Circular 2022-04).

## 13. Roles

The database enforces the role ladder (ADR-001); the app only shows or hides controls.

| Role | Can also |
| --- | --- |
| Viewer | Read everything in the organisation; read published products for the whole organisation |
| Responder | Report hazards and incidents; send Rapid Mapping field observations; read internal EOC map products |
| Analyst | Manage risks, documents, plan drafts; open anticipatory action cases; draft and score DDRiVE assessments and add them to the register; draft, review (others' work) and import map products |
| DRRM officer | Approve plans and DDRiVE assessments; take RA 12287 steps; approve areas of interest; verify and publish map products; manage watch areas and damage classes; read the audit log |
| Administrator | Manage members and roles, organisation settings and risk criteria; approve map products for public release |

## 14. Rollback and switching things off

- **A source misbehaves:** remove it from `DETECTION_SOURCES` (for example `PTWC,USGS`) and redeploy `ingest-official`, or pause its job: `select cron.unschedule('ddrive-ingest-official');`. Stored alerts stay.
- **The app release is bad:** Vercel → Deployments → promote the previous deployment. Migrations are additive, so the previous app keeps working against the newer database.
- **A migration fails halfway:** each file is safe to re-run; fix the cause and run it again. Do not edit an applied migration; add a new one.
- **Backups:** Supabase daily backups (and point-in-time recovery on paid plans). Test a restore into a separate project before go-live.
