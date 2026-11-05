# ADR-003: Anticipatory action workflow under RA 12287

- Status: Accepted
- Date: 2026-11-05
- Phase: 2

## Context

RA 12287, the Declaration of State of Imminent Disaster Act (signed 12 September 2025), lets the President, or a local chief executive, declare a State of Imminent Disaster before a forecast hazard strikes, so councils can act and spend in advance. The steps come from the Act itself (text at lawphil.net):

| Step | Section | What the Act requires |
| --- | --- | --- |
| Forecast trigger | 3(f), 4 | A forecast hazard with projected catastrophic impacts; lead time is the period from forecast to expected occurrence |
| Pre-disaster risk assessment | 3(g), 6 | Two conditions must both be present: (a) the hazard is severe or its equivalent; (b) enough lead time, three days extendable to five |
| Recommendation | 5 | NDRRMC recommends to the President; locally, the Regional DRRM Council advises the local chief executive |
| Declaration | 5 | By executive order |
| Measures | 9 | Advisories, pre-positioning teams and goods, pre-emptive or forced evacuation, volunteers, social amelioration, agriculture and food contingency, public health support |
| Funds | 10 | LDRRMF programmes, unexpended LDRRMF in the Special Trust Fund, agency budgets, NDRRMF, other lawful sources; disbursed immediately, usable until lifting |
| Lifting | 7 | On a new assessment that projected impacts are not met, or automatically when the hazard occurs |
| Reporting | 8, 11 | Status, fund use and costs minimised to OCD; unused LGU funds to the Special Trust Fund, national funds to the Treasury |
| Prohibited acts | 12, 13 | False hazard information and manipulated assessments: ₱50,000 to ₱500,000, imprisonment, or both |

The implementing rules (finalised by OCD in October 2025) define the graduation of disbursements by forecast level. DDRiVE-M does not encode that graduation yet.

## Decision

1. **A case per forecast**, with its assessments (append-only) and its measures, in three tenant tables with the usual stamping, reference numbers (`A-001`), audit log and access rules.
2. **The database enforces the order of steps.** Status changes only through five step functions (recommend, record declaration, close without declaration, record lifting, submit report). Each checks the Act's preconditions: a recommendation needs a latest assessment with both section 6 conditions confirmed and lead time left; lifting for "impacts not met" needs a newer assessment recommending it and the lifting order; disbursements are allowed only while declared; a closed case is frozen.
3. **People decide; the system records.** Both section 6 conditions are confirmed by the assessor with a written basis; the server only computes the lead time. DDRiVE-M never "declares": it records the executive order issued by the competent official.
4. **The step functions are `security definer`**, and the case guard allows status changes only when `current_user` is not a user role. A session flag was rejected because a caller able to set it could bypass the guard.
5. **Roles**: everyone in the organisation can follow a case; analysts open cases and record assessments and measures; DRRM officers and administrators take the steps and record disbursements.
6. **The report** shows fund use by source (allotted, disbursed, unused) and the section 11 rule for unused funds; an estimate of costs minimised must state how it was worked out.

## Consequences

- An official alert can start a case directly ("Start anticipatory action" on each alert).
- The graduation of disbursements from the IRR, and the national-level flow (NDRRMC to the President), can be added on the same tables.
- A tabletop exercise can now run the full cycle on live PAGASA alerts, as the Phase 2 gate requires; DDRiVER AI citations are the other half of that gate.
