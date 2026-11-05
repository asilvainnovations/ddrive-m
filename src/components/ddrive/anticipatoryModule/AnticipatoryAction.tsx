import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, ExternalLink, Hourglass, Plus, Printer, Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole, Role } from '@/lib/roles';
import { toast } from '@/components/ui/sonner';
import { useOfficialAlerts, alertTitle } from '@/hooks/useOfficialAlerts';
import { cn } from '@/lib/utils';
import {
  AaAction, AaAssessment, AaCase, CaseStatus, FundSource, FUND_LABEL, Hazard, HAZARD_LABEL, Measure, MEASURE_LABEL,
  Recommendation, RECOMMENDATION_LABEL, SEVERITY_LABEL, STATUS_LABEL, STEPS, addAction, closeNotDeclared,
  draftRequestLetter, hoursUntil, listCases, loadCaseDetail, openCase, peso, recommend, recordAssessment,
  recordDeclaration, recordLifting, submitReport, updateAction, when,
} from '@/lib/anticipatory';

// ─── Small building blocks ───────────────────────────────────────────────────
const input = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const btn = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold';
const primary = `${btn} bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50`;
const secondary = `${btn} border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800`;
const card = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-5';

const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold mb-1">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fromLocalInput = (v: string) => new Date(v).toISOString();

const Gate: React.FC<{ min: Role; children: React.ReactNode }> = ({ min, children }) => {
  const { can } = useAuth();
  if (can(min)) return <>{children}</>;
  return <p className="text-xs text-slate-500 dark:text-slate-400">{needsRole(min)}</p>;
};

function useSubmit(after: () => void) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ error: string | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(ok);
      after();
    }
  };
  return { busy, run };
}

const LeadTime: React.FC<{ onset: string }> = ({ onset }) => {
  const h = hoursUntil(onset);
  if (h <= 0) return <span className="text-slate-600 dark:text-slate-300">Expected onset has passed</span>;
  const days = Math.floor(h / 24);
  return (
    <span className={cn(h < 72 && 'font-semibold text-amber-800 dark:text-amber-300')}>
      {days > 0 ? `${days} day${days > 1 ? 's' : ''} ` : ''}{Math.round(h % 24)} h until expected onset
      {h < 72 && ' (under 3 days)'}
    </span>
  );
};

