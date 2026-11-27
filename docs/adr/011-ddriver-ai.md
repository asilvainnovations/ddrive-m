# ADR-011: DDRiVER AI

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Migration: `20261127050000_ai_ddriver.sql`; function `ddriver-ai`

## Decision

1. **One server function**, `ddriver-ai`, calls the Claude Messages API (`DDRIVER_MODEL`, default `claude-sonnet-5-5`). The API key is a Supabase secret and never reaches the browser.
2. **Off by default**: a tenant administrator turns it on and sets daily limits (`ddrive_ai_configure`). Each request is checked and logged first (`ddrive_ai_begin`), and closed with its outcome (`ddrive_ai_finish`). The log is kept for 90 days (`ddrive_ai_purge`, daily).
3. **Grounded tasks**: ask (chat), explain an alert, explain a rating, suggest treatments (drafts of actions), situation brief, funding gaps. For each task the function reads the records the user may see, **with the user's own token** (RLS applies), numbers them [S1], [S2] and so on, and sends them with the verified legal references.
4. **Checked output**: citations to sources that were not sent are removed and counted; suggested actions are parsed, never saved automatically; drafts accepted by a user are marked `ai_assisted`.
5. **Feedback** per answer (`ddrive_ai_feedback`). The privacy notice names Anthropic and what it receives.

## Consequences

- AI can explain and draft. Approving, funding and closing stay human decisions in the database rules of ADR-008/009.
- Tests: `_shared/ddriver_test.ts`, `supabase/tests/97_ai_ddriver.sql`, browser test `integration_ai.mjs` against a stand-in API.
