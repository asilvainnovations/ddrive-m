# DDRiVE-M Integrated Resilience Intelligence Cycle
## Governing Technical and Functional Baseline — Development Cycle 1

| Control field | Value |
|---|---|
| Document ID | DDRIVE-M-TFB-001 |
| Version | 1.0 |
| Baseline date | 5 November 2026 |
| Status | Proposed governing baseline; approval required |
| Repository reviewed | `asilvainnovations/ddrive-m`, `main` |
| Repository tree reviewed | `87fa74c48856e6b2821e1662def6535098098f11` |
| Purpose | Control the next development cycle through requirements, evidence, ownership and acceptance tests |

> **Authority and limitation.** This baseline consolidates repository evidence and the project reference set. It is not a legal opinion, a certification of compliance, a penetration-test report, a live Supabase configuration attestation, or proof that an LGU/EOC is operationally ready. Requirements below are traceability obligations for product design and acceptance. The applicable authority remains the relevant statute, implementing rule, circular, official guideline and the adopting organisation's approved procedures.

## 1. Product direction and system intent

DDRiVE-M is an **Integrated Resilience Intelligence Platform** designed around the integration of four mutually dependent dimensions:

1. **Risk intelligence** — source-aware hazard information; exposure, vulnerability and capacity evidence; climate and disaster risk analysis; uncertainty; and the interpretation of changing risk.
2. **Governance** — mandates, institutions, roles, coordination arrangements, plans, budgets, safeguards and accountability.
3. **Operational decisions** — prioritisation, EOC coordination, anticipatory action, response, resource mobilisation, continuity and authorised approvals.
4. **Resilience outcomes** — tested capability, reduced risk, continuity of essential services, recovery progress, learning and measurable improvements.

The seven phases form a continuous feedback loop, not a one-way workflow:

1. Detection
2. Diagnosis
3. Response
4. Integration
5. Validation
6. Enhancement
7. Monitoring

Monitoring, exercise results, after-action reviews, event impacts and community feedback must update the evidence base and inform the next Detection and Diagnosis cycle. Validation findings must lead to owned corrective actions. Enhancement must translate approved priorities into plans, budgets and investments. Response and anticipatory-action records must be traceable to the evidence and authority on which they relied.

### 1.1 Architectural principles

- **Evidence before assertion:** every operational figure has a source, timestamp, scope, owner and confidence/quality status. Unknown is not zero.
- **Official versus analytical:** official warnings are displayed with agency provenance and are never re-authored by the platform. Analytical outputs are clearly labelled and do not impersonate official determinations.
- **Human authority:** the platform supports and records statutory and operational decisions; it does not issue warnings, declare a State of Imminent Disaster, order evacuation or approve public expenditure.
- **Risk is contextual:** no single likelihood × impact score is represented as a complete CDRA. Hazard, exposure, vulnerability, capacity, climate change, spatial context, cascading effects and social differentiation must be considered where relevant.
- **Tenant isolation and least privilege:** access is enforced server-side; client-side role checks are not the security boundary.
- **Traceable lifecycle:** source records, assessments, decisions, approvals, changes, exercises and corrective actions retain an auditable history.
- **Offline safety:** cached application assets do not imply offline access to current warnings or shared records. Queueing a statutory declaration or financial approval for later transmission is prohibited unless separately designed, controlled and accepted.
- **Interoperability and portability:** use stable identifiers, documented schemas, Philippine Standard Geographic Code (PSGC) where appropriate, open exports and versioned interfaces.
- **Inclusive and disaggregated evidence:** capture sex, age, disability and other legally and operationally relevant disaggregation with safeguards, minimisation and purpose limitation.
- **No compliance by label:** framework alignment is not certification. Each requirement needs evidence and a test.

## 2. Scope and module boundaries

