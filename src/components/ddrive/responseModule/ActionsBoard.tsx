import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  AREA_LABEL, ActionOrigin, ORIGIN_LABEL, PRIORITY_LABEL, ResponseAction, STATUS_LABEL, STRATEGY_SHORT, cancelAction, completeAction,
  decideAction, listActions, reassignAction, reportProgress, sourceText,
} from '@/lib/responseActions';
import { Field, Gate, NoteAction, card, input, secondary, useSubmit } from '../rapidMappingModule/ui';
import { ProposeActionForm } from './ProposeAction';

const peso = (n: number | null) => (n == null ? null : n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }));
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

const ProgressForm: React.FC<{ a: ResponseAction; onDone: () => void }> = ({ a, onDone }) => {
  const [pct, setPct] = useState(String(Math.min(99, Math.max(a.progress, 10))));
  const [update, setUpdate] = useState('');
  const { busy, run } = useSubmit(() => { setUpdate(''); onDone(); });
  return (
    <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); run(() => reportProgress(a.id, Number(pct), update), 'Progress recorded.'); }}>
      <Field id={`p-${a.id}`} label="Progress (%)"><input id={`p-${a.id}`} type="number" min={a.progress} max={99} required className={cn(input, 'w-24')} value={pct} onChange={(e) => setPct(e.target.value)} /></Field>
      <div className="flex-1 min-w-[12rem]"><Field id={`u-${a.id}`} label="What was done"><input id={`u-${a.id}`} required minLength={5} className={input} value={update} onChange={(e) => setUpdate(e.target.value)} /></Field></div>
      <button type="submit" disabled={busy} className={secondary}>Record progress</button>
    </form>
  );
};

const Reassign: React.FC<{ a: ResponseAction; onDone: () => void }> = ({ a, onDone }) => {
  const [owner, setOwner] = useState(a.owner_office ?? '');
  const [due, setDue] = useState(a.due_on ?? '');
  const { busy, run } = useSubmit(onDone);
  return (
    <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); run(() => reassignAction(a.id, owner || null, due || null), 'Reassigned.'); }}>
      <div className="flex-1 min-w-[10rem]"><Field id={`o-${a.id}`} label="Responsible office"><input id={`o-${a.id}`} className={input} value={owner} onChange={(e) => setOwner(e.target.value)} /></Field></div>
      <Field id={`d-${a.id}`} label="Due"><input id={`d-${a.id}`} type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <button type="submit" disabled={busy} className={secondary}>Save</button>
    </form>
  );
};

