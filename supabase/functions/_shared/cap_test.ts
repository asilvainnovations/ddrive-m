// Run with: deno test --allow-read supabase/functions/_shared/cap_test.ts
import { parseCap, parseFeed } from './cap.ts';

const dir = new URL('./testdata/', import.meta.url);
const read = (f: string) => Deno.readTextFileSync(new URL(f, dir));
const eq = (actual: unknown, expected: unknown, label: string) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: got ${a}, expected ${e}`);
};
const opts = (f: string) => ({ source: 'PAGASA', capUrl: `https://publicalert.pagasa.dost.gov.ph/output/x/${f}`, license: 'CC BY 4.0' });

Deno.test('feed: entries link to CAP documents and carry the licence', () => {
  const { entries, rights } = parseFeed(read('pagasa-feed.xml'));
  if (entries.length < 3) throw new Error(`only ${entries.length} entries`);
  eq(entries[0].id, '3c0fc291-74a3-414b-8ffc-61e3bc7e18fa', 'first id without urn:uuid');
  eq(entries[0].capUrl, 'https://publicalert.pagasa.dost.gov.ph/output/gfa/3c0fc291-74a3-414b-8ffc-61e3bc7e18fa.cap', 'cap url');
  eq(rights?.includes('CC BY 4.0'), true, 'licence');
});

Deno.test('wind signal: signal number is read separately from CAP severity', () => {
  const a = parseCap(read('pagasa-wcp-signal1.cap'), opts('wcp.cap'));
  eq(a.event, 'Tropical Cyclone Warning', 'event');
  eq(a.signal_level, 1, 'signal');
  eq(a.severity, 'Minor', 'CAP severity kept verbatim');
  eq(a.area_names, ['Batanes'], 'area');
  eq(a.area_codes, ['020900000'], '9-digit PSGC kept verbatim');
  eq(a.msg_type, 'Alert', 'msgType');
  eq(a.expires, '2026-10-24T16:50:27+08:00', 'expiry with offset');
});

Deno.test('flood advisory: several provinces with codes and outlines; an update with references', () => {
  const a = parseCap(read('pagasa-gfa.cap'), opts('gfa.cap'));
  eq(a.event, 'General Flood Advisory (Moderate)', 'event');
  eq(a.signal_level, null, 'no signal');
  eq(a.area_names.length, 6, 'six provinces');
  eq(a.area_codes.includes('083700000'), true, 'Leyte code');
  eq(a.areas.every((x) => x.polygons.length > 0), true, 'outlines kept');
  eq(a.msg_type, 'Update', 'update');
  eq(a.references?.startsWith('PAGASA-DOST,'), true, 'references kept');
  eq(a.region_label, 'Region 8 (Eastern Visayas)', 'region');
});

Deno.test('cyclone alert for the whole PAR: outline, no province codes', () => {
  const a = parseCap(read('pagasa-acp.cap'), opts('acp.cap'));
  eq(a.event, 'Tropical Cyclone Alert', 'event');
  eq(a.area_codes, [], 'no codes');
  eq(a.area_names, ['Philippine Area of Responsibility'], 'PAR');
});

Deno.test('raw document is kept for provenance', () => {
  const xml = read('pagasa-gfa-update.cap');
  eq(parseCap(xml, opts('u.cap')).raw_xml === xml, true, 'raw');
});

Deno.test('rejects documents that are not CAP or lack required fields', () => {
  for (const bad of ['<html></html>', '<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>x</identifier></alert>']) {
    let threw = false;
    try { parseCap(bad, opts('bad.cap')); } catch { threw = true; }
    if (!threw) throw new Error(`accepted: ${bad}`);
  }
});

Deno.test('rejects an invalid date instead of storing it', () => {
  const xml = read('pagasa-wcp-signal1.cap').replace(/<expires>[^<]+<\/expires>/, '<expires>not a date</expires>');
  let threw = false;
  try { parseCap(xml, opts('d.cap')); } catch { threw = true; }
  eq(threw, true, 'invalid date rejected');
});