// ─── Opening a case ──────────────────────────────────────────────────────────
const NewCaseForm: React.FC<{ onDone: () => void; onCancel: () => void; initialAlertId?: string | null }> = ({ onDone, onCancel, initialAlertId }) => {
  const { alerts } = useOfficialAlerts();
  const [alertId, setAlertId] = useState('');
  const [title, setTitle] = useState('');
  const [hazard, setHazard] = useState<Hazard>('tropical_cyclone');
  const [areas, setAreas] = useState('');
  const [source, setSource] = useState('');
  const [issued, setIssued] = useState(toLocalInput(new Date()));
  const [onset, setOnset] = useState(toLocalInput(new Date(Date.now() + 3 * 86400000)));
  const { busy, run } = useSubmit(onDone);

  const chooseAlert = useCallback((id: string) => {
    setAlertId(id);
    const a = alerts.find((x) => x.id === id);
    if (!a) return;
    const t = alertTitle(a);
    setTitle(t);
    setSource(`PAGASA: ${t}${a.headline ? ` (${a.headline})` : ''}`);
    setIssued(toLocalInput(new Date(a.sent)));
    setAreas(a.area_names.join('; '));
    setHazard(/cyclone|typhoon/i.test(a.event) ? 'tropical_cyclone' : /surge/i.test(a.event) ? 'storm_surge' : /rain/i.test(a.event) ? 'rainfall' : /flood/i.test(a.event) ? 'flood' : 'other');
  }, [alerts]);

  // Opened from an alert's "Start anticipatory action" link: fill in the form once the alerts have loaded.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!prefilled && initialAlertId && alerts.some((a) => a.id === initialAlertId)) {
      chooseAlert(initialAlertId);
      setPrefilled(true);
    }
  }, [alerts, initialAlertId, prefilled, chooseAlert]);

  return (
    <form
      className={cn(card, 'space-y-4')}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => openCase({ title, hazard, areas, official_alert_id: alertId || null, forecast_source: source, forecast_issued_at: fromLocalInput(issued), expected_onset: fromLocalInput(onset) }),
          'Case opened. Next: record the pre-disaster risk assessment.'
        );
      }}
    >
      <h2 className="font-montserrat font-bold text-lg">Open a case from a forecast</h2>
      <Field id="aa-alert" label="Official alert (optional)" hint="Choosing one fills in the forecast details. Alerts in your watch areas come first.">
        <select id="aa-alert" className={input} value={alertId} onChange={(e) => chooseAlert(e.target.value)}>
          <option value="">No alert: enter the forecast yourself</option>
          {alerts.map((a) => (
            <option key={a.id} value={a.id}>{a.in_watch_area ? '★ ' : ''}{alertTitle(a)} · {a.area_names.slice(0, 3).join(', ')}{a.area_names.length > 3 ? '…' : ''}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="aa-title" label="Case name"><input id="aa-title" required className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field id="aa-hazard" label="Hazard">
          <select id="aa-hazard" className={input} value={hazard} onChange={(e) => setHazard(e.target.value as Hazard)}>
            {Object.entries(HAZARD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field id="aa-areas" label="Areas covered" hint="Barangays, municipalities, cities or provinces, separated by semicolons.">
        <textarea id="aa-areas" required rows={2} className={input} value={areas} onChange={(e) => setAreas(e.target.value)} />
      </Field>
      <Field id="aa-source" label="Forecast and its source" hint="For example: PAGASA Tropical Cyclone Bulletin No. 5.">
        <input id="aa-source" required className={input} value={source} onChange={(e) => setSource(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="aa-issued" label="Forecast issued"><input id="aa-issued" type="datetime-local" required className={input} value={issued} onChange={(e) => setIssued(e.target.value)} /></Field>
        <Field id="aa-onset" label="Expected onset of the hazard" hint="The lead time (s. 3(f)) runs to this moment.">
          <input id="aa-onset" type="datetime-local" required className={input} value={onset} onChange={(e) => setOnset(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primary}>Open case</button>
        <button type="button" onClick={onCancel} className={secondary}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Step 2: assessment ──────────────────────────────────────────────────────
const AssessmentForm: React.FC<{ c: AaCase; onDone: () => void }> = ({ c, onDone }) => {
  const declared = c.status === 'declared';
  const options: Recommendation[] = declared ? ['maintain', 'lift'] : ['declare', 'do_not_declare'];
  const [severity, setSeverity] = useState<AaAssessment['severity_class']>('severe');
  const [severe, setSevere] = useState(false);
  const [lead, setLead] = useState(false);
  const [exposed, setExposed] = useState('');
  const [vulnerable, setVulnerable] = useState('');
  const [sectors, setSectors] = useState('');
  const [cascading, setCascading] = useState('');
  const [capacity, setCapacity] = useState('');
  const [basis, setBasis] = useState('');
  const [rec, setRec] = useState<Recommendation>(options[0]);
  const { busy, run } = useSubmit(onDone);
  const hours = hoursUntil(c.expected_onset);

  return (
    <form
      className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => recordAssessment({
            case_id: c.id, severity_class: severity, severe_condition_met: severe, lead_time_condition_met: lead,
            exposed_people: exposed ? Number(exposed) : null, vulnerable_groups: vulnerable || null, sectors_affected: sectors || null,
            cascading_hazards: cascading || null, local_capacity: capacity || null, basis, recommendation: rec,
          }),
          'Assessment recorded.'
        );
      }}
    >
      <h3 className="font-semibold">{declared ? 'Record a new assessment while declared' : 'Record the pre-disaster risk assessment'}</h3>
      <Field id="as-sev" label="Forecast hazard classification">
        <select id="as-sev" className={input} value={severity} onChange={(e) => setSeverity(e.target.value as AaAssessment['severity_class'])}>
          {Object.entries(SEVERITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <fieldset className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
        <legend className="text-sm font-semibold px-1">Conditions in section 6 (both are needed for a declaration)</legend>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={severe} onChange={(e) => setSevere(e.target.checked)} className="mt-1" />
          <span>(a) The forecast hazard is classified as severe or its equivalent, with adverse effects on the population, especially vulnerable groups, and on sectors such as agriculture, business and industry.</span>
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={lead} onChange={(e) => setLead(e.target.checked)} className="mt-1" />
          <span>(b) There is enough lead time for anticipatory action: three days, extendable to five.</span>
        </label>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Lead time now: <LeadTime onset={c.expected_onset} />. The server records the exact figure with the assessment.
          {lead && hours < 72 && hours > 0 && ' Check condition (b): the lead time is under three days.'}
        </p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="as-exp" label="People exposed (optional)"><input id="as-exp" type="number" min={0} className={input} value={exposed} onChange={(e) => setExposed(e.target.value)} /></Field>
        <Field id="as-vul" label="Vulnerable groups"><input id="as-vul" className={input} value={vulnerable} onChange={(e) => setVulnerable(e.target.value)} /></Field>
        <Field id="as-sec" label="Sectors affected"><input id="as-sec" className={input} value={sectors} onChange={(e) => setSectors(e.target.value)} /></Field>
        <Field id="as-cas" label="Cascading hazards"><input id="as-cas" className={input} value={cascading} onChange={(e) => setCascading(e.target.value)} /></Field>
      </div>
      <Field id="as-cap" label="Local capacity"><input id="as-cap" className={input} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field>
      <Field id="as-basis" label="Basis: sources and reasoning" hint="Name the forecasts, hazard maps and exposure data used. At least 20 characters.">
        <textarea id="as-basis" required minLength={20} rows={3} className={input} value={basis} onChange={(e) => setBasis(e.target.value)} />
      </Field>
      <Field id="as-rec" label="Recommendation">
        <select id="as-rec" className={input} value={rec} onChange={(e) => setRec(e.target.value as Recommendation)}>
          {options.map((o) => <option key={o} value={o}>{RECOMMENDATION_LABEL[o]}</option>)}
        </select>
      </Field>
      <button type="submit" disabled={busy} className={primary}>Record assessment</button>
    </form>
  );
};

// ─── Step 3–4: recommendation, declaration ───────────────────────────────────
const RecommendForm: React.FC<{ c: AaCase; latest?: AaAssessment; onDone: () => void }> = ({ c, latest, onDone }) => {
  const [body, setBody] = useState('');
  const [letter, setLetter] = useState('');
  const { busy, run } = useSubmit(onDone);
  useEffect(() => setLetter(draftRequestLetter(c, latest, body)), [c, latest, body]);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => recommend(c.id, body, letter), 'Recommendation recorded.'); }}>
      <Field id="rc-body" label="Recommending council" hint="Section 5: the National or Regional DRRM Council recommends; for a local declaration, the Regional DRRM Council advises the local chief executive.">
        <input id="rc-body" required className={input} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Regional DRRM Council VIII" />
      </Field>
      <Field id="rc-letter" label="Request to the declaring official (draft, edit before sending)">
        <textarea id="rc-letter" rows={10} className={cn(input, 'font-mono text-xs')} value={letter} onChange={(e) => setLetter(e.target.value)} />
      </Field>
      <button type="submit" disabled={busy} className={primary}>Record the recommendation</button>
    </form>
  );
};

const DeclarationForm: React.FC<{ c: AaCase; onDone: () => void }> = ({ c, onDone }) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [eo, setEo] = useState('');
  const [at, setAt] = useState(toLocalInput(new Date()));
  const { busy, run } = useSubmit(onDone);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => recordDeclaration(c.id, name, title, eo, fromLocalInput(at)), 'Declaration recorded.'); }}>
      <p className="text-sm text-slate-600 dark:text-slate-300">Record the declaration once the President or the local chief executive has issued the executive order. DDRiVE-M records it; it does not declare.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="dc-name" label="Declared by"><input id="dc-name" required className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field id="dc-title" label="Position"><input id="dc-title" required className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="City Mayor" /></Field>
        <Field id="dc-eo" label="Executive order number"><input id="dc-eo" required className={input} value={eo} onChange={(e) => setEo(e.target.value)} /></Field>
        <Field id="dc-at" label="Declared on"><input id="dc-at" type="datetime-local" required className={input} value={at} onChange={(e) => setAt(e.target.value)} /></Field>
      </div>
      <button type="submit" disabled={busy} className={primary}>Record the declaration</button>
    </form>
  );
};

