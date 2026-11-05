// Run with: deno test --allow-read supabase/functions/_shared/ingest_test.ts
import { ingestFeed, IngestDeps } from './ingest.ts';
import type { ParsedAlert } from './cap.ts';

const dir = new URL('./testdata/', import.meta.url);
const read = (f: string) => Deno.readTextFileSync(new URL(f, dir));
const FEED = 'https://publicalert.pagasa.dost.gov.ph/feeds/';

// A feed with three entries pointing at the fixture documents (plus one outside the host).
const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<rights>Licensed under CC BY 4.0.</rights>
<entry><id>urn:uuid:21b29a06-e297-47bd-a79d-20826e724a2c</id><title>TCWS</title><updated>2026-10-23T16:50:00+08:00</updated>
<link type="application/cap+xml" href="https://publicalert.pagasa.dost.gov.ph/output/wcp/signal1.cap"/></entry>
<entry><id>urn:uuid:a431156f-570f-403a-8391-b384d23fc11c</id><title>TCA</title><updated>2026-10-24T11:51:00+08:00</updated>
<link type="application/cap+xml" href="https://publicalert.pagasa.dost.gov.ph/output/acp/acp.cap"/></entry>
<entry><id>urn:uuid:3c0fc291-74a3-414b-8ffc-61e3bc7e18fa</id><title>GFA</title><updated>2026-10-25T17:31:00+08:00</updated>
<link type="application/cap+xml" href="https://publicalert.pagasa.dost.gov.ph/output/gfa/gfa.cap"/></entry>
<entry><id>urn:uuid:evil</id><title>Elsewhere</title><updated>2026-10-25T18:00:00+08:00</updated>
<link type="application/cap+xml" href="https://attacker.example/x.cap"/></entry>
</feed>`;

const docs: Record<string, string> = {
  [FEED]: feed,
  'https://publicalert.pagasa.dost.gov.ph/output/wcp/signal1.cap': read('pagasa-wcp-signal1.cap'),
  'https://publicalert.pagasa.dost.gov.ph/output/acp/acp.cap': read('pagasa-acp.cap'),
  'https://publicalert.pagasa.dost.gov.ph/output/gfa/gfa.cap': read('pagasa-gfa.cap'),
};

function fakeDeps(stored: Map<string, ParsedAlert>, fetched: string[]) {
  const runs: unknown[] = [];
  const deps: IngestDeps = {
    fetchText: async (url) => {
      fetched.push(url);
      if (!(url in docs)) throw new Error(`HTTP 404 for ${url}`);
      return docs[url];
    },
    knownIdentifiers: async (_s, ids) => new Set(ids.filter((i) => stored.has(i))),
    apply: async (a) => (stored.has(a.identifier) ? 'exists' : (stored.set(a.identifier, a), 'new')),
    recordRun: async (r) => { runs.push(r); },
  };
  return { deps, runs };
}

Deno.test('first run stores every alert on the feed host and refuses links elsewhere', async () => {
  const stored = new Map<string, ParsedAlert>();
  const fetched: string[] = [];
  const { deps, runs } = fakeDeps(stored, fetched);
  const r = await ingestFeed({ source: 'PAGASA', feedUrl: FEED }, deps);
  if (r.added !== 3) throw new Error(`added ${r.added}`);
  if (fetched.some((u) => u.includes('attacker'))) throw new Error('fetched outside the feed host');
  if (r.ok || r.failed.length !== 1 || !r.failed[0].error.includes('outside the feed host')) throw new Error(JSON.stringify(r.failed));
  if (stored.get('21b29a06-e297-47bd-a79d-20826e724a2c')?.license !== 'Licensed under CC BY 4.0.') throw new Error('licence not carried');
  if (runs.length !== 1) throw new Error('run not recorded');
});

Deno.test('second run fetches only the feed index (nothing new to download)', async () => {
  const stored = new Map<string, ParsedAlert>();
  await ingestFeed({ source: 'PAGASA', feedUrl: FEED }, fakeDeps(stored, []).deps);
  const fetched: string[] = [];
  const r = await ingestFeed({ source: 'PAGASA', feedUrl: FEED }, fakeDeps(stored, fetched).deps);
  if (r.added !== 0 || r.skipped !== 3) throw new Error(JSON.stringify(r));
  // The refused off-host entry stays unknown but is never downloaded; stored alerts are not fetched again.
  const downloads = fetched.filter((u) => u.endsWith('.cap'));
  if (downloads.length !== 0) throw new Error(`downloaded again: ${downloads}`);
});

Deno.test('alerts are processed oldest first', async () => {
  const order: string[] = [];
  const stored = new Map<string, ParsedAlert>();
  const { deps } = fakeDeps(stored, []);
  const r = await ingestFeed({ source: 'PAGASA', feedUrl: FEED }, { ...deps, apply: async (a) => { order.push(a.event); return 'new'; } });
  if (r.added !== 3) throw new Error('not all applied');
  if (order.join(',') !== 'Tropical Cyclone Warning,Tropical Cyclone Alert,General Flood Advisory (Moderate)') throw new Error(order.join(','));
});

Deno.test('a feed outage is recorded as a failed run, not thrown', async () => {
  const runs: { ok: boolean; error: string | null }[] = [];
  const r = await ingestFeed({ source: 'PAGASA', feedUrl: FEED }, {
    fetchText: async () => { throw new Error('HTTP 503'); },
    knownIdentifiers: async () => new Set(),
    apply: async () => 'new',
    recordRun: async (run) => { runs.push(run); },
  });
  if (r.ok || runs[0]?.ok !== false || !runs[0]?.error?.includes('503')) throw new Error(JSON.stringify(runs));
});

Deno.test('the per-run cap limits downloads', async () => {
  const fetched: string[] = [];
  const r = await ingestFeed({ source: 'PAGASA', feedUrl: FEED, maxNewPerRun: 1 }, fakeDeps(new Map(), fetched).deps);
  if (r.added !== 1 || fetched.filter((u) => u.endsWith('.cap')).length !== 1) throw new Error(JSON.stringify(r));
});
