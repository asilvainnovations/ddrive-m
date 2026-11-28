// EOC activation based on contingency plans (ADR-019). Rules live in the database
// (supabase/migrations/20261128020000_phase5_validation_operations.sql); this module reads and calls them, and previews
// an activation set at a level with the same rule the database applies.
import { supabase } from '@/lib/supabase';
import type { EocFunction, EocLevel } from '@/lib/eoc';

export type ItemKind = 'cluster' | 'function';
export type ItemState = 'lead' | 'on' | 'standby';
export interface Cluster { code: string; name: string; lead_agency: string; source: string; sort: number }
export interface CpItem { id: string; plan_id: string; item_kind: ItemKind; item_code: string; state: ItemState; min_level: 'blue' | 'red'; note: string | null }
export interface ActivatedItem { kind: ItemKind; code: string; planned: ItemState; min_level: 'blue' | 'red'; state: ItemState }
export interface CpActivation {
  id: string; ref: string; plan_id: string; mode: 'live' | 'exercise'; level: 'blue' | 'red'; eoc_status_id: string | null; exercise_id: string | null;
  basis: string; plan_status: string; items: ActivatedItem[]; created_at: string;
}

export const STATE_LABEL: Record<ItemState, string> = { lead: 'Lead', on: 'On', standby: 'Standby' };

/** Same rule as ddrive_cp_activate: an item planned as standby, or whose minimum level is above the level, waits on standby. */
export function previewAt(items: Pick<CpItem, 'item_kind' | 'item_code' | 'state' | 'min_level'>[], level: Exclude<EocLevel, 'white'>): ActivatedItem[] {
  return items.map((i) => ({
    kind: i.item_kind, code: i.item_code, planned: i.state, min_level: i.min_level,
    state: (i.state === 'standby' || (level === 'blue' && i.min_level === 'red') ? 'standby' : i.state) as ItemState,
  })).sort((a, b) => a.kind.localeCompare(b.kind) || a.code.localeCompare(b.code));
}

/** Plain-language gaps in an activation set, so a plan is not activated without its essentials. */
export function setProblems(items: Pick<CpItem, 'item_kind' | 'item_code' | 'state' | 'min_level'>[]): string[] {
  const out: string[] = [];
  if (!items.length) return ['The plan has no activation set yet.'];
  const fns = new Set(items.filter((i) => i.item_kind === 'function').map((i) => i.item_code as EocFunction));
  for (const f of ['management', 'operations', 'planning', 'logistics', 'finance_admin'] as EocFunction[])
    if (!fns.has(f)) out.push(`The EOC function "${f.replace('_', '/')}" is not in the set (NDRRMC Memo 131, 9.3.1 lists five).`);
  if (!items.some((i) => i.item_kind === 'cluster' && i.state === 'lead')) out.push('No response cluster is marked as lead.');
  if (!items.some((i) => i.min_level === 'blue' && i.state !== 'standby')) out.push('Nothing comes in at BLUE: the plan does nothing until RED.');
  return out;
}

const err = (e: { message: string } | null) => e?.message ?? null;

export async function listClusters() {
  const { data, error } = await supabase.from('ddrive_response_clusters').select('*').order('sort');
  return { data: (data ?? []) as Cluster[], error: err(error) };
}
export async function listItems(planId: string) {
  const { data, error } = await supabase.from('ddrive_cp_items').select('id, plan_id, item_kind, item_code, state, min_level, note').eq('plan_id', planId);
  return { data: (data ?? []) as CpItem[], error: err(error) };
}
/** Add, change or remove one item: `state` null removes it. */
export async function setItem(planId: string, kind: ItemKind, code: string, state: ItemState | null, minLevel: 'blue' | 'red', existing?: CpItem) {
  if (state === null) {
    if (!existing) return { error: null };
    return { error: err((await supabase.from('ddrive_cp_items').delete().eq('id', existing.id)).error) };
  }
  if (existing) return { error: err((await supabase.from('ddrive_cp_items').update({ state, min_level: minLevel }).eq('id', existing.id)).error) };
  return { error: err((await supabase.from('ddrive_cp_items').insert({ plan_id: planId, item_kind: kind, item_code: code, state, min_level: minLevel })).error) };
}
export async function listActivations(limit = 30) {
  const { data, error } = await supabase.from('ddrive_cp_activations').select('id, ref, plan_id, mode, level, eoc_status_id, exercise_id, basis, plan_status, items, created_at')
    .order('created_at', { ascending: false }).limit(limit);
  return { data: (data ?? []) as CpActivation[], error: err(error) };
}
export async function activate(planId: string, basis: string, exercise?: { id: string; level: 'blue' | 'red' }) {
  const { data, error } = await supabase.rpc('ddrive_cp_activate', { p_plan_id: planId, p_basis: basis, p_exercise_id: exercise?.id ?? null, p_level: exercise?.level ?? null });
  return { id: (data as string | null) ?? null, error: err(error) };
}

/** Example triggers for Metro Manila contingency plans; the officer writes the actual basis. */
export const TRIGGER_EXAMPLES = [
  'PAGASA Tropical Cyclone Wind Signal No. 2 over Metro Manila; PDRA result',
  'PAGASA heavy rainfall warning (orange) for Metro Manila',
  'Marikina River at 16 m, Sto. Niño (2nd alarm)',
  'PAGASA storm surge warning for coastal Metro Manila',
  'PHIVOLCS earthquake bulletin: strong shaking in Metro Manila',
];
