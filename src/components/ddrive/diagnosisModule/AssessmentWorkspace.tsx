// One DDRiVE assessment: Information, hazard data entry by family, scenarios, reports, approval, print and export (ADR-006).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Download, FilePlus2, Printer, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import {
  Assessment, Entry, Scenario, addEntry, addScenario, addToRegister, approve, deleteDraft, deleteEntry, deleteScenario, loadAssessment,
  newVersion, updateAssessment, updateEntry,
} from '@/lib/ddriveAssessment/api';
import {
  FAMILIES, FamilyCode, METHOD_LABEL, SCALES, VULNERABILITY_CATEGORIES, eventsFor, riskCategory, scaleWord, score, scenarioScore,
} from '@/lib/ddriveAssessment/scoring';
import { csvCell, download, safeFileName } from '@/lib/rapidMapping/exports';
import { Field, Gate, NoteAction, card, input, primary, secondary, danger, useSubmit, when } from '../rapidMappingModule/ui';
import { DataScores, MatrixCounts, riskFill } from './Reports';
import { LinkedActions } from '../responseModule/ProposeAction';
import AskDdriver from '../ai/AskDdriver';
import { listActions, priorityFor, type ResponseAction } from '@/lib/responseActions';
const Charts = React.lazy(() => import('./Charts'));

type ScoreKey = 'exposure' | 'v_infrastructure' | 'v_productive' | 'v_services' | 'v_social' | 'response';
const SCORE_COLUMNS: { key: ScoreKey; label: string; scale: keyof typeof SCALES }[] = [
  { key: 'exposure', label: 'Exposure', scale: 'exposure' },
  ...VULNERABILITY_CATEGORIES.map((c) => ({ key: c.key as ScoreKey, label: `Vulnerability: ${c.label}`, scale: 'vulnerability' as const })),
  { key: 'response', label: 'Current response measures', scale: 'response' },
];

const fmt = (v: number | null) => (v === null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1));

