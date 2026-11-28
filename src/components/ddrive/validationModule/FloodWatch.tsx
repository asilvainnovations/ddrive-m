// Validation · Flood intelligence for a sub-region (ADR-019). Rolls the organisation's flood outlook (Detection →
// Flood intelligence, ADR-016) up to the LGUs of Metro Manila, reads a river gauge against its published alarm levels,
// lists the UP NOAH flood hazard layers for each LGU, and screens flood measures by benefit-cost ratio.
// Decision support for exercises and PDRA, never a warning: PAGASA warns (RA 10639) and the LDRRMO decides.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCopy, ExternalLink, Plus, ScrollText, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LEVEL_LABEL, addDays, listFloodAreas, listRainfall, manilaToday, outlook, type FloodArea, type Rainfall } from '@/lib/floodIntel';
import { MEASURE_TYPE, missingAssumptions, rollup, screenAll, watchList, watchRows, watchText, type Assumptions, type Measure, type MeasureType } from '@/lib/floodWatch';
import { METRO_MANILA, NOAH_LINKS, alarmAt } from '@/content/subRegions';
import { addLog } from '@/lib/eoc';
import { Field, Gate, card, input, primary, secondary } from '../rapidMappingModule/ui';

const num = (s: string) => { const v = Number(s); return s.trim() === '' || !Number.isFinite(v) ? 0 : v; };
const php = (v: number) => `₱${v.toLocaleString('en-PH', { maximumFractionDigits: 1 })}M`;

