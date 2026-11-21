// Diagnosis (Phase 2): DDRiVE hazard, vulnerability and risk assessments (the DDRiVE workbook, ADR-006), the organisation's
// risk register, and the hazard glossary and method. Scores are computed by the database.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, FileSpreadsheet, Plus, Stethoscope } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole } from '@/lib/roles';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Assessment, NewEntry, createAssessment, listAssessments } from '@/lib/ddriveAssessment/api';
import { FAMILIES, LIKELIHOOD_BANDS, LIKELIHOOD_GUIDE, LIKELIHOOD_LEVELS, METHOD_LABEL, Method, SCALES, SEVERITY_BANDS, SEVERITY_CLASSES, matrixCode } from '@/lib/ddriveAssessment/scoring';
import { TEMPLATES } from '@/lib/ddriveAssessment/templates';
import type { WorkbookImport } from '@/lib/ddriveAssessment/workbookImport';
import glossary from '@/lib/ddriveAssessment/glossary.json';
import { Field, card, input, primary, secondary } from '../rapidMappingModule/ui';
import AssessmentWorkspace from './AssessmentWorkspace';
import RiskRegister from './RiskRegister';
import { riskFill } from './Reports';

type Tab = 'assessments' | 'register' | 'glossary';

// ─── New assessment ──────────────────────────────────────────────────────────
const NewAssessment: React.FC<{ onDone: (id: string | null) => void; onCancel: () => void }> = ({ onDone, onCancel }) => {
  const [mode, setMode] = useState<'template' | 'import'>('template');
  const [template, setTemplate] = useState('coastal_lgu');
  const [method, setMethod] = useState<Method>('workbook');
  const [title, setTitle] = useState('');
  const [assessor, setAssessor] = useState('');
  const [imported, setImported] = useState<WorkbookImport | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = TEMPLATES.find((x) => x.key === template)!;

  const readFile = async (f: File) => {
    setReading(true); setImported(null);
    try {
      const { readDdriveWorkbook } = await import('@/lib/ddriveAssessment/workbookImport');
      const r = readDdriveWorkbook(await f.arrayBuffer());
      setImported(r);
      if (r.info.title) setTitle(r.info.title);
      if (r.info.assessor) setAssessor(r.info.assessor);
      if (!r.entries.length) toast.error('No hazard events were found on the Hazard Data Entry sheet.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows: NewEntry[] = mode === 'template'
      ? t.rows.map((r, i) => ({ ...r, sort_order: i }))
      : (imported?.entries ?? []).map((r, i) => ({ ...r, sort_order: i, row: undefined } as NewEntry & { row?: number }))
          .map(({ row: _row, ...rest }) => rest as NewEntry);
    setBusy(true);
    const r = await createAssessment({
      title, assessor: assessor || null, description: mode === 'import' ? imported?.info.description ?? null : null, participants: null,
      completed_on: mode === 'import' ? imported?.info.completed_on ?? null : null, review_on: null,
      version_label: mode === 'import' ? imported?.info.review ?? null : null, psgc_code: null, method, template: mode === 'template' ? template : 'workbook_import',
    }, rows);
    setBusy(false);
    if (r.error) { toast.error(r.error); return; }
    if (r.refused.length) toast.error(`${r.refused.length} row(s) were not accepted: ${r.refused.slice(0, 2).join('; ')}`);
    else toast.success(rows.length ? `Draft created with ${rows.length} hazard events. Score them in the workshop.` : 'Draft created.');
    onDone(r.data);
  };

  return (
    <form className={cn(card, 'space-y-4')} onSubmit={submit}>
      <h2 className="font-montserrat font-bold text-lg">New DDRiVE assessment</h2>
      <div role="radiogroup" aria-label="How to start" className="flex gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="radio" checked={mode === 'template'} onChange={() => setMode('template')} /> From a template</label>
        <label className="flex items-center gap-1"><input type="radio" checked={mode === 'import'} onChange={() => setMode('import')} /> Import a filled DDRiVE workbook (.xlsm / .xlsx)</label>
      </div>
      {mode === 'template' ? (
        <Field id="na-template" label="Starting set of hazard events" hint={`${t.description} ${t.rows.length ? `${t.rows.length} rows, unscored.` : ''}`}>
          <select id="na-template" className={input} value={template} onChange={(e) => setTemplate(e.target.value)}>
            {TEMPLATES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </Field>
      ) : (
        <div className="space-y-2">
          <input type="file" accept=".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                 aria-label="Choose the DDRiVE workbook" className="text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
          <p className="text-xs text-slate-500">Only the Information and Hazard Data Entry sheets are read. Macros are never run, and the scores are recomputed here.</p>
          {reading && <p role="status" className="text-sm">Reading the workbook…</p>}
          {imported && (
            <div className="text-sm" aria-live="polite">
              <p><strong>{imported.entries.length}</strong> hazard event{imported.entries.length === 1 ? '' : 's'} found
                ({imported.entries.filter((x) => [x.exposure, x.v_infrastructure, x.v_productive, x.v_services, x.v_social, x.response].every((v) => v !== null)).length} fully scored).</p>
              {imported.skipped.length > 0 && (
                <ul className="list-disc ml-5 text-xs text-amber-900">{imported.skipped.map((s) => <li key={s.row}>Row {s.row} skipped: {s.reason}</li>)}</ul>
              )}
            </div>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="na-title" label="Location / region name"><input id="na-title" required minLength={3} className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tacloban City coastal barangays" /></Field>
        <Field id="na-assessor" label="Assessor (facilitator)"><input id="na-assessor" className={input} value={assessor} onChange={(e) => setAssessor(e.target.value)} /></Field>
      </div>
      <Field id="na-method" label="Likelihood method" hint="Fixed once the assessment is approved. The workbook method reproduces the DDRiVE .xlsm exactly.">
        <select id="na-method" className={input} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          {(Object.keys(METHOD_LABEL) as Method[]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
        </select>
      </Field>
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={busy || (mode === 'import' && !imported?.entries.length)}>Create draft</button>
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Glossary and method ─────────────────────────────────────────────────────
const Reference: React.FC = () => {
  const [q, setQ] = useState('');
  const terms = glossary.terms.filter((t) => !q || `${t.term} ${t.definition}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-6" hover={false}>
        <h3 className="font-montserrat font-bold text-lg mb-2">Risk matrix</h3>
        <table className="text-xs border-separate border-spacing-1">
          <thead><tr><th /><th />{LIKELIHOOD_LEVELS.map((l, i) => <th key={l} scope="col" className="p-1">{l}<br /><span className="font-normal text-slate-500">{LIKELIHOOD_BANDS[i]}</span></th>)}</tr></thead>
          <tbody>{SEVERITY_CLASSES.map((s, si) => ({ s, si })).reverse().map(({ s, si }) => (
            <tr key={s}><th scope="row" className="p-1 text-right">{s}</th><td className="p-1 text-slate-500">{SEVERITY_BANDS[si]}</td>
              {LIKELIHOOD_LEVELS.map((l, li) => <td key={l} className={cn('p-2 text-center rounded font-bold', riskFill(matrixCode(si, li)))}>{matrixCode(si, li)}</td>)}</tr>
          ))}</tbody>
        </table>
        <h4 className="font-semibold text-sm mt-4">Guide to likelihood</h4>
        <table className="text-xs w-full mt-1">
          <thead><tr className="text-left border-b"><th className="p-1">Level</th><th className="p-1">Definition</th><th className="p-1">From historical data</th></tr></thead>
          <tbody>{LIKELIHOOD_GUIDE.map((g) => <tr key={g.level} className="border-b border-slate-100"><td className="p-1 font-semibold">{g.level}</td><td className="p-1">{g.definition}</td><td className="p-1">{g.historical}</td></tr>)}</tbody>
        </table>
        <h4 className="font-semibold text-sm mt-4">Rating scales</h4>
        <div className="grid sm:grid-cols-3 gap-2 text-[11px] mt-1">
          {(['exposure', 'vulnerability', 'response'] as const).map((k) => (
            <div key={k}><p className="font-semibold capitalize">{k === 'response' ? 'Response measures' : k}</p><ol className="list-none">{SCALES[k].map((l) => <li key={l}>{l}</li>)}</ol></div>
          ))}
        </div>
        <h4 className="font-semibold text-sm mt-4">How the scores are worked out</h4>
        <ul className="text-xs list-disc ml-5 space-y-1 mt-1">
          <li>Total vulnerability = the four vulnerability ratings × 0.25 × 10 (0–100).</li>
          <li>Likelihood ranking: 0.5 × exposure + 0.5 × (total vulnerability ÷ 10). The workbook method rounds this down the way the DDRiVE .xlsm does; the continuous method keeps the decimals.</li>
          <li>Severity = likelihood × 10 − response measures × 10. At or below zero the rating is VL1.</li>
          <li>Hazard families and events follow the UNDRR/ISC hazard classification used for the Sendai Framework.</li>
        </ul>
      </GlassCard>
      <GlassCard className="p-6" hover={false}>
        <h3 className="font-montserrat font-bold text-lg mb-2">Hazard glossary</h3>
        <p className="text-xs text-slate-500 mb-2">From the DDRiVE workbook's glossary (IRDR Peril Classification and Hazard Glossary, 2014). Families: {FAMILIES.map((f) => `${f.code} ${f.name}`).join(', ')}.</p>
        <label className="sr-only" htmlFor="gl-q">Search the glossary</label>
        <input id="gl-q" className={input} placeholder="Search, e.g. storm surge" value={q} onChange={(e) => setQ(e.target.value)} />
        <dl className="mt-3 space-y-2 max-h-[32rem] overflow-y-auto text-sm">
          {terms.map((t) => (
            <div key={t.term}><dt className="font-semibold">{t.term}</dt>
              <dd className="text-slate-700 dark:text-slate-300 text-xs">{/^to be updated$/i.test(t.definition) ? 'No definition in the source glossary yet.' : t.definition}</dd></div>
          ))}
          {!terms.length && <p className="text-xs text-slate-500">No match.</p>}
        </dl>
      </GlassCard>
    </div>
  );
};

// ─── Module ──────────────────────────────────────────────────────────────────
const DiagnosisModule: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'assessments';
  const selected = params.get('assessment');
  const { can } = useAuth();
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const r = await listAssessments();
    if (r.error) toast.error(r.error);
    setList(r.data); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v == null) p.delete(k); else p.set(k, v); }
    setParams(p);
  };
  const current = useMemo(() => list.find((a) => a.id === selected) ?? null, [list, selected]);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'assessments', label: `Hazard assessments (${list.length})` },
    { key: 'register', label: 'Risk register' },
    { key: 'glossary', label: 'Method and glossary' },
  ];

  return (
    <div className="space-y-6">
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center shadow-lg"><Stethoscope className="w-5 h-5 text-white" aria-hidden="true" /></div>
            <div>
              <h1 className="font-montserrat font-bold text-2xl">Diagnosis Module</h1>
              <p className="text-sm text-slate-500 font-poppins">Phase 2 · DDRiVE hazard, vulnerability and risk assessment · ISO 31000 risk register</p>
            </div>
          </div>
          {tab === 'assessments' && (
            can('analyst')
              ? <button type="button" className={primary} onClick={() => { setCreating(true); go({ assessment: null }); }}><Plus className="w-4 h-4" aria-hidden="true" /> New assessment</button>
              : <p className="text-xs text-slate-500">{needsRole('analyst')}</p>
          )}
        </div>
      </GlassCard>

      <div role="tablist" aria-label="Diagnosis sections" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} id={`dx-tab-${t.key}`} aria-controls={`dx-panel-${t.key}`}
                  onClick={() => go({ tab: t.key })}
                  className={cn('px-3 py-2 min-h-[44px] text-sm rounded-t-lg flex items-center gap-1', tab === t.key ? 'border-b-2 border-blue-700 font-semibold' : 'text-slate-600 dark:text-slate-300')}>
            {t.key === 'glossary' ? <BookOpen className="w-4 h-4" aria-hidden="true" /> : t.key === 'assessments' ? <FileSpreadsheet className="w-4 h-4" aria-hidden="true" /> : null}{t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`dx-panel-${tab}`} aria-labelledby={`dx-tab-${tab}`}>
        {tab === 'register' && <RiskRegister />}
        {tab === 'glossary' && <Reference />}
        {tab === 'assessments' && (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <nav aria-label="Assessments" className="space-y-2">
              {loading && <p role="status" className="text-sm text-slate-500">Loading assessments…</p>}
              {!loading && list.length === 0 && <p className="text-sm text-slate-500">No assessments yet. Start one from a template, or import a filled DDRiVE workbook.</p>}
              {list.map((a) => (
                <button key={a.id} type="button" onClick={() => { setCreating(false); go({ assessment: a.id }); }} aria-current={a.id === selected ? 'true' : undefined}
                  className={cn('w-full text-left rounded-xl border p-3 hover:bg-white dark:hover:bg-slate-800', a.id === selected ? 'border-blue-700 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60')}>
                  <span className="block text-xs text-slate-500">{a.ref}{a.version_label ? ` · ${a.version_label}` : ''} · {a.method === 'workbook' ? 'workbook method' : 'continuous method'}</span>
                  <span className="block font-semibold">{a.title}</span>
                  <span className="block text-xs mt-0.5">{a.status === 'approved' ? 'Approved' : a.status === 'draft' ? 'Draft' : 'Superseded'}</span>
                </button>
              ))}
            </nav>
            <div>
              {creating ? (
                <NewAssessment onCancel={() => setCreating(false)} onDone={async (id) => { setCreating(false); await load(); if (id) go({ assessment: id }); }} />
              ) : current ? (
                <AssessmentWorkspace key={`${current.id}-${current.updated_at}`} a={current}
                                     onChanged={async (focus) => { await load(); if (focus !== undefined) go({ assessment: focus }); }} />
              ) : (!loading && list.length > 0 && <p className="text-sm text-slate-500">Choose an assessment.</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisModule;
