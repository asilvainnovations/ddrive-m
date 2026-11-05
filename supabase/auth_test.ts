// Run with: deno test --allow-read supabase/functions/_shared/auth_test.ts
import { isServerCaller, readServerKeys } from './auth.ts';

function assert(ok: boolean, label = 'expected true'): void {
  if (!ok) throw new Error(label);
}
function assertEquals(actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`got ${a}, expected ${e}`);
}

const env = (vars: Record<string, string>) => (name: string) => vars[name];
const h = (o: Record<string, string>) => new Headers(o);

Deno.test('prefers the default secret key over the legacy key', () => {
  const k = readServerKeys(env({
    SUPABASE_SECRET_KEYS: JSON.stringify({ worker: 'sb_secret_w', default: 'sb_secret_d' }),
    SUPABASE_SERVICE_ROLE_KEY: 'legacy.jwt.key',
  }));
  assertEquals(k.clientKey, 'sb_secret_d');
  assertEquals(k.secretKeys.sort(), ['sb_secret_d', 'sb_secret_w']);
  assertEquals(k.legacyServiceKey, 'legacy.jwt.key');
});

Deno.test('falls back to the legacy key, and survives bad JSON', () => {
  const k = readServerKeys(env({ SUPABASE_SECRET_KEYS: '{not json', SUPABASE_SERVICE_ROLE_KEY: 'legacy.jwt.key' }));
  assertEquals(k.secretKeys, []);
  assertEquals(k.clientKey, 'legacy.jwt.key');
  assertEquals(readServerKeys(env({})).clientKey, null);
});

Deno.test('accepts a secret key in the apikey header, or the legacy key as bearer', () => {
  const k = readServerKeys(env({
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_d', worker: 'sb_secret_w' }),
    SUPABASE_SERVICE_ROLE_KEY: 'legacy.jwt.key',
  }));
  assert(isServerCaller(h({ apikey: 'sb_secret_d' }), k));
  assert(isServerCaller(h({ apikey: 'sb_secret_w' }), k));
  assert(isServerCaller(h({ authorization: 'Bearer legacy.jwt.key' }), k));
});

Deno.test('refuses everyone else', () => {
  const k = readServerKeys(env({ SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_d' }) }));
  assert(!isServerCaller(h({}), k));
  assert(!isServerCaller(h({ apikey: 'sb_publishable_x' }), k));
  assert(!isServerCaller(h({ apikey: 'sb_secret_wrong' }), k));
  assert(!isServerCaller(h({ apikey: 'sb_secret_' }), k));
  // A secret key as bearer is not how secret keys are sent; with no legacy key there is nothing to match.
  assert(!isServerCaller(h({ authorization: 'Bearer sb_secret_d' }), k));
  // An empty legacy key never matches an empty bearer.
  assert(!isServerCaller(h({ authorization: 'Bearer ' }), readServerKeys(env({ SUPABASE_SERVICE_ROLE_KEY: '' }))));
});