const FloodWatch: React.FC = () => {
  const region = METRO_MANILA;
  const { activeTenant } = useAuth();
  const [areas, setAreas] = useState<FloodArea[]>([]);
  const [rain, setRain] = useState<Rainfall[]>([]);
  const [date, setDate] = useState(manilaToday());
  const [product, setProduct] = useState('');
  const [gauge, setGauge] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let off = false;
    Promise.all([listFloodAreas(), listRainfall(addDays(manilaToday(), -10))]).then(([a, r]) => {
      if (off) return;
      setAreas(a.data); setRain(r.data); setLoaded(true);
      if (a.error) toast.error(a.error);
    });
    return () => { off = true; };
  }, [activeTenant]);

  const rows = useMemo(() => watchRows(region, outlook(areas, rain, date)), [region, areas, rain, date]);
  const lgus = useMemo(() => rollup(region, rows), [region, rows]);
  const list = useMemo(() => watchList(rows), [rows]);
  const text = watchText(region, list, date, { product, at: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) });
  const point = region.watchPoints[0]!;
  const reading = gauge.trim() === '' ? null : Number(gauge);
  const alarm = alarmAt(point, reading);

  const copy = async () => { try { await navigator.clipboard.writeText(text); toast.success('Watch list copied'); } catch { toast.error('Copying is blocked in this browser; select the text instead.'); } };
  const toLog = async () => {
    const { error } = await addLog({ entry_type: 'situation', function: 'planning', body: text.slice(0, 4000) });
    if (error) toast.error(error); else toast.success('Added to the EOC operations log');
  };

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="fw-title">
        <h3 id="fw-title" className="font-montserrat font-bold text-lg mb-1">Flood watch: {region.name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Your barangays' flood outlook (DDRiVE-M flood rule v1, from your rainfall and UP NOAH hazard shares) grouped by LGU. Decision support, not a warning: PAGASA warns and each LDRRMO decides.</p>
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <Field id="fw-date" label="Day"><input id="fw-date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value || manilaToday())} /></Field>
          <Field id="fw-product" label="PAGASA product read (optional)" hint="For example, the heavy rainfall warning number. Context only; it does not change the ranking."><input id="fw-product" className={input} value={product} onChange={(e) => setProduct(e.target.value)} /></Field>
        </div>
        {loaded && areas.length === 0 && (
          <p className="text-sm rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3">No barangays are set up for flood intelligence yet. Add them, with their 9-digit PSGC codes, in <Link className="underline" to="/detection">Detection → Flood intelligence</Link>.</p>
        )}
        {areas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Flood outlook by LGU for {date}</caption>
              <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-1 pr-2">LGU</th><th>Areas</th><th>With rainfall</th><th>High</th><th>Watch</th><th>Low</th><th>Highest hazard share</th></tr></thead>
              <tbody>
                {lgus.filter((l) => l.areas > 0).map((l) => (
                  <tr key={l.psgc ?? 'other'} className="border-t border-slate-200 dark:border-slate-700">
                    <th scope="row" className="py-1 pr-2 text-left font-semibold">{l.name}</th><td>{l.areas}</td><td>{l.withRain}{l.withRain < l.areas && <span className="text-xs text-slate-500"> ({l.areas - l.withRain} no reading)</span>}</td>
                    <td>{l.high}</td><td>{l.watch}</td><td>{l.low}</td><td>{l.maxHazard == null ? '—' : `${l.maxHazard}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-1">{lgus.filter((l) => l.psgc && l.areas === 0).length} of {region.lgus.length} LGUs have no barangays set up. An area with no rainfall for the day has no outlook: no reading is not "no rain".</p>
          </div>
        )}
      </section>

      <section className={card} aria-labelledby="fw-list">
        <h3 id="fw-list" className="font-montserrat font-bold text-lg mb-2">Watch list ({list.length})</h3>
        <pre className="whitespace-pre-wrap text-xs rounded-xl bg-slate-50 dark:bg-slate-800 p-3 max-h-64 overflow-auto">{text}</pre>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className={secondary} onClick={copy}><ClipboardCopy className="w-4 h-4" aria-hidden /> Copy</button>
          <Gate min="responder"><button type="button" className={secondary} onClick={toLog}><ScrollText className="w-4 h-4" aria-hidden /> Add to EOC log</button></Gate>
        </div>
        {list.length > 0 && <p className="text-xs text-slate-500 mt-2">Levels: {Object.values(LEVEL_LABEL).join(', ')}. Ordered by level, then hazard share.</p>}
      </section>

      <section className={card} aria-labelledby="fw-gauge">
        <h3 id="fw-gauge" className="font-montserrat font-bold text-lg mb-2">River gauge: {point.name}</h3>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <Field id="fw-reading" label="Reading (m above sea level)"><input id="fw-reading" inputMode="decimal" className={input} value={gauge} onChange={(e) => setGauge(e.target.value)} /></Field>
          <p role="status" className={`md:col-span-2 text-sm rounded-xl p-3 ${alarm ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-slate-800'}`}>
            {reading == null || !Number.isFinite(reading) ? 'Enter the latest reading from the city\'s advisory.' : alarm ? <><strong>{alarm.label}:</strong> {alarm.meaning}</> : 'Below the first alarm.'}
          </p>
        </div>
        <ul className="text-xs text-slate-600 dark:text-slate-300 mt-2">{point.levels.map((l) => <li key={l.at}>{l.at} m: {l.label} — {l.meaning}</li>)}</ul>
        <p className="text-xs text-slate-500 mt-1">{point.source}</p>
      </section>

      <section className={card} aria-labelledby="fw-noah">
        <h3 id="fw-noah" className="font-montserrat font-bold text-lg mb-2">UP NOAH flood hazard maps</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Reference maps for 5-, 25- and 100-year rain return periods. DDRiVE-M does not load NOAH data (ADR-014); open NOAH to view them. Not a warning.</p>
        <ul className="text-sm space-y-1 mb-2">
          {region.lgus.filter((l) => l.noahFloodLayers).map((l) => <li key={l.psgc}><strong>{l.name}:</strong> <code className="text-xs">{l.noahFloodLayers!.map((x) => x.layer).join(', ')}</code></li>)}
        </ul>
        <p className="text-xs text-slate-500 mb-2">Layer names as listed in the MODE Flood Intelligence reference (Phil-LiDAR / LiPAD GeoServer). Other LGUs: use NOAH's search.</p>
        <div className="flex flex-wrap gap-2">{NOAH_LINKS.map((l) => <a key={l.url} className={secondary} href={l.url} target="_blank" rel="noopener noreferrer">{l.name} <ExternalLink className="w-4 h-4" aria-hidden /></a>)}</div>
      </section>

      <BenefitCostScreen />
    </div>
  );
};

const BLANK: Assumptions = { assets: 0, damage: 0, events: 0, horizon: 0, discount: 0.1, om: 0.02 };

const BenefitCostScreen: React.FC = () => {
  const [a, setA] = useState<Record<keyof Assumptions, string>>({ assets: '', damage: '', events: '', horizon: '', discount: '10', om: '2' });
  const [ms, setMs] = useState<(Omit<Measure, 'capital' | 'reduction' | 'economic' | 'social'> & Record<'capital' | 'reduction' | 'economic' | 'social', string>)[]>([]);
  const assumptions: Assumptions = { ...BLANK, assets: num(a.assets), damage: num(a.damage) / 100, events: num(a.events), horizon: num(a.horizon), discount: num(a.discount) / 100, om: num(a.om) / 100 };
  const measures: Measure[] = ms.map((m) => ({ ...m, capital: num(m.capital), reduction: num(m.reduction) / 100, economic: num(m.economic), social: num(m.social) }));
  const missing = missingAssumptions(assumptions);
  const results = missing.length ? [] : screenAll(assumptions, measures);
  const add = () => setMs([...ms, { id: crypto.randomUUID(), name: '', type: 'nbs', capital: '', reduction: '', economic: '', social: '' }]);
  const fields: [keyof Assumptions, string, string][] = [
    ['assets', 'Assets exposed (₱ million)', ''], ['damage', 'Share damaged per event (%)', ''], ['events', 'Damaging floods per year', 'e.g. 0.2 for one in five years'],
    ['horizon', 'Years assessed', ''], ['discount', 'Discount rate (%)', ''], ['om', 'Yearly O&M (% of capital)', ''],
  ];
  return (
    <section className={card} aria-labelledby="bcr-title">
      <h3 id="bcr-title" className="font-montserrat font-bold text-lg mb-1">Flood measures: benefit-cost screen</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Rank nature-based, hybrid and grey options with your own figures. Nothing is filled in for you. A screening aid, not an appraisal; nothing here is saved.</p>
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        {fields.map(([k, label, hint]) => <Field key={k} id={`bcr-${k}`} label={label} hint={hint || undefined}><input id={`bcr-${k}`} inputMode="decimal" className={input} value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value })} /></Field>)}
      </div>
      <div className="space-y-2">
        {ms.map((m, i) => (
          <fieldset key={m.id} className="grid md:grid-cols-7 gap-2 items-end rounded-xl border border-slate-200 dark:border-slate-700 p-2">
            <legend className="sr-only">Measure {i + 1}</legend>
            <Field id={`m-${m.id}-n`} label="Measure"><input id={`m-${m.id}-n`} className={input} value={m.name} onChange={(e) => setMs(ms.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))} /></Field>
            <Field id={`m-${m.id}-t`} label="Type"><select id={`m-${m.id}-t`} className={input} value={m.type} onChange={(e) => setMs(ms.map((x) => x.id === m.id ? { ...x, type: e.target.value as MeasureType } : x))}>
              {Object.entries(MEASURE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {([['capital', 'Capital (₱M)'], ['reduction', 'Damage avoided (%)'], ['economic', 'Other benefit / yr (₱M)'], ['social', 'Social benefit / yr (₱M)']] as const).map(([k, l]) => (
              <Field key={k} id={`m-${m.id}-${k}`} label={l}><input id={`m-${m.id}-${k}`} inputMode="decimal" className={input} value={m[k]} onChange={(e) => setMs(ms.map((x) => x.id === m.id ? { ...x, [k]: e.target.value } : x))} /></Field>
            ))}
            <button type="button" className={secondary} aria-label={`Remove measure ${m.name || i + 1}`} onClick={() => setMs(ms.filter((x) => x.id !== m.id))}><Trash2 className="w-4 h-4" /></button>
          </fieldset>
        ))}
        <button type="button" className={secondary} onClick={add}><Plus className="w-4 h-4" aria-hidden /> Add a measure</button>
      </div>
      {missing.length > 0 ? <p className="text-sm mt-3">Still needed: {missing.join(', ')}.</p> : results.length > 0 && (
        <table className="w-full text-sm mt-3">
          <caption className="sr-only">Measures ranked by benefit-cost ratio</caption>
          <thead><tr className="text-left text-xs uppercase text-slate-500"><th>Measure</th><th>Type</th><th>Benefits (PV)</th><th>Costs (PV)</th><th>BCR</th><th>NPV</th></tr></thead>
          <tbody>{results.map((r) => (
            <tr key={r.measure.id} className="border-t border-slate-200 dark:border-slate-700"><th scope="row" className="text-left py-1">{r.measure.name || 'Unnamed'}</th><td>{MEASURE_TYPE[r.measure.type]}</td>
              <td>{php(r.benefits)}</td><td>{php(r.cost)}</td><td>{r.bcr == null ? '—' : r.bcr.toFixed(2)}</td><td>{php(r.npv)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
};

export default FloodWatch;
