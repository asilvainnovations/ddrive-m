// Phase 5 · Validation: test plans, capabilities, assumptions and coordination through exercises.
// An exercise lists what it tests (from the plan and the standards), is recorded as held, each check is rated against
// what was observed, gaps get recommendations and improvement actions (Response), and a DRRM officer closes the
// evaluation. The after-action report is the record the Gawad KALASAG toolkit asks for (3.1: AAR of SIMEX).
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FlaskConical, Plus, Printer, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CHECK_LIBRARY, CheckTemplate, EXERCISE_TYPES, ExerciseType, RESULT_LABEL, startingChecks } from '@/content/formsAndExercises';
import { templateByKey } from '@/content/planTemplates';
import {
  Exercise, ExerciseCheck, PlanRecord, addCheck, cancelExercise, createExercise, createForm, evaluateExercise, listChecks, listExercises,
  listPlans, markConducted, rateCheck, removeCheck, updateExercise,
} from '@/lib/planning';
import { listActions, STATUS_LABEL, type ResponseAction } from '@/lib/responseActions';
import { esc, para, printDocument } from '@/lib/printDoc';
import { ProposeActionForm } from '../responseModule/ProposeAction';
import { Field, NoteAction, card, input, primary, secondary } from '../rapidMappingModule/ui';

const KIND_LABEL = { objective: 'Objectives', assumption: 'Assumptions in the plan', capability: 'Capabilities', coordination: 'Coordination' } as const;
const TYPE_LABEL = Object.fromEntries(EXERCISE_TYPES.map((t) => [t.key, t.label])) as Record<ExerciseType, string>;
const STATUS = { planned: 'Planned', conducted: 'Held, being evaluated', evaluated: 'Evaluated', cancelled: 'Cancelled' } as const;

export function printAar(e: Exercise, checks: ExerciseCheck[], actions: ResponseAction[]) {
  const rows = checks.map((c) => {
    const acts = actions.filter((a) => a.exercise_check_id === c.id).map((a) => `${a.ref} ${a.title} (${STATUS_LABEL[a.status]})`).join('; ');
    return `<tr><td>${esc(KIND_LABEL[c.kind])}</td><td>${esc(c.statement)}<br><span class="src">${esc(c.source)}</span></td><td>${esc(c.expected)}</td><td>${esc(c.observed)}</td><td>${esc(c.result ? RESULT_LABEL[c.result] : '')}</td><td>${esc(c.recommendation)}${acts ? `<br><em>${esc(acts)}</em>` : ''}</td></tr>`;
  }).join('');
  const gaps = checks.filter((c) => c.result === 'partly' || c.result === 'not_met').length;
  printDocument(`After-action report: ${e.title}`, `<h1>After-action report</h1><p class="meta">${esc(e.ref)} · ${esc(e.title)} · ${esc(TYPE_LABEL[e.exercise_type])} · held ${esc(e.conducted_on)}${e.ddrive_plans ? ` · Plan tested: ${esc(e.ddrive_plans.ref)} ${esc(e.ddrive_plans.title)}` : ''}</p>
<h2>Scenario</h2>${para(e.scenario)}<h2>Participants</h2>${para(e.participants)}
<h2>Findings</h2><p>${checks.length} checks; ${checks.filter((c) => c.result === 'met').length} met, ${gaps} gaps, ${checks.filter((c) => c.result === 'not_tested').length} not tested.</p>
<table><thead><tr><th>Area</th><th>What was tested</th><th>Expected</th><th>Observed</th><th>Result</th><th>Recommendation and action</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Evaluation</h2>${para(e.evaluation_summary)}<p class="src">Evaluated ${esc(e.evaluated_at?.slice(0, 10))}. Required for Gawad KALASAG toolkit 3.1 (AAR of SIMEX based on the SOP or contingency plan).</p>`);
}

