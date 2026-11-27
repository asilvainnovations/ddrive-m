// Detection: Himawari satellite loop of the last three hours over the Philippines (ADR-015).
// Loaded only when the user opens it; images come from the JMA Meteorological Satellite Center, cited as JMA asks.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Play, Satellite, ExternalLink } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { manila } from '@/hooks/useOfficialAlerts';
import { JMA_CITATION, JMA_PAGE, LOOP_HOURS, SAT_PRODUCTS, SAT_STALE_MINUTES, SatFrame, SatProduct, listFrames, playable } from '@/lib/satellite';

const SatelliteLoop: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<SatProduct>('b13');
  const [frames, setFrames] = useState<SatFrame[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);

  const load = useCallback(async () => {
    const r = await listFrames(product);
    setFrames(r.data); setError(r.error); setLoaded(true);
  }, [product]);
  useEffect(() => { if (open) { setLoaded(false); load(); const t = setInterval(load, 5 * 60_000); return () => clearInterval(t); } }, [open, load]);

  const view = useMemo(() => playable(frames), [frames]);
  useEffect(() => { setI(Math.max(0, view.frames.length - 1)); }, [view.frames.length]);
  useEffect(() => {
    if (!open || !playing || view.frames.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % view.frames.length), 500);
    return () => clearInterval(t);
  }, [open, playing, view.frames.length]);
  const f = view.frames[i];
  const sector = frames[0]?.sector ?? 'se2';

  return (
    <GlassCard className="p-6" hover={false}>
      <section aria-labelledby="sat-heading" className="space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <Satellite className="w-6 h-6 text-blue-700" aria-hidden="true" />
          <div className="flex-1 min-w-[16rem]">
            <h2 id="sat-heading" className="font-montserrat font-bold text-lg">Satellite: Himawari, last {LOOP_HOURS} hours</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">Clouds over the Philippines (105°E–140°E, 0°–30°N) every 10 minutes from JMA's Himawari satellite. For information only: it is not a forecast or a warning. PAGASA issues tropical cyclone and rainfall warnings.</p>
          </div>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sat-body"
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold">{open ? 'Hide the loop' : 'Show the loop'}</button>
        </div>
        {open && (
          <div id="sat-body" className="space-y-2">
            <div role="radiogroup" aria-label="Image type" className="flex flex-wrap gap-2 text-sm">
              {(Object.keys(SAT_PRODUCTS) as SatProduct[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={product === p} onClick={() => setProduct(p)}
                  className={`px-3 py-1 rounded-lg border ${product === p ? 'border-blue-700 bg-blue-50 dark:bg-blue-900/30 font-semibold' : 'border-slate-300'}`}>{SAT_PRODUCTS[p].label}</button>
              ))}
              <span className="text-xs text-slate-600 dark:text-slate-300 self-center">{SAT_PRODUCTS[product].note}</span>
            </div>
            {!loaded ? <p className="text-sm text-slate-500">Loading…</p>
              : error ? <p role="alert" className="text-sm text-red-800">Satellite frames could not be read: {error}</p>
              : view.stale ? (
                <p role="status" className="text-sm rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 p-3">
                  Satellite imagery is not available right now: no image of the last {SAT_STALE_MINUTES} minutes could be confirmed from JMA. Older images are not shown, so a past picture is never mistaken for the current one.
                  {' '}<a href={JMA_PAGE(sector)} target="_blank" rel="noopener noreferrer" className="underline">Check JMA directly</a>.
                </p>
              ) : f && (
                <figure className="space-y-2">
                  <img src={f.url} alt={`Himawari ${SAT_PRODUCTS[product].label.toLowerCase()} image of Southeast Asia, ${manila(f.observed_at)} Manila time`}
                    className="w-full max-h-[36rem] object-contain rounded-xl bg-black" referrerPolicy="no-referrer" />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setPlaying((p) => !p)} className="p-1.5 rounded-lg border border-slate-300" aria-label={playing ? 'Pause' : 'Play'}>
                      {playing ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
                    </button>
                    <input type="range" min={0} max={view.frames.length - 1} value={i} onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }}
                      aria-label="Frame" aria-valuetext={`${manila(f.observed_at)} Manila time`} className="flex-1 min-w-[10rem]" />
                    <span className="text-xs font-semibold tabular-nums" aria-live="off">{manila(f.observed_at)} (frame {i + 1} of {view.frames.length})</span>
                  </div>
                  <figcaption className="text-xs text-slate-500">
                    {JMA_CITATION} (<a href={JMA_PAGE(sector)} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">{JMA_PAGE(sector)} <ExternalLink className="w-3 h-3" aria-hidden="true" /></a>). Images are shown as JMA publishes them; times are when the satellite observed. Your browser loads them from JMA.
                  </figcaption>
                </figure>
              )}
          </div>
        )}
      </section>
    </GlassCard>
  );
};

export default SatelliteLoop;
