import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AREA_LABEL, ActionOrigin, DrrmArea, NewAction, PRIORITY_LABEL, Priority, ResponseAction, STATUS_LABEL, STRATEGY_LABEL,
  Strategy, listActions, proposeAction, type ActionFilter,
} from '@/lib/responseActions';
import { Field, Gate, input, primary, secondary, useSubmit } from '../rapidMappingModule/ui';
import type { Role } from '@/lib/roles';
import AskDdriver from '../ai/AskDdriver';
import type { AiSuggestion } from '@/lib/ddriver';

export interface ProposeLink {
  origin: ActionOrigin;
  risk_id?: string | null;
  hazard_entry_id?: string | null;
  official_alert_id?: string | null;
  hazard_record_id?: number | null;
  incident_id?: string | null;
}

/** The form to propose an action. Used in Diagnosis, Detection and Response; the decision is always made in Response. */
export const ProposeActionForm: React.FC<{
  link: ProposeLink;
  defaultTitle?: string;
  defaultPriority?: Priority;
  defaultArea?: DrrmArea;
  defaultStrategy?: Strategy;
  context?: string;
  onDone: () => void;
  onCancel?: () => void;
  idPrefix: string;
  /** 'risk:<id>' or 'entry:<id>': offers DDRiVER AI draft options for this risk. */
  aiSubject?: string;
}> = ({ link, defaultTitle = '', defaultPriority = 'medium', defaultArea, defaultStrategy, context, onDone, onCancel, idPrefix, aiSubject }) => {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<Strategy>(defaultStrategy ?? (link.origin === 'detection' ? 'reduce_consequences' : 'reduce_likelihood'));
  const [area, setArea] = useState<DrrmArea>(defaultArea ?? (link.origin === 'detection' ? 'response' : 'prevention_mitigation'));
  const [priority, setPriority] = useState<Priority>(defaultPriority);
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [cost, setCost] = useState('');
  const [aiAssisted, setAiAssisted] = useState(false);
  const { busy, run } = useSubmit(onDone);
  const id = (k: string) => `${idPrefix}-${k}`;
  const useDraft = (s: AiSuggestion) => {
    setTitle(s.title); setStrategy(s.strategy as Strategy); setArea(s.drrm_area as DrrmArea);
    setDescription(s.rationale.replace(/\s*\[S\d+(?:,\s*S\d+)*\]/g, '').trim()); setAiAssisted(true);
  };
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const a: NewAction = {
          ...link, title, description: description || null, strategy, drrm_area: area, priority, ai_assisted: aiAssisted,
          owner_office: owner || null, due_on: due || null, cost_php: cost ? Number(cost) : null,
        };
        run(() => proposeAction(a), 'Action proposed. It is now waiting for a decision in Response.');
      }}
    >
      <p className="sm:col-span-2 text-sm font-semibold">Propose an action{context ? ` for ${context}` : ''}</p>
      {aiSubject && <AskDdriver className="sm:col-span-2" task="suggest_treatments" subject={aiSubject} label="Draft options with DDRiVER AI" idPrefix={`${idPrefix}-ai`} onSuggestion={useDraft} />}
      {aiAssisted && <p className="sm:col-span-2 text-xs rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 px-2 py-1">Started from a DDRiVER AI draft. Check and edit it: the proposal is yours and is marked as AI-assisted.</p>}
      <div className="sm:col-span-2">
        <Field id={id('title')} label="Action"><input id={id('title')} required minLength={3} maxLength={200} className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field id={id('desc')} label="Details (optional)"><textarea id={id('desc')} rows={2} maxLength={4000} className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
      <Field id={id('strategy')} label="Treatment option (ISO 31000)">
        <select id={id('strategy')} className={input} value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
          {Object.entries(STRATEGY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field id={id('area')} label="DRRM thematic area (RA 10121)">
        <select id={id('area')} className={input} value={area} onChange={(e) => setArea(e.target.value as DrrmArea)}>
          {Object.entries(AREA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field id={id('priority')} label="Priority" hint="Suggested from the risk rating; change it if needed.">
        <select id={id('priority')} className={input} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field id={id('owner')} label="Responsible office (optional)"><input id={id('owner')} className={input} value={owner} onChange={(e) => setOwner(e.target.value)} /></Field>
      <Field id={id('due')} label="Due date (optional)"><input id={id('due')} type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <Field id={id('cost')} label="Estimated cost, PHP (optional)"><input id={id('cost')} type="number" min={0} step="0.01" className={input} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={busy} className={primary}><Plus className="w-4 h-4" aria-hidden="true" /> Propose action</button>
        {onCancel && <button type="button" onClick={onCancel} className={secondary}>Cancel</button>}
      </div>
    </form>
  );
};

const statusClass = (s: ResponseAction['status']) =>
  s === 'done' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' :
  s === 'declined' || s === 'cancelled' ? 'border-slate-300 bg-slate-100 text-slate-700' :
  s === 'proposed' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-blue-300 bg-blue-50 text-blue-900';

/**
 * The actions already proposed for one risk, assessed hazard event, alert or hazard report, with a way to propose
 * another. Shown beside the evidence in Diagnosis and Detection; decisions happen in Response.
 */
export const LinkedActions: React.FC<{
  filter: ActionFilter;
  link: ProposeLink;
  min: Role;
  idPrefix: string;
  context?: string;
  defaultTitle?: string;
  defaultPriority?: Priority;
  compact?: boolean;
  /** Rows already loaded by the parent (one query for a whole table). With these, onChanged reloads them. */
  preloaded?: ResponseAction[];
  onChanged?: () => void;
  aiSubject?: string;
}> = ({ filter, link, min, idPrefix, context, defaultTitle, defaultPriority, compact, preloaded, onChanged, aiSubject }) => {
  const [own, setOwn] = useState<ResponseAction[]>([]);
  const [open, setOpen] = useState(false);
  const key = JSON.stringify(filter);
  const self = preloaded === undefined;
  const load = useCallback(async () => {
    if (!self) { onChanged?.(); return; }
    const { data } = await listActions(JSON.parse(key) as ActionFilter);
    setOwn(data);
  }, [key, self, onChanged]);
  useEffect(() => { if (self) load(); }, [load, self]);
  const rows = preloaded ?? own;

  return (
    <div className={cn('space-y-2', compact && 'text-xs')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" /> {rows.length === 0 ? 'No actions yet' : `${rows.length} action${rows.length > 1 ? 's' : ''}`}
        </span>
        {rows.map((a) => (
          <Link key={a.id} to={`/response?tab=actions&action=${a.id}`} className={cn('text-xs px-2 py-0.5 rounded-full border hover:underline', statusClass(a.status))}>
            {a.ref}: {STATUS_LABEL[a.status]}
          </Link>
        ))}
        {!open && (
          <Gate min={min} quiet>
            <button type="button" className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline" onClick={() => setOpen(true)}>
              + Propose action
            </button>
          </Gate>
        )}
      </div>
      {open && (
        <ProposeActionForm
          link={link} idPrefix={idPrefix} context={context} defaultTitle={defaultTitle} defaultPriority={defaultPriority} aiSubject={aiSubject}
          onCancel={() => setOpen(false)} onDone={() => { setOpen(false); load(); }}
        />
      )}
    </div>
  );
};
