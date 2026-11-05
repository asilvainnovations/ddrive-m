# ADR-001: Multi-tenancy, roles and access rules in the database

- Status: Accepted
- Date: 2026-11-03
- Phase: 1 (production-readiness roadmap)

## Context

Before Phase 1, every `ddrive_` table was shared by everyone who could reach the API. The app had no organisations, roles were typed in by users themselves, the browser chose record IDs (`R-00n`, which collides when two people save at once), and the repository held no schema or access rules. DDRiVE-M is meant to serve many organisations (LGUs, agencies, enterprises, NGOs) whose records must not mix, and to hold information whose wrong use could harm people (incident data, community data).

## Decision

1. **Tenants.** Every record belongs to one organisation (`ddrive_tenants`). A user may belong to several, through `ddrive_memberships`, and works in one at a time (`ddrive_users.active_tenant_id`).
2. **Five roles per organisation**, from least to most authority:

   | Role | Can |
   | --- | --- |
   | `viewer` | Read everything in the organisation |
   | `responder` | + report hazards and incidents, update incident progress, post messages, log exercise participation |
   | `analyst` | + manage risks, scorecard entries, plans (drafts), documents; edit hazards |
   | `drrm_officer` | + approve or retire plans, manage scenarios, send critical messages, delete risks, scorecard entries and documents, read the audit log |
   | `tenant_admin` | + manage members and roles, organisation settings (risk criteria) |

3. **All rules live in Postgres.** Row Level Security on every table, one policy per command, written with helper functions (`ddrive_has_role`). The browser's checks are only for a clearer interface.
4. **The server stamps.** Triggers set `tenant_id` (from the user's active organisation), `created_by`, `updated_by`, `created_at`, `updated_at` and `version`, and issue record IDs and per-organisation reference numbers (`R-001`, `P-001`). Clients cannot choose or change these.
5. **Locks.** Approved plans can only be retired by a DRRM officer or above, never edited. Messages and the audit log are append-only. Hazards and incidents are never deleted; their status changes instead.
6. **Audit.** Every insert, update and delete on a domain table writes one row to `ddrive_audit_log` (who, when, what, before and after).
7. **No anonymous access.** The `anon` role has no table privileges. Signing in is required.
8. **Risk levels are organisation settings.** Thresholds default to Critical 20, High 12, Medium 6 (likelihood × impact on 1–5 scales), matching the module and user manual, and each organisation can change them. The score and level are computed by the database.
9. **Locations carry PSGC codes** (Philippine Standard Geographic Code, 10 digits) alongside free-text names.

## Consequences

- Existing data moves into one organisation, "Migrated organisation", during the migration. All existing users become `viewer` members of it. An administrator must then promote at least one person with `select ddrive_admin_set_role('<email>', 'tenant_admin');` in the SQL editor.
- The app requires sign-in. Users with no organisation see a screen to create one (they become its `tenant_admin`) or to ask to be added.
- Realtime events are filtered by organisation in the client and by RLS on the server.
- The unused second risk model (`risks`, `risk_categories`, `useRisks.ts` and its components) is removed; `ddrive_risks` is the only risk table.
- Agency names, roles and thresholds are data, so a reorganisation (for example a Department of Disaster Resilience) is a data change, not a code change.
