// Validation · EOC activation based on contingency plans (ADR-019). Each contingency plan carries an activation set:
// the response clusters and EOC management functions it brings in, as lead, on or standby, from BLUE or RED. The set
// is previewed at a level, activated in an exercise at the level the exercise assumes, or activated live by a DRRM
// officer on the current BLUE or RED EOC status (logged in the EOC operations log). The database applies the rules.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { listExercises, listPlans, type Exercise, type PlanRecord } from '@/lib/planning';
import { FUNCTIONS, LEVELS, announceEocChange, useEocStatus, type EocFunction } from '@/lib/eoc';
import {
  STATE_LABEL, TRIGGER_EXAMPLES, activate, listActivations, listClusters, listItems, previewAt, setItem, setProblems,
  type Cluster, type CpActivation as Activation, type CpItem, type ItemKind, type ItemState,
} from '@/lib/cpActivation';
import { Field, Gate, card, input, primary, secondary, when } from '../rapidMappingModule/ui';

const CpActivation: React.FC = () => {
  const { activeTenant, can } = useAuth();
  const { status } = useEocStatus();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [planId, setPlanId] = useState('');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [items, setItems] = useState<CpItem[]>([]);
  const [history, setHistory] = useState<Activation[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [preview, setPreview] = useState<'blue' | 'red'>('blue');
  const [mode, setMode] = useState<'exercise' | 'live'>('exercise');
  const [exerciseId, setExerciseId] = useState('');
  const [basis, setBasis] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPlans().then((r) => {
      const cps = (r.data ?? []).filter((p) => p.template_key === 'contingency_plan' && p.status !== 'Retired');
      setPlans(cps); setPlanId((cur) => cur || cps[0]?.id || '');
    });
    listClusters().then((r) => setClusters(r.data));
    listExercises().then((r) => setExercises((r.data ?? []).filter((e) => e.status === 'planned' || e.status === 'conducted')));
  }, [activeTenant]);
  const reload = useCallback(async () => {
    if (planId) setItems((await listItems(planId)).data);
    setHistory((await listActivations()).data);
  }, [planId]);
  useEffect(() => { reload(); }, [reload]);

  const plan = plans.find((p) => p.id === planId);
  const editable = can(plan?.status === 'Approved' ? 'drrm_officer' : 'analyst');
  const problems = setProblems(items);
  const shown = useMemo(() => previewAt(items, preview), [items, preview]);
  const label = (kind: ItemKind, code: string) => kind === 'function' ? `EOC: ${FUNCTIONS[code as EocFunction]?.label ?? code}` : `${clusters.find((c) => c.code === code)?.name ?? code} (${clusters.find((c) => c.code === code)?.lead_agency ?? ''})`;

  const change = async (kind: ItemKind, code: string, state: ItemState | null, min: 'blue' | 'red') => {
    const existing = items.find((i) => i.item_kind === kind && i.item_code === code);
    const { error } = await setItem(planId, kind, code, state, min, existing);
    if (error) toast.error(error); else reload();
  };
  const run = async () => {
    setBusy(true);
    const { error } = await activate(planId, basis, mode === 'exercise' ? { id: exerciseId, level: preview } : undefined);
    setBusy(false);
    if (error) { toast.error(error); return; }
    toast.success(mode === 'live' ? 'Plan activated and logged in the EOC operations log' : 'Exercise activation recorded');
    if (mode === 'live') announceEocChange();
    setBasis(''); reload();
  };

  const row = (kind: ItemKind, code: string, name: string) => {
    const it = items.find((i) => i.item_kind === kind && i.item_code === code);
    return (
      <tr key={`${kind}-${code}`} className="border-t border-slate-200 dark:border-slate-700">
        <th scope="row" className="text-left py-1 pr-2 font-normal">{name}</th>
        <td className="pr-2"><select aria-label={`${name}: role in the plan`} className={`${input} py-1`} disabled={!editable} value={it?.state ?? ''} onChange={(e) => change(kind, code, (e.target.value || null) as ItemState | null, it?.min_level ?? 'red')}>
          <option value="">Not in plan</option>{(['lead', 'on', 'standby'] as ItemState[]).map((s) => <option key={s} value={s}>{STATE_LABEL[s]}</option>)}</select></td>
        <td><select aria-label={`${name}: from level`} className={`${input} py-1`} disabled={!editable || !it} value={it?.min_level ?? 'red'} onChange={(e) => change(kind, code, it!.state, e.target.value as 'blue' | 'red')}>
          <option value="blue">From BLUE</option><option value="red">From RED</option></select></td>
      </tr>
    );
  };

  if (!plans.length) return (
    <section className={card}><h3 className="font-montserrat font-bold text-lg mb-1">EOC activation from contingency plans</h3>
      <p className="text-sm">No contingency plan yet. Start one from the contingency plan template in <Link className="underline" to="/enhancement">Enhancement → Plans</Link>, then set its activation set here.</p></section>
  );

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="cp-title">
        <h3 id="cp-title" className="font-montserrat font-bold text-lg mb-1">EOC activation from contingency plans</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Which response clusters and EOC functions a plan brings in, and from which alert level (NDRRMC Memo 131 s. 2018; national cluster approach). Activation never raises the EOC level: the level is set in Response → EOC operations.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Field id="cp-plan" label="Contingency plan"><select id="cp-plan" className={input} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.ref} {p.title} ({p.status})</option>)}</select></Field>
          <p className="text-sm self-end">Current EOC status: {status ? <span className={`px-2 py-0.5 rounded border text-xs font-bold ${LEVELS[status.level].badge}`}>{LEVELS[status.level].label}</span> : 'not recorded'}</p>
        </div>
        {plan?.status === 'Approved' && !editable && <p className="text-xs text-slate-500 mt-2">This plan is approved; only a DRRM officer changes its activation set.</p>}
      </section>

      <section className={`${card} overflow-x-auto`} aria-labelledby="cp-set">
        <h3 id="cp-set" className="font-montserrat font-bold text-lg mb-2">Activation set</h3>
        <table className="text-sm w-full min-w-[560px]">
          <caption className="sr-only">EOC functions and response clusters in the plan</caption>
          <tbody>
            {(Object.keys(FUNCTIONS) as EocFunction[]).map((f) => row('function', f, `EOC: ${FUNCTIONS[f].label}`))}
            {clusters.map((c) => row('cluster', c.code, `${c.name} (${c.lead_agency})`))}
          </tbody>
        </table>
        {problems.length > 0 && <ul className="text-sm mt-2 list-disc pl-5 text-amber-900 dark:text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      </section>

      <section className={card} aria-labelledby="cp-run">
        <h3 id="cp-run" className="font-montserrat font-bold text-lg mb-2">Preview and activate</h3>
        <div role="radiogroup" aria-label="Level to preview" className="flex gap-2 mb-2">
          {(['blue', 'red'] as const).map((l) => <button key={l} type="button" role="radio" aria-checked={preview === l} className={`${secondary} ${preview === l ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setPreview(l)}>At {LEVELS[l].label}</button>)}
        </div>
        <ul className="text-sm grid md:grid-cols-2 gap-1 mb-3">{shown.map((i) => (
          <li key={`${i.kind}-${i.code}`}><strong>{STATE_LABEL[i.state]}</strong> · {label(i.kind, i.code)}{i.state !== i.planned && <span className="text-xs text-slate-500"> (planned {STATE_LABEL[i.planned]}, from {i.min_level.toUpperCase()})</span>}</li>
        ))}</ul>
        <div className="grid md:grid-cols-2 gap-3">
          <Field id="cp-mode" label="Activation"><select id="cp-mode" className={input} value={mode} onChange={(e) => setMode(e.target.value as 'exercise' | 'live')}>
            <option value="exercise">In an exercise, at the previewed level</option><option value="live">Live, on the current EOC status</option></select></Field>
          {mode === 'exercise' ? (
            <Field id="cp-ex" label="Exercise"><select id="cp-ex" className={input} value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
              <option value="">Choose an exercise</option>{exercises.map((x) => <option key={x.id} value={x.id}>{x.ref} {x.title}</option>)}</select></Field>
          ) : <p className="text-sm self-end">{status && status.level !== 'white' ? `Activates at ${LEVELS[status.level].label}.` : 'Raise the EOC to BLUE or RED first.'}</p>}
        </div>
        <Field id="cp-basis" label="What triggered the activation" hint="At least 10 characters; for example the warning or gauge reading."><textarea id="cp-basis" className={input} rows={2} value={basis} onChange={(e) => setBasis(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-1 mt-1">{TRIGGER_EXAMPLES.map((x) => <button key={x} type="button" className="text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 min-h-[32px]" onClick={() => setBasis(x)}>{x}</button>)}</div>
        <div className="mt-3">
          <Gate min={mode === 'live' ? 'drrm_officer' : 'analyst'}>
            <button type="button" className={primary} disabled={busy || !items.length || basis.trim().length < 10 || (mode === 'exercise' && !exerciseId) || (mode === 'live' && (!status || status.level === 'white'))} onClick={run}><Zap className="w-4 h-4" aria-hidden /> Activate</button>
          </Gate>
        </div>
      </section>

      <section className={card} aria-labelledby="cp-hist">
        <h3 id="cp-hist" className="font-montserrat font-bold text-lg mb-2">Activations</h3>
        {history.length === 0 ? <p className="text-sm">None yet.</p> : (
          <ul className="text-sm space-y-2">{history.map((h) => (
            <li key={h.id} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
              <strong>{h.ref}</strong> · {h.mode === 'live' ? 'Live' : 'Exercise'} · {h.level.toUpperCase()} · {plans.find((p) => p.id === h.plan_id)?.title ?? 'plan'} · {when(h.created_at)}
              {h.plan_status !== 'Approved' && <span className="text-xs text-amber-900 dark:text-amber-200"> · plan was not yet approved</span>}
              <br /><span className="text-xs">{h.basis} — {h.items.filter((i) => i.state !== 'standby').length} on, {h.items.filter((i) => i.state === 'standby').length} on standby</span>
            </li>
          ))}</ul>
        )}
      </section>
    </div>
  );
};

export default CpActivation;
