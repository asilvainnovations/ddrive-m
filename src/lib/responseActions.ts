// Risk-informed response actions: proposed in Diagnosis or Detection, decided and coordinated in Response.
// The database enforces the steps and who may take them (supabase/migrations/20261127020000_phase3_response_actions.sql,
// ADR-008). This file only reads and calls it.
import { supabase } from '@/lib/supabase';

export type ActionStatus = 'proposed' | 'approved' | 'declined' | 'in_progress' | 'done' | 'cancelled';
export type ActionOrigin = 'diagnosis' | 'detection' | 'manual';
export type Strategy = 'avoid' | 'reduce_likelihood' | 'reduce_consequences' | 'share' | 'retain';
export type DrrmArea = 'prevention_mitigation' | 'preparedness' | 'response' | 'rehabilitation_recovery';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface ResponseAction {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  origin: ActionOrigin;
  risk_id: string | null;
  hazard_entry_id: string | null;
  official_alert_id: string | null;
  hazard_record_id: number | null;
  strategy: Strategy;
  drrm_area: DrrmArea;
  priority: Priority;
  owner_office: string | null;
  due_on: string | null;
  cost_php: number | null;
  status: ActionStatus;
  decision_note: string | null;
  decided_at: string | null;
  progress: number;
  last_update: string | null;
  outcome: string | null;
  completed_at: string | null;
  created_at: string;
  ddrive_risks?: { ref: string | null; title: string; level: string | null; ddrive_risk_code: string | null } | null;
  ddrive_hazard_assessment_entries?: { hazard_event: string; main_hazard: string; risk_code: string | null } | null;
  ddrive_official_alerts?: { source: string; event: string; headline: string | null; signal_level: number | null } | null;
  ddrive_hazards?: { name: string; location: string; severity: string } | null;
}

// ISO 31000:2018, 6.5.2 risk treatment options.
export const STRATEGY_LABEL: Record<Strategy, string> = {
  avoid: 'Avoid the risk (do not start or stop the activity)',
  reduce_likelihood: 'Reduce the likelihood',
  reduce_consequences: 'Reduce the consequences',
  share: 'Share the risk (insurance, partners, contracts)',
  retain: 'Retain the risk, by informed decision',
};
export const STRATEGY_SHORT: Record<Strategy, string> = {
  avoid: 'Avoid', reduce_likelihood: 'Reduce likelihood', reduce_consequences: 'Reduce consequences', share: 'Share', retain: 'Retain',
};

// RA 10121 and the NDRRMP's four thematic areas.
export const AREA_LABEL: Record<DrrmArea, string> = {
  prevention_mitigation: 'Prevention and mitigation',
  preparedness: 'Preparedness',
  response: 'Response',
  rehabilitation_recovery: 'Rehabilitation and recovery',
};

export const PRIORITY_LABEL: Record<Priority, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

export const STATUS_LABEL: Record<ActionStatus, string> = {
  proposed: 'Proposed, awaiting decision',
  approved: 'Approved',
  declined: 'Declined',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const ORIGIN_LABEL: Record<ActionOrigin, string> = { diagnosis: 'From Diagnosis', detection: 'From Detection', manual: 'Entered in Response' };

/** Suggested priority from a register risk level or a DDRiVE rating; the proposer can change it. */
export function priorityFor(level: string | null | undefined, ddriveCode?: string | null): Priority {
  const l = (level ?? '').toLowerCase();
  if (l === 'critical' || /^VH/.test(ddriveCode ?? '')) return 'critical';
  if (l === 'high' || /^H/.test(ddriveCode ?? '')) return 'high';
  if (l === 'low' || /^(VL|L)/.test(ddriveCode ?? '')) return 'low';
  return 'medium';
}

/** What an action responds to, in words. */
export function sourceText(a: ResponseAction): string {
  if (a.ddrive_hazard_assessment_entries) {
    const e = a.ddrive_hazard_assessment_entries;
    return `DDRiVE assessment: ${e.hazard_event} (${e.main_hazard})${e.risk_code ? `, rated ${e.risk_code}` : ''}`;
  }
  if (a.ddrive_risks) return `Risk ${a.ddrive_risks.ref ?? ''} ${a.ddrive_risks.title}${a.ddrive_risks.level ? `, ${a.ddrive_risks.level}` : ''}`.replace(/\s+/g, ' ');
  if (a.ddrive_official_alerts) {
    const o = a.ddrive_official_alerts;
    return `${o.source} alert: ${o.signal_level ? `Wind Signal No. ${o.signal_level}` : o.event}`;
  }
  if (a.ddrive_hazards) return `Hazard report: ${a.ddrive_hazards.name}, ${a.ddrive_hazards.location}`;
  return 'Entered directly';
}

type Res<T> = { data: T; error: string | null };
function friendly(message: string): string {
  if (/row-level security|permission denied/i.test(message)) return 'Your role does not allow this. Ask your organisation administrator if you need it.';
  if (/violates check constraint/i.test(message)) return 'One of the values is not allowed. Check the form and try again.';
  return message;
}
const done = (error: { message: string } | null) => ({ error: error ? friendly(error.message) : null });

const SELECT = '*, ddrive_risks(ref, title, level, ddrive_risk_code), ddrive_hazard_assessment_entries(hazard_event, main_hazard, risk_code), '
  + 'ddrive_official_alerts(source, event, headline, signal_level), ddrive_hazards(name, location, severity)';

export interface ActionFilter { riskId?: string; entryId?: string; alertId?: string; hazardRecordId?: number }

export async function listActions(f: ActionFilter = {}): Promise<Res<ResponseAction[]>> {
  let q = supabase.from('ddrive_response_actions').select(SELECT).order('created_at', { ascending: false });
  if (f.riskId) q = q.eq('risk_id', f.riskId);
  if (f.entryId) q = q.eq('hazard_entry_id', f.entryId);
  if (f.alertId) q = q.eq('official_alert_id', f.alertId);
  if (f.hazardRecordId != null) q = q.eq('hazard_record_id', f.hazardRecordId);
  const { data, error } = await q;
  return { data: (data as unknown as ResponseAction[]) ?? [], error: error ? friendly(error.message) : null };
}

export interface NewAction {
  title: string;
  description: string | null;
  origin: ActionOrigin;
  risk_id?: string | null;
  hazard_entry_id?: string | null;
  official_alert_id?: string | null;
  hazard_record_id?: number | null;
  strategy: Strategy;
  drrm_area: DrrmArea;
  priority: Priority;
  owner_office: string | null;
  due_on: string | null;
  cost_php: number | null;
}
export async function proposeAction(a: NewAction) {
  const { error } = await supabase.from('ddrive_response_actions').insert(a);
  return done(error);
}
export async function reassignAction(id: string, owner_office: string | null, due_on: string | null) {
  const { error } = await supabase.from('ddrive_response_actions').update({ owner_office, due_on }).eq('id', id);
  return done(error);
}
const step = async (fn: string, args: Record<string, unknown>) => done((await supabase.rpc(fn, args)).error);
export const decideAction = (id: string, approve: boolean, note: string) => step('ddrive_response_decide', { p_id: id, p_approve: approve, p_note: note || null });
export const reportProgress = (id: string, progress: number, update: string) => step('ddrive_response_progress', { p_id: id, p_progress: progress, p_update: update });
export const completeAction = (id: string, outcome: string) => step('ddrive_response_complete', { p_id: id, p_outcome: outcome });
export const cancelAction = (id: string, reason: string) => step('ddrive_response_cancel', { p_id: id, p_reason: reason });