const CloseForm: React.FC<{ c: AaCase; onDone: () => void }> = ({ c, onDone }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { busy, run } = useSubmit(onDone);
  if (!open) return <button type="button" className={secondary} onClick={() => setOpen(true)}>Close without a declaration…</button>;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => closeNotDeclared(c.id, reason), 'Case closed without a declaration.'); }}>
      <Field id="cl-reason" label="Why there is no declaration">
        <textarea id="cl-reason" required minLength={10} rows={2} className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primary}>Close the case</button>
        <button type="button" className={secondary} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Measures and funds ──────────────────────────────────────────────────────
const MeasureForm: React.FC<{ c: AaCase; onDone: () => void }> = ({ c, onDone }) => {
  const [measure, setMeasure] = useState<Measure>('public_advisory');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [fund, setFund] = useState<FundSource>('none');
  const [amount, setAmount] = useState('');
  const { busy, run } = useSubmit(() => { setDescription(''); setAmount(''); onDone(); });
  return (
    <form className="grid gap-3 sm:grid-cols-2 border-t border-slate-200 dark:border-slate-700 pt-4" onSubmit={(e) => {
      e.preventDefault();
      run(() => addAction({ case_id: c.id, measure, description, responsible: responsible || null, fund_source: fund, amount_php: amount ? Number(amount) : null }), 'Measure added.');
    }}>
      <Field id="ms-m" label="Measure (section 9)">
        <select id="ms-m" className={input} value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
          {Object.entries(MEASURE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field id="ms-r" label="Responsible office"><input id="ms-r" className={input} value={responsible} onChange={(e) => setResponsible(e.target.value)} /></Field>
      <div className="sm:col-span-2"><Field id="ms-d" label="What will be done"><input id="ms-d" required className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div>
      <Field id="ms-f" label="Fund source (section 10)">
        <select id="ms-f" className={input} value={fund} onChange={(e) => setFund(e.target.value as FundSource)}>
          {Object.entries(FUND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field id="ms-a" label="Amount allotted (PHP)"><input id="ms-a" type="number" min={0} step="0.01" className={input} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={fund === 'none'} /></Field>
      <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primary}><Plus className="w-4 h-4" aria-hidden="true" /> Add measure</button></div>
    </form>
  );
};

const MeasureRow: React.FC<{ a: AaAction; c: AaCase; onDone: () => void }> = ({ a, c, onDone }) => {
  const { can } = useAuth();
  const [disb, setDisb] = useState(a.disbursed_php?.toString() ?? '');
  const { busy, run } = useSubmit(onDone);
  const open = !['closed', 'not_declared'].includes(c.status);
  return (
    <tr>
      <th scope="row" className="px-3 py-2 text-left font-medium align-top">{MEASURE_LABEL[a.measure]}<div className="font-normal text-slate-600 dark:text-slate-300">{a.description}{a.responsible ? ` · ${a.responsible}` : ''}</div></th>
      <td className="px-3 py-2 align-top">{FUND_LABEL[a.fund_source]}</td>
      <td className="px-3 py-2 align-top text-right">{peso(a.amount_php)}</td>
      <td className="px-3 py-2 align-top text-right">
        {open && c.status === 'declared' && a.fund_source !== 'none' && can('drrm_officer') ? (
          <form className="flex gap-1 justify-end" onSubmit={(e) => { e.preventDefault(); run(() => updateAction(a.id, { disbursed_php: disb ? Number(disb) : null }), 'Disbursement recorded.'); }}>
            <label className="sr-only" htmlFor={`d-${a.id}`}>Disbursed for {MEASURE_LABEL[a.measure]}</label>
            <input id={`d-${a.id}`} type="number" min={0} step="0.01" className={cn(input, 'w-32 py-1')} value={disb} onChange={(e) => setDisb(e.target.value)} />
            <button type="submit" disabled={busy} className={cn(secondary, 'py-1 px-2')}>Save</button>
          </form>
        ) : peso(a.disbursed_php)}
      </td>
      <td className="px-3 py-2 align-top">
        {open && can('analyst') ? (
          <select aria-label={`Status of ${MEASURE_LABEL[a.measure]}`} className={cn(input, 'py-1')} value={a.status} disabled={busy}
            onChange={(e) => run(() => updateAction(a.id, { status: e.target.value as AaAction['status'] }), 'Status updated.')}>
            <option value="planned">Planned</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
          </select>
        ) : a.status}
      </td>
    </tr>
  );
};

// ─── Lifting and report ──────────────────────────────────────────────────────
const LiftForm: React.FC<{ c: AaCase; latest?: AaAssessment; onDone: () => void }> = ({ c, latest, onDone }) => {
  const [reason, setReason] = useState<'impacts_not_met' | 'hazard_occurred'>('hazard_occurred');
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [eo, setEo] = useState('');
  const { busy, run } = useSubmit(onDone);
  const assessed = latest?.recommendation === 'lift' && c.declared_at && latest.created_at > c.declared_at;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => recordLifting(c.id, reason, fromLocalInput(at), eo), 'Lifting recorded.'); }}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Why it ended (section 7)</legend>
        <label className="flex gap-2 text-sm"><input type="radio" name="lift" checked={reason === 'hazard_occurred'} onChange={() => setReason('hazard_occurred')} /> The hazard occurred: the declaration lifted automatically.</label>
        <label className="flex gap-2 text-sm"><input type="radio" name="lift" checked={reason === 'impacts_not_met'} onChange={() => setReason('impacts_not_met')} /> The latest assessment found the projected impacts are not met, and the declaring official lifted it.</label>
        {reason === 'impacts_not_met' && !assessed && <p className="text-xs text-amber-800 dark:text-amber-300">First record a new assessment recommending lifting.</p>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="lf-at" label={reason === 'hazard_occurred' ? 'When the hazard occurred' : 'Lifted on'}><input id="lf-at" type="datetime-local" required className={input} value={at} onChange={(e) => setAt(e.target.value)} /></Field>
        <Field id="lf-eo" label={reason === 'impacts_not_met' ? 'Order lifting it' : 'Order number (if any)'}><input id="lf-eo" required={reason === 'impacts_not_met'} className={input} value={eo} onChange={(e) => setEo(e.target.value)} /></Field>
      </div>
      <button type="submit" disabled={busy} className={primary}>Record the lifting</button>
    </form>
  );
};

