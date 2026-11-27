# ADR-013: Plan templates, forms and exercises (Enhancement and Validation)

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Migration: `20261127060000_phase4_6_governance_plans_exercises.sql` (second part)

## Decision

1. **Plan templates** (Enhancement): LDRRMP (NDRRMC Memo 147 s. 2017 outline A-H), contingency plan per hazard (with RA 10821 child protection and schools as last-resort evacuation centres), EOC manual (NDRRMC Memo 131 s. 2018), recovery program, public service continuity plan, LCCAP and communication plan. Each section cites its source and says what it needs; required sections are tracked. A template plan is approved only with its adopting resolution.
2. **Forms**: the Memo 147 LDRRMP review checklist and Certificate of Review (four criteria), the initial report (within 2 hours) and situation report of the RDRRMOC SOPG, the RA 10821 notice when a school is used as an evacuation centre beyond 15 days, and the after-action report. Final forms cannot change.
3. **Exercises** (Validation, `X-###`): tabletop, drill, functional or full-scale; checks of four kinds (objectives, assumptions in the plan, capabilities, coordination) taken from the plan and a library of checks that cite their standard. Steps: planned → conducted (date, not in the future; checks frozen) → evaluated (every check rated; every gap has a recommendation; an officer's summary) or cancelled with a reason.
4. **Gaps become actions**: a check rated "partly met" or "not met" can propose an improvement action (origin `validation`) that Response decides under ADR-008.
5. **Evidence**: the plan list shows when each plan was last tested; the after-action report prints and can be filed as a form for sign-off (Gawad KALASAG indicator 3.1).

## Consequences

- RA 10121 s. 11(b)(1) ("regularly review and test the plan") becomes a recorded cycle: plan → exercise → findings → actions → revised plan.
- Tests: SQL suite 98; unit tests `governancePlans.test.ts`; browser test `plans_governance.mjs`.
