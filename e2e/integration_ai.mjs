// Actions linked to incidents and funded from budget lines (ADR-009), and DDRiVER AI end to end through the real
// ddriver-ai Edge Function against a stand-in Claude API (ADR-011). Run by scripts/test_e2e.sh after response.mjs.
import { createRequire } from 'node:module';
import { sign, PUBLISHABLE_KEY } from './fake-supabase.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const FAKE = process.env.FAKE_AGENCY_URL || 'http://127.0.0.1:8099';
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

const LINE = 'Prepositioning of flood-fighting supplies';
const ACTION = 'Buy 2,000 sandbags for the river barangays';
const browser = await chromium.launch();
try {
  // ── Budget lines in Integration ─────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/integration?tab=budget`); await settle(page);
    const t = await text(page);
    check(t.includes('DRRM budget and funded actions') && t.includes('30% Quick Response Fund'), 'Integration shows the DRRM budget, with the LDRRMF rules');
    await page.getByRole('button', { name: 'New budget line' }).click();
    await page.getByLabel('Programme, project or activity (PPA)').fill(LINE);
    await page.getByLabel('Amount, PHP').fill('500000');
    await page.getByLabel('Fund source').selectOption('ldrrmf_70');
    await page.getByLabel('DRRM thematic area (RA 10121)').selectOption('preparedness');
    await page.getByRole('button', { name: 'Add budget line' }).click(); await settle(page);
    const l = await one(`ddrive_budget_lines?select=*&title=eq.${encodeURIComponent(LINE)}`);
    check(l?.status === 'draft' && /^B-\d{3}$/.test(l.ref) && Number(l.amount_php) === 500000, 'An analyst adds a draft line with a server reference', JSON.stringify(l));
    check(errors.length === 0, 'Integration (analyst): no page errors', errors.join(' | '));
    await ctx.close();
  }
  // An approved action with a cost, as Response would produce.
  const analyst = await tokenFor('analyst@a.ph');
  await rest('ddrive_response_actions', analyst, { method: 'POST', body: JSON.stringify({ title: ACTION, origin: 'manual', strategy: 'reduce_consequences', drrm_area: 'preparedness', cost_php: 200000 }) });
  const act = await one(`ddrive_response_actions?select=id&title=eq.${encodeURIComponent(ACTION)}`);
  const admin = await tokenFor('admin@a.ph');
  await fetch(`${API}/rest/v1/rpc/ddrive_response_decide`, { method: 'POST', headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_id: act.id, p_approve: true, p_note: null }) });
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/integration?tab=budget`); await settle(page);
    const card = page.locator('li', { has: page.getByText(LINE, { exact: true }) });
    await card.getByLabel('Approval basis (Sanggunian resolution, approved AIP)').fill('SP Resolution No. 12, s. 2026 (AIP)');
    await card.getByRole('button', { name: 'Approve' }).click(); await settle(page);
    check((await one(`ddrive_budget_lines?select=status&title=eq.${encodeURIComponent(LINE)}`))?.status === 'approved', 'The officer approves the line, citing the resolution');
    const waiting = page.locator('li', { has: page.getByRole('link', { name: new RegExp(ACTION) }) });
    check(await waiting.count() === 1, 'The approved action is listed as waiting for funding');
    const lineId = (await one(`ddrive_budget_lines?select=id&title=eq.${encodeURIComponent(LINE)}`)).id;
    await waiting.getByLabel(`Budget line for ${ACTION}`).selectOption(lineId);
    await waiting.getByRole('button', { name: 'Fund' }).click(); await settle(page);
    const funded = await one(`ddrive_response_actions?select=budget_line_id&id=eq.${act.id}`);
    check(!!funded?.budget_line_id, 'The officer funds it from the line', JSON.stringify(funded));
    const t = await text(page);
    // The browser formats pesos as "₱200,000" (en-PH); older ICU data writes "PHP 200,000".
    check(/(PHP|₱)\s?200,000 committed to 1 action/.test(t) && /(PHP|₱)\s?300,000 available/.test(t), 'The line shows PHP 200,000 committed and PHP 300,000 available', t.match(/(PHP|₱)\s?500,000 budgeted.{0,80}/)?.[0]);
    check(errors.length === 0, 'Integration (officer): no page errors', errors.join(' | '));
    await ctx.close();
  }
  // ── Incident link in Response ───────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'responder@a.ph');
    await page.goto(`${APP}/response?tab=incidents`); await settle(page);
    await page.getByRole('button', { name: 'New incident' }).click();
    await page.getByLabel('What is happening').fill('Typhoon Bising: river barangays flooding');
    await page.getByLabel('Priority').selectOption('Critical');
    await page.getByRole('button', { name: 'Open incident' }).click(); await settle(page);
    const inc = await one(`ddrive_incidents?select=id,ref&title=eq.${encodeURIComponent('Typhoon Bising: river barangays flooding')}`);
    check(/^I-\d{3}$/.test(inc?.ref ?? ''), 'A responder opens an incident from the screen', JSON.stringify(inc));
    await page.goto(`${APP}/response?tab=actions&action=${act.id}`); await settle(page);
    const card = page.locator(`#action-${act.id}`);
    check((await card.innerText()).includes(LINE), 'The action card shows the budget line that funds it');
    await card.getByLabel(`Incident for ${ACTION}`).selectOption(inc.id);
    await card.getByRole('button', { name: 'Link to incident' }).click(); await settle(page);
    check((await one(`ddrive_response_actions?select=incident_id&id=eq.${act.id}`))?.incident_id === inc.id, 'The responder links the action to the incident');
    await page.goto(`${APP}/response?tab=incidents`); await settle(page);
    check((await page.locator(`#incident-${inc.id}`).innerText()).includes('1 action'), 'The incident card lists the action');
    check(errors.length === 0, 'Response (responder): no page errors', errors.join(' | '));
    await ctx.close();
  }

  // ── DDRiVER AI ──────────────────────────────────────────────────────────────
  const noSession = await fetch(`${API}/functions/v1/ddriver-ai`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' }, body: '{"task":"ask","question":"hello there"}' });
  check(noSession.status === 401, 'The AI function refuses callers without a session', noSession.status);
  const forged = await fetch(`${API}/functions/v1/ddriver-ai`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, authorization: `Bearer ${(await tokenFor('analyst@a.ph')).slice(0, -4)}AAAA`, 'content-type': 'application/json' }, body: '{"task":"ask","question":"hello there"}' });
  check(forged.status === 401, 'and with a forged session token', forged.status);
  const offAnswer = await fetch(`${API}/functions/v1/ddriver-ai`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, authorization: `Bearer ${analyst}`, 'content-type': 'application/json' }, body: '{"task":"ask","question":"What is the QRF?"}' });
  check(offAnswer.status === 403 && /off for your organisation/.test((await offAnswer.json()).error), 'It refuses while the organisation has not turned it on');
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/settings?section=ai`); await settle(page);
    const t = await text(page);
    check(t.includes("Anthropic's Claude API") && t.includes('kept 90 days'), 'Settings explains what is sent and kept before it is turned on');
    check(await page.getByRole('button', { name: 'Turn on DDRiVER AI' }).isDisabled(), 'Turning it on needs the acknowledgement');
    await page.getByLabel(/I have read the above/).check();
    await page.getByRole('button', { name: 'Turn on DDRiVER AI' }).click(); await settle(page);
    check((await text(page)).includes('Status for your organisation: On'), 'The administrator turns DDRiVER AI on');
    check(errors.length === 0, 'Settings: no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/assistant`); await settle(page);
    await page.getByLabel('Message DDRiVER AI').first().fill('Which approved actions are not funded?');
    await page.getByRole('button', { name: 'Send' }).first().click(); await settle(page, 4000);
    const t = await text(page);
    check(/Situation: \d+ records were provided/.test(t), 'DDRiVER AI answers in the assistant', t.slice(0, 300));
    check(t.includes('Sources') && /S1 \S/.test(t), 'The answer lists the sources it cites');
    check(t.includes('1 citation to sources that were not provided was removed'), 'A citation to a source that was not given is removed, and the reader is told');
    check(!t.includes('[S99]') && !t.includes('S99'), 'The invented citation is not shown');
    check(t.includes("AI-generated decision support") && t.includes('claude-sonnet-5-5'), 'The answer is labelled as AI output, with the model');
    const last = (await (await fetch(`${FAKE}/anthropic/last`)).json()).last;
    check(last?.model === 'claude-sonnet-5-5' && String(last.system).includes('<source key="S1"'), 'The model received the sources, numbered', last?.model);
    check(String(last.system).includes(ACTION), 'The sources were read with the analyst\'s own access: the organisation\'s actions are there');
    check(!/@[ab]\.ph/.test(String(last.system) + JSON.stringify(last.messages)), 'No member email address was sent to the model');
    check(!String(last.system).includes('B warehouse'), 'Nothing from another organisation was sent');
    const log = (await (await rest('ddrive_ai_log?select=task,model,unverified_citations,ok,input_tokens&order=created_at.desc&limit=1', analyst)).json())[0];
    check(log?.ok === true && log.unverified_citations === 1 && log.input_tokens === 1234, 'The answer is logged with the model, token use and the removed citation', JSON.stringify(log));
    await page.getByRole('button', { name: 'Helpful', exact: true }).click(); await settle(page, 800);
    check((await one('ddrive_ai_log?select=feedback&order=created_at.desc&limit=1'))?.feedback === 'helpful', 'The analyst rates the answer');

    await page.goto(`${APP}/dashboard`); await settle(page);
    await page.getByRole('button', { name: 'Situation brief from DDRiVER AI' }).click(); await settle(page, 4000);
    check(/DDRiVER AI, decision support/i.test(await text(page)), 'The dashboard gives a situation brief on request'); // the label is shown in capitals

    await page.goto(`${APP}/diagnosis?tab=register`); await settle(page);
    const row = page.locator('tr', { has: page.getByText('City hall archive floods') });
    const strip = row.locator('xpath=following-sibling::tr[1]');
    await strip.getByRole('button', { name: '+ Propose action' }).click();
    await strip.getByRole('button', { name: 'Draft options with DDRiVER AI' }).click(); await settle(page, 4000);
    const s = await strip.innerText();
    check(s.includes('Move the archive above the 2013 flood line') && !s.includes('Order evacuation now'), 'DDRiVER AI drafts treatment options; an option outside the allowed treatments is dropped');
    await strip.getByRole('button', { name: 'Use this draft' }).first().click();
    check((await strip.getByLabel('Action', { exact: true }).inputValue()) === 'Move the archive above the 2013 flood line', 'Choosing a draft fills the form for the person to edit');
    await strip.getByRole('button', { name: 'Propose action', exact: true }).click(); await settle(page);
    const drafted = await one(`ddrive_response_actions?select=status,ai_assisted&title=eq.${encodeURIComponent('Move the archive above the 2013 flood line')}`);
    check(drafted?.status === 'proposed' && drafted.ai_assisted === true, 'The proposal is marked as AI-assisted and still waits for a decision', JSON.stringify(drafted));
    check(errors.length === 0, 'DDRiVER AI screens: no page errors', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx } = await pageAs(browser, 'admin@b.ph');
    await page.goto(`${APP}/dashboard`); await settle(page);
    check(await page.getByRole('button', { name: 'Situation brief from DDRiVER AI' }).count() === 0, 'In an organisation that has not turned it on, no AI buttons appear');
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nintegration and AI: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