| Module / capability | Primary purpose | Current repository evidence | Boundary / limitation at baseline |
|---|---|---|---|
| Command Dashboard | Shared operational and cycle overview | Reads hazards, risks, incidents, UNDRR scores, scenarios, plans, messages and official alerts; displays unavailable/empty states | Dashboard aggregates available tables; it does not prove data completeness or operational readiness |
| 1. Detection | Official alert ingestion and local hazard records | PAGASA CAP ingestion Edge Function, official-alert hooks and migration/ADR; hazard module | PHIVOLCS/NOAH feeds and mapped alert extents are not established as complete |
| 2. Diagnosis | Organisational risk register and integrated risk analysis | `ddrive_risks`, risk thresholds, diagnosis module | Current likelihood-impact register is not a complete CDRA; no full exposure/vulnerability/capacity/climate/spatial workflow evidenced |
| 3. Response | Incident, treatment and operational coordination | Incident table/module, named actions, messaging; anticipatory action is separately routed | Full EOC operational workflow, tasking/resource/logistics and harmonised reports are not evidenced end-to-end |
| 3A. Anticipatory Action | Record forecast-triggered RA 12287 workflow | Dedicated tables/functions/UI, ADR-003 and 5 Nov migration | IRR graduated disbursement rules are expressly not encoded; human attestations and orders require competent authority and documentary evidence |
| 4. Integration | Connect resilience priorities and governance | UNDRR scorecard module and stored scores | Full MCR2030 evidence, owners, baselines, budgets, targets and outcome chain are not yet demonstrated |
| 5. Validation | Scenario and exercise-based capability testing | Scenario records, participation function, external simulators | External/static simulators are not equivalent to an integrated exercise management, AAR and corrective-action workflow |
| 6. Enhancement | Plan drafting and improvement | Plan records, templates and `draftPlan` action | Draft generation/storage does not establish legal sufficiency, formal approval, budget linkage or recovery planning completeness |
| 7. Monitoring | Team messages and operational progress | Messages and realtime/presence components | KPI, online-user and resilience-outcome validity require live data-source and operational acceptance; no full outcome framework evidenced |
| Documents | Controlled reference and document records | Documents module and database records | Version control, classification, retention, signatures and authoritative approval lifecycle require tests |
| DDRiVER AI | Future cited reference assistant | App explicitly indicates not yet connected | Not a production capability; no live RAG, citation accuracy, privacy isolation or safety evaluation accepted |
| Settings / tenant administration | Organisation, membership and roles | Tenant and membership tables, role helpers and RLS policies | Live role administration, break-glass process, MFA and security monitoring require deployment tests |
| Public/static tools | Adjacent training and assessment tools | Multiple standalone HTML pages in `public/` | Treat as separate applications/security and privacy boundaries until integrated and reviewed |

## 3. Requirements traceability matrix

**Status key:** `E` = evidenced in repository; `P` = partially evidenced; `U` = unverified in live environment or not proven by source inspection; `G` = gap/not implemented as an end-to-end capability. Repository presence is not equivalent to a passed acceptance test.

