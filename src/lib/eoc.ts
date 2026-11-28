// EOC operations (ADR-017): status, duty roster and operations log. Rules live in the database
// (supabase/migrations/20261128010000_phase3_eoc_operations.sql); this module reads and calls them.
import { useCallback, useEffect, useState } from 'react';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type EocLevel = 'white' | 'blue' | 'red';
export type EocFunction = 'management' | 'operations' | 'planning' | 'logistics' | 'finance_admin';
export type LogType = 'situation' | 'decision' | 'resource_request' | 'communication' | 'handover';

/** Alert status as defined in the DILG Region VIII harmonised disaster response reporting SOP. The official text governs. */
export const LEVELS: Record<EocLevel, { label: string; name: string; meaning: string; badge: string }> = {
  white: { label: 'WHITE', name: 'Normal operations', meaning: 'Regular operations, monitoring and reporting. Council members work under their mandates.',
    badge: 'bg-white text-slate-900 border-slate-400 dark:bg-slate-100' },
  blue: { label: 'BLUE', name: 'Heightened alert', meaning: 'Stand-by readiness for a full-scale response: at least 50% of human and material resources available for duty or deployment.',
    badge: 'bg-blue-700 text-white border-blue-900' },
  red: { label: 'RED', name: 'Full alert', meaning: 'Highest readiness for an imminent emergency or a sudden-onset disaster: all human and material resources available; response clusters and IMT may be activated.',
    badge: 'bg-red-700 text-white border-red-900' },
};

/** NDRRMC Memo 131 s. 2018, 9.2.1 (activation or upgrading) and 9.2.7 (deactivation or downgrading). */
export const RAISE_TRIGGERS = {
  impending_hazard: 'Threat of an impending natural or human-induced hazard (9.2.1.1)',
  planned_event: 'Upcoming planned event with anticipated threat (9.2.1.2)',
  ongoing_incident: 'Ongoing incident or emergency situation (9.2.1.3)',
  support_request: 'Request for support or augmentation needing multi-stakeholder coordination (9.2.1.4)',
  ro_directive_up: 'As directed by the Responsible Official (9.2.1.5)',
} as const;
export const LOWER_TRIGGERS = {
  situation_improved: 'The situation has improved and the emergency has been alleviated (9.2.7.1)',
  no_tactical_support_needed: 'Tactical operations no longer require EOC support (9.2.7.2)',
  lower_level_can_manage: 'Lower-level EOCs or agencies can manage the situation (9.2.7.3)',
  ro_directive_down: 'As directed by the Responsible Official (9.2.7.4)',
} as const;
export const TRIGGER_LABEL: Record<string, string> = { ...RAISE_TRIGGERS, ...LOWER_TRIGGERS, initial: 'First status recorded in DDRiVE-M' };

/** Memo 131, 9.3.1. */
export const FUNCTIONS: Record<EocFunction, { label: string; does: string }> = {
  management: { label: 'Management', does: 'Overall leadership in the EOC' },
  operations: { label: 'Operations', does: 'Multi-stakeholder coordination in support of the response' },
  planning: { label: 'Planning', does: 'Information management, situation reports, action planning' },
  logistics: { label: 'Logistics', does: 'Facilities, equipment, transport, meals and medical needs of duty personnel' },
  finance_admin: { label: 'Finance / Administration', does: 'Financial and administrative concerns of the EOC' },
};
export const LOG_TYPES: Record<LogType, string> = {
  situation: 'Situation update', decision: 'Decision', resource_request: 'Resource request', communication: 'Communication', handover: 'Shift handover',
};

export const rank = (l: EocLevel) => ['white', 'blue', 'red'].indexOf(l);
/** Which triggers apply when going from `from` (none recorded = null) to `to`. */
export function triggersFor(from: EocLevel | null, to: EocLevel): Record<string, string> {
  if (from === null) return to === 'white' ? { initial: TRIGGER_LABEL.initial } : { initial: TRIGGER_LABEL.initial, ...RAISE_TRIGGERS };
  if (rank(to) > rank(from)) return { ...RAISE_TRIGGERS };
  if (rank(to) < rank(from)) return { ...LOWER_TRIGGERS };
  return {};
}

