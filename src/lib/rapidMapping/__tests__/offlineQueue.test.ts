import { describe, expect, it } from 'vitest';
import { discard, enqueue, flush, readQueue, retry, type KV } from '../offlineQueue';
import type { NewObservation } from '../api';

const mem = (): KV => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; };
const obs = (key: string): NewObservation => ({
  client_key: key, activation_id: 'a', aoi_id: null, observed_at: '2026-11-14T00:00:00Z', observation_type: 'road_access',
  access_status: 'impassable', description: 'Flooded', geometry: { type: 'Point', coordinates: [124.61, 11.01] },
  condition_code: null, confidence: 'not_assessed', evidence_ref: null,
});

describe('offline observation queue', () => {
  it('stores one entry per client key', () => {
    const kv = mem();
    enqueue('t', obs('k1'), kv); enqueue('t', obs('k1'), kv); enqueue('t', obs('k2'), kv);
    expect(readQueue('t', kv).map((x) => x.item.client_key)).toEqual(['k1', 'k2']);
    expect(readQueue('other-tenant', kv)).toEqual([]);
  });
  it('removes accepted items and keeps the rest pending when the connection drops', async () => {
    const kv = mem();
    ['k1', 'k2', 'k3'].forEach((k) => enqueue('t', obs(k), kv));
    let n = 0;
    const r = await flush('t', async () => (++n === 1 ? { error: null } : { error: 'No connection. Try again when you are back online.' }), kv);
    expect(r).toEqual({ sent: 1, failed: 0, pending: 2 });
    expect(n).toBe(2); // stopped after the first connection error
  });
  it('marks refused items failed with the reason, and carries on', async () => {
    const kv = mem();
    ['k1', 'k2'].forEach((k) => enqueue('t', obs(k), kv));
    const r = await flush('t', async (o) => (o.client_key === 'k1' ? { error: 'Field observations can be sent only while the mapping activation is active.' } : { error: null }), kv);
    expect(r).toEqual({ sent: 1, failed: 1, pending: 0 });
    const [f] = readQueue('t', kv);
    expect(f.lastError).toMatch(/only while/);
    // A failed item is not retried automatically.
    expect((await flush('t', async () => ({ error: null }), kv)).sent).toBe(0);
    retry('t', 'k1', kv);
    expect((await flush('t', async () => ({ error: null }), kv)).sent).toBe(1);
  });
  it('lets the person discard an item', () => {
    const kv = mem();
    enqueue('t', obs('k1'), kv);
    discard('t', 'k1', kv);
    expect(readQueue('t', kv)).toEqual([]);
  });
});