| ID | Module / requirement | Governing reference and requirement intent | Repository evidence / status | Required acceptance evidence |
|---|---|---|---|---|
| GOV-01 | Cross-phase governance, roles and accountability | RA 10121; NDRRMC Memo 131 s.2018 EOC organisational/functional arrangements; UNDRR MCR2030 Essential 1 | Tenant, membership and five-role model in ADR-001 and access migration — `E` design / `U` live verification | RACI approved by adopting organisation; role matrix test; authority/approval log; cross-tenant denial test |
| DET-01 | Official warning provenance | RA 10639 (where applicable to warning dissemination); NDRRMC/OCD coordination context; PAGASA CAP source and attribution in ADR-002 | PAGASA CAP ingestion function, official alert schema and ADR — `E` code / `U` production schedule and feed reliability | Test feed success/failure, source link, issued/expiry time, update/cancellation ordering, 30-minute stale warning, duplicate idempotency, attribution |
| DET-02 | Multi-hazard coverage | RA 10121; CDRA supplemental guidelines; MCR2030 Essential 2 | PAGASA CAP integration — `P`; PHIVOLCS/NOAH not evidenced as integrated structured feeds — `G` | Source register per hazard; validated ingestion or controlled manual workflow; geographic coverage test; data quality and stale-source test |
| DIA-01 | Risk register | RA 10121; ISO 31000 (guidance); MCR2030 Essential 2 | `ddrive_risks`, tenant-specific criteria and database-computed risk levels — `E` design / `U` operational test | CRUD/role test; criteria versioning; calculation test; source and review date; unknown-data handling; audit log |
| DIA-02 | CDRA methodology | Supplemental Guidelines for Mainstreaming CC/DRR in CLUP/CDRA; RA 10121; MCR2030 Essential 2 | Current risk register is likelihood × impact; integrated CDRA not evidenced — `G` | Approved CDRA data model and method; hazard, exposure, vulnerability, capacity, climate, spatial and cascading-risk evidence; SADD; map/output review by competent technical panel |
| DIA-03 | Climate information and future risk | CDRA supplemental guidelines; climate adaptation planning context; MCR2030 Essentials 2, 4 and 5 | No complete climate projection/scenario workflow evidenced — `G` | Traceable climate datasets/scenarios, time horizons, downscaling/limitations, uncertainty, sector and spatial outputs; climate specialist sign-off |
| RSP-01 | EOC activation and operations | NDRRMC Memo 131 s.2018 Guidelines on Establishment, Operationalization and Management of EOC; RA 10121 | Incident/message components exist; full EOC workflow not demonstrated — `P/G` | EOC activation/deactivation state machine; activation level, authority, incident objectives, situation board, action log, shift handover and demobilisation tests |
| RSP-02 | EOC capability and continuity | EOC Capability Assessment Checklist; NDRRMC Memo 131 s.2018 | Application cannot evidence facility, staffing, 72-hour supplies, alternate site, redundant comms, SOPs or exercises — `G` | Documented site/alternate site, roster/shift coverage, 72-hour capability, comms failover, SOP and exercise evidence; assessment sign-off |
| RSP-03 | Harmonised disaster response reporting | DILG Region VIII Disaster Response Reporting Template and SOP Adoption | No complete pre-disaster/during-disaster/post-disaster/terminal reporting workflow evidenced — `G` | Validate report types, field definitions, agency/cluster owners, cut-off times, approval and submission; SADD; duplicate and reconciliation tests |
| AA-01 | State of Imminent Disaster case lifecycle | RA 12287 and IRR 2026; ADR-003 | Case, assessment, recommendation, declaration, lifting and report workflow — `E` design/code / `U` full legal acceptance | Scenario tests for both statutory assessment conditions, remaining lead time, recommendation, executive order, lifting, hazard onset, immutable audit and reporting |
| AA-02 | Graduated disbursement controls | IRR 2026; RA 12287 funding and accountability provisions | ADR-003 explicitly states graduated disbursement rules are not encoded — `G` | Legal mapping of each forecast level to permitted release, cap, approver, source and documentary requirement; negative tests; finance/legal sign-off |
| AA-03 | Fund accountability and unused balances | RA 12287 and IRR 2026 | Fund source and reporting fields described in ADR-003 — `P` | Reconcile allotted/disbursed/unused by source; validate cost minimisation method; test unused-fund treatment; finance and audit acceptance |
| INT-01 | UNDRR Ten Essentials scorecard | UNDRR MCR2030 Ten Essentials; RA 10121 governance and planning context | Scorecard records and UI — `P` | Each indicator has definition, evidence, baseline, target, owner, due date, source, validation and trend; prohibit unsupported default score |
| INT-02 | Governance, finance and integrated planning linkages | UNDRR MCR2030 Essentials 1–8; CDRA/CLUP supplemental guidelines | Scorecard and plan modules exist — `P/G` | Trace risk finding → plan action → responsible office → budget/investment → implementation → outcome; approval and budget evidence |
| VAL-01 | EOC/ICS simulation and exercises | NDRRMC EOC guidelines; EOC Capability Assessment Checklist; DILG response SOP; MCR2030 Essential 9 | Scenario module, participation function and standalone simulators — `P` | Exercise plan, injects, role attendance, decision timestamps, resource logs, objectives, observer findings, AAR and corrective action closure |
| VAL-02 | Operational acceptance / exercises | EOC guidelines; organisation-approved SOPs | No evidence of completed LGU UAT or formal EOC exercise acceptance — `U` | Signed UAT scripts and exercise report by EOC/DRRM authority; critical defects closed; repeatability and failover tests |
| ENH-01 | DRRM and contingency plans | RA 10121; applicable NDRRMC/DILG planning requirements | Plan templates and draft action — `P` | Plan content checklist, evidence links, version, consultation, approval authority, review date, distribution and supersession |
| ENH-02 | Mainstreaming climate/disaster risk into CLUP/CDRA | Supplemental Guidelines for Mainstreaming CC/DRR in CLUP/CDRA | No full CLUP/CDRA spatial-to-investment workflow — `G` | Spatial risk layer and planning-unit traceability; land-use policy/action linkage; sectoral consultation; technical review and planning authority acceptance |
| ENH-03 | Rehabilitation and recovery | NEDA Disaster Rehabilitation and Recovery Planning Guide; RA 10121; MCR2030 Essential 10 | No complete damage/loss/needs-to-recovery workflow evidenced — `G` | Damage/loss/needs records; recovery strategy; BBB and resilience measures; responsible agency; financing; sequencing; monitoring and transition |
| MON-01 | Operational monitoring and shared information | NDRRMC EOC guidance; DILG reporting SOP; RA 10121 | Messages, presence and dashboard aggregation — `P` | Reconcile data to source; role and tenant filters; timestamp; acknowledgement; escalation; stale/failed-feed state; export and audit |
| MON-02 | Resilience outcome monitoring | UNDRR MCR2030; CDRA/CLUP and recovery guidance | No complete outcome indicator framework evidenced — `G` | Baseline/target/actual, disaggregation, source, method, frequency, owner and independent validation; outcome review |
| DATA-01 | SADD and inclusion | DILG reporting SOP; CDRA guidelines; RA 10173 | No comprehensive SADD validation workflow established — `G/U` | Age/sex and relevant vulnerability disaggregation; lawful purpose; minimum necessary fields; suppression/access controls; completeness and bias review |
| SEC-01 | Tenant isolation and least privilege | RA 10173; ADR-001; Supabase RLS design | RLS policies, tenant functions and access tests exist in repo — `E` design / `U` deployed DB and adversarial verification | Fresh/upgrade migration tests; cross-tenant read/write denial for every table/function/storage path; privilege escalation tests; logs |
| SEC-02 | Privacy transparency and data-subject rights | RA 10173; NPC Circular 2022-04 (as applicable) | Privacy policy, DPO name/email and host-region facts are present; `reviewed:false` — `P` | Approved privacy notice, PIA, processing inventory, controller/processor contracts, retention schedule, rights request and breach drills, NPC registration applicability decision |
| SEC-03 | Static tools and third-party processing | RA 10173; project privacy policy | Static pages and separate security-assessment database remain distinct surfaces — `U/G` | Inventory scripts, endpoints, storage, forms, consent, data transfer, retention, access and deletion; independent security/privacy review |
| AI-01 | Cited and safe decision support | AI Ethics policy; RA 10173; human-authority requirements under RA 12287 | Assistant marked not connected — `G` production | Server-side RAG; tenant-scoped retrieval; source citations; prompt-injection tests; no fabricated values; red-team and human-factors evaluation |
| UX-01 | Crisis-use usability and accessibility | EOC operational requirements; accessibility policy; WCAG 2.2 AA as target | Responsive UI exists; full audit not evidenced — `U` | Keyboard/screen-reader and contrast audit; mobile field test; high-stress task tests; plain language; accessible alerts; slow-network performance |
| OPS-01 | Backup, restore, incident response and release | RA 10173 security obligations; operational continuity; project deployment controls | Deployment and migration files exist — `P/U` | Restore test with RPO/RTO; incident response tabletop; key rotation; monitoring/alerting; CI gates; rollback; release sign-off |
| OPS-02 | Offline and degraded mode | EOC continuity requirements; project PWA design | App shell can cache; live records/alerts not cached — `P` | Explicit offline banner; no stale alert represented as current; safe read-only/degraded mode; queue conflict policy; prohibit deferred statutory/financial authority actions |

