// The DDRiVE workbook's reports: Data Scores (per family), the risk matrix with counts, Risk Summary
// (likelihood × severity; exposure × vulnerability) and the Vulnerability Report (four categories). ADR-006.
// Charts carry a table view, shapes as well as colours, and a tooltip on every point.
import React from 'react';
import type { Entry } from '@/lib/ddriveAssessment/api';
import {
  FAMILIES, LIKELIHOOD_BANDS, LIKELIHOOD_LEVELS, SEVERITY_BANDS, SEVERITY_CLASSES, VULNERABILITY_CATEGORIES, familyName, likelihoodBand,
  matrixCode, severityBand,
} from '@/lib/ddriveAssessment/scoring';

const fmt = (v: number | null, d = 1) => (v === null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(d));
const scored = (es: Entry[]) => es.filter((e) => e.risk_code);

// Fill by risk category, with the code always printed: colour is a second cue, never the only one.
export const RISK_FILL: Record<string, string> = { VL: 'bg-emerald-100 text-emerald-950', L: 'bg-lime-100 text-lime-950', M: 'bg-amber-100 text-amber-950', H: 'bg-orange-200 text-orange-950', VH: 'bg-red-200 text-red-950' };
export const riskFill = (code: string | null) => (code ? RISK_FILL[code.replace(/[0-9]+$/, '')] ?? '' : '');

export const DataScores: React.FC<{ entries: Entry[] }> = ({ entries }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <caption className="text-left text-sm font-semibold mb-2">Data scores by hazard family</caption>
      <thead>
        <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b">
          <th className="text-left p-1.5">Family</th><th className="text-left p-1.5">Main hazard: event</th><th className="p-1.5">Exposure</th>
          {VULNERABILITY_CATEGORIES.map((c) => <th key={c.key} className="p-1.5">{c.label}</th>)}
          <th className="p-1.5">Total vulnerability (0–100)</th><th className="p-1.5">Response (0–10)</th><th className="p-1.5">Likelihood (0–10)</th>
          <th className="p-1.5">Severity (−100–100)</th><th className="p-1.5">Rating</th>
        </tr>
      </thead>
      <tbody>
        {FAMILIES.map((f) => {
          const rows = entries.filter((e) => e.family_code === f.code);
          if (!rows.length) return null;
          const total = scored(rows).reduce((a, e) => a + (e.severity ?? 0), 0);
          return (
            <React.Fragment key={f.code}>
              {rows.map((e, i) => (
                <tr key={e.id} className="border-b border-slate-100">
                  {i === 0 && <th rowSpan={rows.length + 1} scope="rowgroup" className="text-left align-top p-1.5 font-semibold">{f.code} {f.name}</th>}
                  <td className="p-1.5">{e.main_hazard}: {e.hazard_event}</td>
                  <td className="p-1.5 text-center">{e.exposure ?? '—'}</td>
                  {VULNERABILITY_CATEGORIES.map((c) => <td key={c.key} className="p-1.5 text-center">{e[c.key] ?? '—'}</td>)}
                  <td className="p-1.5 text-center">{fmt(e.total_vulnerability)}</td>
                  <td className="p-1.5 text-center">{e.response ?? '—'}</td>
                  <td className="p-1.5 text-center">{fmt(e.likelihood)}</td>
                  <td className="p-1.5 text-center">{fmt(e.severity)}</td>
                  <td className="p-1.5 text-center"><span className={`px-1.5 rounded font-bold ${riskFill(e.risk_code)}`}>{e.risk_code ?? 'not scored'}</span></td>
                </tr>
              ))}
              <tr className="border-b-2 border-slate-300 bg-slate-50 dark:bg-slate-800/50">
                <td colSpan={10} className="p-1.5 text-right font-semibold">Total severity for {f.name} (to compare families)</td>
                <td className="p-1.5 text-center font-bold">{fmt(total)}</td>
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  </div>
);

/** The 5×5 matrix of the Risk Matrix sheet, with how many hazard events fall in each cell. */
export const MatrixCounts: React.FC<{ entries: Entry[] }> = ({ entries }) => {
  const s = scored(entries).filter((e) => (e.severity ?? 0) > 0);
  const below = scored(entries).length - s.length;
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-separate border-spacing-1">
        <caption className="text-left text-sm font-semibold mb-1">Risk matrix: hazard events per cell</caption>
        <thead>
          <tr><th className="p-1" /><th className="p-1" />{LIKELIHOOD_LEVELS.map((l, i) => <th key={l} scope="col" className="p-1 font-semibold">{l}<br /><span className="font-normal text-slate-500">{LIKELIHOOD_BANDS[i]}</span></th>)}</tr>
        </thead>
        <tbody>
          {[...SEVERITY_CLASSES].map((sc, si) => ({ sc, si })).reverse().map(({ sc, si }) => (
            <tr key={sc}>
              <th scope="row" className="p-1 text-right font-semibold">{sc}</th>
              <td className="p-1 text-slate-500">{SEVERITY_BANDS[si]}</td>
              {LIKELIHOOD_LEVELS.map((l, li) => {
                const code = matrixCode(si, li);
                const n = s.filter((e) => severityBand(e.severity!) === si && likelihoodBand(e.likelihood!) === li).length;
                return (
                  <td key={l} className={`p-2 text-center rounded-md min-w-[4rem] ${riskFill(code)}`} aria-label={`${sc} severity, ${l} likelihood: ${code}, ${n} hazard event${n === 1 ? '' : 's'}`}>
                    <span className="font-bold">{code}</span>{n > 0 && <span className="block text-[11px]">{n} event{n === 1 ? '' : 's'}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {below > 0 && <p className="text-xs text-slate-600 mt-1">{below} event{below === 1 ? '' : 's'} with severity at or below zero (VL1): outside the threshold of a material risk to invest in.</p>}
    </div>
  );
};

export { familyName };
