# DDRiVE-M Production-Readiness Audit

Nov 3, 2026 · @Alvin · Repository: asilvainnovations/ddrive-m (main, commit baa3246)

## Bottom line

DDRiVE-M is a strong concept and a working prototype, not yet a production platform: the React app does not build, and most "live" figures are hard-coded. The domain thinking is the asset. The seven-phase cycle, the Philippine framework coverage (RA 10121, PSCP, Gawad Kalasag, ICS, FPIC) and the hazard-agency integrations are well chosen. What is missing is the engineering spine underneath them.

| Area | Rating today | Why |
| --- | --- | --- |
| Build and code health | Blocked | `npm run build` fails on a syntax error; 58 TypeScript errors behind it |
| Data integrity | Not ready | Dashboard, compliance, chatbot and plan generator show fixed demo values as if real |
| Security and privacy | High risk | No server-side authorization model in the repo; client-set roles; personal data captured without consent notice |
| Architecture | Prototype | 20 standalone HTML pages beside a partly wired React app; no API layer, no schema, no tests, no CI |
| UX and accessibility | Partial | Attractive visual language; ARIA labels in 1 of 30 components; English only |
| Domain fit (PH DRRM-CCA) | Strong | Right frameworks, agencies and use cases; needs sourcing and versioning of the rules |

Recommended path: a 4-phase, roughly 6-month programme. Phase 0 (2 weeks) makes the app build, removes misleading data and closes the privacy gaps. Phase 1 builds the data and security foundation. Phase 2 connects real hazard feeds and real AI. Phase 3 certifies against ISO 22301-aligned operations, OWASP ASVS Level 2, WCAG 2.2 AA and NPC registration.

## Intent versus implementation

