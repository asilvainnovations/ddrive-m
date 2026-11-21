// One mapping product: its versions, metadata, layers (import), map, review and publication, links and exports.
import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileJson, Layers as LayersIcon, Link2, Printer, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import {
  addLink, archiveProduct, deleteLayer, importLayer, layerFromObservations, listLinkTargets, loadFeatures, loadLinks, loadReviews,
  newVersion, publishVersion, reviewVersion, submitVersion, updateProduct, updateVersion, verifyVersion,
} from '@/lib/rapidMapping/api';
import { ImportReport, parseGeoJsonText, checkFeatureCollection, sha256Hex } from '@/lib/rapidMapping/geometry';
import { download, safeFileName, toCsv, toGeoJson, toMetadata } from '@/lib/rapidMapping/exports';
import {
  Activation, Aoi, Audience, AUDIENCE_LABEL, CONFIDENCE_LABEL, Confidence, Layer, LAYER_ROLE_LABEL, LayerRole, LinkModule, Observation,
  Product, ProductLink, ProductVersion, productCode, productTypeMeta, Review, SOURCE_TYPE_LABEL, SourceType, StoredFeature, isPreliminary,
} from '@/lib/rapidMapping/types';
import MapPreview, { LAYER_COLOURS } from './MapPreview';
import { Disclaimer, Field, Gate, NoteAction, StatusBadge, card, danger, input, primary, secondary, toLocalInput, fromLocalInput, useSubmit, when } from './ui';

