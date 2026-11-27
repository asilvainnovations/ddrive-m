// Himawari satellite loop (ADR-015): frames verified by ingest-official, images loaded from JMA.
import { supabase } from '@/lib/supabase';

export type SatProduct = 'b13' | 'b03';
export const SAT_PRODUCTS: Record<SatProduct, { label: string; note: string }> = {
  b13: { label: 'Infrared', note: 'Band 13 (10.4 µm), day and night. Brighter white means colder, higher cloud tops.' },
  b03: { label: 'Visible', note: 'Band 3 (0.64 µm), daylight only. Dark at night.' },
};
export interface SatFrame { observed_at: string; url: string; sector: string }

export const JMA_PAGE = (sector: string) => `https://www.data.jma.go.jp/mscweb/data/himawari/sat_img.php?area=${sector}`;
export const JMA_CITATION = 'Source: Meteorological Satellite Center of JMA website';
/** Shown only when the newest verified frame is at most this old; otherwise "not available right now". */
export const SAT_STALE_MINUTES = 60;
export const LOOP_HOURS = 3;

export async function listFrames(product: SatProduct, now = new Date()): Promise<{ data: SatFrame[]; error: string | null }> {
  const since = new Date(now.getTime() - LOOP_HOURS * 3600e3).toISOString();
  const { data, error } = await supabase.from('ddrive_satellite_frames').select('observed_at, url, sector')
    .eq('product', product).gte('observed_at', since).order('observed_at');
  return { data: (data ?? []) as SatFrame[], error: error?.message ?? null };
}

/** The frames to play: the last LOOP_HOURS, but none at all when the newest one is too old to call current. */
export function playable(frames: SatFrame[], now = new Date()): { frames: SatFrame[]; stale: boolean } {
  const last = frames[frames.length - 1];
  if (!last) return { frames: [], stale: true };
  const age = (now.getTime() - new Date(last.observed_at).getTime()) / 60e3;
  return age > SAT_STALE_MINUTES ? { frames: [], stale: true } : { frames, stale: false };
}
