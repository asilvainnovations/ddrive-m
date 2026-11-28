// Prints the app's production Content-Security-Policy from vercel.json with the local test servers in place of
// Supabase and the agencies (ADR-018). scripts/test_e2e.sh serves the app with it, so every browser suite runs
// under the real policy.
import { readFileSync } from 'node:fs';

export function testPolicy(api = 'http://127.0.0.1:54321') {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const prod = vercel.headers.find((h) => h.source === '/((?!.*\\.).*)').headers.find((x) => x.key === 'Content-Security-Policy').value;
  return prod
    .replace('https://*.supabase.co wss://*.supabase.co', `${api} ${api.replace('http', 'ws')}`)
    .replace("img-src 'self' data: blob: https:", "img-src 'self' data: blob: https: http://127.0.0.1:8099")
    .replace(/;\s*upgrade-insecure-requests/, '');   // the test servers are plain http
}

if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(testPolicy(process.argv[2]));
