// Browser tests for Phase 2 (official alerts): the real Edge Function ingests the PAGASA fixtures through
// PostgREST, and the app shows them. Run with scripts/test_e2e.sh (after phase1.mjs, same database).
import { createRequire } from 'node:module';
import { PUBLISHABLE_KEY, SECRET_KEY, sign } from './fake-supabase.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const FN = process.env.INGEST_URL || 'http://127.0.0.1:8000';
// Must be the exact key the function was started with (scripts/test_e2e.sh passes it in), as in production.
const SERVICE = process.env.SERVICE_JWT || sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 });

const results = [];
const check = (ok, label, detail = '') => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${String(detail).slice(0, 300)})` : ''}`);
};

async function userId(email) {
  const r = await fetch(`${API}/rest/v1/ddrive_users?select=id&email=eq.${encodeURIComponent(email)}`, { headers: { authorization: `Bearer ${SERVICE}` } });
  return (await r.json())[0]?.id;
}
async function pageAs(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
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
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const settle = (page, ms = 2500) => page.waitForTimeout(ms);
// Calls the ingest function the way pg_cron does (secret key in the apikey header), or with given headers.
const ingest = async (headers = { apikey: SECRET_KEY }) => {
  const r = await fetch(FN, { method: 'POST', headers });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

// ── The ingest function ───────────────────────────────────────────────────────
const anon = await ingest({});
check(anon.status === 401, 'The ingest function refuses callers without a server key', anon.status);
const pub = await ingest({ apikey: PUBLISHABLE_KEY, authorization: `Bearer ${PUBLISHABLE_KEY}` });
check(pub.status === 401, 'The ingest function refuses the publishable key', pub.status);
const wrong = await ingest({ apikey: 'sb_secret_not_this_one' });
check(wrong.status === 401, 'The ingest function refuses a wrong secret key', wrong.status);
const first = await ingest();
check(first.status === 200 && first.body.added === 4, 'First run, with a secret key, stores the 4 alerts on the feed', JSON.stringify(first.body));
const second = await ingest({ authorization: `Bearer ${SERVICE}` });
check(second.status === 200 && second.body.added === 0 && second.body.skipped === 4, 'Second run, with the legacy service key, stores nothing new', JSON.stringify(second.body));

const browser = await chromium.launch();
try {
  // ── Administrator sets a watch area ─────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/detection`); await settle(page);
    let t = await text(page);
    check(t.includes('Official alerts') && /PAGASA feed last read (just now|\d+ min ago)/.test(t), 'Detection shows official alerts and when the feed was read');
    check(t.includes('All Philippines (3)'), 'Three alerts in force: the wind signal was replaced by the later cyclone alert', t.match(/All Philippines \(\d+\)/)?.[0]);
    check(!t.includes('Tropical Cyclone Wind Signal No. 1'), 'A replaced alert is not shown as in force');

    await page.goto(`${APP}/settings`); await settle(page, 1500);
    await page.getByRole('button', { name: 'Organisation' }).click(); await settle(page, 2000);
    const options = await page.locator('#watch-suggestions option').evaluateAll((o) => o.map((x) => x.value));
    check(options.includes('Leyte') && options.includes('Batanes'), 'Watch-area suggestions come from PAGASA\'s own province names', options.join(','));
    await page.locator('#watch-label').fill('Leyte');
    await page.getByRole('button', { name: 'Add watch area' }).click(); await settle(page, 2000);
    t = await text(page);
    check(t.includes('Now watching Leyte') && t.includes('083700000'), 'Administrator adds Leyte; its PAGASA code is filled in from the alert');

    await page.goto(`${APP}/`); await settle(page, 3000);
    t = await text(page);
    check(t.includes('1 PAGASA alert in your watch areas'), 'Dashboard status shows the alert in the watch area', t.match(/PAGASA[^.]{0,80}/)?.[0]);
    const bell = page.getByRole('button', { name: /Official alerts: 1 in your watch areas/ });
    check(await bell.count() === 1, 'The bell shows one alert, with an accessible label');
    await bell.click(); await settle(page, 500);
    t = await text(page);
    check(t.includes('General Flood Advisory (Moderate)') && t.includes('Leyte'), 'The bell lists the flood advisory for Leyte');
    check(errors.length === 0, 'No script errors for the administrator', errors.join(' | '));
    await ctx.close();
  }

  // ── Responder logs an alert as a hazard record ──────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/detection`); await settle(page);
    let t = await text(page);
    check(t.includes('My watch areas (1)') && t.includes('In your watch area'), 'Responder sees the alert flagged for the watch area');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/official-alerts.png`, fullPage: false });
    check(t.includes('CAP fields as issued: severity Moderate'), 'CAP severity, urgency and certainty are shown as issued');
    check(t.includes('Source: PAGASA-DOST · CC BY 4.0'), 'Every alert credits PAGASA and its licence');
    await page.getByRole('button', { name: 'Details and instructions' }).first().click();
    t = await text(page);
    check(t.includes('What to do'), 'Instructions from PAGASA can be opened');
    await page.getByRole('button', { name: 'Log as hazard record' }).first().click(); await settle(page, 800);
    check(await page.getByLabel('Source of the information').inputValue() === 'PAGASA', 'The form is prefilled with the source');
    check((await page.getByLabel('Hazard name').inputValue()).includes('General Flood Advisory'), 'The form is prefilled with the alert');
    check(await page.getByLabel('Hazard type').inputValue() === 'Flood', 'The hazard type is inferred from the event');
    await page.getByLabel('Latitude (4 to 22)').fill('11.24');
    await page.getByLabel('Longitude (116 to 127)').fill('125.00');
    await page.getByLabel('Severity').selectOption('Medium');
    await page.getByRole('button', { name: 'Save hazard record' }).click(); await settle(page);
    t = await text(page);
    check(t.includes('Hazard record saved'), 'Responder saves the hazard record');
    const rows = await (await fetch(`${API}/rest/v1/ddrive_hazards?select=official_alert_id,source_url,ddrive_official_alerts(event,cap_url)&official_alert_id=not.is.null`, { headers: { authorization: `Bearer ${SERVICE}` } })).json();
    check(rows.length === 1 && rows[0].ddrive_official_alerts?.cap_url?.endsWith('pagasa-gfa.cap'), 'The record links to the PAGASA alert it came from', JSON.stringify(rows));
    // The test server is plain http; production PAGASA links are https and are copied into source_url.
    check(rows[0]?.source_url === null, 'A non-https link is not copied into the record (the database accepts https only)', JSON.stringify(rows));

    await page.goto(`${APP}/settings`); await settle(page, 1500);
    await page.getByRole('button', { name: 'Organisation' }).click(); await settle(page, 2000);
    t = await text(page);
    check(t.includes('Needs the DRRM officer role') && await page.locator('#watch-label').count() === 0, 'Responder cannot change watch areas');
    check(errors.length === 0, 'No script errors for the responder', errors.join(' | '));
    await ctx.close();
  }

  // ── Another organisation ────────────────────────────────────────────────────
  {
    const { page, ctx } = await pageAs(browser, 'newcomer@x.ph');
    await page.goto(`${APP}/detection`); await settle(page);
    const t = await text(page);
    check(t.includes('All Philippines (3)') && t.includes('My watch areas (0)'), 'Another organisation sees the same public alerts but has its own watch areas');
    await ctx.close();
  }

  // ── Feed goes quiet ─────────────────────────────────────────────────────────
  {
    await fetch(`${API}/rest/v1/ddrive_ingest_runs?id=gt.0`, { method: 'DELETE', headers: { authorization: `Bearer ${SERVICE}` } });
    const { page, ctx } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/`); await settle(page, 3000);
    let t = await text(page);
    check(t.includes('may be out of date'), 'With no recent feed reading, the dashboard warns that alerts may be out of date');
    await page.goto(`${APP}/detection`); await settle(page);
    t = await text(page);
    check(t.includes('Check pagasa.dost.gov.ph directly'), 'Detection points people to PAGASA directly');
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