The intended product is a resilience intelligence cycle for LGUs, agencies, enterprises and NGOs across Asia, with the Philippines as the home market. Each phase has a React module, and most read a Supabase table. But the router (\`App.tsx\`) mounts only 6 routes, 4 of them the older broken pages, so clicking any module except Dashboard (10 of 11) in the sidebar lands on the 404 page. No module ingests an external feed.

| Phase | Intended capability | What the code does today | Main file |
| --- | --- | --- | --- |
| 1 Detection | Live multi-agency hazard monitoring | Reads `ddrive_hazards` rows entered by hand; agency tiles are labels, no PAGASA, PHIVOLCS or NOAH ingestion | `detectionModule/Detection.tsx` |
| 2 Diagnosis | ISO 31000 risk registry | Two competing risk models (`ddrive_risks` vs `risks`); `RiskAssessment.tsx` is broken and stubbed | `diagnosisModule/*` |
| 3 Response | Treatment and incident management | Realtime list of `ddrive_incidents`; no ICS roles, no task assignment flow | `responseModule/Response.tsx` |
| 4 Integration | UNDRR 10 Essentials scoring | Reads stored scores; falls back to a fixed 78 when empty | `IntegrationModule.tsx`, `Dashboard.tsx` |
| 5 Validation | Simulation engine | \`ValidationModule.tsx\` reads \`ddrive\_scenarios\` but is not routed; the real simulators are 4 copies of a standalone ICS page | `public/ics-simulator-*.html` |
| 6 Enhancement | Compliance and AI plan generator | Compliance percentages and due dates are constants; generator waits 2 s then shows an alert | `Compliance.tsx`, `PlanGenerator.tsx` |
| 7 Monitoring | KPIs and collaboration | Realtime messages and presence; KPI counts 9, 32 and 156 are constants | `Dashboard.tsx` lines 29–31 |
| AI assistant | Context-aware DRRM expert | Keyword lookup over 6 canned answers in the app; the standalone page calls OpenAI from the browser | `AIChatbot.tsx`, `public/ddriver-ai.html` |

The repository also carries adjacent products: a Security Risk Self-Assessment that writes leads to a separate "Stronghold A3" database, an FPIC tracker, SPARC, PSCP templates and a Gawad Kalasag simulator. These are valuable, but they share no code, data model or login with the platform.

## Critical findings (P0: fix before anyone relies on it)

Ten issues block a credible launch. Each is either a crash, a security or privacy exposure, or a display that could mislead a responder during an actual event.

| # | Finding | Evidence | Fix |
| --- | --- | --- | --- |
| P0-1 | Production build fails | `RiskAssessment.tsx` line 79: stray `};` after a stubbed component; imports point at `@/components/risk/*` and `@/types/risk`, which do not exist | Rewrite the page against `diagnosisModule` components; add `src/types/risk.ts` or point to `lib/risk.ts` |
| P0-2 | App crashes at runtime once built | With that file stubbed, `tsc` reports 58 errors: `GlassCard`, `StatCard`, `Sparkles`, `Sidebar`, `Header`, `COSOFramework` used without import; `resilienceTrend` and `alerts` undefined in the index route `Dashboard.tsx` | Turn on `strict`, fix every error, make `tsc --noEmit` a CI gate |
| P0-3 | Misleading operational status | `Dashboard.tsx` hard-codes "LIVE OPERATIONS", "ALERT LEVEL: ORANGE" and "SUPABASE: CONNECTED"; UNDRR score falls back to 78 | Every status badge derives from data with a timestamp and source; show "No data" rather than a default |
| P0-4 | Implied government identity | Dashboard subtitle reads "Republic of the Philippines · National Disaster Risk Reduction & Management Council"; new users get `organization: 'NDRRMC'` (`AuthContext.tsx` line 58) | Remove unless there is a signed agreement; make organization a tenant attribute set by an admin |
| P0-5 | AI assistant states fabricated facts | `AIChatbot.tsx` lines 23–25 return "Your city scores 78/100" and a fixed Metro Manila top-5 risk list with "All have active treatment plans" | Replace with a server-side, retrieval-grounded model that cites the tenant's own registry and source documents |
| P0-6 | Browser-side OpenAI calls | `ddriver-ai.html` line 68 and `sparc.html` line 196 send the user's key from the browser to `api.openai.com`; SPARC asks users to paste a key | Move all model calls behind an Edge Function; never expose or request provider keys in the client |
| P0-7 | Authorization lives only in the client | `upsertProfile` writes `role: 'Operator'` from the browser; generic `insertRow(table, row)` and `updateRow(...)` accept any table name; no migrations or RLS policies in the repo | Define schema and Row Level Security in versioned migrations; set roles with a server-side trigger; remove generic table writers |
| P0-8 | Personal data captured without notice | `security-assessment.html` line 555 inserts name, email and company into another project's `security_assessment_leads`; no privacy notice or consent checkbox | Add a Data Privacy Act notice, purpose and consent; keep leads in the platform's own controlled store |
| P0-9 | Indigenous Peoples' consent data held insecurely | `Safeguard-FPIC-Tracker.html` keeps community, CADT and household consent records in `localStorage` and renders them with `innerHTML` (lines 325, 480) | Treat as sensitive community data: server storage, encryption, role-based access, escaped rendering, NCIP-aligned retention |
| P0-10 | Auth provider not mounted | `useAuth()` throws outside `AuthProvider`, and `App.tsx` never mounts it, so `LoginModal` and presence cannot work | Wrap the router in `AuthProvider`; add route guards per role |

## High and medium findings by domain

### Engineering and code health

- **Two codebases in one repo.** 20 standalone HTML pages (about 24,300 lines) load Tailwind, React and Babel from CDNs at runtime; the ICS simulator exists in 5 versions (1.0–4.0 plus `ics.html`), one outside `public/`. Pick one simulator, port it into the app, delete the rest.
- **Landing page is silently dropped.** `public/index.html` and the root `index.html` both build to `dist/index.html`; the React shell wins, so the 1,002-line marketing page never ships.
- **Duplicate domain models.** `lib/risk.ts` (`name`, `category_id`, `risk_score`) and `hooks/useDDriveData.ts` (`title`, `category`, `score`) describe the same risk differently and hit different tables.
- **Type safety is off.** `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`; ESLint reports 16 errors.
- **No tests, no CI.** The README lists `.github/workflows/...slsa3-publish.yml`, but no `.github` folder exists. The README tree also lists files that were renamed.
- **Dependencies.** `npm audit` reports 25 advisories (7 high), including `react-router`, `zod` and `source-map-js`; Recharts 2.x is end-of-life. The platform components use none of the 27 Radix packages directly (only the generic shadcn kit does), and everything ships in one 582 kB bundle with no code splitting.
- **Broken helper.** `public/gk.js` line 2, `fetch('data.json")`, is a syntax error, and the JSON is actually `gawad-kalasag.json`.
- **Dead routes.** The 404 route sits outside `AppLayout`, so a missing module drops the user out of the shell entirely.

### Security

- Hard-coded backend URL and anon key in `lib/supabase.ts`; a different Supabase project and key in `security-assessment.html`. Anon keys are public by design, so the real exposure is whatever RLS does or does not allow. Move both to environment variables and prove RLS with tests.
- No Content Security Policy, and scripts from 4 CDN hosts with no Subresource Integrity hashes on any page. A compromised CDN would run code inside a DRRM console.
- 78 `innerHTML` writes across the standalone pages; any that echo user input are stored-XSS paths.
- Password minimum is 6 characters with no MFA, for accounts that may hold incident and community data. OWASP ASVS 5.0 sets the bar higher; use 12+ characters, breached-password checks and TOTP or passkeys for admin and EOC roles.
- Realtime channels subscribe to whole tables (`event: '*'`) with no tenant filter; once multiple organisations share the backend they would see each other's incidents unless RLS is correct.

### Data and analytics

- Risk score is `likelihood × impact` with thresholds 6/10/15 (`lib/risk.ts`). That is fine as a default, but the matrix should be configurable per tenant and documented, as ISO 31000 leaves criteria to the organisation.
- No hazard data model. Hazards carry `lat`/`lng` and a free-text `location`; they need PSGC codes (region to barangay), geometry, source agency, issued and expiry times, and CAP fields (severity, urgency, certainty).
- No exposure or vulnerability layer, so "risk" cannot yet combine hazard × exposure × vulnerability × capacity, the formulation used by UNDRR and the Philippine NDRRMP.
- No audit trail or versioning for plans, risk entries or compliance evidence, which auditors and Gawad Kalasag evaluators expect.
- Fabricated SEO data: `index.html` JSON-LD declares a 4.8 rating from 127 reviews. Remove it; search engines penalise invented review markup.

### UX, UI and accessibility

- ARIA labels appear in 1 of 30 platform components and 0 standalone pages. Icon-only buttons (chat launcher, close, refresh) have no accessible name.
- Language picker offers Filipino, but no i18n layer exists. Field users and barangay officials need at least Filipino and English, with room for Cebuano, Ilocano, Hiligaynon and Maguindanaon/Tausug for BARMM.
- Glass and blur-heavy layout with 800 px blurred gradients is costly on low-end Android devices and weak connections, which are common during an event.
- Not offline-capable. Typhoon response loses connectivity first, so an EOC tool needs a service worker, local queueing and sync.
- `alert()` confirmations in the plan generator and CSV export block the UI and say nothing true.

### Product and governance

- MIT licence with no `SECURITY.md`, `CONTRIBUTING.md`, code of conduct or data-handling policy.
- Marketing claims ("50+ organizations", "Trusted by 80+ clients") need evidence on file before government procurement.

## Standards alignment

DDRiVE-M names the right frameworks but implements them as labels and fixed percentages. Production means each framework becomes a versioned rule set with clauses, evidence and an owner, so a score can be traced to the clause and document behind it.

### Philippine laws and policies

| Instrument | Where it bites in DDRiVE-M | Gap today | What to build |
| --- | --- | --- | --- |
| RA 10121 (PDRRM Act 2010), its IRR and the NDRRMP | Risk registry, LDRRM plans, LDRRMF use, four thematic areas | Chatbot paraphrase only; no plan template tied to thematic areas | LDRRMP and contingency plan builders mapped to the four thematic areas and LDRRMF tracking. Department of Disaster Resilience bills keep being refiled, so keep agency names in config, not code |
| RA 9729 as amended by RA 10174, NAP 2023–2050 | Climate risk, LCCAP, People's Survival Fund proposals | No climate layer at all | Climate projection layer and LCCAP builder aligned to the NAP's 8 sector outcomes |
| RA 10173 (Data Privacy Act), NPC Circular 2022-04, NPC Advisory 2025-02 | User accounts, leads, household and community records, AI profiling | No privacy notice, consent, DPO, retention or breach process | Privacy impact assessment, consent capture, DPO contact, retention jobs; NPC registration (mandatory where automated decision-making or profiling is used); privacy-by-design per the 2025 advisory |
| RA 8371 (IPRA) and NCIP FPIC guidelines | FPIC tracker | Consent records in browser storage | Server-side FPIC case records with audit trail and community-controlled access |
| RA 10639 (Free Mobile Disaster Alerts Act) and PAGASA, PHIVOLCS, NDRRMC bulletins | Detection and alerting | No ingestion; alert level hard-coded | Ingest official bulletins and PAGASA CAP feeds; never originate public warnings, only relay and attribute them |
| OCD Public Service Continuity Plan guidance | PSCP builder, BCM module | Static template page | PSCP builder with BIA, essential functions and recovery objectives, exportable for OCD review |
| Gawad Kalasag criteria | GK self-assessment | Criteria and weights in a local JSON with no source | Load the current year's official criteria with a citation and version; label any self-score as unofficial |
| PSA Philippine Standard Geographic Code | Every location field | Free-text locations | PSGC codes from region to barangay as the location key |
| RA 12287 (Declaration of State of Imminent Disaster Act, 2025) and its IRR | Detection-to-Response hand-off, anticipatory action, LDRRMF use before impact | Not modelled; the cycle jumps from hazard to incident with no forecast-based trigger step | Pre-disaster risk assessment, trigger and lead-time rules held as editable parameters, declaration and lifting records, anticipatory action fund tracking. Settle contested readings with OCD before encoding |

### Global standards

| Standard | Use in DDRiVE-M | Target |
| --- | --- | --- |
| ISO 31000:2018 (confirmed 2023) and ISO 31010 | Risk criteria, assessment techniques | Configurable criteria and matrix per tenant; technique library |
| ISO 22301:2019 | BCM, PSCP | BIA, RTO/RPO, exercise records |
| ISO/IEC 27001:2022 | Running the platform itself | ISMS for the platform team; SOC 2 optional for private clients |
| OWASP ASVS 5.0 (May 2025) | Application security | Level 2 for all tenants; Level 3 for national-agency deployments |
| WCAG 2.2 AA | All UI | Audited before launch, retested each release |
| Sendai Framework 2015–2030 and UNDRR MCR2030 10 Essentials | Integration module scoring | Store the scorecard's actual indicators, not a single number |
| OASIS CAP 1.2 | Alert ingestion and display | Native CAP parser; severity, urgency, certainty shown verbatim |
| OGC and GeoJSON standards | Hazard and exposure layers | PostGIS storage, vector tiles, WMS/WFS links to GeoRiskPH and NOAH |
| NIST AI RMF 1.0, ISO/IEC 42001, OWASP Top 10 for LLM Applications | DDRiVER AI and plan generator | Grounded answers with citations, human sign-off on generated plans, prompt-injection testing, model card |
| NIST CSF 2.0 | Client-facing security assessment | Map the Security Self-Assessment questions to CSF functions |

## Target architecture

Keep the current stack (React, Vite, Supabase) and add the missing layers rather than rewriting. The decisive change is a single governed data core, so every phase reads the same tenant-scoped, audited records instead of its own table or local storage.

&#91;embedded content: target architecture · 5 layers, 7 cross-cutting concerns\]

Key decisions to record as architecture decision records:

1. **Monorepo with one app.** Port the standalone pages (ICS simulator, PSCP, Gawad Kalasag, SPARC, FPIC) into routed React modules sharing auth and data; keep marketing pages in a separate static site.
2. **Postgres is the system of record.** Versioned SQL migrations, RLS on every table keyed to `tenant_id` and role, PostGIS for hazards and exposure, PSGC codes on every location.
3. **Ingestion is server-side and attributed.** Scheduled Edge Functions pull PAGASA CAP, PHIVOLCS and NOAH data, normalise to CAP fields, store the original payload and source URL, and stamp issued and expiry times. The UI only ever relays an agency's warning; it never invents one.
4. **AI is a governed service.** One Edge Function holds model keys, retrieves from the tenant's registry and a curated policy corpus (RA 10121 and its IRR, NDRRMP, NAP, OCD PSCP guidance), returns citations, and logs every prompt and answer. Generated plans stay drafts until a named officer approves them.
5. **Risk as a model, not a number.** Store hazard, exposure, vulnerability and capacity separately, so scores are explainable and recalculated when inputs change.
6. **Offline-first field use.** A service worker caches the shell and the tenant's plans; incident and assessment forms queue locally and sync with conflict rules.

## Roadmap to production

Four phases over about 6 months, each closed by a gate that someone outside the build team checks. Durations assume 2–3 engineers plus part-time DRRM, privacy and UX input; adjust once the team is confirmed.

### Phase 0: Stop the bleeding

Gate: the app builds and type-checks clean, and no screen shows a value that is not from data.

- [ ] Fix `RiskAssessment.tsx`; reach 0 `tsc` errors with `strict: true`
- [ ] Mount `AuthProvider`; route all 11 sidebar modules; move 404 inside the layout
- [ ] Remove hard-coded status badges, KPI constants, the 78 fallback and the NDRRMC subtitle and default
- [ ] Replace canned chatbot answers with "not yet connected" until Phase 2
- [ ] Remove browser-side OpenAI calls and the API-key field in SPARC
- [ ] Add privacy notice and consent to the security assessment; pause FPIC tracker for real data
- [ ] Delete fake JSON-LD rating; reconcile README with the repository
- [ ] Move Supabase URL and keys to environment variables; run `npm audit fix`

### Phase 1: Foundation

Gate: an external reviewer passes the RLS test suite and an OWASP ASVS Level 1 checklist.

- [ ] Versioned migrations for one schema: tenants, users, roles, risks, hazards, incidents, plans, evidence, audit log
- [ ] RLS on every table; role assignment via server trigger; tenant filter on realtime channels
- [ ] Unify the two risk models; PSGC location codes; configurable risk matrix
- [ ] CI on every pull request: type-check, lint, unit tests, Playwright smoke tests, dependency and secret scanning
- [ ] Staging and production environments; backups with a tested restore
- [ ] CSP and SRI headers; MFA for admin and EOC roles; 12-character password minimum
- [ ] Privacy impact assessment, DPO named, retention schedule; decide on NPC registration

### Phase 2: Real intelligence

Gate: a tabletop exercise with one partner LGU runs end to end on live feeds, and every AI answer cites its source.

- [ ] Ingest PAGASA CAP, PHIVOLCS and NOAH data with source, issued and expiry times
- [ ] Hazard × exposure × vulnerability model with PSA census layers
- [ ] DDRiVER AI as a server function with retrieval, citations, logging and prompt-injection tests
- [ ] Plan generator outputs editable drafts (LDRRMP, contingency, PSCP, BCP) that require named approval
- [ ] Port the ICS simulator, PSCP, Gawad Kalasag and FPIC tools into the app on the shared data core
- [ ] Offline mode for field forms; Filipino translation of core flows
- [ ] Anticipatory action workflow under RA 12287: forecast trigger, pre-disaster risk assessment, declaration request, fund use, lifting report

### Phase 3: Assurance and scale

Gate: third-party penetration test closed, WCAG 2.2 AA audit passed, first paying tenant live.

- [ ] ASVS Level 2 verification; penetration test and fixes
- [ ] WCAG 2.2 AA audit with assistive-technology users, including field staff on low-end Android
- [ ] SLOs (for example 99.5% monthly availability) with uptime and error monitoring
- [ ] Incident response and breach-notification runbook aligned with NPC timelines
- [ ] Model card and AI risk register (NIST AI RMF); quarterly re-evaluation of AI answers
- [ ] Evidence pack for procurement: architecture, security, privacy, accessibility, data residency

## Method and sources

Evidence comes from a clean clone of `main` at commit baa3246 (50 commits, July–October 2026): `npm ci`, `npm run build`, `tsc --noEmit` on a copy with the one syntax error stubbed, `eslint .`, `npm audit`, and a read of every platform module and the standalone pages' data, storage and network code. The live Supabase project's RLS policies were not visible, so security findings about authorization describe what the repository does and does not define. Standards status was checked on 3 November 2026.

Sources:

- [OWASP ASVS project page (5.0.0 released 30 May 2025)](https://www.owasp.org/index.php/OWASP_Application_Security_Verification_Standard)
- [NPC Circular No. 2022-04 (full text)](https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf)
- [NDV Law: NPC registration thresholds, including automated decision-making](https://ndvlaw.com/a-ceos-guide-to-registration-of-data-processing-system-with-the-national-privacy-commission-part-1-legal-foundations-and-mandatory-requirements/)
- [Legal500: NPC Advisory 2025-02 on privacy engineering in the system life cycle](https://www.legal500.com/developments/thought-leadership/the-philippine-national-privacy-commissions-guidelines-on-privacy-on-engineering-in-systems-life-cycle-processes/)
- [Climate Change Commission NICCDIES: National Adaptation Plan 2023–2050](https://niccdies.climate.gov.ph/climate-reports/national-adaptation-plan)
- [PAGASA: Common Alerting Protocol in the Philippines (Red Cross Preparedness Center)](https://preparecenter.org/wp-content/uploads/2026/01/philippines-cap.pdf)
- [Manila Bulletin: Department of Disaster Resilience bill refiled, July 2025](https://mb.com.ph/2025/07/06/bong-go-renews-push-for-dept-of-disaster-resilience)
- [ISO 31000 revision history (2018 edition confirmed 2023)](https://wiki.privacytools.io/wiki/ISO_31000)
- [RA 12287, Declaration of State of Imminent Disaster Act (Lawphil)](https://www.lawphil.net/statutes/repacts/ra2025/ra_12287_2025.html)
- [Manila Bulletin: OCD finalizes the IRR of RA 12287, October 2025](https://mb.com.ph/2025/10/25/ocd-finalizes-irr-of-imminent-disaster-act)
