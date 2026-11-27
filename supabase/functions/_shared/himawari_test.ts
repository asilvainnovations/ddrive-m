// Run with: deno test supabase/functions/_shared/himawari_test.ts
import { frameUrl, ingestHimawari, isCurrent, recentSlots, type Frame } from './himawari.ts';

const assert = (c: unknown, m: string) => { if (!c) throw new Error(m); };
const NOW = new Date('2026-11-27T10:37:12Z');

Deno.test('slots: 10-minute UTC slots ending at the last completed slot, oldest first', () => {
  const s = recentSlots(NOW, 1);
  assert(s.length === 6, `6 slots, got ${s.length}`);
  assert(s[0].slot === '0940' && s[5].slot === '1030', s.map((x) => x.slot).join(','));
  assert(s[5].observedAt.toISOString() === '2026-11-27T10:30:00.000Z', 'observed time');
  const midnight = recentSlots(new Date('2026-11-27T00:05:00Z'), 1);
  assert(midnight[0].slot === '2310' && midnight[0].observedAt.toISOString().startsWith('2026-11-26'), 'crosses midnight into the previous day');
});

Deno.test('frame address follows JMA naming', () => {
  assert(frameUrl('https://www.data.jma.go.jp/mscweb/data/himawari/', 'se2', 'b13', '0310') === 'https://www.data.jma.go.jp/mscweb/data/himawari/img/se2/se2_b13_0310.jpg', 'url');
});

Deno.test('a file is current only when modified within two hours after its slot', () => {
  const slot = new Date('2026-11-27T10:00:00Z');
  assert(isCurrent(slot, new Date('2026-11-27T10:21:00Z')), 'published 21 min later');
  assert(!isCurrent(slot, new Date('2026-11-26T10:20:00Z')), "yesterday's image in the same slot");
  assert(!isCurrent(slot, new Date('2026-11-27T09:59:00Z')), 'before the slot');
  assert(!isCurrent(slot, new Date('2026-11-27T12:30:00Z')), 'too late to be this slot');
  assert(!isCurrent(slot, null), 'no Last-Modified, not verified');
});

function deps(files: Record<string, string | 'down'>, known: string[] = []) {
  const saved: Frame[] = [];
  const runs: { ok: boolean; error: string | null; added: number }[] = [];
  return {
    saved, runs,
    d: {
      head: (url: string) => {
        const f = files[url.split('/').pop()!];
        if (f === 'down') return Promise.reject(new Error('connection refused'));
        return Promise.resolve(f ? { status: 200, lastModified: f } : { status: 404, lastModified: null });
      },
      known: () => Promise.resolve(new Set(known)),
      save: (f: Frame[]) => { saved.push(...f); return Promise.resolve(); },
      recordRun: (r: { ok: boolean; error: string | null; added: number }) => { runs.push(r); return Promise.resolve(); },
    },
  };
}

Deno.test('ingest: keeps current frames, skips stale and missing ones, and records the run', async () => {
  const t = deps({
    'se2_b13_1030.jpg': 'Fri, 27 Nov 2026 10:52:00 GMT',
    'se2_b13_1020.jpg': 'Fri, 27 Nov 2026 10:41:00 GMT',
    'se2_b13_1010.jpg': 'Thu, 26 Nov 2026 10:31:00 GMT', // yesterday: JMA skipped today's slot
  });
  const r = await ingestHimawari({ base: 'https://x/himawari', sector: 'se2', products: ['b13'], hours: 1, now: NOW }, t.d);
  assert(r.ok && r.added === 2 && r.seen === 6, JSON.stringify(r));
  assert(t.saved.map((f) => f.slot).join(',') === '1020,1030', t.saved.map((f) => f.slot).join(','));
  assert(t.saved[1].url === 'https://x/himawari/img/se2/se2_b13_1030.jpg' && t.saved[1].last_modified === '2026-11-27T10:52:00.000Z', 'stored address and time');
  assert(t.runs[0].ok && t.runs[0].added === 2, 'run recorded');
});

Deno.test('ingest: already recorded slots are not checked again and still count as current', async () => {
  const t = deps({}, ['2026-11-27T10:30:00.000Z']);
  const r = await ingestHimawari({ base: 'https://x', sector: 'se2', products: ['b13'], hours: 1, now: NOW }, t.d);
  assert(r.ok && r.seen === 5 && r.added === 0, JSON.stringify(r));
});

Deno.test('ingest: nothing current in the last hour is a failed run, with the reason', async () => {
  const t = deps({ 'se2_b13_1030.jpg': 'Thu, 26 Nov 2026 10:50:00 GMT' });
  const r = await ingestHimawari({ base: 'https://x', sector: 'se2', products: ['b13'], hours: 1, now: NOW }, t.d);
  assert(!r.ok && r.error === 'No Himawari image of the last hour could be verified as current', JSON.stringify(r));
  assert(!t.runs[0].ok, 'run recorded as failed');
});

Deno.test('ingest: JMA unreachable is reported as such', async () => {
  const files = Object.fromEntries(recentSlots(NOW, 1).map((s) => [`se2_b13_${s.slot}.jpg`, 'down' as const]));
  const t = deps(files);
  const r = await ingestHimawari({ base: 'https://x', sector: 'se2', products: ['b13'], hours: 1, now: NOW }, t.d);
  assert(!r.ok && r.error!.startsWith('JMA not reachable'), JSON.stringify(r));
});
