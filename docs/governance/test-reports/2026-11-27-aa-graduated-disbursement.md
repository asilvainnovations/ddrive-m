# DDRiVE-M Test Report

| Field | Value |
|---|---|
| Requirement ID(s) | AA-01, AA-02, AA-03; control C-05 |
| Test case ID(s) | AT-013, AT-014, AT-015, AT-016 |
| Build / commit | Branch `feature/ra12287-graduated-disbursement` on `main` at `26c2af1` (0.6.0) → 0.7.0 |
| Environment | Local: Postgres 16 with a Supabase stub, PostgREST 12.2.3, Deno 2.1.4, Chromium (Playwright). Not CI, not production |
| Test date and timezone | 27 November 2026, Asia/Manila (UTC+08:00) |
| Tester / reviewer | Claude (automated run). Reviewer: to be assigned |
| Module / workflow | Response · Anticipatory Action: allocations, measures, disbursement |
| Data classification | Synthetic only. No personal data |
| Result | PASS (automated). Legal and finance acceptance: not yet done |

## Preconditions and test data

Fresh local database built from every migration, applied twice (each must be safe to re-run). Synthetic organisations "LGU A" and "Enterprise B" with one user per role. Synthetic cases: "Typhoon Bising" (onset +5 days) and "Drought watch" (onset +30 days). Synthetic allocations: LDRRMF PHP 700,000 of an annual PHP 10,000,000; NDRRMF augmentation PHP 100,000. Rule source: IRR of RA 12287, Rule V ss. 1(b), 1(c), 2 (signed 14 Sep 2026, certified true copy).

## Steps and results

Every refusal below was checked for its reason (SQLSTATE and message), not only for being refused.

| Step | Action | Expected result | Actual result | Pass/Fail | Evidence |
|---|---|---|---|---|---|
| 1 | Read the active rule set | IRR-RA12287-2026: 0.07 / 0.30 / 0.70 / 72 h | As expected | Pass | 70_phase3_aa_graduated.sql |
| 2 | Allocation above 7% of the annual LDRRMF | Refused, citing Rule V s. 1(b) | 22023, "no more than 10% of the 70%" | Pass | same |
| 3 | Allocation of exactly 7% | Accepted | Accepted | Pass | same |
| 4 | Second LDRRMF allocation in a year; missing basis; missing annual LDRRMF | Refused | 23505 / 23514 / 23514 | Pass | same |
| 5 | Measures get their lead-time band from implementation time and expected onset | beyond / within / not graduated / unknown | As expected | Pass | same |
| 6 | Disburse 30% of the allocation for an intervention more than 3 days ahead; then PHP 0.01 more | Accepted; then refused citing Rule V s. 2 | As expected | Pass | same |
| 7 | Disburse 70% within 3 days; then PHP 0.01 more | Accepted; then refused citing Rule V s. 2 | As expected | Pass | same |
| 8 | Disburse from the LDRRMF with no implementation time | Refused | 22023, "Give when the intervention will be undertaken" | Pass | same |
| 9 | Disburse from a donor grant and from the Special Trust Fund, no allocation | Accepted (not graduated) | Accepted | Pass | same |
| 10 | Change implementation time or fund after a disbursement | Refused | 42501 | Pass | same |
| 11 | Reduce the allocation below the amount disbursed | Refused | 22023 | Pass | same |
| 12 | Drought: disburse from the NDRRMF without, then with, an operational-guideline reference; then above the allocation | Refused; accepted; refused | As expected | Pass | same |
| 13 | Allocation status per band | 210,000/210,000 and 490,000/490,000; total 700,000 | As expected | Pass | same |
| 14 | Browser: record an allocation, see the ceiling, a refusal above it, and each band against its limit; disburse; lift; report | As described | As expected | Pass | e2e/phase2b.mjs |
| 15 | Earlier RA 12287 workflow tests (AT-013 to AT-015) with an allocation recorded | Unchanged behaviour | 53 of 53 | Pass | 30_phase2_anticipatory.sql |

## Security and negative tests

- Only DRRM officers and administrators can record allocations (RLS refusal for an analyst) and disbursements.
- Nobody can change the rule set from the application (privilege refusal).
- Another organisation sees none of the allocations; every allocation change is in the audit log.

## Full run on the branch

| Suite | Result |
|---|---|
| `npm ci`, typecheck, lint | Pass (lint: 0 errors, 20 warnings already present on `main`) |
| `npm run build` (with static pages) | Pass |
| Unit (`vitest`) | 68 passed, 1 skipped |
| Edge Function tests (Deno) | 26 passed |
| SQL, by file: 10, 20, 30, 40, 50, 60, 70 | 98, 41, 53, 110, 57, 28, 41 passed; 0 failed |
| SQL, legacy upgrade path | 19 passed |
| Browser: phase1, phase2, phase2b, crawler | 25, 29, 47, 16 passed; 0 failed; 1 known gap reported (below) |

## Operational acceptance

Not done. Needed: the DRRM domain lead, legal counsel and the finance/control lead confirm the readings listed in ADR-007 ("Readings that need legal and finance confirmation"), then a tabletop exercise with a partner LGU on synthetic data.

## Defects and severity

| Defect ID | Severity | Owner role | Due date | Status |
|---|---|---|---|---|
| D-2026-11-27-01: Browser tests on `main` failed since 0.6.0 (Diagnosis tabs, Detection wording, Home and policy texts changed); fixed in this branch | S3 | QA / frontend lead | — | Fixed in branch |
| D-2026-11-27-02: Privacy Policy no longer discloses Google sign-in data use or the Limited Use statement, while Google sign-in is active | S2 (blocks Google OAuth verification) | DPO + privacy counsel | Before resubmitting Google verification | Open, owner decision |
| D-2026-11-27-03: Static Home page for crawlers still had the pre-5-Nov headline and draft notice | S3 | Frontend lead | — | Fixed in branch |
| D-2026-11-27-04: No CI pipeline; this report is a local run | S2 | Platform lead | — | Open |

## Retest and approval

| Retest evidence | Approver role | Decision | Date |
|---|---|---|---|
| This report and `supabase/tests/70_phase3_aa_graduated.sql` | Legal counsel; finance/control lead; DRRM domain lead | Pending | |
