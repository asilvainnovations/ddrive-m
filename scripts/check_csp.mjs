// Checks the Content-Security-Policy in vercel.json against the built app (ADR-018):
// every inline script in the app's HTML must be allowed by its SHA-256 hash, and the strict policy must cover the
// app routes. Run after `npm run build` (part of `npm run check`). Prints the hash to add when the script changes.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const policyFor = (source) => vercel.headers.find((h) => h.source === source)?.headers.find((x) => x.key === 'Content-Security-Policy')?.value;
const strict = policyFor('/((?!.*\\.).*)');
const problems = [];
if (!strict) problems.push('vercel.json has no Content-Security-Policy for the app routes /((?!.*\\.).*)');
if (strict && policyFor('/pages/(.*)') !== strict) problems.push('The prerendered pages (/pages/*) must use the same policy as the app routes');
if (strict && policyFor('/index.html') !== strict) problems.push('/index.html must use the same policy as the app routes');

const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('Build first: dist/index.html is missing'); process.exit(1); }
const files = ['index.html', ...readdirSync(join(dist, 'pages')).filter((f) => f.endsWith('.html')).map((f) => join('pages', f))];
const scriptSrc = (strict ?? '').split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) ?? '';
for (const f of files) {
  const html = readFileSync(join(dist, f), 'utf8');
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] ?? '';
    if (/\ssrc=/.test(attrs)) continue;                                   // external file: covered by 'self'
    const type = /type="([^"]+)"/.exec(attrs)?.[1];
    if (type && type !== 'module' && type !== 'text/javascript') continue; // data blocks (JSON-LD) are not run
    const hash = `'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`;
    if (!scriptSrc.includes(hash)) problems.push(`${f}: inline script not allowed by the policy; add ${hash} to script-src`);
  }
}
for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'"]) if (strict && !strict.includes(d)) problems.push(`The policy lacks ${d}`);
if (strict && /script-src[^;]*'unsafe-(inline|eval)'/.test(strict)) problems.push("The app policy must not allow 'unsafe-inline' or 'unsafe-eval' scripts");

if (problems.length) { console.error(problems.map((p) => `CSP: ${p}`).join('\n')); process.exit(1); }
console.log(`CSP: ${files.length} HTML files checked; inline scripts allowed by hash only`);
