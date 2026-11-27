// Plans from templates, forms, exercises (Enhancement and Validation) and the governance self-assessment and risk
// mainstreaming register (Integration). The database enforces the steps and roles
// (supabase/migrations/20261127060000_phase4_6_governance_plans_exercises.sql, ADR-012, ADR-013).
import { supabase } from '@/lib/supabase';
import type { PlanContent, PlanTemplate } from '@/content/planTemplates';
import type { CheckTemplate, ExerciseType, FormKey } from '@/content/formsAndExercises';

type Res<T> = { data: T; error: string | null };
const friendly = (m: string) =>
  /row-level security|permission denied/i.test(m) ? 'Your role does not allow this. Ask your organisation administrator if you need it.'
  : /duplicate key/i.test(m) ? 'That already exists.'
  : /violates check constraint/i.test(m) ? 'One of the values is not allowed. Check the form and try again.' : m;
const done = (error: { message: string } | null) => ({ error: error ? friendly(error.message) : null });
const rows = <T,>(r: { data: unknown; error: { message: string } | null }): Res<T[]> => ({ data: (r.data as T[]) ?? [], error: r.error ? friendly(r.error.message) : null });

// ─── Plans ───────────────────────────────────────────────────────────────────
export interface PlanRecord {
  id: string; ref: string; title: string; type: string; standard: string; status: string;
  template_key: string | null; content: PlanContent; hazard: string | null; period_from: number | null; period_to: number | null;
  adoption_ref: string | null; last_updated: string; approved_at: string | null;
}
export interface PlanTestStatus { plan_id: string; last_tested_on: string | null; exercises_evaluated: number; exercises_open: number; gaps_found: number }

export async function listPlans(): Promise<Res<(PlanRecord & { test?: PlanTestStatus })[]>> {
  const [p, t] = await Promise.all([
    supabase.from('ddrive_plans').select('id, ref, title, type, standard, status, template_key, content, hazard, period_from, period_to, adoption_ref, last_updated, approved_at').order('last_updated', { ascending: false }),
    supabase.from('ddrive_plan_test_status').select('*'),
  ]);
  const tests = new Map(((t.data as PlanTestStatus[]) ?? []).map((x) => [x.plan_id, x]));
  const r = rows<PlanRecord>(p);
  return { data: r.data.map((x) => ({ ...x, content: x.content ?? {}, test: tests.get(x.id) })), error: r.error };
}
export async function createPlan(t: PlanTemplate, title: string, opts: { hazard?: string; period_from?: number; period_to?: number }) {
  const { data, error } = await supabase.from('ddrive_plans')
    .insert({ title, type: t.type, standard: t.standard, template_key: t.key, content: {}, hazard: opts.hazard || null, period_from: opts.period_from ?? null, period_to: opts.period_to ?? null, compliance: null })
    .select('id').single();
  return { id: (data as { id: string } | null)?.id ?? null, error: error ? friendly(error.message) : null };
}
export const savePlan = async (id: string, patch: Partial<Pick<PlanRecord, 'content' | 'title' | 'hazard' | 'period_from' | 'period_to' | 'adoption_ref'>>) =>
  done((await supabase.from('ddrive_plans').update(patch).eq('id', id)).error);
export const submitPlan = async (id: string) => done((await supabase.from('ddrive_plans').update({ status: 'In Review' }).eq('id', id)).error);
export const approvePlan = async (id: string, adoptionRef: string) =>
  done((await supabase.from('ddrive_plans').update({ status: 'Approved', adoption_ref: adoptionRef }).eq('id', id)).error);
export const retirePlan = async (id: string) => done((await supabase.from('ddrive_plans').update({ status: 'Retired' }).eq('id', id)).error);

// ─── Forms ───────────────────────────────────────────────────────────────────
export interface FormRecord {
  id: string; ref: string; form_key: FormKey; title: string; data: Record<string, unknown>; status: 'draft' | 'final';
  plan_id: string | null; incident_id: string | null; exercise_id: string | null; created_at: string; finalized_at: string | null;
}
export const listForms = async (f: { planId?: string; exerciseId?: string } = {}) => {
  let q = supabase.from('ddrive_form_records').select('*').order('created_at', { ascending: false });
  if (f.planId) q = q.eq('plan_id', f.planId);
  if (f.exerciseId) q = q.eq('exercise_id', f.exerciseId);
  return rows<FormRecord>(await q);
};
export async function createForm(r: { form_key: FormKey; title: string; data?: Record<string, unknown>; plan_id?: string | null; incident_id?: string | null; exercise_id?: string | null }) {
  const { data, error } = await supabase.from('ddrive_form_records').insert({ data: {}, ...r }).select('id').single();
  return { id: (data as { id: string } | null)?.id ?? null, error: error ? friendly(error.message) : null };
}
export const saveForm = async (id: string, data: Record<string, unknown>, title?: string) =>
  done((await supabase.from('ddrive_form_records').update(title ? { data, title } : { data }).eq('id', id)).error);
