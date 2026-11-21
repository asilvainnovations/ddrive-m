// Rapid Mapping data access. Reads go through Row Level Security; every status change is a named step function
// in the database (ADR-004). There is no generic table writer here.
import { supabase } from '@/lib/supabase';
import type {
  Activation, ActivationStatus, Aoi, AoiVersion, Audience, Confidence, ConditionCode, Feature, Geometry, HazardType, Layer,
  LayerRole, LinkModule, Observation, Phase, Priority, Product, ProductLink, ProductType, ProductVersion, Review, ReviewDecision,
  SourceFormat, SourceType, StoredFeature, AoiType,
} from './types';
import { batches } from './geometry';

export type Res<T> = { data: T; error: string | null };
type Err = { error: string | null };

export function friendly(message: string): string {
  if (/row-level security|permission denied/i.test(message)) return 'Your role does not allow this. Ask your organisation administrator if you need it.';
  if (/violates check constraint/i.test(message)) return 'One of the values is not allowed. Check the form and try again.';
  if (/duplicate key/i.test(message)) return 'This record already exists.';
  if (/Failed to fetch|NetworkError|network/i.test(message)) return 'No connection. Try again when you are back online.';
  return message;
}
const err = (e: { message: string } | null) => (e ? friendly(e.message) : null);

// ─── Activations ─────────────────────────────────────────────────────────────
export async function listActivations(): Promise<Res<Activation[]>> {
  const { data, error } = await supabase
    .from('ddrive_rm_activations')
    .select('*, ddrive_incidents(ref, title)')
    .order('created_at', { ascending: false });
  return { data: (data as Activation[]) ?? [], error: err(error) };
}

export interface DashboardRow { aois: Pick<Aoi, 'id' | 'activation_id' | 'status'>[]; products: Pick<Product, 'id' | 'activation_id' | 'status' | 'title' | 'ref' | 'product_type'>[] }
/** AOI and product status across all activations the person can see, for the dashboard counts and queues. */
export async function loadDashboard(): Promise<Res<DashboardRow>> {
  const [a, p] = await Promise.all([
    supabase.from('ddrive_rm_aois').select('id, activation_id, status'),
    supabase.from('ddrive_rm_products').select('id, activation_id, status, title, ref, product_type'),
  ]);
  return { data: { aois: (a.data as DashboardRow['aois']) ?? [], products: (p.data as DashboardRow['products']) ?? [] }, error: err(a.error ?? p.error) };
}

export async function listIncidents(): Promise<Res<{ id: string; ref: string; title: string; status: string }[]>> {
  const { data, error } = await supabase.from('ddrive_incidents').select('id, ref, title, status').order('created_at', { ascending: false }).limit(200);
  return { data: data ?? [], error: err(error) };
}

export async function listAaCases(): Promise<Res<{ id: string; ref: string; title: string; status: string }[]>> {
  const { data, error } = await supabase.from('ddrive_aa_cases').select('id, ref, title, status').order('created_at', { ascending: false }).limit(200);
  return { data: data ?? [], error: err(error) };
}

export interface NewActivation {
  incident_id: string;
  aa_case_id: string | null;
  title: string;
  hazard_type: HazardType;
  phase: Phase;
  priority: Priority;
  operational_objective: string;
  information_cutoff_at: string | null;
}
export async function openActivation(a: NewActivation): Promise<Res<string | null>> {
  const { data, error } = await supabase.from('ddrive_rm_activations').insert(a).select('id').single();
  return { data: data?.id ?? null, error: err(error) };
}
export async function updateActivation(id: string, patch: Partial<NewActivation>): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_activations').update(patch).eq('id', id);
  return { error: err(error) };
}

async function step(fn: string, args: Record<string, unknown>): Promise<Err> {
  const { error } = await supabase.rpc(fn, args);
  return { error: err(error) };
}

export const setActivationStatus = (id: string, status: ActivationStatus, note?: string) =>
  step('ddrive_rm_set_activation_status', { p_activation: id, p_status: status, p_note: note ?? null });

// ─── Workspace ───────────────────────────────────────────────────────────────
export interface Workspace {
  activation: Activation | null;
  aois: Aoi[];
  products: Product[];
  versions: ProductVersion[];
  layers: Layer[];
  observations: Observation[];
  codes: ConditionCode[];
}

