// Anticipatory action under RA 12287 (Declaration of State of Imminent Disaster Act, 2025): labels and data access.
// The database enforces the order of steps and who may take them
// (supabase/migrations/20261105010000_phase2_anticipatory_action.sql, ADR-003). This file only reads and calls it.
import { supabase } from '@/lib/supabase';

export type CaseStatus = 'triggered' | 'assessed' | 'recommended' | 'declared' | 'lifted' | 'closed' | 'not_declared';
export type Hazard = 'tropical_cyclone' | 'flood' | 'rainfall' | 'storm_surge' | 'drought' | 'volcanic' | 'tsunami' | 'other';
export type Recommendation = 'declare' | 'do_not_declare' | 'maintain' | 'lift';
export type Measure =
  | 'public_advisory' | 'preposition_teams' | 'preemptive_evacuation' | 'forced_evacuation' | 'volunteers'
  | 'preposition_relief' | 'social_amelioration' | 'agri_food_contingency' | 'public_health' | 'other';
export type FundSource = 'none' | 'ldrrmf' | 'ldrrmf_special_trust_fund' | 'agency_budget' | 'ndrrmf' | 'grant_donation' | 'other';

export interface AaCase {
  id: string;
  ref: string;
  title: string;
  hazard: Hazard;
  areas: string;
  official_alert_id: string | null;
  forecast_source: string;
  forecast_issued_at: string;
  expected_onset: string;
  status: CaseStatus;
  recommending_body: string | null;
  recommended_at: string | null;
  request_letter: string | null;
  declared_by_name: string | null;
  declared_by_title: string | null;
  declaration_eo: string | null;
  declared_at: string | null;
  not_declared_reason: string | null;
  lift_reason: 'impacts_not_met' | 'hazard_occurred' | null;
  lifted_at: string | null;
  lifting_eo: string | null;
  costs_minimized_php: number | null;
  costs_basis: string | null;
  report_notes: string | null;
  report_submitted_at: string | null;
  created_at: string;
  ddrive_official_alerts?: { cap_url: string; event: string; headline: string | null } | null;
}

export interface AaAssessment {
  id: string;
  case_id: string;
  severity_class: 'severe' | 'equivalent' | 'not_severe';
  severe_condition_met: boolean;
  lead_time_hours: number | null;
  lead_time_condition_met: boolean;
  exposed_people: number | null;
  vulnerable_groups: string | null;
  sectors_affected: string | null;
  cascading_hazards: string | null;
  local_capacity: string | null;
  basis: string;
  recommendation: Recommendation;
  created_at: string;
}

export interface AaAction {
  id: string;
  case_id: string;
  measure: Measure;
  description: string;
  responsible: string | null;
  fund_source: FundSource;
  amount_php: number | null;
  disbursed_php: number | null;
  status: 'planned' | 'done' | 'cancelled';
  done_at: string | null;
}

// ─── Labels ──────────────────────────────────────────────────────────────────
export const STEPS: { status: CaseStatus; label: string; section: string }[] = [
  { status: 'triggered', label: 'Forecast trigger', section: 'Sections 3(f), 4' },
  { status: 'assessed', label: 'Pre-disaster risk assessment', section: 'Section 6' },
  { status: 'recommended', label: 'Recommendation', section: 'Section 5' },
  { status: 'declared', label: 'Declaration', section: 'Section 5' },
  { status: 'lifted', label: 'Lifting', section: 'Section 7' },
  { status: 'closed', label: 'Report', section: 'Sections 8, 11' },
];

export const STATUS_LABEL: Record<CaseStatus, string> = {
  triggered: 'Forecast received',
  assessed: 'Assessed',
  recommended: 'Declaration recommended',
  declared: 'State of Imminent Disaster declared',
  lifted: 'Lifted',
  closed: 'Closed, report submitted',
  not_declared: 'Closed without declaration',
};

