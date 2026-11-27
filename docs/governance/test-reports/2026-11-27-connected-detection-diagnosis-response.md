# DDRiVE-M Test Report

| Field | Value |
|---|---|
| Requirement ID(s) | Seven-phase design: Detection → Diagnosis → Response hand-offs; anticipatory action within Response |
| Test case ID(s) | 80_phase3_response_actions.sql; e2e/detection.mjs; e2e/response.mjs |
| Build / commit | Branch `feature/connected-detection-diagnosis-response` on `main` at `4abf6f2` (0.7.0) → 0.8.0 |
| Environment | Local: Postgres 16 with a Supabase stub, PostgREST 12.2.3, Deno 2, Chromium (Playwright). Not CI, not production |
| Test date and timezone | 27 November 2026, Asia/Manila (UTC+08:00) |
| Tester / reviewer | Claude (automated run). Reviewer: to be assigned |
| Module / workflow | Detection, Diagnosis, Response: proposed actions and their decision; incidents; anticipatory action tab |
| Data classification | Synthetic only. No personal data |
| Result | PASS (automated). User acceptance by a DRRM officer: not yet done |

## Preconditions and test data

Fresh local database built from every migration, applied twice. Synthetic organisations "LGU A" and "Enterprise B" with one user per role. Detection fixtures: PTWC, USGS and GDACS documents in `supabase/functions/_shared/testdata`, served locally by `e2e/fake-pagasa.mjs`.

## Results by suite

| Suite | Checks | Failed | Notes |
|---|---|---|---|
| Type-check (`tsc`, strict) | — | 0 errors | |
| Lint | — | 0 errors | 20 warnings, unchanged from 0.7.0 |
| Production build and prerender | — | 0 | |
| Unit (Vitest) | 75 (+1 skipped) | 0 | New: `responseActions.test.ts` (7) |
| Functions (Deno) | 27 | 0 | New: loopback-only `http` rule for test sources |
| SQL: 10, 20, 30, 40, 50, 60, 70 | 98, 41, 53, 110, 57, 28, 41 | 0 | Unchanged |
| SQL: 80 response actions | 48 | 0 | New. Each refusal checked for its SQLSTATE and message |
| E2E phase1, phase2, phase2b | 25, 29, 47 | 0 | phase2b now checks the Anticipatory action tab in Response instead of a menu entry |
| E2E detection | 14 | 0 | Real `ingest-official` function: PTWC 1, USGS 3 (2 alerts, 1 cancellation; Fiji excluded), GDACS 2; nothing stored twice; per-source labels and freshness on screen |
| E2E response | 24 | 0 | New, see below |
| Crawler | 16 | 0 | One GAP, pre-existing: privacy policy lacks the Google sign-in disclosure |

## Response flow in the browser (e2e/response.mjs)

| Step | Who | Expected | Result |
|---|---|---|---|
| 1 | Analyst | A register risk (4 × 5) shows "No actions yet"; the form starts from the risk with priority Critical | Pass |
| 2 | Analyst | Proposes "Move the archive to the second floor": stored as `proposed`, origin `diagnosis`, linked to the risk, `T-###`; Diagnosis shows its status | Pass |
| 3 | Administrator | Response has three tabs; the placeholder canvas is gone; the card says which risk it responds to; approves | Pass |
| 4 | Responder | Cannot approve; records 40% with what was done; completes with the outcome (100%, `done`) | Pass |
| 5 | Responder | Proposes an action from an official alert in Detection: origin `detection`, linked to the alert | Pass |
| 6 | Viewer | Sees the action and its outcome; no step buttons; menu has no separate Anticipatory Action entry | Pass |
| 7 | Viewer | `/anticipatory-action?alert=abc` opens `/response?tab=anticipatory&alert=abc` with the tab selected | Pass |
| 8 | All | No page errors | Pass |

## Database rules (80_phase3_response_actions.sql), selected

| Rule | Result |
|---|---|
| A new action is always `proposed`, whatever the insert says; the server issues the reference | Pass |
| From Diagnosis: analyst or higher; must name a risk or hazard event of the same organisation; the hazard event must be scored | Pass (refusal reasons verified, including "Score this hazard event … before proposing an action for it") |
| From Detection: must name an alert or hazard record | Pass |
| Status, decision, progress and outcome cannot be set by a plain update | Pass |
| Approve/decline: DRRM officer only; declining needs a reason | Pass |
| Progress: responder; approved actions only; never down; 100% only by completing with an outcome | Pass |
| Closed actions frozen; after the decision only office and due date change, by a DRRM officer | Pass |
| Other organisations and anonymous visitors see and change nothing; every step audited | Pass |

## Not covered

- Real PAGASA, PTWC, USGS and GDACS endpoints (fixtures only); production Supabase and Vercel.
- Assistive-technology testing of the new forms (keyboard reachability was checked for hazard cards only).
- Acceptance by a DRRM officer that the treatment vocabulary and the decision steps match local practice.
