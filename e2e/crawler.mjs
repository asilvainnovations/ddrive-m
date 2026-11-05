// What Google's OAuth verification (and any crawler) sees: pages loaded with JavaScript off, and the
// Vercel routing in vercel.json resolved against the files the build produced.
// Run with scripts/test_e2e.sh (needs the production build being served on APP_URL and in dist/).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const results = [];
const check = (ok, label, detail = '') => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${String(detail).slice(0, 300)})` : ''}`);
};

// ── vercel.json: the addresses Google checks resolve to real files ───────────
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const toRegex = (source) => new RegExp(`^${source.startsWith('/(') ? source : source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const route = (p) => {
  if (fs.existsSync(path.join(ROOT, 'dist', p)) && fs.statSync(path.join(ROOT, 'dist', p)).isFile()) return p; // files first
  const r = cfg.rewrites.find((x) => toRegex(x.source).test(p));
  return r ? r.destination : null;
};
const expect = {
  '/': '/index.html', '/privacy-policy': '/pages/privacy.html', '/privacy': '/pages/privacy.html', '/terms-of-service': '/pages/terms.html',
  '/cookie-policy': '/pages/cookies.html', '/accessibility-policy': '/pages/accessibility.html', '/ai-ethics': '/pages/ai-ethics.html',
  '/policies': '/pages/policies.html', '/policies/privacy': '/pages/privacy.html', '/dashboard': '/index.html', '/anticipatory-action': '/index.html',
};
const wrong = Object.entries(expect).filter(([p, d]) => (p === '/' ? '/index.html' : route(p)) !== d).map(([p]) => `${p} → ${route(p)}`);
check(wrong.length === 0, 'Every policy and app address routes to the right page on Vercel', wrong.join(', '));
const missing = cfg.rewrites.map((r) => r.destination).filter((d) => !fs.existsSync(path.join(ROOT, 'dist', d)));
check(missing.length === 0, 'Every rewrite points to a file the build produced', missing.join(', '));
check(['/assets/x.js', '/sw.js', '/about.html', '/manifest.webmanifest'].every((p) => !toRegex(cfg.rewrites.at(-1).source).test(p)), 'Files are never rewritten to the app');

// ── Pages with JavaScript off ────────────────────────────────────────────────
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${APP}/`);
  const privacyLinks = await page.locator('a[href="/privacy-policy"]').count();
  check(privacyLinks >= 2, 'Without JavaScript, the Home page links to the privacy policy', privacyLinks);
  const home = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  check(home.includes('DDRiVE-M') && home.includes('Data-Driven Risk and Vulnerability Evaluation and Management'), 'Without JavaScript, the Home page shows the app name and its full name');
  check((await page.title()).startsWith('DDRiVE-M'), 'The Home page title starts with the app name', await page.title());

  await page.goto(`${APP}/pages/privacy.html`);
  const privacy = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const words = privacy.split(' ').length;
  check((await page.locator('h1').innerText()) === 'Privacy Policy' && words > 1500, 'Without JavaScript, the privacy policy has its full text', `${words} words`);
  check(privacy.includes('If you sign in with Google') && privacy.includes('Limited Use') && privacy.includes('myaccount.google.com/permissions'),
    'The privacy policy says what Google data is used, how, and how to revoke it');
  for (const slug of ['terms', 'cookies', 'accessibility', 'ai-ethics']) {
    await page.goto(`${APP}/pages/${slug}.html`);
    check((await page.locator('section').count()) >= 5, `Without JavaScript, the ${slug} page has its sections`);
  }
  await ctx.close();

  // With JavaScript on, the static Home text is replaced by the app at other addresses.
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(`${APP}/support`); await p2.waitForTimeout(1500);
  const t = (await p2.locator('body').innerText());
  check(t.includes('Get help with DDRiVE-M') && !t.includes('The seven risk and resilience intelligence modules'), 'With JavaScript, other addresses show their own page, not the Home text');
  await p2.goto(`${APP}/`); await p2.waitForTimeout(1500);
  await p2.getByRole('button', { name: 'Sign in' }).click(); await p2.waitForTimeout(500);
  const dlg = p2.getByRole('dialog');
  check(await dlg.getByRole('button', { name: 'Continue with Google' }).isVisible(), 'Without a Google Client ID the sign-in window offers Google through Supabase');
  check((await dlg.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')) === '/privacy-policy', 'The sign-in window links to the privacy policy');
  check(await dlg.getByRole('button', { name: 'Forgot your password?' }).isVisible(), 'The sign-in window offers a password reset');
  await p2.goto(`${APP}/reset-password`); await p2.waitForTimeout(1500);
  check((await p2.locator('body').innerText()).includes('This reset link has expired or has already been used'), 'Opening the reset page without a valid link explains what to do');
  await ctx2.close();
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