const Report: React.FC<{ c: AaCase; assessments: AaAssessment[]; actions: AaAction[]; onDone: () => void }> = ({ c, assessments, actions, onDone }) => {
  const [costs, setCosts] = useState('');
  const [basis, setBasis] = useState('');
  const [notes, setNotes] = useState('');
  const { busy, run } = useSubmit(onDone);
  const funded = actions.filter((a) => a.fund_source !== 'none' && a.status !== 'cancelled');
  const byFund = useMemo(() => {
    const m = new Map<FundSource, { allotted: number; disbursed: number }>();
    for (const a of funded) {
      const v = m.get(a.fund_source) ?? { allotted: 0, disbursed: 0 };
      v.allotted += a.amount_php ?? 0;
      v.disbursed += a.disbursed_php ?? 0;
      m.set(a.fund_source, v);
    }
    return [...m.entries()];
  }, [funded]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <caption className="text-left px-3 py-2 font-semibold">Anticipatory Action Fund use (section 8(b))</caption>
          <thead className="bg-slate-100 dark:bg-slate-800"><tr><th scope="col" className="px-3 py-2 text-left">Fund</th><th scope="col" className="px-3 py-2 text-right">Allotted</th><th scope="col" className="px-3 py-2 text-right">Disbursed</th><th scope="col" className="px-3 py-2 text-right">Unused</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {byFund.length === 0 && <tr><td colSpan={4} className="px-3 py-2 text-slate-500">No funded measures.</td></tr>}
            {byFund.map(([f, v]) => (
              <tr key={f}><th scope="row" className="px-3 py-2 text-left font-medium">{FUND_LABEL[f]}</th><td className="px-3 py-2 text-right">{peso(v.allotted)}</td><td className="px-3 py-2 text-right">{peso(v.disbursed)}</td><td className="px-3 py-2 text-right">{peso(v.allotted - v.disbursed)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Section 11: unused LGU funds go to the Special Trust Fund; unused national agency funds revert to the National Treasury. Stored relief
        goods go to the DSWD or the local social welfare office.
      </p>
      <p className="text-sm">{assessments.length} assessment{assessments.length === 1 ? '' : 's'} · {actions.filter((a) => a.status === 'done').length} of {actions.length} measures done</p>

      {c.status === 'closed' ? (
        <dl className="text-sm space-y-1">
          <div><dt className="inline font-semibold">Estimated costs minimised: </dt><dd className="inline">{peso(c.costs_minimized_php)}</dd></div>
          {c.costs_basis && <div><dt className="inline font-semibold">Basis: </dt><dd className="inline">{c.costs_basis}</dd></div>}
          {c.report_notes && <div><dt className="inline font-semibold">Notes: </dt><dd className="inline">{c.report_notes}</dd></div>}
          <div><dt className="inline font-semibold">Submitted: </dt><dd className="inline">{when(c.report_submitted_at)}</dd></div>
        </dl>
      ) : c.status === 'lifted' ? (
        <Gate min="drrm_officer">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => submitReport(c.id, costs ? Number(costs) : null, basis, notes), 'Report submitted. The case is closed.'); }}>
            <Field id="rp-c" label="Estimated economic and social costs minimised, PHP (section 8(c), optional)"><input id="rp-c" type="number" min={0} step="0.01" className={input} value={costs} onChange={(e) => setCosts(e.target.value)} /></Field>
            <Field id="rp-b" label="How the estimate was worked out" hint="Needed when you give an estimate: the method and data, for example PDNA unit costs."><textarea id="rp-b" rows={2} className={input} value={basis} onChange={(e) => setBasis(e.target.value)} required={!!costs} /></Field>
            <Field id="rp-n" label="Notes for the OCD report"><textarea id="rp-n" rows={2} className={input} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={primary}>Submit report and close</button>
              <button type="button" className={secondary} onClick={() => window.print()}><Printer className="w-4 h-4" aria-hidden="true" /> Print</button>
            </div>
          </form>
        </Gate>
      ) : null}
    </div>
  );
};

// ─── Case detail ─────────────────────────────────────────────────────────────
const order: CaseStatus[] = ['triggered', 'assessed', 'recommended', 'declared', 'lifted', 'closed'];

const Stepper: React.FC<{ status: CaseStatus }> = ({ status }) => {
  const reached = status === 'not_declared' ? 1 : order.indexOf(status);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Steps under RA 12287">
      {STEPS.map((s, i) => {
        const done = i <= reached && status !== 'not_declared' ? true : i <= 1 && status === 'not_declared';
        const current = i === reached;
        return (
          <li key={s.status} aria-current={current ? 'step' : undefined}
            className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs', done ? 'border-blue-700 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100' : 'border-slate-300 text-slate-500')}>
            {done ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> : <Circle className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{i + 1}. {s.label}</span><span className="sr-only">{done ? ', done' : ', not yet'}</span>
          </li>
        );
      })}
    </ol>
  );
};

const CaseDetail: React.FC<{ c: AaCase & { version_key?: number }; onChanged: () => void }> = ({ c, onChanged }) => {
  const [assessments, setAssessments] = useState<AaAssessment[]>([]);
  const [actions, setActions] = useState<AaAction[]>([]);
  const load = useCallback(async () => {
    const { data, error } = await loadCaseDetail(c.id);
    if (error) toast.error(error);
    setAssessments(data.assessments);
    setActions(data.actions);
  }, [c.id]);
  useEffect(() => { load(); }, [load, c.version_key]);
  const refresh = () => { load(); onChanged(); };
  const latest = assessments[assessments.length - 1];
  const open = !['lifted', 'closed', 'not_declared'].includes(c.status);

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">{c.ref} · {HAZARD_LABEL[c.hazard]}</p>
            <h2 className="font-montserrat font-bold text-xl">{c.title}</h2>
            <p className="text-sm font-semibold mt-1">{STATUS_LABEL[c.status]}</p>
          </div>
        </div>
        <div className="mt-3"><Stepper status={c.status} /></div>
      </div>

      <section className={card} aria-labelledby="st1">
        <h3 id="st1" className="font-semibold">1. Forecast trigger</h3>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500 text-xs">Forecast</dt><dd>{c.forecast_source}</dd></div>
          <div><dt className="text-slate-500 text-xs">Issued</dt><dd>{when(c.forecast_issued_at)}</dd></div>
          <div><dt className="text-slate-500 text-xs">Expected onset</dt><dd>{when(c.expected_onset)} · {open ? <LeadTime onset={c.expected_onset} /> : null}</dd></div>
          <div><dt className="text-slate-500 text-xs">Areas</dt><dd>{c.areas}</dd></div>
        </dl>
        {c.ddrive_official_alerts && (
          <a href={c.ddrive_official_alerts.cap_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 hover:underline">
            Full alert from PAGASA <ExternalLink className="w-3.5 h-3.5" aria-label="(opens in a new tab)" />
          </a>
        )}
      </section>

      <section className={card} aria-labelledby="st2">
        <h3 id="st2" className="font-semibold">2. Pre-disaster risk assessment</h3>
        {assessments.length === 0 && <p className="text-sm text-slate-500 mt-1">No assessment yet.</p>}
        <ol className="mt-2 space-y-2">
          {assessments.map((a) => (
            <li key={a.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm">
              <p className="font-semibold">{RECOMMENDATION_LABEL[a.recommendation]} <span className="font-normal text-slate-500">· {when(a.created_at)}</span></p>
              <p>{SEVERITY_LABEL[a.severity_class]} · (a) {a.severe_condition_met ? 'met' : 'not met'} · (b) {a.lead_time_condition_met ? 'met' : 'not met'}{a.lead_time_hours != null ? `, lead time ${a.lead_time_hours} h` : ''}</p>
              {a.exposed_people != null && <p>People exposed: {a.exposed_people.toLocaleString('en-PH')}{a.vulnerable_groups ? ` · ${a.vulnerable_groups}` : ''}</p>}
              <p className="text-slate-600 dark:text-slate-300">Basis: {a.basis}</p>
            </li>
          ))}
        </ol>
        {['triggered', 'assessed', 'declared'].includes(c.status) && !(c.status === 'assessed' && latest?.recommendation === 'declare') && (
          <Gate min="analyst"><AssessmentForm c={c} onDone={refresh} /></Gate>
        )}
      </section>

      <section className={card} aria-labelledby="st3">
        <h3 id="st3" className="font-semibold">3–4. Recommendation and declaration</h3>
        <div className="mt-2 space-y-3 text-sm">
          {c.recommended_at && <p>Recommended by {c.recommending_body} on {when(c.recommended_at)}.</p>}
          {c.declared_at && <p>Declared by {c.declared_by_name}, {c.declared_by_title}, {c.declaration_eo}, on {when(c.declared_at)}.</p>}
          {c.not_declared_reason && <p>Not declared: {c.not_declared_reason}</p>}
          {c.request_letter && (
            <details><summary className="cursor-pointer text-blue-700 dark:text-blue-300">Request to the declaring official</summary><pre className="mt-2 whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">{c.request_letter}</pre></details>
          )}
          {c.status === 'assessed' && latest?.recommendation === 'declare' && <Gate min="drrm_officer"><RecommendForm c={c} latest={latest} onDone={refresh} /></Gate>}
          {c.status === 'recommended' && <Gate min="drrm_officer"><DeclarationForm c={c} onDone={refresh} /></Gate>}
          {['triggered', 'assessed', 'recommended'].includes(c.status) && <Gate min="drrm_officer"><CloseForm c={c} onDone={refresh} /></Gate>}
        </div>
      </section>

      <section className={card} aria-labelledby="st5">
        <h3 id="st5" className="font-semibold">Anticipatory measures and funds</h3>
        <p className="text-xs text-slate-500 mt-1">Plan measures at any time. Funds can be disbursed only while the declaration is in force (section 10).</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800"><tr><th scope="col" className="px-3 py-2 text-left">Measure</th><th scope="col" className="px-3 py-2 text-left">Fund</th><th scope="col" className="px-3 py-2 text-right">Allotted</th><th scope="col" className="px-3 py-2 text-right">Disbursed</th><th scope="col" className="px-3 py-2 text-left">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {actions.length === 0 && <tr><td colSpan={5} className="px-3 py-2 text-slate-500">No measures yet.</td></tr>}
              {actions.map((a) => <MeasureRow key={a.id} a={a} c={c} onDone={refresh} />)}
            </tbody>
          </table>
        </div>
        {open && <Gate min="analyst"><MeasureForm c={c} onDone={refresh} /></Gate>}
      </section>

      <section className={card} aria-labelledby="st6">
        <h3 id="st6" className="font-semibold">5. Lifting</h3>
        <div className="mt-2 text-sm">
          {c.lifted_at ? (
            <p>{c.lift_reason === 'hazard_occurred' ? 'Lifted automatically when the hazard occurred' : 'Lifted: projected impacts not met'} on {when(c.lifted_at)}{c.lifting_eo ? `, ${c.lifting_eo}` : ''}.</p>
          ) : c.status === 'declared' ? (
            <Gate min="drrm_officer"><LiftForm c={c} latest={latest} onDone={refresh} /></Gate>
          ) : <p className="text-slate-500">Applies once declared.</p>}
        </div>
      </section>

      <section className={card} aria-labelledby="st7">
        <h3 id="st7" className="font-semibold">6. Report to OCD</h3>
        <div className="mt-2">{['lifted', 'closed'].includes(c.status) ? <Report c={c} assessments={assessments} actions={actions} onDone={refresh} /> : <p className="text-sm text-slate-500">Prepared after the declaration is lifted.</p>}</div>
      </section>
    </div>
  );
};

// ─── Module ──────────────────────────────────────────────────────────────────
const AnticipatoryAction: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const fromAlert = params.get('alert');
  const { can } = useAuth();
  const [cases, setCases] = useState<AaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(Boolean(fromAlert));
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await listCases();
    if (error) toast.error(error);
    setCases(data);
    setLoading(false);
    setTick((t) => t + 1);
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = cases.find((c) => c.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <div className={cn(card, 'flex flex-wrap gap-4 items-start')}>
        <Scale className="w-8 h-8 text-blue-700 dark:text-blue-300 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-[16rem] text-sm text-slate-700 dark:text-slate-300 space-y-1">
          <p className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Anticipatory action under RA 12287</p>
          <p>Act before the hazard strikes: from the forecast, through the pre-disaster risk assessment and the declaration of a State of Imminent Disaster, to the measures, fund use, lifting and the report to OCD.</p>
          <p className="text-xs">DDRiVE-M records each step and checks it against the Act. The declaration itself is made by the President or the local chief executive. False hazard information and manipulated assessments are punishable under sections 12 and 13.</p>
        </div>
        <Gate min="analyst">
          <button type="button" className={primary} onClick={() => { setCreating(true); setSelected(null); }}><Plus className="w-4 h-4" aria-hidden="true" /> Open a case</button>
        </Gate>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <nav aria-label="Cases" className="space-y-2">
          {loading && <p role="status" className="text-sm text-slate-500">Loading cases…</p>}
          {!loading && cases.length === 0 && <p className="text-sm text-slate-500">No cases yet. Open one when a forecast may call for anticipatory action.</p>}
          {cases.map((c) => (
            <button key={c.id} type="button" onClick={() => { setSelected(c.id); setCreating(false); }} aria-current={c.id === selected ? 'true' : undefined}
              className={cn('w-full text-left rounded-xl border p-3 hover:bg-white dark:hover:bg-slate-800', c.id === selected ? 'border-blue-700 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60')}>
              <span className="block text-xs text-slate-500">{c.ref} · {HAZARD_LABEL[c.hazard]}</span>
              <span className="block font-semibold">{c.title}</span>
              <span className="block text-xs mt-0.5 flex items-center gap-1"><Hourglass className="w-3 h-3" aria-hidden="true" /> {STATUS_LABEL[c.status]}</span>
            </button>
          ))}
        </nav>
        <div>
          {creating ? (
            can('analyst') ? (
              <NewCaseForm
                initialAlertId={fromAlert}
                onCancel={() => { setCreating(false); setParams({}); }}
                onDone={() => { setCreating(false); setParams({}); load(); }}
              />
            ) : <p className="text-sm text-slate-500">{needsRole('analyst')}</p>
          ) : current ? (
            <CaseDetail key={current.id} c={{ ...current, version_key: tick } as AaCase & { version_key: number }} onChanged={load} />
          ) : (
            !loading && cases.length > 0 && <p className="text-sm text-slate-500">Choose a case.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnticipatoryAction;