## 4. Updated control register and severity

### 4.1 Severity definitions

- **Critical (S1):** could cause unsafe operational decisions, unlawful authority/fund action, cross-tenant disclosure, material personal-data breach or materially false official information. Block external operational reliance.
- **High (S2):** major legal, security, data integrity or core workflow gap; block production launch of the affected capability.
- **Moderate (S3):** material usability, evidence, maintainability or control weakness; permit only controlled pilot with documented mitigation.
- **Low (S4):** improvement with limited immediate safety, legal or integrity consequence.

### 4.2 Control status definitions

- **Verified in repository:** directly evidenced by current source, migration, ADR or test file. This is not a live deployment test.
- **Partially verified:** code/design exists but acceptance, coverage or completeness is not demonstrated.
- **Unverified:** cannot be established from repository inspection; needs live configuration, evidence, owner attestation or independent test.
- **Gap:** required capability/control is absent or explicitly not implemented.

| ID | Finding / control | Status | Severity | Remediation owner (role) | Required closure evidence |
|---|---|---|---|---|---|
| C-01 | React/Vite app structure, routes and auth provider are present | Verified in repository | S3 | Front-end lead | Clean install, typecheck, build, route smoke tests and CI artefact |
| C-02 | Tenant/RLS architecture and named database actions | Verified in repository; live tests unverified | S1 until live verification | Backend / Supabase security lead | Deployed migration hashes, per-role/per-table RLS matrix, cross-tenant negative tests |
| C-03 | PAGASA CAP ingestion implementation | Verified in repository; production scheduler and source reliability unverified | S1 for operational warning reliance | Data integration lead | Production scheduler logs, stale-feed alert, update/cancel tests, independent source comparison |
| C-04 | RA 12287 workflow and database state transitions | Partially verified | S1 | DRRM domain lead + legal counsel + backend lead | IRR rule trace, role/order tests, documentary evidence and tabletop acceptance |
| C-05 | Graduated disbursement rules from IRR | Gap (ADR-003 acknowledges) | S1 | Legal counsel + finance/control lead + backend lead | Approved rule catalogue, automated negative/positive tests, finance sign-off |
| C-06 | Full CDRA and climate-risk analysis | Gap | S2 | DRR/CCA technical lead + GIS/data lead | Approved methodology, data dictionary, spatial outputs, technical panel acceptance |
| C-07 | EOC operational workflow and physical capability | Gap in platform evidence; institutional status unverified | S1 for EOC readiness claims | EOC operations lead + LGU DRRM authority | Capability assessment, facility/alternate site, roster, 72-hour logistics, comms, SOP and exercise records |
| C-08 | DILG harmonised reporting workflow | Gap | S2 | Reporting/MEL lead + DRRM operations lead | Report templates, field mapping, role/approval workflow, SADD and reconciliation tests |
| C-09 | UNDRR scorecard evidence and outcome chain | Partial | S2 | Resilience/MCR2030 lead | Indicator evidence, baseline/target/owner/budget/verification and trend tests |
| C-10 | Validation/AAR/corrective action closure | Partial | S2 | Exercise and training lead | End-to-end exercise records, AAR, assigned actions and closure verification |
| C-11 | Recovery and rehabilitation planning | Gap | S2 | Recovery planning lead | Damage/loss/needs and recovery module acceptance against NEDA guide |
| C-12 | DPO identity and Supabase region populated in policy facts | Verified as supplied values in proposed update; actual appointment/region unverified | S2 | DPO + platform owner | Appointment record; live Supabase Settings → General evidence; subprocessor/data-transfer review |
| C-13 | Policy publication/legal review | Draft policy content exists; review gate remains false | S2 | DPO + Philippine privacy counsel | Approved PIA, privacy notice, retention, controller/processor terms, NPC applicability decision, sign-off |
| C-14 | Static HTML tools and separate data collection endpoints | Inventory exists; full review unverified | S2 | Security lead + privacy lead + product owner | Endpoint/script inventory, data-flow map, consent/notice, XSS and storage tests, remediation sign-off |
| C-15 | DDRiVER AI production service | Not connected | S2 (before any AI launch) | AI/product lead + security/privacy leads | Server-side RAG, citations, tenant-isolation tests, prompt-injection red-team, safety acceptance |
| C-16 | Offline operational continuity | Partial (asset shell only) | S1 for use during connectivity loss | Front-end lead + EOC operations lead | Degraded-mode tests; stale-data warnings; offline decision safety and recovery tests |
| C-17 | CI/CD, dependency and build verification | Repository contains scripts/config; current run result not established in this review | S2 | Engineering lead | Captured clean install, lint, typecheck, unit/integration/E2E, dependency and build reports |
| C-18 | Backup/restore, RPO/RTO and incident response | Unverified | S1 | Platform/SRE lead + DPO | Restore evidence, RPO/RTO approval, incident response exercise and breach notification drill |
| C-19 | Accessibility and crisis-use UX | Unverified | S3 | UX/accessibility lead + DRRM user panel | WCAG 2.2 AA audit and field-based task testing |
| C-20 | LDDRMCO CY2026 assessment-toolkit indicator-level mapping | Unverified; workbook not parsed in prior review | S2 | DRRM/MEL lead | Workbook review, indicator mapping, scoring validation and acceptance matrix |

