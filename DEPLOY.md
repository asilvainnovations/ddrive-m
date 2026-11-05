# Deploying DDRiVE-M

## 1. New installation

DDRiVE-M's hosted Supabase project is `mytnwrctkubhrfjwloln` (`https://mytnwrctkubhrfjwloln.supabase.co`). Its URL and publishable key are already in `.env.production` and `.env.example`. To use another project, change both files or set the variables in your host.

### Keys: which goes where

| Key | Looks like | Where it goes |
| --- | --- | --- |
| Publishable | `sb_publishable_...` | The app: `VITE_SUPABASE_PUBLISHABLE_KEY`. Public by design. |
| Secret | `sb_secret_...` | Only Supabase itself: Vault (for the alert schedule) and Edge Function secrets, which Supabase fills in automatically. Never in a `VITE_` variable, a committed file or a chat. |
| Legacy `anon` / `service_role` | long JWTs | Still accepted until Supabase retires them at the end of 2026. The app and the alert function prefer the new keys. |

The build stops if a `VITE_` variable holds a secret or service_role key, because anything in a `VITE_` variable is published with the app.

### Steps

1. Apply the migrations in order. With the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), from the repository root:
   ```bash
   supabase login
   supabase link --project-ref mytnwrctkubhrfjwloln
   supabase db push
   ```
   `db push` records what it has applied. If you have already run some migrations by hand in the SQL editor, don't use `db push`; run the remaining files from `supabase/migrations/` in filename order in the SQL editor instead.
2. In **Authentication → URL Configuration**, set **Site URL** to the address where the app is deployed and add it (and `http://localhost:8080` for development) to **Redirect URLs**, so sign-up confirmation and password-reset links return to the app.
3. Build and deploy: `npm run build` (output in `dist/`). The build reads `.env.production`; on Vercel or Netlify you can also set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the project's environment settings, which take precedence.
4. The app's logo is loaded from the public Storage bucket `image-assets`, at `public/DDRiVE-M logo.png`. In a new project, create that bucket (public) and upload the logo, or the logo will be missing.
5. Set up official alerts: follow **To 0.3.0** below from step 2.
6. Sign up in the app. With no organisation yet, you are offered to set one up; you become its administrator and can add colleagues from **Settings → Organisation**.

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

### To 0.3.0 (Phase 2: official PAGASA alerts)

1. Run `supabase/migrations/20261103020000_phase2_official_alerts.sql` in the SQL editor.
2. Deploy the ingest function with the Supabase CLI, from the repository root:
   ```bash
   supabase functions deploy ingest-pagasa --project-ref mytnwrctkubhrfjwloln --no-verify-jwt
   ```
   `--no-verify-jwt` (also set in `supabase/config.toml`) is needed because secret keys are not JWTs; the function checks the key itself and refuses everything else. Supabase fills in `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` for the function automatically.
3. In **Settings → API Keys**, copy the `default` **secret** key (`sb_secret_...`). Run the function once by hand and check the answer (`added` should be above 0 when PAGASA has alerts in force):
   ```bash
   curl -X POST https://mytnwrctkubhrfjwloln.supabase.co/functions/v1/ingest-pagasa \
     -H "apikey: <secret key>"
   ```
   Send the secret key in the `apikey` header only, never as `Authorization: Bearer`. (The legacy service_role key still works as a bearer token until the end of 2026.)
