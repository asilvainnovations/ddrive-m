// Detection, end to end: the real ingest-official Edge Function reads PTWC, USGS and GDACS (served from the
// fixtures in supabase/functions/_shared/testdata by e2e/fake-pagasa.mjs), stores them through PostgREST, and the
// Detection screen shows each source with its freshness and attribution. Run by scripts/test_e2e.sh after phase2b.
import { createRequire } from 'node:module';
import { sign, SECRET_KEY } from './fake-supabase.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const FN = process.env.INGEST_URL || 'http://127.0.0.1:8000';
const SERVICE = process.env.SERVICE_JWT || sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 });

const results = [];
const check = (ok, label, detail = '') => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${String(detail).slice(0, 300)})` : ''}`);
};
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const settle = (page, ms = 2500) => page.waitForTimeout(ms);

async function userId(email) {
  const r = await fetch(`${API}/rest/v1/ddrive_users?select=id&email=eq.${encodeURIComponent(email)}`, { headers: { authorization: `Bearer ${SERVICE}` } });
  return (await r.json())[0]?.id;
}
async function pageAs(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, serviceWorkers: 'block' });
  const id = await userId(email);
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const session = {
    access_token: sign({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp }), refresh_token: 'unused',
    token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} },
  };
  await ctx.addInitScript((s) => { try { localStorage.setItem('sb-127-auth-token', JSON.stringify(s)); } catch { /* opaque frame */ } }, session);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, ctx, errors };
}
const run = async () => {
  const r = await fetch(FN, { method: 'POST', headers: { apikey: SECRET_KEY } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const stored = async (source) => (await (await fetch(`${API}/rest/v1/ddrive_official_alerts?select=identifier,event,msg_type,area_names&source=eq.${source}`,
  { headers: { authorization: `Bearer ${SERVICE}` } })).json());

// ── The function ──────────────────────────────────────────────────────────────
const refused = await fetch(FN, { method: 'POST' });
check(refused.status === 401, 'ingest-official refuses callers without a server key', refused.status);
const first = await run();
const b = first.body;
check(first.status === 200 && b.PTWC?.ok && b.USGS?.ok && b.GDACS?.ok, 'One run reads PTWC, USGS and GDACS, each on its own', JSON.stringify(b));
check(b.PTWC?.added === 1, 'PTWC: the tsunami information statement is stored', JSON.stringify(b.PTWC));
const usgs = await stored('USGS');
check(usgs.length === 3 && usgs.filter((x) => x.msg_type === 'Alert').length === 2 && usgs.filter((x) => x.msg_type === 'Cancel').length === 1,
  'USGS: the two earthquakes in the region are stored, the deleted event as a cancellation; the one near Fiji is not', JSON.stringify(usgs.map((x) => `${x.event}/${x.msg_type}`)));
const gdacs = await stored('GDACS');
check(gdacs.length === 2, 'GDACS: the Philippine cyclone and earthquake are stored; the European drought and the unknown type are not', JSON.stringify(gdacs.map((x) => x.event)));
const again = await run();
check(again.status === 200 && again.body.PTWC?.added === 0 && again.body.USGS?.added === 0 && again.body.GDACS?.added === 0, 'A second run stores nothing twice', JSON.stringify(again.body));

// ── The Detection screen ─────────────────────────────────────────────────────
const browser = await chromium.launch();
try {
  const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
  await page.goto(`${APP}/detection`); await settle(page);
  await page.getByRole('button', { name: /Whole region/ }).click(); await settle(page, 500);
  const t = await text(page);
  for (const [key, n] of [['PTWC', 1], ['USGS', 2], ['GDACS', 2]]) {
    check(t.includes(`${key} (${n})`), `Detection lists ${n} ${key} alert${n > 1 ? 's' : ''}`, t.match(new RegExp(`${key} \\(\\d+\\)`))?.[0]);
  }
  for (const label of ['NOAA Pacific Tsunami Warning Center', 'USGS (international)', 'GDACS (UN / European Commission)']) {
    check(new RegExp(`${label.replace(/[()/]/g, '\\$&')}: read (just now|\\d+ min ago)`).test(t), `${label} shows when it was last read`);
  }
  await page.getByRole('button', { name: /^USGS \(/ }).click(); await settle(page, 500);
  const u = await text(page);
  check(u.includes('International source. PAGASA and PHIVOLCS issue the official warnings'), 'USGS readings are labelled as international, not official Philippine warnings');
  check(errors.length === 0, 'No page errors on Detection', errors.join(' | '));
  await ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
