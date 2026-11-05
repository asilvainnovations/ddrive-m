# DDRiVE-M

**DDRiVE-M (Data-Driven Resilience Management)** is a resilience intelligence platform by **ASilva Innovations**. It helps local governments, agencies, enterprises and NGOs in the Philippines and Asia anticipate, adapt to and respond to disruption, through a seven-phase intelligence cycle.

> **Status: 0.4.0, pre-production.** Phase 0, the database part of Phase 1, and two parts of Phase 2 are done: access rules are enforced in the database, official PAGASA alerts flow in automatically, and the RA 12287 anticipatory action workflow runs end to end. DDRiVE-M has a public Home page and policies, and installs as an app. See [Roadmap](#roadmap). Do not use DDRiVE-M as a source of official warnings. Follow PAGASA, PHIVOLCS and your local DRRM office.

## The intelligence cycle

| Phase | Module | What it does today |
| --- | --- | --- |
| 1 Detection | `detectionModule/` | Official PAGASA alerts (wind signals, flood advisories) flagged for your watch areas; hazard records, which can be logged from an alert |
| 2 Diagnosis | `diagnosisModule/` | Risk registry (likelihood × impact) |
| 3 Response | `responseModule/` | Incident list and progress |
| 3 Anticipatory action | `anticipatoryModule/` | RA 12287 cases: forecast trigger, pre-disaster risk assessment, recommendation, declaration, measures and funds, lifting, report to OCD |
| 4 Integration | `IntegrationModule.tsx` | UNDRR 10 Essentials scorecard entries and guidance |
| 5 Validation | `ValidationModule.tsx` | Exercise scenarios and links to the ICS simulators |
| 6 Enhancement | `enhancementModule/` | Plan drafts from templates |
| 7 Monitoring | `monitoringModule/` | Team messages and presence |
| Documents | `documentsModule/` | Document register |
| DDRiVER AI | `AIChatbot.tsx` | Not connected yet (Phase 2) |

## Getting started

Requirements: Node 20 or later, and a Supabase project.

```bash
npm ci
cp .env.example .env.local   # already points at DDRiVE-M's Supabase project
npm run dev                  # http://localhost:8080
```

For Google sign-in, also set `VITE_GOOGLE_CLIENT_ID` (the public Client ID; the secret goes in Supabase, see DEPLOY.md). Production builds read the same two public values from `.env.production`; your host's environment variables (for example on Vercel or Netlify) override them. Only the publishable key (`sb_publishable_...`) belongs in the app; secret keys stay in Supabase. Without a URL and key, the app runs and shows "Database not configured". See [DEPLOY.md](DEPLOY.md) for the database, the alert schedule and which key goes where.

Apply the database migrations in `supabase/migrations/` in filename order, in the Supabase SQL editor. Each file is safe to run twice. Upgrading an existing database: follow [DEPLOY.md](DEPLOY.md).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript in strict mode |
| `npm run lint` | ESLint |
| `npm run build` | Production build to `dist/` |
| `npm run check` | Type-check, lint and build; run before every pull request |
| `npm run test:db` | Access-rule tests on a throwaway local Postgres, fresh and upgraded from the old schema |
| `npm run test:e2e` | Browser tests: the production build against a local Postgres and PostgREST 12, including the alert ingest function under Deno |
| `npm run build` | Production build, then `scripts/prerender.mjs` writes static HTML for Home and the policies (what crawlers and Google's verification read) |
| `npm run icons` | Downloads the logo and makes the app icons in `public/icons/` (run once with internet access, then commit) |
| `npm run test:functions` | Tests for the CAP parser and ingest logic, using real PAGASA documents (needs Deno 2) |

## Project structure

```
src/
  App.tsx                    Router: every module, lazy-loaded, inside AppLayout and AuthProvider
  components/
    AppLayout.tsx            Sidebar, top bar, sign-in dialog, page outlet
    ErrorBoundary.tsx        Recovery screen if a module crashes
    ddrive/                  The platform modules (see table above), Sidebar, TopBar, LoginModal
    ui/                      Shared UI kit (shadcn/Radix) and GlassCard
  contexts/AuthContext.tsx   Sign-in and the user's profile
  hooks/useDDriveData.ts     Typed data hooks scoped to the active organisation
  lib/actions.ts             Every write, as one named function per action
  lib/roles.ts               Role names, labels and the role ladder
  lib/
    modules.ts               Module keys, routes and titles (single source of truth)
    supabase.ts              Database client, configured from environment variables
supabase/migrations/         Versioned SQL, applied in order
supabase/functions/          Edge Functions: ingest-pagasa (official alerts), with a shared CAP parser
src/site/                    Public pages: Home, policies, Support, Resources, Contact
src/content/legal/           Policy texts, and facts.ts (details only ASilva can confirm)
supabase/templates/          Branded auth email templates (see its README)
vercel.json                  Vercel build and routing (policy addresses, app fallback, headers)
supabase/tests/              Access-rule tests (plain SQL) and a Supabase stand-in for local runs
e2e/                         Browser tests and a local stand-in for the Supabase gateway
docs/adr/                    Architecture decision records
public/                      Standalone tools served as static pages:
                             ICS simulators and explainer, PSCP template, Gawad Kalasag self-check and
                             simulator, SPARC assessment, FPIC tracker (practice only), user manual, about, FAQ, pricing
```

## Organisations and roles

Every record belongs to one organisation. People belong to one or more organisations, with one of five roles: Viewer, Responder, Analyst, DRRM officer, Administrator. The rules are enforced by the database (Row Level Security), so they hold whatever the app does. The full table is in [DEPLOY.md](DEPLOY.md#roles) and the reasoning in [ADR-001](docs/adr/001-multi-tenancy-and-access.md).

## Data and privacy

- Every figure on screen comes from a database table. If a table cannot be read, the screen says "Unavailable", never 0.
- Roles are assigned by an organisation's administrator. Nobody can change their own role, and an organisation always keeps at least one administrator.
- The database stamps who created or changed each record and when, issues record ids and reference numbers, and computes risk scores. Approved plans are locked; messages and the audit log cannot be edited.
- The FPIC tracker is for practice only until secure server storage exists. It must not hold real community or household data.
- Processing personal data is covered by the Data Privacy Act of 2012 (RA 10173). Before you deploy for an organisation, name a Data Protection Officer and check whether NPC registration applies.
- The public policies (Privacy, Terms, Cookies, Accessibility, AI Ethics and Governance) are at `/policies`. They describe only what DDRiVE-M actually does; details only ASilva can confirm are in `src/content/legal/facts.ts`, and each page shows a review notice until `reviewed` is set to `true`.

## Roadmap

| Phase | Focus |
| --- | --- |
| 0 (done) | App builds and type-checks in strict mode; all modules routed; fabricated figures, fake identity and browser-side AI keys removed; privacy notice and consent on lead capture |
| 1 (database done) | Organisations, roles and Row Level Security on every table; audit log; server-issued ids; one risk model with per-organisation criteria; PSGC location codes. Still to do in Phase 1: CI, CSP headers, MFA |
| 2 (PAGASA alerts and RA 12287 workflow done) | Still to do: DDRiVER AI as a server function with citations; PHIVOLCS and NOAH data; hazard × exposure × vulnerability with PSA census layers; plan drafts needing named approval; moving the ICS simulator, PSCP, Gawad Kalasag and FPIC tools into the app; offline field forms; Filipino translation |
| 3 | OWASP ASVS Level 2 verification, WCAG 2.2 AA audit, penetration test, service levels |

## Licence

MIT. See [LICENSE](LICENSE).

## Contact

**ASilva Innovations**, Muntinlupa City, Metro Manila, Philippines · [asilvainnovations.com](https://asilvainnovations.com)