**Ownership note:** owners are accountable roles, not named individuals. The product owner must assign a named person and due date in the delivery tracker before work is committed.

## 5. Acceptance test catalogue

All tests must run in a controlled staging environment with synthetic data unless the test explicitly requires an authorised live feed. Capture test ID, build SHA, migration version, environment, tester, date, expected result, actual result, evidence link and defect reference.

| Test ID | Test scenario | Pass criteria |
|---|---|---|
| AT-001 | Fresh database install and upgrade from prior supported schema | All migrations apply in order; no manual untracked schema change; rollback/recovery documented |
| AT-002 | Tenant isolation | User in Tenant A cannot read, update, delete or infer Tenant B records through UI, REST, RPC, realtime, export or storage |
| AT-003 | Role matrix | Each role can perform only the approved actions; client-side role manipulation does not elevate privileges |
| AT-004 | Auditability | Create/update/approval/status transition records actor, tenant, timestamp, object, before/after and reason as applicable |
| AT-005 | PAGASA feed ingestion | Valid CAP item stored once with source, issue time, expiry, area, attribution; duplicate feed does not duplicate |
| AT-006 | PAGASA update/cancellation/out-of-order | Replaced/cancelled alerts correctly cease to be in force; source chain remains traceable |
| AT-007 | Stale or failed feed | Feed freshness degrades visibly at configured threshold; no stale alert is presented as current |
| AT-008 | Risk register calculation | Thresholds are tenant-specific and versioned; boundary values tested; missing likelihood/impact remains unknown, not zero |
| AT-009 | CDRA traceability | Every mapped risk has hazard, exposure, vulnerability, capacity, climate/spatial context, source, date, scale and uncertainty metadata |
| AT-010 | EOC activation | Only authorised role activates/deactivates; activation level, authority, time, objectives, staffing and notification trail recorded |
| AT-011 | EOC degraded operations | Loss of internet/primary communications triggers tested alternate procedures; stale information visibly marked |
| AT-012 | Harmonised reporting | Pre/during/post/terminal report generated from validated source records; required fields, cut-off, disaggregation, approval and export validated |
| AT-013 | RA 12287 pre-disaster assessment | Both statutory conditions recorded with assessor, evidence and rationale; lead time calculation and time-bound checks correct |
| AT-014 | RA 12287 recommendation/declaration | Competent role records recommendation and executive order reference; software cannot itself declare |
| AT-015 | RA 12287 lifting/occurrence | Both lifting pathways correctly handled; new assessment/order evidence retained; hazard-onset automatic transition is tested |
| AT-016 | IRR graduated disbursement | Each forecast level maps to legally approved disbursement controls; invalid amount/source/approver is rejected |
| AT-017 | Fund reconciliation and report | Allotted, disbursed, unused and cost data reconcile to source documents; report export is reproducible |
| AT-018 | UNDRR Ten Essentials | Indicator score requires evidence, source, assessor, date, owner and rationale; no default score on empty data |
| AT-019 | Exercise and AAR | Scenario captures objectives, injects, participants, decisions, observations, AAR and corrective actions with owners/dates |
| AT-020 | Plan lifecycle | Draft → review → approval → publication → revision/retirement; approver authority and immutable approved version verified |
| AT-021 | Recovery planning | Damage/loss/needs findings trace to recovery priorities, BBB measures, responsible entity, financing and outcome indicators |
| AT-022 | Privacy rights workflow | Access/correction/objection/erasure requests are logged, routed to correct controller and completed within approved SLA |
| AT-023 | Breach response | Detection, containment, assessment, controller/DPO escalation and applicable notification workflow exercised |
| AT-024 | Static tools security review | No exposed API secrets; no unsafe HTML injection; forms disclose purpose; consent and retention work; data destination approved |
| AT-025 | AI safety (before activation) | Tenant-scoped retrieval; every factual answer cites source; no unsupported claims; prompt injection and high-stakes refusal tests pass |
| AT-026 | Accessibility and field usability | Critical workflows pass keyboard, screen-reader, contrast, zoom, mobile and low-bandwidth tests |
| AT-027 | Backup and restore | Restore from backup meets approved RPO/RTO; restored data and audit chain verified |
| AT-028 | Release readiness | CI gates pass; dependency/security review signed; migration and rollback rehearsed; release owner approves |

