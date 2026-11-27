// Supabase Edge Function: reads official sources other than PAGASA and records new readings (ADR-005).
//   PTWC  – NOAA Pacific Tsunami Warning Center, CAP documents listed in an Atom feed
//   USGS  – earthquakes from the USGS FDSN event service (GeoJSON), in the region and above the magnitude below
//   GDACS – UN/EC Global Disaster Alert and Coordination System event list (GeoJSON)
//   HIMAWARI – addresses of current Himawari images on the JMA Meteorological Satellite Center website (ADR-015);
//              images are verified and listed, never stored
// Scheduled every 10 minutes (see DEPLOY.md). Callable only with a server key, like ingest-pagasa.
// Each source is read and recorded on its own: one failing source does not stop the others.
//
// Environment (all optional except what Supabase sets):
//   DETECTION_SOURCES   comma list, default "PTWC,USGS,GDACS"
//   DETECTION_BBOX      "minLon,minLat,maxLon,maxLat", default the Philippine Area of Responsibility plus a margin
//   DETECTION_COUNTRIES ISO3 list for GDACS, default "PHL"
//   USGS_MIN_MAGNITUDE  default 4.0
//   PTWC_FEED_URL       default https://www.tsunami.gov/events/xml/PHEBAtom.xml
//   USGS_QUERY_URL, GDACS_QUERY_URL  full query addresses replacing the built ones (tests and staging only)
//   HIMAWARI_SECTOR     JMA sector code, default "se2" (Southeast Asia 2: 105E-140E, 30N-0N)
//   HIMAWARI_PRODUCTS   default "b13,b03" (infrared, visible)
//   HIMAWARI_BASE_URL   default the JMA real-time image site (tests and staging only)
import { createClient } from 'npm:@supabase/supabase-js@2.106.2';
import { isServerCaller, readServerKeys } from '../_shared/auth.ts';
import { fetchText, ingestFeed } from '../_shared/ingest.ts';
import { HIMAWARI_BASE, headRequest, ingestHimawari, type HimawariProduct } from '../_shared/himawari.ts';
import { gdacsQueryUrl, gdacsToAlerts, ingestJsonSource, parseBbox, sourceUrlAllowed, usgsQueryUrl, usgsToAlerts } from '../_shared/sources.ts';

const env = (k: string) => Deno.env.get(k) ?? undefined;
const SUPABASE_URL = env('SUPABASE_URL') ?? '';
const KEYS = readServerKeys((name) => Deno.env.get(name));
const SOURCES = (env('DETECTION_SOURCES') ?? 'PTWC,USGS,GDACS,HIMAWARI').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
const COUNTRIES = (env('DETECTION_COUNTRIES') ?? 'PHL').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
const MIN_MAG = Number(env('USGS_MIN_MAGNITUDE') ?? '4.0');
const PTWC_FEED = env('PTWC_FEED_URL') ?? 'https://www.tsunami.gov/events/xml/PHEBAtom.xml';
const USGS_URL = env('USGS_QUERY_URL');
const GDACS_URL = env('GDACS_QUERY_URL');
const HIMAWARI_SECTOR = env('HIMAWARI_SECTOR') ?? 'se2';
const HIMAWARI_PRODUCTS = (env('HIMAWARI_PRODUCTS') ?? 'b13,b03').split(',').map((s) => s.trim()).filter((p): p is HimawariProduct => p === 'b13' || p === 'b03');
const HIMAWARI_URL = env('HIMAWARI_BASE_URL') ?? HIMAWARI_BASE;
// Keep each organisation's hazard records in step with the alerts in force (ADR-010). A failure here is logged and
// reported, and never undoes the alerts just stored; the next run catches up.
async function syncHazards(db: { rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }> }) {
  const { data, error } = await db.rpc('ddrive_sync_official_hazards');
  if (error) { console.error('hazard sync failed:', error.message); return { ok: false, error: error.message }; }
  return { ok: true, ...(data as Record<string, number>) };
}

