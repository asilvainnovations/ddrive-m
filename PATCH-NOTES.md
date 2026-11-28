# DDRiVE-M 0.10.1: Move to Supabase project bvpakjzgcsnmsgarxbaf — 28 November 2026

- **New Supabase project.** Configuration now names `bvpakjzgcsnmsgarxbaf` (region `ap-southeast-2`, Sydney). This covers `.env.example`, `supabase/config.toml`, the email template script and DEPLOY.md.
- **Moving guide.** New DEPLOY.md § 15 sets out the cut-over order: privacy, data, migrations, schedules, functions, sign-in, check, then switch Vercel.
- **Deployment check.** `scripts/verify_deployment.mjs` checks a deployed project without changing anything:
  - the project answers;
  - anonymous visitors read no records;
  - sign-in providers are on;
  - functions are deployed and refuse callers without a key;
  - every table and view of the migrations exists;
  - reference data is complete;
  - official sources were read recently.
  The browser suite runs it against the local stand-in project.
- **Privacy Policy.** Section 7 now says the database is hosted in Asia Pacific (Sydney, Australia). It said "Northeast Asia" before. The DPO should confirm this cross-border transfer.
- **Tests (28 Nov 2026, all passing):**
  - Unit: 99 passed, 1 skipped.
  - Build and CSP check: pass.
  - Browser suites phase1, phase2, phase2b and crawler: 118 checks.
  - Deployment check against the local stack: 13 passed, 1 warning (the stand-in has no Auth settings endpoint).
- **Apply:** DEPLOY.md § 15.

---

# DDRiVE-M 0.10.0: EOC operations, CI and security headers — 28 November 2026

- **EOC operations (Response → EOC operations)** ([ADR-017](docs/adr/017-eoc-operations.md)).
  - *Alert status:* WHITE, BLUE or RED, as defined in the harmonised response reporting SOP. A DRRM officer records each change with an NDRRMC Memo 131 trigger, the basis and the Responsible Official who directed it. Raising the status takes an activation trigger (9.2.1) and lowering it a deactivation trigger (9.2.7). The log cannot be edited.
  - *Top bar:* shows the current status on every screen, or "not recorded"; it never assumes WHITE.
  - *Duty roster:* by the five management functions (9.3.1). Under BLUE or RED, functions with no one on duty are flagged.
  - *Operations log:* append-only, with shift handovers that name who takes over.
- **CI:** GitHub Actions runs type-check, lint, build, the CSP check, unit, SQL, Edge Function, pipeline and browser tests, plus a dependency audit, on every pull request and push to `main` ([ADR-018](docs/adr/018-ci-and-security-headers.md)).
- **Security headers:**
  - *App:* a strict Content-Security-Policy. Inline scripts are allowed by hash only, and connections go to Supabase only.
  - *All paths:* HSTS, Permissions-Policy and Cross-Origin-Opener-Policy.
  - *Standalone legacy pages:* a looser policy.
  - *Tests:* `scripts/check_csp.mjs` checks the policy against the built HTML, and a browser test runs every main screen under it.
- **Dependencies:**
  - Removed `zod` and `@hookform/resolvers`, which were unused and carried a high-severity advisory.
  - `fast-xml-parser` is upgraded to 5.12.1 in the app and the CAP parser.
  - Two moderate `react-router` 6 advisories remain; fixing them needs React Router 7.
- **Tests (all run on 28 Nov 2026, all passing):**
  - Database: 16 suites, including new 110 (34 checks).
  - Unit: 99 passed, 1 skipped. Functions: 42. Flood pipeline (Python): 8.
  - Browser: 273 checks in 11 suites, including new `eoc.mjs` (14) and `csp.mjs` (5). Every suite now runs under the production Content-Security-Policy.
- **Apply:** DEPLOY.md § 9, "0.9.1 → 0.10".

---

# DDRiVE-M 0.9.1: Flood intelligence — 27 November 2026

Adds Flood intelligence to Detection ([ADR-016](docs/adr/016-flood-intelligence.md)).

