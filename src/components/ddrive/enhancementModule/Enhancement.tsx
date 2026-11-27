// Phase 6 · Enhancement: improve policies, plans, investments and recovery pathways using evidence.
// Plans are made from templates grounded in the NDRRMC standards, reviewed (LDRRMP, Memo 147), approved with their
// adopting resolution, and tested through exercises in Validation, whose findings come back as improvement actions.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GlassCard from '@/components/ui/GlassCard';
import { BookOpen, FileText, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PLAN_TEMPLATES, PlanTemplate, completeness, templateByKey } from '@/content/planTemplates';
import { PlanRecord, PlanTestStatus, createPlan, listPlans } from '@/lib/planning';
import { Field, card, input, primary, secondary } from '../rapidMappingModule/ui';
import PlanEditor from './PlanEditor';
import FormsPanel from './FormsPanel';

type Tab = 'plans' | 'templates' | 'forms';
type P = PlanRecord & { test?: PlanTestStatus };
const thisYear = new Date().getFullYear();

const StartPlan: React.FC<{ t: PlanTemplate; onCancel: () => void }> = ({ t, onCancel }) => {
  const nav = useNavigate();
  const [title, setTitle] = useState(t.key === 'ldrrmp' ? `LDRRMP ${thisYear}-${thisYear + 5}` : t.name);
  const [hazard, setHazard] = useState('');
  const [from, setFrom] = useState(thisYear);
  const [to, setTo] = useState(thisYear + (t.key === 'ldrrmp' ? 5 : 2));
  return (
    <form className="grid gap-2 mt-2 text-xs" onSubmit={async (e) => {
      e.preventDefault();
      const { id, error } = await createPlan(t, title, { hazard, period_from: t.period ? from : undefined, period_to: t.period ? to : undefined });
      if (error) toast.error(error); else { toast.success('Draft created.'); nav(`/enhancement?tab=plans&plan=${id}`); }
    }}>
      <Field id={`sp-${t.key}`} label="Title"><input id={`sp-${t.key}`} required minLength={3} className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      {t.perHazard && <Field id={`sph-${t.key}`} label="Hazard"><input id={`sph-${t.key}`} required className={input} value={hazard} onChange={(e) => setHazard(e.target.value)} placeholder="For example: Tropical cyclone" /></Field>}
      {t.period && <div className="flex gap-2">
        <Field id={`spf-${t.key}`} label="From"><input id={`spf-${t.key}`} type="number" className={input} value={from} onChange={(e) => setFrom(Number(e.target.value))} /></Field>
        <Field id={`spt-${t.key}`} label="To"><input id={`spt-${t.key}`} type="number" className={input} value={to} onChange={(e) => setTo(Number(e.target.value))} /></Field>
      </div>}
      <div className="flex gap-2"><button type="submit" className={primary}>Create draft</button><button type="button" className={secondary} onClick={onCancel}>Cancel</button></div>
    </form>
  );
};

const EnhancementModule: React.FC = () => {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (['plans', 'templates', 'forms'].includes(params.get('tab') ?? '') ? params.get('tab') : 'plans') as Tab;
  const planId = params.get('plan');
  const [plans, setPlans] = useState<P[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const load = useCallback(async () => { const { data, error } = await listPlans(); if (error) toast.error(error); setPlans(data); }, []);
  useEffect(() => { load(); }, [load]);
  const open = plans.find((p) => p.id === planId);
  // A plan just created (or opened from a link) may not be in the list yet: reload once it is asked for.
  useEffect(() => { if (planId && !plans.some((p) => p.id === planId)) load(); }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg"><Sparkles className="w-5 h-5 text-white" aria-hidden="true" /></div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Enhancement Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 6 · DRRM plans from templates, plan reviews, forms, and testing through exercises</p>
          </div>
        </div>
      </GlassCard>

      <div role="tablist" aria-label="Enhancement sections" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {([['plans', 'Plans'], ['templates', 'Plan templates'], ['forms', 'Forms']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
            className={cn('px-4 py-2 text-sm font-semibold rounded-t-xl', tab === k ? 'bg-white dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 text-blue-800 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300 hover:text-blue-800')}>{l}</button>
        ))}
      </div>

      {tab === 'plans' && open && <PlanEditor plan={open} onChanged={load} />}
      {tab === 'plans' && !open && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-montserrat font-bold text-lg">Plans ({plans.length})</h2>
            {can('analyst') && <button type="button" className={secondary} onClick={() => setParams({ tab: 'templates' })}>New plan from a template</button>}
          </div>
          {plans.length === 0 && <p className="text-sm text-slate-500">No plans yet. Start one from a template.</p>}
          <ul className="space-y-2">
            {plans.map((p) => {
              const t = templateByKey(p.template_key);
              const c = t ? completeness(t, p.content ?? {}) : null;
              return (
                <li key={p.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
                  <FileText className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-[14rem]">
                    {t ? <button type="button" className="font-semibold text-sm underline text-left" onClick={() => setParams({ tab: 'plans', plan: p.id })}>{p.ref} {p.title}</button>
                      : <p className="font-semibold text-sm">{p.ref} {p.title}</p>}
                    <p className="text-xs text-slate-500">{t?.name ?? p.type} · {p.standard}{p.hazard ? ` · ${p.hazard}` : ''}{p.adoption_ref ? ` · Adopted: ${p.adoption_ref}` : ''}</p>
                    <p className="text-xs">{c ? `${c.done} of ${c.total} required sections` : 'No template'} · {p.test?.last_tested_on ? `last tested ${p.test.last_tested_on}` : 'not tested'}{p.test?.exercises_open ? ` · ${p.test.exercises_open} exercise(s) open` : ''}</p>
                  </div>
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', p.status === 'Approved' ? 'border-emerald-400 text-emerald-800' : 'border-slate-300')}>{p.status}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_TEMPLATES.map((t) => (
            <div key={t.key} className={cn(card, 'text-xs space-y-2')}>
              <p className="font-montserrat font-bold text-base flex items-center gap-2"><BookOpen className="w-4 h-4" aria-hidden="true" /> {t.name}</p>
              <p className="text-slate-500">{t.standard}</p>
              <p>{t.purpose}</p>
              <details><summary className="cursor-pointer font-semibold">{t.sections.length} sections</summary>
                <ol className="list-decimal pl-5 mt-1">{t.sections.map((s) => <li key={s.id}>{s.title} <span className="text-slate-500">({s.source})</span></li>)}</ol>
              </details>
              <p><span className="font-semibold">In force when: </span>{t.adoption}</p>
              {can('analyst') && (starting === t.key ? <StartPlan t={t} onCancel={() => setStarting(null)} />
                : <button type="button" className={primary} onClick={() => setStarting(t.key)}>Start a plan from this template</button>)}
            </div>
          ))}
        </div>
      )}

      {tab === 'forms' && <FormsPanel />}
    </div>
  );
};

export default EnhancementModule;
