import { describe, expect, it } from 'vitest';
import { playable } from '@/lib/satellite';

const now = new Date('2026-11-27T10:40:00Z');
const f = (iso: string) => ({ observed_at: iso, url: `https://x/${iso}.jpg`, sector: 'se2' });

describe('Himawari loop', () => {
  it('plays the frames when the newest is recent', () => {
    const r = playable([f('2026-11-27T09:00:00Z'), f('2026-11-27T10:10:00Z')], now);
    expect(r.stale).toBe(false);
    expect(r.frames).toHaveLength(2);
  });
  it('shows nothing, and says so, when the newest frame is over an hour old', () => {
    const r = playable([f('2026-11-27T08:00:00Z'), f('2026-11-27T09:30:00Z')], now);
    expect(r).toEqual({ frames: [], stale: true });
  });
  it('treats no frames as unavailable', () => { expect(playable([], now).stale).toBe(true); });
});