- For each barangay, the day's rainfall and the 3 days before are compared with thresholds lowered by its UP NOAH flood hazard.
- The rule is the one from the Ligtas-AI V2.0 notebooks, shown openly with all its inputs. A "Log as hazard record" link opens a flood hazard record prefilled from the outlook.
- Barangays and rainfall can be imported from CSV, including Project CCHAIN files.
- The notebooks are rewritten as `scripts/flood_intelligence/`. Their labels were made by the rule itself, so their ~99% scores show the rule being copied, not floods being predicted. The scripts fix antecedent rainfall, the split and the LSTM, and write a model card that only allows review of models tested on recorded floods.
- It is decision support, not a warning: PAGASA warns.
- **Fixed:** "Log as hazard record" followed from Detection itself did not open the form.
- **Tests (all run on 27 Nov 2026, all passing):**
  - Database: 15 suites, including new 100 (23 checks).
  - Unit: 99 passed, 1 skipped.
  - Flood pipeline (Python): 8.
  - Functions: 42.
  - Browser: 254 checks in 9 suites, including new `flood.mjs` (10).
- **Apply:** DEPLOY.md § 9, "0.9 → 0.9.1".

---

# DDRiVE-M 0.9.0: Integration, Enhancement and Validation; DDRiVER AI; synchronised Detection — 27 November 2026

- **Integration (Phase 4) embeds risk priorities in governance, plans and budgets.**
  - *Governance:* a yearly self-assessment against the 32 scored indicators of the Gawad KALASAG LDRRMCO toolkit CY 2026, with each indicator's means of verification and rating guide, the six minimum requirements, and the toolkit's weighted mean and band. The official assessment stays with the validation teams ([ADR-012](docs/adr/012-governance-and-mainstreaming.md)).
  - *Risk priorities in plans:* a mainstreaming register following the CDRA chain (decision area, findings, implications, policy intervention) into the CLUP, CDP, AIP, LDRRMP, LCCAP, ordinances and other instruments. Adoption needs the ordinance or resolution number. A coverage table shows priority risks not yet adopted or funded.
  - *Budgets:* budget lines by fund (LDRRMF 70%, QRF 30% and others), linked to NDRRMP 2020-2030 outputs. Actions are funded from approved lines, and over-commitment is refused. Actions can be linked to incidents ([ADR-009](docs/adr/009-action-links-and-budget.md)).
- **Enhancement (Phase 6): plan templates and forms.**
  - *Plans:* LDRRMP (Memo 147 outline), contingency plan, EOC manual (Memo 131), recovery program, public service continuity plan, LCCAP and communication plan. Each section cites its source. Plans are printable and are approved with their adopting resolution.
  - *Forms:* the Memo 147 review and Certificate of Review, initial and situation reports (SOPG), the RA 10821 school-use notice and the after-action report ([ADR-013](docs/adr/013-plans-forms-exercises.md)).
- **Validation (Phase 5): exercises.**
  - "Test this plan" starts a tabletop, drill, functional or full-scale exercise with checks of objectives, assumptions, capabilities and coordination taken from the plan and the standards.
  - Checks are rated against what was observed, and gaps become improvement actions in Response.
  - A DRRM officer closes the evaluation, and the after-action report prints. The plan list shows when each plan was last tested.
- **Detection (Phase 1).**
  - Hazard records now follow official alerts in each watch area automatically. This replaces "Automatic agency feeds is not available yet"; PHIVOLCS publishes no feed and stays a link ([ADR-010](docs/adr/010-official-hazard-sync.md)).
  - *Himawari satellite loop:* the last 3 hours, infrared or visible, from the JMA Meteorological Satellite Center. Only images verified as current are shown; when none are, Detection says so ([ADR-015](docs/adr/015-himawari-satellite-loop.md)).
