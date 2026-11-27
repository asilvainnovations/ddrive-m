# ADR-010: Hazard records synchronised with official alerts

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Builds on: ADR-002, ADR-005
- Migration: `20261127040000_phase1_official_hazard_sync.sql`

## Context

Detection said "Automatic agency feeds is not available yet": official alerts were stored, but hazard records were typed by hand. PAGASA (CAP), PTWC, USGS and GDACS are already read every 10 minutes. PHIVOLCS publishes no data feed (its FOI reply confirms this), so it cannot be synchronised.

## Decision

1. After each ingest run, `ddrive_sync_official_hazards()` (ingest service only) keeps, for every organisation, one hazard record per official alert in force in its watch areas: created when the alert first applies, refreshed on an update, resolved when it expires or is replaced, and retracted with a reason when the agency cancels it.
2. Official records (`origin = 'official'`) are read-only in the app; the agency's text is not edited. Field records (`origin = 'field'`) are unchanged.
3. Adding or removing a watch area re-runs the sync for that organisation (statement trigger `ddrive_95_resync`).
4. PHIVOLCS stays a link, labelled "No data feed published".

## Consequences

- Records follow the agencies without anyone typing them; the source card shows when each was last synchronised.
- International readings (USGS, GDACS) stay labelled as international, not as Philippine warnings (RA 10639 and PD 1149 roles).
- Tests: `supabase/tests/95_phase1_official_hazard_sync.sql`; browser tests `detection.mjs`, `phase2.mjs`.
