// Himawari satellite images from the Meteorological Satellite Center of JMA (ADR-015).
//
// JMA's "Himawari Real-Time Image" service keeps a 24-hour rolling archive per sector, one JPEG per product and
// 10-minute slot, named by UTC time of day: img/se2/se2_b13_0310.jpg is the 03:10 UTC infrared image of Southeast
// Asia 2 (105E-140E, 30N-0N, which covers the Philippines). Because the name has no date, a slot that JMA did not
// update today still holds yesterday's image. So a frame is only used when the server says the file was last
// modified shortly after its slot time: never a day-old picture shown as current.
//
// DDRiVE-M stores only the address and time of each verified frame; the image itself is loaded from JMA by the
// browser, with JMA's citation. Terms: https://www.data.jma.go.jp/mscweb/en/general/note.html
export const HIMAWARI_BASE = 'https://www.data.jma.go.jp/mscweb/data/himawari';

/** Products used. True Color Reproduction is left out: it carries its own acknowledgement terms. */
export const HIMAWARI_PRODUCTS = { b13: 'Infrared (band 13), day and night', b03: 'Visible (band 3), daytime' } as const;
export type HimawariProduct = keyof typeof HIMAWARI_PRODUCTS;

export interface Frame { sector: string; product: HimawariProduct; slot: string; observed_at: string; url: string; last_modified: string }

const pad = (n: number) => String(n).padStart(2, '0');

/** The 10-minute slots from `hours` ago up to `now` (UTC), oldest first. */
export function recentSlots(now: Date, hours: number): { slot: string; observedAt: Date }[] {
  const end = new Date(now); end.setUTCSeconds(0, 0); end.setUTCMinutes(end.getUTCMinutes() - (end.getUTCMinutes() % 10));
  const out: { slot: string; observedAt: Date }[] = [];
  for (let t = end.getTime() - hours * 3600e3 + 600e3; t <= end.getTime(); t += 600e3) {
    const d = new Date(t);
    out.push({ slot: `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`, observedAt: d });
  }
  return out;
}

export const frameUrl = (base: string, sector: string, product: string, slot: string) =>
  `${base.replace(/\/$/, '')}/img/${sector}/${sector}_${product}_${slot}.jpg`;

/** JMA publishes a slot some minutes after it; anything modified before the slot, or hours later, is another day's image. */
export const MAX_PUBLISH_DELAY_MIN = 120;
export function isCurrent(observedAt: Date, lastModified: Date | null): boolean {
  if (!lastModified || Number.isNaN(lastModified.getTime())) return false;
  const lag = (lastModified.getTime() - observedAt.getTime()) / 60e3;
  return lag >= 0 && lag <= MAX_PUBLISH_DELAY_MIN;
}

export interface HimawariDeps {
  /** HEAD request; resolves to the HTTP status and the Last-Modified header. */
  head: (url: string) => Promise<{ status: number; lastModified: string | null }>;
  known: (sector: string, product: string, sinceIso: string) => Promise<Set<string>>;
  save: (frames: Frame[]) => Promise<void>;
  recordRun: (run: { source: string; started: string; ok: boolean; seen: number; added: number; error: string | null }) => Promise<void>;
}

/**
 * Checks the slots of the last `hours` not yet recorded, saves those that are current, and records the run.
 * The run is not ok when JMA cannot be reached at all, or when no frame of the last hour could be verified
 * (Detection then says imagery is unavailable instead of showing an old loop).
 */
export async function ingestHimawari(
  cfg: { base: string; sector: string; products: HimawariProduct[]; hours: number; now?: Date },
  deps: HimawariDeps,
): Promise<{ ok: boolean; seen: number; added: number; error?: string }> {
  const started = new Date().toISOString();
  const now = cfg.now ?? new Date();
  const slots = recentSlots(now, cfg.hours);
  let seen = 0, added = 0, reached = 0, freshLastHour = 0;
  const errors: string[] = [];
  try {
    for (const product of cfg.products) {
      const known = await deps.known(cfg.sector, product, slots[0].observedAt.toISOString());
      const frames: Frame[] = [];
      for (const s of slots) {
        if (known.has(s.observedAt.toISOString())) { if (now.getTime() - s.observedAt.getTime() <= 3600e3) freshLastHour++; continue; }
        const url = frameUrl(cfg.base, cfg.sector, product, s.slot);
        let r;
        try { r = await deps.head(url); } catch (e) { errors.push(`${product} ${s.slot}: ${(e as Error).message}`); continue; }
        reached++; seen++;
        if (r.status !== 200) continue;
        const lm = r.lastModified ? new Date(r.lastModified) : null;
        if (!isCurrent(s.observedAt, lm)) continue;
        frames.push({ sector: cfg.sector, product, slot: s.slot, observed_at: s.observedAt.toISOString(), url, last_modified: lm!.toISOString() });
        if (now.getTime() - s.observedAt.getTime() <= 3600e3) freshLastHour++;
      }
      if (frames.length) { await deps.save(frames); added += frames.length; }
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  const unreachable = reached === 0 && errors.length > 0;
  const ok = !unreachable && freshLastHour > 0 && errors.length === 0;
  const error = unreachable ? `JMA not reachable: ${errors[0]}` : freshLastHour === 0 ? 'No Himawari image of the last hour could be verified as current' : errors.length ? errors.slice(0, 3).join('; ') : null;
  await deps.recordRun({ source: 'HIMAWARI', started, ok, seen, added, error });
  return { ok, seen, added, ...(error ? { error } : {}) };
}

/** HEAD with a time limit; follows no redirects to other hosts. */
export async function headRequest(url: string, timeoutMs = 10_000): Promise<{ status: number; lastModified: string | null }> {
  const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
  await res.body?.cancel();
  return { status: res.status, lastModified: res.headers.get('last-modified') };
}