/** Everything for one activation that the signed-in person may see. */
export async function loadWorkspace(activationId: string): Promise<Res<Workspace>> {
  const [a, o, p, obs, codes] = await Promise.all([
    supabase.from('ddrive_rm_activations').select('*, ddrive_incidents(ref, title)').eq('id', activationId).maybeSingle(),
    supabase.from('ddrive_rm_aois').select('*').eq('activation_id', activationId).order('created_at'),
    supabase.from('ddrive_rm_products').select('*').eq('activation_id', activationId).order('created_at'),
    supabase.from('ddrive_rm_observations').select('*').eq('activation_id', activationId).order('observed_at', { ascending: false }),
    supabase.from('ddrive_rm_condition_codes').select('code, label, asset_class, definition, approval_basis, active').order('code'),
  ]);
  const products = (p.data as Product[]) ?? [];
  const ids = products.map((x) => x.id);
  const v = ids.length
    ? await supabase.from('ddrive_rm_product_versions').select('*').in('product_id', ids).order('version_no')
    : { data: [], error: null };
  const versions = (v.data as ProductVersion[]) ?? [];
  const vids = versions.map((x) => x.id);
  const l = vids.length
    ? await supabase.from('ddrive_rm_layers').select('*').in('version_id', vids).order('created_at')
    : { data: [], error: null };
  const e = a.error ?? o.error ?? p.error ?? obs.error ?? codes.error ?? v.error ?? l.error;
  return {
    data: {
      activation: (a.data as Activation) ?? null,
      aois: (o.data as Aoi[]) ?? [],
      products,
      versions,
      layers: (l.data as Layer[]) ?? [],
      observations: (obs.data as Observation[]) ?? [],
      codes: (codes.data as ConditionCode[]) ?? [],
    },
    error: err(e),
  };
}

/** Features of the given layers, paged (PostgREST returns at most 1,000 rows per request by default). */
export async function loadFeatures(layerIds: string[]): Promise<Res<StoredFeature[]>> {
  if (!layerIds.length) return { data: [], error: null };
  const out: StoredFeature[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from('ddrive_rm_features')
      .select('id, layer_id, external_feature_id, geometry, properties, observation_id, condition_code, confidence, verification_status')
      .in('layer_id', layerIds)
      .order('id')
      .range(from, from + page - 1);
    if (error) return { data: out, error: err(error) };
    out.push(...((data as StoredFeature[]) ?? []));
    if (!data || data.length < page || out.length >= 50_000) break;
  }
  return { data: out, error: null };
}

export async function loadReviews(versionIds: string[]): Promise<Res<Review[]>> {
  if (!versionIds.length) return { data: [], error: null };
  const { data, error } = await supabase.from('ddrive_rm_reviews').select('*').in('version_id', versionIds).order('reviewed_at');
  return { data: (data as Review[]) ?? [], error: err(error) };
}

export async function loadLinks(versionIds: string[]): Promise<Res<ProductLink[]>> {
  if (!versionIds.length) return { data: [], error: null };
  const { data, error } = await supabase.from('ddrive_rm_product_links').select('*').in('version_id', versionIds).order('created_at');
  return { data: (data as ProductLink[]) ?? [], error: err(error) };
}

export async function loadAoiHistory(aoiId: string): Promise<Res<AoiVersion[]>> {
  const { data, error } = await supabase.from('ddrive_rm_aoi_versions').select('id, aoi_id, version_no, change_reason, created_by, created_at')
    .eq('aoi_id', aoiId).order('version_no', { ascending: false });
  return { data: (data as AoiVersion[]) ?? [], error: err(error) };
}

// ─── Areas of interest ───────────────────────────────────────────────────────
export interface NewAoi { activation_id: string; name: string; aoi_type: AoiType; psgc_code: string | null; geometry: Geometry; change_reason: string }
export async function createAoi(a: NewAoi): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_aois').insert(a);
  return { error: err(error) };
}
export async function updateAoi(id: string, patch: Partial<Omit<NewAoi, 'activation_id'>>): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_aois').update(patch).eq('id', id);
  return { error: err(error) };
}
export const aoiStep = (id: string, action: 'submit' | 'approve' | 'return' | 'reopen' | 'retire', note?: string) =>
  step('ddrive_rm_aoi_step', { p_aoi: id, p_action: action, p_note: note ?? null });

// ─── Products and versions ───────────────────────────────────────────────────
export interface NewProduct {
  activation_id: string; aoi_id: string | null; product_type: ProductType; title: string;
  summary: string | null; methodology: string | null; limitations: string | null; confidence: Confidence;
}
export async function createProduct(p: NewProduct): Promise<Res<string | null>> {
  const { data, error } = await supabase.from('ddrive_rm_products').insert(p).select('id').single();
  return { data: data?.id ?? null, error: err(error) };
}
export async function updateProduct(id: string, patch: Partial<Omit<NewProduct, 'activation_id' | 'product_type'>>): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_products').update(patch).eq('id', id);
  return { error: err(error) };
}
export async function updateVersion(id: string, patch: { data_cutoff_at?: string | null; change_summary?: string | null }): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_product_versions').update(patch).eq('id', id);
  return { error: err(error) };
}

