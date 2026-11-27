// The connected cycle, end to end in the browser: a risk interpreted in Diagnosis and an official alert observed in
// Detection each lead to a proposed action; Response decides and coordinates it to a recorded outcome. Anticipatory
// action is reached inside Response, and old links still arrive there. Run by scripts/test_e2e.sh after detection.mjs.
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
const settle = (page, ms = 2000) => page.waitForTimeout(ms);
const rest = (path, token, init = {}) => fetch(`${API}/rest/v1/${path}`, {
  ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers ?? {}) },
});

async function userId(email) {
  return (await (await rest(`ddrive_users?select=id&email=eq.${encodeURIComponent(email)}`, SERVICE)).json())[0]?.id;
}
const tokenFor = async (email) => sign({ sub: await userId(email), email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
async function pageAs(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, serviceWorkers: 'block' });
  const id = await userId(email);
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const session = {
    access_token: await tokenFor(email), refresh_token: 'unused', token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} },
  };
  await ctx.addInitScript((s) => { try { localStorage.setItem('sb-127-auth-token', JSON.stringify(s)); } catch { /* opaque frame */ } }, session);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, ctx, errors };
}
const action = async (title) => (await (await rest(`ddrive_response_actions?select=*&title=eq.${encodeURIComponent(title)}`, SERVICE)).json())[0];

// A risk to treat, registered by the analyst (as Diagnosis would).
const analystToken = await tokenFor('analyst@a.ph');
const made = await rest('ddrive_risks', analystToken, { method: 'POST', body: JSON.stringify({ title: 'City hall archive floods', category: 'Operational', likelihood: 4, impact: 5 }) });
const risk = (await made.json())[0];
check(made.status === 201 && risk?.ref, 'The analyst registers a risk to treat', made.status);

