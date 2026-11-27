// Flood Intelligence in Detection (ADR-016): import barangays with their NOAH flood hazard, record rainfall,
// read the outlook, log a hazard record from it. Run by scripts/test_e2e.sh after plans_governance.mjs.
import { createRequire } from 'node:module';
import { sign } from './fake-supabase.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_JWT || sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 });

const results = [];
const check = (ok, label, detail = '') => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${String(detail).slice(0, 300)})` : ''}`);
};
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const settle = (page, ms = 1800) => page.waitForTimeout(ms);
const rest = (path, token, init = {}) => fetch(`${API}/rest/v1/${path}`, {
  ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers ?? {}) },
});
const userId = async (email) => (await (await rest(`ddrive_users?select=id&email=eq.${encodeURIComponent(email)}`, SERVICE)).json())[0]?.id;
const tokenFor = async (email) => sign({ sub: await userId(email), email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
async function pageAs(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, serviceWorkers: 'block' });
  const id = await userId(email);
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const session = { access_token: await tokenFor(email), refresh_token: 'unused', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} } };
  await ctx.addInitScript((s) => { try { localStorage.setItem('sb-127-auth-token', JSON.stringify(s)); } catch { /* opaque frame */ } }, session);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, ctx, errors };
}
const one = async (path) => (await (await rest(path, SERVICE)).json())[0];
const year = new Date().getFullYear();

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
const dayBefore = (n) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

const browser = await chromium.launch();
try {
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/detection`); await settle(page);
    let t = await text(page);
    check(t.includes('Flood intelligence: rainfall against flood hazard') && t.includes('not a warning'), 'Detection shows Flood intelligence, saying it is not a warning');
    check(t.includes('No barangays yet'), 'With no barangays, it says how to add them');
    await page.getByText('Import from CSV').click();
    await page.getByLabel('Source for Barangays and flood hazard').fill('Project CCHAIN project_noah_hazards (CC BY 4.0)');
    await page.locator('#barangays-and-flood-hazard').setInputFiles({ name: 'project_noah_hazards.csv', mimeType: 'text/csv',
      buffer: Buffer.from('adm4_pcode,name,pct_area_flood_hazard_100yr_high\nPH083738001,Brgy. Riverside,50\nPH083738002,Brgy. Upland,0\nPH083738003,Brgy. Bad,abc\n') });
    await settle(page);
    const areas = await (await rest('ddrive_flood_areas?select=id,name,flood_hazard_pct,hazard_source&order=name', SERVICE)).json();
    check(areas.length === 2 && Number(areas[0].flood_hazard_pct) === 50 && areas[0].hazard_source.startsWith('Project CCHAIN'), 'An analyst imports barangays from a CCHAIN hazard file; the bad row is skipped', JSON.stringify(areas));
    check(errors.length === 0, 'Flood intelligence (analyst): no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/detection`); await settle(page);
    check((await text(page)).includes('2 with no rainfall recorded for the day'), 'Without rainfall for the day there is no outlook, and it says so');
    await page.getByText('Import from CSV').click();
    await page.getByLabel('Source for Daily rainfall').fill('LGU rain gauges');
    const csv = `name,date,rain_mm\nBrgy. Riverside,${dayBefore(3)},60\nBrgy. Riverside,${dayBefore(2)},30\nBrgy. Riverside,${dayBefore(1)},20\nBrgy. Upland,${dayBefore(1)},10\n`;
    await page.locator('#daily-rainfall').setInputFiles({ name: 'rain.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await settle(page);
    await page.getByText('Record rainfall').click();
    await page.getByLabel('Barangay', { exact: true }).selectOption({ label: 'Brgy. Riverside' });
    await page.getByLabel('Rainfall (mm, day total)').fill('80');
    await page.getByLabel('Source of the reading').fill('LGU rain gauge, Riverside hall');
    await page.getByRole('button', { name: 'Record', exact: true }).click(); await settle(page);
    const row = page.locator('tr', { has: page.getByText('PH083738001', { exact: true }) });
    const r = (await row.innerText()).replace(/\s+/g, ' ');
    check(r.includes('80 mm') && r.includes('110 mm') && r.includes('40 mm / 75 mm'), 'The row shows the day, the 3 days before and the thresholds lowered by the hazard', r);
    check(r.includes('High') && r.includes('soaked ground'), 'and a high outlook, with why', r);
    const up = (await page.locator('tr', { has: page.getByText('PH083738002', { exact: true }) }).innerText()).replace(/\s+/g, ' ');
    check(up.includes('Not recorded') && up.includes('1 of 3 days recorded'), 'A barangay without today\'s rainfall has no outlook and shows missing days', up);
    await row.getByRole('link', { name: 'Log as hazard record' }).click(); await settle(page);
    check(await page.getByLabel('Hazard type').inputValue() === 'Flood' && (await page.getByLabel('Hazard name').inputValue()).includes('Brgy. Riverside'), 'Logging opens a flood hazard record prefilled from the outlook');
    check(errors.length === 0, 'Flood intelligence (responder): no page errors', errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nflood intelligence: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
