// Detection: Flood Intelligence (ADR-016). Rainfall recorded or forecast for each barangay, against its UP NOAH
// flood hazard, through the rule in src/content/flood-rule-v1.json. Every input is shown; nothing is a warning.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Upload } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { isBackendConfigured } from '@/lib/supabase';
import {
  FLOOD_RULE, FloodArea, FloodLevel, LEVEL_LABEL, Outlook, Rainfall, addDays, areasFromCsv, deleteFloodArea, importFloodAreas,
  listFloodAreas, listRainfall, manilaToday, outlook, rainfallFromCsv, recordRainfall,
} from '@/lib/floodIntel';

const input = 'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm';
const btn = 'px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold';
const ORDER: Record<FloodLevel, number> = { danger: 0, warning: 1, safe: 2 };
const BADGE: Record<FloodLevel, string> = {
  danger: 'bg-red-100 text-red-900 border-red-400 dark:bg-red-900/30 dark:text-red-200',
  warning: 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-900/30 dark:text-amber-200',
  safe: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200',
};
const pct = (p: number) => `${Math.round(p * 100)}%`;
const mm = (n: number) => `${Math.round(n * 10) / 10} mm`;

const RecordRain: React.FC<{ areas: FloodArea[]; date: string; onDone: () => void }> = ({ areas, date, onDone }) => {
  const [area, setArea] = useState(areas[0]?.id ?? '');
  const [day, setDay] = useState(date);
  const [value, setValue] = useState('');
  const [kind, setKind] = useState<'observed' | 'forecast'>('observed');
  const [source, setSource] = useState('');
  useEffect(() => setDay(date), [date]);
  return (
    <form className="grid gap-2 sm:grid-cols-6 items-end text-xs" onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await recordRainfall([{ area_id: area, obs_date: day, rain_mm: Number(value), kind }], source);
      if (error) toast.error(error); else { toast.success('Rainfall recorded.'); setValue(''); onDone(); }
    }}>
      <div className="sm:col-span-2"><label htmlFor="fi-area" className="font-semibold">Barangay</label>
        <select id="fi-area" required className={input} value={area} onChange={(e) => setArea(e.target.value)}>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><label htmlFor="fi-day" className="font-semibold">Day</label><input id="fi-day" type="date" required className={input} value={day} onChange={(e) => setDay(e.target.value)} /></div>
      <div><label htmlFor="fi-mm" className="font-semibold">Rainfall (mm, day total)</label><input id="fi-mm" type="number" min={0} max={2000} step="0.1" required className={input} value={value} onChange={(e) => setValue(e.target.value)} /></div>
      <div><label htmlFor="fi-kind" className="font-semibold">Kind</label><select id="fi-kind" className={input} value={kind} onChange={(e) => setKind(e.target.value as 'observed' | 'forecast')}><option value="observed">Observed</option><option value="forecast">Forecast</option></select></div>
      <div className="sm:col-span-5"><label htmlFor="fi-src" className="font-semibold">Source of the reading</label><input id="fi-src" required minLength={3} className={input} placeholder="For example: LGU rain gauge at the barangay hall; PAGASA forecast" value={source} onChange={(e) => setSource(e.target.value)} /></div>
      <button type="submit" className={btn}>Record</button>
    </form>
  );
};

const ImportCsv: React.FC<{ label: string; help: string; sourceHint: string; onFile: (text: string, source: string) => Promise<void> }> = ({ label, help, sourceHint, onFile }) => {
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const id = label.replace(/\W+/g, '-').toLowerCase();
  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-slate-600 dark:text-slate-300">{help}</p>
      <input aria-label={`Source for ${label}`} className={input} placeholder={sourceHint} value={source} onChange={(e) => setSource(e.target.value)} />
      <label htmlFor={id} className={`${btn} inline-flex items-center gap-1 cursor-pointer ${source.trim().length < 3 || busy ? 'opacity-50 pointer-events-none' : ''}`}>
        <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Choose CSV file
      </label>
      <input id={id} type="file" accept=".csv,text/csv" className="sr-only" disabled={source.trim().length < 3 || busy} onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        setBusy(true); try { await onFile(await f.text(), source.trim()); } finally { setBusy(false); }
      }} />
    </div>
  );
};