export interface EocStatus {
  id: string; ref: string; level: EocLevel; previous_level: EocLevel | null; trigger: string; basis: string; directed_by: string;
  alert_id: string | null; incident_id: string | null; effective_at: string; created_at: string;
}
export interface Duty { id: string; function: EocFunction; position: string | null; person_name: string; contact: string | null; shift_start: string; shift_end: string; status: 'scheduled' | 'on_duty' | 'completed' | 'cancelled' }
export interface LogEntry { id: string; ref: string; entry_type: LogType; function: EocFunction | null; body: string; handover_to: string | null; incident_id: string | null; created_at: string }

const STATUS_COLS = 'id, ref, level, previous_level, trigger, basis, directed_by, alert_id, incident_id, effective_at, created_at';
const err = (e: { message: string } | null) => e?.message ?? null;

export async function listStatus(limit = 50) {
  const { data, error } = await supabase.from('ddrive_eoc_status').select(STATUS_COLS).order('created_at', { ascending: false }).limit(limit);
  return { data: (data ?? []) as EocStatus[], error: err(error) };
}
export async function setStatus(level: EocLevel, trigger: string, basis: string, directedBy: string, alertId?: string | null, incidentId?: string | null) {
  const { error } = await supabase.rpc('ddrive_eoc_set_status', { p_level: level, p_trigger: trigger, p_basis: basis, p_directed_by: directedBy, p_alert_id: alertId ?? null, p_incident_id: incidentId ?? null });
  return { error: err(error) };
}
export async function listDuty(fromIso: string) {
  const { data, error } = await supabase.from('ddrive_eoc_duty').select('id, function, position, person_name, contact, shift_start, shift_end, status')
    .gte('shift_end', fromIso).order('shift_start');
  return { data: (data ?? []) as Duty[], error: err(error) };
}
export async function addDuty(d: Omit<Duty, 'id' | 'status'>) {
  const { error } = await supabase.from('ddrive_eoc_duty').insert(d);
  return { error: err(error) };
}
export async function setDutyStatus(id: string, status: Duty['status']) {
  const { error } = await supabase.from('ddrive_eoc_duty').update({ status }).eq('id', id);
  return { error: err(error) };
}
export async function deleteDuty(id: string) {
  const { error } = await supabase.from('ddrive_eoc_duty').delete().eq('id', id);
  return { error: err(error) };
}
export async function listLog(limit = 100) {
  const { data, error } = await supabase.from('ddrive_eoc_log').select('id, ref, entry_type, function, body, handover_to, incident_id, created_at')
    .order('created_at', { ascending: false }).limit(limit);
  return { data: (data ?? []) as LogEntry[], error: err(error) };
}
export async function addLog(e: { entry_type: LogType; function: EocFunction | null; body: string; handover_to?: string | null; incident_id?: string | null }) {
  const { error } = await supabase.from('ddrive_eoc_log').insert({ ...e, handover_to: e.handover_to || null, incident_id: e.incident_id || null });
  return { error: err(error) };
}

/** Who is on duty at `at` (by the roster's hours, unless the tour was cancelled or completed early). */
export const onDutyAt = (roster: Duty[], at: Date) =>
  roster.filter((d) => d.status !== 'cancelled' && d.status !== 'completed' && new Date(d.shift_start) <= at && new Date(d.shift_end) > at);

/** The organisation's current EOC status, refreshed every two minutes. `null` means none recorded yet. */
export function useEocStatus() {
  const { activeTenant } = useAuth();
  const [status, setS] = useState<EocStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!isBackendConfigured || !activeTenant) { setS(null); setLoaded(true); return; }
    const { data } = await supabase.from('ddrive_eoc_current').select(STATUS_COLS).eq('tenant_id', activeTenant.tenant_id).maybeSingle();
    setS((data as EocStatus | null) ?? null); setLoaded(true);
  }, [activeTenant]);
  useEffect(() => {
    load();
    const t = setInterval(load, 120_000);
    const onChange = () => load();
    window.addEventListener('ddrive:eoc-changed', onChange);
    return () => { clearInterval(t); window.removeEventListener('ddrive:eoc-changed', onChange); };
  }, [load]);
  return { status, loaded, reload: load };
}
export const announceEocChange = () => window.dispatchEvent(new Event('ddrive:eoc-changed'));