export const finaliseForm = async (id: string) => done((await supabase.from('ddrive_form_records').update({ status: 'final' }).eq('id', id)).error);
export const deleteForm = async (id: string) => done((await supabase.from('ddrive_form_records').delete().eq('id', id)).error);

// ─── Exercises ───────────────────────────────────────────────────────────────
export interface Exercise {
  id: string; ref: string; plan_id: string | null; title: string; exercise_type: ExerciseType; hazard: string | null; scenario: string | null;
  participants: string | null; scheduled_on: string | null; conducted_on: string | null; status: 'planned' | 'conducted' | 'evaluated' | 'cancelled';
  evaluation_summary: string | null; evaluated_at: string | null; created_at: string;
  ddrive_plans?: { ref: string; title: string; template_key: string | null } | null;
}
export interface ExerciseCheck {
  id: string; exercise_id: string; sort: number; kind: CheckTemplate['kind']; statement: string; expected: string | null; source: string | null;
  observed: string | null; result: 'met' | 'partly' | 'not_met' | 'not_tested' | null; recommendation: string | null;
}
export const listExercises = async () =>
  rows<Exercise>(await supabase.from('ddrive_exercises').select('*, ddrive_plans(ref, title, template_key)').order('created_at', { ascending: false }));
export const listChecks = async (exerciseId: string) =>
  rows<ExerciseCheck>(await supabase.from('ddrive_exercise_checks').select('*').eq('exercise_id', exerciseId).order('sort'));
export async function createExercise(e: { title: string; exercise_type: ExerciseType; plan_id: string | null; hazard?: string | null; scenario?: string | null;
  participants?: string | null; scheduled_on?: string | null }, checks: CheckTemplate[]) {
  const { data, error } = await supabase.from('ddrive_exercises').insert(e).select('id').single();
  if (error) return { id: null, error: friendly(error.message) };
  const id = (data as { id: string }).id;
  if (checks.length) {
    const r = await supabase.from('ddrive_exercise_checks').insert(checks.map((c, i) => ({
      exercise_id: id, sort: i + 1, kind: c.kind, statement: c.statement, expected: c.expected, source: c.source,
    })));
    if (r.error) return { id, error: friendly(r.error.message) };
  }
  return { id, error: null };
}
export const addCheck = async (exerciseId: string, c: CheckTemplate, sort: number) =>
  done((await supabase.from('ddrive_exercise_checks').insert({ exercise_id: exerciseId, sort, kind: c.kind, statement: c.statement, expected: c.expected || null, source: c.source || null })).error);
export const removeCheck = async (id: string) => done((await supabase.from('ddrive_exercise_checks').delete().eq('id', id)).error);
export const rateCheck = async (id: string, patch: Pick<ExerciseCheck, 'observed' | 'result' | 'recommendation'>) =>
  done((await supabase.from('ddrive_exercise_checks').update(patch).eq('id', id)).error);
export const updateExercise = async (id: string, patch: Partial<Pick<Exercise, 'title' | 'scenario' | 'participants' | 'scheduled_on' | 'hazard'>>) =>
  done((await supabase.from('ddrive_exercises').update(patch).eq('id', id)).error);
const step = async (fn: string, args: Record<string, unknown>) => done((await supabase.rpc(fn, args)).error);
export const markConducted = (id: string, on: string) => step('ddrive_exercise_conducted', { p_id: id, p_on: on });
export const evaluateExercise = (id: string, summary: string) => step('ddrive_exercise_evaluate', { p_id: id, p_summary: summary });
export const cancelExercise = (id: string, reason: string) => step('ddrive_exercise_cancel', { p_id: id, p_reason: reason });

