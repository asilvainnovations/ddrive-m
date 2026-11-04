# DDRiVE-M

**DDRiVE-M (Data-Driven Resilience Management)** is a resilience intelligence platform by **ASilva Innovations**. It helps local governments, agencies, enterprises and NGOs in the Philippines and Asia anticipate, adapt to and respond to disruption, through a seven-phase intelligence cycle.

> **Status: 0.2.0, pre-production.** Phase 0 and the database part of Phase 1 are done: the app builds, no screen shows a figure that is not from your records, and every record belongs to an organisation with role-based access rules enforced in the database. Agency feeds and the AI assistant come in Phase 2 (see [Roadmap](#roadmap)). Do not use DDRiVE-M as a source of official warnings. Follow PAGASA, PHIVOLCS and your local DRRM office.

## The intelligence cycle

| Phase | Module | What it does today |
| --- | --- | --- |
| 1 Detection | `detectionModule/` | Hazard records entered by your team, with their source agency |
| 2 Diagnosis | `diagnosisModule/` | Risk registry (likelihood × impact) |
| 3 Response | `responseModule/` | Incident list and progress |
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
cp .env.example .env.local   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:8080
```

For production, set the same two variables in your host's environment settings (for example Vercel or Netlify), not in a committed file. Without them, the app runs and shows "Database not configured".

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
| `npm run test:e2e` | Browser tests: the production build against a local Postgres and PostgREST 12 |

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

## Roadmap

| Phase | Focus |
| --- | --- |
| 0 (done) | App builds and type-checks in strict mode; all modules routed; fabricated figures, fake identity and browser-side AI keys removed; privacy notice and consent on lead capture |
| 1 (database done) | Organisations, roles and Row Level Security on every table; audit log; server-issued ids; one risk model with per-organisation criteria; PSGC location codes. Still to do in Phase 1: CI, CSP headers, MFA |
| 2 | Agency feed ingestion (PAGASA CAP, PHIVOLCS, NOAH), RA 12287 anticipatory action workflow, server-side DDRiVER AI with citations, offline field forms, Filipino translation |
| 3 | OWASP ASVS Level 2 verification, WCAG 2.2 AA audit, penetration test, service levels |

## Licence

MIT. See [LICENSE](LICENSE).

## Contact

**ASilva Innovations**, Muntinlupa City, Metro Manila, Philippines · [asilvainnovations.com](https://asilvainnovations.com)
