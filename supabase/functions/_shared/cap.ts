// Parser for CAP 1.2 alerts and the Atom feeds that list them (OASIS CAP 1.2; OASIS CAP feeds 1.0).
// Written for PAGASA's feed but kept to the standard, so other agencies' CAP feeds can use it.
// Pure TypeScript with one dependency, so it runs in Supabase Edge Functions (Deno) and in tests.
import { XMLParser } from 'npm:fast-xml-parser@4.5.1';

export interface FeedEntry {
  /** Entry id with any "urn:uuid:" prefix removed; for PAGASA this equals the CAP identifier. */
  id: string;
  title: string;
  updated: string;
  /** Link to the full CAP document. */
  capUrl: string;
}

export interface CapArea {
  desc: string;
  geocodes: { name: string; value: string }[];
  polygons: string[];
  circles: string[];
}

/** One alert, shaped for ddrive_apply_official_alert(). CAP values are kept verbatim. */
export interface ParsedAlert {
  source: string;
  identifier: string;
  sender: string;
  sent: string;
  status: string;
  msg_type: string;
  scope: string | null;
  references: string | null;
  event: string;
  category: string | null;
  urgency: string | null;
  severity: string | null;
  certainty: string | null;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  effective: string | null;
  onset: string | null;
  expires: string | null;
  web: string | null;
  /** PAGASA "Public Storm Warning Signal Level" (1–5). PAGASA marks every alert's CAP severity "Minor",
   *  so the signal number, not the severity, says how strong the winds are. */
  signal_level: number | null;
  region_label: string | null;
  area_names: string[];
  /** PSGC codes from SAME (or PSGC) geocodes, verbatim. PAGASA uses 9-digit codes. */
  area_codes: string[];
  areas: CapArea[];
  cap_url: string;
  license: string | null;
  raw_xml: string;
}

const ARRAYS = new Set(['entry', 'link', 'info', 'area', 'geocode', 'parameter', 'polygon', 'circle', 'resource']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ARRAYS.has(name),
});

type Node = Record<string, unknown>;

const text = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && '#text' in (v as Node)) return text((v as Node)['#text']);
  return null;
};

const list = (v: unknown): Node[] => (Array.isArray(v) ? (v as Node[]) : v ? [v as Node] : []);

const isoOrNull = (v: unknown): string | null => {
  const s = text(v);
  if (!s) return null;
  if (Number.isNaN(Date.parse(s))) throw new Error(`Not a valid date: ${s}`);
  return s;
};

/** Parses an Atom or RSS feed of CAP alerts into entries that link to CAP documents. */
export function parseFeed(xml: string): { entries: FeedEntry[]; rights: string | null } {
  const doc = parser.parse(xml) as Node;
  if (doc.feed) {
    const feed = doc.feed as Node;
    const entries = list(feed.entry).flatMap((e) => {
      const links = list(e.link);
      const cap = links.find((l) => text(l['@_type']) === 'application/cap+xml') ?? links[0];
      const href = cap ? text(cap['@_href']) : null;
      const id = (text(e.id) ?? '').replace(/^urn:uuid:/i, '');
      return href && id ? [{ id, title: text(e.title) ?? '', updated: text(e.updated) ?? '', capUrl: href }] : [];
    });
    return { entries, rights: text(feed.rights) };
  }
  if (doc.rss) {
    const channel = (doc.rss as Node).channel as Node;
    const entries = list(channel?.item).flatMap((i) => {
      const href = text(i.link);
      const id = (text(i.guid) ?? href ?? '').replace(/^urn:uuid:/i, '');
      return href && id ? [{ id, title: text(i.title) ?? '', updated: text(i.pubDate) ?? '', capUrl: href }] : [];
    });
    return { entries, rights: text(channel?.copyright) };
  }
  throw new Error('Not an Atom or RSS feed');
}

/** Parses one CAP 1.2 document. Throws when required CAP fields are missing. */
export function parseCap(xml: string, opts: { source: string; capUrl: string; license?: string | null }): ParsedAlert {
  const doc = parser.parse(xml) as Node;
  const alert = doc.alert as Node | undefined;
  if (!alert) throw new Error('Not a CAP alert');

  const identifier = text(alert.identifier);
  const sent = isoOrNull(alert.sent);
  const status = text(alert.status);
  const msgType = text(alert.msgType);
  if (!identifier || !sent || !status || !msgType) throw new Error('CAP alert lacks identifier, sent, status or msgType');

  // Prefer English when an alert carries several languages.
  const infos = list(alert.info);
  const info = infos.find((i) => /^en/i.test(text(i.language) ?? 'en')) ?? infos[0] ?? {};
  const event = text(info.event);
  if (!event) throw new Error('CAP alert lacks an event');

  const params = list(info.parameter).map((p) => ({ name: text(p.valueName) ?? '', value: text(p.value) ?? '' }));
  const signalRaw = params.find((p) => /storm warning signal level|wind signal/i.test(p.name))?.value;
  const signal = signalRaw && /^[1-5]$/.test(signalRaw) ? Number(signalRaw) : null;
  const region = params.find((p) => /^layer:Google:Region/i.test(p.name))?.value ?? null;

  const areas: CapArea[] = list(info.area).map((a) => ({
    desc: text(a.areaDesc) ?? '',
    geocodes: list(a.geocode).map((g) => ({ name: text(g.valueName) ?? '', value: text(g.value) ?? '' })),
    polygons: list(a.polygon).map((p) => text(p) ?? '').filter(Boolean),
    circles: list(a.circle).map((c) => text(c) ?? '').filter(Boolean),
  }));

  const codes = areas
    .flatMap((a) => a.geocodes)
    .filter((g) => /^(SAME|PSGC)$/i.test(g.name) && /^[0-9]{9,10}$/.test(g.value))
    .map((g) => g.value);

  return {
    source: opts.source,
    identifier,
    sender: text(alert.sender) ?? opts.source,
    sent,
    status,
    msg_type: msgType,
    scope: text(alert.scope),
    references: text(alert.references),
    event,
    category: text(info.category),
    urgency: text(info.urgency),
    severity: text(info.severity),
    certainty: text(info.certainty),
    headline: text(info.headline),
    description: text(info.description),
    instruction: text(info.instruction),
    effective: isoOrNull(info.effective),
    onset: isoOrNull(info.onset),
    expires: isoOrNull(info.expires),
    web: text(info.web),
    signal_level: signal,
    region_label: region,
    area_names: [...new Set(areas.map((a) => a.desc).filter(Boolean))],
    area_codes: [...new Set(codes)],
    areas,
    cap_url: opts.capUrl,
    license: opts.license ?? null,
    raw_xml: xml,
  };
}
