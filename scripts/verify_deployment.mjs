#!/usr/bin/env node
// Checks a deployed DDRiVE-M Supabase project from the outside (DEPLOY.md § 8 and § 15).
// Read-only: it never writes. Run it after applying migrations, after deploying functions, and after a cut-over.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
//   SUPABASE_SECRET_KEY=sb_secret_... node scripts/verify_deployment.mjs
//
// Without SUPABASE_SECRET_KEY only the public checks run (reachability, anonymous access, functions deployed).
// The secret key stays in your shell: never put it in a VITE_ variable, a file in the repository, or a chat.
// Exit code 1 when a check fails; warnings do not fail the run.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const SECRET = process.env.SUPABASE_SECRET_KEY ?? '';
const FUNCTIONS = (process.env.VERIFY_FUNCTIONS ?? 'ingest-pagasa,ingest-official,ddriver-ai').split(',').filter(Boolean);
// Minutes since the last good read before a source counts as stale (Detection uses the same limits).
const SLACK = Number(process.env.VERIFY_FRESH_FACTOR ?? 1);
const FRESH_MIN = Object.fromEntries(Object.entries({ PAGASA: 30, PTWC: 30, USGS: 60, GDACS: 60, HIMAWARI: 60 }).map(([k, v]) => [k, v * SLACK]));

if (!/^https?:\/\//.test(URL_) || !PUB) {
  console.error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (and SUPABASE_SECRET_KEY for the full check).');
  process.exit(2);
}
if (PUB.startsWith('sb_secret_')) { console.error('SUPABASE_PUBLISHABLE_KEY holds a secret key. Use the publishable key.'); process.exit(2); }

const results = [];
const report = (level, label, detail = '') => { results.push({ level, label }); console.log(`${level.padEnd(4)}  ${label}${detail ? `  (${detail})` : ''}`); };
const pass = (l, d) => report('PASS', l, d), fail = (l, d) => report('FAIL', l, d), warn = (l, d) => report('WARN', l, d);

const call = async (path, { key = PUB, method = 'GET', headers = {}, body } = {}) => {
  try {
    const r = await fetch(`${URL_}${path}`, { method, headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }), ...headers }, body, signal: AbortSignal.timeout(20_000) });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: r.status, json, text, headers: r.headers };
  } catch (e) { return { status: 0, text: String(e.message ?? e) }; }
};

/** Tables and views the migrations create, from the migration files themselves. */
function expectedRelations() {
  const dir = join(ROOT, 'supabase', 'migrations');
  const names = new Set();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, f), 'utf8');
    for (const m of sql.matchAll(/create\s+(?:table\s+if\s+not\s+exists|or\s+replace\s+view|view)\s+public\.(ddrive_[a-z0-9_]+)/gi)) names.add(m[1]);
  }
  return [...names].sort();
}

// ── Public checks ─────────────────────────────────────────────────────────────
const root = await call('/rest/v1/');
if (root.status === 0) fail('The project answers', root.text);
else if (root.status >= 500) fail('The project answers', `HTTP ${root.status}`);
else pass('The project answers', `REST HTTP ${root.status}`);

const anon = await call('/rest/v1/ddrive_hazards?select=id&limit=1');
if (anon.status === 404 && /does not exist|Could not find/i.test(anon.text)) warn('Anonymous visitors cannot read records', 'the table does not exist yet: apply the migrations');
else if ((anon.status === 200 && Array.isArray(anon.json) && anon.json.length === 0) || [401, 403].includes(anon.status)) pass('Anonymous visitors cannot read records', `HTTP ${anon.status}`);
else fail('Anonymous visitors cannot read records', `HTTP ${anon.status}: ${anon.text.slice(0, 120)}`);

const settings = await call('/auth/v1/settings');
if (settings.status === 200 && settings.json?.external) {
  const on = Object.entries(settings.json.external).filter(([, v]) => v === true).map(([k]) => k);
  (on.includes('email') ? pass : fail)('Email sign-in is enabled', on.join(', '));
  (on.includes('google') ? pass : warn)('Google sign-in is enabled', on.includes('google') ? '' : 'optional (DEPLOY.md § 4b)');
  (settings.json.disable_signup === false ? pass : warn)('New accounts can sign up', settings.json.disable_signup ? 'sign-up is disabled' : '');
} else warn('Auth settings could be read', `HTTP ${settings.status}`);

