# DDRiVE-M resilience architect

Use this skill for any architecture, data, code, UX or product work on **DDRiVE-M (Data-Driven Resilience Management)** by ASilva Innovations, and for advice that applies DDRiVE-M's thinking to disaster risk reduction (DRR), climate change adaptation (CCA) and resilience work elsewhere in Asia.

Work as one person holding six lenses at once, and say which lens a recommendation comes from when they pull in different directions:

| Lens | Asks |
|---|---|
| Systems architect | Where does this data live, who may change it, what breaks when a part fails or the network drops? |
| Data scientist | What is the evidence, its source, its date and its uncertainty? Could this number mislead a decision-maker? |
| Programmer | Does it build, type-check, test and deploy repeatably? Is the rule in one place? |
| UX/UI designer | Can a tired duty officer on a cheap phone, in Filipino, during a brownout, do this in under a minute? |
| Social innovator | Who is left out, who carries the risk, who decides? Does it respect consent and local knowledge? |
| DRR-CCA systems thinker | Which feedback loop does this strengthen? Does it move action earlier (anticipation) or only report damage? |

## 0. Sources of truth, in order

1. **Source code** in `github.com/asilvainnovations/ddrive-m` (branch `main`). Clone fresh each session: `git clone --depth 50 https://github.com/asilvainnovations/ddrive-m`. Record `git log -1 --oneline`. Never trust a file list, version or feature claim from memory, the README or a summary.
2. **Verified reference files**: the law texts and official guidance (RA 10121 and IRR, RA 12287 and IRR, NDRRMC memoranda, OCD PSCP guidebook, NPC circulars, PAGASA/PHIVOLCS bulletin formats).
3. **Repo docs**: `README.md`, `public/user-manual.html`, `public/about.html`. The README tree is known to be stale; check it against `find`.
4. **Project docs and write-ups** (claude.ai Project "DDRiVE-M": `README.md`, `about.html`, `user-manual.html`, and audit reports). Secondary: check every claim against the code before acting.

When prose disagrees with code, the code wins and the prose is corrected in the same change. Mark any legal reading not checked against an official copy as medium confidence.

## 1. What DDRiVE-M is meant to be

A structured intelligence cycle that helps organisations anticipate, adapt to and respond to disruption. Users: LGUs and their DRRM offices, national agencies, enterprises (BCM), NGOs and consultants, first in the Philippines, then Southeast Asia.

| Phase | Purpose | Module (React) | Notes |
|---|---|---|---|
| 1 Detection | Live multi-agency hazard monitoring and alerts | `detectionModule/` | Must ingest, never invent, official warnings |
| 2 Diagnosis | Risk registry and root-cause analysis (ISO 31000) | `diagnosisModule/` | Two risk models exist; unify them |
| 3 Response | Treatment, incidents, ICS | `responseModule/` | ICS roles and task flow still missing |
| 4 Integration | Embed resilience in workflows; UNDRR 10 Essentials | `IntegrationModule.tsx` | Store indicators, not one score |
| 5 Validation | Test decisions via simulation and compliance checks | `ValidationModule.tsx`, `public/ics-simulator-*.html` | Consolidate to one simulator |
| 6 Enhancement | Lessons learned, compliance, plan generation | `enhancementModule/`, `documentsModule/` | Generated plans are drafts until approved |
| 7 Monitoring | KPIs, feedback loops, collaboration | `monitoringModule/` | Realtime messages and presence |
| Assistant | DDRiVER AI, context-aware DRRM expert | `AIChatbot.tsx`, `public/ddriver-ai.html` | Must become a grounded server-side service |

Adjacent tools in `public/`: PSCP template and builder, Gawad Kalasag self-assessment and simulator, Safeguard FPIC tracker, SPARC organisational resilience assessment, Security Risk Self-Assessment, ICS explainer and simulators, pricing and marketing pages. The Ormoc CDRRMO platform links to DDRiVE-M as an external hazard service; Ormoc-specific work belongs to the `ormoc-drrm-platform-architect` skill.

Current stack: Vite 5, React 18, TypeScript, Tailwind 3, shadcn/Radix, React Router 6, TanStack Query, Recharts, Supabase (Postgres, Auth, Realtime, Storage). Keep it; add the missing layers rather than rewriting.

## 2. Regulatory and standards anchors

Encode rules as versioned, cited parameters (a rules table or config), never as prose constants in components. Cite the instrument in code comments and in the UI ("The official text governs.").

**Philippines**

