// Validation · ECHO: Evacuation and Camp Handling Operations with evacuation intelligence, for a sub-region (ADR-019).
// An exercise worksheet: each LGU's projected displaced persons (disaggregated) against its centres' covered space,
// water and toilets, with candidate host LGUs in the same district for any shortfall. Findings can be added to an
// exercise as checks. A planning check, not a certification: nothing here orders an evacuation or opens a centre.
import React, { useEffect, useMemo, useState } from 'react';
import { Download, ListPlus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { addCheck, listChecks, listExercises, type Exercise } from '@/lib/planning';
import { BENCHMARKS, SOURCES, assessLgu, hostSuggestions, movementHours, parseWhole, totals, type LguPlan } from '@/lib/echo';
import { METRO_MANILA } from '@/content/subRegions';
import { Field, Gate, card, input, primary, secondary } from '../rapidMappingModule/ui';

type Cols = 'displaced' | 'female' | 'children' | 'older' | 'pwd' | 'coveredM2' | 'waterLpd' | 'toilets';
const COLS: [Cols, string][] = [
  ['displaced', 'Displaced persons'], ['female', 'Female'], ['children', 'Children'], ['older', 'Older persons'], ['pwd', 'Persons with disabilities'],
  ['coveredM2', 'Centre floor area (m²)'], ['waterLpd', 'Water (L/day)'], ['toilets', 'Toilets'],
];
const KEY = 'ddrive:echo:ncr';
type Sheet = Record<string, Record<Cols, string>>;
const blankRow = (): Record<Cols, string> => ({ displaced: '', female: '', children: '', older: '', pwd: '', coveredM2: '', waterLpd: '', toilets: '' });
const load = (): Sheet => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Sheet; } catch { return {}; } };
const fmt = (v: number | null) => (v == null ? '—' : v.toLocaleString('en-PH'));

