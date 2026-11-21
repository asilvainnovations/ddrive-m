// Rapid Mapping & Geospatial Intelligence: activations linked to incidents, areas of interest, versioned map products,
// field observations. Rules live in the database (ADR-004); this screen shows them and explains them.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Map as MapIcon, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole } from '@/lib/roles';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import {
  addConditionCode, createProduct, DashboardRow, listAaCases, listActivations, listIncidents, loadDashboard, loadWorkspace,
  openActivation, setActivationStatus, setConditionCodeActive, updateActivation, Workspace,
} from '@/lib/rapidMapping/api';
import {
  ACTIVATION_STATUS_LABEL, Activation, CONFIDENCE_LABEL, Confidence, HAZARD_LABEL, HazardType, PHASE_LABEL, Phase, PRIORITY_LABEL, Priority,
  PRODUCT_TYPES, ProductType, productCode, productTypeMeta,
} from '@/lib/rapidMapping/types';
import AoiPanel from './AoiPanel';
import ObservationPanel from './ObservationPanel';
import ProductWorkspace from './ProductWorkspace';
import { Field, Gate, NoteAction, StatusBadge, card, input, primary, secondary, toLocalInput, fromLocalInput, useSubmit, when } from './ui';

// ─── New activation ──────────────────────────────────────────────────────────
const NewActivationForm: React.FC<{ onDone: (id: string | null) => void; onCancel: () => void; initialIncident?: string | null; initialCase?: string | null }> = ({ onDone, onCancel, initialIncident, initialCase }) => {
  const [incidents, setIncidents] = useState<{ id: string; ref: string; title: string; status: string }[]>([]);
  const [cases, setCases] = useState<{ id: string; ref: string; title: string; status: string }[]>([]);
  const [f, setF] = useState({
    incident_id: initialIncident ?? '', aa_case_id: initialCase ?? '', title: '', hazard_type: 'flood' as HazardType, phase: 'response' as Phase,
    priority: 'urgent' as Priority, operational_objective: '', cutoff: '',
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => { listIncidents().then((r) => setIncidents(r.data)); listAaCases().then((r) => setCases(r.data)); }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form className={cn(card, 'space-y-3')} onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const r = await openActivation({
        incident_id: f.incident_id, aa_case_id: f.aa_case_id || null, title: f.title, hazard_type: f.hazard_type, phase: f.phase,
        priority: f.priority, operational_objective: f.operational_objective, information_cutoff_at: f.cutoff ? fromLocalInput(f.cutoff) : null,
      });
      setBusy(false);
      if (r.error) toast.error(r.error);
      else { toast.success('Activation opened as a draft. Add an area of interest; a DRRM officer activates it.'); onDone(r.data); }
    }}>
      <h2 className="font-montserrat font-bold text-lg">Open a mapping activation</h2>
      <Field id="na-inc" label="Incident" hint="Every activation belongs to an incident. Open the incident in the Response module first if it does not exist yet.">
        <select id="na-inc" required className={input} value={f.incident_id} onChange={set('incident_id')}>
          <option value="">Choose</option>
          {incidents.map((i) => <option key={i.id} value={i.id}>{i.ref} {i.title} ({i.status})</option>)}
        </select>
      </Field>
      <Field id="na-case" label="Anticipatory action case (optional)" hint="Link it when the mapping supports a pre-disaster risk assessment under RA 12287.">
        <select id="na-case" className={input} value={f.aa_case_id} onChange={set('aa_case_id')}>
          <option value="">None</option>
          {cases.map((c) => <option key={c.id} value={c.id}>{c.ref} {c.title}</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="na-title" label="Title"><input id="na-title" required minLength={3} className={input} value={f.title} onChange={set('title')} /></Field>
        <Field id="na-haz" label="Hazard"><select id="na-haz" className={input} value={f.hazard_type} onChange={set('hazard_type')}>{Object.entries(HAZARD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field id="na-phase" label="Phase"><select id="na-phase" className={input} value={f.phase} onChange={set('phase')}>{Object.entries(PHASE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field id="na-pri" label="Priority"><select id="na-pri" className={input} value={f.priority} onChange={set('priority')}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      <Field id="na-obj" label="Operational question" hint="The decision this mapping must support, e.g. “Which barangays are flooded and which roads are passable for relief trucks?” Needed before activation.">
        <textarea id="na-obj" rows={2} className={input} value={f.operational_objective} onChange={set('operational_objective')} />
      </Field>
      <Field id="na-cut" label="Information cut-off (optional)"><input id="na-cut" type="datetime-local" className={input} value={f.cutoff} max={toLocalInput(new Date())} onChange={set('cutoff')} /></Field>
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={busy}>Open activation</button>
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Overview tab ────────────────────────────────────────────────────────────
const Overview: React.FC<{ ws: Workspace; onChanged: () => void }> = ({ ws, onChanged }) => {
  const a = ws.activation!;
  const { can } = useAuth();
  const { busy, run } = useSubmit(onChanged);
  const [objective, setObjective] = useState(a.operational_objective ?? '');
  const open = !['closed', 'cancelled'].includes(a.status);
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
        <div><dt className="text-xs text-slate-500">Incident</dt><dd>{a.ddrive_incidents ? `${a.ddrive_incidents.ref} ${a.ddrive_incidents.title}` : a.incident_id}</dd></div>
        <div><dt className="text-xs text-slate-500">Hazard · phase · priority</dt><dd>{HAZARD_LABEL[a.hazard_type]} · {PHASE_LABEL[a.phase]} · {PRIORITY_LABEL[a.priority]}</dd></div>
        <div><dt className="text-xs text-slate-500">Activated</dt><dd>{when(a.activated_at)}</dd></div>
        <div><dt className="text-xs text-slate-500">Information cut-off</dt><dd>{when(a.information_cutoff_at)}</dd></div>
        {a.closed_at && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">{a.status === 'cancelled' ? 'Cancelled' : 'Closed'}</dt><dd>{when(a.closed_at)}: {a.close_reason}</dd></div>}
      </dl>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => updateActivation(a.id, { operational_objective: objective }), 'Saved.'); }}>
        <Field id="ov-obj" label="Operational question"><textarea id="ov-obj" rows={2} className={input} readOnly={!open || !can('analyst')} value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
        {open && can('analyst') && objective !== (a.operational_objective ?? '') && <button type="submit" className={secondary} disabled={busy}>Save</button>}
      </form>
      {open && (
        <Gate min="drrm_officer">
          <div className="flex flex-wrap gap-2">
            {a.status === 'draft' && <button type="button" className={primary} disabled={busy} onClick={() => run(() => setActivationStatus(a.id, 'active'), 'Activated. Field teams can now send observations.')}>Activate</button>}
            {a.status === 'active' && <button type="button" className={secondary} disabled={busy} onClick={() => run(() => setActivationStatus(a.id, 'on_hold'), 'On hold.')}>Put on hold</button>}
            {a.status === 'on_hold' && <button type="button" className={primary} disabled={busy} onClick={() => run(() => setActivationStatus(a.id, 'active'), 'Active again.')}>Resume</button>}
          </div>
          {a.status !== 'draft' && <NoteAction id="ov-close" label="Close (reason; drafts and reviews must be resolved first)" button="Close activation" minLength={10}
                                              onSubmit={(n) => run(() => setActivationStatus(a.id, 'closed', n), 'Activation closed. Its products and files remain available.')} />}
          <NoteAction id="ov-cancel" label="Cancel (reason)" button="Cancel activation" minLength={10} tone="danger"
                      onSubmit={(n) => run(() => setActivationStatus(a.id, 'cancelled', n), 'Activation cancelled.')} />
        </Gate>
      )}
    </div>
  );
};

// ─── Damage/severity dictionary ──────────────────────────────────────────────
const ConditionCodes: React.FC<{ ws: Workspace; onChanged: () => void }> = ({ ws, onChanged }) => {
  const [f, setF] = useState({ code: '', label: '', asset_class: 'any', definition: '', approval_basis: '' });
  const { busy, run } = useSubmit(() => { setF({ code: '', label: '', asset_class: 'any', definition: '', approval_basis: '' }); onChanged(); });
  return (
    <div className="space-y-3 text-sm">
      <p>Damage and severity classes must be formally approved locally before use (spec §3.1). <strong>Unknown</strong> and <strong>Not assessed</strong> are always available: absence of evidence is not evidence of no damage.</p>
      {ws.codes.length === 0 ? <p className="text-slate-500">No approved classes yet.</p> : (
        <ul className="space-y-1">{ws.codes.map((c) => (
          <li key={c.code} className={cn('rounded-lg border p-2', !c.active && 'opacity-60')}>
            <strong>{c.label}</strong> <code className="text-xs">{c.code}</code> · {c.asset_class} · {c.definition} · <em>{c.approval_basis}</em>{!c.active && ' · inactive'}
            <Gate min="drrm_officer" quiet><button type="button" className="ml-2 text-xs underline" onClick={() => run(() => setConditionCodeActive(c.code, !c.active), c.active ? 'Deactivated.' : 'Reactivated.')}>{c.active ? 'Deactivate' : 'Reactivate'}</button></Gate>
          </li>))}
        </ul>
      )}
      <Gate min="drrm_officer">
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => addConditionCode(f), 'Class added.'); }}>
          <Field id="cc-code" label="Code" hint="Lowercase letters, digits and _."><input id="cc-code" required pattern="[a-z][a-z0-9_]{1,39}" className={input} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
          <Field id="cc-label" label="Label"><input id="cc-label" required className={input} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
          <Field id="cc-asset" label="Applies to"><select id="cc-asset" className={input} value={f.asset_class} onChange={(e) => setF({ ...f, asset_class: e.target.value })}>{['any', 'building', 'road', 'bridge', 'utility', 'facility', 'land'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field id="cc-basis" label="Approved by" hint="e.g. CDRRMC Resolution 2026-14"><input id="cc-basis" required minLength={5} className={input} value={f.approval_basis} onChange={(e) => setF({ ...f, approval_basis: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field id="cc-def" label="Definition"><input id="cc-def" required minLength={10} className={input} value={f.definition} onChange={(e) => setF({ ...f, definition: e.target.value })} /></Field></div>
          <div><button type="submit" className={secondary} disabled={busy}>Add approved class</button></div>
        </form>
      </Gate>
    </div>
  );
};

// ─── Products tab ────────────────────────────────────────────────────────────
const NewProductForm: React.FC<{ ws: Workspace; onDone: (id: string | null) => void; onCancel: () => void }> = ({ ws, onDone, onCancel }) => {
  const [type, setType] = useState<ProductType>('preliminary_estimate');
  const [title, setTitle] = useState('');
  const [aoi, setAoi] = useState(ws.aois.find((a) => a.status === 'approved')?.id ?? ws.aois[0]?.id ?? '');
  const [confidence, setConfidence] = useState<Confidence>('low');
  const [busy, setBusy] = useState(false);
  const meta = productTypeMeta(type);
  return (
    <form className={cn(card, 'space-y-3')} onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const r = await createProduct({ activation_id: ws.activation!.id, aoi_id: aoi || null, product_type: type, title, summary: null, methodology: null, limitations: null, confidence });
      setBusy(false);
      if (r.error) toast.error(r.error); else { toast.success('Product created with draft version 1.'); onDone(r.data); }
    }}>
      <h3 className="font-semibold">New product</h3>
      <Field id="np-type" label="Type" hint={meta.question}>
        <select id="np-type" className={input} value={type} onChange={(e) => setType(e.target.value as ProductType)}>
          {PRODUCT_TYPES.map((p) => <option key={p.type} value={p.type}>{p.label} ({p.code})</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="np-title" label="Title"><input id="np-title" required minLength={3} className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field id="np-aoi" label="Area of interest">
          <select id="np-aoi" className={input} value={aoi} required={type !== 'reference'} onChange={(e) => setAoi(e.target.value)}>
            {type === 'reference' && <option value="">None (whole jurisdiction)</option>}
            {ws.aois.filter((a) => a.status !== 'retired').map((a) => <option key={a.id} value={a.id}>{a.name} ({a.status})</option>)}
          </select>
        </Field>
        <Field id="np-conf" label="Initial confidence"><select id="np-conf" className={input} value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)}>{Object.entries(CONFIDENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      </div>
      {type === 'reference' && <p className="text-xs">Baseline layers belong to their custodians (CLUP, CDRA, DDRiVE-M risk registry). Reference them with source and vintage; do not create competing baselines.</p>}
      {type === 'grading' && ws.codes.length === 0 && <p className="text-xs text-amber-900">No damage classes are approved yet; features can only be graded “unknown” or “not assessed” until a DRRM officer adds them.</p>}
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={busy || (type !== 'reference' && !aoi)}>Create</button>
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

type Tab = 'overview' | 'aois' | 'products' | 'observations' | 'classes';

const ActivationWorkspace: React.FC<{ id: string; onListChanged: () => void }> = ({ id, onListChanged }) => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  const productId = params.get('p');
  const [ws, setWs] = useState<Workspace | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const { can } = useAuth();

  const load = useCallback(async () => {
    const r = await loadWorkspace(id);
    if (r.error) toast.error(r.error);
    setWs(r.data);
  }, [id]);
  useEffect(() => { setWs(null); load(); }, [load]);
  const changed = useCallback(() => { load(); onListChanged(); }, [load, onListChanged]);
  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v == null) p.delete(k); else p.set(k, v); }
    setParams(p);
  };

  if (!ws) return <p role="status" className="text-sm text-slate-500">Loading the activation…</p>;
  if (!ws.activation) return <p className="text-sm text-slate-500">This activation was not found, or you cannot see it.</p>;
  const a = ws.activation;
  const product = productId ? ws.products.find((p) => p.id === productId) : null;
  const pendingObs = ws.observations.filter((o) => o.verification_status === 'submitted').length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'aois', label: `Areas (${ws.aois.length})` },
    { key: 'products', label: `Products (${ws.products.length})` },
    { key: 'observations', label: `Field observations${pendingObs ? ` · ${pendingObs} new` : ''}` },
    { key: 'classes', label: 'Damage classes' },
  ];

  return (
    <div className="space-y-4">
      <header className={card}>
        <p className="text-xs text-slate-500">{a.ref} · {HAZARD_LABEL[a.hazard_type]} · {PRIORITY_LABEL[a.priority]}</p>
        <h2 className="font-montserrat font-bold text-xl">{a.title}</h2>
        <p className="text-sm font-semibold mt-1">{ACTIVATION_STATUS_LABEL[a.status]}</p>
        {a.operational_objective && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{a.operational_objective}</p>}
      </header>
      <div role="tablist" aria-label="Activation sections" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} id={`rm-tab-${t.key}`} aria-controls={`rm-panel-${t.key}`}
                  onClick={() => go({ tab: t.key, p: null })}
                  className={cn('px-3 py-2 min-h-[44px] text-sm rounded-t-lg', tab === t.key ? 'border-b-2 border-blue-700 font-semibold' : 'text-slate-600 dark:text-slate-300')}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`rm-panel-${tab}`} aria-labelledby={`rm-tab-${tab}`}>
        {tab === 'overview' && <div className={card}><Overview ws={ws} onChanged={changed} /></div>}
        {tab === 'aois' && <AoiPanel activation={a} aois={ws.aois} onChanged={changed} />}
        {tab === 'observations' && <ObservationPanel activation={a} aois={ws.aois} observations={ws.observations} codes={ws.codes} onChanged={changed} />}
        {tab === 'classes' && <div className={card}><ConditionCodes ws={ws} onChanged={changed} /></div>}
        {tab === 'products' && (product ? (
          <ProductWorkspace key={product.id} activation={a} product={product} versions={ws.versions} layers={ws.layers} aois={ws.aois}
                            observations={ws.observations} onChanged={changed} onBack={() => go({ p: null })} />
        ) : (
          <div className="space-y-3">
            {!['closed', 'cancelled'].includes(a.status) && !creatingProduct && (
              <Gate min="analyst" quiet><button type="button" className={primary} onClick={() => setCreatingProduct(true)}><Plus className="w-4 h-4" aria-hidden="true" /> New product</button></Gate>
            )}
            {creatingProduct && <NewProductForm ws={ws} onCancel={() => setCreatingProduct(false)} onDone={(pid) => { setCreatingProduct(false); changed(); if (pid) go({ p: pid }); }} />}
            {ws.products.length === 0 && !creatingProduct && <p className="text-sm text-slate-500">No products you can see yet. Unpublished products are visible to analysts and above.</p>}
            <ul className="space-y-2">
              {ws.products.map((p) => {
                const pub = ws.versions.find((v) => v.product_id === p.id && v.status === 'published');
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => go({ p: p.id })} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3 hover:bg-white dark:hover:bg-slate-800">
                      <span className="block text-xs text-slate-500">{productCode(a.ref, p, p.current_version)} · {productTypeMeta(p.product_type).label}</span>
                      <span className="block font-semibold">{p.title}</span>
                      <span className="flex flex-wrap gap-2 mt-1 items-center">
                        {/* Non-analysts can read only the published version, so that is the status they are shown. */}
                        <StatusBadge status={can('analyst') || !pub ? p.status : 'published'} level={pub?.publication_level ?? null} />
                        {p.published_version && p.status !== 'published' && <span className="text-xs">v{p.published_version} published</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Module ──────────────────────────────────────────────────────────────────
const RapidMapping: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const selected = params.get('a');
  const { can, activeTenant } = useAuth();
  const [list, setList] = useState<Activation[]>([]);
  const [dash, setDash] = useState<DashboardRow>({ aois: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(Boolean(params.get('incident') || params.get('case')));

  const load = useCallback(async () => {
    const [l, d] = await Promise.all([listActivations(), loadDashboard()]);
    if (l.error) toast.error(l.error);
    setList(l.data);
    setDash(d.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, activeTenant?.tenant_id]);

  const stats = useMemo(() => {
    const by = (id: string) => ({
      aois: dash.aois.filter((x) => x.activation_id === id).length,
      approved: dash.aois.filter((x) => x.activation_id === id && x.status === 'approved').length,
      products: dash.products.filter((x) => x.activation_id === id).length,
      published: dash.products.filter((x) => x.activation_id === id && x.status === 'published').length,
    });
    return Object.fromEntries(list.map((a) => [a.id, by(a.id)]));
  }, [list, dash]);
  const awaitingReview = dash.products.filter((p) => p.status === 'under_review');
  const awaitingApproval = dash.aois.filter((x) => x.status === 'submitted');
  const awaitingPublication = dash.products.filter((p) => ['preliminary', 'for_field_verification', 'verified'].includes(p.status));
  const open = (id: string, extra: Record<string, string> = {}) => { setCreating(false); setParams({ a: id, ...extra }); };
  const activationRef = (id: string) => list.find((a) => a.id === id)?.ref;

  return (
    <div className="space-y-6">
      <div className={cn(card, 'flex flex-wrap gap-4 items-start')}>
        <MapIcon className="w-8 h-8 text-blue-700 dark:text-blue-300 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-[16rem] text-sm text-slate-700 dark:text-slate-300 space-y-1">
          <p className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Rapid Mapping</p>
          <p>Turn field reports and spatial data into traceable, versioned map products for EOC decisions: an activation per incident, approved areas of interest, and preliminary, verified and published products, adapted from the Copernicus EMS Rapid Mapping model.</p>
          <p className="text-xs">Every feature keeps its source, time and confidence. Preliminary products are always labelled as such. Official damage assessments remain subject to the mandated process and authority.</p>
        </div>
        <Gate min="analyst">
          <button type="button" className={primary} onClick={() => { setCreating(true); setParams({}); }}><Plus className="w-4 h-4" aria-hidden="true" /> Open activation</button>
        </Gate>
      </div>

      {(can('analyst')) && (awaitingReview.length + awaitingApproval.length + awaitingPublication.length > 0) && (
        <section className={cn(card, 'grid gap-4 sm:grid-cols-3 text-sm')} aria-label="Waiting for action">
          <div><p className="font-semibold">Products to review ({awaitingReview.length})</p>
            <ul>{awaitingReview.slice(0, 5).map((p) => <li key={p.id}><button type="button" className="underline text-left" onClick={() => open(p.activation_id, { tab: 'products', p: p.id })}>{productCode(activationRef(p.activation_id), p)} {p.title}</button></li>)}</ul></div>
          <div><p className="font-semibold">Areas to approve ({awaitingApproval.length})</p>
            <ul>{[...new Set(awaitingApproval.map((x) => x.activation_id))].slice(0, 5).map((aid) => <li key={aid}><button type="button" className="underline" onClick={() => open(aid, { tab: 'aois' })}>{activationRef(aid)}</button></li>)}</ul></div>
          <div><p className="font-semibold">Accepted, not yet published ({awaitingPublication.length})</p>
            <ul>{awaitingPublication.slice(0, 5).map((p) => <li key={p.id}><button type="button" className="underline text-left" onClick={() => open(p.activation_id, { tab: 'products', p: p.id })}>{productCode(activationRef(p.activation_id), p)} {p.title}</button></li>)}</ul></div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <nav aria-label="Mapping activations" className="space-y-2">
          {loading && <p role="status" className="text-sm text-slate-500">Loading activations…</p>}
          {!loading && list.length === 0 && <p className="text-sm text-slate-500">No mapping activations yet. Open one from an incident that needs mapping support.</p>}
          {list.map((a) => {
            const s = stats[a.id];
            return (
              <button key={a.id} type="button" onClick={() => open(a.id)} aria-current={a.id === selected ? 'true' : undefined}
                      className={cn('w-full text-left rounded-xl border p-3 hover:bg-white dark:hover:bg-slate-800', a.id === selected ? 'border-blue-700 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60')}>
                <span className="block text-xs text-slate-500">{a.ref} · {HAZARD_LABEL[a.hazard_type]} · {PRIORITY_LABEL[a.priority]}</span>
                <span className="block font-semibold">{a.title}</span>
                <span className="block text-xs mt-0.5">{ACTIVATION_STATUS_LABEL[a.status]} · {s?.approved ?? 0}/{s?.aois ?? 0} areas approved · {s?.published ?? 0}/{s?.products ?? 0} products published</span>
                {a.ddrive_incidents && <span className="block text-xs text-slate-500">Incident {a.ddrive_incidents.ref}</span>}
              </button>
            );
          })}
        </nav>
        <div>
          {creating ? (
            can('analyst') ? (
              <NewActivationForm initialIncident={params.get('incident')} initialCase={params.get('case')}
                                 onCancel={() => setCreating(false)} onDone={(id) => { setCreating(false); load(); if (id) open(id, { tab: 'aois' }); }} />
            ) : <p className="text-sm text-slate-500">{needsRole('analyst')}</p>
          ) : selected ? (
            <ActivationWorkspace key={selected} id={selected} onListChanged={load} />
          ) : (!loading && list.length > 0 && <p className="text-sm text-slate-500">Choose an activation.</p>)}
        </div>
      </div>
    </div>
  );
};

export default RapidMapping;