## 6. Severity-based remediation sequence

### Gate 0 — prevent unsafe reliance (S1)
1. Verify deployed RLS and role boundaries against every tenant table, RPC, realtime channel and storage bucket.
2. Verify PAGASA production scheduling, freshness, cancellation and failure behaviour.
3. Keep RA 12287 workflow in controlled testing until IRR graduated disbursement controls and legal/finance acceptance are complete.
4. Do not market the platform as an operational EOC or as a complete offline emergency system.
5. Complete backup/restore and incident response evidence before production handling of operational personal data.

### Gate 1 — complete the DRRM functional core (S2)
1. Implement CDRA and climate-risk evidence model.
2. Implement EOC activation/operations and the harmonised DILG response-reporting workflow.
3. Connect UNDRR indicators to evidence, owners, budgets, targets and outcomes.
4. Add integrated exercise/AAR/corrective-action management.
5. Implement recovery planning aligned with the NEDA guide.
6. Complete static-tool privacy/security inventory and policy review.

### Gate 2 — validate and improve (S3)
1. Conduct LGU/EOC user acceptance and realistic exercises.
2. Complete accessibility and crisis-use usability assessment.
3. Establish resilience outcome monitoring and learning review.
4. Consolidate or retire duplicate standalone simulators/tools under controlled release management.

