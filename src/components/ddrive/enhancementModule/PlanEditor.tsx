// One plan made from a template: fill each section, track completeness, submit, approve with the adopting
// resolution, review (LDRRMP, Memo 147) and test it through an exercise in Validation.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PlanContent, PlanSection, completeness, templateByKey } from '@/content/planTemplates';
import { EXERCISE_TYPES, ExerciseType, startingChecks } from '@/content/formsAndExercises';
import { PlanRecord, PlanTestStatus, approvePlan, createExercise, createForm, retirePlan, savePlan, submitPlan } from '@/lib/planning';
import { para, printDocument, table, esc } from '@/lib/printDoc';
import { Field, NoteAction, card, input, primary, secondary } from '../rapidMappingModule/ui';

type Row = Record<string, string>;

const TableEditor: React.FC<{ s: PlanSection; rows: Row[]; editable: boolean; onChange: (r: Row[]) => void }> = ({ s, rows, editable, onChange }) => {
  const cols = s.table!.columns;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
        <thead><tr>{cols.map((c) => <th key={c.key} className="text-left p-1 bg-slate-50 dark:bg-slate-800 font-semibold">{c.label}</th>)}{editable && <th className="w-8" />}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-200 dark:border-slate-700 align-top">
              {cols.map((c) => (
                <td key={c.key} className="p-0.5">
                  <label className="sr-only" htmlFor={`${s.id}-${i}-${c.key}`}>{c.label}, row {i + 1}</label>
                  <textarea id={`${s.id}-${i}-${c.key}`} rows={c.width === 'lg' ? 3 : 2} readOnly={!editable}
                    className={cn(input, 'text-xs py-1 px-1.5', c.width === 'sm' ? 'min-w-[5rem]' : c.width === 'lg' ? 'min-w-[14rem]' : 'min-w-[8rem]')}
                    value={r[c.key] ?? ''} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))} />
                </td>
              ))}
              {editable && <td><button type="button" aria-label={`Remove row ${i + 1}`} className="p-1 text-red-800" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && <button type="button" className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1" onClick={() => onChange([...rows, {}])}><Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add row</button>}
    </div>
  );
};

/** Plan an exercise of this plan; it opens in Validation. */
export const TestPlanForm: React.FC<{ plan: PlanRecord; onCancel: () => void }> = ({ plan, onCancel }) => {
  const nav = useNavigate();
  const [type, setType] = useState<ExerciseType>('tabletop');
  const [title, setTitle] = useState(`Tabletop exercise: ${plan.title}`);
  const [date, setDate] = useState('');
  const [scenario, setScenario] = useState(plan.hazard ? `${plan.hazard}: ` : '');
  const [busy, setBusy] = useState(false);
  const checks = startingChecks(plan.template_key);
  return (
    <form className="grid gap-3 sm:grid-cols-2 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 p-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const { id, error } = await createExercise({ title, exercise_type: type, plan_id: plan.id, hazard: plan.hazard, scenario: scenario || null, scheduled_on: date || null }, checks);
      setBusy(false);
      if (error) { toast.error(error); return; }
      toast.success('Exercise planned. Add or edit what it tests in Validation.');
      nav(`/validation?tab=exercises&exercise=${id}`);
    }}>
      <p className="sm:col-span-2 text-sm font-semibold">Test this plan</p>
      <p className="sm:col-span-2 text-xs">RA 10121 s. 11(b)(1) asks the council to regularly review and test the plan. The exercise starts with {checks.length} checks from the plan and the standards (objectives, assumptions, capabilities and coordination); you can change them before it is held.</p>
      <Field id="tp-type" label="Type of exercise"><select id="tp-type" className={input} value={type} onChange={(e) => { const t = e.target.value as ExerciseType; setType(t); setTitle(`${EXERCISE_TYPES.find((x) => x.key === t)!.label}: ${plan.title}`); }}>
        {EXERCISE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
      <Field id="tp-date" label="Planned date (optional)"><input id="tp-date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="sm:col-span-2"><Field id="tp-title" label="Title"><input id="tp-title" required minLength={3} className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field></div>
      <div className="sm:col-span-2"><Field id="tp-sc" label="Scenario"><textarea id="tp-sc" rows={2} className={input} value={scenario} onChange={(e) => setScenario(e.target.value)} /></Field></div>
      <p className="sm:col-span-2 text-xs text-slate-600">{EXERCISE_TYPES.find((t) => t.key === type)!.what}</p>
      <div className="sm:col-span-2 flex gap-2"><button type="submit" disabled={busy} className={primary}>Plan the exercise</button><button type="button" onClick={onCancel} className={secondary}>Cancel</button></div>
    </form>
  );
};

export function printPlan(plan: PlanRecord) {
  const t = templateByKey(plan.template_key);
  const c = plan.content ?? {};
  const body = `<h1>${esc(plan.title)}</h1><p class="meta">${esc(plan.ref)} · ${esc(t?.name ?? plan.type)} · ${esc(plan.standard)} · Status: ${esc(plan.status)}${plan.adoption_ref ? ` · Adopted: ${esc(plan.adoption_ref)}` : ''}${plan.period_from ? ` · ${plan.period_from}–${plan.period_to ?? ''}` : ''}${plan.hazard ? ` · Hazard: ${esc(plan.hazard)}` : ''}</p>`
    + (t ? t.sections.map((s) => `<h2>${esc(s.title)}</h2><p class="src">${esc(s.source)}</p>${s.table ? table(s.table.columns, (c[s.id] as Row[]) ?? []) : para(c[s.id])}`).join('') : '');
  printDocument(plan.title, body);
}

