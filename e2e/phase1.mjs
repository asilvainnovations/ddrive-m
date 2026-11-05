// Browser tests for Phase 1: the real app build against a real PostgREST and the migrated database.
// Run with scripts/test_e2e.sh.
import { createRequire } from 'node:module';
// CommonJS resolution also finds a globally installed Playwright (NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright');
import { sign } from './fake-supabase.mjs';

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const results = [];
const check = (ok, label, detail = '') => {
  results.push({ ok, label, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${detail})` : ''}`);
};

const serviceToken = sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 });
async function userId(email) {
  const r = await fetch(`${API}/rest/v1/ddrive_users?select=id&email=eq.${encodeURIComponent(email)}`, {
    headers: { authorization: `Bearer ${serviceToken}` },
  });
  const rows = await r.json();
  return rows[0]?.id;
}

async function pageAs(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  if (email) {
    const id = await userId(email);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = sign({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp });
    const session = {
      access_token: token, refresh_token: 'unused', token_type: 'bearer', expires_in: 3600, expires_at: exp,
      user: { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} },
    };
    // Runs in every frame; frames without storage access (about:blank) are skipped.
    await ctx.addInitScript((s) => { try { localStorage.setItem('sb-127-auth-token', JSON.stringify(s)); } catch { /* opaque frame */ } }, session);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, ctx, errors };
}

const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const settle = (page, ms = 2500) => page.waitForTimeout(ms);

