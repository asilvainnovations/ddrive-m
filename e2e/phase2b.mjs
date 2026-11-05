// Browser tests for the public site (Home, policies, help), the PWA files and the RA 12287 anticipatory
// action workflow. Run with scripts/test_e2e.sh after phase2.mjs (same database; PAGASA alerts are in force).
import { createRequire } from 'node:module';
import { sign } from './fake-supabase.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const API = process.env.API_URL || 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_JWT || sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 });
const SHOTS = process.env.SCREENSHOT_DIR;

const results = [];
const check = (ok, label, detail = '') => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${String(detail).slice(0, 300)})` : ''}`);
};
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const settle = (page, ms = 2000) => page.waitForTimeout(ms);
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

async function userId(email) {
  const r = await fetch(`${API}/rest/v1/ddrive_users?select=id&email=eq.${encodeURIComponent(email)}`, { headers: { authorization: `Bearer ${SERVICE}` } });
  return (await r.json())[0]?.id;
}
async function pageAs(browser, email, viewport = { width: 1366, height: 1000 }) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  if (email) {
    const id = await userId(email);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const session = {
      access_token: sign({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp }), refresh_token: 'unused',
      token_type: 'bearer', expires_in: 3600, expires_at: exp,
      user: { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} },
    };
    await ctx.addInitScript((s) => { try { localStorage.setItem('sb-127-auth-token', JSON.stringify(s)); } catch { /* opaque frame */ } }, session);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, ctx, errors };
}

