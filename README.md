# DDRiVE-M

**DDRiVE-M (Data-Driven Resilience Management)** is a resilience intelligence platform by **ASilva Innovations**. It helps local governments, agencies, enterprises and NGOs in the Philippines and Asia anticipate, adapt to and respond to disruption, through a seven-phase intelligence cycle.

> **Status: 0.6.0, pre-production.** Phase 0, the database part of Phase 1, and two parts of Phase 2 are done: access rules are enforced in the database, official PAGASA alerts flow in automatically, and the RA 12287 anticipatory action workflow runs end to end. The Rapid Mapping MVP (ADR-004) adds incident-linked mapping activations, areas of interest and versioned, reviewed map products. Detection now also reads the Pacific Tsunami Warning Center, USGS and GDACS and shows each alert beside the organisation's assessed risk (ADR-005); Diagnosis runs the DDRiVE hazard, vulnerability and risk assessment from the DDRiVE workbook (ADR-006). DDRiVE-M has a public Home page and policies, and installs as an app. See [Roadmap](#roadmap). Do not use DDRiVE-M as a source of official warnings. Follow PAGASA, PHIVOLCS and your local DRRM office.

## The intelligence cycle

| Phase | Module | What it does today |
| --- | --- | --- |
| 1 Detection | `detectionModule/` | Official alerts from PAGASA (CAP), the Pacific Tsunami Warning Center (CAP), USGS earthquakes and GDACS, with per-source freshness; flagged for your watch areas (provinces, or a point and radius); each alert in a watch area shows your approved DDRiVE assessment's rating, vulnerability and response capacity for that hazard; hazard records ([ADR-005](docs/adr/005-official-detection-sources.md)) |
| 2 Diagnosis | `diagnosisModule/` | DDRiVE hazard, vulnerability and risk assessment (exposure, four vulnerability categories, response measures → likelihood, severity, VL1–VH9), from templates or an imported DDRiVE workbook; scenarios; Data Scores, Risk Summary and Vulnerability Report; hazard glossary; risk register (likelihood × impact) fed from scored hazard events ([ADR-006](docs/adr/006-ddrive-hazard-assessment.md)) |
| 3 Response | `responseModule/` | Incident list and progress |
| 3 Anticipatory action | `anticipatoryModule/` | RA 12287 cases: forecast trigger, pre-disaster risk assessment, recommendation, declaration, measures and funds, lifting, report to OCD |
| 3 Rapid Mapping | `rapidMappingModule/` | Mapping activations per incident; approved areas of interest; GeoJSON/GeoPackage import with geometry and CRS checks; preliminary → reviewed → verified → published product versions with separation of duties; offline-safe field observations; GeoJSON, CSV, metadata and print exports ([ADR-004](docs/adr/004-rapid-mapping.md)) |
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

**Upgrading to 0.6.0:** follow [DEPLOY.md § 9](DEPLOY.md#9-upgrading-an-existing-deployment) (two migrations, the `ingest-official` function and its schedule).

**Upgrading to 0.5.0 (Rapid Mapping):** run `supabase/migrations/20261122010000_phase3_rapid_mapping.sql` once in the SQL editor (safe to run again), then redeploy the app. It needs no extension: PostGIS is not required (ADR-004). No new environment variables.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript in strict mode |
| `npm run lint` | ESLint |
| `npm run build` | Production build to `dist/` |
| `npm run check` | Type-check, lint and build; run before every pull request |
| `npm run test:db` | Access-rule tests on a throwaway local Postgres, fresh and upgraded from the old schema |
| `npm run test:unit` | Unit tests (Vitest): geometry and CRS checks, GeoPackage reader, exports, offline queue, map rendering |
| `npm run test:e2e` | Browser tests: the production build against a local Postgres and PostgREST 12, including the alert ingest function under Deno |
| `npm run build` | Production build, then `scripts/prerender.mjs` writes static HTML for Home and the policies (what crawlers and Google's verification read) |
| `npm run icons` | Downloads the logo and makes the app icons in `public/icons/` (run once with internet access, then commit) |
| `npm run test:functions` | Tests for the CAP parser and ingest logic (real PAGASA documents) and the PTWC, USGS and GDACS readers (needs Deno 2) |

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
  lib/ddriveAssessment/      DDRiVE scoring (mirrors the database), hazard catalogue and glossary, templates, workbook import, data access
  lib/rapidMapping/          Rapid Mapping types, GeoJSON/CRS checks, GeoPackage reader, exports, offline queue, data access
  lib/
    modules.ts               Module keys, routes and titles (single source of truth)
    supabase.ts              Database client, configured from environment variables
supabase/migrations/         Versioned SQL, applied in order
supabase/functions/          Edge Functions: ingest-pagasa (PAGASA) and ingest-official (PTWC, USGS, GDACS), with shared CAP and JSON readers
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
| 2 (PAGASA, PTWC, USGS and GDACS alerts, RA 12287 workflow and DDRiVE assessment done) | Still to do: DDRiVER AI as a server function with citations; PHIVOLCS (when it publishes a feed) and NOAH data; hazard × exposure × vulnerability with PSA census layers; plan drafts needing named approval; moving the ICS simulator, PSCP, Gawad Kalasag and FPIC tools into the app; offline field forms; Filipino translation |
| 3 (Rapid Mapping MVP done) | Still to do for Rapid Mapping: PostGIS columns and spatial checks once confirmed on the live project; Shapefile ZIP import; a processing worker for reprojection, clipping and raster/COG; map tiles (MapLibre, once a tile source and licence are chosen); private object storage for source files; XLSX and GeoPackage export; public product pages. Platform: OWASP ASVS Level 2 verification, WCAG 2.2 AA audit, penetration test, service levels |

## Licence

MIT. See [LICENSE](LICENSE).

## Contact

**ASilva Innovations**, Muntinlupa City, Metro Manila, Philippines · [asilvainnovations.com](https://asilvainnovations.com)
