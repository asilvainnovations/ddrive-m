import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Official alerts are public agency information, shared by every organisation. They are written only by the
// ingest service (supabase/functions/ingest-pagasa) and never edited. CAP fields are kept verbatim.
export interface OfficialAlert {
  id: string;
  source: string;
  identifier: string;
  sender: string | null;
  sent: string;
  msg_type: string;
  event: string;
  urgency: string | null;
  severity: string | null;
  certainty: string | null;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  expires: string | null;
  web: string | null;
  /** PAGASA wind signal number. PAGASA marks all alerts "Minor" in CAP, so this, not severity, shows strength. */
  signal_level: number | null;
  region_label: string | null;
  area_names: string[];
  area_codes: string[];
  cap_url: string;
  license: string | null;
  /** True when the alert covers one of the active organisation's watch areas. */
  in_watch_area: boolean;
}

export interface FeedStatus {
  source: string;
  /** Last time the feed was checked, successfully or not. */
  lastChecked: Date | null;
  /** Last time the feed was read without errors. */
  lastOk: Date | null;
  lastError: string | null;
}

/** Feed checks older than this are shown as a warning: the information may be out of date. */
export const FEED_STALE_MINUTES = 30;

const ALERT_COLUMNS =
  'id, source, identifier, sender, sent, msg_type, event, urgency, severity, certainty, headline, description, instruction, expires, web, signal_level, region_label, area_names, area_codes, cap_url, license, in_watch_area';

export function useOfficialAlerts() {
  const tenantId = useAuth().activeTenant?.tenant_id ?? null;
  const [alerts, setAlerts] = useState<OfficialAlert[]>([]);
  const [feed, setFeed] = useState<FeedStatus>({ source: 'PAGASA', lastChecked: null, lastOk: null, lastError: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const [a, runs] = await Promise.all([
      supabase.from('ddrive_active_alerts').select(ALERT_COLUMNS),
      supabase.from('ddrive_ingest_runs').select('started_at, finished_at, ok, error').eq('source', 'PAGASA')
        .order('started_at', { ascending: false }).limit(50),
    ]);
    if (a.error) { setError(a.error.message); setAlerts([]); }
    else {
      setError(null);
      // In-area first, then strongest wind signal, then newest.
      setAlerts(((a.data ?? []) as OfficialAlert[]).sort((x, y) =>
        Number(y.in_watch_area) - Number(x.in_watch_area)
        || (y.signal_level ?? 0) - (x.signal_level ?? 0)
        || Date.parse(y.sent) - Date.parse(x.sent)));
    }
    const rows = (runs.data ?? []) as { started_at: string; finished_at: string | null; ok: boolean | null; error: string | null }[];
    const last = rows[0];
    const lastOk = rows.find((r) => r.ok);
    setFeed({
      source: 'PAGASA',
      lastChecked: last ? new Date(last.finished_at ?? last.started_at) : null,
      lastOk: lastOk ? new Date(lastOk.finished_at ?? lastOk.started_at) : null,
      lastError: last && !last.ok ? last.error : null,
    });
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    void refetch();
    // The feed is checked every 10 minutes; refresh the view every 2 so new alerts show without a reload.
    const t = setInterval(() => void refetch(), 120_000);
    return () => clearInterval(t);
  }, [refetch]);

  const inArea = alerts.filter((a) => a.in_watch_area);
  const maxSignalInArea = inArea.reduce((m, a) => Math.max(m, a.signal_level ?? 0), 0) || null;
  const stale = !feed.lastOk || Date.now() - feed.lastOk.getTime() > FEED_STALE_MINUTES * 60_000;

  return { alerts, inArea, maxSignalInArea, feed, stale, loading, error, refetch };
}

/** "4 min ago", "2 h ago", or a date. */
export function ago(d: Date | null): string {
  if (!d) return 'never';
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' });
}

export const manila = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** What a person should read first: the wind signal when there is one, else the agency's event name. */
export const alertTitle = (a: OfficialAlert) =>
  a.signal_level ? `Tropical Cyclone Wind Signal No. ${a.signal_level}` : a.event;
