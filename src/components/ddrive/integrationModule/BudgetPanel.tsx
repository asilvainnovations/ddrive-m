// Integration (Phase 4): embed risk priorities in budgets. DRRM budget lines per fiscal year and fund source, and the
// approved actions they fund. A DRRM officer approves lines and funds actions; the database enforces the limits (ADR-009).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  BudgetLine, FUND_LABEL, FUND_SHORT, FundSource, NewLine, addLine, approveLine, closeLine, deleteLine, fundFits, listLines, peso,
} from '@/lib/budget';
import { AREA_LABEL, DrrmArea, ResponseAction, fundAction, listActions } from '@/lib/responseActions';
import { Field, Gate, NoteAction, card, input, primary, secondary, danger, useSubmit } from '../rapidMappingModule/ui';
import AskDdriver from '../ai/AskDdriver';
import { listNdrrmpOutputs, type NdrrmpOutput } from '@/lib/planning';

const thisYear = new Date().getFullYear();
const AREAS = Object.keys(AREA_LABEL) as DrrmArea[];

const AddLine: React.FC<{ year: number; onDone: () => void; onCancel: () => void }> = ({ year, onDone, onCancel }) => {
  const [l, setL] = useState<NewLine>({ fiscal_year: year, fund_source: 'ldrrmf_70', drrm_area: 'preparedness', title: '', description: null, aip_code: null, amount_php: 0 });
  const { busy, run } = useSubmit(onDone);
  const set = <K extends keyof NewLine>(k: K, v: NewLine[K]) => setL({ ...l, [k]: v });
  const [outputs, setOutputs] = useState<NdrrmpOutput[]>([]);
  useEffect(() => { listNdrrmpOutputs().then((r) => setOutputs(r.data)); }, []);
  return (
    <form className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4" onSubmit={(e) => { e.preventDefault(); run(() => addLine(l), 'Budget line added as a draft.'); }}>
      <div className="sm:col-span-2"><Field id="bl-title" label="Programme, project or activity (PPA)"><input id="bl-title" required minLength={3} maxLength={200} className={input} value={l.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
      <Field id="bl-year" label="Fiscal year"><input id="bl-year" type="number" min={2000} max={2100} required className={input} value={l.fiscal_year} onChange={(e) => set('fiscal_year', Number(e.target.value))} /></Field>
      <Field id="bl-amount" label="Amount, PHP"><input id="bl-amount" type="number" min={0.01} step="0.01" required className={input} value={l.amount_php || ''} onChange={(e) => set('amount_php', Number(e.target.value))} /></Field>
      <Field id="bl-fund" label="Fund source">
        <select id="bl-fund" className={input} value={l.fund_source} onChange={(e) => set('fund_source', e.target.value as FundSource)}>
          {Object.entries(FUND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field id="bl-area" label="DRRM thematic area (RA 10121)" hint={fundFits(l.fund_source, l.drrm_area) ? undefined : 'The Quick Response Fund can only fund response and recovery actions.'}>
        <select id="bl-area" className={input} value={l.drrm_area} onChange={(e) => set('drrm_area', e.target.value as DrrmArea)}>
          {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
        </select>
      </Field>
      <Field id="bl-aip" label="AIP reference code (optional)"><input id="bl-aip" maxLength={60} className={input} value={l.aip_code ?? ''} onChange={(e) => set('aip_code', e.target.value || null)} /></Field>
      <Field id="bl-ndrrmp" label="NDRRMP 2020-2030 output it serves (optional)">
        <select id="bl-ndrrmp" className={input} value={l.ndrrmp_output ?? ''} onChange={(e) => set('ndrrmp_output', e.target.value || null)}>
          <option value="">None</option>
          {outputs.filter((o) => o.drrm_area === l.drrm_area).map((o) => <option key={o.code} value={o.code}>{o.code} {o.title.slice(0, 90)}</option>)}
        </select>
      </Field>
      <Field id="bl-desc" label="Notes (optional)"><input id="bl-desc" maxLength={4000} className={input} value={l.description ?? ''} onChange={(e) => set('description', e.target.value || null)} /></Field>
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={busy} className={primary}>Add budget line</button>
        <button type="button" onClick={onCancel} className={secondary}>Cancel</button>
      </div>
    </form>
  );
};

const FundSelect: React.FC<{ a: ResponseAction; lines: BudgetLine[]; onDone: () => void }> = ({ a, lines, onDone }) => {
  const [line, setLine] = useState('');
  const { busy, run } = useSubmit(onDone);
  const options = lines.filter((l) => l.status === 'approved' && fundFits(l.fund_source, a.drrm_area));
  if (a.cost_php == null) return <span className="text-amber-800">No estimated cost</span>;
  return (
    <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (line) run(() => fundAction(a.id, line), 'Funded.'); }}>
      <label className="sr-only" htmlFor={`bf-${a.id}`}>Budget line for {a.title}</label>
      <select id={`bf-${a.id}`} className={cn(input, 'py-1 text-xs')} value={line} onChange={(e) => setLine(e.target.value)} required>
        <option value="">Choose a line…</option>
        {options.map((l) => <option key={l.id} value={l.id} disabled={l.available_php < (a.cost_php ?? 0)}>{l.ref} {FUND_SHORT[l.fund_source]} · {peso(l.available_php)} left</option>)}
      </select>
      <button type="submit" disabled={busy || !line} className={cn(secondary, 'py-1 text-xs')}>Fund</button>
    </form>
  );
};

const BudgetPanel: React.FC = () => {
  const { can } = useAuth();
  const [year, setYear] = useState(thisYear);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const [l, a] = await Promise.all([listLines(), listActions()]);
    if (l.error) toast.error(l.error);
    setLines(l.data); setActions(a.data); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const years = useMemo(() => Array.from(new Set([thisYear, thisYear + 1, ...lines.map((l) => l.fiscal_year)])).sort((x, y) => y - x), [lines]);
  const yearLines = lines.filter((l) => l.fiscal_year === year);
  const live = yearLines.filter((l) => l.status !== 'draft');
  const open = actions.filter((a) => ['approved', 'in_progress'].includes(a.status));
  const unfunded = open.filter((a) => !a.budget_line_id);
  const byFund = (Object.keys(FUND_LABEL) as FundSource[]).map((f) => {
    const ls = live.filter((l) => l.fund_source === f);
    return { f, amount: ls.reduce((s, l) => s + Number(l.amount_php), 0), committed: ls.reduce((s, l) => s + Number(l.committed_php), 0) };
  }).filter((x) => x.amount > 0);
  const byArea = AREAS.map((area) => ({
    area,
    budgeted: live.filter((l) => l.drrm_area === area).reduce((s, l) => s + Number(l.amount_php), 0),
    committed: live.filter((l) => l.drrm_area === area).reduce((s, l) => s + Number(l.committed_php), 0),
    gap: unfunded.filter((a) => a.drrm_area === area).reduce((s, a) => s + Number(a.cost_php ?? 0), 0),
    noCost: unfunded.filter((a) => a.drrm_area === area && a.cost_php == null).length,
  }));

  return (
    <section id="budget" className={cn(card, 'space-y-5')} aria-labelledby="budget-h">
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center"><Wallet className="w-5 h-5 text-white" aria-hidden="true" /></div>
        <div className="flex-1 min-w-[16rem]">
          <h2 id="budget-h" className="font-montserrat font-bold text-lg">DRRM budget and funded actions</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Budget lines per fund source and thematic area, and the approved actions from Response they fund. LDRRMF: at least 5% of estimated
            regular revenue; 30% Quick Response Fund, 70% for the other DRRM areas (RA 10121 s. 21; JMC 2013-1). Record lines as approved in the AIP.
          </p>
        </div>
        <label className="text-xs flex items-center gap-1">Fiscal year
          <select className={cn(input, 'py-1 w-auto')} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
      </div>

      {loading && <p role="status" className="text-sm text-slate-500">Loading budget…</p>}
      <AskDdriver task="funding_gaps" label="Summarise our funding gaps (DDRiVER AI)" idPrefix="fg" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold mb-1">By fund source, {year} (approved and closed lines)</h3>
          {byFund.length === 0 ? <p className="text-xs text-slate-500">No approved lines for {year}.</p> : (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1">Fund</th><th>Budget</th><th>Committed</th><th>Available</th></tr></thead>
              <tbody>{byFund.map((x) => (
                <tr key={x.f} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{FUND_LABEL[x.f]}</td><td>{peso(x.amount)}</td><td>{peso(x.committed)}</td><td>{peso(x.amount - x.committed)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">By thematic area: budget against approved actions</h3>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Area</th><th>Budget {year}</th><th>Committed</th><th>Unfunded actions</th></tr></thead>
            <tbody>{byArea.map((x) => (
              <tr key={x.area} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1">{AREA_LABEL[x.area]}</td><td>{peso(x.budgeted)}</td><td>{peso(x.committed)}</td>
                <td className={cn(x.gap > 0 && 'font-semibold text-amber-800 dark:text-amber-300')}>{peso(x.gap)}{x.noCost ? ` + ${x.noCost} without cost` : ''}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold">Budget lines, {year}</h3>
          <Gate min="analyst" quiet>{!adding && <button type="button" className={secondary} onClick={() => setAdding(true)}><Plus className="w-4 h-4" aria-hidden="true" /> New budget line</button>}</Gate>
        </div>
        {adding && <AddLine year={year} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
        {yearLines.length === 0 ? <p className="text-xs text-slate-500">No budget lines for {year}.</p> : (
          <ul className="space-y-2">
            {yearLines.map((l) => (
              <li key={l.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-2">
                <div className="flex flex-wrap gap-2 items-start">
                  <div className="flex-1 min-w-[14rem]">
                    <p className="text-slate-500">{l.ref} · {FUND_LABEL[l.fund_source]} · {AREA_LABEL[l.drrm_area]}{l.aip_code ? ` · AIP ${l.aip_code}` : ''}{l.ndrrmp_output ? ` · NDRRMP output ${l.ndrrmp_output}` : ''}</p>
                    <p className="font-semibold text-sm">{l.title}</p>
                    {l.approval_basis && <p>Approved: {l.approval_basis}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full border border-slate-300 font-semibold capitalize">{l.status}</span>
                </div>
                <p>{peso(l.amount_php)} budgeted · {peso(l.committed_php)} committed to {l.action_count} action{l.action_count === 1 ? '' : 's'} · <strong>{peso(l.available_php)} available</strong></p>
                {l.status === 'draft' && can('drrm_officer') && (
                  <NoteAction id={`ba-${l.id}`} label="Approval basis (Sanggunian resolution, approved AIP)" button="Approve" minLength={5} tone="primary"
                    onSubmit={async (note) => { const { error } = await approveLine(l.id, note); if (error) { toast.error(error); return false; } toast.success('Budget line approved.'); load(); return true; }} />
                )}
                <div className="flex gap-2">
                  {l.status === 'approved' && can('drrm_officer') && (
                    <button type="button" className={secondary} onClick={async () => { const { error } = await closeLine(l.id); if (error) toast.error(error); else { toast.success('Closed.'); load(); } }}>Close line</button>
                  )}
                  {l.status === 'draft' && can('analyst') && (
                    <button type="button" className={danger} onClick={async () => { const { error } = await deleteLine(l.id); if (error) toast.error(error); else { toast.success('Draft deleted.'); load(); } }}>Delete draft</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1">Approved actions waiting for funding ({unfunded.length})</h3>
        {unfunded.length === 0 ? <p className="text-xs text-slate-500">Every approved action has a budget line.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {unfunded.map((a) => (
              <li key={a.id} className="py-2 flex flex-wrap gap-2 items-center">
                <Link to={`/response?tab=actions&action=${a.id}`} className="flex-1 min-w-[14rem] underline font-semibold">{a.ref} {a.title}</Link>
                <span>{AREA_LABEL[a.drrm_area]} · {peso(a.cost_php)}</span>
                {can('drrm_officer') && <FundSelect a={a} lines={lines} onDone={load} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default BudgetPanel;