// ─── One hazard event row ────────────────────────────────────────────────────
const EntryRow: React.FC<{
  e: Entry; method: Assessment['method']; editable: boolean; onSaved: (e: Entry) => void; onRemoved: () => void; onRegistered: () => void;
  actions: ResponseAction[]; onActionsChanged: () => void;
}> = ({ e, method, editable, onSaved, onRemoved, onRegistered, actions, onActionsChanged }) => {
  const [draft, setDraft] = useState(e);
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState('');
  const { can } = useAuth();
  useEffect(() => setDraft(e), [e]);
  // Instant preview from the same formulas the database uses; the stored value replaces it once saved.
  const preview = score(method, draft);
  const save = async (patch: Partial<Entry>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaving(true);
    const r = await updateEntry(e.id, patch);
    setSaving(false);
    if (r.error) { toast.error(r.error); setDraft(e); } else if (r.data) onSaved(r.data);
  };
  const code = draft === e ? e.risk_code : preview?.risk_code ?? null;
  return (
    <>
    <tr className={cn('align-top', !e.risk_code && 'border-b border-slate-100 dark:border-slate-800')}>
      <th scope="row" className="p-1.5 text-left font-medium min-w-[10rem]">{e.main_hazard}<br /><span className="font-normal text-slate-600">{e.hazard_event}</span></th>
      {SCORE_COLUMNS.map((c) => (
        <td key={c.key} className="p-1">
          <label className="sr-only" htmlFor={`${e.id}-${c.key}`}>{c.label} for {e.hazard_event}</label>
          <select id={`${e.id}-${c.key}`} disabled={!editable} className={cn(input, 'py-1 px-1.5 text-xs min-w-[8.5rem]')} value={draft[c.key] ?? ''}
                  onChange={(ev) => save({ [c.key]: ev.target.value === '' ? null : Number(ev.target.value) } as Partial<Entry>)}>
            <option value="">Choose…</option>
            {SCALES[c.scale].map((l, i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </td>
      ))}
      <td className="p-1.5 text-center text-xs">{fmt(preview?.total_vulnerability ?? null)}</td>
      <td className="p-1.5 text-center text-xs">{fmt(preview?.likelihood ?? null)}</td>
      <td className="p-1.5 text-center text-xs">{fmt(preview?.severity ?? null)}</td>
      <td className="p-1.5 text-center">
        <span className={cn('px-1.5 py-0.5 rounded font-bold text-xs', riskFill(code))}>{code ?? 'not scored'}</span>
        {code && <span className="block text-[10px] text-slate-600">{riskCategory(code)}</span>}
        {saving && <span className="block text-[10px] text-slate-500" role="status">Saving…</span>}
      </td>
      <td className="p-1 min-w-[12rem]">
        <label className="sr-only" htmlFor={`${e.id}-comments`}>Comments and justification for {e.hazard_event}</label>
        <textarea id={`${e.id}-comments`} rows={2} readOnly={!editable} className={cn(input, 'text-xs py-1')} defaultValue={e.comments ?? ''}
                  placeholder={editable ? 'Why these scores (evidence, past events)' : ''}
                  onBlur={(ev) => { if (editable && ev.target.value !== (e.comments ?? '')) save({ comments: ev.target.value || null }); }} />
      </td>
      <td className="p-1 text-xs min-w-[9rem]">
        {e.risk_id ? <span className="text-emerald-800 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> In register</span>
          : e.risk_code && can('analyst') ? (
            <form className="flex flex-col gap-1" onSubmit={async (ev) => {
              ev.preventDefault();
              const r = await addToRegister(e.id, owner, 'Environmental');
              if (r.error) toast.error(r.error); else { toast.success(`Added to the risk register as ${r.data}.`); onRegistered(); }
            }}>
              <label className="sr-only" htmlFor={`${e.id}-owner`}>Risk owner</label>
              <input id={`${e.id}-owner`} required minLength={2} placeholder="Risk owner" className={cn(input, 'py-1 text-xs')} value={owner} onChange={(ev) => setOwner(ev.target.value)} />
              <button type="submit" className="underline text-left font-semibold">Add to risk register</button>
            </form>
          ) : null}
        {editable && (
          <button type="button" className="mt-1 text-red-800 underline flex items-center gap-1" aria-label={`Remove ${e.hazard_event}`}
                  onClick={async () => { const r = await deleteEntry(e.id); if (r.error) toast.error(r.error); else onRemoved(); }}>
            <Trash2 className="w-3 h-3" aria-hidden="true" /> Remove
          </button>
        )}
      </td>
    </tr>
    {e.risk_code && (
      // Scored: the interpreted risk can now be treated. Proposals go to Response for a decision.
      <tr className="border-b border-slate-100 dark:border-slate-800">
        <td colSpan={13} className="px-1.5 pb-2">
          <LinkedActions
            filter={{ entryId: e.id }} preloaded={actions} onChanged={onActionsChanged}
            link={{ origin: 'diagnosis', hazard_entry_id: e.id }} min="analyst" idPrefix={`entry-${e.id}`}
            context={`${e.hazard_event} (${e.main_hazard}), rated ${e.risk_code}`}
            defaultTitle={`Reduce ${e.hazard_event.toLowerCase()} risk`} defaultPriority={priorityFor(null, e.risk_code)} compact aiSubject={`entry:${e.id}`}
          />
          <AskDdriver task="explain_rating" subject={e.id} label={`Explain this ${e.risk_code} rating`} idPrefix={`why-${e.id}`} className="mt-1" />
        </td>
      </tr>
    )}
    </>
  );
};

const AddEntryForm: React.FC<{ assessmentId: string; onDone: () => void }> = ({ assessmentId, onDone }) => {
  const [family, setFamily] = useState<FamilyCode>('H3');
  const fam = FAMILIES.find((f) => f.code === family)!;
  const [main, setMain] = useState(fam.mainHazards[0] ?? '');
  const [event, setEvent] = useState(eventsFor(family)[0] ?? '');
  const { busy, run } = useSubmit(onDone);
  const pickFamily = (c: FamilyCode) => {
    setFamily(c);
    setMain(FAMILIES.find((f) => f.code === c)!.mainHazards[0] ?? '');
    setEvent(eventsFor(c)[0] ?? '');
  };
  return (
    <form className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] items-end" onSubmit={(ev) => { ev.preventDefault(); run(() => addEntry(assessmentId, { family_code: family, main_hazard: main, hazard_event: event }), 'Hazard event added. Score it in its row.'); }}>
      <Field id="ae-family" label="Hazard family">
        <select id="ae-family" className={input} value={family} onChange={(e) => pickFamily(e.target.value as FamilyCode)}>
          {FAMILIES.map((f) => <option key={f.code} value={f.code}>{f.code} {f.name}</option>)}
        </select>
      </Field>
      <Field id="ae-main" label="Main hazard" hint={family === 'H8' ? 'Name it, e.g. Southwest monsoon (Habagat).' : undefined}>
        {family === 'H8'
          ? <input id="ae-main" required minLength={2} maxLength={80} className={input} value={main} onChange={(e) => setMain(e.target.value)} />
          : <select id="ae-main" className={input} value={main} onChange={(e) => setMain(e.target.value)}>{fam.mainHazards.map((m) => <option key={m}>{m}</option>)}</select>}
      </Field>
      <Field id="ae-event" label="Hazard event">
        <select id="ae-event" className={input} value={event} onChange={(e) => setEvent(e.target.value)}>{eventsFor(family).map((x) => <option key={x}>{x}</option>)}</select>
      </Field>
      <button type="submit" className={secondary} disabled={busy}><FilePlus2 className="w-4 h-4" aria-hidden="true" /> Add</button>
    </form>
  );
};

// ─── Scenarios ───────────────────────────────────────────────────────────────
const Scenarios: React.FC<{ a: Assessment; entries: Entry[]; scenarios: Scenario[]; onChanged: () => void }> = ({ a, entries, scenarios, onChanged }) => {
  const [chosen, setChosen] = useState<string[]>([]);
  const [name, setName] = useState('');
  const { busy, run } = useSubmit(() => { setChosen([]); setName(''); onChanged(); });
  const scoredEntries = entries.filter((e) => e.risk_code);
  const preview = scenarioScore(scoredEntries.filter((e) => chosen.includes(e.id)).map((e) => ({ family_code: e.family_code, likelihood: e.likelihood!, severity: e.severity! })));
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-600 dark:text-slate-300">
        A scenario combines hazard events (for example an earthquake causing ground movement, then landslides and riverine flooding).
        Its likelihood is the average likelihood; its severity is the event's own severity for one event, otherwise the average over
        hazard families of Σ(likelihood × severity) ÷ 10, as the DDRiVE workbook's Instructions describe.
      </p>
      {scenarios.length > 0 && (
        <ul className="space-y-1">
          {[...scenarios].sort((x, y) => (y.risk_rank ?? 0) - (x.risk_rank ?? 0)).map((s) => (
            <li key={s.id} className="rounded-lg border p-2 flex flex-wrap justify-between gap-2">
              <span><strong>{s.name}</strong> · {s.entry_ids.length} event{s.entry_ids.length === 1 ? '' : 's'} · likelihood {fmt(s.likelihood)} ({s.likelihood_level}) ·
                severity {fmt(s.severity)} ({s.severity_class}) · <span className={cn('px-1.5 rounded font-bold', riskFill(s.risk_code))}>{s.risk_code}</span></span>
              {a.status !== 'superseded' && <Gate min="analyst" quiet><button type="button" className="text-xs underline text-red-800" onClick={() => run(() => deleteScenario(s.id), 'Scenario removed.')}>Remove</button></Gate>}
            </li>
          ))}
        </ul>
      )}
      {a.status !== 'superseded' && (
        <Gate min="analyst">
          {scoredEntries.length === 0 ? <p className="text-xs text-slate-500">Score hazard events first.</p> : (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => addScenario(a.id, name, '', chosen), 'Scenario saved.'); }}>
              <fieldset>
                <legend className="text-xs font-semibold mb-1">Hazard events in the scenario</legend>
                <div className="grid sm:grid-cols-2 gap-1">
                  {scoredEntries.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={chosen.includes(e.id)} onChange={(ev) => setChosen((c) => ev.target.checked ? [...c, e.id] : c.filter((x) => x !== e.id))} />
                      {e.family_code} {e.main_hazard}: {e.hazard_event} ({e.risk_code})
                    </label>
                  ))}
                </div>
              </fieldset>
              {preview && <p className="text-xs" role="status">Preview: likelihood {fmt(preview.likelihood)} ({preview.likelihood_level}), severity {fmt(preview.severity)} ({preview.severity_class}), <strong>{preview.risk_code}</strong>.</p>}
              <div className="flex gap-2 items-end flex-wrap">
                <Field id="sc-name" label="Scenario name"><input id="sc-name" required minLength={3} className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <button type="submit" className={secondary} disabled={busy || chosen.length === 0}>Save scenario</button>
              </div>
            </form>
          )}
        </Gate>
      )}
    </div>
  );
};

