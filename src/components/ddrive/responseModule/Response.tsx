import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '@/components/ui/GlassCard';
import { Shield, CheckCircle2, Clock, Users, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useIncidents } from '@/hooks/useDDriveData';
import { openIncident, setIncidentProgress, type NewIncident } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthContext';
import { needsRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Field, Gate, input, primary, secondary } from '../rapidMappingModule/ui';
import ActionsBoard from './ActionsBoard';
import { LinkedActions } from './ProposeAction';
import { listActions, type ResponseAction } from '@/lib/responseActions';

// Anticipatory action (RA 12287) is part of Response: acting on a forecast before the hazard strikes.
const AnticipatoryAction = lazy(() => import('../anticipatoryModule/AnticipatoryAction'));
const EocOperations = lazy(() => import('./EocOperations'));

type Tab = 'eoc' | 'actions' | 'incidents' | 'anticipatory';
const TABS: { key: Tab; label: string }[] = [
  { key: 'eoc', label: 'EOC operations' },
  { key: 'actions', label: 'Risk-informed actions' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'anticipatory', label: 'Anticipatory action (RA 12287)' },
];

const NewIncidentForm: React.FC<{ onDone: () => void; onCancel: () => void }> = ({ onDone, onCancel }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<NewIncident['priority']>('High');
  const [assignee, setAssignee] = useState('');
  const [eta, setEta] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const { error } = await openIncident({ title, priority, assignee_name: assignee || null, eta: eta || null });
      setBusy(false);
      if (error) toast.error(error);
      else { toast.success('Incident opened.'); onDone(); }
    }}>
      <div className="sm:col-span-2"><Field id="inc-title" label="What is happening"><input id="inc-title" required minLength={3} className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></Field></div>
      <Field id="inc-priority" label="Priority">
        <select id="inc-priority" className={input} value={priority} onChange={(e) => setPriority(e.target.value as NewIncident['priority'])}>
          {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field id="inc-assignee" label="Assigned to (optional)"><input id="inc-assignee" className={input} value={assignee} onChange={(e) => setAssignee(e.target.value)} /></Field>
      <Field id="inc-eta" label="Expected resolution (optional)" hint="For example: 6 hours, or a date."><input id="inc-eta" className={input} value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={busy} className={primary}>Open incident</button>
        <button type="button" onClick={onCancel} className={secondary}>Cancel</button>
      </div>
    </form>
  );
};

const Incidents: React.FC = () => {
  const { data: incidents, refetch } = useIncidents();
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  // Actions serving each incident, in one query.
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const loadActions = useCallback(async () => { setActions((await listActions()).data.filter((a) => a.incident_id)); }, []);
  useEffect(() => { loadActions(); }, [loadActions]);
  const advance = async (id: string, current: number) => {
    const { error } = await setIncidentProgress(id, current + 10);
    if (error) { toast.error(error); return; }
    toast.success('Progress saved');
    refetch();
  };
  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="font-montserrat font-bold text-lg">Incidents</h2>
          <p className="text-xs text-slate-500">{incidents.length} recorded. Rapid Mapping activations and anticipatory action cases can be linked to them.</p>
        </div>
        <Gate min="responder">
          {!adding && <button type="button" onClick={() => setAdding(true)} className={primary}><Plus className="w-4 h-4" aria-hidden="true" /> New incident</button>}
        </Gate>
      </div>
      {adding && <NewIncidentForm onCancel={() => setAdding(false)} onDone={() => { setAdding(false); refetch(); }} />}
      {incidents.length === 0 && <p className="text-sm text-slate-500">No incidents recorded.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {incidents.map((inc) => (
          <div key={inc.id} id={`incident-${inc.id}`} className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-[10px] text-slate-500">{inc.ref}</p>
                <p className="font-montserrat font-bold text-sm">{inc.title}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">{inc.priority.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden="true" /> {inc.assignee_name || 'Not assigned'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" /> {inc.eta ? `ETA ${inc.eta}` : 'No ETA'}</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2" role="img" aria-label={`${inc.progress}% done`}>
              <div className={`h-full rounded-full ${inc.status === 'Completed' ? 'bg-emerald-600' : 'bg-blue-700'}`} style={{ width: `${inc.progress}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                {inc.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <Clock className="w-3 h-3" aria-hidden="true" />}
                {inc.status} · {inc.progress}%
              </span>
              {inc.status !== 'Completed' && (
                <button type="button" onClick={() => advance(inc.id, inc.progress)} disabled={!can('responder')} title={can('responder') ? undefined : needsRole('responder')}
                  className="text-xs text-blue-700 font-semibold hover:underline disabled:opacity-50 disabled:no-underline">Advance +10%</button>
              )}
            </div>
            <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-2">
              <LinkedActions
                filter={{ incidentId: inc.id }} preloaded={actions.filter((a) => a.incident_id === inc.id)} onChanged={loadActions}
                link={{ origin: 'manual', incident_id: inc.id }} min="responder" idPrefix={`inc-${inc.id}`} context={`${inc.ref} ${inc.title}`}
                defaultTitle="" defaultPriority={inc.priority.toLowerCase() as 'critical' | 'high' | 'medium' | 'low'} compact
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Phase 3 · Response: make and coordinate risk-informed operational decisions and actions.
const ResponseModule: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = ((params.get('tab') as Tab) || 'actions');
  const go = (t: Tab) => { const p = new URLSearchParams(); p.set('tab', t); setParams(p); };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Response Module</h1>
            <p className="text-sm text-slate-500 font-poppins">Phase 3 · Risk-informed decisions and actions · Incidents · Anticipatory action</p>
          </div>
        </div>
      </GlassCard>

      <div role="tablist" aria-label="Response sections" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} id={`rs-tab-${t.key}`} aria-controls={`rs-panel-${t.key}`}
            onClick={() => go(t.key)}
            className={cn('px-4 py-2 text-sm font-semibold rounded-t-xl', tab === t.key ? 'bg-white dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 text-blue-800 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300 hover:text-blue-800')}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`rs-panel-${tab}`} aria-labelledby={`rs-tab-${tab}`}>
        {tab === 'eoc' && (
          <Suspense fallback={<p role="status" className="text-sm text-slate-500">Loading…</p>}>
            <EocOperations />
          </Suspense>
        )}
        {tab === 'actions' && <ActionsBoard />}
        {tab === 'incidents' && <Incidents />}
        {tab === 'anticipatory' && (
          <Suspense fallback={<p role="status" className="text-sm text-slate-500">Loading…</p>}>
            <AnticipatoryAction />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default ResponseModule;
