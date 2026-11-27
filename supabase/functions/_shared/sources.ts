// Readers for official sources that do not publish CAP: USGS earthquakes (FDSN GeoJSON) and GDACS (GeoJSON event list).
// Each turns the agency's JSON into the shape ddrive_apply_official_alert() takes, keeping the agency's values as published
// and the original feature as the raw payload (ADR-005). Pure functions, so they are tested without the network.
import type { ParsedAlert } from './cap.ts';

/** A ParsedAlert plus the fields non-CAP sources add (all optional for CAP sources). */
export interface SourceAlert extends ParsedAlert {
  raw_format: 'cap-xml' | 'usgs-geojson' | 'gdacs-geojson';
  event_key: string | null;
  latitude: number | null;
  longitude: number | null;
  depth_km: number | null;
  magnitude: number | null;
  magnitude_type: string | null;
  alert_level: string | null;
  tsunami_flag: boolean | null;
  country_codes: string[];
  hazard_type?: string;
}

/** [minLon, minLat, maxLon, maxLat] */
export type BBox = [number, number, number, number];

/** Default region: the Philippine Area of Responsibility with a margin (115–135°E, 5–25°N, plus about 1–2°). */
export const DEFAULT_BBOX: BBox = [114, 2, 136, 26];

export function parseBbox(v: string | undefined | null): BBox {
  if (!v) return DEFAULT_BBOX;
  const n = v.split(',').map((x) => Number(x.trim()));
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x)) || n[0] >= n[2] || n[1] >= n[3]
      || n[0] < -180 || n[2] > 180 || n[1] < -90 || n[3] > 90) {
    throw new Error(`DETECTION_BBOX must be "minLon,minLat,maxLon,maxLat"; got "${v}"`);
  }
  return n as BBox;
}

export const inBbox = (lon: number, lat: number, b: BBox) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const hours = (iso: string, h: number) => new Date(Date.parse(iso) + h * 3_600_000).toISOString();

const empty = {
  scope: 'Public', references: null, urgency: null, severity: null, certainty: null, instruction: null,
  effective: null, onset: null, signal_level: null, region_label: null, area_codes: [] as string[],
  areas: [] as ParsedAlert['areas'],
};

// ─── USGS ────────────────────────────────────────────────────────────────────
export const USGS_LICENSE = 'USGS: public domain (U.S. Government work)';

/** The FDSN query for the last `days` days in the region, at or above the magnitude (USGS limit 20,000; we ask for 200). */
export function usgsQueryUrl(b: BBox, minMagnitude: number, now = new Date(), days = 2): string {
  const start = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 19);
  const q = new URLSearchParams({
    format: 'geojson', starttime: start, minmagnitude: String(minMagnitude), orderby: 'time', limit: '200',
    minlongitude: String(b[0]), minlatitude: String(b[1]), maxlongitude: String(b[2]), maxlatitude: String(b[3]),
  });
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?${q}`;
}

/** USGS GeoJSON FeatureCollection → one alert per earthquake reading. Revisions share event_key (the USGS id). */
export function usgsToAlerts(doc: unknown, b: BBox): SourceAlert[] {
  const features = (doc as { type?: string; features?: unknown[] })?.type === 'FeatureCollection'
    ? ((doc as { features?: unknown[] }).features ?? []) : null;
  if (!features) throw new Error('USGS response is not a GeoJSON FeatureCollection');
  const out: SourceAlert[] = [];
  for (const f of features as Record<string, unknown>[]) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const c = ((f.geometry as { coordinates?: unknown[] })?.coordinates ?? []) as unknown[];
    const id = str(f.id);
    const lon = num(c[0]), lat = num(c[1]), depth = num(c[2]);
    const time = num(p.time), updated = num(p.updated) ?? time;
    const mag = num(p.mag);
    if (!id || lon === null || lat === null || time === null || updated === null) continue;
    if (str(p.type) && p.type !== 'earthquake') continue;
    if (!inBbox(lon, lat, b)) continue;
    const sent = new Date(time).toISOString();
    const place = str(p.place) ?? 'Location not given';
    const status = str(p.status) ?? 'automatic';
    const tsunami = p.tsunami === 1;
    const magText = mag === null ? 'Magnitude not given' : `Magnitude ${mag}${str(p.magType) ? ` (${p.magType})` : ''}`;
    out.push({
      ...empty,
      source: 'USGS',
      identifier: `${id}@${updated}`,
      event_key: id,
      sender: 'USGS National Earthquake Information Center',
      sent,
      status: 'Actual',
      // USGS marks withdrawn events "deleted": that ends every reading of the event.
      msg_type: status === 'deleted' ? 'Cancel' : 'Alert',
      event: 'Earthquake',
      category: 'Geo',
      headline: str(p.title) ?? `${magText} – ${place}`,
      description: [
        `${magText}, depth ${depth === null ? 'not given' : `${depth} km`}. ${place}.`,
        `USGS review status: ${status}.`,
        tsunami ? 'USGS notes that tsunami information may exist for this event: check PHIVOLCS and the Pacific Tsunami Warning Center.' : '',
        'Preliminary international reading. PHIVOLCS issues the official earthquake information for the Philippines.',
      ].filter(Boolean).join(' '),
      expires: hours(sent, 24),
      web: str(p.url),
      area_names: [place],
      cap_url: str(p.url) ?? `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
      license: USGS_LICENSE,
      raw_xml: JSON.stringify(f),
      raw_format: 'usgs-geojson',
      latitude: lat,
      longitude: lon,
      depth_km: depth,
      magnitude: mag,
      magnitude_type: str(p.magType),
      alert_level: str(p.alert),   // PAGER colour, when USGS has issued one
      tsunami_flag: tsunami,
      country_codes: [],
      hazard_type: 'earthquake',
    });
  }
  return out;
}

