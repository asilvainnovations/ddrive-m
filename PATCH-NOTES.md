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