const urlOk = (u: string) => { try { return sourceUrlAllowed(new URL(u)); } catch { return false; } };

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (!isServerCaller(req.headers, KEYS)) return json({ error: 'not allowed' }, 401);
  if (!KEYS.clientKey) return json({ error: 'no server key configured' }, 500);
  let bbox;
  try { bbox = parseBbox(env('DETECTION_BBOX')); } catch (e) { return json({ error: (e as Error).message }, 500); }
  if (!Number.isFinite(MIN_MAG) || MIN_MAG < 0 || MIN_MAG > 9) return json({ error: 'USGS_MIN_MAGNITUDE must be between 0 and 9' }, 500);

  const db = createClient(SUPABASE_URL, KEYS.clientKey, { auth: { persistSession: false } });
  const deps = {
    fetchText: (url: string) => fetchText(url, 20_000, 5_000_000),
    knownIdentifiers: async (source: string, ids: string[]) => {
      if (ids.length === 0) return new Set<string>();
      const { data, error } = await db.from('ddrive_official_alerts').select('identifier').eq('source', source).in('identifier', ids);
      if (error) throw new Error(`reading known alerts: ${error.message}`);
      return new Set((data ?? []).map((r) => r.identifier as string));
    },
    apply: async (alert: unknown) => {
      const { data, error } = await db.rpc('ddrive_apply_official_alert', { p: alert });
      if (error) throw new Error(error.message);
      return data as 'new' | 'exists';
    },
    recordRun: async (run: { source: string; started: string; ok: boolean; seen: number; added: number; error: string | null }) => {
      const { error } = await db.rpc('ddrive_record_ingest_run', {
        p_source: run.source, p_started: run.started, p_ok: run.ok, p_seen: run.seen, p_new: run.added, p_error: run.error,
      });
      if (error) console.error(`recording ${run.source} run failed:`, error.message);
    },
  };

  const runs: Record<string, Promise<{ ok: boolean; seen: number; added: number }>> = {};
  if (SOURCES.includes('PTWC')) runs.PTWC = ingestFeed({ source: 'PTWC', feedUrl: PTWC_FEED, maxNewPerRun: 20 }, deps);
  if (SOURCES.includes('USGS')) runs.USGS = ingestJsonSource({ source: 'USGS', url: USGS_URL ?? usgsQueryUrl(bbox, MIN_MAG), convert: (d) => usgsToAlerts(d, bbox) }, deps);
  if (SOURCES.includes('GDACS')) runs.GDACS = ingestJsonSource({ source: 'GDACS', url: GDACS_URL ?? gdacsQueryUrl(), convert: (d) => gdacsToAlerts(d, bbox, COUNTRIES) }, deps);

  if (SOURCES.includes('HIMAWARI')) {
    if (!urlOk(HIMAWARI_URL) || !/^[a-z0-9_]{2,4}$/.test(HIMAWARI_SECTOR) || HIMAWARI_PRODUCTS.length === 0) {
      runs.HIMAWARI = Promise.resolve({ ok: false, seen: 0, added: 0, error: 'HIMAWARI_BASE_URL, HIMAWARI_SECTOR or HIMAWARI_PRODUCTS is not valid' } as never);
    } else {
      runs.HIMAWARI = ingestHimawari({ base: HIMAWARI_URL, sector: HIMAWARI_SECTOR, products: HIMAWARI_PRODUCTS, hours: 3 }, {
        head: (url) => headRequest(url),
        known: async (sector, product, since) => {
          const { data, error } = await db.from('ddrive_satellite_frames').select('observed_at').eq('sector', sector).eq('product', product).gte('observed_at', since);
          if (error) throw new Error(`reading known frames: ${error.message}`);
          return new Set((data ?? []).map((r) => new Date(r.observed_at as string).toISOString()));
        },
        save: async (frames) => {
          const { error } = await db.rpc('ddrive_record_satellite_frames', { p: frames });
          if (error) throw new Error(error.message);
        },
        recordRun: deps.recordRun,
      });
    }
  }

  const results: Record<string, unknown> = {};
  for (const [name, p] of Object.entries(runs)) results[name] = await p;
  const ok = Object.values(results).every((r) => (r as { ok: boolean }).ok);
  results.hazard_sync = await syncHazards(db);
  console.log(JSON.stringify({ fn: 'ingest-official', ok, results }));
  return json(results, ok ? 200 : 207);
});
