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
  /** True when the alert covers one of the active organisation's watch areas (or lies within a watch point's radius). */
  in_watch_area: boolean;
  // Sources other than CAP (ADR-005). Values as the agency published them; null when not given.
  raw_format: 'cap-xml' | 'usgs-geojson' | 'gdacs-geojson';
  event_key: string | null;
  latitude: number | null;
  longitude: number | null;
  depth_km: number | null;
  magnitude: number | null;
  magnitude_type: string | null;
  /** GDACS alert level (Green, Orange, Red) or USGS PAGER colour (green … red). */
  alert_level: string | null;
  tsunami_flag: boolean | null;
  country_codes: string[];
  /** Normalised hazard type, used to match alerts with assessed risks. */
  hazard_type: string | null;
  /** Distance to the organisation's nearest watch point, in km. */
  nearest_watch_km: number | null;
}

/** The official sources DDRiVE-M reads, how often they are checked, and who is authoritative. */
export const SOURCES = [
  { key: 'PAGASA', label: 'PAGASA-DOST', kind: 'Official Philippine weather, flood and tropical cyclone warnings', staleMinutes: 30, home: 'https://www.pagasa.dost.gov.ph/' },
  { key: 'PTWC', label: 'NOAA Pacific Tsunami Warning Center', kind: 'Regional tsunami messages for the Pacific. PHIVOLCS issues Philippine tsunami warnings', staleMinutes: 30, home: 'https://www.tsunami.gov/' },
  { key: 'USGS', label: 'USGS (international)', kind: 'Preliminary earthquake readings. PHIVOLCS issues the official Philippine earthquake information', staleMinutes: 60, home: 'https://earthquake.usgs.gov/' },
  { key: 'GDACS', label: 'GDACS (UN / European Commission)', kind: 'Global multi-hazard alert levels for earthquakes, cyclones, floods, volcanoes, droughts and wildfires', staleMinutes: 60, home: 'https://www.gdacs.org/' },
] as const;
export type SourceKey = (typeof SOURCES)[number]['key'];

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
  'id, source, identifier, sender, sent, msg_type, event, urgency, severity, certainty, headline, description, instruction, expires, web, signal_level, region_label, area_names, area_codes, cap_url, license, in_watch_area, raw_format, event_key, latitude, longitude, depth_km, magnitude, magnitude_type, alert_level, tsunami_flag, country_codes, hazard_type, nearest_watch_km';

export function useOfficialAlerts() {
  const tenantId = useAuth().activeTenant?.tenant_id ?? null;
  const [alerts, setAlerts] = useState<OfficialAlert[]>([]);
  const [feed, setFeed] = useState<FeedStatus>({ source: 'PAGASA', lastChecked: null, lastOk: null, lastError: null });
  const [feeds, setFeeds] = useState<FeedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const [a, runs] = await Promise.all([
      supabase.from('ddrive_active_alerts').select(ALERT_COLUMNS),
      supabase.from('ddrive_ingest_runs').select('source, started_at, finished_at, ok, error').in('source', SOURCES.map((x) => x.key))
        .order('started_at', { ascending: false }).limit(400),
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
    const rows = (runs.data ?? []) as { source: string; started_at: string; finished_at: string | null; ok: boolean | null; error: string | null }[];
    const status = (source: string): FeedStatus => {
      const mine = rows.filter((r) => r.source === source);
      const last = mine[0];
      const lastOk = mine.find((r) => r.ok);
      return {
        source,
        lastChecked: last ? new Date(last.finished_at ?? last.started_at) : null,
        lastOk: lastOk ? new Date(lastOk.finished_at ?? lastOk.started_at) : null,
        lastError: last && !last.ok ? last.error : null,
      };
    };
    setFeed(status('PAGASA'));
    setFeeds(SOURCES.map((x) => status(x.key)));
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

  return { alerts, inArea, maxSignalInArea, feed, feeds, stale, loading, error, refetch };
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

/** True when a source has not been read successfully within its expected interval. */
export const isStale = (f: FeedStatus) => {
  const m = SOURCES.find((x) => x.key === f.source)?.staleMinutes ?? FEED_STALE_MINUTES;
  return !f.lastOk || Date.now() - f.lastOk.getTime() > m * 60_000;
};

/** What a person should read first: the wind signal when there is one, a magnitude for earthquakes, else the event name. */
export const alertTitle = (a: Pick<OfficialAlert, 'signal_level' | 'event' | 'magnitude' | 'raw_format' | 'headline'>) =>
  a.signal_level ? `Tropical Cyclone Wind Signal No. ${a.signal_level}`
    : a.raw_format === 'usgs-geojson' && a.magnitude != null ? `Earthquake M ${a.magnitude}`
    : a.raw_format === 'gdacs-geojson' && a.headline ? a.headline
    : a.event;