const TITLE = 'Move the archive to the second floor';
const browser = await chromium.launch();
try {
  // ── Diagnosis proposes ──────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/diagnosis?tab=register`);
    await settle(page);
    const row = page.locator('tr', { has: page.getByText('City hall archive floods') });
    const strip = row.locator('xpath=following-sibling::tr[1]');
    check(await strip.getByText('No actions yet').isVisible(), 'Diagnosis: the risk shows it has no actions yet');
    await strip.getByRole('button', { name: '+ Propose action' }).click();
    const title = strip.getByLabel('Action', { exact: true });
    check((await title.inputValue()) === 'Treat: City hall archive floods', 'The form starts from the risk', await title.inputValue());
    check((await strip.getByLabel('Priority').inputValue()) === 'critical', 'Priority is suggested from the risk level (4 × 5, Critical)', await strip.getByLabel('Priority').inputValue());
    await title.fill(TITLE);
    await strip.getByLabel('Treatment option (ISO 31000)').selectOption('reduce_consequences');
    await strip.getByLabel('DRRM thematic area (RA 10121)').selectOption('prevention_mitigation');
    await strip.getByLabel('Responsible office (optional)').fill('City Records Office');
    await strip.getByRole('button', { name: 'Propose action' }).click();
    await settle(page);
    const a = await action(TITLE);
    check(a?.status === 'proposed' && a.origin === 'diagnosis' && a.risk_id === risk.id && /^T-\d{3}$/.test(a.ref), 'It is stored as a proposal from Diagnosis, linked to the risk', JSON.stringify(a));
    check((await text(page)).includes(`${a?.ref}: Proposed, awaiting decision`), 'Diagnosis shows the proposal and its status beside the risk');
    check(errors.length === 0, 'Diagnosis: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── Response decides ────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/response`);
    await settle(page);
    const t = await text(page);
    check(t.includes('Risk-informed actions') && t.includes('Incidents') && t.includes('Anticipatory action (RA 12287)'), 'Response has actions, incidents and anticipatory action');
    check(!t.includes('AI Treatment Canvas'), 'The placeholder treatment canvas is gone');
    const card = page.locator('li', { has: page.getByRole('heading', { name: TITLE }) });
    check((await card.innerText()).includes('Responds to: Risk'), 'The action says which risk it responds to', await card.innerText());
    await card.getByRole('button', { name: 'Approve' }).click();
    await settle(page);
    check((await action(TITLE))?.status === 'approved', 'A DRRM officer (here the administrator) approves it');
    check(errors.length === 0, 'Response (officer): no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── Response coordinates ────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/response?tab=actions`);
    await settle(page);
    const card = page.locator('li', { has: page.getByRole('heading', { name: TITLE }) });
    check(await card.getByRole('button', { name: 'Approve' }).count() === 0, 'A responder cannot approve');
    await card.getByLabel('Progress (%)').fill('40');
    await card.getByLabel('What was done', { exact: true }).fill('Shelving moved; boxes 1 to 60 relocated');
    await card.getByRole('button', { name: 'Record progress' }).click();
    await settle(page);
    let a = await action(TITLE);
    check(a?.status === 'in_progress' && a.progress === 40, 'The responder reports 40% with what was done', JSON.stringify({ s: a?.status, p: a?.progress }));
    await card.getByLabel('Outcome: what was done and what it changed').fill('All records above the 2013 flood line; inventory signed off');
    await card.getByRole('button', { name: 'Mark done' }).click();
    await settle(page);
    a = await action(TITLE);
    check(a?.status === 'done' && a.progress === 100 && a.outcome?.startsWith('All records'), 'and completes it with the outcome', JSON.stringify({ s: a?.status, p: a?.progress }));

    // An official alert observed in Detection leads to an action too.
    await page.goto(`${APP}/detection`);
    await settle(page, 2500);
    await page.getByRole('button', { name: 'Whole region' }).click();
    await settle(page, 800);
    const alertCard = page.locator('li', { has: page.getByText('Propose action', { exact: false }) }).first();
    await alertCard.getByRole('button', { name: '+ Propose action' }).click();
    const t = alertCard.getByLabel('Action', { exact: true });
    check((await t.inputValue()).startsWith('Prepare for'), 'Detection: an alert can lead to a proposed action', await t.inputValue());
    await t.fill('Pre-position rescue boats at the river barangays');
    await alertCard.getByRole('button', { name: 'Propose action' }).click();
    await settle(page);
    const b = await action('Pre-position rescue boats at the river barangays');
    check(b?.origin === 'detection' && b.official_alert_id && b.status === 'proposed', 'It is stored as a proposal from Detection, linked to the alert', JSON.stringify(b));
    check(errors.length === 0, 'Responder: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── Viewer follows; anticipatory action lives in Response ───────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'viewer@a.ph');
    await page.goto(`${APP}/response?tab=actions`);
    await settle(page);
    await page.getByRole('button', { name: 'All' }).click();
    const t = await text(page);
    check(t.includes(TITLE) && t.includes('Outcome: All records above'), 'A viewer follows the action and its outcome');
    check(await page.getByRole('button', { name: 'Approve' }).count() === 0 && await page.getByRole('button', { name: 'Record progress' }).count() === 0, 'A viewer has no step buttons');
    const nav = await page.locator('nav').first().innerText();
    check(!nav.includes('Anticipatory Action') && nav.includes('Response'), 'The side menu no longer lists anticipatory action as a separate module', nav.replace(/\s+/g, ' '));
    await page.goto(`${APP}/anticipatory-action?alert=abc`);
    await settle(page, 1500);
    const u = new URL(page.url());
    check(u.pathname === '/response' && u.searchParams.get('tab') === 'anticipatory' && u.searchParams.get('alert') === 'abc', 'Old anticipatory-action links open the tab in Response, alert kept', page.url());
    check((await page.getByRole('tab', { name: 'Anticipatory action (RA 12287)' }).getAttribute('aria-selected')) === 'true', 'and the anticipatory action tab is selected');
    check(errors.length === 0, 'Viewer: no page errors', errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nresponse: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
