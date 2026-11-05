#!/usr/bin/env node
// Writes real HTML for the Home page and the policies into dist/, after `vite build`.
//
// DDRiVE-M is a single-page app: without this, the HTML that crawlers download (Google's OAuth
// verification, search engines, link previews) is an empty shell with no text and no links. Each page
// written here carries its full text and the same app scripts, so people still get the app: React
// replaces the static content when it starts.
//
//   dist/index.html            Home (also the shell for every app route; see the guard below)
//   dist/pages/<slug>.html     each policy, served at /privacy-policy, /terms-of-service, … (vercel.json)
//   dist/pages/policies.html   the policies index
//
// Content comes from src/content/legal and src/lib/brand.ts, the same files the app renders.
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');

async function load(entry) {
  const out = await build({ entryPoints: [path.join(ROOT, entry)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

const { POLICIES, LEGAL_FACTS } = await load('src/content/legal/index.ts');
const { TO_CONFIRM } = await load('src/content/legal/facts.ts');
const brand = await load('src/lib/brand.ts');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (s) => esc(s).split(esc(TO_CONFIRM)).join(`<mark>${esc(TO_CONFIRM)}</mark>`);
const date = (iso) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });

// Fixed addresses for each policy (the first is canonical). vercel.json maps them all to the page.
export const POLICY_PATHS = {
  privacy: ['/privacy-policy', '/privacy', '/policies/privacy'],
  terms: ['/terms-of-service', '/terms', '/policies/terms'],
  cookies: ['/cookie-policy', '/policies/cookies'],
  accessibility: ['/accessibility-policy', '/policies/accessibility'],
  'ai-ethics': ['/ai-ethics', '/policies/ai-ethics'],
};

const NAV = [
  ['Dashboard', '/dashboard'], ['About', '/about.html'], ['FAQ', '/faq.html'], ['Support', '/support'], ['Resources', '/resources'],
  ['Policies', '/policies'], ['Pricing', '/pricing.html'], ['Contact', '/contact'], ['Sign in', '/dashboard'],
];

const STYLE = `<style>
.pr{font-family:Poppins,system-ui,sans-serif;color:#0f172a;background:#f8fafc;line-height:1.6}
.pr a{color:#1d4ed8}.pr header{background:#fff;border-bottom:1px solid #e2e8f0}
.pr .w{max-width:72rem;margin:0 auto;padding:0 1rem}.pr .bar{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1rem;padding:.75rem 0}
.pr .brand{display:flex;align-items:center;gap:.5rem;font-weight:700;font-size:1.25rem;color:#0f172a;text-decoration:none}
.pr .brand img{width:40px;height:40px;border-radius:9999px;object-fit:cover;border:2px solid #fcd34d}
.pr nav a{margin-right:.75rem;text-decoration:none;color:#334155;font-size:.95rem}
.pr .hero{background:linear-gradient(135deg,#1e3a8a,#0c4a6e);color:#fff;text-align:center;padding:3rem 1rem}
.pr .hero a{color:#fff}.pr .hero p{color:#dbeafe;max-width:48rem;margin:1rem auto}
.pr h1{font-size:2rem;line-height:1.2;margin:.5rem 0}.pr h2{color:#1e40af;font-size:1.35rem;margin:2rem 0 .75rem}
.pr main{padding:2rem 0}.pr table{border-collapse:collapse;width:100%;background:#fff;margin:1rem 0}
.pr th,.pr td{border:1px solid #e2e8f0;padding:.5rem .75rem;text-align:left;vertical-align:top}.pr thead th{background:#1e40af;color:#fff}
.pr .note{border:1px solid #f59e0b;background:#fffbeb;padding:.75rem 1rem;border-radius:.75rem}
.pr mark{background:#fef3c7;padding:0 .25rem}.pr footer{background:#0f172a;color:#cbd5e1;padding:2rem 0;margin-top:3rem}
.pr footer a{color:#e2e8f0;margin-right:1rem}
</style>`;

const header = () => `<header><div class="w bar">
  <a class="brand" href="/" aria-label="DDRiVE-M home"><img src="/icons/ddrive-m-logo-512.png" onerror="this.onerror=null;this.src='${esc(brand.LOGO_SOURCE_URL)}'" alt="" width="40" height="40">DDRiVE-M</a>
  <nav aria-label="Main">${NAV.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}</nav>
</div></header>`;

const footer = () => `<footer><div class="w">
  <p><strong>DDRiVE-M</strong> (${esc(brand.SITE_FULL_NAME)}) is a product of ${esc(LEGAL_FACTS.publisher)}, ${esc(LEGAL_FACTS.address)}.</p>
  <p><a href="/privacy-policy">Privacy Policy</a><a href="/terms-of-service">Terms of Service</a><a href="/cookie-policy">Cookie Policy</a><a href="/accessibility-policy">Accessibility</a><a href="/ai-ethics">AI Ethics and Governance</a><a href="/contact">Contact</a></p>
  <p>Contact: <a href="mailto:${esc(LEGAL_FACTS.generalEmail)}">${esc(LEGAL_FACTS.generalEmail)}</a> · ${esc(LEGAL_FACTS.phone)}</p>
  <p>DDRiVE-M relays official warnings; it does not issue them. Follow PAGASA, PHIVOLCS and your local DRRM office.</p>
</div></footer>`;

function block(b) {
  if (b.p) return `<p>${txt(b.p)}</p>`;
  if (b.ul) return `<ul>${b.ul.map((li) => `<li>${txt(li)}</li>`).join('')}</ul>`;
  if (b.note) return `<p class="note">${txt(b.note)}</p>`;
  const { head, rows } = b.table;
  const thead = head.some(Boolean) ? `<thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>` : '';
  return `<table>${thead}<tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${txt(c)}</th>` : `<td>${txt(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
}

function policyBody(p) {
  return `<div class="pr">${header()}
<section class="hero"><p>Policies</p><h1>${esc(p.title)}</h1><p>Effective ${date(p.effective)} · Last updated ${date(p.updated)}</p></section>
<main class="w">
${LEGAL_FACTS.reviewed ? '' : `<p class="note">This policy is a draft under legal and privacy review. Details marked <mark>${esc(TO_CONFIRM)}</mark> are being confirmed.</p>`}
<h2>In short</h2><ul>${p.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
${p.sections.map((s) => `<section id="${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.blocks.map(block).join('\n')}</section>`).join('\n')}
${p.signoff ? `<p>Signed,<br><strong>${esc(p.signoff.name)}</strong><br>${esc(p.signoff.role)}</p>` : ''}
<p>Other policies: ${POLICIES.filter((o) => o.slug !== p.slug).map((o) => `<a href="${POLICY_PATHS[o.slug][0]}">${esc(o.title)}</a>`).join(' · ')}</p>
</main>${footer()}</div>`;
}

const MODULES = [
  ['Detection', 'Official PAGASA wind signals and flood advisories, with their source, issue time and expiry, flagged for the provinces you watch.'],
  ['Diagnosis', 'An ISO 31000-aligned risk register rated against your organisation’s own criteria.'],
  ['Response', 'Risk treatments and incident management, and anticipatory action under RA 12287, from forecast trigger to the report to OCD.'],
  ['Integration', 'The UNDRR Ten Essentials resilience scorecard, tracked year to year.'],
  ['Validation', 'Scenario-based exercises and the ICS simulator for Emergency Operations Center procedures.'],
  ['Enhancement', 'DRRM, contingency, continuity and recovery plan drafts aligned with RA 10121, ISO 22301 and the PSCP guide.'],
  ['Monitoring', 'A coordination hub for your team during assessments and events.'],
];

function homeBody() {
  return `<div class="pr">${header()}
<section class="hero">
  <p><strong>DDRiVE-M</strong> · ${esc(brand.SITE_FULL_NAME)}</p>
  <h1>Disaster resilience intelligence for LGUs, enterprises and development institutions</h1>
  <p>DDRiVE-M (${esc(brand.SITE_FULL_NAME)}) is one platform for the whole disaster risk reduction and management cycle, from detection to recovery, built around RA 10121, RA 12287, ISO 31000 and the UNDRR frameworks. It is published by ${esc(LEGAL_FACTS.publisher)}.</p>
  <p><a href="/dashboard">Open the dashboard</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/terms-of-service">Terms of Service</a></p>
</section>
<main class="w">
  <h2>The seven risk and resilience intelligence modules</h2>
  <ol>${MODULES.map(([n, d]) => `<li><strong>${n}</strong>: ${esc(d)}</li>`).join('')}</ol>
  <h2>Your data</h2>
  <p>Each organisation sees only its own records, enforced in the database. DDRiVE-M does not sell personal information or use it for advertising. You can sign in with your email address or with Google; read the <a href="/privacy-policy">Privacy Policy</a> to see exactly what DDRiVE-M collects and why.</p>
</main>${footer()}</div>`;
}

// When this HTML is served for another address (every app route falls back to index.html), show the
// loading line instead of the Home text until the app starts. Crawlers, which do not run scripts, see
// the full text.
const guard = (paths) =>
  `<script>(function(){var p=location.pathname.replace(/\\/+$/,'')||'/';if(${JSON.stringify(paths)}.indexOf(p)<0){document.getElementById('root').innerHTML='<div class="boot" role="status">Loading DDRiVE-M…</div>'}})()</script>`;

function page(template, { title, description, canonical, body, paths }) {
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}" />`);
  html = html.replace('</head>', `    <link rel="canonical" href="${brand.SITE_URL}${canonical}" />\n    <link rel="privacy-policy" href="${brand.SITE_URL}/privacy-policy" />\n    <link rel="terms-of-service" href="${brand.SITE_URL}/terms-of-service" />\n    ${STYLE}\n  </head>`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div><\/div>|<div id="root">[\s\S]*?<\/div>\s*(?=<noscript>)/, `<div id="root">${body}</div>${paths ? guard(paths) : ''}`);
  if (!html.includes(body.slice(0, 40))) throw new Error(`prerender: could not place the content for ${canonical}`);
  return html;
}

const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
if (!template.includes('<div id="root">')) throw new Error('prerender: dist/index.html has no #root; run vite build first');
await fs.mkdir(path.join(DIST, 'pages'), { recursive: true });

const written = [];
for (const p of POLICIES) {
  const file = path.join(DIST, 'pages', `${p.slug}.html`);
  await fs.writeFile(file, page(template, {
    title: `${p.title} | DDRiVE-M`,
    description: `${p.summary} DDRiVE-M (${brand.SITE_FULL_NAME}), by ${LEGAL_FACTS.publisher}.`,
    canonical: POLICY_PATHS[p.slug][0],
    body: policyBody(p),
  }));
  written.push(`pages/${p.slug}.html`);
}
await fs.writeFile(path.join(DIST, 'pages', 'policies.html'), page(template, {
  title: 'Policies | DDRiVE-M',
  description: 'Privacy, terms, cookies, accessibility and AI ethics policies for DDRiVE-M.',
  canonical: '/policies',
  body: `<div class="pr">${header()}<section class="hero"><h1>Policies</h1></section><main class="w"><ul>${POLICIES.map((p) => `<li><a href="${POLICY_PATHS[p.slug][0]}">${esc(p.title)}</a>: ${esc(p.summary)}</li>`).join('')}</ul></main>${footer()}</div>`,
}));
written.push('pages/policies.html');
await fs.writeFile(path.join(DIST, 'index.html'), page(template, {
  title: `DDRiVE-M | ${brand.SITE_FULL_NAME}`,
  description: `DDRiVE-M (${brand.SITE_FULL_NAME}): disaster risk reduction, anticipatory action and continuity planning for Philippine LGUs and organisations.`,
  canonical: '/',
  body: homeBody(),
  paths: ['/', '/index.html'],
}));
written.push('index.html (Home)');
console.log(`prerender: wrote ${written.join(', ')}`);