export const HAZARD_LABEL: Record<Hazard, string> = {
  tropical_cyclone: 'Tropical cyclone',
  flood: 'Flood',
  rainfall: 'Heavy rainfall',
  storm_surge: 'Storm surge',
  drought: 'Drought',
  volcanic: 'Volcanic eruption',
  tsunami: 'Tsunami',
  other: 'Other',
};

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  declare: 'Recommend a declaration',
  do_not_declare: 'Do not recommend a declaration',
  maintain: 'Maintain the declaration',
  lift: 'Recommend lifting (projected impacts not met)',
};

export const SEVERITY_LABEL: Record<AaAssessment['severity_class'], string> = {
  severe: 'Severe',
  equivalent: 'Equivalent to severe (local risk profile, capacity or cascading hazards)',
  not_severe: 'Not severe',
};

// RA 12287 section 9 lists the anticipatory measures a declaration allows.
export const MEASURE_LABEL: Record<Measure, string> = {
  public_advisory: 'Public advisories and warnings',
  preposition_teams: 'Pre-positioning response teams',
  preemptive_evacuation: 'Pre-emptive evacuation',
  forced_evacuation: 'Forced evacuation',
  volunteers: 'Mobilising accredited volunteers',
  preposition_relief: 'Pre-positioning relief goods',
  social_amelioration: 'Social amelioration for vulnerable groups',
  agri_food_contingency: 'Agriculture and food supply contingency',
  public_health: 'Public health advisories and support',
  other: 'Other anticipatory measure',
};

// RA 12287 section 10: where anticipatory action money may come from.
export const FUND_LABEL: Record<FundSource, string> = {
  none: 'No funds',
  ldrrmf: 'Local DRRM Fund (LDRRMF)',
  ldrrmf_special_trust_fund: 'Unexpended LDRRMF in the Special Trust Fund',
  agency_budget: 'Agency budget (GAA)',
  ndrrmf: 'National DRRM Fund',
  grant_donation: 'Grant or donation',
  other: 'Other lawful source',
};

/** Hours from now until the expected onset (negative once it has passed). */
export const hoursUntil = (iso: string) => (new Date(iso).getTime() - Date.now()) / 3_600_000;

export const peso = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });

export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }) + ' PHT' : '—';

/** A draft request to the declaring official, from the case and its latest assessment. Always edited by a person. */
export function draftRequestLetter(c: AaCase, a: AaAssessment | undefined, body: string): string {
  const lead = a?.lead_time_hours != null ? `${Math.round(a.lead_time_hours)} hours` : 'the lead time stated in the assessment';
  return [
    `Subject: Recommendation for the Declaration of a State of Imminent Disaster (${HAZARD_LABEL[c.hazard]}) under RA 12287`,
    '',
    `The ${body || '[council]'} respectfully recommends the declaration of a State of Imminent Disaster over: ${c.areas}.`,
    '',
    `Forecast: ${c.forecast_source}, issued ${when(c.forecast_issued_at)}. Expected onset: ${when(c.expected_onset)}.`,
    a
      ? `The pre-disaster risk assessment of ${when(a.created_at)} found the forecast hazard ${SEVERITY_LABEL[a.severity_class].toLowerCase()} (section 6(a)) and a lead time of ${lead} for anticipatory action (section 6(b)).`
      : 'Pre-disaster risk assessment: [attach].',
    a?.exposed_people != null ? `People exposed: ${a.exposed_people.toLocaleString('en-PH')}.` : '',
    a?.vulnerable_groups ? `Vulnerable groups: ${a.vulnerable_groups}.` : '',
    a ? `Basis: ${a.basis}` : '',
    '',
    'The declaration would allow the anticipatory measures under section 9 of RA 12287, funded as provided in section 10.',
    '',
    '[Name, position, signature]',
  ]
    .filter((l, i, all) => l !== '' || all[i - 1] !== '')
    .join('\n');
}

