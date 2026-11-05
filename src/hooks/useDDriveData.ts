import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Every row carries these, stamped by the database (Phase 1). Never sent by the app.
interface Governed {
  tenant_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Hazard extends Governed {
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
  psgc_code: string | null;
  source_url: string | null;
}

export interface Risk extends Governed {
  id: string;
  /** Reference number shown to people, issued by the database (R-001). */
  ref: string;
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  /** likelihood × impact, computed by the database. */
  score: number;
  /** From the organisation's risk criteria, computed by the database. */
  level: string;
  owner: string | null;
  status: string;
}

export interface Incident extends Governed {
  id: string;
  ref: string;
  title: string;
  priority: string;
  assignee_name: string;
  status: string;
  progress: number;
  eta: string;
}

export interface UndrrScore extends Governed {
  id: number;
  name: string;
  score: number;
  trend: number;
  status: string;
}

export interface Scenario extends Governed {
  id: number;
  name: string;
  type: string;
  difficulty: string;
  duration: string;
  participants: number;
  completion: number;
}

export interface Plan extends Governed {
  id: string;
  ref: string;
  title: string;
  type: string;
  standard: string;
  status: string;
  /** Compliance score 0–100, or null when not yet assessed. */
  compliance: number | null;
  last_updated: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface Message extends Governed {
  id: number;
  user_id: string | null;
  user_name: string;
  role: string;
  message: string;
  priority: string;
  time?: string; // Added for UI convenience
}

export interface DocumentRow extends Governed {
  id: string;
  ref: string;
  name: string;
  category: string;
  size: string | null;
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
  const tenantId = useAuth().activeTenant?.tenant_id ?? null;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const refetch = useCallback(async () => {
    if (!tenantId) {
      // Not signed in or no organisation chosen: nothing to load. The layout explains what to do.
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Row Level Security already limits rows to the user's organisations; the filter keeps it to the active one.
      const { data: rows, error: err } = await supabase
        .from(table)
        .select('*')
        .eq('tenant_id', tenantId)
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
  }, [table, orderBy, ascending, tenantId]);

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
  const tenantId = useAuth().activeTenant?.tenant_id ?? null;
  const base = useTable<T>(table, orderBy, ascending);
  const [live, setLive] = useState<T[] | null>(null);
  const latest = useRef<T[]>(base.data);

  // A fresh load replaces any live edits applied on top of the previous load.
  useEffect(() => {
    latest.current = base.data;
    setLive(null);
  }, [base.data]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel(`${table}_${tenantId}`);

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
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` }, handleChanges)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[Supabase] Channel ${table} status:`, status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, orderBy, ascending, tenantId]);

  return { ...base, data: live ?? base.data };
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

// Writes live in src/lib/actions.ts as named functions, one per thing a person does.

export { timeAgo };
