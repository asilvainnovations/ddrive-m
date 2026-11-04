// Supabase Edge Function: polls PAGASA's CAP feed and records new official alerts.
// Scheduled every 10 minutes (see DEPLOY.md). Callable only with a server key:
// a secret key (sb_secret_...) in the `apikey` header, or the legacy service_role key as a bearer token.
// Deploy with verify_jwt = false (set in supabase/config.toml): secret keys are not JWTs.
//
// Environment (set automatically by Supabase, except PAGASA_FEED_URL which is optional):
//   SUPABASE_URL, SUPABASE_SECRET_KEYS and/or SUPABASE_SERVICE_ROLE_KEY,
//   PAGASA_FEED_URL (default: PAGASA's official feed)
import { createClient } from 'npm:@supabase/supabase-js@2.106.2';
import { isServerCaller, readServerKeys } from '../_shared/auth.ts';
import { fetchText, ingestFeed } from '../_shared/ingest.ts';

const FEED_URL = Deno.env.get('PAGASA_FEED_URL') ?? 'https://publicalert.pagasa.dost.gov.ph/feeds/';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const KEYS = readServerKeys((name) => Deno.env.get(name));
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  // Only the scheduler (or an operator) holding a server key may trigger a run.
  if (!isServerCaller(req.headers, KEYS)) return json({ error: 'not allowed' }, 401);
  if (!KEYS.clientKey) return json({ error: 'no server key configured' }, 500);

  const db = createClient(SUPABASE_URL, KEYS.clientKey, { auth: { persistSession: false } });

  const result = await ingestFeed(
    { source: 'PAGASA', feedUrl: FEED_URL },
    {
      fetchText: (url) => fetchText(url),
      knownIdentifiers: async (source, ids) => {
        if (ids.length === 0) return new Set();
        const { data, error } = await db.from('ddrive_official_alerts').select('identifier').eq('source', source).in('identifier', ids);
        if (error) throw new Error(`reading known alerts: ${error.message}`);
        return new Set((data ?? []).map((r) => r.identifier as string));
      },
      apply: async (alert) => {
        const { data, error } = await db.rpc('ddrive_apply_official_alert', { p: alert });
        if (error) throw new Error(`storing ${alert.identifier}: ${error.message}`);
        return data as 'new' | 'exists';
      },
      recordRun: async (run) => {
        const { error } = await db.rpc('ddrive_record_ingest_run', {
          p_source: run.source, p_started: run.started, p_ok: run.ok, p_seen: run.seen, p_new: run.added, p_error: run.error,
        });
        if (error) console.error('recording run failed:', error.message);
      },
    },
  );

  console.log(JSON.stringify({ source: 'PAGASA', ...result, failed: result.failed.length }));
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 207,
    headers: { 'content-type': 'application/json' },
  });
});