// ─── Data ────────────────────────────────────────────────────────────────────
type Res<T> = { data: T; error: string | null };

function friendly(message: string): string {
  if (/row-level security|permission denied/i.test(message)) return 'Your role does not allow this. Ask your organisation administrator if you need it.';
  if (/violates check constraint/i.test(message)) return 'One of the values is not allowed. Check the form and try again.';
  return message;
}

export async function listCases(): Promise<Res<AaCase[]>> {
  const { data, error } = await supabase
    .from('ddrive_aa_cases')
    .select('*, ddrive_official_alerts(cap_url, event, headline)')
    .order('created_at', { ascending: false });
  return { data: (data as AaCase[]) ?? [], error: error ? friendly(error.message) : null };
}

export async function loadCaseDetail(id: string): Promise<Res<{ assessments: AaAssessment[]; actions: AaAction[] }>> {
  const [a, m] = await Promise.all([
    supabase.from('ddrive_aa_assessments').select('*').eq('case_id', id).order('created_at', { ascending: true }),
    supabase.from('ddrive_aa_actions').select('*').eq('case_id', id).order('created_at', { ascending: true }),
  ]);
  const err = a.error ?? m.error;
  return { data: { assessments: (a.data as AaAssessment[]) ?? [], actions: (m.data as AaAction[]) ?? [] }, error: err ? friendly(err.message) : null };
}

export interface NewCase {
  title: string;
  hazard: Hazard;
  areas: string;
  official_alert_id: string | null;
  forecast_source: string;
  forecast_issued_at: string;
  expected_onset: string;
}

export async function openCase(c: NewCase): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ddrive_aa_cases').insert(c);
  return { error: error ? friendly(error.message) : null };
}

export async function updateCaseText(id: string, patch: Partial<Pick<AaCase, 'title' | 'areas' | 'request_letter'>>) {
  const { error } = await supabase.from('ddrive_aa_cases').update(patch).eq('id', id);
  return { error: error ? friendly(error.message) : null };
}

export type NewAssessment = Omit<AaAssessment, 'id' | 'created_at' | 'lead_time_hours'>;
export async function recordAssessment(a: NewAssessment) {
  const { error } = await supabase.from('ddrive_aa_assessments').insert(a);
  return { error: error ? friendly(error.message) : null };
}

export type NewAction = Pick<AaAction, 'case_id' | 'measure' | 'description' | 'responsible' | 'fund_source' | 'amount_php'>;
export async function addAction(a: NewAction) {
  const { error } = await supabase.from('ddrive_aa_actions').insert(a);
  return { error: error ? friendly(error.message) : null };
}
export async function updateAction(id: string, patch: Partial<Pick<AaAction, 'status' | 'disbursed_php' | 'description' | 'responsible'>>) {
  const { error } = await supabase.from('ddrive_aa_actions').update(patch).eq('id', id);
  return { error: error ? friendly(error.message) : null };
}

async function step(fn: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args);
  return { error: error ? friendly(error.message) : null };
}
export const recommend = (id: string, body: string, letter: string) => step('ddrive_aa_recommend', { p_case: id, p_body: body, p_letter: letter });
export const recordDeclaration = (id: string, name: string, title: string, eo: string, at: string) =>
  step('ddrive_aa_record_declaration', { p_case: id, p_name: name, p_title: title, p_eo: eo, p_declared_at: at });
export const closeNotDeclared = (id: string, reason: string) => step('ddrive_aa_close_not_declared', { p_case: id, p_reason: reason });
export const recordLifting = (id: string, reason: 'impacts_not_met' | 'hazard_occurred', at: string, eo: string) =>
  step('ddrive_aa_record_lifting', { p_case: id, p_reason: reason, p_lifted_at: at, p_eo: eo });
export const submitReport = (id: string, costs: number | null, basis: string, notes: string) =>
  step('ddrive_aa_submit_report', { p_case: id, p_costs: costs, p_basis: basis, p_notes: notes });
