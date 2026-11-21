// Bubble charts for the DDRiVE reports (Risk Summary, Vulnerability Report). Loaded only when the charts are opened,
// so the charting library does not slow down the first view on low-end devices.
import React, { useState } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Legend } from 'recharts';
import type { Entry } from '@/lib/ddriveAssessment/api';
import { VULNERABILITY_CATEGORIES, riskCategory } from '@/lib/ddriveAssessment/scoring';

const fmt = (v: number | null, d = 1) => (v === null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(d));
const scored = (es: Entry[]) => es.filter((e) => e.risk_code);

// ─── Bubble charts ───────────────────────────────────────────────────────────
// Okabe–Ito hues, validated for colour-vision deficiency; the shapes are the secondary encoding the validator requires.
const SERIES = [
  { color: '#0072B2', shape: 'circle' as const },
  { color: '#D55E00', shape: 'square' as const },
  { color: '#009E73', shape: 'triangle' as const },
  { color: '#CC79A7', shape: 'diamond' as const },
];

interface Point { x: number; y: number; z: number; label: string; code: string | null }
const PointTip: React.FC<{ active?: boolean; payload?: { payload: Point }[]; xName: string; yName: string; zName: string }> = ({ active, payload, xName, yName, zName }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow">
      <p className="font-semibold">{p.label}</p>
      <p>{xName}: {fmt(p.x)} · {yName}: {fmt(p.y)}</p>
      <p>{zName}: {fmt(p.z)}{p.code ? ` · rating ${p.code} (${riskCategory(p.code)})` : ''}</p>
    </div>
  );
};

const Bubble: React.FC<{
  title: string; note: string; xName: string; yName: string; zName: string; xDomain: [number, number]; yDomain: [number, number];
  series: { name: string; points: Point[] }[];
}> = ({ title, note, xName, yName, zName, xDomain, yDomain, series }) => {
  const [table, setTable] = useState(false);
  const all = series.flatMap((s) => s.points.map((p) => ({ ...p, series: s.name })));
  return (
    <figure className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex justify-between gap-2 items-start">
        <figcaption><p className="font-semibold text-sm">{title}</p><p className="text-xs text-slate-500">{note}</p></figcaption>
        <button type="button" className="text-xs underline shrink-0" onClick={() => setTable((t) => !t)} aria-pressed={table}>{table ? 'Show chart' : 'Show as table'}</button>
      </div>
      {all.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No scored hazard events yet.</p> : table ? (
        <table className="w-full text-xs mt-2">
          <thead><tr className="border-b text-left"><th className="p-1">Hazard event</th>{series.length > 1 && <th className="p-1">Series</th>}<th className="p-1">{xName}</th><th className="p-1">{yName}</th><th className="p-1">{zName}</th><th className="p-1">Rating</th></tr></thead>
          <tbody>{all.map((p, i) => <tr key={i} className="border-b border-slate-100"><td className="p-1">{p.label}</td>{series.length > 1 && <td className="p-1">{p.series}</td>}<td className="p-1">{fmt(p.x)}</td><td className="p-1">{fmt(p.y)}</td><td className="p-1">{fmt(p.z)}</td><td className="p-1">{p.code}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="h-72 mt-2" role="img" aria-label={`${title}: ${all.length} points. Use "Show as table" for the values.`}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" />
              <XAxis type="number" dataKey="x" name={xName} domain={xDomain} tick={{ fontSize: 11 }} label={{ value: xName, position: 'insideBottom', offset: -16, fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name={yName} domain={yDomain} tick={{ fontSize: 11 }} label={{ value: yName, angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[60, 600]} name={zName} />
              <Tooltip content={<PointTip xName={xName} yName={yName} zName={zName} />} cursor={{ strokeDasharray: '3 3' }} />
              {series.length > 1 && <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s, i) => (
                <Scatter key={s.name} name={s.name} data={s.points} fill={SERIES[i % 4].color} fillOpacity={0.75} stroke="#fcfcfb" strokeWidth={2} shape={SERIES[i % 4].shape} isAnimationActive={false} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
};

const label = (e: Entry) => `${e.main_hazard}: ${e.hazard_event}`;

const RiskSummary: React.FC<{ entries: Entry[] }> = ({ entries }) => {
  const s = scored(entries);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bubble title="Disaster likelihood and severity" note="Point size: likelihood ranking (as in the workbook's Risk Summary)." xName="Likelihood ranking (0–10)" yName="Severity (0–100)" zName="Likelihood"
              xDomain={[0, 10]} yDomain={[0, 100]}
              series={[{ name: 'Hazard events', points: s.map((e) => ({ x: e.likelihood!, y: Math.max(0, e.severity!), z: e.likelihood!, label: label(e), code: e.risk_code })) }]} />
      <Bubble title="Disaster exposure and vulnerability" note="Point size: severity." xName="Exposure (0–10)" yName="Total vulnerability (0–100)" zName="Severity"
              xDomain={[0, 10]} yDomain={[0, 100]}
              series={[{ name: 'Hazard events', points: s.map((e) => ({ x: e.exposure!, y: e.total_vulnerability!, z: Math.max(1, e.severity!), label: label(e), code: e.risk_code })) }]} />
    </div>
  );
};

const VulnerabilityReport: React.FC<{ entries: Entry[] }> = ({ entries }) => {
  const s = scored(entries);
  return (
    <Bubble title="Exposure and vulnerability by category" note="Each category's 0–10 rating. Point size: severity. Shapes distinguish the categories." xName="Exposure (0–10)" yName="Vulnerability rating (0–10)" zName="Severity"
            xDomain={[0, 10]} yDomain={[0, 10]}
            series={VULNERABILITY_CATEGORIES.map((c) => ({ name: c.label, points: s.map((e) => ({ x: e.exposure!, y: e[c.key]!, z: Math.max(1, e.severity!), label: label(e), code: e.risk_code })) }))} />
  );
};


const Charts: React.FC<{ entries: Entry[] }> = ({ entries }) => (
  <div className="space-y-4">
    <RiskSummary entries={entries} />
    <VulnerabilityReport entries={entries} />
  </div>
);
export default Charts;
