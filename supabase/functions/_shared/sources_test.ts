// Run with: deno test --allow-read supabase/functions/_shared/sources_test.ts
import { DEFAULT_BBOX, gdacsQueryUrl, gdacsToAlerts, ingestJsonSource, parseBbox, sourceUrlAllowed, usgsQueryUrl, usgsToAlerts, type SourceAlert } from './sources.ts';
import { ingestFeed } from './ingest.ts';
import type { ParsedAlert } from './cap.ts';

const dir = new URL('./testdata/', import.meta.url);
const read = (f: string) => Deno.readTextFileSync(new URL(f, dir));
const assert = (c: unknown, m: string) => { if (!c) throw new Error(m); };

Deno.test('USGS: keeps the region, the published values and the original feature', () => {
  const a = usgsToAlerts(JSON.parse(read('usgs-sample.geojson')), DEFAULT_BBOX);
  assert(a.length === 3, `expected 3 in region, got ${a.length}`);
  const samar = a.find((x) => x.event_key === 'us7000test1')!;
  assert(samar.identifier === 'us7000test1@1763767800000', samar.identifier);
  assert(samar.magnitude === 5.3 && samar.magnitude_type === 'mww' && samar.depth_km === 35.5, 'magnitude/depth');
  assert(samar.latitude === 11.11 && samar.longitude === 125.92, 'coordinates');
  assert(samar.alert_level === 'green' && samar.tsunami_flag === false, 'PAGER and tsunami flag verbatim');
  assert(samar.severity === null && samar.urgency === null, 'no CAP fields invented');
  assert(samar.event === 'Earthquake' && samar.hazard_type === 'earthquake' && samar.msg_type === 'Alert', 'event');
  assert(samar.description!.includes('PHIVOLCS issues the official'), 'labelled as international');
  assert(Date.parse(samar.expires!) - Date.parse(samar.sent) === 24 * 3_600_000, 'in force 24 h');
  assert(JSON.parse(samar.raw_xml).id === 'us7000test1' && samar.raw_format === 'usgs-geojson', 'raw payload kept');
  assert(a.find((x) => x.event_key === 'us7000test4')!.msg_type === 'Cancel', 'deleted becomes Cancel');
  assert(!a.some((x) => x.event_key === 'us7000test3'), 'Fiji is outside the region');
});

Deno.test('USGS: a non-collection is refused', () => {
  let threw = false;
  try { usgsToAlerts({ type: 'Feature' }, DEFAULT_BBOX); } catch { threw = true; }
  assert(threw, 'should throw');
});

Deno.test('USGS query URL carries the region and magnitude', () => {
  const u = new URL(usgsQueryUrl([114, 2, 136, 26], 4.5, new Date('2026-11-22T00:00:00Z')));
  assert(u.host === 'earthquake.usgs.gov' && u.searchParams.get('format') === 'geojson', 'host/format');
  assert(u.searchParams.get('minmagnitude') === '4.5' && u.searchParams.get('maxlongitude') === '136', 'filters');
  assert(u.searchParams.get('starttime') === '2026-11-20T00:00:00', 'start two days back');
});

Deno.test('GDACS: region or country, alert level verbatim, UTC times, unknown types skipped', () => {
  const a = gdacsToAlerts(JSON.parse(read('gdacs-sample.json')), DEFAULT_BBOX, ['PHL']);
  assert(a.length === 2, `expected 2, got ${a.length}`);
  const tc = a.find((x) => x.event_key === 'TC1001300')!;
  assert(tc.identifier === 'TC1001300-4' && tc.alert_level === 'Orange' && tc.hazard_type === 'tropical_cyclone', 'tc');
  assert(tc.sent === '2026-11-22T06:10:00.000Z', `sent ${tc.sent}`);
  assert(tc.expires === '2026-11-24T06:00:00.000Z', `expires ${tc.expires}`);
  assert(tc.country_codes.join() === 'PHL' && tc.area_names.join() === 'Philippines', 'countries');
  assert(tc.description!.includes('Typhoon (maximum wind speed of 176 km/h)'), 'severity text kept');
  assert(tc.cap_url.startsWith('https://www.gdacs.org/report.aspx'), 'links to the report');
  const eq = a.find((x) => x.event_key === 'EQ1557300')!;
  assert(eq.magnitude === 5.6 && eq.expires === '2026-11-24T10:00:00.000Z', 'EQ magnitude and 72 h');
  assert(!a.some((x) => x.event_key?.startsWith('DR')), 'European drought excluded');
});

Deno.test('GDACS: a country listed outside the box still counts', () => {
  const doc = JSON.parse(read('gdacs-sample.json'));
  const a = gdacsToAlerts(doc, [0, 0, 1, 1], ['PHL']);
  assert(a.length === 2, `matched by country: ${a.length}`);
});

