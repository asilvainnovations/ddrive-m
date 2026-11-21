// Field observations: responders send them (queued on the device when offline); analysts triage and verify them.
import React, { useCallback, useEffect, useState } from 'react';
import { CloudOff, LocateFixed, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { NewObservation, sendObservation, triageObservation } from '@/lib/rapidMapping/api';
import { discard, enqueue, flush, isConnectionError, newClientKey, readQueue, retry, QueuedObservation } from '@/lib/rapidMapping/offlineQueue';
import { inspectGeometry } from '@/lib/rapidMapping/geometry';
import {
  ACCESS_LABEL, AccessStatus, Activation, Aoi, CONFIDENCE_LABEL, Confidence, ConditionCode, Observation, OBSERVATION_STATUS_LABEL,
  OBSERVATION_TYPE_LABEL, ObservationType,
} from '@/lib/rapidMapping/types';
import { Field, Gate, NoteAction, card, input, primary, secondary, toLocalInput, fromLocalInput, useSubmit, when } from './ui';

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/** The device's queue for this organisation, flushed automatically when the connection returns. */
export function useObservationQueue(onSent: () => void) {
  const tenant = useAuth().activeTenant?.tenant_id ?? '';
  const online = useOnline();
  const [queue, setQueue] = useState<QueuedObservation[]>(() => (tenant ? readQueue(tenant) : []));
  const [syncing, setSyncing] = useState(false);
  const reload = useCallback(() => setQueue(tenant ? readQueue(tenant) : []), [tenant]);

  const sync = useCallback(async () => {
    if (!tenant || syncing) return;
    setSyncing(true);
    const r = await flush(tenant, sendObservation);
    setSyncing(false);
    reload();
    if (r.sent) { toast.success(`${r.sent} saved observation${r.sent > 1 ? 's' : ''} sent.`); onSent(); }
    if (r.failed) toast.error(`${r.failed} observation${r.failed > 1 ? 's were' : ' was'} refused. Open the list to see why.`);
  }, [tenant, syncing, reload, onSent]);

  useEffect(reload, [reload]);
  useEffect(() => { if (online && readQueue(tenant).some((x) => x.state === 'pending')) sync(); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  return { tenant, online, queue, syncing, sync, reload };
}

const ObservationForm: React.FC<{ activation: Activation; aois: Aoi[]; codes: ConditionCode[]; onDone: () => void; q: ReturnType<typeof useObservationQueue> }> = ({ activation, aois, codes, onDone, q }) => {
  const [type, setType] = useState<ObservationType>('flood_extent');
  const [access, setAccess] = useState<AccessStatus | ''>('');
  const [description, setDescription] = useState('');
  const [observed, setObserved] = useState(toLocalInput(new Date()));
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [aoiId, setAoiId] = useState('');
  const [condition, setCondition] = useState('not_assessed');
  const [confidence, setConfidence] = useState<Confidence>('moderate');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const approved = aois.filter((a) => a.status === 'approved');

  const locate = () => {
    if (!('geolocation' in navigator)) { toast.error('This device cannot share its location. Enter the coordinates instead.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLon(p.coords.longitude.toFixed(6)); setAccuracy(Math.round(p.coords.accuracy)); },
      (e) => toast.error(e.code === 1 ? 'Location permission was refused. Enter the coordinates instead.' : 'The location could not be found. Try outdoors, or enter the coordinates.'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  const geometry = { type: 'Point' as const, coordinates: [Number(lon), Number(lat)] as [number, number] };
  const geomProblem = lat && lon ? inspectGeometry(geometry).problem : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (geomProblem || !lat || !lon) return;
    const o: NewObservation = {
      client_key: newClientKey(), activation_id: activation.id, aoi_id: aoiId || null, observed_at: fromLocalInput(observed),
      observation_type: type, access_status: type === 'road_access' && access ? access : null, description: description.trim(),
      geometry, condition_code: condition || null, confidence, evidence_ref: evidence.trim() || null,
    };
    setBusy(true);
    let saved = false;
    if (q.online) {
      const { error } = await sendObservation(o);
      if (!error) { toast.success('Observation sent. An analyst will triage it.'); saved = true; onDone(); }
      else if (isConnectionError(error)) { enqueue(q.tenant, o); q.reload(); toast.message('No connection: saved on this device. It will be sent when you are back online.'); saved = true; }
      else toast.error(error);
    } else {
      try { enqueue(q.tenant, o); q.reload(); toast.message('Saved on this device. It will be sent when you are back online.'); saved = true; }
      catch (err) { toast.error((err as Error).message); }
    }
    setBusy(false);
    if (saved) { setDescription(''); setEvidence(''); setObserved(toLocalInput(new Date())); }
  };

  return (
    <form className={cn(card, 'space-y-3')} onSubmit={submit}>
      <h3 className="font-semibold">Send a field observation</h3>
      <p className="text-xs text-slate-600 dark:text-slate-300">Describe what you see. Do not write names, phone numbers or other personal details of residents.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="ob-type" label="What">
          <select id="ob-type" className={input} value={type} onChange={(e) => setType(e.target.value as ObservationType)}>
            {Object.entries(OBSERVATION_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {type === 'road_access' && (
          <Field id="ob-access" label="Road is">
            <select id="ob-access" className={input} value={access} onChange={(e) => setAccess(e.target.value as AccessStatus)} required>
              <option value="">Choose</option>
              {Object.entries(ACCESS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        )}
        <Field id="ob-when" label="When you saw it"><input id="ob-when" type="datetime-local" required className={input} value={observed} max={toLocalInput(new Date(Date.now() + 60000))} onChange={(e) => setObserved(e.target.value)} /></Field>
      </div>
      <Field id="ob-desc" label="Description"><textarea id="ob-desc" required minLength={3} maxLength={2000} rows={2} className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Location</legend>
        <button type="button" className={secondary} onClick={locate}><LocateFixed className="w-4 h-4" aria-hidden="true" /> Use my location</button>
        <div className="grid grid-cols-2 gap-2">
          <Field id="ob-lat" label="Latitude"><input id="ob-lat" required inputMode="decimal" className={input} value={lat} onChange={(e) => { setLat(e.target.value); setAccuracy(null); }} /></Field>
          <Field id="ob-lon" label="Longitude"><input id="ob-lon" required inputMode="decimal" className={input} value={lon} onChange={(e) => { setLon(e.target.value); setAccuracy(null); }} /></Field>
        </div>
        {accuracy != null && <p className="text-xs text-slate-600">From the device, accurate to about {accuracy} m.</p>}
        {geomProblem && <p role="alert" className="text-sm text-red-800">{geomProblem}</p>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="ob-aoi" label="Area of interest">
          <select id="ob-aoi" className={input} value={aoiId} onChange={(e) => setAoiId(e.target.value)}>
            <option value="">Not sure / none</option>
            {approved.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field id="ob-cond" label="Condition" hint="Only your organisation's approved classes. Unknown is a valid answer.">
          <select id="ob-cond" className={input} value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="not_assessed">Not assessed</option>
            <option value="unknown">Unknown</option>
            {codes.filter((c) => c.active).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>
        <Field id="ob-conf" label="How sure are you">
          <select id="ob-conf" className={input} value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)}>
            {Object.entries(CONFIDENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field id="ob-evidence" label="Photo or report reference (optional)" hint="For example the document reference (D-012) where photos are filed.">
        <input id="ob-evidence" className={input} maxLength={500} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
      </Field>
      <button type="submit" className={primary} disabled={busy || Boolean(geomProblem)}>
        {q.online ? <><Send className="w-4 h-4" aria-hidden="true" /> Send</> : <><CloudOff className="w-4 h-4" aria-hidden="true" /> Save on this device</>}
      </button>
    </form>
  );
};

const QueueList: React.FC<{ q: ReturnType<typeof useObservationQueue> }> = ({ q }) => {
  if (!q.queue.length) return null;
  return (
    <section className={card} aria-labelledby="ob-queue">
      <div className="flex flex-wrap justify-between gap-2 items-center">
        <h3 id="ob-queue" className="font-semibold">Saved on this device ({q.queue.length})</h3>
        <button type="button" className={secondary} disabled={!q.online || q.syncing} onClick={q.sync}>
          <RefreshCw className={cn('w-4 h-4', q.syncing && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" /> {q.online ? 'Send now' : 'Waiting for connection'}
        </button>
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {q.queue.map((x) => (
          <li key={x.item.client_key} className="rounded-lg border p-2">
            <p><span className="font-semibold">{x.state === 'failed' ? 'Refused' : 'Waiting to send'}</span> · {OBSERVATION_TYPE_LABEL[x.item.observation_type]} · {when(x.item.observed_at)}</p>
            <p className="text-xs">{x.item.description}</p>
            {x.lastError && <p className="text-xs text-red-800 dark:text-red-300">{x.lastError}</p>}
            <div className="flex gap-2 mt-1">
              {x.state === 'failed' && <button type="button" className="text-xs underline" onClick={() => { retry(q.tenant, x.item.client_key); q.reload(); }}>Try again</button>}
              <button type="button" className="text-xs underline inline-flex items-center gap-1" onClick={() => { discard(q.tenant, x.item.client_key); q.reload(); }}><Trash2 className="w-3 h-3" aria-hidden="true" /> Discard</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

const ObservationRow: React.FC<{ o: Observation; aois: Aoi[]; codes: ConditionCode[]; onChanged: () => void }> = ({ o, aois, codes, onChanged }) => {
  const { user, can } = useAuth();
  const { busy, run } = useSubmit(onChanged);
  const [lon, lat] = o.geometry.type === 'Point' ? o.geometry.coordinates : [NaN, NaN];
  const code = codes.find((c) => c.code === o.condition_code)?.label ?? (o.condition_code === 'unknown' ? 'Unknown' : o.condition_code === 'not_assessed' ? 'Not assessed' : o.condition_code);
  const mine = user?.id === o.created_by;
  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-semibold">{OBSERVATION_TYPE_LABEL[o.observation_type]}{o.access_status ? ` · ${ACCESS_LABEL[o.access_status]}` : ''}</p>
        <p className="text-xs font-semibold">{OBSERVATION_STATUS_LABEL[o.verification_status]}</p>
      </div>
      <p>{o.description}</p>
      <p className="text-xs text-slate-500">
        Seen {when(o.observed_at)} · received {when(o.submitted_at)} · {Number.isFinite(lat) ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : o.geometry.type}
        {o.aoi_id ? ` · ${aois.find((a) => a.id === o.aoi_id)?.name ?? 'area'}` : ''} · condition {code ?? 'not given'} · confidence {CONFIDENCE_LABEL[o.confidence].toLowerCase()}
        {o.evidence_ref ? ` · evidence ${o.evidence_ref}` : ''}
      </p>
      {o.triage_note && <p className="text-xs mt-1">Note: {o.triage_note}</p>}
      {can('analyst') && ['submitted', 'triaged'].includes(o.verification_status) && (
        <div className="mt-2 flex flex-wrap gap-2 items-end">
          {o.verification_status === 'submitted' && <button type="button" className={secondary} disabled={busy} onClick={() => run(() => triageObservation(o.id, 'triaged', ''), 'Marked as triaged.')}>Mark triaged</button>}
          {mine ? <p className="text-xs text-slate-500">You sent this, so someone else must verify it.</p> : (
            <NoteAction id={`ob-${o.id}-v`} label="How it was verified" button="Field verified" minLength={5} tone="primary"
                        onSubmit={(n) => run(() => triageObservation(o.id, 'field_verified', n), 'Marked field verified.')} />
          )}
          <NoteAction id={`ob-${o.id}-r`} label="Or why it is rejected" button="Reject" minLength={5} tone="danger"
                      onSubmit={(n) => run(() => triageObservation(o.id, 'rejected', n), 'Rejected.')} />
        </div>
      )}
    </li>
  );
};

const ObservationPanel: React.FC<{ activation: Activation; aois: Aoi[]; observations: Observation[]; codes: ConditionCode[]; onChanged: () => void }> = ({ activation, aois, observations, codes, onChanged }) => {
  const { can } = useAuth();
  const q = useObservationQueue(onChanged);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const shown = observations.filter((o) => filter === 'all' || ['submitted', 'triaged'].includes(o.verification_status));
  return (
    <div className="space-y-4">
      {activation.status === 'active' ? (
        <Gate min="responder"><ObservationForm activation={activation} aois={aois} codes={codes} onDone={onChanged} q={q} /></Gate>
      ) : <p className="text-sm text-slate-500">Field observations can be sent only while the activation is active.</p>}
      <QueueList q={q} />
      <section aria-labelledby="ob-list" className="space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 id="ob-list" className="font-semibold">{can('analyst') ? 'Observations' : 'Your observations'} ({observations.length})</h3>
          <label className="text-sm flex items-center gap-2">Show
            <select className={cn(input, 'w-auto')} value={filter} onChange={(e) => setFilter(e.target.value as 'open' | 'all')}>
              <option value="open">Waiting for triage</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
        {shown.length === 0 && <p className="text-sm text-slate-500">None.</p>}
        <ul className="space-y-2">{shown.map((o) => <ObservationRow key={`${o.id}-${o.updated_at}`} o={o} aois={aois} codes={codes} onChanged={onChanged} />)}</ul>
      </section>
    </div>
  );
};

export default ObservationPanel;
