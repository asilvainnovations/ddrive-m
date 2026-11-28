# ADR-017: EOC operations

- Status: Accepted for controlled testing
- Date: 2026-11-28
- Migration: `20261128010000_phase3_eoc_operations.sql`
- Sources: NDRRMC Memorandum No. 131 s. 2018 (9.2 Operationalization, 9.3 Management of EOC); DILG Region VIII harmonised disaster response reporting SOP (definitions of WHITE, BLUE and RED alert status). The official texts govern.

## Context

The readiness register names EOC operational capability as a critical gap. That covers activation, staffing and shifts, handover and demobilisation. Before this change, DDRiVE-M had no record of the EOC's alert status, who was on duty, or what was decided. The top bar showed nothing about the EOC. Older prototypes had hard-coded "ALERT LEVEL" badges, which were removed.

## Decision

1. **EOC status is an append-only log** (`ddrive_eoc_status`, `E-###`). Each row records:
   - the level: WHITE (normal operations), BLUE (heightened alert) or RED (full alert);
   - the previous level;
   - the trigger;
   - the basis;
   - the Responsible Official who directed the change;
   - an optional official alert or incident.

   The current status is the latest row (view `ddrive_eoc_current`).
2. **Triggers follow Memo 131.** Raising the status takes an activation trigger (9.2.1.1 to 9.2.1.5). Lowering it takes a deactivation trigger (9.2.7.1 to 9.2.7.4). The first record uses the trigger `initial`. Repeating the current level is refused.
   - Only a DRRM officer can record a change, and only through `ddrive_eoc_set_status`. The status table has no insert policy and no update or delete grant.
   - An advisory lock stops two officers from changing the status at the same moment.
3. **No assumed status.** With nothing recorded, the app says "not recorded". It does not show WHITE.
4. **The status shows on every screen.** The top bar shows "EOC: BLUE" and so on, using the official colour names, with its time and the Responsible Official. It links to Response → EOC operations.
5. **Duty roster** (`ddrive_eoc_duty`), organised by the five management functions of Memo 131 9.3.1: Management, Operations, Planning, Logistics, and Finance/Administration.
   - Tours of duty last at most 24 hours. Memo 131 9.3.3 leaves the schedule itself to the CP, PSCP or EOC manual.
   - Analysts manage the roster. Responders can only mark a tour as started or completed.
   - Under BLUE or RED, functions with no one on duty are flagged.
6. **Operations log** (`ddrive_eoc_log`, `L-###`): situation updates, decisions, resource requests, communications and shift handovers.
   - It is append-only: corrections are new entries.
   - A handover names who takes over and must say at least 20 characters about the situation.
7. **Links stay inside the organisation.** Every table has RLS by tenant, and every change goes to the audit trail.

## Consequences

- An EOC can show who decided what, when and on what basis. This is evidence for Gawad KALASAG 3.x and for after-action reviews.
- Triggers are stored as codes with their Memo 131 references. A tenant with different standard codes (Memo 131 9.2.2) would need a configuration table, which is not built yet.
- **Not covered yet:**
  - resource tracking against requests
  - response cluster activation
  - the DILG Region VIII reporting forms (Forms A–L)
  - EOC relocation to an alternate site

  These are the next steps for the EOC gap.
- **Tests:** SQL suite `110_phase3_eoc_operations.sql` (34 checks, each refusal checked for its reason) and browser test `e2e/eoc.mjs`.