- **Dashboard: UP NOAH "Know Your Hazards"** for flood, landslide and storm surge, with your watch areas. The map is loaded only on request. The NOAH code is unlicensed and its data needs NOAH's token, so it is linked, not copied ([ADR-014](docs/adr/014-noah-know-your-hazards.md)). The unused GeoRisk panel, which showed made-up hazard levels, is removed.
- **DDRiVER AI** across the platform ([ADR-011](docs/adr/011-ddriver-ai.md)).
  - Tasks: situation brief, explain an alert or rating, draft actions, and chat.
  - It is grounded in the user's own records, with cited sources; invented citations are removed.
  - It is off until an administrator turns it on, has daily limits and a 90-day log, and marks drafts it helped write as AI-assisted.
- **Privacy Policy finalised.**
  - Adds Google Limited Use, DDRiVER AI, breach handling (NPC Circular 16-03, 72 hours) and retention.
  - Names every provider, including JMA and UP NOAH when their content is opened.
  - The DPO reviews it before publication.
- **Tests (all run on 27 Nov 2026, all passing):**
  - Database: 14 suites, including new 90 (56 checks), 95 (29), 97 (29), 98 (79) and 99 (10).
  - Unit: 92 passed, 1 skipped.
  - Functions: 42.
  - Browser: 244 checks in 8 suites, including new `integration_ai.mjs` (37) and `plans_governance.mjs` (36), with Himawari checks in `detection.mjs` and NOAH checks.
  - Fixed while testing: a plan just created from a template did not open until the page was reloaded.
- **Apply:** DEPLOY.md § 9, "0.8 → 0.9". Cron and pg_net are required.

---

# DDRiVE-M 0.8.0: Connected Detection, Diagnosis and Response — 27 November 2026

Connects the first three phases of the cycle: what Detection observes and Diagnosis interprets now leads to decisions and actions in Response ([ADR-008](docs/adr/008-connected-detection-diagnosis-response.md)).

- **Response actions:** a new record of risk-informed actions (`T-###`). Analysts propose treatments from a register risk or a scored DDRiVE hazard event; responders propose actions from an official alert or a hazard record. A DRRM officer approves (or declines with a reason); responders report progress and complete the action with its outcome; officers can reassign or cancel with a reason. Steps are enforced in the database and audited. Treatment options follow ISO 31000; thematic areas follow RA 10121. The system never writes actions itself.
- **Response screen rebuilt:** tabs for Risk-informed actions, Incidents and Anticipatory action (RA 12287). Incidents can now be opened from the screen. Removed: the placeholder "AI Treatment Canvas", the static protocol list, and the "New Incident" button that only showed a message.
- **Anticipatory action is part of Response.** It leaves the side menu; `/anticipatory-action` links, alert hand-offs and the app shortcut open the tab in Response.
- **Diagnosis and Detection:** each register risk, scored hazard event, official alert and hazard record shows its actions and their status, with "+ Propose action". The hazard record's "Escalate" stub (which said it was not available) is replaced by this. Hazard cards can be opened with the keyboard.
- **Detection tested end to end:** the browser suite runs the real `ingest-official` function for PTWC, USGS and GDACS; the function takes `USGS_QUERY_URL` and `GDACS_QUERY_URL` for tests and accepts plain `http` for loopback addresses only.
- **Tests:** `supabase/tests/80_phase3_response_actions.sql` (48 checks, refusals checked for their reason); 7 unit tests; `e2e/detection.mjs` (14) and `e2e/response.mjs` (24).
- **Apply:** DEPLOY.md § 9, "0.7 → 0.8".

---

# DDRiVE-M 0.7.0: RA 12287 graduated disbursement — 27 November 2026

Closes gap **AA-02 / C-05** of the readiness register in code, from the IRR of RA 12287 (signed 14 September 2026; OCD certified true copy). Legal and finance sign-off is still required ([ADR-007](docs/adr/007-aa-graduated-disbursement.md)).

