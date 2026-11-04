import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Hazard {
  id: number;
  agency: string;
  type: string;
  name: string;
  severity: string;
  location: string;
  lat: number;
  lng: number;
  status: string;
  detected_at: string;
}

export interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  score: number;
  level: string;
  owner: string;
  status: string;
}

export interface Incident {
  id: string;
  title: string;
  priority: string;
  assignee_name: string;
  status: string;
  progress: number;
  eta: string;
}

export interface UndrrScore {
  id: number;
  name: string;
  score: number;
  trend: number;
  status: string;
}

export interface Scenario {
  id: number;
  name: string;
  type: string;
  difficulty: string;
  duration: string;
  participants: number;
  completion: number;
}

export interface Plan {
  id: string;
  title: string;
  type: string;
  standard: string;
  status: string;
  /** Compliance score 0–100, or null when not yet assessed. */
  compliance: number | null;
  last_updated: string;
}

export interface Message {
  id: number;
  user_name: string;
  role: string;
  message: string;
  priority: string;
  created_at: string;
  time?: string; // Added for UI convenience
}

export interface DocumentRow {
  id: string;
  name: string;
  category: string;
  size: string;
  updated_at: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  role: string;
}

// ─── Tables ───────────────────────────────────────────────────────────────────
// The only tables the browser may read or write. Anything else is a compile error.
// Real protection is Row Level Security on the server (Phase 1 migrations); this list
// stops the client code from being used as a generic writer to arbitrary tables.
export type DDriveTable =
  | 'ddrive_hazards'
  | 'ddrive_risks'
  | 'ddrive_incidents'
  | 'ddrive_undrr_scores'
  | 'ddrive_scenarios'
  | 'ddrive_plans'
  | 'ddrive_messages'
  | 'ddrive_documents';

export interface TableState<T> {
  data: T[];
  loading: boolean;
  /** Error message from the last load, or null when it succeeded. */
  error: string | null;
  /** When the data was last loaded successfully. */
  loadedAt: Date | null;
  refetch: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Standard (Non-Realtime) Hook ─────────────────────────────────────────────
export function useTable<T>(table: DDriveTable, orderBy: string = 'created_at', ascending = false): TableState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error: err } = await supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending });
      if (err) {
        console.error(`[Supabase Error] ${table}:`, err.message);
        setError(err.message);
        setData([]);
      } else {
        setError(null);
        setData(Array.isArray(rows) ? (rows as T[]) : []);
        setLoadedAt(new Date());
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[Fetch Error] ${table}:`, message);
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, ascending]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { data, loading, error, loadedAt, refetch };
}

// ─── Realtime-Enabled Hook ────────────────────────────────────────────────────
type Row = Record<string, unknown> & { id?: string | number };

interface ChangePayload {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Row;
  old?: Row;
}

export function useRealtimeTable<T>(table: DDriveTable, orderBy: string = 'created_at', ascending = false): TableState<T> {
  const base = useTable<T>(table, orderBy, ascending);
  const [live, setLive] = useState<T[] | null>(null);
  const latest = useRef<T[]>(base.data);

  // A fresh load replaces any live edits applied on top of the previous load.
  useEffect(() => {
    latest.current = base.data;
    setLive(null);
  }, [base.data]);

  useEffect(() => {
    const channel = supabase.channel(`${table}_realtime`);

    const sortRows = (rows: T[]) =>
      rows.sort((a, b) => {
        const valA = (a as Row)[orderBy];
        const valB = (b as Row)[orderBy];
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (typeof valA === 'string' || typeof valA === 'number') {
          return ascending ? (valA > (valB as typeof valA) ? 1 : -1) : (valA < (valB as typeof valA) ? 1 : -1);
        }
        return 0;
      });

    const handleChanges = (payload: ChangePayload) => {
      if (!payload?.eventType) return;
      setLive((current) => {
        let updated = [...(current ?? latest.current)];
        if (payload.eventType === 'INSERT' && payload.new) {
          updated.push(payload.new as T);
        } else if (payload.eventType === 'UPDATE' && payload.new?.id != null) {
          const newId = String(payload.new.id);
          updated = updated.map((row) => (String((row as Row).id) === newId ? (payload.new as T) : row));
        } else if (payload.eventType === 'DELETE' && payload.old?.id != null) {
          const oldId = String(payload.old.id);
          updated = updated.filter((row) => String((row as Row).id) !== oldId);
        }
        return sortRows(updated);
      });
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table }, handleChanges)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[Supabase] Channel ${table}_realtime status:`, status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, orderBy, ascending]);

  return { ...base, data: live ?? base.data };
}

// ─── Presence Hook ────────────────────────────────────────────────────────────
export function useDashboardPresence(currentUser: PresenceUser | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('dashboard_presence', {
      config: { presence: { key: currentUser.id } }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state)
        .flat()
        .map((p) => p as Partial<PresenceUser>)
        .filter((p): p is PresenceUser => typeof p.id === 'string' && typeof p.name === 'string')
        .map((p) => ({ id: p.id, name: p.name, role: p.role ?? '' }));
      setOnlineUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  return onlineUsers;
}

// ─── Table-Specific Hooks ─────────────────────────────────────────────────────
export function useHazards() {
  return useRealtimeTable<Hazard>('ddrive_hazards', 'detected_at', false);
}

export function useRisks() {
  return useTable<Risk>('ddrive_risks', 'score', false);
}

export function useIncidents() {
  return useRealtimeTable<Incident>('ddrive_incidents', 'created_at', false);
}

export function useUndrr() {
  return useTable<UndrrScore>('ddrive_undrr_scores', 'id', true);
}

export function useScenarios() {
  return useTable<Scenario>('ddrive_scenarios', 'id', true);
}

export function usePlans() {
  return useTable<Plan>('ddrive_plans', 'last_updated', false);
}

export function useMessages(): TableState<Message> {
  const result = useRealtimeTable<Message>('ddrive_messages', 'created_at', false);
  return {
    ...result,
    data: result.data.map(m => ({ ...m, time: timeAgo(m.created_at) })),
  };
}

export function useDocuments() {
  return useTable<DocumentRow>('ddrive_documents', 'updated_at', false);
}

// ─── Write Helpers ────────────────────────────────────────────────────────────
// Restricted to DDriveTable. Phase 1 replaces these with named domain functions
// (for example addHazard, closeIncident) backed by RLS-checked RPCs.
export async function insertRow<T extends object>(table: DDriveTable, row: T) {
  return await supabase.from(table).insert(row).select();
}

export async function updateRow<T extends object>(table: DDriveTable, id: string | number, patch: T, idCol: string = 'id') {
  return await supabase.from(table).update(patch).eq(idCol, id).select();
}

export { timeAgo };