const NewExercise: React.FC<{ plans: PlanRecord[]; onDone: (id: string) => void; onCancel: () => void }> = ({ plans, onDone, onCancel }) => {
  const [planId, setPlanId] = useState('');
  const [type, setType] = useState<ExerciseType>('tabletop');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const plan = plans.find((p) => p.id === planId);
  return (
    <form className={cn(card, 'grid gap-3 sm:grid-cols-2')} onSubmit={async (e) => {
      e.preventDefault();
      const { id, error } = await createExercise({ title, exercise_type: type, plan_id: planId || null, hazard: plan?.hazard ?? null, scheduled_on: date || null }, startingChecks(plan?.template_key ?? null));
      if (error) toast.error(error); else { toast.success('Exercise planned.'); onDone(id!); }
    }}>
      <Field id="ne-plan" label="Plan tested (optional)"><select id="ne-plan" className={input} value={planId} onChange={(e) => { setPlanId(e.target.value); const p = plans.find((x) => x.id === e.target.value); if (p && !title) setTitle(`${TYPE_LABEL[type]}: ${p.title}`); }}>
        <option value="">No plan: test capabilities only</option>{plans.filter((p) => p.status !== 'Retired').map((p) => <option key={p.id} value={p.id}>{p.ref} {p.title}</option>)}</select></Field>
      <Field id="ne-type" label="Type"><select id="ne-type" className={input} value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>{EXERCISE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
      <Field id="ne-title" label="Title"><input id="ne-title" required minLength={3} className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field id="ne-date" label="Planned date (optional)"><input id="ne-date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <p className="sm:col-span-2 text-xs text-slate-600">{EXERCISE_TYPES.find((t) => t.key === type)!.what}</p>
      <div className="sm:col-span-2 flex gap-2"><button type="submit" className={primary}>Plan exercise</button><button type="button" className={secondary} onClick={onCancel}>Cancel</button></div>
    </form>
  );
};

const CheckRow: React.FC<{ c: ExerciseCheck; e: Exercise; actions: ResponseAction[]; onChanged: () => void }> = ({ c, e, actions, onChanged }) => {
  const { can } = useAuth();
  const [observed, setObserved] = useState(c.observed ?? '');
  const [result, setResult] = useState(c.result ?? '');
  const [rec, setRec] = useState(c.recommendation ?? '');
  const [proposing, setProposing] = useState(false);
  useEffect(() => { setObserved(c.observed ?? ''); setResult(c.result ?? ''); setRec(c.recommendation ?? ''); }, [c]);
  const rating = e.status === 'conducted' && can('analyst');
  const gap = c.result === 'partly' || c.result === 'not_met';
  const mine = actions.filter((a) => a.exercise_check_id === c.id);
  const changed = observed !== (c.observed ?? '') || result !== (c.result ?? '') || rec !== (c.recommendation ?? '');
  return (
    <li className="py-2 text-xs space-y-1">
      <div className="flex flex-wrap gap-2 items-start">
        <div className="flex-1 min-w-[14rem]">
          <p className="font-semibold text-sm">{c.statement}</p>
          {c.expected && <p><span className="text-slate-500">Expected: </span>{c.expected}</p>}
          {c.source && <p className="text-slate-500">Source: {c.source}</p>}
        </div>
        {c.result && <span className={cn('px-2 py-0.5 rounded-full border font-semibold', c.result === 'met' ? 'border-emerald-400 text-emerald-800' : gap ? 'border-amber-500 text-amber-900' : 'border-slate-300')}>{RESULT_LABEL[c.result]}</span>}
        {e.status === 'planned' && can('analyst') && <button type="button" aria-label={`Remove: ${c.statement}`} className="p-1 text-red-800" onClick={async () => { const { error } = await removeCheck(c.id); if (error) toast.error(error); else onChanged(); }}><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /></button>}
      </div>
      {(rating || c.observed) && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="font-semibold" htmlFor={`ob-${c.id}`}>What was observed</label>
            <textarea id={`ob-${c.id}`} rows={2} readOnly={!rating} className={cn(input, 'text-xs')} value={observed} onChange={(ev) => setObserved(ev.target.value)} />
          </div>
          <div>
            <label className="font-semibold" htmlFor={`rs-${c.id}`}>Result</label>
            <select id={`rs-${c.id}`} disabled={!rating} className={cn(input, 'text-xs py-1')} value={result} onChange={(ev) => setResult(ev.target.value)}>
              <option value="">Not rated</option>{Object.entries(RESULT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {(result === 'partly' || result === 'not_met' || c.recommendation) && (
            <div className="sm:col-span-2">
              <label className="font-semibold" htmlFor={`rc-${c.id}`}>Recommendation</label>
              <textarea id={`rc-${c.id}`} rows={2} readOnly={!rating} className={cn(input, 'text-xs')} value={rec} onChange={(ev) => setRec(ev.target.value)} />
            </div>
          )}
          {rating && changed && <button type="button" className={cn(secondary, 'w-fit')} onClick={async () => {
            const { error } = await rateCheck(c.id, { observed: observed || null, result: (result || null) as ExerciseCheck['result'], recommendation: rec || null });
            if (error) toast.error(error); else { toast.success('Saved.'); onChanged(); }
          }}>Save</button>}
        </div>
      )}
      {gap && (
        <div className="space-y-1">
          {mine.map((a) => <Link key={a.id} to={`/response?tab=actions&action=${a.id}`} className="inline-block mr-2 underline">{a.ref}: {a.title} ({STATUS_LABEL[a.status]})</Link>)}
          {can('analyst') && !proposing && <button type="button" className="font-semibold text-blue-700 dark:text-blue-300" onClick={() => setProposing(true)}>+ Propose improvement action</button>}
          {proposing && <ProposeActionForm idPrefix={`imp-${c.id}`} link={{ origin: 'validation', exercise_check_id: c.id }} context={`exercise ${e.ref}: ${c.statement}`}
            defaultTitle={c.recommendation ?? ''} defaultArea="preparedness" defaultStrategy="reduce_consequences" defaultPriority="high"
            onCancel={() => setProposing(false)} onDone={() => { setProposing(false); onChanged(); }} />}
        </div>
      )}
    </li>
  );
};

const AddCheck: React.FC<{ e: Exercise; count: number; existing: ExerciseCheck[]; onDone: () => void }> = ({ e, count, existing, onDone }) => {
  const [custom, setCustom] = useState<CheckTemplate>({ kind: 'assumption', statement: '', expected: '', source: '' });
  const lib = CHECK_LIBRARY.filter((l) => !existing.some((x) => x.statement === l.statement));
  return (
    <div className="grid gap-3 lg:grid-cols-2 text-xs">
      <form className="space-y-2" onSubmit={async (ev) => { ev.preventDefault(); const { error } = await addCheck(e.id, custom, count + 1); if (error) toast.error(error); else { setCustom({ ...custom, statement: '', expected: '' }); onDone(); } }}>
        <p className="font-semibold">Add your own (for example an assumption from the plan)</p>
        <select aria-label="Kind" className={cn(input, 'text-xs py-1')} value={custom.kind} onChange={(x) => setCustom({ ...custom, kind: x.target.value as CheckTemplate['kind'] })}>
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input aria-label="What is tested" required minLength={3} className={cn(input, 'text-xs')} placeholder="What is tested" value={custom.statement} onChange={(x) => setCustom({ ...custom, statement: x.target.value })} />
        <input aria-label="Expected" className={cn(input, 'text-xs')} placeholder="What should happen" value={custom.expected} onChange={(x) => setCustom({ ...custom, expected: x.target.value })} />
        <input aria-label="Source" className={cn(input, 'text-xs')} placeholder="Plan section or standard" value={custom.source} onChange={(x) => setCustom({ ...custom, source: x.target.value })} />
        <button type="submit" className={secondary}><Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add</button>
      </form>
      <div>
        <p className="font-semibold">From the standards</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto">{lib.map((l) => (
          <li key={l.statement} className="flex gap-2 items-start"><button type="button" className="underline text-left" onClick={async () => { const { error } = await addCheck(e.id, l, count + 1); if (error) toast.error(error); else onDone(); }}>Add</button>
            <span>{l.statement} <span className="text-slate-500">({l.source})</span></span></li>
        ))}</ul>
      </div>
    </div>
  );
};

