#!/usr/bin/env bash
# Runs the database migrations and access-rule tests on a throwaway local Postgres (15 or later).
# Usage: bash scripts/test_db.sh            (fresh database)
#        bash scripts/test_db.sh --legacy   (start from a copy of the pre-Phase-1 tables with sample data)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-55439}"
DATA="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then chown postgres "$DATA"; RUN_AS=(su postgres -c); fi

run() { if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi; }

run "$PGBIN/initdb -D $DATA/db -A trust -U postgres >/dev/null"
run "$PGBIN/pg_ctl -D $DATA/db -o '-p $PORT -k /tmp' -l $DATA/log start >/dev/null"
trap 'run "$PGBIN/pg_ctl -D $DATA/db stop -m fast >/dev/null"; rm -rf "$DATA"' EXIT
sleep 1

export PGOPTIONS='-c client_min_messages=warning'
PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
if [ "${1:-}" = "--legacy" ]; then
  "${PSQL[@]}" -f "$ROOT/supabase/tests/05_legacy_fixture.sql"
fi
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate: $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "migrate again (must be safe to re-run)"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done

if [ "${1:-}" = "--legacy" ]; then
  "${PSQL[@]}" -f "$ROOT/supabase/tests/06_legacy_checks.sql"
else
  "${PSQL[@]}" -f "$ROOT/supabase/tests/10_phase1_access.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/tests/20_phase2_alerts.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/tests/30_phase2_anticipatory.sql"
fi
