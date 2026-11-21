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
