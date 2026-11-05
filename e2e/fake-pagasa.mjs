// Stand-in for PAGASA's public alert server in browser tests. Serves the real CAP fixtures, with their
// sent/expires times moved to now so they are in force, and the feed's links pointed at this server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.FAKE_PAGASA_PORT || 8099);
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

http.createServer((req, res) => {
  if (req.url === '/feeds/') {
    res.writeHead(200, { 'content-type': 'application/atom+xml' });
    return res.end(feed());
  }
  const d = docs.find((x) => req.url === `/output/${x.file}`);
  if (d) {
    res.writeHead(200, { 'content-type': 'application/cap+xml' });
    return res.end(freshen(read(d.file)));
  }
  res.writeHead(404); res.end();
}).listen(PORT, '127.0.0.1', () => console.log(`fake PAGASA on ${PORT}`));
