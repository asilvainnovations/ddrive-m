// Who may call a backend-only Edge Function, and which key the function uses to reach the database.
//
// Supabase has two generations of server keys (https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys):
// - Secret keys (sb_secret_...), in SUPABASE_SECRET_KEYS as a JSON object keyed by name. They are not
//   JWTs, so callers send them in the `apikey` header and the function must run with verify_jwt = false.
// - The legacy service_role key (a JWT), in SUPABASE_SERVICE_ROLE_KEY, sent as `Authorization: Bearer`.
//   Supabase retires the legacy keys at the end of 2026.
// Both are accepted, so the scheduler can move to secret keys without downtime.

export interface ServerKeys {
  /** Every secret key the project has, by value. */
  secretKeys: string[];
  /** The legacy service_role key, if the project still has one. */
  legacyServiceKey: string | null;
  /** The key the function itself uses for database calls: the `default` secret key, else the legacy key. */
  clientKey: string | null;
}

export function readServerKeys(get: (name: string) => string | undefined): ServerKeys {
  let named: Record<string, string> = {};
  const raw = get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') named = parsed as Record<string, string>;
    } catch {
      console.error('SUPABASE_SECRET_KEYS is not valid JSON; ignoring it');
    }
  }
  const secretKeys = Object.values(named).filter((k) => typeof k === 'string' && k.startsWith('sb_secret_'));
  const legacyServiceKey = get('SUPABASE_SERVICE_ROLE_KEY') || null;
  const preferred = typeof named.default === 'string' && named.default.startsWith('sb_secret_') ? named.default : secretKeys[0];
  return { secretKeys, legacyServiceKey, clientKey: preferred ?? legacyServiceKey };
}

/** Compares two strings in time that does not depend on where they first differ. */
function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** True when the request carries one of the project's secret keys (apikey header) or the legacy service key (bearer). */
export function isServerCaller(headers: Headers, keys: ServerKeys): boolean {
  const apikey = headers.get('apikey') ?? '';
  if (apikey.startsWith('sb_secret_') && keys.secretKeys.some((k) => sameText(apikey, k))) return true;
  const auth = headers.get('authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return Boolean(keys.legacyServiceKey && bearer && sameText(bearer, keys.legacyServiceKey));
}
