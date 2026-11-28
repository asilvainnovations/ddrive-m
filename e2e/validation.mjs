// Validation for a sub-region (ADR-019): EOC activation from contingency plans, the ICS simulator, flood watch and ECHO.
// Run by scripts/test_e2e.sh after eoc.mjs (LGU A is on BLUE; the "Typhoon contingency plan" is approved).
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

const plan = await one(`ddrive_plans?select=id,tenant_id,ref,status&title=eq.${encodeURIComponent('Typhoon contingency plan')}`);
const exRes = await rest('ddrive_exercises', SERVICE, { method: 'POST', body: JSON.stringify({ tenant_id: plan.tenant_id, title: 'TTX: Metro Manila flood activation', exercise_type: 'tabletop', plan_id: plan.id, hazard: 'Flood' }) });
const exercise = (await exRes.json())[0];
check(exRes.ok && !!exercise?.id, 'Setup: a planned tabletop for the contingency plan', exRes.status);

const browser = await chromium.launch();
try {
  // ─── EOC activation from a contingency plan ────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/validation?tab=activation`); await settle(page);
    let t = await text(page);
    check(t.includes('EOC activation from contingency plans') && t.includes('Typhoon contingency plan'), 'The activation tab lists the organisation\'s contingency plans');
    check(t.includes('The plan has no activation set yet'), 'A plan without an activation set says so');
    await page.getByLabel('EOC: Operations: role in the plan').selectOption('lead'); await settle(page, 900);
    await page.getByLabel('EOC: Operations: from level').selectOption('blue'); await settle(page, 900);
    await page.getByLabel('Camp Coordination and Camp Management (DSWD): role in the plan').selectOption('lead'); await settle(page, 900);
    await page.getByLabel('Camp Coordination and Camp Management (DSWD): from level').selectOption('blue'); await settle(page, 900);
    await page.getByLabel('Search, Rescue and Retrieval (AFP): role in the plan').selectOption('on'); await settle(page);
    const items = await (await rest(`ddrive_cp_items?select=item_code,state,min_level&plan_id=eq.${plan.id}&order=item_code`, SERVICE)).json();
    check(items.map((i) => `${i.item_code}=${i.state}/${i.min_level}`).join(',') === 'cccm=lead/blue,operations=lead/blue,srr=on/red', 'An officer sets the plan\'s activation set (stored with levels)', JSON.stringify(items));
    t = await text(page);
    check(/Standby · Search, Rescue and Retrieval/.test(t), 'At BLUE, a RED item is previewed on standby');
    check(t.includes('is not in the set (NDRRMC Memo 131, 9.3.1 lists five)'), 'Missing EOC functions are named');
    await page.getByLabel('Exercise', { exact: true }).selectOption(exercise.id);
    await page.getByLabel(/^What triggered the activation/).fill('Marikina River at 16 m, Sto. Niño (2nd alarm)');
    await page.getByRole('button', { name: 'Activate' }).click(); await settle(page);
    let acts = await (await rest('ddrive_cp_activations?select=ref,mode,level,exercise_id,items&order=created_at', SERVICE)).json();
    check(acts.length === 1 && acts[0].mode === 'exercise' && acts[0].level === 'blue' && acts[0].exercise_id === exercise.id, 'An exercise activation is recorded at the previewed level', JSON.stringify(acts));
    await page.getByRole('radio', { name: 'At RED' }).click();
    await page.getByLabel('Activation', { exact: true }).selectOption('live');
    t = await text(page);
    check(t.includes('Activates at BLUE.'), 'A live activation uses the current EOC status, not the preview');
    await page.getByRole('button', { name: 'PAGASA heavy rainfall warning (orange) for Metro Manila' }).click();
    await page.getByRole('button', { name: 'Activate' }).click(); await settle(page);
    acts = await (await rest('ddrive_cp_activations?select=ref,mode,level&order=created_at', SERVICE)).json();
    check(acts.length === 2 && acts[1].mode === 'live' && acts[1].level === 'blue', 'The officer activates the plan live on BLUE', JSON.stringify(acts));
    const log = await (await rest('ddrive_eoc_log?select=entry_type,body&entry_type=eq.decision', SERVICE)).json();
    check(log.some((l) => l.body.startsWith(`Contingency plan activated (${acts[1].ref})`)), 'The live activation is logged as a decision in the EOC operations log', JSON.stringify(log));
    t = await text(page);
    check(t.includes(acts[0].ref) && t.includes(acts[1].ref), 'Both activations are listed');
    check(errors.length === 0, 'Activation: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ─── ICS simulator ─────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'viewer@a.ph');
    await page.goto(`${APP}/validation?tab=ics`); await settle(page);
    check((await text(page)).includes('ICS simulator: Metro Manila'), 'The ICS simulator opens for Metro Manila');
    await page.getByLabel('Participant or team').fill('Team Marikina');
    await page.getByLabel('Scenario').selectOption('mm-flood');
    await page.getByRole('button', { name: 'Start' }).click(); await settle(page, 600);
    check(await page.getByRole('timer').count() === 1, 'Each decision runs against a clock');
    for (let i = 0; i < 4; i++) {
      await page.getByRole('group', { name: 'What do you do?' }).getByRole('button').first().click();
      await settle(page, 300);
      check(await page.getByRole('status').filter({ hasText: /Basis:/ }).count() === 1, `Phase ${i + 1}: the verdict comes with its doctrine`);
      await page.getByRole('button', { name: /Next operational period|See results/ }).click(); await settle(page, 300);
    }
    const t = await text(page);
    check(/Results: \d+\/100/.test(t), 'The run ends with a score out of 100 and a band');
    await page.getByRole('button', { name: 'Save run' }).click(); await settle(page);
    const runs = await (await rest('ddrive_ics_runs?select=ref,participant,scenario_id,mode,picks', SERVICE)).json();
    check(runs.length === 1 && runs[0].participant === 'Team Marikina' && runs[0].picks.length === 4, 'A viewer saves the run with its four decisions', JSON.stringify(runs).slice(0, 200));
    check(errors.length === 0, 'ICS simulator: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ─── Flood watch and ECHO ──────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/validation?tab=flood`); await settle(page);
    let t = await text(page);
    check(t.includes('Flood watch: Metro Manila') && t.includes('decision support, not a warning'), 'Flood watch opens with its decision-support notice');
    await page.getByLabel('Reading (m above sea level)').fill('16.4');
    t = await text(page);
    check(t.includes('2nd alarm: Evacuate'), 'A Marikina River reading of 16.4 m reads as the 2nd alarm');
    check(t.includes('geonode:ph137404000_fh100yr_10m'), 'UP NOAH flood hazard layers are listed for the LGUs that have them');
    await page.getByLabel('Assets exposed (₱ million)').fill('1000');
    t = await text(page);
    check(t.includes('Still needed: damage share, events per year, years'), 'The benefit-cost screen names the figures it still needs');

    await page.goto(`${APP}/validation?tab=echo`); await settle(page);
    await page.getByLabel('Marikina: Displaced persons').fill('1200');
    await page.getByLabel('Marikina: Centre floor area (m²)').fill('2800');
    await page.getByLabel('Marikina: Water (L/day)').fill('15000');
    await page.getByLabel('Quezon City: Displaced persons').fill('0');
    await page.getByLabel('Quezon City: Centre floor area (m²)').fill('3500');
    t = await text(page);
    check(t.includes('Marikina → Quezon City: 400 persons'), 'Evacuation intelligence suggests a host in the same district for the shortfall');
    check(t.includes('Not enough covered space') && t.includes('Water below the Sphere planning figure'), 'Gaps are named with their source');
    await page.getByLabel('Add gaps and hosting to an exercise').selectOption(exercise.id);
    await page.getByRole('button', { name: 'Add as checks' }).click(); await settle(page);
    const checks = await (await rest(`ddrive_exercise_checks?select=kind,statement&exercise_id=eq.${exercise.id}`, SERVICE)).json();
    check(checks.some((c) => c.kind === 'coordination' && c.statement.startsWith('Marikina evacuees hosted by Quezon City')) && checks.some((c) => c.statement === 'Marikina: Not enough covered space'),
      'ECHO findings become exercise checks', JSON.stringify(checks));
    check(errors.length === 0, 'Flood watch and ECHO: no page errors', errors.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nValidation (sub-regional): ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