const browser = await chromium.launch();
try {
  // ── Signed out ──────────────────────────────────────────────────────────────
  {
    const { page, ctx } = await pageAs(browser, null);
    await page.goto(`${APP}/detection`); await settle(page);
    const t = await text(page);
    check(t.includes('Sign in to DDRiVE-M'), 'Signed-out visitors are asked to sign in');
    check(!t.includes('Report Hazard'), 'Signed-out visitors see no module content');
    await ctx.close();
  }

  // ── Responder ───────────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/dashboard`); await settle(page);
    let t = await text(page);
    check(t.includes('Responder · LGU A'), 'Top bar shows the role and organisation', t.slice(0, 200));
    check(t.includes('Data loaded'), 'Dashboard reads data through the API', t.match(/data sources could not be read|Data loaded|Loading data/)?.[0]);

    await page.goto(`${APP}/detection`); await settle(page);
    await page.getByRole('button', { name: /Report Hazard/ }).click();
    await page.getByLabel('Hazard name').fill('Rising river at Barangay 3');
    await page.getByLabel('Location').fill('Barangay 3');
    await page.getByLabel('Latitude (4 to 22)').fill('11.01');
    await page.getByLabel('Longitude (116 to 127)').fill('124.61');
    await page.getByLabel('PSGC code (optional, 10 digits)').fill('0837300001');
    await page.getByLabel('Severity').selectOption('High');
    await page.getByRole('button', { name: 'Save hazard record' }).click();
    await settle(page);
    t = await text(page);
    check(t.includes('Hazard record saved'), 'Responder reports a hazard through the form', t.match(/Your role does not allow this[^.]*\.|One of the values[^.]*\./)?.[0]);
    check(t.includes('Rising river at Barangay 3'), 'The new hazard appears in the list');

    await page.goto(`${APP}/diagnosis`); await settle(page);
    const add = page.getByRole('button', { name: /Add Risk/i });
    check(await add.isDisabled(), 'Responder sees "Add risk" disabled');
    t = await text(page);
    check(t.includes('Needs the Analyst role or higher'), 'The reason is shown next to it');

    await page.goto(`${APP}/monitoring`); await settle(page);
    await page.getByLabel('Message to your team').fill('Team check-in at 5 PM');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await settle(page);
    t = await text(page);
    check(t.includes('Message sent') && t.includes('Rico Responder'), 'Messages show the real sender stamped by the database');
    check(t.includes('Needs the DRRM officer role'), 'Emergency message is reserved for DRRM officers');
    check(errors.length === 0, 'No script errors for the responder', errors.join(' | '));
    await ctx.close();
  }

  // ── Analyst ─────────────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/diagnosis`); await settle(page);
    await page.getByRole('button', { name: /Add Risk/i }).click();
    const form = page.locator('form').last();
    await form.locator('[name=title]').fill('Flooding of the evacuation centre');
    await form.locator('[name=owner]').fill('CDRRMO');
    await form.locator('[name=likelihood]').fill('4');
    await form.locator('[name=impact]').fill('5');
    await form.locator('button[type=submit]').click();
    await settle(page);
    const t = await text(page);
    check(/Risk R-001 saved/.test(t), 'Analyst adds a risk; the database issues R-001', t.match(/Risk [^ ]* saved|Your role[^.]*\.|One of the values[^.]*\./)?.[0]);
    check(t.includes('R-001') && t.includes('Critical'), 'The list shows the reference and the database-computed level (4 × 5 = Critical)');
    check(errors.length === 0, 'No script errors for the analyst', errors.join(' | '));
    await ctx.close();
  }

  // ── Viewer ──────────────────────────────────────────────────────────────────
  {
    const { page, ctx } = await pageAs(browser, 'viewer@a.ph');
    await page.goto(`${APP}/dashboard`); await settle(page);
    const t = await text(page);
    check(/HIGH OR CRITICAL HAZARDS\s*1/i.test(t) || t.includes('High: Rising river'), 'Viewer sees the organisation\'s data on the dashboard');
    await page.goto(`${APP}/detection`); await settle(page);
    check(await page.getByRole('button', { name: /Report Hazard/ }).isDisabled(), 'Viewer cannot report hazards');
    await ctx.close();
  }

  // ── Administrator ───────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/settings`); await settle(page, 1500);
    await page.getByRole('button', { name: 'Organisation' }).click(); await settle(page, 2000);
    let t = await text(page);
    check(t.includes('Alma Analyst') && t.includes('Rico Responder') && t.includes('Vina Viewer'), 'Administrator sees the member list');
    await page.getByLabel('Role for Vina Viewer').selectOption('responder'); await settle(page, 2000);
    t = await text(page);
    check(t.includes('is now Responder'), 'Administrator changes a member\'s role');
    await page.getByLabel('Email', { exact: true }).fill('newcomer@x.ph');
    await page.locator('#member-role').selectOption('analyst');
    await page.getByRole('button', { name: 'Add member' }).click(); await settle(page, 2000);
    t = await text(page);
    check(t.includes('newcomer@x.ph is now Analyst'), 'Administrator adds an existing account as a member');
    check(errors.length === 0, 'No script errors for the administrator', errors.join(' | '));
    await ctx.close();
  }

  // ── Someone with no organisation creates one ───────────────────────────────
  {
    const id = await userId('newcomer@x.ph');
    // Remove the membership added above, to test the first-run path.
    await fetch(`${API}/rest/v1/ddrive_memberships?user_id=eq.${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${serviceToken}` } });
    await fetch(`${API}/rest/v1/ddrive_users?id=eq.${id}`, {
      method: 'PATCH', headers: { authorization: `Bearer ${serviceToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ active_tenant_id: null }),
    });
    const { page, ctx, errors } = await pageAs(browser, 'newcomer@x.ph');
    await page.goto(`${APP}/dashboard`); await settle(page);
    let t = await text(page);
    check(t.includes("You're not in an organisation yet") && t.includes('newcomer@x.ph'), 'A new user is told how to join or set up an organisation');
    await page.getByLabel('Organisation name').fill('Barangay Resilience Council');
    await page.getByRole('button', { name: 'Set up organisation' }).click();
    await settle(page, 3000);
    t = await text(page);
    check(t.includes('Administrator · Barangay Resilience Council'), 'They become administrator of the new organisation', t.slice(0, 160));
    check(t.includes('Command Intelligence Dashboard'), 'They land on the dashboard');
    await page.goto(`${APP}/detection`); await settle(page);
    t = await text(page);
    check(!t.includes('Rising river at Barangay 3'), 'A new organisation cannot see another organisation\'s hazards');
    check(errors.length === 0, 'No script errors for the new user', errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
