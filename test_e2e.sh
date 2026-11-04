#!/usr/bin/env bash
# Browser tests against the real API: local Postgres + migrations + PostgREST 12 + the production build.
# Needs: Postgres 15+, PostgREST 12 (set POSTGREST_BIN or put "postgrest" on PATH), Node 20+, Playwright with Chromium.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
POSTGREST_BIN="${POSTGREST_BIN:-postgrest}"
DENO_BIN="${DENO_BIN:-deno}"
PGPORT=55440
REST_PORT=3000
JWT_SECRET='e2e-secret-at-least-32-characters-long!!'
WORK="$(mktemp -d)"
PIDS=()
RUN_AS=()
if [ "$(id -u)" = "0" ]; then chown postgres "$WORK"; RUN_AS=(su postgres -c); fi
run() { if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi; }

cleanup() {
  for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done
  run "$PGBIN/pg_ctl -D $WORK/db stop -m fast >/dev/null" || true
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "1/5 database"
run "$PGBIN/initdb -D $WORK/db -A trust -U postgres >/dev/null"
run "$PGBIN/pg_ctl -D $WORK/db -o '-p $PGPORT -k /tmp' -l $WORK/pg.log start >/dev/null"
sleep 1
export PGOPTIONS='-c client_min_messages=warning'
PSQL=(psql -h /tmp -p "$PGPORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f" >/dev/null; done
"${PSQL[@]}" -f "$ROOT/e2e/seed.sql" >/dev/null

echo "2/5 PostgREST"
cat > "$WORK/postgrest.conf" <<EOF
db-uri = "postgres://authenticator@/postgres?host=/tmp&port=$PGPORT"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = $REST_PORT
EOF
"$POSTGREST_BIN" "$WORK/postgrest.conf" > "$WORK/postgrest.log" 2>&1 & PIDS+=($!)
JWT_SECRET="$JWT_SECRET" POSTGREST_URL="http://127.0.0.1:$REST_PORT" node "$ROOT/e2e/fake-supabase.mjs" > "$WORK/fake.log" 2>&1 & PIDS+=($!)
for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$REST_PORT/" && break; sleep 0.5; done

echo "3/5 build"
(cd "$ROOT" && VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_test_key npx vite build --logLevel error)

echo "4/5 serve"
(cd "$ROOT" && setsid npx vite preview --host 127.0.0.1 --port 4173 --strictPort > "$WORK/preview.log" 2>&1) & PIDS+=($!)
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.5; done

echo "5/5 browser tests"
cd "$ROOT/e2e" && JWT_SECRET="$JWT_SECRET" node phase1.mjs || { echo "--- PostgREST log"; tail -20 "$WORK/postgrest.log"; exit 1; }

echo "Phase 2: official alerts (fake PAGASA server + the real ingest Edge Function)"
node "$ROOT/e2e/fake-pagasa.mjs" > "$WORK/pagasa.log" 2>&1 & PIDS+=($!)
SERVICE_JWT="$(cd "$ROOT/e2e" && JWT_SECRET="$JWT_SECRET" node -e "import('./fake-supabase.mjs').then(m => console.log(m.sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 })))")"
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY="$SERVICE_JWT" SUPABASE_SECRET_KEYS='{"default":"sb_secret_e2e_test_key"}' PAGASA_FEED_URL=http://127.0.0.1:8099/feeds/ \
  "$DENO_BIN" run --quiet --allow-net --allow-env --allow-read --config "$ROOT/supabase/functions/ingest-pagasa/deno.json" \
  "$ROOT/supabase/functions/ingest-pagasa/index.ts" > "$WORK/ingest.log" 2>&1 & PIDS+=($!)
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:8000/ && break; sleep 0.5; done
cd "$ROOT/e2e" && JWT_SECRET="$JWT_SECRET" SERVICE_JWT="$SERVICE_JWT" node phase2.mjs || { echo "--- ingest log"; tail -20 "$WORK/ingest.log"; echo "--- PostgREST log"; tail -20 "$WORK/postgrest.log"; exit 1; }
