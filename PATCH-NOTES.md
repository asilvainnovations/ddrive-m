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