- **Rules as data:** `ddrive_aa_rule_sets` holds the IRR limits with their citation: LGU allocation ceiling of 10% of the 70% of the annual LDRRMF (Rule V s. 1(b)); for hydrometeorological and geological hazards, at most 30% of the allocation for interventions more than 3 days before the expected onset and up to 70% within 3 days (Rule V s. 2).
- **Allocations:** a DRRM officer records each year's anticipatory action allocation per fund (LDRRMF, agency anticipatory action budget, NDRRM Fund augmentation) with its basis.
- **Enforced in the database:** each measure records when it will be undertaken; its lead-time band is computed against the case's expected onset; disbursements that would exceed a band, the allocation, or that lack an allocation or implementation time are refused with the IRR citation. Grants, donations, other budget lines and unexpended LDRRMF in the Special Trust Fund are not graduated (Rule V s. 1(b), s. 2). Drought: disbursement needs a reference to the operational guidelines, which the IRR leaves to set its rate.
- **App:** Anticipatory Action shows each allocation's bands against their limits, the band of each measure before it is saved, and the reason when a disbursement is refused.
- **Tests:** `supabase/tests/70_phase3_aa_graduated.sql` (41 checks, each refusal verified for its reason), 6 unit tests, browser test of the allocation flow. Stale browser tests updated for 0.6.0 (Diagnosis tabs, Detection wording, Home and policy texts).
- **Apply:** DEPLOY.md § 9, "0.6 → 0.7".

---

# DDRiVE-M 0.6.0: Detection sources and DDRiVE assessment — 22 November 2026

- **Detection** reads the NOAA Pacific Tsunami Warning Center (CAP), USGS earthquakes (FDSN GeoJSON) and GDACS (GeoJSON) beside PAGASA, through a new `ingest-official` Edge Function; watch areas can be a point and radius; each alert in a watch area shows the organisation's approved DDRiVE rating for that hazard ([ADR-005](docs/adr/005-official-detection-sources.md)). PHIVOLCS publishes no feed and is linked, not scraped.
- **Diagnosis** runs the DDRiVE workbook's method (after UNDRR's Quick Risk Estimation): templates, workbook import (`.xlsm`/`.xlsx`, macros never run), scoring in the database, scenarios, Data Scores, Risk Summary and Vulnerability Report, glossary, print and CSV, approval and versions, and "Add to risk register" ([ADR-006](docs/adr/006-ddrive-hazard-assessment.md)).
- **DEPLOY.md** rewritten for DDRiVE-M (it held another platform's guide).
- **Apply:** migrations `20261122020000_phase3_ddrive_assessment.sql` then `20261122030000_phase3_detection_sources.sql`; deploy `ingest-official`; add its schedule; redeploy the app (DEPLOY.md § 9).

---

# DDRiVE-M 0.5.0: Rapid Mapping MVP — 22 November 2026

Implements the operational MVP of `Rapid_Mapping_Technical_Specs.md` (spec Phase 1, with the Phase 2 field-observation and linking pieces), adapted to DDRiVE-M. Decisions and scope cuts: [ADR-004](docs/adr/004-rapid-mapping.md).

- **Database:** `supabase/migrations/20261122010000_phase3_rapid_mapping.sql` (11 tables, RLS, step functions, audit). GeoJSON in EPSG:4326, validated in SQL; no PostGIS needed.
- **App:** Sidebar → Rapid Mapping (`/rapid-mapping`).
- **Tests:** `supabase/tests/40_phase3_rapid_mapping.sql` (110 checks, run by `npm run test:db`); `npm run test:unit` (37 Vitest tests).
- **Apply:** run the migration once in the SQL editor, then redeploy. No new environment variables.
- **Before operational use:** the preliminary and verified disclaimers are the spec's suggested text and need approval by the organisation's legal and records officers; damage/severity classes must be approved locally and entered under Damage classes.

---

# DDRiVE-M governance baseline update — 5 November 2026

This change set proposes:
- a Home page narrative aligned with the seven-phase Integrated Resilience Intelligence Cycle and its continuous feedback loop;
- populated legal facts for the owner-supplied Supabase host region (Northeast Asia) and Data Protection Officer (Alvin M. Silva);
- a governing technical/functional baseline with requirements traceability and acceptance tests; and
- a refreshed production-readiness/control register that supersedes outdated findings.

**Important:** the policy review gate remains `false`. The DPO name and hosting region are owner-supplied facts; verify the formal DPO appointment and the live Supabase project region before publication. This change set is a proposed patch, not a merged repository change.
