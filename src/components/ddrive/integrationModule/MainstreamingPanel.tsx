// Integration: carry each priority risk into the instruments that govern the LGU: the LDRRMP and contingency plans,
// the CLUP and zoning ordinance, the CDP or PDPFP, the LDIP and the AIP (RA 10121 s. 11(b)(2); NDRRMC Memo 147
// review form 3). Entries use the decision-area matrix of the HLURB-CCC Supplemental Guidelines on Mainstreaming
// Climate Change and Disaster Risks in the CLUP: decision area, technical findings, implications, policy intervention.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRisks } from '@/hooks/useDDriveData';
import { cn } from '@/lib/utils';
import { peso } from '@/lib/budget';
import {
  INSTRUMENT_LABEL, Instrument, Mainstreaming, PlanRecord, RiskIntegration, addMainstreaming, deleteMainstreaming, listMainstreaming,
  listPlans, listRiskIntegration, setMainstreamingStatus,
} from '@/lib/planning';
import { Field, Gate, NoteAction, card, input, primary, secondary } from '../rapidMappingModule/ui';

const STATUS_LABEL = { proposed: 'Proposed', included: 'Included in the draft', adopted: 'Adopted' } as const;
const priority = (r: RiskIntegration) => r.level === 'Critical' || r.level === 'High' || /^(VH|H)/.test(r.ddrive_risk_code ?? '');

const AddEntry: React.FC<{ riskId?: string; plans: PlanRecord[]; onDone: () => void; onCancel: () => void }> = ({ riskId, plans, onDone, onCancel }) => {
  const { data: risks } = useRisks();
  const [f, setF] = useState({ risk_id: riskId ?? '', instrument: 'clup' as Instrument, instrument_ref: '', plan_id: '', decision_area: '', technical_findings: '', implications: '', policy_intervention: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4" onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await addMainstreaming({ ...f, instrument_ref: f.instrument_ref || null, plan_id: f.plan_id || null, decision_area: f.decision_area || null,
        technical_findings: f.technical_findings || null, implications: f.implications || null });
      if (error) toast.error(error); else { toast.success('Added to the register.'); onDone(); }
    }}>
      <Field id="ms-risk" label="Priority risk"><select id="ms-risk" required className={input} value={f.risk_id} onChange={set('risk_id')}>
        <option value="">Choose…</option>{risks.map((r) => <option key={r.id} value={r.id}>{r.ref} {r.title} ({r.level})</option>)}</select></Field>
      <Field id="ms-inst" label="Instrument"><select id="ms-inst" className={input} value={f.instrument} onChange={set('instrument')}>
        {Object.entries(INSTRUMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field id="ms-ref" label="Instrument reference (title, section)" hint="For example: CLUP 2024-2032, Policy 3.2"><input id="ms-ref" className={input} value={f.instrument_ref} onChange={set('instrument_ref')} /></Field>
      <Field id="ms-plan" label="Plan kept in DDRiVE-M (optional)"><select id="ms-plan" className={input} value={f.plan_id} onChange={set('plan_id')}>
        <option value="">None</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.ref} {p.title}</option>)}</select></Field>
      <Field id="ms-da" label="Decision area"><input id="ms-da" className={input} value={f.decision_area} onChange={set('decision_area')} /></Field>
      <Field id="ms-tf" label="Technical findings"><textarea id="ms-tf" rows={2} className={input} value={f.technical_findings} onChange={set('technical_findings')} /></Field>
      <Field id="ms-im" label="Implications if not addressed"><textarea id="ms-im" rows={2} className={input} value={f.implications} onChange={set('implications')} /></Field>
      <Field id="ms-pi" label="Policy intervention"><textarea id="ms-pi" required minLength={5} rows={2} className={input} value={f.policy_intervention} onChange={set('policy_intervention')} /></Field>
      <div className="sm:col-span-2 flex gap-2"><button type="submit" className={primary}>Add to register</button><button type="button" className={secondary} onClick={onCancel}>Cancel</button></div>
    </form>
  );
};

