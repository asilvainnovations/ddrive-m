# DDRiVE-M Baseline Governance and Change Control

**Status:** Proposed governing control; effective only after the approval record below is complete.  
**Baseline:** `docs/governance/TECHNICAL-FUNCTIONAL-BASELINE.md`  
**Companion register:** `docs/governance/UPDATED-READINESS-AND-CONTROLS-REGISTER.md`

## 1. Adoption rule

The Technical and Functional Baseline is the single governing requirements reference for the next development cycle once the required approval roles have signed the approval record. It supersedes conflicting informal feature descriptions and narrative audit statements. It does not override applicable law, formal government policy, signed contracts or approved LGU procedures.

Until approval is complete, use the baseline as the proposed review reference and mark requirements `PROPOSED`, not `APPROVED`.

## 2. Required approval record

| Approval role | Minimum review responsibility | Name / signature | Date | Status |
|---|---|---|---|---|
| Product / Platform Owner | Scope, priorities, funding and acceptance authority | Pending | Pending | Pending |
| DRRM / CCA Functional Authority | Legal and operational fit, DRRM workflows and acceptance scenarios | Pending | Pending | Pending |
| Technical / Systems Architect | Architecture, data model, integration, non-functional requirements | Pending | Pending | Pending |
| Data Protection Officer | Privacy, processing roles, DPIA, data sharing, retention and breach controls | Alvin M. Silva — appointment evidence to be attached | Pending | Pending |
| Security / DevOps Lead | Security controls, deployment, backup, monitoring and incident response | Pending | Pending | Pending |
| Representative LGU / Operational User | Workflow usability, SOP alignment and operational acceptance | Pending | Pending | Pending |

A single person may hold more than one role only where the organisation formally authorises that arrangement and conflicts are recorded. Approval is not inferred from an informal chat acknowledgement.

## 3. Requirement IDs

Every baseline requirement must have a stable ID, for example `GOV-001`, `DATA-004`, `EOC-012`, `RISK-006`, `AA-009`, `REC-003`, `UX-005`, `SEC-011` or `OPS-008`.

Every GitHub issue, pull request, commit where practical, test case, test report, defect and release note must cite one or more requirement IDs. A change without an applicable requirement ID must explain why it is maintenance, technical debt or exploratory work and identify the baseline section it affects.

## 4. Issue and pull request acceptance

A module is not accepted because a screen, route, table, API or migration exists. Acceptance requires:

1. linked requirement IDs and an identified accountable business owner;
2. demonstrated end-to-end functional behaviour using representative data;
3. role- and tenant-level security tests, including negative tests;
4. data quality, provenance, timestamp, uncertainty and auditability checks where applicable;
5. operational acceptance by the designated DRRM authority or user;
6. accessibility and mobile/low-bandwidth checks appropriate to the workflow;
7. documented failure, degraded-mode and recovery behaviour;
8. evidence attached to the issue or release record; and
9. closure of all blocking and critical defects.

## 5. Severity

- **Critical (S0):** credible risk to life safety, unlawful authority/action, cross-tenant disclosure, unauthorised privileged action, material corruption of official records, or platform compromise. Block release; incident escalation as appropriate.
- **High (S1):** core DRRM workflow unavailable or materially misleading; sensitive data exposure; broken statutory or operational control; no safe workaround. Block affected module/release.
- **Medium (S2):** important function impaired with a documented safe workaround; limited scope or impact. Release only with accountable risk acceptance and due date.
- **Low (S3):** cosmetic, minor usability or non-critical documentation issue. Schedule and track.

Severity is based on impact and likelihood, not development effort.

## 6. Evidence states

Use exactly one state for each control: `VERIFIED`, `PARTIALLY VERIFIED`, `UNVERIFIED`, `NOT APPLICABLE`, or `FAILED`.

- `VERIFIED` requires reproducible test evidence in the relevant environment and a named reviewer.
- `PARTIALLY VERIFIED` means some, but not all, conditions or environments have evidence.
- `UNVERIFIED` means the control is claimed, designed or coded but not adequately tested.
- `FAILED` means evidence shows the requirement is not met.
- `NOT APPLICABLE` requires a written rationale and approver.

Source-code inspection alone cannot verify production configuration, provider settings, real-world operating procedures or user adoption.

## 7. Test report minimum fields

Each test report must include: requirement ID; test case ID; build/commit; environment; date/time and timezone; tester; preconditions; test data classification; steps; expected result; actual result; pass/fail; evidence link; defect ID; severity; retest result; approver.

## 8. Release gate

No production release of a module until all S0 and S1 defects are closed, all mandatory requirements are verified, privacy/security and operational acceptance are recorded, and residual S2 risks have written approval from the accountable owner. Safety-critical workflows require an approved SOP and a tested human fallback.
