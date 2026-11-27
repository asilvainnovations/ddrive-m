// Stand-in for PAGASA's public alert server, and for PTWC, USGS and GDACS, in browser tests. Serves the real CAP fixtures, with their
// sent/expires times moved to now so they are in force, and the feed's links pointed at this server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.FAKE_PAGASA_PORT || 8099);
const STARTED = Date.now();
const BASE = `http://127.0.0.1:${PORT}`;
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../supabase/functions/_shared/testdata');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString().replace(/\.\d{3}Z$/, '+00:00');
const freshen = (xml) => xml
  .replace(/<sent>[^<]+<\/sent>/, `<sent>${iso(-60 * 60 * 1000)}</sent>`)
  .replace(/<expires>[^<]+<\/expires>/g, `<expires>${iso(6 * 60 * 60 * 1000)}</expires>`);

// Oldest first in "updated", as PAGASA lists them newest first; the ingester sorts either way.
const docs = [
  { file: 'pagasa-wcp-signal1.cap', id: '21b29a06-e297-47bd-a79d-20826e724a2c', title: 'TCWS #1', at: -50 },
  { file: 'pagasa-acp.cap', id: 'a431156f-570f-403a-8391-b384d23fc11c', title: 'Tropical Cyclone Alert', at: -40 },
  { file: 'pagasa-gfa.cap', id: '3c0fc291-74a3-414b-8ffc-61e3bc7e18fa', title: 'GFA #5 - Region 8 (Eastern Visayas)', at: -30 },
  { file: 'pagasa-gfa-update.cap', id: 'a53f2598-479a-40b1-b1a3-89561dc43dd4', title: 'GFA - Region 2 (Cagayan Valley)', at: -20 },
];

const feed = () => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<id>${BASE}/feeds/</id>
<title type="text">Latest Alerts from Philippine Atmospheric Geophysical and Astronomical Services Administration</title>
<rights>Copyright, Philippine Atmospheric Geophysical and Astronomical Services Administration. Licensed under CC BY 4.0.</rights>
<updated>${iso(0)}</updated>
${docs.map((d) => `<entry><id>urn:uuid:${d.id}</id><title>${d.title}</title><updated>${iso(d.at * 60000)}</updated>
<author><name>PAGASA DOST</name></author><link type="application/cap+xml" href="${BASE}/output/${d.file}"/></entry>`).join('\n')}
</feed>`;

// Stand-in for the Claude Messages API, for DDRiVER AI tests. Answers by task, cites a real source and one that was
// not given (which the function must remove), and keeps the last request so the test can check what was sent.
const anthropic = { last: null, count: 0 };
function claude(req, res) {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (req.headers['x-api-key'] !== 'test-anthropic-key' || req.headers['anthropic-version'] !== '2023-06-01') {
      res.writeHead(401, { 'content-type': 'application/json' });
      return res.end('{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}');
    }
    const body = JSON.parse(raw);
    anthropic.last = body; anthropic.count += 1;
    const system = String(body.system);
    const sources = [...system.matchAll(/<source key="(S\d+)" label="([^"]*)"/g)].map((m) => ({ key: m[1], label: m[2] }));
    const first = sources[0]?.key ?? 'S1';
    let text;
    if (system.includes('Suggest two to four treatment options')) {
      text = `Two options fit this risk [${first}].\n\`\`\`json\n${JSON.stringify({ suggestions: [
        { title: 'Move the archive above the 2013 flood line', strategy: 'reduce_consequences', drrm_area: 'prevention_mitigation', rationale: `The risk is rated Critical [${first}].` },
        { title: 'Order evacuation now', strategy: 'decide_for_them', drrm_area: 'response', rationale: 'invalid' },
      ] })}\n\`\`\``;
    } else {
      text = `Situation: ${sources.filter((x) => !x.label.startsWith('RA ') ).length} records were provided. The first is ${sources[0]?.label ?? 'none'} [${first}]. A claim with no real source [S99].`;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model,
      content: [{ type: 'thinking', thinking: 'not shown' }, { type: 'text', text }], usage: { input_tokens: 1234, output_tokens: 56 } }));
  });
}

http.createServer((req, res) => {
  if (req.url === '/anthropic/v1/messages' && req.method === 'POST') return claude(req, res);
  if (req.url === '/anthropic/last') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(anthropic)); }
  if (req.url === '/feeds/') {
    res.writeHead(200, { 'content-type': 'application/atom+xml' });
    return res.end(feed());
  }
  // PTWC: the Atom feed and its CAP document, on this host (the ingester refuses links to other hosts).
  if (req.url === '/ptwc/feed.xml') {
    res.writeHead(200, { 'content-type': 'application/atom+xml' });
    return res.end(read('ptwc-feed.xml')
      .replace(/https:\/\/www\.tsunami\.gov\/events\/PHEB\/2026\/11\/21\/test\/1\/WEPA40\/PHEBCAP\.xml/g, `${BASE}/ptwc/cap.xml`)
      .replace(/https:\/\/www\.tsunami\.gov\/[^"<]*/g, `${BASE}/ptwc/`)
      .replace(/<updated>[^<]+<\/updated>/g, `<updated>${iso(-30 * 60000)}</updated>`));
  }
  if (req.url === '/ptwc/cap.xml') {
    res.writeHead(200, { 'content-type': 'application/cap+xml' });
    return res.end(read('ptwc-cap.xml').replace(/<sent>[^<]+<\/sent>/, `<sent>${iso(-30 * 60000)}</sent>`));
  }
  // USGS: event times moved to the last two hours, so they are in force (24 hours) and inside the query window.
  if (req.url.startsWith('/usgs')) {
    const d = JSON.parse(read('usgs-sample.geojson'));
    // Fixed at start-up: USGS changes "updated" only when it revises an event, and a change is a new version.
    d.features.forEach((f, i) => { f.properties.time = STARTED - (60 + i * 10) * 60000; f.properties.updated = STARTED - 30 * 60000; });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(d));
  }
  // GDACS: events running from two days ago to tomorrow, modified an hour ago.
  if (req.url.startsWith('/gdacs')) {
    const day = (n) => new Date(STARTED + n * 86400000).toISOString().slice(0, 19);
    const d = JSON.parse(read('gdacs-sample.json'));
    for (const f of d.features) Object.assign(f.properties, { fromdate: day(-2), todate: day(1), datemodified: new Date(STARTED - 3600000).toISOString().slice(0, 19) });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(d));
  }
  const d = docs.find((x) => req.url === `/output/${x.file}`);
  if (d) {
    res.writeHead(200, { 'content-type': 'application/cap+xml' });
    return res.end(freshen(read(d.file)));
  }
  res.writeHead(404); res.end();
}).listen(PORT, '127.0.0.1', () => console.log(`fake PAGASA on ${PORT}`));
