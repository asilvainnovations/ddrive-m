// EOC operations in Response (ADR-017): status with Memo 131 triggers, the status band, roster and log.
// Run by scripts/test_e2e.sh after flood.mjs.
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

const browser = await chromium.launch();
try {
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/response?tab=eoc`); await settle(page);
    let t = await text(page);
    check(t.includes('No EOC status recorded yet') && t.includes('EOC: not recorded'), 'With no status recorded, the EOC tab and the top bar say so instead of assuming WHITE');
    await page.getByRole('button', { name: 'Record current status' }).click();
    await page.getByLabel('New status').selectOption('blue');
    await page.getByLabel('Trigger (NDRRMC Memo 131)').selectOption('impending_hazard');
    await page.getByLabel(/^Basis/).fill('PAGASA Severe Weather Bulletin: tropical storm entering PAR; PDRA held');
    await page.getByLabel('Directed by (Responsible Official)').fill('Mayor A. Santos, LDRRMC Chairperson');
    await page.getByRole('button', { name: 'Record status change' }).click(); await settle(page);
    t = await text(page);
    check(t.includes('Heightened alert') && t.includes('directed by Mayor A. Santos'), 'An officer records BLUE with its trigger, basis and Responsible Official');
    check(await page.getByRole('status', { name: /EOC alert status BLUE/ }).count() === 1, 'The top bar shows the EOC status on every page, with its time');
    await page.getByRole('button', { name: 'Change status' }).click();
    await page.getByLabel('New status').selectOption('white');
    const opts = await page.getByLabel('Trigger (NDRRMC Memo 131)').locator('option').allInnerTexts();
    check(opts.length === 4 && opts.every((o) => /9\.2\.7/.test(o)), 'Lowering the status offers only the Memo 131 deactivation triggers', opts.join(' | '));
    await page.getByRole('button', { name: 'Cancel' }).click();
    const rows = await (await rest('ddrive_eoc_status?select=ref,level,trigger,previous_level', SERVICE)).json();
    check(rows.length === 1 && rows[0].level === 'blue' && rows[0].trigger === 'impending_hazard' && rows[0].previous_level === null, 'One status record, stored as entered', JSON.stringify(rows));
    check(errors.length === 0, 'EOC (officer): no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/response?tab=eoc`); await settle(page);
    check((await text(page)).includes('No one on duty now for: Management, Operations, Planning, Logistics, Finance / Administration'), 'On BLUE, functions with no one on duty are flagged');
    check(await page.getByRole('button', { name: 'Change status' }).count() === 0, 'An analyst cannot change the status');
    await page.getByLabel('Function', { exact: true }).selectOption('operations');
    await page.getByLabel('Person').fill('Rico Responder');
    await page.getByLabel('Hours').fill('12');
    await page.getByRole('button', { name: 'Add to roster' }).click(); await settle(page);
    const t = await text(page);
    check(t.includes('Rico Responder') && t.includes('on duty now') && !/No one on duty now for: [^.]*Operations/.test(t), 'An analyst adds a tour of duty; Operations is now covered');
    check(errors.length === 0, 'EOC (analyst): no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/response?tab=eoc`); await settle(page);
    await page.getByRole('button', { name: 'Start tour of Rico Responder' }).click(); await settle(page);
    check((await text(page)).includes('Started'), 'The responder marks the tour of duty as started');
    await page.getByLabel('Entry', { exact: true }).selectOption('handover');
    await page.getByLabel('Handed over to').fill('Ana Planner');
    await page.getByLabel(/^Handover:/).fill('Status BLUE. Two boats pre-positioned in Brgy. 5; next situation report due 18:00.');
    await page.getByRole('button', { name: 'Add to log' }).click(); await settle(page);
    const t = await text(page);
    check(t.includes('L-001') && t.includes('Shift handover') && t.includes('to Ana Planner'), 'A shift handover is logged with who takes over');
    const log = await (await rest('ddrive_eoc_log?select=ref,entry_type,handover_to', SERVICE)).json();
    check(log.length === 1 && log[0].entry_type === 'handover', 'The handover is stored', JSON.stringify(log));
    check(errors.length === 0, 'EOC (responder): no page errors', errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nEOC operations: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
