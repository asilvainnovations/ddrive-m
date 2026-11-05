// Every write the app makes, as one named function per thing a person does.
// The database decides whether it is allowed (Row Level Security, ADR-001) and stamps the organisation,
// author, time, id and reference number. These functions never send those fields.
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/roles';

export type ActionResult = { error: string | null };

const result = (error: { message: string } | null): ActionResult => ({ error: error ? friendly(error.message) : null });

// Turn database refusals into sentences a person can act on.
function friendly(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return 'Your role does not allow this. Ask your organisation administrator if you need it.';
  }
  if (/violates check constraint/i.test(message)) {
    return 'One of the values is not allowed. Check the form and try again.';
  }
  return message;
}

// ─── Phase 1 · Detection ──────────────────────────────────────────────────────
export interface NewHazard {
  agency: string;
  type: string;
  name: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  lat: number;
  lng: number;
  psgc_code?: string | null;
  /** The official alert this record was logged from, if any. */
  official_alert_id?: string | null;
  source_url?: string | null;
}

export async function reportHazard(h: NewHazard): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_hazards').insert({ ...h, status: 'Active' });
  return result(error);
}

// ─── Phase 2 · Diagnosis ──────────────────────────────────────────────────────
export interface NewRisk {
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  owner: string;
}

/** Score and level are computed by the database from the organisation's risk criteria. */
export async function addRisk(r: NewRisk): Promise<{ error: string | null; ref?: string }> {
  const { data, error } = await supabase.from('ddrive_risks').insert({ ...r, status: 'Open' }).select('ref').single();
  return { ...result(error), ref: (data as { ref: string } | null)?.ref };
}

// ─── Phase 3 · Response ───────────────────────────────────────────────────────
export async function setIncidentProgress(id: string, progress: number): Promise<ActionResult> {
  const clamped = Math.max(0, Math.min(100, progress));
  const { error } = await supabase
    .from('ddrive_incidents')
    .update({ progress: clamped, status: clamped >= 100 ? 'Completed' : 'In Progress' })
    .eq('id', id);
  return result(error);
}

// ─── Phase 5 · Validation ─────────────────────────────────────────────────────
export async function recordParticipation(scenarioId: number | string): Promise<ActionResult> {
  const { error } = await supabase.rpc('ddrive_record_participation', { p_scenario_id: String(scenarioId) });
  return result(error);
}

// ─── Phase 6 · Enhancement ────────────────────────────────────────────────────
export interface NewPlan {
  title: string;
  type: string;
  standard: string;
}

/** New plans are always drafts; approval is a separate step for DRRM officers. */
export async function draftPlan(p: NewPlan): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_plans').insert({ ...p, compliance: null });
  return result(error);
}

export async function setPlanStatus(id: string, status: 'In Review' | 'Approved' | 'Retired'): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_plans').update({ status }).eq('id', id);
  return result(error);
}

// ─── Phase 7 · Monitoring ─────────────────────────────────────────────────────
/** The sender's name and role are stamped by the database. Critical messages need a DRRM officer. */
export async function sendMessage(message: string, priority: 'low' | 'medium' | 'high' | 'critical'): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_messages').insert({ message, priority });
  return result(error);
}

// ─── Documents ────────────────────────────────────────────────────────────────
export async function registerDocument(d: { name: string; category: string; size: string | null }): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_documents').insert(d);
  return result(error);
}

// ─── Organisation administration ──────────────────────────────────────────────
export interface Member {
  user_id: string;
  role: Role;
  status: string;
  full_name: string | null;
  email: string | null;
}

export async function listMembers(tenantId: string): Promise<{ data: Member[]; error: string | null }> {
  const { data: rows, error } = await supabase
    .from('ddrive_memberships')
    .select('user_id, role, status')
    .eq('tenant_id', tenantId);
  if (error) return { data: [], error: friendly(error.message) };
  const ids = (rows ?? []).map((r) => r.user_id as string);
  const { data: people } = ids.length
    ? await supabase.from('ddrive_users').select('id, full_name, email').in('id', ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
  return {
    data: (rows ?? [])
      .map((r) => ({
        user_id: r.user_id as string,
        role: r.role as Role,
        status: r.status as string,
        full_name: byId.get(r.user_id as string)?.full_name ?? null,
        email: byId.get(r.user_id as string)?.email ?? null,
      }))
      .sort((a, b) => (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? '')),
    error: null,
  };
}

/** Adds an existing account by email, or changes its role. Administrators only. */
export async function addOrUpdateMember(tenantId: string, email: string, role: Role): Promise<ActionResult> {
  const { error } = await supabase.rpc('ddrive_add_member', { p_tenant: tenantId, p_email: email, p_role: role });
  return result(error);
}

export async function removeMember(tenantId: string, userId: string): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_memberships').delete().eq('tenant_id', tenantId).eq('user_id', userId);
  return result(error);
}

export async function getRiskThresholds(tenantId: string): Promise<{ critical: number; high: number; medium: number } | null> {
  const { data } = await supabase.from('ddrive_tenants').select('risk_thresholds').eq('id', tenantId).maybeSingle();
  return (data?.risk_thresholds as { critical: number; high: number; medium: number } | undefined) ?? null;
}

export async function setRiskThresholds(tenantId: string, critical: number, high: number, medium: number): Promise<ActionResult> {
  const { error } = await supabase.rpc('ddrive_set_risk_thresholds', {
    p_tenant: tenantId, p_critical: critical, p_high: high, p_medium: medium,
  });
  return result(error);
}

// ─── Watch areas (provinces whose official alerts an organisation follows) ────
export interface WatchArea {
  id: string;
  label: string;
  psgc_code: string | null;
}

export async function listWatchAreas(tenantId: string): Promise<WatchArea[]> {
  const { data } = await supabase.from('ddrive_watch_areas').select('id, label, psgc_code').eq('tenant_id', tenantId).order('label');
  return (data ?? []) as WatchArea[];
}

/** Province name as the agency writes it (e.g. "Leyte"); the PSGC code is optional (9 or 10 digits). DRRM officer or above. */
export async function addWatchArea(label: string, psgcCode: string | null): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_watch_areas').insert({ label: label.trim(), psgc_code: psgcCode || null });
  if (error && /duplicate key/i.test(error.message)) return { error: `${label.trim()} is already a watch area.` };
  return result(error);
}

export async function removeWatchArea(id: string): Promise<ActionResult> {
  const { error } = await supabase.from('ddrive_watch_areas').delete().eq('id', id);
  return result(error);
}
