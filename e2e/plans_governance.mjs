// Integration (governance self-assessment, risk mainstreaming), Enhancement (plan from a template, forms) and
// Validation (an exercise that tests the plan, with an improvement action), end to end in the browser (ADR-012, ADR-013).
// Run by scripts/test_e2e.sh after integration_ai.mjs.
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
  // ── Dashboard: UP NOAH Know Your Hazards (ADR-014) ──────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    const noahRequests = [];
    page.on('request', (r) => { if (r.url().includes('noah.up.edu.ph')) noahRequests.push(r.url()); });
    await page.route('https://noah.up.edu.ph/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>NOAH stub</p>' }));
    await page.goto(`${APP}/dashboard`); await settle(page);
    const t = await text(page);
    check(t.includes('Know your hazards: UP NOAH') && t.includes('100-year rain return period') && t.includes('Storm Surge Advisory 4'), 'The Dashboard shows the NOAH hazard maps and their scenarios');
    check(t.includes('not warnings'), 'and says they are reference maps, not warnings');
    check(noahRequests.length === 0, 'Nothing is loaded from NOAH until the user asks', noahRequests.join(' '));
    await page.getByRole('button', { name: 'Show the map here' }).click(); await settle(page, 800);
    check(await page.locator('iframe[title="UP NOAH Know Your Hazards map"]').count() === 1 && noahRequests.length > 0, 'Showing the map loads the official NOAH page in a frame');
    await page.getByRole('link', { name: 'log it as a hazard record' }).click(); await settle(page);
    check(await page.getByLabel('Source of the information').inputValue() === 'NOAH', 'Logging from the panel opens a hazard record with NOAH as the source');
    check(errors.length === 0, 'Dashboard NOAH panel: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── Integration: governance ─────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/integration`); await settle(page);
    let t = await text(page);
    check(t.includes('DRRM governance self-assessment') && t.includes('Structure 25%'), 'Integration opens on the governance self-assessment, with the toolkit weights');
    await page.getByRole('button', { name: 'Start assessment' }).click(); await settle(page);
    const a = await one(`ddrive_governance_assessments?select=id,ref,status&assessment_year=eq.${year}`);
    check(a?.status === 'draft' && /^G-\d{3}$/.test(a.ref), 'An analyst starts this year\'s assessment', JSON.stringify(a));
    await page.getByRole('button', { name: /3\.1 Hazard-specific SOPs/ }).click();
    t = await text(page);
    check(t.includes('Means of verification') && t.includes('AAR of SIMEX'), 'An indicator shows its means of verification and rating guide from the toolkit');
    check(t.includes('evaluated exercise'), 'and the evidence DDRiVE-M already holds for it');
    await page.getByLabel('Score for 3.1').selectOption('2'); await settle(page);
    const r = await one(`ddrive_governance_ratings?select=score&assessment_id=eq.${a.id}&item_code=eq.3.1`);
    check(r?.score === 2, 'Rating an indicator is saved', JSON.stringify(r));
    check((await text(page)).includes('1 of 32 rated'), 'The score table counts rated indicators');

    // ── Integration: risk priorities in plans ─────────────────────────────────
    await page.goto(`${APP}/integration?tab=mainstreaming`); await settle(page);
    t = await text(page);
    check(t.includes('Risk priorities in plans and budgets') && t.includes('not yet in any adopted instrument'), 'The mainstreaming tab shows coverage of priority risks');
    await page.getByRole('button', { name: 'Add entry' }).first().click();
    const risk = await one(`ddrive_risks?select=id&title=eq.${encodeURIComponent('City hall archive floods')}`);
    await page.getByLabel('Priority risk').selectOption(risk.id);
    await page.getByLabel('Instrument', { exact: true }).selectOption('clup');
    await page.getByLabel('Decision area').fill('City hall compound');
    await page.getByLabel('Policy intervention').fill('Relocate the city archive above the 100-year flood level');
    await page.getByRole('button', { name: 'Add to register' }).click(); await settle(page);
    const m = await one('ddrive_mainstreaming?select=id,status,instrument&instrument=eq.clup');
    check(m?.status === 'proposed', 'An analyst records the risk in the CLUP with the CDRA decision-area analysis', JSON.stringify(m));
    check(errors.length === 0, 'Integration (analyst): no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/integration?tab=mainstreaming`); await settle(page);
    const entry = page.locator('li', { has: page.getByText('Relocate the city archive above the 100-year flood level') });
    await entry.getByLabel('Adopted by (resolution or ordinance number)').fill('Ordinance No. 2026-14');
    await entry.getByRole('button', { name: 'Record adoption' }).click(); await settle(page);
    check((await one('ddrive_mainstreaming?select=status,adoption_ref&instrument=eq.clup'))?.adoption_ref === 'Ordinance No. 2026-14', 'A DRRM officer records the adoption with its ordinance number');
    const row = page.locator('tr', { has: page.getByText('City hall archive floods') });
    check((await row.innerText()).includes('Comprehensive Land Use Plan'), 'The coverage table shows where the risk is now embedded', await row.innerText());
    check(errors.length === 0, 'Integration (officer): no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── Enhancement: a contingency plan from the template ───────────────────────
  let planId;
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/enhancement?tab=templates`); await settle(page);
    const t = await text(page);
    check(t.includes('Local DRRM Plan (LDRRMP)') && t.includes('Contingency Plan (per hazard)') && t.includes('EOC Standard Operations Manual') && t.includes('Public Service Continuity Plan'), 'The template library lists the DRRM plans');
    const cpCard = page.locator('div', { has: page.getByText('Contingency Plan (per hazard)', { exact: true }) }).last();
    await cpCard.getByRole('button', { name: 'Start a plan from this template' }).click();
    await page.getByLabel('Title').fill('Typhoon contingency plan');
    await page.getByLabel('Hazard').fill('Tropical cyclone');
    await page.getByRole('button', { name: 'Create draft' }).click(); await settle(page);
    const p = await one(`ddrive_plans?select=id,status,template_key,hazard&title=eq.${encodeURIComponent('Typhoon contingency plan')}`);
    planId = p?.id;
    check(p?.status === 'Draft' && p.template_key === 'contingency_plan' && p.hazard === 'Tropical cyclone', 'An analyst starts a contingency plan for a hazard', JSON.stringify(p));
    check((await text(page)).includes('Required sections filled: 0 of'), 'The editor opens, tracking required sections');
    await page.getByRole('textbox', { name: 'Hazard and scenario', exact: true }).fill('Super typhoon with Signal No. 4 and storm surge of 3 m along the coastal barangays.');
    await page.getByRole('button', { name: 'Add row' }).first().click();
    await page.getByLabel('Barangay / area, row 1').fill('Brgy. 5');
    await page.getByLabel('Families, row 1').fill('420');
    await page.getByRole('button', { name: 'Save' }).first().click(); await settle(page);
    const saved = await one(`ddrive_plans?select=content&id=eq.${planId}`);
    check(saved?.content?.hazard_scenario?.startsWith('Super typhoon') && saved.content.affected?.[0]?.families === '420', 'Sections and table rows are saved', JSON.stringify(saved));
    check((await text(page)).includes('Required sections filled: 2 of'), 'Completeness updates');

    // ── Validation: test the plan ─────────────────────────────────────────────
    await page.getByRole('button', { name: 'Test this plan' }).click();
    await page.getByRole('button', { name: 'Plan the exercise' }).click(); await settle(page, 2500);
    check(new URL(page.url()).pathname === '/validation', 'Testing the plan opens the exercise in Validation', page.url());
    const ex = await one(`ddrive_exercises?select=id,status,plan_id&plan_id=eq.${planId}`);
    const checks = await (await rest(`ddrive_exercise_checks?select=id,statement&exercise_id=eq.${ex.id}`, SERVICE)).json();
    check(ex?.status === 'planned' && checks.length >= 10, 'The exercise starts with checks from the plan and the standards', `${checks.length} checks`);
    await page.getByRole('button', { name: 'Record as held' }).click(); await settle(page);
    check((await one(`ddrive_exercises?select=status&id=eq.${ex.id}`))?.status === 'conducted', 'An analyst records the exercise as held');
    // Rate all but the reporting check through the API, then the reporting check on screen.
    const analyst = await tokenFor('analyst@a.ph');
    for (const c of checks.filter((x) => x.statement !== 'Initial report within two hours')) {
      await rest(`ddrive_exercise_checks?id=eq.${c.id}`, analyst, { method: 'PATCH', body: JSON.stringify({ observed: 'As planned', result: 'met' }) });
    }
    await page.reload(); await settle(page);
    const row = page.locator('li', { has: page.getByText('Initial report within two hours', { exact: true }) });
    await row.getByLabel('What was observed').fill('Initial report sent three hours after landfall');
    await row.getByLabel('Result').selectOption('not_met');
    await row.getByLabel('Recommendation').fill('Assign a reporting officer per EOC shift with a pre-filled template');
    await row.getByRole('button', { name: 'Save' }).click(); await settle(page);
    check((await one(`ddrive_exercise_checks?select=result&exercise_id=eq.${ex.id}&statement=eq.${encodeURIComponent('Initial report within two hours')}`))?.result === 'not_met', 'The gap is rated with what was observed and a recommendation');
    await row.getByRole('button', { name: '+ Propose improvement action' }).click();
    await row.getByRole('button', { name: 'Propose action', exact: true }).click(); await settle(page);
    const imp = await one('ddrive_response_actions?select=origin,status,exercise_check_id&origin=eq.validation');
    check(imp?.status === 'proposed' && !!imp.exercise_check_id, 'The gap becomes a proposed improvement action in Response', JSON.stringify(imp));
    check(errors.length === 0, 'Enhancement and Validation (analyst): no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    const ex = await one(`ddrive_exercises?select=id&plan_id=eq.${planId}`);
    await page.goto(`${APP}/validation?tab=exercises&exercise=${ex.id}`); await settle(page);
    await page.getByLabel('Evaluation summary: what worked, what did not, what changes').fill('Coordination worked; reporting was late and is being fixed.');
    await page.getByRole('button', { name: 'Close the evaluation' }).click(); await settle(page);
    check((await one(`ddrive_exercises?select=status&id=eq.${ex.id}`))?.status === 'evaluated', 'A DRRM officer closes the evaluation');
    check(await page.getByRole('button', { name: 'After-action report' }).isVisible(), 'The after-action report is available');
    await page.goto(`${APP}/enhancement?tab=plans`); await settle(page);
    check((await text(page)).includes(`last tested ${new Date().toISOString().slice(0, 10)}`), 'The plan shows when it was last tested');
    await page.goto(`${APP}/enhancement?tab=plans&plan=${planId}`); await settle(page);
    await page.getByLabel('Adopting resolution (Sanggunian or council)').fill('SP Resolution No. 31, s. ' + year);
    await page.getByRole('button', { name: 'Approve' }).click(); await settle(page);
    check((await one(`ddrive_plans?select=status,adoption_ref&id=eq.${planId}`))?.status === 'Approved', 'The officer approves the plan with its adopting resolution');
    check(errors.length === 0, 'Officer: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── Forms ───────────────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/enhancement?tab=forms`); await settle(page);
    await page.getByLabel('New form').selectOption('initial_report');
    await page.getByRole('button', { name: 'Start form' }).click(); await settle(page);
    await page.getByLabel('When it happened').fill(new Date(Date.now() - 3600e3).toISOString().slice(0, 16));
    await page.getByLabel('What happened').fill('River overflowed its banks');
    await page.getByLabel('Where (barangay, municipality, coordinates)').fill('Brgy. 5, Ormoc City');
    await page.getByLabel('Who is affected or involved').fill('About 40 families');
    await page.getByLabel('Initial steps taken').fill('Pre-emptive evacuation started');
    await page.getByLabel('Source of information (agency, LCE, SMS, media) and whether confirmed').fill('Barangay captain, confirmed');
    await page.getByRole('button', { name: 'Save' }).click(); await settle(page);
    await page.getByRole('button', { name: 'Finalise' }).click(); await settle(page);
    const f = await one('ddrive_form_records?select=status,data&form_key=eq.initial_report');
    check(f?.status === 'final' && f.data?.what === 'River overflowed its banks', 'A responder files and finalises an initial report', JSON.stringify(f));
    check(errors.length === 0, 'Forms: no page errors', errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nplans and governance: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