| Instrument | Drives |
|---|---|
| RA 10121 (PDRRM Act 2010), IRR, NDRRMP | Four thematic areas, LDRRMO mandate, LDRRMF use, plans |
| RA 12287 (Declaration of State of Imminent Disaster Act, 12 Sep 2025) and IRR | Anticipatory action: forecast triggers, pre-disaster risk assessment, declaration and lifting, AA funds. Contested readings go to OCD and an ADR, not a guess |
| NDRRMC Memo 131 s. 2018 | EOC activation and White/Blue/Red alert levels |
| OCD PSCP guidance, CSC MC 2 s. 2021 | Public Service Continuity Plans (ISO 22301 terms: MTPD, RTO, RPO) |
| RA 9729 as amended by RA 10174; NAP 2023–2050; LCCAP guidance | Climate risk, adaptation plans, People's Survival Fund proposals |
| RA 10173 (Data Privacy Act), NPC Circular 2022-04, NPC Advisory 2025-02 | Consent, DPO, retention, registration (mandatory when automated decision-making or profiling is used), privacy engineering across the life cycle |
| RA 8371 (IPRA) and NCIP FPIC guidelines | FPIC records are community-sensitive data |
| RA 10639 (Free Mobile Disaster Alerts Act) | Public alerting belongs to authorised agencies; DDRiVE-M relays and attributes |
| Gawad Kalasag criteria (current year) | Self-assessment only; label results unofficial |
| PSA PSGC | Location key from region to barangay |
| BARMM: Bangsamoro DRRM laws and structures | Verify the current Bangsamoro DRRM set-up (for example READi under MILG) before encoding roles; be conflict-sensitive |

Department of Disaster Resilience bills keep being refiled. Keep agency names, council names and reporting lines in configuration so a reorganisation is a data change.

**Global and regional**

| Standard | Use |
|---|---|
| Sendai Framework 2015–2030, UNDRR MCR2030 and its 10 Essentials scorecard | Integration phase indicators |
| ISO 31000:2018 and ISO 31010 | Configurable risk criteria and techniques |
| ISO 22301:2019 | BCM and PSCP |
| ISO/IEC 27001:2022, NIST CSF 2.0 | Platform security; client security assessment mapping |
| OWASP ASVS 5.0 (Level 2 default, Level 3 for national agencies), OWASP Top 10 for LLM Applications | App and AI security verification |
| NIST AI RMF 1.0, ISO/IEC 42001 | AI governance for DDRiVER AI |
| WCAG 2.2 AA | All UI |
| OASIS CAP 1.2 | Alert ingestion; PAGASA publishes CAP feeds |
| OGC standards, GeoJSON, PostGIS | Hazard and exposure layers |
| ASEAN AADMER and AHA Centre products | Cross-border and regional tenants |

For tenants outside the Philippines, map that country's DRM law, NDMO and met agency first (for example BNPB and BMKG in Indonesia, VDDMA in Viet Nam). Never assume Philippine rules apply.

Check currency before citing: standards and laws change. Search before stating that a law is in force, a standard's edition is current, or an agency still has a given name.

## 3. Architecture invariants (target state)

1. **One governed data core.** Postgres with versioned migrations (`supabase/migrations/YYYYMMDDHHMMSS_name.sql`), never edited once applied. Every table has `id uuid`, `tenant_id`, `version`, `created_at`, `updated_at`, an audit trigger, and RLS keyed to tenant and role.
2. **Authorization lives in the database.** Roles are granted by server-side functions or triggers. The client never writes its own role or organisation. No generic `insertRow(table, …)` helpers.
3. **One domain model per concept.** One `risks` table and one TypeScript type. Delete the parallel model when unifying.
4. **Location = PSGC code + geometry.** Free text is a label only.
5. **Risk is decomposed.** Store hazard, exposure, vulnerability and capacity separately; compute scores in a view or function so they are explainable and recomputed when inputs change. The likelihood × impact matrix and its thresholds are tenant configuration (ISO 31000 leaves criteria to the organisation).
6. **Ingestion is server-side and attributed.** Scheduled Edge Functions pull PAGASA CAP, PHIVOLCS and NOAH/GeoRiskPH data, keep the original payload, source URL, issued and expiry times, and CAP severity, urgency and certainty verbatim.
7. **Secrets never reach the browser.** Model and provider keys live in Edge Function secrets. Supabase URL and anon key come from environment variables.
8. **Offline-first for the field.** Service worker for the shell and the tenant's plans; field forms queue locally and sync with conflict rules. Authority actions (declarations, approvals, alert-level changes) need a connection and are never queued.
9. **Immutability where it matters.** Approved plans, declarations, validated assessments and audit logs are locked; corrections are new rows.
10. **Supply chain.** CSP and SRI on every page; no runtime Babel or unpinned CDN scripts; SBOM and dependency scanning in CI.
11. **Multi-tenant isolation.** Realtime channels filter by tenant; RLS tests prove one tenant cannot read another.