const browser = await chromium.launch();
try {
  // ── Home and navigation, signed out ─────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, null);
    await page.goto(`${APP}/`); await settle(page);
    const t = await text(page);
    check(t.includes('Disaster resilience intelligence for LGUs, enterprises and development institutions'), 'Home is the first page');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const labels = ['Dashboard', 'About', 'FAQ', 'Support', 'Resources', 'Policies', 'Pricing', 'Contact'];
    const missing = [];
    for (const l of labels) if ((await nav.getByRole('link', { name: l, exact: true }).count()) === 0) missing.push(l);
    check(missing.length === 0, 'The main navigation links Dashboard, About, FAQ, Support, Resources, Policies, Pricing and Contact', missing.join(', '));
    check(await page.getByRole('button', { name: 'Sign in' }).isVisible(), 'Sign in is in the header');
    check(!/120\+|98%|hundreds of organizations/i.test(t), 'Home makes no unsourced claims about users or compliance rates');
    check(t.includes('relays official warnings; it does not issue them'), 'Home says DDRiVE-M relays, not issues, warnings');
    check((await page.locator('iframe[src*="youtube"]').count()) === 0, 'The video is not loaded until someone presses play');
    await page.getByRole('button', { name: /Play the DDRiVE-M video/ }).click(); await settle(page, 500);
    check((await page.locator('iframe[src*="youtube-nocookie.com"]').count()) === 1, 'Pressing play loads the privacy-enhanced player');

    const logo = page.getByRole('link', { name: 'DDRiVE-M home' }).first();
    check((await logo.getAttribute('href')) === '/', 'The logo links to Home');
    const radius = await logo.locator('span').first().evaluate((el) => getComputedStyle(el).borderRadius);
    check(/9999px|50%/.test(radius), 'The logo is circular', radius);
    await shot(page, 'home');

    await page.getByRole('button', { name: 'Sign in' }).click(); await settle(page, 500);
    check((await page.getByRole('dialog').count()) > 0, 'Sign in opens the sign-in window');
    check(errors.length === 0, 'No page errors on Home', errors.join(' | '));
    await ctx.close();
  }

  // ── Policies ────────────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, null);
    await page.goto(`${APP}/policies`); await settle(page);
    let t = await text(page);
    const titles = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Accessibility Statement', 'AI Ethics and Governance Policy'];
    check(titles.every((x) => t.includes(x)), 'The policies page lists all five policies');
    for (const [slug, title] of [['privacy', 'Privacy Policy'], ['terms', 'Terms of Service'], ['cookies', 'Cookie Policy'], ['accessibility', 'Accessibility Statement'], ['ai-ethics', 'AI Ethics and Governance Policy']]) {
      await page.goto(`${APP}/policies/${slug}`); await settle(page, 1000);
      t = await text(page);
      check(t.includes(title) && t.includes('In short') && t.includes('draft under legal and privacy review'), `${title} opens, with its summary and the review notice`);
    }
    await page.goto(`${APP}/policies/privacy`); await settle(page, 1000);
    check((await page.locator('mark', { hasText: 'to be confirmed' }).count()) >= 2, 'Unconfirmed facts in the Privacy Policy are highlighted, not guessed');
    t = await text(page);
    check(t.includes('Supabase') && !/Stripe|Hotjar|Privacy Shield|ISO 27001 Certified/i.test(t), 'The Privacy Policy names DDRiVE-M’s real processors and none it does not use');
    await shot(page, 'privacy');
    await page.goto(`${APP}/privacy-policy`); await settle(page, 1000);
    check(page.url().endsWith('/policies/privacy'), 'The old privacy-policy address redirects');
    await page.goto(`${APP}/policies/ai-ethics`); await settle(page, 1000);
    t = await text(page);
    check(t.includes('Alvin Silva') && t.includes('not connected yet'), 'The AI policy is signed and says plainly that DDRiVER AI is not connected yet');
    for (const p of ['support', 'resources', 'contact']) {
      await page.goto(`${APP}/${p}`); await settle(page, 1000);
      check((await page.getByRole('heading', { level: 1 }).count()) === 1, `The ${p} page opens`);
    }
    check(await page.getByRole('button', { name: 'Write the email' }).isVisible(), 'The contact form writes an email instead of collecting data');
    check(errors.length === 0, 'No page errors on the policy and help pages', errors.join(' | '));
    await ctx.close();
  }

  // ── Phone layout ────────────────────────────────────────────────────────────
  {
    const { page, ctx } = await pageAs(browser, null, { width: 390, height: 844 });
    await page.goto(`${APP}/`); await settle(page);
    await page.getByRole('button', { name: 'Open menu' }).click();
    check(await page.locator('#site-menu').getByRole('link', { name: 'Policies' }).isVisible(), 'On a phone the menu opens with the same links');
    await ctx.close();
  }

  // ── PWA files ───────────────────────────────────────────────────────────────
  {
    const m = await (await fetch(`${APP}/manifest.webmanifest`)).json().catch(() => ({}));
    check(m.short_name === 'DDRiVE-M' && m.start_url === '/dashboard' && m.icons?.length === 3, 'The app manifest names the app, starts at the dashboard and lists its icons');
    const sw = await fetch(`${APP}/sw.js`).then((r) => r.text()).catch(() => '');
    check(sw.includes('precache') && !sw.includes('54321') && !/rest\/v1/.test(sw.replace('/^\\/rest\\//', '')), 'The service worker caches app files and no database responses');
  }

  // ── Anticipatory action, end to end ─────────────────────────────────────────
  {
    const { page, ctx, errors } = await pageAs(browser, 'analyst@a.ph');
    await page.goto(`${APP}/dashboard`); await settle(page);
    check(await page.getByRole('button', { name: /Anticipatory Action/ }).isVisible(), 'The sidebar lists Anticipatory Action');
    await page.goto(`${APP}/detection`); await settle(page, 2500);
    await page.getByRole('button', { name: /All Philippines/ }).click().catch(() => {}); await settle(page, 500);
    const start = page.getByRole('link', { name: 'Start anticipatory action' }).first();
    check(await start.isVisible(), 'An analyst can start anticipatory action from an official alert');
    await start.click(); await settle(page, 2500);
    const title = await page.getByLabel('Case name').inputValue();
    check(/Wind Signal|Flood|Warning|Advisory/i.test(title), 'The case form is filled in from the alert', title);
    await page.getByRole('button', { name: 'Open case' }).click(); await settle(page, 2000);
    let t = await text(page);
    check(/A-\d{3}/.test(t) && t.includes('Forecast received'), 'The case is opened with a server reference number');
    await page.getByRole('button', { name: new RegExp(title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click(); await settle(page, 1500);
    await page.getByLabel(/\(a\) The forecast hazard is classified as severe/).check();
    await page.getByLabel(/\(b\) There is enough lead time/).check();
    await page.getByLabel('People exposed (optional)').fill('48000');
    await page.getByLabel('Basis: sources and reasoning').fill('PAGASA alert and storm surge outlook; exposure from the 2020 census');
    await page.getByRole('button', { name: 'Record assessment' }).click(); await settle(page, 2000);
    t = await text(page);
    check(t.includes('Recommend a declaration') && /lead time \d/.test(t), 'The assessment is recorded with the lead time the server worked out');
    check(t.includes('Needs the DRRM officer role'), 'The analyst cannot take the recommendation step, and is told why');
    await shot(page, 'aa-assessed');
    check(errors.length === 0, 'No page errors for the analyst', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
    await page.goto(`${APP}/anticipatory-action`); await settle(page);
    await page.locator('nav[aria-label="Cases"] button').first().click(); await settle(page, 1500);
    await page.getByLabel('Recommending council').fill('Regional DRRM Council VIII');
    const letter = await page.getByLabel(/Request to the declaring official/).inputValue();
    check(letter.includes('Regional DRRM Council VIII') && letter.includes('section 6(a)'), 'A draft request to the declaring official is prepared from the assessment');
    await page.getByRole('button', { name: 'Record the recommendation' }).click(); await settle(page, 2000);
    await page.getByLabel('Declared by').fill('Hon. A. Reyes');
    await page.getByLabel('Position').fill('City Mayor');
    await page.getByLabel('Executive order number').fill('EO 2026-41');
    await page.getByRole('button', { name: 'Record the declaration' }).click(); await settle(page, 2000);
    let t = await text(page);
    check(t.includes('State of Imminent Disaster declared') && t.includes('EO 2026-41'), 'The declaration is recorded with its executive order');

    await page.getByLabel('What will be done').fill('Pre-emptive evacuation of coastal barangays');
    await page.getByLabel('Measure (section 9)').selectOption('preemptive_evacuation');
    await page.getByLabel('Fund source (section 10)').selectOption('ldrrmf');
    await page.getByLabel('Amount allotted (PHP)').fill('100000');
    await page.getByRole('button', { name: 'Add measure' }).click(); await settle(page, 2000);
    await page.getByLabel(/Disbursed for Pre-emptive evacuation/).fill('80000');
    await page.getByRole('button', { name: 'Save' }).click(); await settle(page, 2000);
    const saved = await (await fetch(`${API}/rest/v1/ddrive_aa_actions?select=disbursed_php&measure=eq.preemptive_evacuation`, { headers: { authorization: `Bearer ${SERVICE}` } })).json();
    check(Number(saved[0]?.disbursed_php) === 80000, 'A disbursement is recorded under the declaration', JSON.stringify(saved));

    await page.getByRole('button', { name: 'Record the lifting' }).click(); await settle(page, 2000);
    t = await text(page);
    check(t.includes('Lifted automatically when the hazard occurred'), 'Lifting when the hazard occurs is recorded');
    check(/20,000/.test(t) && t.includes('Special Trust Fund'), 'The report shows unused funds and where they go under section 11');
    await page.getByRole('button', { name: 'Submit report and close' }).click(); await settle(page, 2000);
    t = await text(page);
    check(t.includes('Closed, report submitted'), 'Submitting the report closes the case');
    await shot(page, 'aa-closed');
    check(errors.length === 0, 'No page errors for the administrator', errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx } = await pageAs(browser, 'viewer@a.ph');
    await page.goto(`${APP}/anticipatory-action`); await settle(page);
    const t = await text(page);
    check(/A-\d{3}/.test(t) && !(await page.getByRole('button', { name: 'Open a case' }).count()), 'A viewer can follow cases but not open one');
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
