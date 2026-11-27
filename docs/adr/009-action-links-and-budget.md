# ADR-009: Actions linked to incidents and to budget lines

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Builds on: ADR-008 (connected Detection, Diagnosis and Response)
- Migration: `20261127030000_phase4_action_links_budget.sql`

## Context

ADR-008 made Response the place where actions are decided, but an approved action was not tied to the incident it serves or to the money that pays for it. RA 10121 s. 11(b)(2) asks the council to integrate DRRM into plans, programs and budgets, and s. 21 sets the LDRRMF at no less than 5% of estimated revenue, with 30% as the Quick Response Fund (QRF) and 70% for prevention, mitigation, preparedness, response, rehabilitation and recovery.

## Decision

1. **Budget lines** (`ddrive_budget_lines`, `B-###`): fund source (LDRRMF 70%, LDRRMF 30% Quick Response Fund, unexpended LDRRMF in the Special Trust Fund, 20% development fund, GAD, an agency's own budget, external grants and partners, other), DRRM thematic area, amount, year, and status `draft → approved → closed`. Approval needs a basis of at least 5 characters (an appropriation ordinance or AIP reference). From 0.9.0 a line can name its NDRRMP 2020-2030 output (ADR-012).
2. **Action links**: `incident_id` and `budget_line_id` on `ddrive_response_actions`. A responder links an action to an incident; an officer funds it from an approved line (`ddrive_response_fund`).
3. **Rules in the database**: QRF lines fund only response or rehabilitation and recovery actions; a line cannot be committed beyond its amount (checked under an advisory lock, so two officers cannot overspend it together); closed lines take no new actions; links follow the guard and audit triggers of ADR-008.
4. **View** `ddrive_budget_line_status`: committed, available and the number of actions per line.

## Consequences

- Integration → Budget shows each line with what is committed and available; Response shows an incident's actions and an action's funding.
- The amounts are what the organisation records. DDRiVE-M does not replace the LGU's accounting system or COA rules.
- Tests: `supabase/tests/90_phase4_action_links_budget.sql` (56 checks).