// ─── Integration: governance self-assessment ─────────────────────────────────
export interface GovernanceAssessment {
  id: string; ref: string; assessment_year: number; lgu_level: 'province' | 'city_municipality'; min_requirements: Record<string, boolean>;
  notes: string | null; status: 'draft' | 'final'; finalized_at: string | null;
}
export interface GovernanceRating { item_code: string; score: number | null; evidence: string | null; gap_note: string | null }
export interface SectionScore { section: string; title: string; weight: number; items: number; rated: number; average: number | null; total_items: number; total_rated: number; weighted_mean: number | null }
export const listAssessments = async () => rows<GovernanceAssessment>(await supabase.from('ddrive_governance_assessments').select('*').order('assessment_year', { ascending: false }));
export async function startAssessment(year: number, level: GovernanceAssessment['lgu_level']) {
  const { data, error } = await supabase.from('ddrive_governance_assessments').insert({ assessment_year: year, lgu_level: level }).select('id').single();
  return { id: (data as { id: string } | null)?.id ?? null, error: error ? friendly(error.message) : null };
}
export const loadRatings = async (id: string) => rows<GovernanceRating>(await supabase.from('ddrive_governance_ratings').select('item_code, score, evidence, gap_note').eq('assessment_id', id));
export const loadScores = async (id: string) => rows<SectionScore>(await supabase.from('ddrive_governance_scores').select('*').eq('assessment_id', id).order('sort'));
export const saveRating = async (assessmentId: string, r: GovernanceRating) =>
  done((await supabase.from('ddrive_governance_ratings').upsert({ assessment_id: assessmentId, ...r }, { onConflict: 'assessment_id,item_code' })).error);
export const saveMinRequirements = async (id: string, m: Record<string, boolean>) =>
  done((await supabase.from('ddrive_governance_assessments').update({ min_requirements: m }).eq('id', id)).error);
export const finaliseAssessment = (id: string) => step('ddrive_governance_finalise', { p_id: id });

// ─── Integration: risk mainstreaming ─────────────────────────────────────────
export type Instrument = 'ldrrmp' | 'contingency_plan' | 'clup' | 'zoning_ordinance' | 'cdp' | 'pdpfp' | 'ldip' | 'aip' | 'lccap' | 'ordinance' | 'executive_order' | 'pscp' | 'other';
export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  ldrrmp: 'LDRRM Plan', contingency_plan: 'Contingency plan', clup: 'Comprehensive Land Use Plan (CLUP)', zoning_ordinance: 'Zoning ordinance',
  cdp: 'Comprehensive Development Plan (CDP)', pdpfp: 'Provincial Development and Physical Framework Plan', ldip: 'Local Development Investment Program (LDIP)',
  aip: 'Annual Investment Program (AIP)', lccap: 'Local Climate Change Action Plan', ordinance: 'Ordinance', executive_order: 'Executive order', pscp: 'Public Service Continuity Plan', other: 'Other',
};
export interface Mainstreaming {
  id: string; ref: string; risk_id: string; instrument: Instrument; instrument_ref: string | null; plan_id: string | null; decision_area: string | null;
  technical_findings: string | null; implications: string | null; policy_intervention: string; status: 'proposed' | 'included' | 'adopted';
  adoption_ref: string | null; adopted_at: string | null;
}
export interface RiskIntegration {
  risk_id: string; ref: string; title: string; level: string | null; score: number | null; ddrive_risk_code: string | null;
  instruments: number; instruments_adopted: number; adopted_in: Instrument[] | null; actions_approved: number; actions_funded: number; funded_php: number;
}
export const listMainstreaming = async () => rows<Mainstreaming>(await supabase.from('ddrive_mainstreaming').select('*').order('created_at', { ascending: false }));
export const listRiskIntegration = async () => rows<RiskIntegration>(await supabase.from('ddrive_risk_integration').select('*').order('score', { ascending: false }));
export const addMainstreaming = async (m: Omit<Mainstreaming, 'id' | 'ref' | 'status' | 'adoption_ref' | 'adopted_at'>) =>
  done((await supabase.from('ddrive_mainstreaming').insert(m)).error);
export const setMainstreamingStatus = async (id: string, status: Mainstreaming['status'], adoptionRef?: string) =>
  done((await supabase.from('ddrive_mainstreaming').update({ status, adoption_ref: adoptionRef ?? null }).eq('id', id)).error);
export const deleteMainstreaming = async (id: string) => done((await supabase.from('ddrive_mainstreaming').delete().eq('id', id)).error);

export interface NdrrmpOutput { code: string; outcome: number; drrm_area: string; title: string }
export const listNdrrmpOutputs = async () => rows<NdrrmpOutput>(await supabase.from('ddrive_ndrrmp_outputs').select('*'));
