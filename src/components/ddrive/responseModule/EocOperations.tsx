// Response → EOC operations (ADR-017): status with its Memo 131 trigger and Responsible Official, duty roster by
// the five management functions, and an append-only operations log with shift handovers.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { manila, useOfficialAlerts, alertTitle } from '@/hooks/useOfficialAlerts';
import { useIncidents } from '@/hooks/useDDriveData';
import {
  Duty, EocFunction, EocLevel, EocStatus, FUNCTIONS, LEVELS, LOG_TYPES, LogEntry, LogType, TRIGGER_LABEL, addDuty, addLog, announceEocChange,
  deleteDuty, listDuty, listLog, listStatus, onDutyAt, setDutyStatus, setStatus, triggersFor,
} from '@/lib/eoc';
import { Field, card, input, primary, secondary } from '../rapidMappingModule/ui';

const LevelBadge: React.FC<{ level: EocLevel; big?: boolean }> = ({ level, big }) => (
  <span className={cn('inline-block rounded-lg border font-bold tracking-wide', LEVELS[level].badge, big ? 'px-3 py-1 text-lg' : 'px-2 py-0.5 text-xs')}>{LEVELS[level].label}</span>
);
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const ChangeStatus: React.FC<{ current: EocStatus | null; onDone: () => void }> = ({ current, onDone }) => {
  const { inArea } = useOfficialAlerts();
  const incidents = useIncidents();
  const from = current?.level ?? null;
  const [level, setLevel] = useState<EocLevel>(from === 'red' ? 'blue' : from === 'blue' ? 'red' : from === 'white' ? 'blue' : 'white');
  const options = useMemo(() => triggersFor(from, level), [from, level]);
  const [trigger, setTrigger] = useState('');
  const [basis, setBasis] = useState('');
  const [ro, setRo] = useState(current?.directed_by ?? '');
  const [alertId, setAlertId] = useState('');
  const [incidentId, setIncidentId] = useState('');
  useEffect(() => { if (!(trigger in options)) setTrigger(Object.keys(options)[0] ?? ''); }, [options, trigger]);
  const open = incidents.data.filter((i) => i.status !== 'Completed');
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await setStatus(level, trigger, basis, ro, alertId || null, incidentId || null);
      if (error) toast.error(error); else { toast.success(`EOC status recorded: ${LEVELS[level].label}.`); setBasis(''); announceEocChange(); onDone(); }
    }}>
      <Field id="eoc-level" label="New status">
        <select id="eoc-level" className={input} value={level} onChange={(e) => setLevel(e.target.value as EocLevel)}>
          {(['white', 'blue', 'red'] as EocLevel[]).filter((l) => l !== from).map((l) => <option key={l} value={l}>{LEVELS[l].label}: {LEVELS[l].name}</option>)}
        </select>
      </Field>
      <Field id="eoc-trigger" label="Trigger (NDRRMC Memo 131)">
        <select id="eoc-trigger" className={input} value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2"><Field id="eoc-basis" label="Basis: what is happening and on which information (for example the PAGASA bulletin, the PDRA result)">
        <textarea id="eoc-basis" required minLength={10} rows={2} className={input} value={basis} onChange={(e) => setBasis(e.target.value)} />
      </Field></div>
      <Field id="eoc-ro" label="Directed by (Responsible Official)">
        <input id="eoc-ro" required minLength={3} className={input} placeholder="For example: Mayor, as LDRRMC Chairperson" value={ro} onChange={(e) => setRo(e.target.value)} />
      </Field>
      <Field id="eoc-alert" label="Official alert (optional)">
        <select id="eoc-alert" className={input} value={alertId} onChange={(e) => setAlertId(e.target.value)}>
          <option value="">None</option>{inArea.map((a) => <option key={a.id} value={a.id}>{a.source}: {alertTitle(a)}</option>)}
        </select>
      </Field>
      <Field id="eoc-incident" label="Incident (optional)">
        <select id="eoc-incident" className={input} value={incidentId} onChange={(e) => setIncidentId(e.target.value)}>
          <option value="">None</option>{open.map((i) => <option key={i.id} value={i.id}>{i.ref} {i.title}</option>)}
        </select>
      </Field>
      <p className="sm:col-span-2 text-xs text-slate-600 dark:text-slate-300">{LEVELS[level].meaning} The change is recorded with your name and time and cannot be edited later.</p>
      <div className="sm:col-span-2"><button type="submit" className={primary} disabled={!trigger}>Record status change</button></div>
    </form>
  );
};