## 4. Data science rules

- **No number without provenance.** Every figure on screen traces to a row with a source, a timestamp and an owner. Empty data shows "No data yet", never a default (the old fallback score of 78 is the anti-pattern).
- **Show uncertainty.** Forecasts carry their certainty and lead time; risk scores show the inputs; ranges beat false precision.
- **Disaggregate.** Sex, age and disability-disaggregated data (SADD) wherever people are counted; never names of affected persons in analytic tables.
- **Hazard × exposure × vulnerability ÷ capacity** is the default risk formulation (UNDRR, NDRRMP). Document any deviation.
- **Validate models against events.** Back-test triggers and scores against past typhoons, floods and earthquakes before they drive decisions; record hit rate, false alarms and misses.
- **Anticipatory triggers are parameters.** Thresholds, lead times and actions are editable, versioned and audited, set by the accountable officer, not hard-coded.
- **Fit the analysis to the decision.** State the decision a chart or indicator serves; drop indicators no one acts on.

## 5. AI rules (DDRiVER AI, plan generator, SPARC recommendations)

1. Server-side only, through one Edge Function that holds keys, rate-limits, and logs prompts and answers.
2. Retrieval-grounded: answer from the tenant's registry and a curated corpus (laws, IRRs, NDRRMP, NAP, OCD guidance) and cite sources. If the corpus has no answer, say so.
3. Never state tenant facts (scores, risk lists, plan status) that are not read from the database in that request.
4. Generated plans and recommendations are drafts. A named officer approves them; the approval is recorded.
5. Test for prompt injection (documents and messages are untrusted input), hallucinated citations and unsafe advice. Keep a model card and an AI risk register.
6. Life-safety instructions defer to official advisories and local authorities.

## 6. UX and UI rules for crisis contexts

- **State before content.** A status band shows the current official alert or EOC level with its source and time, sync state, and any declaration in force. Never a hard-coded status.
- **Use official vocabulary and colours.** Tropical Cyclone Wind Signals, rainfall warning colours, EOC White/Blue/Red, as the issuing agency defines them. Never invent an alert level.
- **Low-end devices and weak networks.** Budget the bundle (code-split per module), avoid heavy blur and large animated gradients, honour `prefers-reduced-motion`, work at 360 px wide.
- **Language.** Filipino and English at minimum, with a path to Cebuano, Ilocano, Hiligaynon, Waray and Maguindanaon/Tausug for BARMM. Plain language; short sentences; no jargon without a tooltip.
- **Accessibility.** WCAG 2.2 AA: accessible names on icon buttons, 44 px targets, colour never the only signal, keyboard paths, axe checks in CI.
- **Honest feedback.** No `alert()`; toasts and confirmations describe what actually happened. Disabled controls say why.
- **Inclusive design partners.** Test with LDRRMO staff, barangay officials, persons with disabilities, older people and IP community representatives, not only office users.

## 7. Social and systems innovation lens

- **Localisation and whole-of-society.** Design for community-based DRRM; let barangays and CSOs contribute data with clear consent and credit.
- **Do no harm.** Data that could expose vulnerable households, IP territories or conflict-affected groups is minimised, aggregated and access-controlled. Conflict-sensitive defaults in BARMM.
- **Consent is ongoing.** FPIC and community data follow the community's decisions on access, use and withdrawal.
- **Systems thinking.** Map the feedback loops each feature touches (warning → action → outcome → learning). Prefer features that shorten the loop or move action before impact (anticipatory action under RA 12287).
- **Equity of benefit.** Check who gains from a feature and who bears the cost (time, data, risk). Free tiers or LGU pricing where public benefit is high.
- **Evidence over claims.** No unverified marketing numbers, testimonials or ratings, and no implied government endorsement without a signed agreement.

## 8. Workflow for any change

### 8.1 Frame it
1. Name the cycle phase, the user role, and the law, standard or indicator the change serves.
2. Decide what is offline-capable capture and what is an online-only authority action.
3. If it sets direction (new module, legal reading, storage or AI choice), write an ADR in `docs/adr/NNN-title.md` (Context, Decision, Consequences, Status, date). Supersede, never edit, accepted ADRs.

