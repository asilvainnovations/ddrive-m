// Enhancement: the forms library. Reports (initial report, situation report, school-as-evacuation-centre
// documentation) are filed by responders; the LDRRMP review and after-action reports are signed off by a DRRM officer.
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck2, Printer } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useIncidents } from '@/hooks/useDDriveData';
import { cn } from '@/lib/utils';
import { FORM_TEMPLATES, FormKey, LDRRMP_CERTIFICATE_CRITERIA, LDRRMP_REVIEW_GROUPS, formByKey } from '@/content/formsAndExercises';
import { FormRecord, PlanRecord, createForm, deleteForm, finaliseForm, listForms, listPlans, saveForm } from '@/lib/planning';
import { esc, para, printDocument } from '@/lib/printDoc';
import { Field, card, input, primary, secondary } from '../rapidMappingModule/ui';

type Data = Record<string, unknown>;
const ROLE_OF: Record<FormKey, 'responder' | 'analyst'> = Object.fromEntries(FORM_TEMPLATES.map((f) => [f.key, f.who])) as Record<FormKey, 'responder' | 'analyst'>;

export function printForm(f: FormRecord, plan?: PlanRecord | null) {
  const t = formByKey(f.form_key)!;
  const d = f.data ?? {};
  let body = `<h1>${esc(f.title)}</h1><p class="meta">${esc(f.ref)} · ${esc(t.name)} · ${esc(t.source)} · ${f.status === 'final' ? `Final ${esc(f.finalized_at?.slice(0, 10))}` : 'Draft'}</p>`;
  body += t.fields.map((x) => `<h2>${esc(x.label)}</h2>${para(x.kind === 'yesno' ? (d[x.id] === true ? 'Yes' : d[x.id] === false ? 'No' : '') : d[x.id])}`).join('');
  if (f.form_key === 'ldrrmp_review') {
    const crit = (d.criteria ?? {}) as Record<string, boolean>;
    const ind = (d.indicators ?? {}) as Record<string, { ok?: boolean; remarks?: string }>;
    body += '<h2>Indicators of a good DRRM plan (Memo 147 review form)</h2>' + LDRRMP_REVIEW_GROUPS.map((g) => `<p><strong>${esc(g.group)}</strong></p><table><tr><th>Indicator</th><th>In the plan</th><th>Remarks</th></tr>${
      g.items.map((it) => { const v = ind[`${g.group}|${it}`] ?? {}; return `<tr><td>${esc(it)}</td><td>${v.ok === true ? 'Yes' : v.ok === false ? 'No' : ''}</td><td>${esc(v.remarks)}</td></tr>`; }).join('')}</table>`).join('');
    body += '<h2>Criteria for the Certificate of Review (Memo 147, 2.4.4)</h2><table>' + LDRRMP_CERTIFICATE_CRITERIA.map((c) => `<tr><td>${esc(c.label)}</td><td>${crit[c.id] ? 'Complied' : 'Not yet'}</td></tr>`).join('') + '</table>';
    if (LDRRMP_CERTIFICATE_CRITERIA.every((c) => crit[c.id]) && f.status === 'final') {
      body += `<h2>Certification</h2><p>THIS IS TO CERTIFY THAT the attached Disaster Risk Reduction and Management Plan${plan ? `, ${esc(plan.title)},` : ''} has been duly reviewed and found that the DRRM programs, activities and projects in said plan are aligned with the ${esc(d.higher_plan)} and appropriate to the hazards of the said Local Government Unit. The Sanggunian-approved Annual Investment Program (AIP) for DRRM-CCA is seen consistent with the LDRRM Plan reviewed.</p><p>Review team: ${esc(d.team)}</p><p class="src">Wording after the sample certification attached to NDRRMC Memo 147 s. 2017. The certificate is issued and signed by the RDRRMC Chairperson / OCD Regional Director.</p>`;
    }
  }
  printDocument(f.title, body);
}

