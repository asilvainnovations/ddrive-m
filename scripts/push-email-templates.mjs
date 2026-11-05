#!/usr/bin/env node
// Uploads the six DDRiVE-M auth email templates (supabase/templates/*.html) and their subjects
// (supabase/templates/subjects.json) to the hosted Supabase project, through the Management API.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-email-templates.mjs [project-ref]
//
// The access token is a personal token from https://supabase.com/dashboard/account/tokens. Keep it out
// of the repository and out of Vercel. Only the template and subject settings are changed.
// Alternative without a token: paste each file into Authentication → Email Templates in the dashboard.
import fs from 'node:fs';
import path from 'node:path';

const ref = process.argv[2] || 'mytnwrctkubhrfjwloln';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).');
  process.exit(1);
}
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'templates');
const subjects = JSON.parse(fs.readFileSync(path.join(dir, 'subjects.json'), 'utf8'));
const body = {};
for (const [key, subject] of Object.entries(subjects)) {
  body[`mailer_subjects_${key}`] = subject;
  body[`mailer_templates_${key}_content`] = fs.readFileSync(path.join(dir, `${key}.html`), 'utf8');
}
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`Supabase answered ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`Updated ${Object.keys(subjects).length} email templates on project ${ref}.`);