## 7. Governance and change control

- This baseline is the source of truth for the next development cycle once approved by the product owner and DRRM domain authority.
- Each requirement has a stable ID. Every issue, pull request, migration and test report must reference one or more IDs.
- A requirement cannot be marked `Accepted` solely because a component exists. It must have acceptance evidence and an accountable approver.
- Changes to statutory interpretation, reporting fields, scoring methods, alert-source handling, retention, data sharing or role authority require a documented decision record and versioned change.
- No score, risk level, alert status, compliance percentage or resilience outcome may be shown without source, timestamp, method and scope.
- Product marketing must reflect the actual status of the implemented capability and must not imply government endorsement, legal certification or institutional readiness.
- Legal/policy pages remain visibly under review while `LEGAL_FACTS.reviewed` is false. Only the DPO and authorised management/counsel may approve publication status.

## 8. Source register

### Project repository evidence reviewed
- `src/site/Home.tsx`
- `src/content/legal/facts.ts`, `privacy.ts`, `terms.ts`, `cookies.ts`, `ai-ethics.ts`, `accessibility.ts`
- `src/lib/modules.ts`, `src/App.tsx`
- `src/components/ddrive/` module components
- `supabase/migrations/` Phase 1, official-alert and anticipatory-action migrations
- `supabase/functions/ingest-pagasa/index.ts`
- `docs/adr/001-multi-tenancy-and-access.md`
- `docs/adr/002-official-alert-ingestion.md`
- `docs/adr/003-anticipatory-action-workflow.md`
- `e2e/` and `scripts/` test harnesses
- `READINESS-AUDIT.md` (superseded for current status by this baseline and the companion control register)

### Supplied project reference set
1. Republic Act No. 10121 (2010), Philippine Disaster Risk Reduction and Management Act.
2. Republic Act No. 10173 (2012), Data Privacy Act.
3. Republic Act No. 12287 and its 2026 Implementing Rules and Regulations.
4. NDRRMC Memorandum No. 131, s. 2018, Guidelines on the Establishment, Operationalization and Management of Emergency Operations Centers.
5. DILG Region VIII, Disaster Response Reporting Template and SOP Adoption.
6. Supplemental Guidelines for Mainstreaming Climate Change and Disaster Risk Reduction in the CLUP/CDRA.
7. EOC Capability Assessment Checklist.
8. LDDRMCO Assessment Toolkit CY 2026 — indicator-level validation remains pending because the workbook was not successfully parsed in the prior review.
9. NEDA, Disaster Rehabilitation and Recovery Planning Guide.
10. UNDRR Making Cities Resilient 2030 and Ten Essentials.

## 9. Approval record

| Role | Name | Decision | Date | Signature / evidence |
|---|---|---|---|---|
| Product owner | To assign | Pending | — | — |
| DRRM/CCA domain authority | To assign | Pending | — | — |
| Engineering/security lead | To assign | Pending | — | — |
| Data Protection Officer | Alvin M. Silva (owner-supplied designation) | Pending formal review | — | — |
| LGU/EOC operational representative | To assign | Pending | — | — |

**Baseline approval is required before this document is treated as formally governing.** Until then, it is the proposed controlled baseline for planning and review.