const ReviewChecklist: React.FC<{ data: Data; editable: boolean; onChange: (d: Data) => void }> = ({ data, editable, onChange }) => {
  const crit = (data.criteria ?? {}) as Record<string, boolean>;
  const ind = (data.indicators ?? {}) as Record<string, { ok?: boolean; remarks?: string }>;
  const setInd = (k: string, v: { ok?: boolean; remarks?: string }) => onChange({ ...data, indicators: { ...ind, [k]: { ...ind[k], ...v } } });
  const met = LDRRMP_CERTIFICATE_CRITERIA.filter((c) => crit[c.id]).length;
  return (
    <div className="space-y-4">
      {LDRRMP_REVIEW_GROUPS.map((g) => (
        <fieldset key={g.group} className="text-xs">
          <legend className="font-semibold text-sm">{g.group}</legend>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {g.items.map((it) => {
              const k = `${g.group}|${it}`; const v = ind[k] ?? {};
              return (
                <li key={k} className="py-1 grid gap-1 sm:grid-cols-[1fr_auto_14rem] items-center">
                  <span>{it}</span>
                  <select aria-label={`In the plan: ${it}`} disabled={!editable} className={cn(input, 'py-0.5 w-auto text-xs')} value={v.ok === undefined ? '' : v.ok ? 'y' : 'n'} onChange={(e) => setInd(k, { ok: e.target.value === '' ? undefined : e.target.value === 'y' })}>
                    <option value="">?</option><option value="y">Yes</option><option value="n">No</option>
                  </select>
                  <input aria-label={`Remarks: ${it}`} disabled={!editable} className={cn(input, 'py-0.5 text-xs')} value={v.remarks ?? ''} onChange={(e) => setInd(k, { remarks: e.target.value })} placeholder="Remarks" />
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      <fieldset className="rounded-xl border border-blue-200 dark:border-blue-900 p-3 text-sm">
        <legend className="font-semibold">Criteria for the Certificate of Review ({met} of 4 complied)</legend>
        {LDRRMP_CERTIFICATE_CRITERIA.map((c) => (
          <label key={c.id} className="flex items-start gap-2 py-1 text-xs">
            <input type="checkbox" disabled={!editable} checked={!!crit[c.id]} onChange={(e) => onChange({ ...data, criteria: { ...crit, [c.id]: e.target.checked } })} className="mt-0.5" />
            <span>{c.label}</span>
          </label>
        ))}
        <p className="text-xs mt-1">{met === 4 ? 'All four complied: the certificate can be printed once the review is final.' : 'A Certificate of Review is issued only when all four are complied (Memo 147, 2.4.4).'}</p>
      </fieldset>
    </div>
  );
};

const FormEditor: React.FC<{ f: FormRecord; plans: PlanRecord[]; onChanged: () => void; onClose: () => void }> = ({ f, plans, onChanged, onClose }) => {
  const { can } = useAuth();
  const t = formByKey(f.form_key)!;
  const [data, setData] = useState<Data>(f.data ?? {});
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setData(f.data ?? {}); setDirty(false); }, [f]);
  const editable = f.status === 'draft' && can(ROLE_OF[f.form_key]);
  const set = (d: Data) => { setData(d); setDirty(true); };
  const save = async () => { const { error } = await saveForm(f.id, data); if (error) toast.error(error); else { setDirty(false); toast.success('Saved.'); onChanged(); } };
  const plan = plans.find((p) => p.id === f.plan_id) ?? null;
  const missing = t.fields.filter((x) => x.required && (data[x.id] === undefined || data[x.id] === '' || data[x.id] === null)).map((x) => x.label);
  const overdue = f.form_key === 'initial_report' && typeof data.occurred_at === 'string' && data.occurred_at
    ? (new Date(f.created_at).getTime() - new Date(data.occurred_at).getTime()) / 3.6e6 : null;
  return (
    <div className={cn(card, 'space-y-3')}>
      <button type="button" className="text-xs underline" onClick={onClose}>All forms</button>
      <div>
        <p className="text-xs text-slate-500">{f.ref} · {t.name} · {t.source} · {f.status === 'final' ? `Final ${f.finalized_at?.slice(0, 10)}` : 'Draft'}</p>
        <h2 className="font-montserrat font-bold text-lg">{f.title}</h2>
        <p className="text-xs">{t.purpose}</p>
        {plan && <p className="text-xs">Plan reviewed: {plan.ref} {plan.title}</p>}
        {overdue !== null && overdue > 2 && <p className="text-xs text-amber-800">Filed {overdue.toFixed(1)} hours after the incident; the SOPG asks for the initial report within two hours.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {t.fields.map((x) => (
          <div key={x.id} className={x.kind === 'textarea' ? 'sm:col-span-2' : ''}>
            <Field id={`fm-${x.id}`} label={`${x.label}${x.required ? '' : ' (optional)'}`} hint={x.help}>
              {x.kind === 'textarea' ? <textarea id={`fm-${x.id}`} rows={3} readOnly={!editable} className={input} value={String(data[x.id] ?? '')} onChange={(e) => set({ ...data, [x.id]: e.target.value })} />
                : x.kind === 'yesno' ? <select id={`fm-${x.id}`} disabled={!editable} className={input} value={data[x.id] === true ? 'y' : data[x.id] === false ? 'n' : ''} onChange={(e) => set({ ...data, [x.id]: e.target.value === '' ? null : e.target.value === 'y' })}><option value="">?</option><option value="y">Yes</option><option value="n">No</option></select>
                : <input id={`fm-${x.id}`} type={x.kind === 'datetime' ? 'datetime-local' : x.kind === 'number' ? 'number' : 'text'} min={x.kind === 'number' ? 0 : undefined} readOnly={!editable} className={input}
                    value={String(data[x.id] ?? '')} onChange={(e) => set({ ...data, [x.id]: x.kind === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value })} />}
            </Field>
          </div>
        ))}
      </div>
      {f.form_key === 'ldrrmp_review' && <ReviewChecklist data={data} editable={editable} onChange={set} />}
      {missing.length > 0 && f.status === 'draft' && <p className="text-xs text-amber-800">Still to fill: {missing.join('; ')}.</p>}
      <div className="flex flex-wrap gap-2">
        {editable && <button type="button" disabled={!dirty} onClick={save} className={primary}>Save</button>}
        <button type="button" onClick={() => printForm({ ...f, data }, plan)} className={secondary}><Printer className="w-4 h-4" aria-hidden="true" /> Print</button>
        {f.status === 'draft' && can(f.form_key === 'ldrrmp_review' || f.form_key === 'after_action_report' ? 'drrm_officer' : ROLE_OF[f.form_key]) && (
          <button type="button" disabled={missing.length > 0} className={secondary} onClick={async () => {
            if (dirty) await save();
            const { error } = await finaliseForm(f.id); if (error) toast.error(error); else { toast.success('Final.'); onChanged(); }
          }}>Finalise</button>
        )}
        {f.status === 'draft' && can('analyst') && <button type="button" className="text-xs text-red-800 underline" onClick={async () => { const { error } = await deleteForm(f.id); if (error) toast.error(error); else { onChanged(); onClose(); } }}>Delete draft</button>}
      </div>
    </div>
  );
};

const FormsPanel: React.FC = () => {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const openId = params.get('form');
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const { data: incidents } = useIncidents();
  const [newKey, setNewKey] = useState<FormKey>('initial_report');
  const [incident, setIncident] = useState('');
  const load = useCallback(async () => {
    const [f, p] = await Promise.all([listForms(), listPlans()]);
    setForms(f.data); setPlans(p.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  const open = forms.find((f) => f.id === openId);
  const close = () => setParams({ tab: 'forms' });
  if (open) return <FormEditor f={open} plans={plans} onChanged={load} onClose={close} />;

  const creatable = FORM_TEMPLATES.filter((t) => t.key !== 'after_action_report' && t.key !== 'ldrrmp_review' && can(t.who));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {FORM_TEMPLATES.map((t) => (
          <div key={t.key} className={cn(card, 'text-xs space-y-1')}>
            <p className="font-semibold text-sm flex items-center gap-1"><FileCheck2 className="w-4 h-4" aria-hidden="true" /> {t.name}</p>
            <p>{t.purpose}</p>
            <p className="text-slate-500">{t.source} · filed by {t.who === 'responder' ? 'responders' : 'analysts'} · signed off by {t.finalisedBy}</p>
            {t.key === 'ldrrmp_review' && <p className="text-slate-500">Started from an LDRRMP in Plans.</p>}
            {t.key === 'after_action_report' && <p className="text-slate-500">Made from an evaluated exercise in Validation.</p>}
          </div>
        ))}
      </div>
      {creatable.length > 0 && (
        <form className={cn(card, 'flex flex-wrap gap-2 items-end text-xs')} onSubmit={async (e) => {
          e.preventDefault();
          const t = formByKey(newKey)!;
          const inc = incidents.find((i) => i.id === incident);
          const { id, error } = await createForm({ form_key: newKey, title: `${t.name}${inc ? `: ${inc.ref} ${inc.title}` : ''}`.slice(0, 200), incident_id: incident || null });
          if (error) toast.error(error); else { await load(); setParams({ tab: 'forms', form: id! }); }
        }}>
          <Field id="nf-key" label="New form"><select id="nf-key" className={input} value={newKey} onChange={(e) => setNewKey(e.target.value as FormKey)}>{creatable.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
          <Field id="nf-inc" label="Incident (optional)"><select id="nf-inc" className={input} value={incident} onChange={(e) => setIncident(e.target.value)}><option value="">None</option>{incidents.map((i) => <option key={i.id} value={i.id}>{i.ref} {i.title}</option>)}</select></Field>
          <button type="submit" className={primary}>Start form</button>
        </form>
      )}
      <div className={card}>
        <h3 className="font-semibold mb-2">Forms on file ({forms.length})</h3>
        {forms.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {forms.map((f) => (
            <li key={f.id} className="py-2 flex flex-wrap gap-2 items-center">
              <button type="button" className="underline text-left flex-1 min-w-[14rem]" onClick={() => setParams({ tab: 'forms', form: f.id })}>{f.ref} {f.title}</button>
              <span className="text-xs">{formByKey(f.form_key)?.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-slate-300">{f.status === 'final' ? 'Final' : 'Draft'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FormsPanel;