const MainstreamingPanel: React.FC = () => {
  const { can } = useAuth();
  const [cov, setCov] = useState<RiskIntegration[]>([]);
  const [entries, setEntries] = useState<Mainstreaming[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [adding, setAdding] = useState<string | null | false>(false);
  const load = useCallback(async () => {
    const [c, m, p] = await Promise.all([listRiskIntegration(), listMainstreaming(), listPlans()]);
    setCov(c.data); setEntries(m.data); setPlans(p.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  const pri = cov.filter(priority);
  const notAdopted = pri.filter((r) => r.instruments_adopted === 0);
  const notFunded = pri.filter((r) => r.actions_funded === 0);

  return (
    <section className={cn(card, 'space-y-5')} aria-labelledby="ms-h">
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center"><Layers className="w-5 h-5 text-white" aria-hidden="true" /></div>
        <div className="flex-1 min-w-[16rem]">
          <h2 id="ms-h" className="font-montserrat font-bold text-lg">Risk priorities in plans and budgets</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            RA 10121 s. 11(b)(2) asks the council to integrate disaster risk reduction and climate change adaptation into local development plans, programs and budgets.
            For each priority risk, record where it is addressed (CLUP, zoning ordinance, CDP or PDPFP, LDIP, AIP, LDRRMP, contingency plan, LCCAP) and the
            policy intervention, using the decision-area matrix of the CLUP supplemental guidelines. Adoption is recorded by a DRRM officer with its resolution or ordinance number.
          </p>
        </div>
        <Gate min="analyst" quiet>{adding === false && <button type="button" className={secondary} onClick={() => setAdding(null)}>Add entry</button>}</Gate>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-2xl font-bold">{pri.length}</p><p className="text-xs">High or critical risks (register level or DDRiVE rating)</p></div>
        <div className={cn('rounded-xl border p-3', notAdopted.length ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30' : 'border-slate-200')}><p className="text-2xl font-bold">{notAdopted.length}</p><p className="text-xs">not yet in any adopted instrument</p></div>
        <div className={cn('rounded-xl border p-3', notFunded.length ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30' : 'border-slate-200')}><p className="text-2xl font-bold">{notFunded.length}</p><p className="text-xs">with no funded action</p></div>
      </div>

      {adding !== false && <AddEntry riskId={adding ?? undefined} plans={plans} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">Where each risk is embedded</caption>
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-1">Risk</th><th>Level</th><th>Adopted in</th><th>Entries</th><th>Actions approved</th><th>Funded</th><th /></tr></thead>
          <tbody>
            {cov.map((r) => (
              <tr key={r.risk_id} className={cn('border-b border-slate-100 dark:border-slate-800', priority(r) && (r.instruments_adopted === 0 || r.actions_funded === 0) && 'bg-amber-50/50 dark:bg-amber-950/20')}>
                <td className="py-1.5"><span className="font-mono">{r.ref}</span> {r.title}</td>
                <td>{r.level}{r.ddrive_risk_code ? ` · ${r.ddrive_risk_code}` : ''}</td>
                <td>{r.adopted_in?.length ? r.adopted_in.map((i) => INSTRUMENT_LABEL[i].replace(/ \(.*\)$/, '')).join(', ') : <span className="text-amber-800 dark:text-amber-300">none</span>}</td>
                <td>{r.instruments}</td>
                <td>{r.actions_approved}</td>
                <td>{r.actions_funded ? `${r.actions_funded} · ${peso(r.funded_php)}` : <span className="text-amber-800 dark:text-amber-300">none</span>}</td>
                <td><Gate min="analyst" quiet><button type="button" className="underline" onClick={() => setAdding(r.risk_id)}>Add entry</button></Gate></td>
              </tr>
            ))}
          </tbody>
        </table>
        {cov.length === 0 && <p className="text-sm text-slate-500">No risks in the register yet. Add them in <Link to="/diagnosis?tab=register" className="underline">Diagnosis</Link>.</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1">Register ({entries.length})</h3>
        <ul className="space-y-2">
          {entries.map((m) => {
            const risk = cov.find((r) => r.risk_id === m.risk_id);
            return (
              <li key={m.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-1">
                <p className="text-slate-500">{m.ref} · {risk ? `${risk.ref} ${risk.title}` : 'Risk'} · {INSTRUMENT_LABEL[m.instrument]}{m.instrument_ref ? `: ${m.instrument_ref}` : ''} · <strong>{STATUS_LABEL[m.status]}</strong>{m.adoption_ref ? ` (${m.adoption_ref})` : ''}</p>
                {m.decision_area && <p><span className="text-slate-500">Decision area: </span>{m.decision_area}</p>}
                {m.technical_findings && <p><span className="text-slate-500">Findings: </span>{m.technical_findings}</p>}
                {m.implications && <p><span className="text-slate-500">Implications: </span>{m.implications}</p>}
                <p><span className="text-slate-500">Policy intervention: </span><strong>{m.policy_intervention}</strong></p>
                {m.status !== 'adopted' && (
                  <div className="flex flex-wrap gap-2 items-end pt-1">
                    {m.status === 'proposed' && can('analyst') && <button type="button" className={secondary} onClick={async () => { const { error } = await setMainstreamingStatus(m.id, 'included'); if (error) toast.error(error); else load(); }}>Mark included in the draft</button>}
                    {can('drrm_officer') && <NoteAction id={`ad-${m.id}`} label="Adopted by (resolution or ordinance number)" button="Record adoption" minLength={3} tone="primary"
                      onSubmit={async (ref) => { const { error } = await setMainstreamingStatus(m.id, 'adopted', ref); if (error) { toast.error(error); return false; } toast.success('Adoption recorded.'); load(); return true; }} />}
                    {m.status === 'proposed' && can('analyst') && <button type="button" className="text-red-800 underline" onClick={async () => { const { error } = await deleteMainstreaming(m.id); if (error) toast.error(error); else load(); }}>Remove</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default MainstreamingPanel;