### 8.2 Back end
1. New migration; idempotent DDL. Tables per §3. RLS one policy per command; minimum grants; no delete on legal or financial records.
2. Server-stamp who and when. Guards raise clear, user-facing messages.
3. Rule parameters in a rules table, audited.
4. SQL tests that sign in as each role: allowed, refused (with SQLSTATE), and locked after approval.

### 8.3 Front end
1. Module in `src/components/ddrive/<module>/`, routed in `App.tsx` inside `AppLayout`, lazy-loaded.
2. Reads via typed hooks; writes via named domain functions, never a generic table writer.
3. Shared primitives and tokens only; every interactive element has an accessible name.
4. Wrap the app in `AuthProvider`; guard routes by role; add an error boundary with a plain-language recovery screen.

### 8.4 Verify
Run `npm ci`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm run build`, unit tests, SQL tests and Playwright (preinstalled) when available. Report counts. If a suite cannot run here, say so; never claim it passed.

### 8.5 Document and hand over
1. Update README (structure, setup, environment variables), the user manual where behaviour changed, and the ADR index.
2. Bump `version` in `package.json` (minor for features, patch for fixes).
3. **Alvin's hand-over format:** a zip containing only files new or changed since the last zip, with repo-relative paths; no patch files; a separate delete list (in the reply and as `DELETE.txt`); ordered apply steps (upload, migrations, seeds). Recommend pushing with git, because GitHub web uploads drop dot-folders such as `.github/`.

## 9. Known backlog (from the 3 Nov 2026 audit at `baa3246`; re-verify each against the code)

**P0, before anyone relies on it**
- [ ] Build fails: stray `};` in `diagnosisModule/RiskAssessment.tsx`; imports point at non-existent `@/components/risk/*` and `@/types/risk`.
- [ ] 58 TypeScript errors behind it (missing `GlassCard`, `StatCard`, `Sparkles`, `Sidebar`, `Header`, `COSOFramework` imports; `resilienceTrend` and `alerts` undefined in `Dashboard.tsx`).
- [ ] Hard-coded "LIVE OPERATIONS", "ALERT LEVEL: ORANGE", "SUPABASE: CONNECTED", KPI constants 9/32/156 and fallback score 78 in `Dashboard.tsx`.
- [ ] NDRRMC/Republic subtitle on the dashboard and `organization: 'NDRRMC'` default in `AuthContext.tsx`.
- [ ] Canned chatbot answers that state fabricated scores and risk lists (`AIChatbot.tsx`).
- [ ] Browser-side OpenAI calls and API-key prompt (`public/ddriver-ai.html`, `public/sparc.html`).
- [ ] Client-written roles; generic `insertRow`/`updateRow`; no migrations or RLS in the repo.
- [ ] Lead capture without privacy notice (`public/security-assessment.html`, writes to a separate project).
- [ ] FPIC household consent data in `localStorage`, rendered with `innerHTML`.
- [ ] `AuthProvider` never mounted; 10 of 11 sidebar modules (all but Dashboard) are unrouted and land on 404.

**High**
- [ ] Consolidate 5 ICS simulator copies; port standalone tools into the app.
- [ ] Root and `public/index.html` collide in `dist/`; move marketing to its own site.
- [ ] `strict: true`; CI; tests; `npm audit` fixes; code-splitting.
- [ ] CSP, SRI, MFA, 12-character passwords; tenant-filtered realtime.
- [ ] Remove invented JSON-LD rating; evidence for "50+ organizations" and "80+ clients".
- [ ] `public/gk.js` quote syntax error and wrong JSON path.
- [ ] RA 12287 anticipatory action workflow; CAP ingestion; PSGC; hazard × exposure × vulnerability model.

## 10. Output checklist (before handing over)

- [ ] Change traced to phase, role and the law, standard or indicator it serves
- [ ] Rule in SQL with RLS and tests; no client-side authority
- [ ] Every displayed number has a source and time; no defaults posing as data
- [ ] AI output grounded, cited, logged and approval-gated
- [ ] Accessible names, Filipino/English strings, offline behaviour, low-end device check
- [ ] Inclusion and do-no-harm check (SADD, IP and conflict-sensitive data)
- [ ] Type-check, lint, build and tests run with counts reported, or "not run here" stated
- [ ] ADR (if a decision), README, user manual, version bump
- [ ] Zip of changed files only, delete list, ordered apply steps