const ActionCard: React.FC<{ a: ResponseAction; highlighted: boolean; onChanged: () => void }> = ({ a, highlighted, onChanged }) => {
  const { can } = useAuth();
  const step = async (fn: () => Promise<{ error: string | null }>, ok: string) => {
    const { error } = await fn();
    if (error) { toast.error(error); return false; }
    toast.success(ok); onChanged(); return true;
  };
  const open = ['proposed', 'approved', 'in_progress'].includes(a.status);
  const overdue = a.due_on && open && a.status !== 'proposed' && new Date(`${a.due_on}T23:59:59+08:00`) < new Date();
  return (
    <li id={`action-${a.id}`} className={cn(card, 'space-y-3', highlighted && 'ring-2 ring-blue-600')}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-[14rem]">
          <p className="text-xs text-slate-500">{a.ref} · {ORIGIN_LABEL[a.origin]} · {PRIORITY_LABEL[a.priority]} priority</p>
          <h3 className="font-semibold">{a.title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">Responds to: {sourceText(a)}</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full border border-slate-300">{STATUS_LABEL[a.status]}{a.status === 'in_progress' ? `, ${a.progress}%` : ''}</span>
      </div>
      {a.description && <p className="text-sm text-slate-700 dark:text-slate-300">{a.description}</p>}
      <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        <div><dt className="inline text-slate-500">Treatment: </dt><dd className="inline">{STRATEGY_SHORT[a.strategy]}</dd></div>
        <div><dt className="inline text-slate-500">Thematic area: </dt><dd className="inline">{AREA_LABEL[a.drrm_area]}</dd></div>
        <div><dt className="inline text-slate-500">Responsible: </dt><dd className="inline">{a.owner_office ?? 'not assigned'}</dd></div>
        <div><dt className="inline text-slate-500">Due: </dt><dd className={cn('inline', overdue && 'font-semibold text-amber-800 dark:text-amber-300')}>{a.due_on ?? 'not set'}{overdue ? ' (overdue)' : ''}</dd></div>
        {a.cost_php != null && <div><dt className="inline text-slate-500">Estimated cost: </dt><dd className="inline">{peso(a.cost_php)}</dd></div>}
      </dl>
      {(a.status === 'in_progress' || a.status === 'approved') && (
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="img" aria-label={`${a.progress}% done`}>
          <div className="h-full bg-blue-700" style={{ width: `${a.progress}%` }} />
        </div>
      )}
      {a.last_update && <p className="text-xs"><span className="text-slate-500">Latest update: </span>{a.last_update}</p>}
      {a.decision_note && <p className="text-xs"><span className="text-slate-500">{a.status === 'cancelled' ? 'Cancelled because: ' : 'Decision note: '}</span>{a.decision_note}</p>}
      {a.outcome && <p className="text-xs"><span className="text-slate-500">Outcome: </span>{a.outcome}</p>}

      {a.status === 'proposed' && (
        <Gate min="drrm_officer">
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
            <NoteAction id={`ap-${a.id}`} label="Decision note (optional when approving)" button="Approve" tone="primary"
              onSubmit={(note) => step(() => decideAction(a.id, true, note), 'Approved.')} />
            <NoteAction id={`de-${a.id}`} label="Reason for declining" button="Decline" minLength={10} tone="danger"
              onSubmit={(note) => step(() => decideAction(a.id, false, note), 'Declined.')} />
          </div>
        </Gate>
      )}
      {(a.status === 'approved' || a.status === 'in_progress') && (
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
          <Gate min="responder"><ProgressForm a={a} onDone={onChanged} /></Gate>
          <Gate min="responder" quiet>
            <NoteAction id={`co-${a.id}`} label="Outcome: what was done and what it changed" button="Mark done" minLength={10} tone="primary"
              onSubmit={(note) => step(() => completeAction(a.id, note), 'Marked done.')} />
          </Gate>
          {can('drrm_officer') && <Reassign a={a} onDone={onChanged} />}
        </div>
      )}
      {open && can('drrm_officer') && (
        <NoteAction id={`ca-${a.id}`} label="Reason for cancelling" button="Cancel action" minLength={10} tone="danger"
          onSubmit={(note) => step(() => cancelAction(a.id, note), 'Cancelled.')} />
      )}
    </li>
  );
};

type View = 'open' | 'proposed' | 'closed' | 'all';

/** Response: the risk-informed actions proposed in Diagnosis and Detection, decided and coordinated here. */
const ActionsBoard: React.FC = () => {
  const [params] = useSearchParams();
  const focus = params.get('action');
  const [rows, setRows] = useState<ResponseAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(focus ? 'all' : 'open');
  const [origin, setOrigin] = useState<ActionOrigin | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await listActions();
    if (error) toast.error(error);
    setRows(data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (focus && !loading) document.getElementById(`action-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus, loading]);

  const counts = useMemo(() => ({
    proposed: rows.filter((r) => r.status === 'proposed').length,
    open: rows.filter((r) => ['approved', 'in_progress'].includes(r.status)).length,
    closed: rows.filter((r) => ['done', 'declined', 'cancelled'].includes(r.status)).length,
  }), [rows]);
  const shown = rows
    .filter((r) => view === 'all' || (view === 'proposed' ? r.status === 'proposed' : view === 'open' ? ['approved', 'in_progress', 'proposed'].includes(r.status) : ['done', 'declined', 'cancelled'].includes(r.status)))
    .filter((r) => origin === 'all' || r.origin === origin)
    .sort((x, y) => PRIORITY_ORDER[x.priority] - PRIORITY_ORDER[y.priority] || (x.due_on ?? '9999').localeCompare(y.due_on ?? '9999'));

  return (
    <div className="space-y-4">
      <div className={cn(card, 'flex flex-wrap gap-3 items-start')}>
        <div className="flex-1 min-w-[16rem] text-sm text-slate-700 dark:text-slate-300">
          <p className="font-montserrat font-bold text-lg text-slate-900 dark:text-white">Risk-informed actions</p>
          <p>Actions proposed from Diagnosis (risks and DDRiVE hazard events) and Detection (official alerts and hazard reports). A DRRM officer decides; responders report progress and outcomes.</p>
          <p className="text-xs mt-1">{counts.proposed} awaiting a decision · {counts.open} approved or in progress · {counts.closed} closed</p>
        </div>
        <Gate min="analyst">
          {!adding && <button type="button" className={secondary} onClick={() => setAdding(true)}><Plus className="w-4 h-4" aria-hidden="true" /> New action</button>}
        </Gate>
      </div>
      {adding && (
        <ProposeActionForm idPrefix="new-action" link={{ origin: 'manual' }} defaultArea="response" defaultStrategy="reduce_consequences"
          onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />
      )}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <div role="group" aria-label="Which actions" className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden font-semibold">
          {([['open', 'Open'], ['proposed', `Awaiting decision (${counts.proposed})`], ['closed', 'Closed'], ['all', 'All']] as [View, string][]).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cn('px-3 py-1.5', view === k && 'bg-blue-700 text-white')}>{l}</button>
          ))}
        </div>
        <label className="flex items-center gap-1">From
          <select className={cn(input, 'py-1 w-auto')} value={origin} onChange={(e) => setOrigin(e.target.value as ActionOrigin | 'all')}>
            <option value="all">anywhere</option><option value="diagnosis">Diagnosis</option><option value="detection">Detection</option><option value="manual">Response</option>
          </select>
        </label>
      </div>
      {loading && <p role="status" className="text-sm text-slate-500">Loading actions…</p>}
      {!loading && shown.length === 0 && (
        <p className="text-sm text-slate-500">No actions here. Propose them from a risk or a scored hazard event in Diagnosis, or from an alert in Detection.</p>
      )}
      <ul className="grid gap-4 xl:grid-cols-2">
        {shown.map((a) => <ActionCard key={a.id} a={a} highlighted={a.id === focus} onChanged={load} />)}
      </ul>
    </div>
  );
};

export default ActionsBoard;