// ─── GDACS ───────────────────────────────────────────────────────────────────
export const GDACS_LICENSE = 'GDACS, a cooperation of the United Nations and the European Commission; see gdacs.org for terms of use';
export const GDACS_TYPES: Record<string, { event: string; hazard: string }> = {
  EQ: { event: 'Earthquake', hazard: 'earthquake' },
  TC: { event: 'Tropical cyclone', hazard: 'tropical_cyclone' },
  FL: { event: 'Flood', hazard: 'flood' },
  VO: { event: 'Volcanic eruption', hazard: 'volcano' },
  DR: { event: 'Drought', hazard: 'drought' },
  WF: { event: 'Wildfire', hazard: 'wildfire' },
};

export function gdacsQueryUrl(now = new Date(), days = 30): string {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const q = new URLSearchParams({
    eventlist: Object.keys(GDACS_TYPES).join(';'),
    fromdate: d(new Date(now.getTime() - days * 86_400_000)),
    todate: d(now),
    alertlevel: 'green;orange;red',
  });
  return `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${q}`;
}

// GDACS writes times without a zone; they are UTC.
const utc = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const iso = /[zZ]|[+-][0-9]{2}:?[0-9]{2}$/.test(s) ? s : `${s}Z`;
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
};

/**
 * GDACS event list → one alert per event episode, kept when the event's point lies in the region or one of the
 * countries is affected. Revisions share event_key (type + event id).
 */