4. Schedule it every 10 minutes. In **Database → Extensions**, enable `pg_cron` and `pg_net`, then in the SQL editor (the secret key is stored in Vault, never in the job's text):
   ```sql
   select vault.create_secret('<secret key>', 'ddrive_secret_key');
   select cron.schedule('ddrive-ingest-pagasa', '*/10 * * * *', $$
     select net.http_post(
       url := 'https://mytnwrctkubhrfjwloln.supabase.co/functions/v1/ingest-pagasa',
       headers := jsonb_build_object('apikey',
         (select decrypted_secret from vault.decrypted_secrets where name = 'ddrive_secret_key')),
       timeout_milliseconds := 60000);
   $$);
   ```
   If you scheduled the job earlier with the service_role key, replace it before the end of 2026: `select cron.unschedule('ddrive-ingest-pagasa');`, then run the two statements above.

   If your host has no Edge Functions or pg_cron, run `supabase/functions/ingest-pagasa/index.ts` on a schedule elsewhere (for example a GitHub Actions workflow with Deno), with `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` (`{"default":"sb_secret_..."}`) as secrets.
5. Check it is running: `select started_at, ok, alerts_new, error from ddrive_ingest_runs order by started_at desc limit 5;`
6. Deploy the 0.3.0 app build. DRRM officers then set their **watch areas** in **Settings → Organisation**.

If the feed has not been read successfully for 30 minutes, the app warns that alert information may be out of date and points to pagasa.dost.gov.ph.

### To 0.4.0 (Phase 2: Home page, policies, installable app, anticipatory action)

1. Run `supabase/migrations/20261105010000_phase2_anticipatory_action.sql` (or `supabase db push`).
2. Make the app icons once, on a computer with internet access, and commit them:
   ```bash
   npm run icons        # downloads the logo and writes public/icons/
   git add public/icons && git commit -m "Add app icons"
   ```
   Until then the app loads the logo from its original address, and phones cannot install the app (they need the icon files).
3. Review the policies with counsel and your Data Protection Officer. Fill in `src/content/legal/facts.ts` (DPO name, NPC registration, the Supabase region from **Settings → General**), then set `reviewed: true`. Until then every policy page says it is a draft under review.
4. Deploy the 0.4.0 app build. Addresses change: Home is now `/` and the Command Dashboard is `/dashboard`. The host must serve `index.html` for unknown paths (the usual single-page app setting) and serve `sw.js` without long caching, so updates reach people.
5. In **Authentication → URL Configuration**, keep the Site URL as the app's address; sign-in now returns people to the page they started from.

### To 0.4.1 (Google sign-in, Google verification fixes, password reset, email templates)

1. Deploy on Vercel with the `vercel.json` in the repository. It runs `npm run build`, which also writes the static Home and policy pages that Google's checker reads, and routes `/privacy-policy`, `/terms-of-service` and the app's addresses.
2. Set up Google sign-in: see **Google sign-in** below.
3. Install the email templates: see `supabase/templates/README.md`.
4. Before asking Google to verify again, complete `src/content/legal/facts.ts` and set `reviewed: true`, so the policies no longer say "draft".

## Google sign-in

DDRiVE-M uses Google's own sign-in button with Supabase (`signInWithIdToken`). The consent screen and Google's checks then refer to `ddrive-m.asilvainnovations.com`, not to the Supabase project's address.

**Where each credential goes**

| Credential | Where | Why |
| --- | --- | --- |
| Client ID (`…apps.googleusercontent.com`) | Vercel: `VITE_GOOGLE_CLIENT_ID`, and Supabase: Google provider → Client IDs | Public; the button needs it, Supabase checks tokens against it |
| Client Secret (`GOCSPX-…`) | Supabase only: Google provider → Client Secret | Secret; the build refuses to run if it is in a `VITE_` variable |

**1. Google Auth Platform** (console.cloud.google.com/auth)
- **Branding**: App name **DDRiVE-M** (the name shown at the top of the Home page and in its title); user support email; logo; Application home page `https://ddrive-m.asilvainnovations.com`; Privacy policy `https://ddrive-m.asilvainnovations.com/privacy-policy`; Terms of service `https://ddrive-m.asilvainnovations.com/terms-of-service`; Authorized domain `asilvainnovations.com`, verified in Google Search Console by someone who is an owner of the Google Cloud project.
- **Data access**: only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. These are not sensitive scopes, so no security assessment is needed.
- **Clients** → Web application. Authorized JavaScript origins: `https://ddrive-m.asilvainnovations.com`, plus `http://localhost` and `http://localhost:8080` for development. Authorized redirect URIs: none are needed for the button. Add `https://mytnwrctkubhrfjwloln.supabase.co/auth/v1/callback` only if you want the fallback redirect flow; Google may then ask about the `supabase.co` domain during verification (a Supabase custom domain such as `auth.asilvainnovations.com` avoids that).

**2. Supabase** → Authentication → Sign In / Providers → Google: enable it; Client IDs: the web Client ID; Client Secret: the secret; leave **Skip nonce check** off (DDRiVE-M sends a nonce). In **URL Configuration**, Site URL `https://ddrive-m.asilvainnovations.com` and Redirect URLs `https://ddrive-m.asilvainnovations.com/**`.

**3. Vercel** → Project → Settings → Environment Variables: `VITE_GOOGLE_CLIENT_ID` for Production (and Preview if you test there), then redeploy: Vite reads it at build time. Without it, the sign-in window falls back to Supabase's redirect flow.

**4. Check before re-submitting for verification**
```bash
curl -s https://ddrive-m.asilvainnovations.com/ | grep -o 'href="/privacy-policy"' | head -1
curl -s -o /dev/null -w "%{http_code}\n" https://ddrive-m.asilvainnovations.com/privacy-policy   # 200
curl -s https://ddrive-m.asilvainnovations.com/privacy-policy | grep -c "If you sign in with Google"   # 1 or more
```

## Roles

| Role | Can |
| --- | --- |
| Viewer | Read everything in the organisation |
| Responder | + report hazards and incidents, update incident progress, post messages, log exercise participation |
| Analyst | + manage risks, scorecard entries, plan drafts and documents; edit hazards |
| DRRM officer | + approve or retire plans, manage exercises, send critical messages, delete risks, scorecard entries and documents, read the audit log |
| Administrator | + manage members, roles and risk criteria |

Details and reasoning: `docs/adr/001-multi-tenancy-and-access.md`.
