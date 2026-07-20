import { useEffect, useState, useCallback } from 'react';
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
  compliance: number;
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
export function useTable<T>(table: string, orderBy: string = 'created_at', ascending = false) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending });

      // ✅ FIX: Always ensure data is an array
      if (error) {
        console.error(`[Supabase Error] ${table}:`, error.message);
        setData([]);
      } else if (rows && Array.isArray(rows)) {
        setData(rows as T[]);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(`[Fetch Error] ${table}:`, err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, ascending]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

// ─── Realtime-Enabled Hook ────────────────────────────────────────────────────
export function useRealtimeTable<T>(table: string, orderBy: string = 'created_at', ascending = false) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .then(({ data: rows, error }) => {
        if (error) {
          console.error(`[Initial Fetch Error] ${table}:`, error.message);
          setData([]);
        } else if (rows && Array.isArray(rows)) {
          setData(rows as T[]);
        } else {
          setData([]);
        }
        setLoading(false);
      });
  }, [table, orderBy, ascending]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel(`${table}_realtime`);

    const handleChanges = (payload: any) => {
      // ✅ FIX: Validate payload structure before processing
      if (!payload || !payload.eventType) {
        console.warn('[Realtime Warning] Invalid payload:', payload);
        return;
      }

      // Safe data mutation helper
      const safeUpdate = (current: T[]) => {
        let updated = [...current];

        if (payload.eventType === 'INSERT') {
          if (payload.new && typeof payload.new === 'object') {
            updated.push(payload.new as T);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new && typeof payload.new === 'object') {
            // Safe ID comparison using loose equality
            const newId = (payload.new as any)?.id;
            if (newId != null) {
              updated = updated.map(row => ((row as any)?.id == newId) ? { ...payload.new } as T : row);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as any)?.id;
          if (oldId != null) {
            updated = updated.filter(row => (row as any)?.id != oldId);
          }
        }

        // Maintain sort order after mutation
        return updated.sort((a, b) => {
          const valA = (a as any)[orderBy];
          const valB = (b as any)[orderBy];
          if (valA == null && valB == null) return 0;
          if (valA == null) return 1;
          if (valB == null) return -1;
          if (typeof valA === 'string' || typeof valA === 'number') {
            return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
          }
          return 0;
        });
      };

      setData(safeUpdate);
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table }, handleChanges)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[Supabase] Channel ${table}_realtime status:`, status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, orderBy, ascending]);

  return { data, loading };
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
      const state = channel.presence.state();
      const users = Object.values(state).flat() as PresenceUser[];
      // ✅ FIX: Ensure array before setting state
      setOnlineUsers(Array.isArray(users) ? users : []);
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

export function useMessages() {
  const result = useRealtimeTable<Message>('ddrive_messages', 'created_at', false);
  return {
    ...result,
    data: (result.data || []).map(m => ({ ...m, time: timeAgo(m.created_at) })),
  };
}

export function useDocuments() {
  return useTable<DocumentRow>('ddrive_documents', 'updated_at', false);
}

// ─── CRUD Helpers ─────────────────────────────────────────────────────────────
export async function insertRow(table: string, row: any) {
  return await supabase.from(table).insert(row).select();
}

export async function updateRow(table: string, id: any, patch: any, idCol: string = 'id') {
  return await supabase.from(table).update(patch).eq(idCol, id).select();
}

export { timeAgo };