// ─── Metadata ────────────────────────────────────────────────────────────────
const MetadataForm: React.FC<{ product: Product; version: ProductVersion; aois: Aoi[]; editable: boolean; onSaved: () => void }> = ({ product, version, aois, editable, onSaved }) => {
  const [f, setF] = useState({
    title: product.title, summary: product.summary ?? '', methodology: product.methodology ?? '', limitations: product.limitations ?? '',
    confidence: product.confidence, aoi_id: product.aoi_id ?? '',
    cutoff: version.data_cutoff_at ? toLocalInput(new Date(version.data_cutoff_at)) : '', change: version.change_summary ?? '',
  });
  const { busy, run } = useSubmit(onSaved);
  const ro = !editable;
  const save = () => run(async () => {
    const a = await updateProduct(product.id, {
      title: f.title, summary: f.summary || null, methodology: f.methodology || null, limitations: f.limitations || null,
      confidence: f.confidence as Confidence, aoi_id: f.aoi_id || null,
    });
    if (a.error) return a;
    return updateVersion(version.id, { data_cutoff_at: f.cutoff ? fromLocalInput(f.cutoff) : null, change_summary: f.change || null });
  }, 'Saved.');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pm-title" label="Title"><input id="pm-title" readOnly={ro} required minLength={3} className={input} value={f.title} onChange={set('title')} /></Field>
        <Field id="pm-aoi" label="Area of interest">
          <select id="pm-aoi" disabled={ro} className={input} value={f.aoi_id} onChange={set('aoi_id')}>
            {product.product_type === 'reference' && <option value="">None (whole jurisdiction)</option>}
            {aois.filter((a) => a.status !== 'retired').map((a) => <option key={a.id} value={a.id}>{a.name} ({a.status})</option>)}
          </select>
        </Field>
      </div>
      <Field id="pm-summary" label="Summary" hint="What the product shows, in one or two sentences a duty officer can read in a briefing.">
        <textarea id="pm-summary" readOnly={ro} rows={2} className={input} value={f.summary} onChange={set('summary')} />
      </Field>
      <Field id="pm-method" label="Methodology" hint="Sources combined, how features were drawn or classified, and by whom.">
        <textarea id="pm-method" readOnly={ro} rows={3} className={input} value={f.methodology} onChange={set('methodology')} />
      </Field>
      <Field id="pm-limits" label="Limitations" hint="What is missing or uncertain: coverage gaps, timing, resolution, unverified reports.">
        <textarea id="pm-limits" readOnly={ro} rows={2} className={input} value={f.limitations} onChange={set('limitations')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pm-conf" label="Overall confidence">
          <select id="pm-conf" disabled={ro} className={input} value={f.confidence} onChange={set('confidence')}>
            {Object.entries(CONFIDENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field id="pm-cutoff" label="Information cut-off" hint="Information received after this time is not in this version.">
          <input id="pm-cutoff" type="datetime-local" readOnly={ro} className={input} value={f.cutoff} max={toLocalInput(new Date())} onChange={set('cutoff')} />
        </Field>
      </div>
      {version.version_no > 1 && (
        <Field id="pm-change" label="What changed in this version"><textarea id="pm-change" readOnly={ro} rows={2} className={input} value={f.change} onChange={set('change')} /></Field>
      )}
      {editable && <button type="submit" className={primary} disabled={busy}>Save details</button>}
    </form>
  );
};

// ─── Import ──────────────────────────────────────────────────────────────────
const ImportForm: React.FC<{ version: ProductVersion; aoi: Aoi | null; onDone: () => void; onCancel: () => void }> = ({ version, aoi, onDone, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [checksum, setChecksum] = useState<string | null>(null);
  const [format, setFormat] = useState<'geojson' | 'gpkg'>('geojson');
  const [gpkgTables, setGpkgTables] = useState<{ table: string; report: ImportReport | null; problem: string | null; skipped: number }[]>([]);
  const [table, setTable] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [reading, setReading] = useState(false);
  const [meta, setMeta] = useState({ name: '', role: 'observed' as LayerRole, sourceType: 'field' as SourceType, sourceName: '', acquired: '', reference: '', confidence: 'not_assessed' as Confidence });
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const aoiBbox = aoi ? ([aoi.min_lon, aoi.min_lat, aoi.max_lon, aoi.max_lat] as [number, number, number, number]) : null;

  const read = async (f: File) => {
    setFile(f); setReport(null); setGpkgTables([]); setTable(''); setReading(true);
    setMeta((m) => ({ ...m, name: m.name || f.name.replace(/\.[^.]+$/, '') }));
    try {
      const buf = await f.arrayBuffer();
      setChecksum(await sha256Hex(buf));
      if (/\.gpkg$/i.test(f.name)) {
        setFormat('gpkg');
        const { loadSqlJs, readGeoPackage } = await import('@/lib/rapidMapping/gpkg');
        const layers = readGeoPackage(await loadSqlJs(), buf);
        const t = layers.map((l) => ({
          table: l.table, problem: l.crsProblem, skipped: l.skippedGeometries.length,
          report: l.doc ? checkFeatureCollection(l.doc, aoiBbox) : null,
        }));
        setGpkgTables(t);
        if (t.length === 1) { setTable(t[0].table); setReport(t[0].report); }
        if (!t.length) toast.error('The GeoPackage has no feature tables.');
      } else {
        setFormat('geojson');
        setReport(parseGeoJsonText(new TextDecoder().decode(buf), aoiBbox));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const chosen = gpkgTables.find((t) => t.table === table);
  const blocking = chosen?.problem ?? (report && report.problems.some((p) => p.index === 0) ? report.problems.find((p) => p.index === 0)!.message : null);
  const invalid = report ? report.problems.filter((p) => p.index > 0).length : 0;
  const canImport = report && !blocking && report.features.length > 0 && (invalid === 0 || skipInvalid) && meta.name.trim().length >= 2 && meta.sourceName.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !file || !canImport) return;
    setProgress(0);
    const { error } = await importLayer({
      version_id: version.id, name: meta.name.trim(), layer_role: meta.role, source_type: meta.sourceType, source_name: meta.sourceName.trim(),
      source_acquired_at: meta.acquired ? fromLocalInput(meta.acquired) : null, source_reference: meta.reference.trim() || null,
      source_file_name: format === 'gpkg' ? `${file.name}#${table}` : file.name, source_format: format, source_checksum: checksum, style: {},
    }, report.features, meta.confidence, setProgress);
    setProgress(null);
    if (error) toast.error(error);
    else { toast.success(`${report.features.length.toLocaleString()} features imported.`); onDone(); }
  };

  return (
    <form className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4" onSubmit={submit}>
      <h4 className="font-semibold">Import a layer</h4>
      <p className="text-xs text-slate-600 dark:text-slate-300">GeoJSON or GeoPackage, in EPSG:4326. Other coordinate systems are refused, not guessed: reproject in QGIS first. Shapefiles: convert to GeoPackage in QGIS.</p>
      <input type="file" accept=".geojson,.json,.gpkg,application/geo+json,application/geopackage+sqlite3" aria-label="Choose a GeoJSON or GeoPackage file"
             className="text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); }} />
      {reading && <p role="status" className="text-sm">Reading and checking the file…</p>}
      {gpkgTables.length > 1 && (
        <Field id="imp-table" label="Layer in the GeoPackage">
          <select id="imp-table" className={input} value={table} onChange={(e) => { setTable(e.target.value); setReport(gpkgTables.find((t) => t.table === e.target.value)?.report ?? null); }}>
            <option value="">Choose</option>
            {gpkgTables.map((t) => <option key={t.table} value={t.table}>{t.table}{t.problem ? ' (cannot import)' : ` (${t.report?.features.length ?? 0} features)`}</option>)}
          </select>
        </Field>
      )}
      {blocking && <p role="alert" className="text-sm rounded-lg bg-red-50 text-red-900 px-3 py-2">{blocking}</p>}
      {report && !blocking && (
        <div className="text-sm space-y-1" aria-live="polite">
          <p><strong>{report.features.length.toLocaleString()}</strong> of {report.total.toLocaleString()} features are valid · {report.geometryTypes.join(', ') || '—'} · {report.vertices.toLocaleString()} positions · CRS {report.crs.declared ?? 'EPSG:4326 (GeoJSON default)'}</p>
          {chosen && chosen.skipped > 0 && <p>{chosen.skipped} rows without a usable geometry were skipped.</p>}
          {invalid > 0 && (
            <details open className="rounded-lg bg-red-50 text-red-950 px-3 py-2">
              <summary className="font-semibold">{invalid} invalid feature{invalid > 1 ? 's' : ''} will not be imported</summary>
              <ul className="list-disc ml-5 text-xs">{report.problems.filter((p) => p.index > 0).slice(0, 20).map((p) => <li key={p.index}>Feature {p.index}{p.id ? ` (id ${p.id})` : ''}: {p.message}</li>)}</ul>
              {invalid > 20 && <p className="text-xs">…and {invalid - 20} more.</p>}
              <label className="flex items-center gap-2 mt-1 text-xs"><input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} /> Import only the valid features (the file's checksum is kept as the record of the original)</label>
            </details>
          )}
          {report.warnings.map((w) => <p key={w} className="rounded-lg bg-amber-50 text-amber-950 px-3 py-1 text-xs">{w}</p>)}
        </div>
      )}
      {report && !blocking && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="imp-name" label="Layer name"><input id="imp-name" required minLength={2} className={input} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></Field>
            <Field id="imp-role" label="What the data is" hint="Spec §9.3: observed, modelled, inferred or reference must be stated.">
              <select id="imp-role" className={input} value={meta.role} onChange={(e) => setMeta({ ...meta, role: e.target.value as LayerRole })}>
                {Object.entries(LAYER_ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="imp-stype" label="Source type">
              <select id="imp-stype" className={input} value={meta.sourceType} onChange={(e) => setMeta({ ...meta, sourceType: e.target.value as SourceType })}>
                {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="imp-sname" label="Source and custodian" hint="For example: CPDO CLUP 2023 road network; Sentinel-2 via Copernicus, 14 Nov.">
              <input id="imp-sname" required minLength={2} className={input} value={meta.sourceName} onChange={(e) => setMeta({ ...meta, sourceName: e.target.value })} />
            </Field>
            <Field id="imp-acq" label="Acquired or observed at"><input id="imp-acq" type="datetime-local" className={input} value={meta.acquired} max={toLocalInput(new Date())} onChange={(e) => setMeta({ ...meta, acquired: e.target.value })} /></Field>
            <Field id="imp-conf" label="Confidence in these features">
              <select id="imp-conf" className={input} value={meta.confidence} onChange={(e) => setMeta({ ...meta, confidence: e.target.value as Confidence })}>
                {Object.entries(CONFIDENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field id="imp-ref" label="Reference (optional)" hint="Where the original file is kept, e.g. document D-014, or the provider's product ID.">
            <input id="imp-ref" className={input} maxLength={500} value={meta.reference} onChange={(e) => setMeta({ ...meta, reference: e.target.value })} />
          </Field>
          {checksum && <p className="text-xs text-slate-500 break-all">SHA-256 {checksum}</p>}
        </>
      )}
      {progress != null && report && <p role="status" className="text-sm">Sending… {progress.toLocaleString()} of {report.features.length.toLocaleString()}</p>}
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={!canImport || progress != null}><Upload className="w-4 h-4" aria-hidden="true" /> Import</button>
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Review and publication ──────────────────────────────────────────────────
function missingForReview(product: Product, version: ProductVersion, layers: Layer[], aoi: Aoi | null): string[] {
  const m: string[] = [];
  if ((product.methodology ?? '').trim().length < 10) m.push('methodology');
  if ((product.limitations ?? '').trim().length < 10) m.push('limitations');
  if (!version.data_cutoff_at) m.push('information cut-off');
  if (!layers.some((l) => l.feature_count > 0)) m.push('a layer with features');
  if (version.version_no > 1 && (version.change_summary ?? '').trim().length < 10) m.push('what changed');
  if (product.aoi_id && aoi?.status !== 'approved') m.push('an approved area of interest');
  return m;
}

const Steps: React.FC<{ product: Product; version: ProductVersion; latest: boolean; layers: Layer[]; aoi: Aoi | null; closed: boolean; onChanged: () => void }> = ({ product, version, latest, layers, aoi, closed, onChanged }) => {
  const { user, can } = useAuth();
  const { busy, run } = useSubmit(onChanged);
  const [decision, setDecision] = useState<'accept' | 'return' | 'reject'>('accept');
  const [comments, setComments] = useState('');
  const [needsField, setNeedsField] = useState(false);
  const [audience, setAudience] = useState<Audience>('internal_eoc');
  const [pubNote, setPubNote] = useState('');
  const author = user?.id && version.submitted_by === user.id;
  const prelim = version.status !== 'verified';

  if (closed || product.archived_at) return <p className="text-sm text-slate-500">{product.archived_at ? `Archived: ${product.archive_reason}` : 'The activation is closed.'}</p>;
  if (!latest && version.status !== 'published') return <p className="text-sm text-slate-500">This is an earlier version. Steps apply to the latest version.</p>;

  const missing = missingForReview(product, version, layers, aoi);
  return (
    <div className="space-y-4">
      {version.status === 'draft' && (
        <Gate min="analyst">
          {missing.length ? <p className="text-sm">Before review, add: {missing.join(', ')}.</p> : <p className="text-sm">Ready for review. A different analyst must review it.</p>}
          <button type="button" className={cn(primary, 'mt-2')} disabled={busy || missing.length > 0} onClick={() => run(() => submitVersion(version.id), 'Submitted for review. The details and layers of this version are now frozen.')}>Submit v{version.version_no} for review</button>
        </Gate>
      )}

      {version.status === 'under_review' && (
        <Gate min="analyst">
          {author ? <p className="text-sm">You submitted this version, so someone else must review it.</p> : (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => reviewVersion(version.id, decision, comments, needsField), 'Review recorded.'); }}>
              <fieldset>
                <legend className="text-sm font-semibold">Review of v{version.version_no}: geometry, sources, method, limitations</legend>
                <div className="flex flex-wrap gap-4 text-sm mt-1">
                  {(['accept', 'return', 'reject'] as const).map((d) => (
                    <label key={d} className="flex items-center gap-1"><input type="radio" name="rv-decision" checked={decision === d} onChange={() => setDecision(d)} /> {d === 'accept' ? 'Accept' : d === 'return' ? 'Return for changes' : 'Reject'}</label>
                  ))}
                </div>
              </fieldset>
              {decision === 'accept' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={needsField} onChange={(e) => setNeedsField(e.target.checked)} /> Needs field verification before it can be verified</label>}
              <Field id="rv-comments" label={decision === 'accept' ? 'Comments (optional)' : 'What needs to change, or why it is rejected'}>
                <textarea id="rv-comments" rows={2} className={input} required={decision !== 'accept'} minLength={decision !== 'accept' ? 10 : 0} value={comments} onChange={(e) => setComments(e.target.value)} />
              </Field>
              <button type="submit" className={primary} disabled={busy}>Record review</button>
            </form>
          )}
        </Gate>
      )}

      {['preliminary', 'for_field_verification', 'verified'].includes(version.status) && latest && (
        <Gate min="drrm_officer">
          {author ? <p className="text-sm">You submitted this version, so another DRRM officer must verify or publish it.</p> : (
            <div className="space-y-3">
              {version.status !== 'verified' && (
                <NoteAction id="rv-verify" label="Verify: what was checked and how (field checks, second source)" button="Verify" minLength={10}
                            onSubmit={(n) => run(() => verifyVersion(version.id, n), 'Verified.')} />
              )}
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => publishVersion(version.id, audience, pubNote), 'Published.'); }}>
                <Field id="rv-aud" label="Publish to" hint={prelim ? 'A preliminary product can go only to the internal EOC. Verify it to share more widely.' : 'Public release also needs an administrator.'}>
                  <select id="rv-aud" className={input} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                    {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                      <option key={a} value={a} disabled={(prelim && a !== 'internal_eoc') || (a === 'public_approved' && !can('tenant_admin'))}>{AUDIENCE_LABEL[a]}</option>
                    ))}
                  </select>
                </Field>
                <Field id="rv-pubnote" label="Publication note (optional)"><input id="rv-pubnote" className={input} value={pubNote} onChange={(e) => setPubNote(e.target.value)} /></Field>
                <button type="submit" className={primary} disabled={busy}>Publish v{version.version_no}{prelim ? ' as PRELIMINARY' : ''}</button>
              </form>
            </div>
          )}
        </Gate>
      )}

      {latest && !['draft', 'processing', 'under_review'].includes(version.status) && (
        <Gate min="analyst" quiet>
          <NoteAction id="rv-newver" label="New evidence? Start a new version (what will change)" button="Start new version" minLength={10}
                      onSubmit={(n) => run(() => newVersion(product.id, n), 'New draft version started from this one. The published version stays until the new one is published.')} />
        </Gate>
      )}
      <Gate min="drrm_officer" quiet>
        <NoteAction id="rv-archive" label="Archive this product (reason)" button="Archive" minLength={10} tone="danger"
                    onSubmit={(n) => run(() => archiveProduct(product.id, n), 'Archived. Published versions stay readable.')} />
      </Gate>
    </div>
  );
};

const LinkPanel: React.FC<{ version: ProductVersion; links: ProductLink[]; onChanged: () => void }> = ({ version, links, onChanged }) => {
  const [module, setModule] = useState<LinkModule>('incident');
  const [targets, setTargets] = useState<{ id: string; label: string }[]>([]);
  const [target, setTarget] = useState('');
  const [rel, setRel] = useState<ProductLink['relationship']>('supports');
  const { busy, run } = useSubmit(onChanged);
  useEffect(() => { listLinkTargets(module).then((r) => { setTargets(r.data); setTarget(''); }); }, [module]);
  const MODULE_LABEL: Record<LinkModule, string> = { incident: 'Incident', aa_case: 'Anticipatory action case', document: 'Document', plan: 'Plan' };
  return (
    <div className="space-y-2">
      {links.length > 0 && (
        <ul className="text-sm space-y-1">{links.map((l) => <li key={l.id}>{MODULE_LABEL[l.target_module]} {targets.find((t) => t.id === l.target_id)?.label ?? l.target_id.slice(0, 8)} · {l.relationship.replace('_', ' ')} · {when(l.created_at)}</li>)}</ul>
      )}
      {version.published_at ? (
        <Gate min="analyst" quiet>
          <form className="grid gap-2 sm:grid-cols-[auto_1fr_auto_auto] items-end" onSubmit={(e) => { e.preventDefault(); run(() => addLink(version.id, module, target, rel, ''), 'Linked. The record now points to this exact version.'); }}>
            <Field id="ln-mod" label="Link to"><select id="ln-mod" className={input} value={module} onChange={(e) => setModule(e.target.value as LinkModule)}>{Object.entries(MODULE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field id="ln-target" label="Record"><select id="ln-target" required className={input} value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Choose</option>{targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
            <Field id="ln-rel" label="Relationship"><select id="ln-rel" className={input} value={rel} onChange={(e) => setRel(e.target.value as ProductLink['relationship'])}><option value="supports">Supports</option><option value="referenced_in">Referenced in</option><option value="evidence_for">Evidence for</option></select></Field>
            <button type="submit" className={secondary} disabled={busy || !target}><Link2 className="w-4 h-4" aria-hidden="true" /> Link</button>
          </form>
        </Gate>
      ) : <p className="text-sm text-slate-500">Only a published version can be linked to incidents, cases, documents or plans.</p>}
    </div>
  );
};

// ─── Workspace ───────────────────────────────────────────────────────────────
const ProductWorkspace: React.FC<{
  activation: Activation; product: Product; versions: ProductVersion[]; layers: Layer[]; aois: Aoi[]; observations: Observation[]; onChanged: () => void; onBack: () => void;
}> = ({ activation, product, versions, layers, aois, observations, onChanged, onBack }) => {
  const { can } = useAuth();
  const mine = useMemo(() => versions.filter((v) => v.product_id === product.id).sort((a, b) => b.version_no - a.version_no), [versions, product.id]);
  const latest = mine[0];
  const [selectedNo, setSelectedNo] = useState<number>(latest?.version_no ?? 1);
  const version = mine.find((v) => v.version_no === selectedNo) ?? latest;
  const vLayers = useMemo(() => layers.filter((l) => l.version_id === version?.id), [layers, version?.id]);
  const aoi = aois.find((a) => a.id === (version?.aoi_id ?? product.aoi_id)) ?? null;
  const [features, setFeatures] = useState<StoredFeature[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [importing, setImporting] = useState(false);
  const [tick, setTick] = useState(0);
  const closed = ['closed', 'cancelled'].includes(activation.status);
  const editable = Boolean(version && version.id === latest?.id && version.status === 'draft' && !product.archived_at && !closed && can('analyst'));
  const layerKey = vLayers.map((l) => `${l.id}:${l.feature_count}`).join(',');

  useEffect(() => { setSelectedNo(latest?.version_no ?? 1); }, [latest?.version_no]);
  useEffect(() => {
    let live = true;
    loadFeatures(vLayers.map((l) => l.id)).then((r) => { if (live) { setFeatures(r.data); if (r.error) toast.error(r.error); } });
    return () => { live = false; };
  }, [layerKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!version) return;
    if (can('analyst')) loadReviews([version.id]).then((r) => setReviews(r.data));
    loadLinks([version.id]).then((r) => setLinks(r.data));
  }, [version?.id, version?.status, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!version) return <p className="text-sm text-slate-500">This product has no versions you can see.</p>;
  const refresh = () => { setTick((t) => t + 1); onChanged(); };
  const code = productCode(activation.ref, product, version.version_no);
  const meta = productTypeMeta(product.product_type);
  const preview = vLayers.map((l, i) => ({ layer: l, colour: LAYER_COLOURS[i % LAYER_COLOURS.length], features: features.filter((f) => f.layer_id === l.id) }));
  const exportInput = { activation, product, version, aoi, layers: vLayers, features };
  const fileBase = safeFileName(`DDRiVE-M_${code}`);
  const verifiedObs = observations.filter((o) => o.verification_status === 'field_verified').length;

  const print = () => {
    document.body.classList.add('rm-printing');
    const done = () => { document.body.classList.remove('rm-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1000);
  };

  return (
    <div className="space-y-5">
      <button type="button" className="text-sm underline" onClick={onBack}>← All products</button>
      <header className={card}>
        <p className="text-xs text-slate-500">{code} · {meta.label} ({meta.code})</p>
        <h2 className="font-montserrat font-bold text-xl">{version.title_snapshot ?? product.title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{meta.question}</p>
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <StatusBadge status={product.archived_at ? 'archived' : version.status} level={version.publication_level} />
          {product.published_version && product.published_version !== version.version_no && <span className="text-xs">v{product.published_version} is the published version</span>}
          <span className="text-xs text-slate-500">AOI: {aoi ? `${aoi.name} (boundary v${version.aoi_version_no ?? aoi.current_version})` : 'none'}</span>
          <span className="text-xs text-slate-500">Cut-off: {when(version.data_cutoff_at)}</span>
        </div>
        {mine.length > 1 && (
          <nav aria-label="Versions" className="mt-3 flex flex-wrap gap-2">
            {mine.map((v) => (
              <button key={v.id} type="button" aria-current={v.version_no === version.version_no ? 'true' : undefined} onClick={() => setSelectedNo(v.version_no)}
                      className={cn('rounded-full border px-3 py-1 text-xs', v.version_no === version.version_no ? 'border-blue-700 bg-blue-50 dark:bg-blue-950' : 'border-slate-300')}>
                v{v.version_no} · {v.status === 'published' ? `published (${v.publication_level})` : v.status.replace(/_/g, ' ')}
              </button>
            ))}
          </nav>
        )}
      </header>

      <Disclaimer version={version} />

      <section id="rm-print-area" className={cn(card, 'space-y-3')} aria-labelledby="pw-map">
        <div className="rm-print-only">
          <p className="text-xs">DDRiVE-M Rapid Mapping · {activation.ref} {activation.title}</p>
          <h2 className="font-bold text-lg">{version.title_snapshot ?? product.title}</h2>
          <p className="text-xs">{code} · {version.status === 'published' ? `Published (${version.publication_level})` : version.status} · Cut-off {when(version.data_cutoff_at)} · Printed {when(new Date().toISOString())}</p>
        </div>
        <h3 id="pw-map" className="font-semibold rm-no-print">Map</h3>
        <MapPreview title={code} aoi={aoi ? { name: aoi.name, geometry: aoi.geometry } : null} layers={preview}
                    watermark={isPreliminary(version) ? 'PRELIMINARY' : null} caption={`Information cut-off ${when(version.data_cutoff_at)}.`} />
        <div className="rm-print-only text-xs space-y-1">
          <p><strong>Summary.</strong> {version.summary_snapshot ?? product.summary ?? '—'}</p>
          <p><strong>Methodology.</strong> {version.methodology_snapshot ?? product.methodology ?? '—'}</p>
          <p><strong>Limitations.</strong> {version.limitations_snapshot ?? product.limitations ?? '—'}</p>
          <p><strong>Confidence.</strong> {CONFIDENCE_LABEL[version.confidence_snapshot ?? product.confidence]}</p>
          <p><strong>Sources.</strong> {vLayers.map((l) => `${l.name}: ${l.source_name}${l.source_acquired_at ? `, ${when(l.source_acquired_at)}` : ''}`).join('; ') || '—'}</p>
          <Disclaimer version={version} />
        </div>
      </section>

      <section className={card} aria-labelledby="pw-layers">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <h3 id="pw-layers" className="font-semibold flex items-center gap-2"><LayersIcon className="w-4 h-4" aria-hidden="true" /> Layers ({vLayers.length})</h3>
          {editable && !importing && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondary} onClick={() => setImporting(true)}><Upload className="w-4 h-4" aria-hidden="true" /> Import file</button>
              <button type="button" className={secondary} disabled={!verifiedObs}
                      title={verifiedObs ? undefined : 'No field-verified observations yet'}
                      onClick={async () => { const r = await layerFromObservations(version.id, 'Verified field observations', false); if (r.error) toast.error(r.error); else { toast.success('Layer built from verified field observations.'); refresh(); } }}>
                From {verifiedObs} verified observation{verifiedObs === 1 ? '' : 's'}
              </button>
            </div>
          )}
        </div>
        {importing && <div className="mt-3"><ImportForm version={version} aoi={aoi} onCancel={() => setImporting(false)} onDone={() => { setImporting(false); refresh(); }} /></div>}
        {vLayers.length === 0 && !importing && <p className="text-sm text-slate-500 mt-2">No layers yet.</p>}
        <ul className="mt-3 space-y-2">
          {vLayers.map((l, i) => (
            <li key={l.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: LAYER_COLOURS[i % LAYER_COLOURS.length] }} aria-hidden="true" />{l.name}</p>
                <p className="text-xs text-slate-500">
                  {LAYER_ROLE_LABEL[l.layer_role]} · {SOURCE_TYPE_LABEL[l.source_type]}: {l.source_name}{l.source_acquired_at ? ` · ${when(l.source_acquired_at)}` : ''} · {l.feature_count.toLocaleString()} {l.geometry_type ?? ''} feature{l.feature_count === 1 ? '' : 's'} · {l.source_crs}
                  {l.source_file_name ? ` · ${l.source_file_name}` : ''}{l.source_reference ? ` · ref ${l.source_reference}` : ''}
                </p>
                {l.source_checksum && <p className="text-[11px] text-slate-400 break-all">SHA-256 {l.source_checksum}</p>}
              </div>
              {editable && <button type="button" className={danger} onClick={async () => { const r = await deleteLayer(l.id); if (r.error) toast.error(r.error); else { toast.success('Layer removed from the draft.'); refresh(); } }}><Trash2 className="w-4 h-4" aria-hidden="true" /> Remove</button>}
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="pw-meta">
        <h3 id="pw-meta" className="font-semibold mb-2">Details {editable ? '' : '(frozen in this version)'}</h3>
        <MetadataForm key={`${version.id}-${product.updated_at}-${version.updated_at}`} product={editable ? product : {
          ...product, title: version.title_snapshot ?? product.title, summary: version.summary_snapshot ?? product.summary,
          methodology: version.methodology_snapshot ?? product.methodology, limitations: version.limitations_snapshot ?? product.limitations,
          confidence: version.confidence_snapshot ?? product.confidence,
        }} version={version} aois={aois} editable={editable} onSaved={refresh} />
        {version.source_manifest?.length > 0 && (
          <details className="mt-3 text-sm"><summary className="font-semibold cursor-pointer">Source manifest frozen at submission ({version.source_manifest.length})</summary>
            <ul className="list-disc ml-5 text-xs mt-1">{version.source_manifest.map((s, i) => <li key={i}>{s.layer}: {s.source_name} ({s.role}, {s.features} features{s.acquired_at ? `, ${when(s.acquired_at)}` : ''}{s.sha256 ? `, sha256 ${s.sha256.slice(0, 12)}…` : ''})</li>)}</ul>
          </details>
        )}
      </section>

      <section className={card} aria-labelledby="pw-steps">
        <h3 id="pw-steps" className="font-semibold mb-2">Review and publication</h3>
        <ol className="text-xs text-slate-500 mb-3 flex flex-wrap gap-x-2">
          <li>Draft →</li><li>Under review (another analyst) →</li><li>Accepted, preliminary →</li><li>Verified (DRRM officer) →</li><li>Published to an audience</li>
        </ol>
        <Steps product={product} version={version} latest={version.id === latest.id} layers={vLayers} aoi={aoi} closed={closed} onChanged={refresh} />
        {(version.submitted_at || version.verified_at || version.published_at || reviews.length > 0) && (
          <ul className="mt-4 text-xs space-y-1 border-t pt-3">
            {version.submitted_at && <li>Submitted {when(version.submitted_at)}</li>}
            {reviews.map((r) => <li key={r.id}>Review: {r.decision}{r.needs_field_verification ? ' (needs field verification)' : ''} · {when(r.reviewed_at)}{r.comments ? ` · “${r.comments}”` : ''}</li>)}
            {version.verified_at && <li>Verified {when(version.verified_at)}: {version.verification_note}</li>}
            {version.published_at && <li>Published {when(version.published_at)} to {AUDIENCE_LABEL[version.published_audience!]} as {version.publication_level}{version.publication_note ? ` · ${version.publication_note}` : ''}</li>}
            {version.superseded_at && <li>Superseded {when(version.superseded_at)}</li>}
          </ul>
        )}
      </section>

      <section className={card} aria-labelledby="pw-links">
        <h3 id="pw-links" className="font-semibold mb-2">Linked records</h3>
        <LinkPanel version={version} links={links} onChanged={refresh} />
      </section>

      <section className={card} aria-labelledby="pw-export">
        <h3 id="pw-export" className="font-semibold mb-2">Export v{version.version_no}</h3>
        <p className="text-xs text-slate-500 mb-2">Every export carries the product code, version, cut-off and the {isPreliminary(version) ? 'preliminary' : 'verified'} statement. Share only with the audience it was published to.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondary} disabled={!features.length} onClick={() => download(`${fileBase}.geojson`, JSON.stringify(toGeoJson(exportInput)), 'application/geo+json')}><FileJson className="w-4 h-4" aria-hidden="true" /> GeoJSON</button>
          <button type="button" className={secondary} disabled={!features.length} onClick={() => download(`${fileBase}_summary.csv`, toCsv(exportInput), 'text/csv;charset=utf-8')}><Download className="w-4 h-4" aria-hidden="true" /> CSV summary</button>
          <button type="button" className={secondary} onClick={() => download(`${fileBase}_metadata.json`, JSON.stringify(toMetadata(exportInput), null, 2), 'application/json')}><Download className="w-4 h-4" aria-hidden="true" /> metadata.json</button>
          <button type="button" className={secondary} onClick={print}><Printer className="w-4 h-4" aria-hidden="true" /> Print or save as PDF</button>
        </div>
      </section>
    </div>
  );
};

export default ProductWorkspace;