Deno.test('GDACS query URL', () => {
  const u = new URL(gdacsQueryUrl(new Date('2026-11-22T00:00:00Z')));
  assert(u.searchParams.get('eventlist') === 'EQ;TC;FL;VO;DR;WF' && u.searchParams.get('fromdate') === '2026-10-23', u.href);
});

Deno.test('bounding box parsing refuses nonsense', () => {
  assert(parseBbox(undefined).join() === DEFAULT_BBOX.join(), 'default');
  assert(parseBbox('116,4,127,22').join() === '116,4,127,22', 'custom');
  for (const bad of ['1,2,3', '130,2,120,20', 'a,b,c,d', '-200,0,10,10']) {
    let threw = false;
    try { parseBbox(bad); } catch { threw = true; }
    assert(threw, `should refuse ${bad}`);
  }
});

function deps(docs: Record<string, string>, stored = new Map<string, SourceAlert | ParsedAlert>()) {
  const runs: { source: string; ok: boolean; added: number; error: string | null }[] = [];
  return {
    stored, runs,
    d: {
      fetchText: async (u: string) => { if (!(u in docs)) throw new Error(`HTTP 404 for ${u}`); return docs[u]; },
      knownIdentifiers: async (_s: string, ids: string[]) => new Set(ids.filter((i) => stored.has(i))),
      apply: async (a: SourceAlert | ParsedAlert) => (stored.has(a.identifier) ? 'exists' as const : (stored.set(a.identifier, a), 'new' as const)),
      recordRun: async (r: { source: string; started: string; ok: boolean; seen: number; added: number; error: string | null }) => { runs.push(r); },
    },
  };
}

Deno.test('a JSON source run stores new readings once and records the run', async () => {
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson';
  const x = deps({ [url]: read('usgs-sample.geojson') });
  const opts = { source: 'USGS', url, convert: (d: unknown) => usgsToAlerts(d, DEFAULT_BBOX) };
  const r1 = await ingestJsonSource(opts, x.d);
  assert(r1.ok && r1.added === 3 && x.runs.length === 1 && x.runs[0].ok, JSON.stringify(r1));
  const r2 = await ingestJsonSource(opts, x.d);
  assert(r2.added === 0 && r2.ok, 'second run adds nothing');
});

Deno.test('a JSON source outage or bad payload is recorded, not thrown', async () => {
  const x = deps({ 'https://www.gdacs.org/bad': '<html>maintenance</html>' });
  const r = await ingestJsonSource({ source: 'GDACS', url: 'https://www.gdacs.org/down', convert: (d) => gdacsToAlerts(d, DEFAULT_BBOX) }, x.d);
  assert(!r.ok && x.runs[0].error!.includes('404'), 'outage recorded');
  const r2 = await ingestJsonSource({ source: 'GDACS', url: 'https://www.gdacs.org/bad', convert: (d) => gdacsToAlerts(d, DEFAULT_BBOX) }, x.d);
  assert(!r2.ok && x.runs[1].error!.length > 0, 'bad JSON recorded');
  const r3 = await ingestJsonSource({ source: 'GDACS', url: 'http://www.gdacs.org/bad', convert: (d) => gdacsToAlerts(d, DEFAULT_BBOX) }, x.d);
  assert(!r3.ok && x.runs[2].error!.includes('non-https'), 'http refused');
});

Deno.test('PTWC: the Atom feed and its CAP document go through the CAP pipeline', async () => {
  const feed = 'https://www.tsunami.gov/events/xml/PHEBAtom.xml';
  const cap = 'https://www.tsunami.gov/events/PHEB/2026/11/21/test/1/WEPA40/PHEBCAP.xml';
  const x = deps({ [feed]: read('ptwc-feed.xml'), [cap]: read('ptwc-cap.xml') });
  const r = await ingestFeed({ source: 'PTWC', feedUrl: feed }, x.d);
  assert(r.ok && r.added === 1, JSON.stringify(r));
  const a = [...x.stored.values()][0] as ParsedAlert;
  assert(a.event === 'Tsunami Information Statement' && a.sender === 'ptwc@noaa.gov' && a.certainty === 'Unlikely', 'CAP fields verbatim');
  assert(a.cap_url === cap, 'followed the CAP link, not the energy map');
});

Deno.test('sources must be HTTPS, except this machine for local tests', () => {
  const ok = (u: string) => sourceUrlAllowed(new URL(u));
  if (!ok('https://earthquake.usgs.gov/fdsnws/event/1/query')) throw new Error('https refused');
  if (!ok('http://127.0.0.1:8099/usgs') || !ok('http://localhost:8099/gdacs')) throw new Error('loopback refused');
  for (const bad of ['http://earthquake.usgs.gov/x', 'http://10.0.0.5/x', 'http://127.0.0.1.evil.example/x', 'ftp://127.0.0.1/x', 'file:///etc/passwd']) {
    if (ok(bad)) throw new Error(`allowed ${bad}`);
  }
});