// ─── Workspace ───────────────────────────────────────────────────────────────
const toCsv = (a: Assessment, entries: Entry[]) => {
  const head = ['assessment', 'version', 'method', 'family', 'main_hazard', 'hazard_event', 'exposure', 'v_infrastructure', 'v_productive', 'v_services',
    'v_social', 'total_vulnerability', 'response', 'likelihood', 'severity', 'likelihood_level', 'severity_class', 'risk_code', 'comments'];
  const lines = [head.join(',')];
  for (const e of entries) {
    lines.push([a.ref, a.version_label, a.method, e.family_code, e.main_hazard, e.hazard_event, e.exposure, e.v_infrastructure, e.v_productive, e.v_services,
      e.v_social, e.total_vulnerability, e.response, e.likelihood, e.severity, e.likelihood_level, e.severity_class, e.risk_code, e.comments].map(csvCell).join(','));
  }
  lines.push('', csvCell('Scores rank hazards for prioritisation; they are not probabilities. Method: DDRiVE (after UNDRR Quick Risk Estimation).'));
  return lines.join('\r\n');
};

const AssessmentWorkspace: React.FC<{ a: Assessment; onChanged: (focus?: string | null) => void }> = ({ a, onChanged }) => {
  const { can } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(a);
  const [adding, setAdding] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);
  const editable = a.status === 'draft' && can('analyst');
  const { busy, run } = useSubmit(() => onChanged());

  const load = useCallback(async () => {
    const r = await loadAssessment(a.id);
    if (r.error) toast.error(r.error);
    setEntries(r.data.entries); setScenarios(r.data.scenarios); setLoading(false);
  }, [a.id]);
  useEffect(() => { setInfo(a); setLoading(true); load(); }, [a, load]);
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const loadActions = useCallback(async () => { setActions((await listActions()).data.filter((x) => x.hazard_entry_id)); }, []);
  useEffect(() => { loadActions(); }, [loadActions]);

  const unscored = entries.filter((e) => !e.risk_code).length;
  const byFamily = useMemo(() => FAMILIES.map((f) => ({ f, rows: entries.filter((e) => e.family_code === f.code) })).filter((x) => x.rows.length), [entries]);
  const set = (k: keyof Assessment) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setInfo({ ...info, [k]: e.target.value });

  const print = () => {
    document.body.classList.add('rm-printing');
    const done = () => { document.body.classList.remove('rm-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1000);
  };

  return (
    <div className="space-y-5">
      <header className={card}>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{a.ref}{a.version_label ? ` · ${a.version_label}` : ''} · {a.status === 'draft' ? 'Draft' : a.status === 'approved' ? `Approved ${when(a.approved_at)}` : 'Superseded by a newer version'}</p>
            <h2 className="font-montserrat font-bold text-xl">{a.title}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Method: {METHOD_LABEL[a.method]}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            <button type="button" className={secondary} onClick={print}><Printer className="w-4 h-4" aria-hidden="true" /> Print or save as PDF</button>
            <button type="button" className={secondary} disabled={!entries.length} onClick={() => download(`${safeFileName(`DDRiVE_${a.ref}_${a.title}`)}.csv`, toCsv(a, entries), 'text/csv;charset=utf-8')}>
              <Download className="w-4 h-4" aria-hidden="true" /> CSV
            </button>
            {a.status === 'draft' && (
              <Gate min="drrm_officer" quiet>
                <button type="button" className={primary} disabled={busy || unscored > 0 || !entries.length} title={unscored ? `${unscored} hazard event(s) not fully scored` : undefined}
                        onClick={() => run(async () => approve(a.id), 'Approved. It now informs the risk context of official alerts.')}>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Approve
                </button>
              </Gate>
            )}
            {a.status === 'approved' && (
              <Gate min="analyst" quiet>
                <button type="button" className={secondary} disabled={busy} onClick={async () => {
                  const r = await newVersion(a.id);
                  if (r.error) toast.error(r.error); else { toast.success('New draft version started from this one.'); onChanged(r.data); }
                }}><Copy className="w-4 h-4" aria-hidden="true" /> New version</button>
              </Gate>
            )}
            {a.status === 'draft' && can('analyst') && (
              <button type="button" className={danger} onClick={async () => { const r = await deleteDraft(a.id); if (r.error) toast.error(r.error); else { toast.success('Draft deleted.'); onChanged(null); } }}>
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete draft
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 flex gap-2">
          <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
          Use this assessment in a workshop with several stakeholders, not as one person's judgement. Record why each score was given.
          Scores rank hazards so the group can prioritise; they are not probabilities.
        </p>
      </header>

      <section className={card} aria-labelledby="ha-info">
        <h3 id="ha-info" className="font-semibold mb-2">Information</h3>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => updateAssessment(a.id, {
          title: info.title, description: info.description || null, assessor: info.assessor || null, participants: info.participants || null,
          completed_on: info.completed_on || null, review_on: info.review_on || null, version_label: info.version_label || null, psgc_code: info.psgc_code || null,
        }), 'Saved.'); }}>
          <Field id="ha-title" label="Location / region name"><input id="ha-title" required minLength={3} readOnly={!editable} className={input} value={info.title} onChange={set('title')} /></Field>
          <Field id="ha-psgc" label="PSGC code (optional)"><input id="ha-psgc" inputMode="numeric" pattern="[0-9]{9,10}" readOnly={!editable} className={input} value={info.psgc_code ?? ''} onChange={set('psgc_code')} /></Field>
          <div className="sm:col-span-2"><Field id="ha-desc" label="Description, including the assets under examination"><textarea id="ha-desc" rows={2} readOnly={!editable} className={input} value={info.description ?? ''} onChange={set('description')} /></Field></div>
          <Field id="ha-assessor" label="Assessor (facilitator)"><input id="ha-assessor" readOnly={!editable} className={input} value={info.assessor ?? ''} onChange={set('assessor')} /></Field>
          <Field id="ha-part" label="Participating offices and groups"><input id="ha-part" readOnly={!editable} className={input} value={info.participants ?? ''} onChange={set('participants')} placeholder="e.g. CDRRMO, CPDO, CSWDO, barangay captains, PWD federation" /></Field>
          <Field id="ha-done" label="Completion date"><input id="ha-done" type="date" readOnly={!editable} className={input} value={info.completed_on ?? ''} onChange={set('completed_on')} /></Field>
          <Field id="ha-review" label="Review date"><input id="ha-review" type="date" readOnly={!editable} className={input} value={info.review_on ?? ''} onChange={set('review_on')} /></Field>
          <Field id="ha-ver" label="Version"><input id="ha-ver" readOnly={!editable} className={input} value={info.version_label ?? ''} onChange={set('version_label')} placeholder="e.g. v1, 2026 CDRA update" /></Field>
          {editable && <div className="sm:col-span-2"><button type="submit" className={secondary} disabled={busy}>Save information</button></div>}
        </form>
      </section>

      <section className={card} aria-labelledby="ha-entry">
        <div className="flex flex-wrap justify-between gap-2 items-center mb-2">
          <h3 id="ha-entry" className="font-semibold">Hazard data entry ({entries.length} hazard event{entries.length === 1 ? '' : 's'}{unscored ? `, ${unscored} not fully scored` : ''})</h3>
          {editable && <button type="button" className={secondary} onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'Add hazard event'}</button>}
        </div>
        {adding && editable && <div className="mb-3"><AddEntryForm assessmentId={a.id} onDone={load} /></div>}
        {loading ? <p role="status" className="text-sm text-slate-500">Loading…</p> : entries.length === 0 ? <p className="text-sm text-slate-500">No hazard events yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b">
                  <th className="text-left p-1.5">Main hazard: event</th>
                  {SCORE_COLUMNS.map((c) => <th key={c.key} className="text-left p-1.5">{c.label}</th>)}
                  <th className="p-1.5">Total vuln. (0–100)</th><th className="p-1.5">Likelihood (0–10)</th><th className="p-1.5">Severity</th><th className="p-1.5">Rating</th>
                  <th className="text-left p-1.5">Comments and justification</th><th className="p-1.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              {byFamily.map(({ f, rows }) => (
                <tbody key={f.code}>
                  <tr><th colSpan={13} scope="colgroup" className="text-left bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-semibold">{f.code} – {f.name}</th></tr>
                  {rows.map((e) => (
                    <EntryRow key={e.id} e={e} method={a.method} editable={editable}
                              onSaved={(x) => setEntries((all) => all.map((y) => (y.id === x.id ? x : y)))}
                              onRemoved={load} onRegistered={load}
                              actions={actions.filter((x) => x.hazard_entry_id === e.id)} onActionsChanged={loadActions} />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
        {!editable && a.status === 'draft' && <p className="text-xs text-slate-500 mt-2">Analysts and above can score. You can read it.</p>}
      </section>

      <section id="rm-print-area" className={cn(card, 'space-y-5')} aria-labelledby="ha-reports">
        <div className="rm-print-only">
          <p className="text-xs">DDRiVE-M · Data-Driven Risk and Vulnerability Estimation · {a.ref}{a.version_label ? ` ${a.version_label}` : ''}</p>
          <h2 className="font-bold text-lg">{a.title}</h2>
          <p className="text-xs">{a.description}</p>
          <p className="text-xs">Assessor: {a.assessor ?? '—'} · Participants: {a.participants ?? '—'} · Completed {a.completed_on ?? '—'} · Review {a.review_on ?? '—'} · Status {a.status} · Printed {when(new Date().toISOString())}</p>
        </div>
        <h3 id="ha-reports" className="font-semibold">Reports</h3>
        <MatrixCounts entries={entries} />
        <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3" onToggle={(e) => setChartsOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer font-semibold text-sm">Risk Summary and Vulnerability Report charts</summary>
          {chartsOpen && <React.Suspense fallback={<p role="status" className="text-sm text-slate-500 mt-2">Loading charts…</p>}><div className="mt-3"><Charts entries={entries} /></div></React.Suspense>}
        </details>
        <DataScores entries={entries} />
        <div>
          <h4 className="font-semibold text-sm mb-1">Scenarios</h4>
          <Scenarios a={a} entries={entries} scenarios={scenarios} onChanged={load} />
        </div>
        <p className="text-[11px] text-slate-500">
          Likelihood ranking compares this location's hazard events with each other, from exposure and vulnerability; it is not a probability.
          Severity is likelihood × 10 minus current response measures × 10; a rating of VL1 at or below zero means the event is outside the
          threshold of a material risk to invest in, or that response measures were scored unrealistically high. Method after UNDRR's Quick Risk Estimation tool.
        </p>
      </section>
    </div>
  );
};

export default AssessmentWorkspace;