export const submitVersion = (id: string) => step('ddrive_rm_submit_version', { p_version: id });
export const reviewVersion = (id: string, decision: ReviewDecision, comments: string, needsField: boolean) =>
  step('ddrive_rm_review_version', { p_version: id, p_decision: decision, p_comments: comments || null, p_needs_field_verification: needsField });
export const verifyVersion = (id: string, note: string) => step('ddrive_rm_verify_version', { p_version: id, p_note: note });
export const publishVersion = (id: string, audience: Audience, note: string) =>
  step('ddrive_rm_publish_version', { p_version: id, p_audience: audience, p_note: note || null });
export const newVersion = (productId: string, summary: string) => step('ddrive_rm_new_version', { p_product: productId, p_change_summary: summary });
export const archiveProduct = (productId: string, reason: string) => step('ddrive_rm_archive_product', { p_product: productId, p_reason: reason });

// ─── Layers and features ─────────────────────────────────────────────────────
export interface NewLayer {
  version_id: string; name: string; layer_role: LayerRole; source_type: SourceType; source_name: string;
  source_acquired_at: string | null; source_reference: string | null; source_file_name: string | null;
  source_format: SourceFormat; source_checksum: string | null; style: { color?: string };
}

/**
 * Creates the layer and sends its features in batches. If a batch is refused, the layer is removed again so a
 * half-imported layer is never left behind.
 */
export async function importLayer(layer: NewLayer, features: Feature[], confidence: Confidence,
                                  onProgress?: (sent: number) => void): Promise<Err> {
  const { data, error } = await supabase.from('ddrive_rm_layers').insert(layer).select('id').single();
  if (error || !data) return { error: err(error) ?? 'The layer could not be created.' };
  let sent = 0;
  for (const batch of batches(features)) {
    const r = await supabase.rpc('ddrive_rm_add_features', { p_layer: data.id, p_features: batch, p_confidence: confidence });
    if (r.error) {
      await supabase.from('ddrive_rm_layers').delete().eq('id', data.id);
      return { error: `Import stopped after ${sent.toLocaleString()} features and was undone: ${friendly(r.error.message)}` };
    }
    sent += batch.length;
    onProgress?.(sent);
  }
  return { error: null };
}

export async function deleteLayer(id: string): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_layers').delete().eq('id', id);
  return { error: err(error) };
}

export const layerFromObservations = (versionId: string, name: string, includeTriaged: boolean) =>
  step('ddrive_rm_layer_from_observations', { p_version: versionId, p_name: name, p_include_triaged: includeTriaged });

// ─── Observations ────────────────────────────────────────────────────────────
export interface NewObservation {
  client_key: string; activation_id: string; aoi_id: string | null; observed_at: string; observation_type: Observation['observation_type'];
  access_status: Observation['access_status']; description: string; geometry: Geometry; condition_code: string | null;
  confidence: Confidence; evidence_ref: string | null;
}

/** Idempotent: sending the same client_key twice stores one observation (spec §11). */
export async function sendObservation(o: NewObservation): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_observations').upsert(o, { onConflict: 'client_key', ignoreDuplicates: true });
  return { error: err(error) };
}

export const triageObservation = (id: string, status: 'triaged' | 'field_verified' | 'rejected', note: string) =>
  step('ddrive_rm_triage_observation', { p_observation: id, p_status: status, p_note: note || null });

// ─── Links and dictionary ────────────────────────────────────────────────────
export async function addLink(versionId: string, module: LinkModule, targetId: string, relationship: ProductLink['relationship'], note: string): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_product_links')
    .insert({ version_id: versionId, target_module: module, target_id: targetId, relationship, note: note || null });
  return { error: err(error) };
}

export async function addConditionCode(c: Omit<ConditionCode, 'active'>): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_condition_codes').insert(c);
  return { error: err(error) };
}
export async function setConditionCodeActive(code: string, active: boolean): Promise<Err> {
  const { error } = await supabase.from('ddrive_rm_condition_codes').update({ active }).eq('code', code);
  return { error: err(error) };
}

/** Link targets the signed-in person can see, for the "link to" picker. */
export async function listLinkTargets(module: LinkModule): Promise<Res<{ id: string; label: string }[]>> {
  const table = { incident: 'ddrive_incidents', aa_case: 'ddrive_aa_cases', document: 'ddrive_documents', plan: 'ddrive_plans' }[module];
  const cols = module === 'document' ? 'id, ref, title:name' : 'id, ref, title';
  const { data, error } = await supabase.from(table).select(cols).order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as { id: string; ref: string | null; title: string }[];
  return { data: rows.map((r) => ({ id: r.id, label: `${r.ref ?? ''} ${r.title}`.trim() })), error: err(error) };
}
