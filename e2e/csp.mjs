// Content-Security-Policy (ADR-018): the test server sends the production policy (with the local test origins),
// and every main screen runs under it with no violation. Run by scripts/test_e2e.sh after eoc.mjs.
import { createRequire } from 'node:module';
import { sign } from './fake-supabase.mjs';
import { testPolicy } from '../scripts/csp_for_tests.mjs';
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

const policy = testPolicy(API);
check(!policy.includes('supabase.co') && policy.includes(API), 'The production policy is used, with only the test origins swapped in');
const served = (await fetch(`${APP}/dashboard`)).headers.get('content-security-policy');
check(served === policy, 'The test server sends that policy with the app (every browser suite runs under it)', served);

const browser = await chromium.launch();
try {
  const { page, ctx, errors } = await pageAs(browser, 'admin@a.ph');
  const violations = [];
  await ctx.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window.__csp ||= []).push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile ?? ''}:${e.lineNumber ?? ''}`);
    });
  });
  await ctx.route('https://noah.up.edu.ph/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>NOAH stub</p>' }));
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  const visit = async (path, then) => {
    await page.goto(`${APP}${path}`); await settle(page, 1500);
    if (then) {
      try { await then(); await settle(page, 1200); }
      catch (e) { violations.push(`${path}: could not run the step (${String(e.message).split('\n')[0]}); page shows: ${(await text(page)).slice(250, 600)}`); }
    }
    violations.push(...((await page.evaluate(() => window.__csp ?? [])).map((v) => `${path}: ${v}`)));
  };
  await visit('/');
  await visit('/dashboard', () => page.getByRole('button', { name: 'Show the map here' }).click());
  await visit('/detection', () => page.getByRole('button', { name: 'Show the loop' }).click());
  for (const p of ['/diagnosis', '/response?tab=eoc', '/response?tab=actions', '/rapid-mapping', '/integration', '/validation', '/enhancement?tab=templates',
    '/monitoring', '/documents', '/assistant', '/settings', '/policies/privacy', '/pages/privacy.html']) await visit(p);
  const sat = await page.goto(`${APP}/detection`).then(() => settle(page)).then(() => page.getByRole('button', { name: 'Show the loop' }).click()).then(() => settle(page))
    .then(() => page.locator('img[alt^="Himawari"]').evaluate((img) => img.complete && img.naturalWidth > 0)).catch(() => false);
  check(sat, 'Satellite images load under the policy');
  check(violations.length === 0, 'No Content-Security-Policy violation on any main screen', violations.slice(0, 5).join(' | '));
  check(errors.length === 0, 'No page errors under the policy', errors.join(' | '));
  await ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nCSP: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
