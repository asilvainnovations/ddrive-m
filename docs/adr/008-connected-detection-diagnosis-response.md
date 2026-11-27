# ADR-008: Connected Detection, Diagnosis and Response

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Builds on: ADR-005 (official detection sources), ADR-006 (DDRiVE hazard assessment), ADR-003 and ADR-007 (anticipatory action)

## Context

The seven-phase design says each phase produces information and decisions that become inputs to the next. Detection observes hazards, warnings and community signals; Diagnosis interprets risk through hazard, exposure, vulnerability and capacity; Response makes and coordinates risk-informed operational decisions and actions.

The 0.7.0 code fell short of that between the first three phases:

- Detection read all four official sources, but the browser tests did not exercise `ingest-official` end to end, and a hazard record's "Escalate" button only showed "not available yet".
- Diagnosis scored hazard events and kept a risk register, but nothing it produced reached Response.
- Response showed a placeholder "AI Treatment Canvas", a static list of protocols, and a "New Incident" button that only showed a message. Incidents could be advanced but not opened.
- Anticipatory action (RA 12287) was a separate module in the menu, although it is an operational decision on a forecast, which is Response.

## Decision

1. **One record for a proposed action**, `ddrive_response_actions`, with a server reference `T-###`. Each action names what it responds to: a register risk or a scored DDRiVE hazard event (origin `diagnosis`), an official alert or a hazard record (origin `detection`), or nothing (origin `manual`, entered in Response).
2. **Diagnosis and Detection propose; Response decides and coordinates.** The steps, enforced in the database:

   ```
   proposed ──approve──▶ approved ──progress──▶ in_progress ──complete (outcome)──▶ done
      │                     │                      │
      └─decline (reason)    └──────cancel (reason)─┘
   ```

   | Step | Who (minimum role) | Rule |
   | --- | --- | --- |
   | Propose from Diagnosis | analyst | Must name a risk or an assessed hazard event of the same organisation; the hazard event must be scored |
   | Propose from Detection | responder | Must name an alert or a hazard record; a hazard record must be the organisation's |
   | Propose in Response | analyst (screen); responder (database) | No link needed |
   | Approve | DRRM officer | Note optional |
   | Decline | DRRM officer | Reason of 10 characters or more |
   | Report progress | responder | 0 to 99%, never down, with what was done |
   | Complete | responder | Outcome of 10 characters or more; sets 100% and the completion time |
   | Cancel | DRRM officer | Open actions only; reason required |
   | Reassign office or due date | DRRM officer | After the decision, only these two fields can change |

   Status, decision, progress and outcome change only through the step functions (`SECURITY DEFINER`); a plain update cannot set them. A new row always starts as `proposed`. Closed actions are frozen. Every step is in the audit log.
3. **Vocabulary from the standards, not invented.** Treatment options are ISO 31000:2018 6.5.2 (avoid, reduce likelihood, reduce consequences, share, retain). Thematic areas are the four of RA 10121 and the NDRRMP 2020–2030. Priority is suggested from the register level or the DDRiVE rating (VH → critical, H → high, M → medium, L/VL → low) and the proposer can change it.
4. **The system does not invent actions.** Every action is written by a person. The suggested title is a starting point the proposer replaces ("Treat: …", "Prepare for …").
5. **Anticipatory action is a tab of Response** (`/response?tab=anticipatory`). The old `/anticipatory-action` address forwards there and keeps `?alert=`, so alert hand-offs, bookmarks and the PWA shortcut still work. It is removed from the menu as a separate module. Its rules (ADR-003, ADR-007) are unchanged.
6. **Response screens:** Risk-informed actions (proposed, open, closed; filter by origin; overdue due dates marked), Incidents (now opened from the screen), Anticipatory action. The placeholder canvas, the static protocol list and the toast-only button are removed.
7. **Detection, tested end to end:** the browser suite now runs the real `ingest-official` function against local copies of the PTWC, USGS and GDACS fixtures. For that, the function takes `USGS_QUERY_URL` and `GDACS_QUERY_URL` (tests and staging only) and accepts plain `http` for loopback addresses only; every other source must be `https`.

## Consequences

- An approved action's content is fixed. To change what is done, cancel it with a reason and propose a new one. This keeps the decision record honest.
- Actions are not linked to incidents or to the Integration budget lines yet. Integration (Phase 4) can read approved actions with their thematic area and estimated cost when budget work starts; Monitoring (Phase 7) can read progress and outcomes.
- Alerts are shared by all organisations; an action that names an alert belongs to the proposing organisation only.
- Each table in Diagnosis and Detection loads all of the organisation's actions in one query and filters in the browser. This is fine for hundreds of actions; a server filter is the fix if an organisation has many thousands.

## Verification

- `supabase/tests/80_phase3_response_actions.sql`: 48 checks, each refusal checked for its reason.
- `src/lib/__tests__/responseActions.test.ts`: priority and source wording.
- `e2e/detection.mjs` (14) and `e2e/response.mjs` (24): Detection sources through the function and the screen; a risk and an alert each leading to an action that is approved, progressed and completed, by role; anticipatory action reached inside Response and through the old address.