const ExerciseDetail: React.FC<{ e: Exercise; onChanged: () => void; onClose: () => void }> = ({ e, onChanged, onClose }) => {
  const { can } = useAuth();
  const [checks, setChecks] = useState<ExerciseCheck[]>([]);
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const [scenario, setScenario] = useState(e.scenario ?? '');
  const [participants, setParticipants] = useState(e.participants ?? '');
  const [held, setHeld] = useState(new Date().toISOString().slice(0, 10));
  const load = useCallback(async () => {
    const [c, a] = await Promise.all([listChecks(e.id), listActions()]);
    setChecks(c.data); setActions(a.data.filter((x) => x.exercise_check_id));
  }, [e.id]);
  useEffect(() => { load(); }, [load]);
  const refresh = () => { load(); onChanged(); };
  const planned = e.status === 'planned' && can('analyst');
  const tpl = templateByKey(e.ddrive_plans?.template_key);
  const unrated = checks.filter((c) => !c.result).length;
  const gapsNoRec = checks.filter((c) => (c.result === 'partly' || c.result === 'not_met') && !(c.recommendation ?? '').trim()).length;

  return (
    <div className="space-y-4">
      <div className={cn(card, 'space-y-2')}>
        <button type="button" className="text-xs underline" onClick={onClose}>All exercises</button>
        <p className="text-xs text-slate-500">{e.ref} · {TYPE_LABEL[e.exercise_type]} · {STATUS[e.status]}{e.scheduled_on ? ` · planned ${e.scheduled_on}` : ''}{e.conducted_on ? ` · held ${e.conducted_on}` : ''}</p>
        <h2 className="font-montserrat font-bold text-xl">{e.title}</h2>
        {e.ddrive_plans && <p className="text-xs">Plan tested: <Link to={`/enhancement?tab=plans&plan=${e.plan_id}`} className="underline">{e.ddrive_plans.ref} {e.ddrive_plans.title}</Link>{tpl ? ` (${tpl.name})` : ''}</p>}
        <div className="grid gap-2 sm:grid-cols-2 text-xs">
          <div><label className="font-semibold" htmlFor="ex-sc">Scenario</label><textarea id="ex-sc" rows={3} readOnly={!planned} className={input} value={scenario} onChange={(x) => setScenario(x.target.value)} /></div>
          <div><label className="font-semibold" htmlFor="ex-pa">Participants (offices, agencies, clusters)</label><textarea id="ex-pa" rows={3} readOnly={!planned} className={input} value={participants} onChange={(x) => setParticipants(x.target.value)} /></div>
        </div>
        {planned && (scenario !== (e.scenario ?? '') || participants !== (e.participants ?? '')) && (
          <button type="button" className={secondary} onClick={async () => { const { error } = await updateExercise(e.id, { scenario: scenario || null, participants: participants || null }); if (error) toast.error(error); else { toast.success('Saved.'); onChanged(); } }}>Save</button>
        )}
        <div className="flex flex-wrap gap-2 items-end border-t border-slate-200 dark:border-slate-700 pt-2">
          {planned && (
            <form className="flex gap-2 items-end" onSubmit={async (x) => { x.preventDefault(); const { error } = await markConducted(e.id, held); if (error) toast.error(error); else { toast.success('Recorded as held. Now rate what was observed.'); refresh(); } }}>
              <Field id="ex-held" label="Held on"><input id="ex-held" type="date" className={input} value={held} onChange={(x) => setHeld(x.target.value)} /></Field>
              <button type="submit" className={primary}>Record as held</button>
            </form>
          )}
          {e.status === 'conducted' && can('drrm_officer') && (
            <div className="flex-1 min-w-[16rem]">
              {(unrated > 0 || gapsNoRec > 0) && <p className="text-xs text-amber-800 mb-1">{unrated > 0 ? `${unrated} check(s) not rated. ` : ''}{gapsNoRec > 0 ? `${gapsNoRec} gap(s) without a recommendation.` : ''}</p>}
              <NoteAction id={`ev-${e.id}`} label="Evaluation summary: what worked, what did not, what changes" button="Close the evaluation" minLength={20} tone="primary"
                onSubmit={async (s) => { const { error } = await evaluateExercise(e.id, s); if (error) { toast.error(error); return false; } toast.success('Evaluation closed.'); refresh(); return true; }} />
            </div>
          )}
          {e.status === 'planned' && can('drrm_officer') && (
            <NoteAction id={`cx-${e.id}`} label="Reason for cancelling" button="Cancel exercise" minLength={10} tone="danger"
              onSubmit={async (r) => { const { error } = await cancelExercise(e.id, r); if (error) { toast.error(error); return false; } refresh(); return true; }} />
          )}
          {e.status === 'evaluated' && (
            <>
              <button type="button" className={secondary} onClick={() => printAar(e, checks, actions)}><Printer className="w-4 h-4" aria-hidden="true" /> After-action report</button>
              {can('analyst') && <button type="button" className={secondary} onClick={async () => {
                const { error } = await createForm({ form_key: 'after_action_report', title: `After-action report: ${e.title}`.slice(0, 200), exercise_id: e.id, plan_id: e.plan_id,
                  data: { summary: e.evaluation_summary, checks: checks.map((c) => ({ statement: c.statement, result: c.result, recommendation: c.recommendation })) } });
                if (error) toast.error(error); else toast.success('After-action report filed in Enhancement → Forms for sign-off.');
              }}>File the AAR for sign-off</button>}
            </>
          )}
        </div>
        {e.evaluation_summary && <p className="text-sm"><span className="text-slate-500">Evaluation: </span>{e.evaluation_summary}</p>}
      </div>

      {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => {
        const list = checks.filter((c) => c.kind === k);
        if (!list.length) return null;
        return (
          <section key={k} className={card} aria-labelledby={`k-${k}`}>
            <h3 id={`k-${k}`} className="font-semibold">{KIND_LABEL[k]} ({list.length})</h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{list.map((c) => <CheckRow key={c.id} c={c} e={e} actions={actions} onChanged={refresh} />)}</ul>
          </section>
        );
      })}
      {planned && <div className={card}><AddCheck e={e} count={checks.length} existing={checks} onDone={load} /></div>}
    </div>
  );
};