export function gdacsToAlerts(doc: unknown, b: BBox, countries: string[] = ['PHL']): SourceAlert[] {
  const features = (doc as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) throw new Error('GDACS response has no features list');
  const out: SourceAlert[] = [];
  for (const f of features as Record<string, unknown>[]) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const type = str(p.eventtype);
    const meta = type ? GDACS_TYPES[type] : undefined;
    const eventId = p.eventid, episode = p.episodeid;
    const c = ((f.geometry as { coordinates?: unknown[] })?.coordinates ?? []) as unknown[];
    const lon = num(c[0]), lat = num(c[1]);
    if (!meta || eventId == null || lon === null || lat === null) continue;
    const affected = Array.isArray(p.affectedcountries)
      ? (p.affectedcountries as Record<string, unknown>[]).map((a) => ({ iso3: str(a.iso3), name: str(a.countryname) })).filter((a) => a.iso3)
      : [];
    const iso3 = affected.map((a) => a.iso3 as string);
    if (!inBbox(lon, lat, b) && !iso3.some((x) => countries.includes(x))) continue;
    const from = utc(p.fromdate), to = utc(p.todate), modified = utc(p.datemodified) ?? from;
    if (!modified) continue;
    const level = str(p.alertlevel);
    const severityText = str((p.severitydata as Record<string, unknown> | undefined)?.severitytext);
    const url = (p.url ?? {}) as Record<string, unknown>;
    const report = str(url.report) ?? `https://www.gdacs.org/report.aspx?eventid=${eventId}&eventtype=${type}`;
    const expires = type === 'EQ' ? hours(from ?? modified, 72) : hours(to ?? modified, 48);
    out.push({
      ...empty,
      source: 'GDACS',
      identifier: `${type}${eventId}-${episode ?? 0}`,
      event_key: `${type}${eventId}`,
      sender: 'GDACS',
      sent: modified,
      status: 'Actual',
      msg_type: 'Alert',
      event: meta.event,
      category: type === 'EQ' || type === 'VO' ? 'Geo' : type === 'WF' ? 'Fire' : 'Met',
      headline: str(p.name) ?? meta.event,
      description: [
        str(p.description),
        level ? `GDACS alert level: ${level}.` : '',
        severityText ? `${severityText}.` : '',
        from ? `From ${from.slice(0, 10)}${to ? ` to ${to.slice(0, 10)}` : ''} (UTC).` : '',
        'Global multi-hazard alert from GDACS. PAGASA and PHIVOLCS issue the official warnings for the Philippines.',
      ].filter(Boolean).join(' '),
      effective: from,
      expires,
      web: report,
      area_names: affected.map((a) => a.name ?? (a.iso3 as string)),
      cap_url: report,
      license: GDACS_LICENSE,
      raw_xml: JSON.stringify(f),
      raw_format: 'gdacs-geojson',
      latitude: lat,
      longitude: lon,
      depth_km: null,
      magnitude: type === 'EQ' ? num((p.severitydata as Record<string, unknown> | undefined)?.severity) : null,
      magnitude_type: null,
      alert_level: level,
      tsunami_flag: null,
      country_codes: iso3,
      hazard_type: meta.hazard,
    });
  }
  return out;
}

// ─── One pass over a JSON source ─────────────────────────────────────────────
export interface JsonSourceDeps {
  fetchText: (url: string) => Promise<string>;
  knownIdentifiers: (source: string, ids: string[]) => Promise<Set<string>>;
  apply: (alert: SourceAlert) => Promise<'new' | 'exists'>;
  recordRun: (run: { source: string; started: string; ok: boolean; seen: number; added: number; error: string | null }) => Promise<void>;
}

/** Reads one JSON source, stores readings not yet stored (oldest first, at most `max`), and records the run. Never throws. */
/** HTTPS only; plain HTTP is accepted for this machine's loopback address, which local tests use. */
export function sourceUrlAllowed(u: URL): boolean {
  if (u.protocol === 'https:') return true;
  return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
}

export async function ingestJsonSource(
  opts: { source: string; url: string; convert: (doc: unknown) => SourceAlert[]; max?: number },
  deps: JsonSourceDeps,
): Promise<{ ok: boolean; seen: number; added: number; failed: string[] }> {
  const started = new Date().toISOString();
  const failed: string[] = [];
  let seen = 0;
  let added = 0;
  try {
    const u = new URL(opts.url);
    if (!sourceUrlAllowed(u)) throw new Error(`refusing a non-https source: ${opts.url}`);
    const alerts = opts.convert(JSON.parse(await deps.fetchText(opts.url)));
    seen = alerts.length;
    const known = await deps.knownIdentifiers(opts.source, alerts.map((a) => a.identifier));
    const fresh = alerts.filter((a) => !known.has(a.identifier)).sort((a, b) => Date.parse(a.sent) - Date.parse(b.sent));
    for (const a of fresh.slice(0, opts.max ?? 200)) {
      try {
        if ((await deps.apply(a)) === 'new') added += 1;
      } catch (e) {
        failed.push(`${a.identifier}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const ok = failed.length === 0;
    await deps.recordRun({ source: opts.source, started, ok, seen, added, error: ok ? null : failed.join('\n') });
    return { ok, seen, added, failed };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await deps.recordRun({ source: opts.source, started, ok: false, seen, added, error: message });
    return { ok: false, seen, added, failed: [message] };
  }
}