const FloodIntelligence: React.FC = () => {
  const { can } = useAuth();
  const [areas, setAreas] = useState<FloodArea[]>([]);
  const [rain, setRain] = useState<Rainfall[]>([]);
  const [date, setDate] = useState(manilaToday());
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isBackendConfigured) { setLoaded(true); return; }
    const [a, r] = await Promise.all([listFloodAreas(), listRainfall(addDays(manilaToday(), -40))]);
    setAreas(a.data); setRain(r.data); setError(a.error ?? r.error); setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => outlook(areas, rain, date).sort((x, y) =>
    (x.score ? ORDER[x.score.level] : 3) - (y.score ? ORDER[y.score.level] : 3) || x.area.name.localeCompare(y.area.name)), [areas, rain, date]);
  const counts = rows.reduce((c, o) => { const k = o.score?.level ?? 'none'; c[k] = (c[k] ?? 0) + 1; return c; }, {} as Record<string, number>);

  const logLink = (o: Outlook) => `/detection?log=1&source=${encodeURIComponent('Local DRRM office')}&type=Flood&name=${encodeURIComponent(
    `Flood ${LEVEL_LABEL[o.score!.level].toLowerCase()} (rainfall rule): ${o.area.name}, ${o.date}`)}`;

  return (
    <GlassCard className="p-6" hover={false}>
      <section aria-labelledby="flood-heading" className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <CloudRain className="w-6 h-6 text-blue-700" aria-hidden="true" />
          <div className="flex-1 min-w-[16rem]">
            <h2 id="flood-heading" className="font-montserrat font-bold text-lg">Flood intelligence: rainfall against flood hazard</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              For each barangay, the day's rainfall and the rain of the {FLOOD_RULE.antecedent_days} days before are compared with thresholds
              lowered by its UP NOAH flood hazard (share of its area in the high-hazard zone for a 100-year rain). This is decision support for
              the LDRRMO, not a warning and not a forecast: PAGASA issues rainfall and flood warnings. The rule has not been checked against
              recorded floods yet.
            </p>
          </div>
          <div className="text-xs"><label htmlFor="fi-outlook-day" className="font-semibold block">Day of the outlook</label>
            <input id="fi-outlook-day" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value || manilaToday())} /></div>
        </div>

        {!loaded ? <p className="text-sm text-slate-500">Loading…</p>
          : error ? <p role="alert" className="text-sm text-red-800">Flood intelligence could not be loaded: {error}</p>
          : areas.length === 0 ? (
            <p className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              No barangays yet. {can('analyst') ? 'Import them below with their flood hazard, for example from Project CCHAIN\'s project_noah_hazards.csv, or from the UP NOAH map.' : 'An analyst adds them with their flood hazard.'}
            </p>
          ) : (
            <>
              <p role="status" className="text-xs">
                {date}: <strong>{counts.danger ?? 0}</strong> high, <strong>{counts.warning ?? 0}</strong> watch, {counts.safe ?? 0} low
                {counts.none ? <>, <strong>{counts.none}</strong> with no rainfall recorded for the day</> : null}.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">Flood outlook by barangay for {date}</caption>
                  <thead><tr className="text-left text-slate-500">
                    <th className="py-1 pr-2">Barangay</th><th className="pr-2">Flood hazard</th><th className="pr-2">Rain on the day</th>
                    <th className="pr-2">Rain, {FLOOD_RULE.antecedent_days} days before</th><th className="pr-2">Thresholds (watch / high)</th><th className="pr-2">Outlook</th><th />
                  </tr></thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.area.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                        <td className="py-1.5 pr-2 font-semibold">{o.area.name}{o.area.adm4_pcode ? <span className="block font-normal text-slate-500">{o.area.adm4_pcode}</span> : null}</td>
                        <td className="pr-2">{o.area.flood_hazard_pct}%<span className="block text-slate-500" title={o.area.hazard_source}>{o.area.hazard_source.slice(0, 40)}{o.area.hazard_source.length > 40 ? '…' : ''}</span></td>
                        <td className="pr-2">{o.rainToday === null ? <span className="text-slate-500">Not recorded</span> : <>{mm(o.rainToday)}{o.todayKind === 'forecast' && <span className="block text-slate-500">forecast</span>}</>}</td>
                        <td className="pr-2">{mm(o.rainPrev)}{o.prevDays < FLOOD_RULE.antecedent_days && <span className="block text-amber-800 dark:text-amber-300">{o.prevDays} of {FLOOD_RULE.antecedent_days} days recorded</span>}</td>
                        <td className="pr-2">{o.score ? `${mm(o.score.warningMm)} / ${mm(o.score.dangerMm)}` : '—'}</td>
                        <td className="pr-2">
                          {o.score ? (
                            <>
                              <span className={`inline-block px-2 py-0.5 rounded-full border font-semibold ${BADGE[o.score.level]}`}>{LEVEL_LABEL[o.score.level]}</span>
                              <span className="block text-slate-500">high {pct(o.score.pDanger)} · watch {pct(o.score.pWarning)}{o.score.bonus ? ' · soaked ground' : ''}</span>
                            </>
                          ) : <span className="text-slate-500">No outlook without the day's rainfall</span>}
                        </td>
                        <td>
                          {o.score && o.score.level !== 'safe' && can('responder') && <Link to={logLink(o)} className="underline font-semibold whitespace-nowrap">Log as hazard record</Link>}
                          {can('analyst') && <button type="button" className="block text-red-800 underline mt-1" onClick={async () => {
                            if (!window.confirm(`Remove ${o.area.name} and its rainfall readings?`)) return;
                            const { error: e } = await deleteFloodArea(o.area.id); if (e) toast.error(e); else load();
                          }}>Remove<span className="sr-only"> {o.area.name}</span></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        {can('responder') && areas.length > 0 && (
          <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Record rainfall</summary>
            <div className="mt-2"><RecordRain areas={areas} date={date} onDone={load} /></div>
          </details>
        )}
        {(can('analyst') || (can('responder') && areas.length > 0)) && (
          <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Import from CSV</summary>
            <div className="grid gap-4 md:grid-cols-2 mt-2">
              {can('analyst') && <ImportCsv label="Barangays and flood hazard"
                help="Columns: adm4_pcode and/or name, and flood_hazard_pct (or Project CCHAIN's pct_area_flood_hazard_100yr_high); lat and lon optional. Existing barangays are updated."
                sourceHint="Source, for example: Project CCHAIN project_noah_hazards (CC BY 4.0)"
                onFile={async (text, source) => {
                  const { rows: r, problems } = areasFromCsv(text);
                  if (!r.length) { toast.error(problems[0] ?? 'No rows found.'); return; }
                  const { result, error: e } = await importFloodAreas(r, source);
                  if (e) toast.error(e); else toast.success(`${result?.added ?? 0} added, ${result?.updated ?? 0} updated${problems.length ? `; ${problems.length} rows skipped` : ''}.`);
                  load();
                }} />}
              {can('responder') && areas.length > 0 && <ImportCsv label="Daily rainfall"
                help="Columns: adm4_pcode or name, date (YYYY-MM-DD), rain_mm (or pr), and kind (observed or forecast; observed if empty). A reading for the same barangay, day and kind is replaced."
                sourceHint="Source, for example: LGU rain gauges; PAGASA automated rain gauges"
                onFile={async (text, source) => {
                  const { rows: r, problems } = rainfallFromCsv(text, areas);
                  if (!r.length) { toast.error(problems[0] ?? 'No rows found.'); return; }
                  const { result, error: e } = await recordRainfall(r, source);
                  if (e) toast.error(e); else toast.success(`${result?.added ?? 0} added, ${result?.updated ?? 0} updated${problems.length ? `; ${problems.length} rows skipped` : ''}.`);
                  load();
                }} />}
            </div>
          </details>
        )}

        <details className="text-xs text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer font-semibold">How the outlook is worked out</summary>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Thresholds start at {FLOOD_RULE.base_warning_mm} mm (watch) and {FLOOD_RULE.base_danger_mm} mm (high) of rain in a day and are lowered by the flood hazard share, to no less than {FLOOD_RULE.min_factor * 100}% of those values.</li>
            <li>The chance rises from {FLOOD_RULE.onset_ratio * 100}% of a threshold. More than {FLOOD_RULE.antecedent_bonus.above_mm} mm in the {FLOOD_RULE.antecedent_days} days before adds {FLOOD_RULE.antecedent_bonus.add * 100} points to the chance of a high outlook (soaked ground).</li>
            <li>The outlook shown is the most likely level. A day without rainfall recorded has no outlook; missing days before count as no rain and are flagged.</li>
            <li>Rule: {FLOOD_RULE.source}. {FLOOD_RULE.status}</li>
            <li>Flood hazard data: UP NOAH; Project CCHAIN, Thinking Machines Data Science (2024), CC BY 4.0, when imported from it.</li>
            <li>Training and testing scripts: <code>scripts/flood_intelligence</code>. A trained model replaces the rule only after it has been tested on recorded floods and reviewed.</li>
          </ul>
        </details>
      </section>
    </GlassCard>
  );
};

export default FloodIntelligence;
