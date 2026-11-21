// DDRiVE assessments: data access. Scores are computed by the database (ADR-006); the app only reads them.
// Status changes are named steps (approve, new version, add to register); there is no generic writer.
import { supabase } from '@/lib/supabase';
import type { FamilyCode, LikelihoodLevel, Method, SeverityClass } from './scoring';

export interface Assessment {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  assessor: string | null;
  participants: string | null;
  completed_on: string | null;
  review_on: string | null;
  version_label: string | null;
  psgc_code: string | null;
  method: Method;
  template: string | null;
  status: 'draft' | 'approved' | 'superseded';
  approved_at: string | null;
  supersedes_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  assessment_id: string;
  sort_order: number;
  family_code: FamilyCode;
  main_hazard: string;
  hazard_event: string;
  exposure: number | null;
  v_infrastructure: number | null;
  v_productive: number | null;
  v_services: number | null;
  v_social: number | null;
  response: number | null;
  comments: string | null;
  total_vulnerability: number | null;
  likelihood: number | null;
  severity: number | null;
  likelihood_level: LikelihoodLevel | null;
  severity_class: SeverityClass | null;
  risk_code: string | null;
  risk_rank: number | null;
  risk_id: string | null;
}

export interface Scenario {
  id: string;
  assessment_id: string;
  name: string;
  description: string | null;
  entry_ids: string[];
  likelihood: number | null;
  severity: number | null;
  likelihood_level: LikelihoodLevel | null;
  severity_class: SeverityClass | null;
  risk_code: string | null;
  risk_rank: number | null;
}

type Res<T> = { data: T; error: string | null };
type Err = { error: string | null };

function friendly(message: string): string {
  if (/row-level security|permission denied/i.test(message)) return 'Your role does not allow this. Ask your organisation administrator if you need it.';
  if (/violates check constraint/i.test(message)) return 'One of the values is not allowed. Check the form and try again.';
  if (/Failed to fetch|NetworkError/i.test(message)) return 'No connection. Try again when you are back online.';
  return message;
}
const err = (e: { message: string } | null) => (e ? friendly(e.message) : null);

// Numeric columns arrive from PostgREST as strings for numeric types; normalise them once here.
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const normEntry = (e: Entry): Entry => ({ ...e, total_vulnerability: n(e.total_vulnerability), likelihood: n(e.likelihood), severity: n(e.severity) });
const normScenario = (s: Scenario): Scenario => ({ ...s, likelihood: n(s.likelihood), severity: n(s.severity) });

export async function listAssessments(): Promise<Res<Assessment[]>> {
  const { data, error } = await supabase.from('ddrive_hazard_assessments').select('*').order('created_at', { ascending: false });
  return { data: (data as Assessment[]) ?? [], error: err(error) };
}

export async function loadAssessment(id: string): Promise<Res<{ entries: Entry[]; scenarios: Scenario[] }>> {
  const [e, s] = await Promise.all([
    supabase.from('ddrive_hazard_assessment_entries').select('*').eq('assessment_id', id).order('family_code').order('sort_order'),
    supabase.from('ddrive_hazard_scenarios_scored').select('*').eq('assessment_id', id).order('created_at'),
  ]);
  return {
    data: { entries: ((e.data as Entry[]) ?? []).map(normEntry), scenarios: ((s.data as Scenario[]) ?? []).map(normScenario) },
    error: err(e.error ?? s.error),
  };
}

export type AssessmentInfo = Pick<Assessment, 'title' | 'description' | 'assessor' | 'participants' | 'completed_on' | 'review_on' | 'version_label' | 'psgc_code'>;
export type NewEntry = Pick<Entry, 'family_code' | 'main_hazard' | 'hazard_event'> & Partial<Pick<Entry,
  'exposure' | 'v_infrastructure' | 'v_productive' | 'v_services' | 'v_social' | 'response' | 'comments' | 'sort_order'>>;

/** Creates a draft with its starting rows (from a template or an imported workbook). Rows the database refuses are reported. */
export async function createAssessment(info: AssessmentInfo & { method: Method; template: string | null }, rows: NewEntry[]): Promise<Res<string | null> & { refused: string[] }> {
  const { data, error } = await supabase.from('ddrive_hazard_assessments').insert(info).select('id').single();
  if (error || !data) return { data: null, error: err(error) ?? 'The assessment could not be created.', refused: [] };
  const refused: string[] = [];
  if (rows.length) {
    const r = await supabase.from('ddrive_hazard_assessment_entries')
      .insert(rows.map((x, i) => ({ ...x, sort_order: x.sort_order ?? i, assessment_id: data.id })));
    if (r.error) {
      // One bad row refuses the batch: retry row by row so the good ones are kept and the bad ones explained.
      for (const [i, x] of rows.entries()) {
        const one = await supabase.from('ddrive_hazard_assessment_entries').insert({ ...x, sort_order: x.sort_order ?? i, assessment_id: data.id });
        if (one.error) refused.push(`${x.main_hazard}: ${x.hazard_event}: ${friendly(one.error.message)}`);
      }
    }
  }
  return { data: data.id, error: null, refused };
}

export async function updateAssessment(id: string, patch: Partial<AssessmentInfo>): Promise<Err> {
  const { error } = await supabase.from('ddrive_hazard_assessments').update(patch).eq('id', id);
  return { error: err(error) };
}

export async function deleteDraft(id: string): Promise<Err> {
  const { error } = await supabase.from('ddrive_hazard_assessments').delete().eq('id', id);
  return { error: err(error) };
}

export async function addEntry(assessmentId: string, row: NewEntry): Promise<Err> {
  const { error } = await supabase.from('ddrive_hazard_assessment_entries').insert({ ...row, assessment_id: assessmentId });
  return { error: err(error) };
}

export type EntryPatch = Partial<Pick<Entry, 'exposure' | 'v_infrastructure' | 'v_productive' | 'v_services' | 'v_social' | 'response' | 'comments' | 'main_hazard' | 'hazard_event'>>;
export async function updateEntry(id: string, patch: EntryPatch): Promise<Res<Entry | null>> {
  const { data, error } = await supabase.from('ddrive_hazard_assessment_entries').update(patch).eq('id', id).select('*').single();
  return { data: data ? normEntry(data as Entry) : null, error: err(error) };
}

export async function deleteEntry(id: string): Promise<Err> {
  const { error } = await supabase.from('ddrive_hazard_assessment_entries').delete().eq('id', id);
  return { error: err(error) };
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<Res<T | null>> {
  const { data, error } = await supabase.rpc(fn, args);
  return { data: (data as T) ?? null, error: err(error) };
}
export const approve = (id: string) => rpc<string>('ddrive_ha_approve', { p_assessment: id });
export const newVersion = (id: string) => rpc<string>('ddrive_ha_new_version', { p_assessment: id });
export const addToRegister = (entryId: string, owner: string, category: string) =>
  rpc<string>('ddrive_ha_add_to_register', { p_entry: entryId, p_owner: owner, p_category: category });

export async function addScenario(assessmentId: string, name: string, description: string, entryIds: string[]): Promise<Err> {
  const { error } = await supabase.from('ddrive_hazard_scenarios').insert({ assessment_id: assessmentId, name, description: description || null, entry_ids: entryIds });
  return { error: err(error) };
}
export async function deleteScenario(id: string): Promise<Err> {
  const { error } = await supabase.from('ddrive_hazard_scenarios').delete().eq('id', id);
  return { error: err(error) };
}