for (const fn of FUNCTIONS) {
  const r = await call(`/functions/v1/${fn}`, { key: '', method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (r.status === 404 && !/not allowed|unauthori/i.test(r.text)) (fn === 'ddriver-ai' ? warn : fail)(`Function ${fn} is deployed`, 'HTTP 404: not deployed');
  else if ([401, 403].includes(r.status)) pass(`Function ${fn} is deployed and refuses callers without a key`, `HTTP ${r.status}`);
  else if (r.status === 0) fail(`Function ${fn} is deployed`, r.text);
  else warn(`Function ${fn} is deployed`, `HTTP ${r.status}; expected 401 without a key`);
}

// ── Checks with the secret key ────────────────────────────────────────────────
if (!SECRET) {
  warn('Database checks skipped', 'set SUPABASE_SECRET_KEY to check migrations, reference data and feed freshness');
} else {
  if (!SECRET.startsWith('sb_secret_') && !SECRET.startsWith('eyJ')) fail('SUPABASE_SECRET_KEY looks like a server key', 'expected sb_secret_… or a service_role JWT');
  const missing = [];
  for (const rel of expectedRelations()) {
    const r = await call(`/rest/v1/${rel}?select=*&limit=0`, { key: SECRET });
    if (r.status !== 200 && r.status !== 206) missing.push(`${rel} (HTTP ${r.status})`);
  }
  (missing.length ? fail : pass)('Every table and view of the migrations exists', missing.length ? `missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ` and ${missing.length - 8} more` : ''}` : `${expectedRelations().length} relations`);

  const count = async (rel) => {
    const r = await call(`/rest/v1/${rel}?select=*&limit=0`, { key: SECRET, headers: { Prefer: 'count=exact' } });
    const n = Number((r.headers?.get('content-range') ?? '').split('/')[1]);
    return Number.isFinite(n) ? n : null;
  };
  for (const [rel, n, what] of [['ddrive_hazard_catalogue', 84, 'DDRiVE hazard catalogue'], ['ddrive_gk_items', 32, 'Gawad KALASAG CY 2026 indicators'], ['ddrive_ndrrmp_outputs', 50, 'NDRRMP 2020-2030 outputs']]) {
    const got = await count(rel);
    (got === n ? pass : fail)(`Reference data: ${what}`, `${got ?? 'unreadable'} of ${n} rows`);
  }

  const runs = await call('/rest/v1/ddrive_ingest_runs?select=source,finished_at,ok,error&order=started_at.desc&limit=500', { key: SECRET });
  if (runs.status !== 200 || !Array.isArray(runs.json)) fail('Feed runs can be read', `HTTP ${runs.status}`);
  else {
    for (const [src, minutes] of Object.entries(FRESH_MIN)) {
      const last = runs.json.find((r) => r.source === src && r.ok);
      const lastAny = runs.json.find((r) => r.source === src);
      if (!last) { (lastAny ? fail : warn)(`${src} read recently`, lastAny ? `only failed runs: ${String(lastAny.error ?? '').slice(0, 100)}` : 'never read: deploy the functions and the schedule (§ 5)'); continue; }
      const age = (Date.now() - Date.parse(last.finished_at)) / 60_000;
      (age <= minutes ? pass : fail)(`${src} read recently`, `last good read ${Math.round(age)} min ago (limit ${minutes})`);
    }
  }
  const tenants = await count('ddrive_tenants');
  (tenants ? pass : warn)('At least one organisation exists', tenants === null ? 'unreadable' : `${tenants}`);
}

const failed = results.filter((r) => r.level === 'FAIL').length;
const warned = results.filter((r) => r.level === 'WARN').length;
console.log(`\n${results.length - failed - warned} passed, ${warned} warnings, ${failed} failed`);
process.exit(failed ? 1 : 0);
