// Areas of interest: create, correct (draft only), submit, approve or return, reopen, retire; with history.
import React, { useEffect, useState } from 'react';
import { History, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { aoiStep, createAoi, loadAoiHistory, updateAoi } from '@/lib/rapidMapping/api';
import { bboxPolygon, checkFeatureCollection, inspectGeometry, toMultiPolygon } from '@/lib/rapidMapping/geometry';
import { AOI_STATUS_LABEL, AOI_TYPE_LABEL, Activation, Aoi, AoiType, AoiVersion, Geometry } from '@/lib/rapidMapping/types';
import MapPreview from './MapPreview';
import { Field, Gate, NoteAction, card, input, primary, secondary, useSubmit, when } from './ui';

/** Reads a boundary from GeoJSON text (a Polygon/MultiPolygon geometry, Feature or one-feature collection). */
function boundaryFromText(text: string): { geometry: Geometry | null; problem: string | null } {
  if (!text.trim()) return { geometry: null, problem: 'Paste or upload a GeoJSON polygon.' };
  let doc: unknown;
  try { doc = JSON.parse(text); } catch (e) { return { geometry: null, problem: `Not valid JSON: ${(e as Error).message}` }; }
  const r = checkFeatureCollection(doc);
  if (r.problems.length) return { geometry: null, problem: r.problems[0].message };
  const polys = r.features.filter((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
  if (polys.length !== 1) return { geometry: null, problem: `Expected exactly one polygon; found ${polys.length}. Dissolve the boundary into one shape first.` };
  return { geometry: toMultiPolygon(polys[0].geometry), problem: null };
}

const BoundaryInput: React.FC<{ idPrefix: string; onChange: (g: Geometry | null, problem: string | null) => void }> = ({ idPrefix, onChange }) => {
  const [mode, setMode] = useState<'geojson' | 'bbox'>('geojson');
  const [text, setText] = useState('');
  const [b, setB] = useState({ minLon: '', minLat: '', maxLon: '', maxLat: '' });

  useEffect(() => {
    if (mode === 'geojson') {
      const r = boundaryFromText(text);
      onChange(r.geometry, text.trim() ? r.problem : null);
    } else {
      const n = [b.minLon, b.minLat, b.maxLon, b.maxLat].map(Number);
      if ([b.minLon, b.minLat, b.maxLon, b.maxLat].some((v) => v.trim() === '') || n.some((v) => !Number.isFinite(v))) { onChange(null, null); return; }
      if (n[0] >= n[2] || n[1] >= n[3]) { onChange(null, 'The west edge must be less than the east edge, and the south edge less than the north edge.'); return; }
      const g = bboxPolygon(n[0], n[1], n[2], n[3]);
      onChange(g, inspectGeometry(g).problem);
    }
  }, [mode, text, b, onChange]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Boundary</legend>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="radio" name={`${idPrefix}-mode`} checked={mode === 'geojson'} onChange={() => setMode('geojson')} /> GeoJSON polygon</label>
        <label className="flex items-center gap-1"><input type="radio" name={`${idPrefix}-mode`} checked={mode === 'bbox'} onChange={() => setMode('bbox')} /> Bounding box</label>
      </div>
      {mode === 'geojson' ? (
        <>
          <input type="file" accept=".geojson,.json,application/geo+json,application/json" aria-label="Upload a GeoJSON boundary"
                 className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
          <Field id={`${idPrefix}-geo`} label="or paste GeoJSON" hint="EPSG:4326 (longitude, latitude). Export from QGIS or draw at geojson.io, then paste here. Barangay boundaries from PSA or your CLUP can be used.">
            <textarea id={`${idPrefix}-geo`} rows={4} className={cn(input, 'font-mono text-xs')} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {([['minLon', 'West (min longitude)'], ['maxLon', 'East (max longitude)'], ['minLat', 'South (min latitude)'], ['maxLat', 'North (max latitude)']] as const).map(([k, l]) => (
            <Field key={k} id={`${idPrefix}-${k}`} label={l}>
              <input id={`${idPrefix}-${k}`} inputMode="decimal" className={input} value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      )}
    </fieldset>
  );
};

const NewAoiForm: React.FC<{ activation: Activation; onDone: () => void; onCancel: () => void }> = ({ activation, onDone, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AoiType>('barangay');
  const [psgc, setPsgc] = useState('');
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const onBoundary = React.useCallback((g: Geometry | null, p: string | null) => { setGeometry(g); setProblem(p); }, []);
  const { busy, run } = useSubmit(onDone);
  return (
    <form className={cn(card, 'space-y-3')} onSubmit={(e) => {
      e.preventDefault();
      if (!geometry) return;
      run(() => createAoi({ activation_id: activation.id, name, aoi_type: type, psgc_code: psgc || null, geometry, change_reason: 'Initial boundary' }),
          'Area of interest saved as a draft. Submit it for approval when the boundary is right.');
    }}>
      <h3 className="font-semibold">New area of interest</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="aoi-name" label="Name"><input id="aoi-name" required minLength={2} className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field id="aoi-type" label="Type">
          <select id="aoi-type" className={input} value={type} onChange={(e) => setType(e.target.value as AoiType)}>
            {Object.entries(AOI_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field id="aoi-psgc" label="PSGC code (optional)" hint="10 digits, from the PSA.">
          <input id="aoi-psgc" inputMode="numeric" pattern="[0-9]{10}" className={input} value={psgc} onChange={(e) => setPsgc(e.target.value)} />
        </Field>
      </div>
      <BoundaryInput idPrefix="aoi-new" onChange={onBoundary} />
      {problem && <p role="alert" className="text-sm text-red-800 dark:text-red-300">{problem}</p>}
      {geometry && !problem && <MapPreview title="Boundary preview" aoi={{ name: name || 'New area', geometry }} layers={[]} />}
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={busy || !geometry || Boolean(problem)}>Save draft</button>
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

const AoiCard: React.FC<{ aoi: Aoi; closed: boolean; onChanged: () => void }> = ({ aoi, closed, onChanged }) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<AoiVersion[] | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const onBoundary = React.useCallback((g: Geometry | null, p: string | null) => { setGeometry(g); setProblem(p); }, []);
  const { busy, run } = useSubmit(() => { setEditing(false); onChanged(); });
  const drewIt = user?.id && aoi.geometry_by === user.id;

  return (
    <article className={card} aria-labelledby={`aoi-${aoi.id}`}>
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h4 id={`aoi-${aoi.id}`} className="font-semibold">{aoi.name}</h4>
          <p className="text-xs text-slate-500">{AOI_TYPE_LABEL[aoi.aoi_type]}{aoi.psgc_code ? ` · PSGC ${aoi.psgc_code}` : ''} · boundary v{aoi.current_version}</p>
        </div>
        <p className="text-sm font-semibold">{AOI_STATUS_LABEL[aoi.status]}{aoi.approved_at ? ` · ${when(aoi.approved_at)}` : ''}</p>
      </div>
      {aoi.return_note && aoi.status === 'draft' && <p className="mt-2 text-sm rounded-lg bg-amber-50 text-amber-950 px-3 py-2">Returned: {aoi.return_note}</p>}
      <div className="mt-3"><MapPreview title={`Area of interest ${aoi.name}`} aoi={{ name: aoi.name, geometry: aoi.geometry }} layers={[]} /></div>

      {!closed && (
        <div className="mt-3 space-y-2">
          {aoi.status === 'draft' && (
            <Gate min="analyst" quiet>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primary} disabled={busy} onClick={() => run(() => aoiStep(aoi.id, 'submit'), 'Submitted for approval.')}>Submit for approval</button>
                <button type="button" className={secondary} onClick={() => setEditing((v) => !v)}>{editing ? 'Cancel correction' : 'Correct the boundary'}</button>
              </div>
            </Gate>
          )}
          {editing && (
            <form className="space-y-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (geometry) run(() => updateAoi(aoi.id, { geometry, change_reason: reason }), 'Boundary corrected. The previous one is kept in the history.'); }}>
              <BoundaryInput idPrefix={`aoi-${aoi.id}`} onChange={onBoundary} />
              {problem && <p role="alert" className="text-sm text-red-800">{problem}</p>}
              <Field id={`aoi-${aoi.id}-why`} label="Why the boundary changed"><input id={`aoi-${aoi.id}-why`} required minLength={3} className={input} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <button type="submit" className={primary} disabled={busy || !geometry || Boolean(problem)}>Save new boundary</button>
            </form>
          )}
          {aoi.status === 'submitted' && (
            <Gate min="drrm_officer">
              {drewIt ? <p className="text-sm text-slate-600">You drew this boundary, so another DRRM officer must approve it.</p> : (
                <div className="space-y-2">
                  <button type="button" className={primary} disabled={busy} onClick={() => run(() => aoiStep(aoi.id, 'approve'), 'Approved. Field teams can now see this area.')}>Approve</button>
                  <NoteAction id={`aoi-${aoi.id}-ret`} label="Or return it with what needs to change" button="Return" minLength={10}
                              onSubmit={(n) => run(() => aoiStep(aoi.id, 'return', n), 'Returned to the author.')} />
                </div>
              )}
            </Gate>
          )}
          {aoi.status === 'approved' && (
            <Gate min="analyst" quiet>
              <NoteAction id={`aoi-${aoi.id}-reopen`} label="Reopen to change the approved boundary (reason)" button="Reopen" minLength={10}
                          onSubmit={(n) => run(() => aoiStep(aoi.id, 'reopen', n), 'Reopened as a draft. Products keep the boundary version they were made on.')} />
            </Gate>
          )}
          {aoi.status !== 'retired' && (
            <Gate min="drrm_officer" quiet>
              <button type="button" className={secondary} disabled={busy} onClick={() => run(() => aoiStep(aoi.id, 'retire'), 'Retired.')}>Retire</button>
            </Gate>
          )}
        </div>
      )}

      <Gate min="analyst" quiet>
        <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm underline" onClick={async () => setHistory((await loadAoiHistory(aoi.id)).data)}>
          <History className="w-4 h-4" aria-hidden="true" /> Boundary history
        </button>
        {history && (
          <ol className="mt-2 text-xs space-y-1">
            {history.map((h) => <li key={h.id}>v{h.version_no} · {when(h.created_at)} · {h.change_reason ?? '—'}</li>)}
          </ol>
        )}
      </Gate>
    </article>
  );
};

const AoiPanel: React.FC<{ activation: Activation; aois: Aoi[]; onChanged: () => void }> = ({ activation, aois, onChanged }) => {
  const [creating, setCreating] = useState(false);
  const closed = ['closed', 'cancelled'].includes(activation.status);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">Where the mapping is focused. Field teams see an area once it is approved.</p>
        {!closed && <Gate min="analyst" quiet><button type="button" className={primary} onClick={() => setCreating(true)}><Plus className="w-4 h-4" aria-hidden="true" /> Add area</button></Gate>}
      </div>
      {creating && <NewAoiForm activation={activation} onCancel={() => setCreating(false)} onDone={() => { setCreating(false); onChanged(); }} />}
      {aois.length === 0 && !creating && <p className="text-sm text-slate-500">No areas of interest yet{closed ? '.' : '. An analyst adds the first one.'}</p>}
      {aois.map((a) => <AoiCard key={`${a.id}-${a.updated_at}`} aoi={a} closed={closed} onChanged={onChanged} />)}
    </div>
  );
};

export default AoiPanel;