const Roster: React.FC<{ roster: Duty[]; level: EocLevel | null; onChanged: () => void }> = ({ roster, level, onChanged }) => {
  const { can } = useAuth();
  const now = new Date();
  const onNow = onDutyAt(roster, now);
  const uncovered = (Object.keys(FUNCTIONS) as EocFunction[]).filter((f) => !onNow.some((d) => d.function === f));
  const [f, setF] = useState({ function: 'operations' as EocFunction, position: '', person_name: '', contact: '', start: toLocalInput(now), hours: '12' });
  return (
    <section className={card} aria-labelledby="eoc-roster">
      <h3 id="eoc-roster" className="font-semibold">Duty roster</h3>
      <p className="text-xs text-slate-600 dark:text-slate-300">By the five management functions of NDRRMC Memo 131 (9.3.1). Tours of duty follow the contingency plan, PSCP or EOC manual (9.3.3).</p>
      {level && level !== 'white' && uncovered.length > 0 && (
        <p role="status" className="text-xs mt-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2">
          No one on duty now for: <strong>{uncovered.map((u) => FUNCTIONS[u].label).join(', ')}</strong>.
        </p>
      )}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-500"><th className="py-1 pr-2">Function</th><th className="pr-2">Person</th><th className="pr-2">Tour of duty (Manila)</th><th className="pr-2">Status</th><th /></tr></thead>
          <tbody>
            {roster.length === 0 && <tr><td colSpan={5} className="py-2 text-slate-500">No one on the roster from now on.</td></tr>}
            {roster.map((d) => {
              const now_ = onNow.includes(d);
              return (
                <tr key={d.id} className={cn('border-t border-slate-100 dark:border-slate-800', now_ && 'bg-blue-50/60 dark:bg-blue-900/10')}>
                  <td className="py-1.5 pr-2 font-semibold">{FUNCTIONS[d.function].label}{d.position ? <span className="block font-normal text-slate-500">{d.position}</span> : null}</td>
                  <td className="pr-2">{d.person_name}{d.contact ? <span className="block text-slate-500">{d.contact}</span> : null}</td>
                  <td className="pr-2">{manila(d.shift_start)} – {manila(d.shift_end)}{now_ ? <span className="block font-semibold text-blue-800 dark:text-blue-200">on duty now</span> : null}</td>
                  <td className="pr-2">{{ scheduled: 'Scheduled', on_duty: 'Started', completed: 'Completed', cancelled: 'Cancelled' }[d.status]}</td>
                  <td className="whitespace-nowrap">
                    {can('responder') && d.status === 'scheduled' && <button type="button" className="underline mr-2" onClick={async () => { const { error } = await setDutyStatus(d.id, 'on_duty'); if (error) toast.error(error); else onChanged(); }}>Start<span className="sr-only"> tour of {d.person_name}</span></button>}
                    {can('responder') && d.status === 'on_duty' && <button type="button" className="underline mr-2" onClick={async () => { const { error } = await setDutyStatus(d.id, 'completed'); if (error) toast.error(error); else onChanged(); }}>Complete<span className="sr-only"> tour of {d.person_name}</span></button>}
                    {can('analyst') && d.status === 'scheduled' && <button type="button" className="underline text-red-800" onClick={async () => { const { error } = await deleteDuty(d.id); if (error) toast.error(error); else onChanged(); }}>Remove<span className="sr-only"> {d.person_name}</span></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {can('analyst') && (
        <form className="grid gap-2 sm:grid-cols-6 items-end mt-3 text-xs" onSubmit={async (e) => {
          e.preventDefault();
          const start = new Date(f.start);
          const { error } = await addDuty({ function: f.function, position: f.position || null, person_name: f.person_name, contact: f.contact || null,
            shift_start: start.toISOString(), shift_end: new Date(start.getTime() + Number(f.hours) * 3600e3).toISOString() });
          if (error) toast.error(error); else { toast.success('Added to the roster.'); setF({ ...f, person_name: '', contact: '', position: '' }); onChanged(); }
        }}>
          <Field id="dt-fn" label="Function"><select id="dt-fn" className={input} value={f.function} onChange={(e) => setF({ ...f, function: e.target.value as EocFunction })}>
            {Object.entries(FUNCTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field id="dt-pos" label="Position (optional)"><input id="dt-pos" className={input} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
          <Field id="dt-name" label="Person"><input id="dt-name" required minLength={2} className={input} value={f.person_name} onChange={(e) => setF({ ...f, person_name: e.target.value })} /></Field>
          <Field id="dt-contact" label="Contact (optional)"><input id="dt-contact" className={input} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
          <Field id="dt-start" label="Starts"><input id="dt-start" type="datetime-local" required className={input} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field id="dt-hours" label="Hours"><input id="dt-hours" type="number" min={1} max={24} required className={input} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field>
          <div className="sm:col-span-6"><button type="submit" className={secondary}>Add to roster</button></div>
        </form>
      )}
    </section>
  );
};

const OpsLog: React.FC<{ log: LogEntry[]; onChanged: () => void }> = ({ log, onChanged }) => {
  const { can } = useAuth();
  const [type, setType] = useState<LogType>('situation');
  const [fn, setFn] = useState<EocFunction | ''>('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState<LogType | ''>('');
  const shown = filter ? log.filter((l) => l.entry_type === filter) : log;
  return (
    <section className={card} aria-labelledby="eoc-log">
      <h3 id="eoc-log" className="font-semibold">Operations log</h3>
      <p className="text-xs text-slate-600 dark:text-slate-300">Entries are kept as written, with their author and time: add a new entry to correct one.</p>
      {can('responder') && (
        <form className="grid gap-2 sm:grid-cols-3 items-end mt-2 text-xs" onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await addLog({ entry_type: type, function: fn || null, body, handover_to: type === 'handover' ? to : null });
          if (error) toast.error(error); else { toast.success(type === 'handover' ? 'Handover recorded.' : 'Logged.'); setBody(''); setTo(''); onChanged(); }
        }}>
          <Field id="lg-type" label="Entry"><select id="lg-type" className={input} value={type} onChange={(e) => setType(e.target.value as LogType)}>
            {Object.entries(LOG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field id="lg-fn" label="Function (optional)"><select id="lg-fn" className={input} value={fn} onChange={(e) => setFn(e.target.value as EocFunction | '')}>
            <option value="">—</option>{Object.entries(FUNCTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          {type === 'handover' ? <Field id="lg-to" label="Handed over to"><input id="lg-to" required minLength={2} className={input} value={to} onChange={(e) => setTo(e.target.value)} /></Field> : <div />}
          <div className="sm:col-span-3"><Field id="lg-body" label={type === 'handover' ? 'Handover: status, open tasks, pending requests, next reports due' : 'What happened or was decided'}>
            <textarea id="lg-body" required minLength={type === 'handover' ? 20 : 3} rows={2} className={input} value={body} onChange={(e) => setBody(e.target.value)} /></Field></div>
          <div><button type="submit" className={secondary}>Add to log</button></div>
        </form>
      )}
      <div className="flex flex-wrap gap-1 mt-3 text-xs" role="group" aria-label="Filter the log">
        {([['', 'All'], ...Object.entries(LOG_TYPES)] as [LogType | '', string][]).map(([k, v]) => (
          <button key={k || 'all'} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
            className={cn('px-2 py-1 rounded-lg border', filter === k ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300')}>{v}</button>
        ))}
      </div>
      <ol className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        {shown.length === 0 && <li className="py-2 text-xs text-slate-500">No entries.</li>}
        {shown.map((l) => (
          <li key={l.id} className="py-2 text-sm">
            <p className="text-xs text-slate-500">{l.ref} · {manila(l.created_at)} · {LOG_TYPES[l.entry_type]}{l.function ? ` · ${FUNCTIONS[l.function].label}` : ''}{l.handover_to ? ` · to ${l.handover_to}` : ''}</p>
            <p className="whitespace-pre-wrap">{l.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

const EocOperations: React.FC = () => {
  const { can } = useAuth();
  const [history, setHistory] = useState<EocStatus[]>([]);
  const [roster, setRoster] = useState<Duty[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const load = useCallback(async () => {
    const [s, d, l] = await Promise.all([listStatus(), listDuty(new Date(Date.now() - 12 * 3600e3).toISOString()), listLog()]);
    setHistory(s.data); setRoster(d.data); setLog(l.data); setError(s.error ?? d.error ?? l.error);
  }, []);
  useEffect(() => { load(); }, [load]);
  const current = history[0] ?? null;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-red-800">EOC records could not be loaded: {error}</p>}
      <section className={card} aria-labelledby="eoc-status">
        <h3 id="eoc-status" className="font-semibold">EOC alert status</h3>
        {current ? (
          <div className="mt-2 flex flex-wrap gap-4 items-start">
            <LevelBadge level={current.level} big />
            <div className="flex-1 min-w-[16rem] text-sm space-y-1">
              <p><strong>{LEVELS[current.level].name}.</strong> {LEVELS[current.level].meaning}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {current.ref} · since {manila(current.effective_at)} · {TRIGGER_LABEL[current.trigger]} · directed by {current.directed_by}
              </p>
              <p className="text-xs"><span className="text-slate-500">Basis: </span>{current.basis}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm mt-1">No EOC status recorded yet. {can('drrm_officer') ? 'Record the current status to start the log.' : 'A DRRM officer records it.'}</p>
        )}
        {can('drrm_officer') && !changing && <button type="button" className={cn(secondary, 'mt-3')} onClick={() => setChanging(true)}>{current ? 'Change status' : 'Record current status'}</button>}
        {changing && <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3"><ChangeStatus current={current} onDone={() => { setChanging(false); load(); }} />
          <button type="button" className="text-xs underline mt-2" onClick={() => setChanging(false)}>Cancel</button></div>}
        {history.length > 1 && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-semibold">History ({history.length})</summary>
            <ol className="mt-1 space-y-1">{history.map((h) => (
              <li key={h.id}><LevelBadge level={h.level} /> {h.ref} · {manila(h.effective_at)} · {TRIGGER_LABEL[h.trigger]} · {h.directed_by} — {h.basis}</li>
            ))}</ol>
          </details>
        )}
        <p className="text-xs text-slate-500 mt-3">Alert status as defined in the harmonised disaster response reporting SOP (DILG Region VIII); triggers from NDRRMC Memorandum No. 131 s. 2018. The official texts govern. The EOC and the Incident Command Post are not co-located (9.2.5.3).</p>
      </section>
      <Roster roster={roster} level={current?.level ?? null} onChanged={load} />
      <OpsLog log={log} onChanged={load} />
    </div>
  );
};

export default EocOperations;
