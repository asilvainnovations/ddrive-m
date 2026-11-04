// Stand-in for the Supabase gateway in browser tests: forwards /rest/v1 to a local PostgREST and
// answers the few auth calls the app makes. Tokens are signed with the same secret PostgREST checks.
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.FAKE_SUPABASE_PORT || 54321);
const REST = process.env.POSTGREST_URL || 'http://127.0.0.1:3000';
export const SECRET = process.env.JWT_SECRET || 'e2e-secret-at-least-32-characters-long!!';
// The test project's secret API key (sb_secret_...), standing in for a real one.
export const SECRET_KEY = process.env.E2E_SECRET_KEY || 'sb_secret_e2e_test_key';
export const PUBLISHABLE_KEY = 'sb_publishable_e2e_test_key';

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
export function sign(claims) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(claims);
  const sig = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range, x-total-count',
};

if (process.argv[1] && process.argv[1].endsWith('fake-supabase.mjs')) {
  http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    if (req.url.startsWith('/rest/v1/')) {
      const target = new URL(req.url.replace('/rest/v1', ''), REST);
      const headers = { ...req.headers };
      delete headers.host;
      // Like Supabase's gateway: API keys are not JWTs. A publishable key (or the legacy test anon key)
      // means the anon role; a secret key means service_role; a user's JWT passes through unchanged.
      const apikey = headers.apikey || '';
      const bearer = (headers.authorization || '').replace(/^Bearer /i, '');
      delete headers.apikey;
      if (bearer === apikey || bearer === 'anon-key' || bearer.startsWith('sb_publishable_')) delete headers.authorization;
      if (apikey.startsWith('sb_secret_') || bearer.startsWith('sb_secret_')) {
        if (apikey !== SECRET_KEY && bearer !== SECRET_KEY) { res.writeHead(401, cors); return res.end('{"message":"Invalid API key"}'); }
        headers.authorization = `Bearer ${sign({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 300 })}`;
      }
      const up = http.request(target, { method: req.method, headers }, (r) => {
        res.writeHead(r.statusCode, { ...r.headers, ...cors });
        r.pipe(res);
      });
      req.pipe(up);
      up.on('error', (e) => { res.writeHead(502, cors); res.end(String(e)); });
      return;
    }
    if (req.url.startsWith('/auth/v1/user')) {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      const claims = JSON.parse(Buffer.from(token.split('.')[1] || 'e30', 'base64url').toString());
      res.writeHead(200, { 'content-type': 'application/json', ...cors });
      return res.end(JSON.stringify({ id: claims.sub, email: claims.email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} }));
    }
    if (req.url.startsWith('/auth/v1/logout')) { res.writeHead(204, cors); return res.end(); }
    res.writeHead(404, cors); res.end('not available in tests');
  }).listen(PORT, '127.0.0.1', () => console.log(`fake supabase on ${PORT}`));
}