const EchoPanel: React.FC = () => {
  const region = METRO_MANILA;
  const { activeTenant } = useAuth();
  const [sheet, setSheet] = useState<Sheet>(load);
  const [selected, setSelected] = useState<string[]>(() => Object.keys(load()).length ? Object.keys(load()) : ['137402000', '137403000', '137404000']);
  const [phase, setPhase] = useState<'short' | 'long'>('short');
  const [move, setMove] = useState({ vehicles: '', perTrip: '', roundTrip: '' });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseId, setExerciseId] = useState('');

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(selected.map((p) => [p, sheet[p] ?? blankRow()])))); } catch { /* storage unavailable */ } }, [sheet, selected]);
  useEffect(() => { listExercises().then((r) => setExercises((r.data ?? []).filter((e) => e.status === 'planned' || e.status === 'conducted'))); }, [activeTenant]);

  const invalid: string[] = [];
  const plans: LguPlan[] = selected.map((psgc) => {
    const l = region.lgus.find((x) => x.psgc === psgc)!; const row = sheet[psgc] ?? blankRow();
    const v = (k: Cols) => { const p = parseWhole(row[k]); if (p === 'invalid') { invalid.push(`${l.name}: ${k}`); return null; } return p; };
    return { psgc, name: l.name, group: l.group, displaced: v('displaced'), female: v('female'), children: v('children'), older: v('older'), pwd: v('pwd'), coveredM2: v('coveredM2'), waterLpd: v('waterLpd'), toilets: v('toilets') };
  });
  const results = useMemo(() => plans.map((p) => assessLgu(p, phase)), [JSON.stringify(plans), phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const hosts = hostSuggestions(results);
  const t = totals(results, hosts);
  const findings = results.flatMap((r) => r.findings);
  const moved = hosts.reduce((a, h) => a + h.persons, 0);
  const hours = movementHours(moved || null, parseWhole(move.vehicles) as number | null, parseWhole(move.perTrip) as number | null, parseWhole(move.roundTrip) as number | null);
  const groupName = (g: string) => region.groups.find((x) => x.id === g)?.name ?? g;

  const setCell = (psgc: string, k: Cols, v: string) => setSheet({ ...sheet, [psgc]: { ...(sheet[psgc] ?? blankRow()), [k]: v } });
  const toggle = (psgc: string) => setSelected(selected.includes(psgc) ? selected.filter((x) => x !== psgc) : [...selected, psgc]);

  const toExercise = async () => {
    if (!exerciseId) { toast.error('Choose an exercise first.'); return; }
    const existing = await listChecks(exerciseId);
    let sort = (existing.data ?? []).reduce((a, c) => Math.max(a, c.sort), 0);
    const items = [
      ...findings.filter((f) => f.tone === 'bad' || f.tone === 'warn').map((f) => ({ kind: 'capability' as const, statement: `${f.lgu}: ${f.title}`, expected: f.body, source: f.source })),
      ...hosts.map((h) => ({ kind: 'coordination' as const, statement: `${h.from} evacuees hosted by ${h.to} (${h.persons.toLocaleString('en-PH')} persons)`, expected: 'Receiving LGU consents; route checked; CCCM cluster informed; registered list goes with the families', source: 'ECHO evacuation intelligence; JMC No. 02 s. 2021' })),
    ];
    if (!items.length) { toast.info('No gaps or hosting arrangements to add.'); return; }
    for (const c of items) {
      const { error } = await addCheck(exerciseId, c, ++sort);
      if (error) { toast.error(error); return; }
    }
    toast.success(`${items.length} checks added to the exercise`);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ product: 'DDRiVE-M ECHO', region: region.id, exportedAt: new Date().toISOString(), trainingOnly: true, phase, plans, results: results.map(({ plan, ...r }) => ({ lgu: plan.name, ...r })), hosts, totals: t }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `echo-${region.id}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="echo-title">
        <h3 id="echo-title" className="font-montserrat font-bold text-lg mb-1">ECHO: evacuation and camp handling, {region.name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Exercise worksheet for LGUs evacuating at once. Enter projected figures; ECHO checks space, water and toilets against their own sources and suggests candidate host LGUs. A planning check, not a certification. Kept in this browser only until you add it to an exercise.</p>
        <fieldset className="mb-3">
          <legend className="text-sm font-semibold mb-1">LGUs in this exercise</legend>
          {region.groups.map((g) => (
            <div key={g.id} className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-1"><span className="text-xs uppercase text-slate-500 w-full">{g.name}</span>
              {region.lgus.filter((l) => l.group === g.id).map((l) => <label key={l.psgc} className="inline-flex items-center gap-1 min-h-[32px]"><input type="checkbox" checked={selected.includes(l.psgc)} onChange={() => toggle(l.psgc)} /> {l.name}</label>)}
            </div>
          ))}
        </fieldset>
        <Field id="echo-phase" label="Expected length of displacement"><select id="echo-phase" className={input} value={phase} onChange={(e) => setPhase(e.target.value as 'short' | 'long')}>
          <option value="short">Short (toilets 1 per 50)</option><option value="long">Long (toilets 1 per 20; water 52 L)</option></select></Field>
      </section>

      {selected.length > 0 && (
        <section className={`${card} overflow-x-auto`} aria-labelledby="echo-sheet">
          <h3 id="echo-sheet" className="font-montserrat font-bold text-lg mb-2">Projected figures by LGU</h3>
          <table className="text-sm min-w-[900px] w-full">
            <caption className="sr-only">Projected displaced persons and centre resources by LGU. Blank means not reported.</caption>
            <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="pr-2">LGU</th>{COLS.map(([, l]) => <th key={l} className="pr-1">{l}</th>)}<th>Fits at 3.5 m²</th><th>Short</th></tr></thead>
            <tbody>{results.map((r) => (
              <tr key={r.plan.psgc} className="border-t border-slate-200 dark:border-slate-700">
                <th scope="row" className="text-left pr-2">{r.plan.name}</th>
                {COLS.map(([k, l]) => <td key={k} className="pr-1 py-1"><input aria-label={`${r.plan.name}: ${l}`} inputMode="numeric" className={`${input} px-2 py-1`} value={sheet[r.plan.psgc]?.[k] ?? ''} onChange={(e) => setCell(r.plan.psgc, k, e.target.value)} /></td>)}
                <td>{fmt(r.capacity)}</td><td className={r.shortfall ? 'font-bold text-red-800 dark:text-red-300' : ''}>{fmt(r.shortfall)}</td>
              </tr>
            ))}</tbody>
          </table>
          {invalid.length > 0 && <p role="alert" className="text-sm text-red-800 dark:text-red-300 mt-2">Whole numbers only: {invalid.join(', ')}.</p>}
          <p className="text-sm mt-2">Total displaced {fmt(t.displaced)} · fit in own LGU at standard {fmt(t.capacity)} · short {fmt(t.shortfall)} · still without space after host suggestions {fmt(t.unhoused)}{t.notReported ? ` · ${t.notReported} LGU(s) not reported` : ''}</p>
        </section>
      )}

      <section className={card} aria-labelledby="echo-intel">
        <h3 id="echo-intel" className="font-montserrat font-bold text-lg mb-2">Evacuation intelligence</h3>
        {hosts.length === 0 ? <p className="text-sm">No host suggestions: either no LGU is short of space or no LGU in the same district has spare space.</p> : (
          <ul className="text-sm space-y-1 mb-2">{hosts.map((h, i) => <li key={i}><strong>{h.from} → {h.to}</strong>: {h.persons.toLocaleString('en-PH')} persons ({groupName(h.group)})</li>)}</ul>
        )}
        <p className="text-xs text-slate-500 mb-3">A candidate, not an arrangement: hosting needs the receiving LGU's consent, a checked route and the CCCM cluster (DSWD) informed through the MMDRRMC. Families move with a registered list.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <Field id="echo-veh" label="Vehicles available"><input id="echo-veh" inputMode="numeric" className={input} value={move.vehicles} onChange={(e) => setMove({ ...move, vehicles: e.target.value })} /></Field>
          <Field id="echo-trip" label="Persons per trip"><input id="echo-trip" inputMode="numeric" className={input} value={move.perTrip} onChange={(e) => setMove({ ...move, perTrip: e.target.value })} /></Field>
          <Field id="echo-rt" label="Round trip (minutes)"><input id="echo-rt" inputMode="numeric" className={input} value={move.roundTrip} onChange={(e) => setMove({ ...move, roundTrip: e.target.value })} /></Field>
        </div>
        <p className="text-sm mt-2" role="status">{hours == null ? 'Enter vehicles, persons per trip and round-trip time to estimate how long moving the hosted families takes.' : `Moving ${moved.toLocaleString('en-PH')} persons takes about ${hours.toFixed(1)} hours with these vehicles.`}</p>
      </section>

      <section className={card} aria-labelledby="echo-find">
        <h3 id="echo-find" className="font-montserrat font-bold text-lg mb-2">Findings ({findings.length})</h3>
        <ul className="space-y-1 text-sm mb-3">{findings.map((f, i) => (
          <li key={i} className={`rounded-lg p-2 ${f.tone === 'bad' ? 'bg-red-50 dark:bg-red-950/40' : f.tone === 'warn' ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <strong>{f.tone === 'bad' ? 'Gap' : f.tone === 'warn' ? 'Check' : 'Note'} · {f.lgu}: {f.title}.</strong> {f.body} <span className="text-xs text-slate-500">({f.source})</span></li>
        ))}</ul>
        <div className="flex flex-wrap items-end gap-2">
          <Gate min="analyst">
            <Field id="echo-ex" label="Add gaps and hosting to an exercise"><select id="echo-ex" className={input} value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              <option value="">Choose an exercise</option>{exercises.map((x) => <option key={x.id} value={x.id}>{x.ref} {x.title}</option>)}</select></Field>
            <button type="button" className={primary} onClick={toExercise}><ListPlus className="w-4 h-4" aria-hidden /> Add as checks</button>
          </Gate>
          <button type="button" className={secondary} onClick={exportJson}><Download className="w-4 h-4" aria-hidden /> Export</button>
        </div>
      </section>

      <details className={card}>
        <summary className="font-semibold cursor-pointer">Standards and references</summary>
        <table className="text-sm w-full mt-2"><tbody>{BENCHMARKS.map((b) => (
          <tr key={b.key} className="border-t border-slate-200 dark:border-slate-700"><th scope="row" className="text-left py-1 pr-2">{b.label}</th><td className="pr-2">{b.value}</td><td className="text-xs">{SOURCES[b.source]}, {b.where}{b.note ? `. ${b.note}` : ''}</td></tr>
        ))}</tbody></table>
        <p className="text-xs text-slate-500 mt-2">Each benchmark keeps its own source; they are not merged or averaged.</p>
      </details>
    </div>
  );
};

export default EchoPanel;
