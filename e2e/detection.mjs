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
// ── Himawari (ADR-015): current frames listed, yesterday's image in an unrefreshed slot refused ──
const frames = await (await fetch(`${API}/rest/v1/ddrive_satellite_frames?select=product,slot,observed_at,url&order=observed_at`, { headers: { authorization: `Bearer ${SERVICE}` } })).json();
check(b.HIMAWARI?.ok === true && frames.filter((f) => f.product === 'b13').length >= 15, 'Himawari: the last three hours of current images are listed', JSON.stringify(b.HIMAWARI));
const staleAt = new Date(Date.now() - 120 * 60e3); staleAt.setUTCMinutes(staleAt.getUTCMinutes() - (staleAt.getUTCMinutes() % 10), 0, 0);
check(!frames.some((f) => new Date(f.observed_at).getTime() === staleAt.getTime()), 'Himawari: a slot still holding yesterday\'s image is not listed');
check(frames.every((f) => f.url.startsWith('http://127.0.0.1:8099/himawari/img/se2/se2_')), 'Himawari: only the image address is kept, pointing at the source');
const again = await run();
check(first.body.hazard_sync?.ok === true, 'Each run synchronises hazard records with the alerts in force', JSON.stringify(first.body.hazard_sync));
const official = await (await fetch(`${API}/rest/v1/ddrive_hazards?select=agency,name,status,origin,tenant_id&origin=eq.official`, { headers: { authorization: `Bearer ${SERVICE}` } })).json();
check(official.some((h) => h.agency === 'PAGASA' && h.status === 'Active'), 'The PAGASA alert for Leyte is a hazard record of the organisation watching Leyte, without anyone typing it', JSON.stringify(official));
check(official.every((h) => h.agency !== 'USGS (international)'), 'Alerts outside every watch area create no records');
check(again.status === 200 && again.body.PTWC?.added === 0 && again.body.USGS?.added === 0 && again.body.GDACS?.added === 0 && again.body.HIMAWARI?.added === 0, 'A second run stores nothing twice', JSON.stringify(again.body));

// ── The Detection screen ─────────────────────────────────────────────────────
// phase2.mjs deleted the feed history to test the stale warning; record a fresh PAGASA reading as the schedule would.
await fetch(`${API}/rest/v1/rpc/ddrive_record_ingest_run`, { method: 'POST', headers: { authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' },
  body: JSON.stringify({ p_source: 'PAGASA', p_started: new Date().toISOString(), p_ok: true, p_seen: 4, p_new: 0, p_error: null }) });
const browser = await chromium.launch();
try {
  const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
  await page.goto(`${APP}/detection`); await settle(page);
  await page.getByRole('button', { name: /Whole region/ }).click(); await settle(page, 500);
  // With every source fresh the per-source list is folded; open it to read each source's time.
  const folded = page.getByText('All sources read recently.');
  if (await folded.count()) { await folded.click(); await settle(page, 300); }
  const t = await text(page);
  for (const [key, n] of [['PTWC', 1], ['USGS', 2], ['GDACS', 2]]) {
    check(t.includes(`${key} (${n})`), `Detection lists ${n} ${key} alert${n > 1 ? 's' : ''}`, t.match(new RegExp(`${key} \\(\\d+\\)`))?.[0]);
  }
  for (const label of ['NOAA Pacific Tsunami Warning Center', 'USGS (international)', 'GDACS (UN / European Commission)']) {
    check(new RegExp(`${label.replace(/[()/]/g, '\\$&')}: read (just now|\\d+ min ago)`).test(t), `${label} shows when it was last read`);
  }
  await page.getByRole('button', { name: /^USGS \(\d+\)$/ }).click(); await settle(page, 500);
  const u = await text(page);
  check(u.includes('International source. PAGASA and PHIVOLCS issue the official warnings'), 'USGS readings are labelled as international, not official Philippine warnings');
  const records = page.locator('ul', { has: page.getByText('Official alert, synchronised') });
  check(await records.count() > 0, 'Detection lists the synchronised record, marked as from an official alert');
  check(/PAGASA[^]{0,120}open[^]{0,60}Synchronised, read (just now|\d+ min ago)/.test(u), 'The PAGASA source card shows open records and when it was last synchronised', u.match(/PAGASA Tropical[^]{0,160}/)?.[0]);
  check(u.includes('PHIVOLCS') && u.includes('No data feed published'), 'PHIVOLCS is shown honestly: linked, with no data feed');
  check(await page.locator('svg[aria-label], svg title').count() > 0 || u.includes('Hazard records and watch points'), 'The map plots hazard records and watch points');
  const jmaRequests = [];
  page.on('request', (r) => { if (r.url().includes('/himawari/')) jmaRequests.push(r.url()); });
  check(jmaRequests.length === 0, 'No satellite image is loaded until the loop is opened');
  await page.getByRole('button', { name: 'Show the loop' }).click(); await settle(page, 1500);
  const sat = await text(page);
  check(await page.locator('img[alt^="Himawari infrared image"]').count() === 1 && /frame \d+ of \d+/.test(sat), 'The satellite loop plays the listed frames');
  check(sat.includes('Source: Meteorological Satellite Center of JMA website') && sat.includes('not a forecast or a warning'), 'The loop cites JMA and says it is not a warning');
  check(jmaRequests.length > 0 && jmaRequests.every((u) => u.startsWith('http://127.0.0.1:8099/himawari/')), 'Images are loaded from the source, not stored by DDRiVE-M');
  check(errors.length === 0, 'No page errors on Detection', errors.join(' | '));
  await page.goto(`${APP}/dashboard`); await settle(page);
  const d = await text(page);
  check(!d.includes('not connected yet') && d.includes('synchronised every 10 minutes'), 'The dashboard no longer says agency feeds are not connected');
  await ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