const ExercisesPanel: React.FC = () => {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const openId = params.get('exercise');
  const [list, setList] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    const [x, p] = await Promise.all([listExercises(), listPlans()]);
    setList(x.data); setPlans(p.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  const open = list.find((x) => x.id === openId);
  if (open) return <ExerciseDetail e={open} onChanged={load} onClose={() => setParams({ tab: 'exercises' })} />;
  return (
    <div className="space-y-4">
      <div className={cn(card, 'flex flex-wrap gap-3 items-start')}>
        <FlaskConical className="w-6 h-6 text-purple-700" aria-hidden="true" />
        <div className="flex-1 min-w-[16rem] text-sm">
          <h2 className="font-montserrat font-bold text-lg">Exercises</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">Test plans, capabilities, assumptions and coordination. RA 10121 s. 11(b)(1) asks the council to regularly review and test the LDRRMP; preparedness includes field exercises (s. 3(j)); the Gawad KALASAG toolkit asks for an after-action report of a SIMEX based on the SOP or contingency plan within the last three years (3.1). Start from a plan in Enhancement, or here.</p>
        </div>
        {can('analyst') && !adding && <button type="button" className={secondary} onClick={() => setAdding(true)}>Plan an exercise</button>}
      </div>
      {adding && <NewExercise plans={plans} onCancel={() => setAdding(false)} onDone={(id) => { setAdding(false); load().then(() => setParams({ tab: 'exercises', exercise: id })); }} />}
      <div className={card}>
        {list.length === 0 && <p className="text-sm text-slate-500">No exercises yet.</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((x) => (
            <li key={x.id} className="py-2 flex flex-wrap gap-2 items-center text-sm">
              <button type="button" className="underline text-left flex-1 min-w-[14rem]" onClick={() => setParams({ tab: 'exercises', exercise: x.id })}>{x.ref} {x.title}</button>
              <span className="text-xs">{TYPE_LABEL[x.exercise_type]}{x.ddrive_plans ? ` · ${x.ddrive_plans.ref}` : ''}</span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-slate-300">{STATUS[x.status]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ExercisesPanel;