const PlanEditor: React.FC<{ plan: PlanRecord & { test?: PlanTestStatus }; onChanged: () => void }> = ({ plan, onChanged }) => {
  const { can } = useAuth();
  const nav = useNavigate();
  const t = templateByKey(plan.template_key);
  const [content, setContent] = useState<PlanContent>(plan.content ?? {});
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  useEffect(() => { setContent(plan.content ?? {}); setDirty(false); }, [plan]);
  const editable = can('analyst') && (plan.status === 'Draft' || plan.status === 'In Review');
  const comp = useMemo(() => (t ? completeness(t, content) : null), [t, content]);
  if (!t) return <p className="text-sm">This plan was not made from a template. <Link to="/enhancement" className="underline">Back</Link></p>;

  const set = (id: string, v: string | Row[]) => { setContent({ ...content, [id]: v }); setDirty(true); };
  const save = async () => { const { error } = await savePlan(plan.id, { content }); if (error) toast.error(error); else { toast.success('Saved.'); setDirty(false); onChanged(); } };

  return (
    <div className="space-y-4">
      <div className={cn(card, 'space-y-3')}>
        <button type="button" className="text-xs inline-flex items-center gap-1 underline" onClick={() => nav('/enhancement?tab=plans')}><ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> All plans</button>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[16rem]">
            <p className="text-xs text-slate-500">{plan.ref} · {t.name} · {t.standard}</p>
            <h2 className="font-montserrat font-bold text-xl">{plan.title}</h2>
            <p className="text-xs">Status: <strong>{plan.status}</strong>{plan.adoption_ref ? ` · Adopted by ${plan.adoption_ref}` : ''}{plan.hazard ? ` · Hazard: ${plan.hazard}` : ''}{plan.period_from ? ` · ${plan.period_from}–${plan.period_to}` : ''}</p>
            {comp && <p className="text-xs mt-1">Required sections filled: <strong>{comp.done} of {comp.total}</strong>{comp.missing.length ? ` · Missing: ${comp.missing.join('; ')}` : ''}</p>}
            <p className="text-xs text-slate-600 mt-1">{t.adoption}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && <button type="button" disabled={!dirty} onClick={save} className={primary}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>}
            <button type="button" onClick={() => printPlan({ ...plan, content })} className={secondary}><Printer className="w-4 h-4" aria-hidden="true" /> Print</button>
            {can('analyst') && plan.status !== 'Retired' && <button type="button" onClick={() => setTesting(true)} className={secondary}><FlaskConical className="w-4 h-4" aria-hidden="true" /> Test this plan</button>}
          </div>
        </div>
        {dirty && <p role="status" className="text-xs text-amber-800">Unsaved changes.</p>}
        <div className="flex flex-wrap gap-2 items-end border-t border-slate-200 dark:border-slate-700 pt-3">
          {plan.status === 'Draft' && can('analyst') && <button type="button" className={secondary} onClick={async () => { if (dirty) await save(); const { error } = await submitPlan(plan.id); if (error) toast.error(error); else { toast.success('Submitted for review.'); onChanged(); } }}>Submit for review</button>}
          {(plan.status === 'Draft' || plan.status === 'In Review') && can('drrm_officer') && (
            <NoteAction id={`ap-${plan.id}`} label="Adopting resolution (Sanggunian or council)" button="Approve" minLength={3} tone="primary"
              onSubmit={async (ref) => { if (dirty) await save(); const { error } = await approvePlan(plan.id, ref); if (error) { toast.error(error); return false; } toast.success('Approved.'); onChanged(); return true; }} />
          )}
          {plan.status === 'Approved' && can('drrm_officer') && <button type="button" className={secondary} onClick={async () => { const { error } = await retirePlan(plan.id); if (error) toast.error(error); else onChanged(); }}>Retire</button>}
          {plan.template_key === 'ldrrmp' && can('analyst') && (
            <button type="button" className={secondary} onClick={async () => {
              const { id, error } = await createForm({ form_key: 'ldrrmp_review', title: `Review of ${plan.title}`, plan_id: plan.id });
              if (error) toast.error(error); else nav(`/enhancement?tab=forms&form=${id}`);
            }}>Start the Memo 147 review</button>
          )}
          {plan.test?.last_tested_on
            ? <span className="text-xs">Last tested {plan.test.last_tested_on}; {plan.test.gaps_found} gap{plan.test.gaps_found === 1 ? '' : 's'} found. <Link to="/validation?tab=exercises" className="underline">Exercises</Link></span>
            : <span className="text-xs text-amber-800 dark:text-amber-300">Not tested yet.</span>}
        </div>
        {testing && <TestPlanForm plan={plan} onCancel={() => setTesting(false)} />}
      </div>

      {t.sections.map((s) => (
        <section key={s.id} className={cn(card, 'space-y-2')} aria-labelledby={`sec-${s.id}`}>
          <h3 id={`sec-${s.id}`} className="font-semibold">{s.title}{s.required && <span className="text-xs text-slate-500 font-normal"> (required)</span>}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">{s.guidance}</p>
          <p className="text-[11px] text-slate-500">Source: {s.source}</p>
          {s.table
            ? <TableEditor s={s} rows={(content[s.id] as Row[]) ?? []} editable={editable} onChange={(r) => set(s.id, r)} />
            : <>
                <label className="sr-only" htmlFor={`pl-${s.id}`}>{s.title}</label>
                <textarea id={`pl-${s.id}`} rows={5} readOnly={!editable} className={input} value={(content[s.id] as string) ?? ''} onChange={(e) => set(s.id, e.target.value)} />
              </>}
        </section>
      ))}
      {editable && dirty && <button type="button" onClick={save} className={primary}><Save className="w-4 h-4" aria-hidden="true" /> Save</button>}
    </div>
  );
};

export default PlanEditor;
