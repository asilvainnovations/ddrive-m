// GeoJSON validation and import checks for Rapid Mapping. The same rules run again in the database
// (ddrive_rm_geom_inspect); this copy lets the analyst see every problem before anything is sent.
// Spec §8.2 (import), §9.2 (CRS policy) and §13.1 (data QA).
import type { BBox, Feature, Geometry, GeometryType, Position } from './types';

export const MAX_VERTICES = 50_000;
export const MAX_FEATURES_PER_BATCH = 5_000;
export const MAX_FEATURES_PER_LAYER = 20_000;
export const MAX_PROPERTIES_BYTES = 8_000;
export const GEOMETRY_TYPES: GeometryType[] = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];

export interface GeomResult {
  problem: string | null;
  vertices: number;
  bbox: BBox | null;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Checks one geometry. Returns the first problem (or null), the vertex count and the bounding box. */
export function inspectGeometry(g: unknown, allowed?: GeometryType[]): GeomResult {
  const res: GeomResult = { problem: null, vertices: 0, bbox: null };
  const fail = (m: string) => ({ ...res, problem: m, bbox: null });
  if (!g || typeof g !== 'object' || Array.isArray(g)) return fail('The geometry is missing.');
  const t = (g as { type?: unknown }).type;
  if (typeof t !== 'string' || !GEOMETRY_TYPES.includes(t as GeometryType)) {
    return fail(`Geometry type "${String(t ?? 'none')}" is not supported. Use Point, LineString or Polygon (or their Multi- forms).`);
  }
  if (allowed && !allowed.includes(t as GeometryType)) return fail(`A ${t} is not allowed here. Allowed: ${allowed.join(', ')}.`);
  const c = (g as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(c) || c.length === 0) return fail('The geometry has no coordinates.');

  const parts: { arr: unknown; min: number; closed: boolean }[] = [];
  switch (t) {
    case 'Point': parts.push({ arr: [c], min: 1, closed: false }); break;
    case 'MultiPoint': parts.push({ arr: c, min: 1, closed: false }); break;
    case 'LineString': parts.push({ arr: c, min: 2, closed: false }); break;
    case 'MultiLineString': c.forEach((l) => parts.push({ arr: l, min: 2, closed: false })); break;
    case 'Polygon': c.forEach((r) => parts.push({ arr: r, min: 4, closed: true })); break;
    case 'MultiPolygon':
      for (const poly of c) {
        if (!Array.isArray(poly) || poly.length === 0) return fail('A polygon in the MultiPolygon has no rings.');
        poly.forEach((r) => parts.push({ arr: r, min: 4, closed: true }));
      }
      break;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const part of parts) {
    if (!Array.isArray(part.arr)) return fail(`The coordinates are not nested correctly for a ${t}.`);
    if (part.arr.length < part.min) {
      return fail(part.closed ? 'A polygon ring needs at least 4 positions (the last repeats the first).' : `A ${t} needs at least ${part.min} positions.`);
    }
    for (const p of part.arr) {
      if (!Array.isArray(p) || p.length < 2 || p.length > 3 || !isNum(p[0]) || !isNum(p[1])) {
        return fail('Every position must be [longitude, latitude] in numbers.');
      }
      const [x, y] = p as number[];
      if (x < -180 || x > 180 || y < -90 || y > 90) {
        return fail(`Position [${x}, ${y}] is outside longitude -180..180 / latitude -90..90. The data may be in a projected CRS, not EPSG:4326.`);
      }
      res.vertices += 1;
      if (res.vertices > MAX_VERTICES) return fail('The geometry has more than 50,000 positions. Simplify it first.');
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    if (part.closed) {
      const a = part.arr as number[][];
      const f = a[0], l = a[a.length - 1];
      if (f[0] !== l[0] || f[1] !== l[1]) return fail('A polygon ring must end at its first position.');
    }
  }
  res.bbox = [minX, minY, maxX, maxY];
  return res;
}

/** Polygon → MultiPolygon, as the database stores areas of interest. */
export function toMultiPolygon(g: Geometry): Geometry {
  return g.type === 'Polygon' ? { type: 'MultiPolygon', coordinates: [g.coordinates] } : g;
}

export function bboxPolygon(minLon: number, minLat: number, maxLon: number, maxLat: number): Geometry {
  return {
    type: 'Polygon',
    coordinates: [[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]],
  };
}

export function mergeBbox(a: BBox | null, b: BBox | null): BBox | null {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

export const bboxOverlaps = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** Every position in a geometry, flattened (for drawing and checks). */
export function positions(g: Geometry): Position[] {
  switch (g.type) {
    case 'Point': return [g.coordinates];
    case 'MultiPoint': case 'LineString': return g.coordinates;
    case 'MultiLineString': case 'Polygon': return g.coordinates.flat();
    case 'MultiPolygon': return g.coordinates.flat(2);
  }
}

// ─── CRS (spec §9.2: never assume, never guess) ──────────────────────────────
const WGS84_NAMES = /^(urn:ogc:def:crs:OGC:1\.3:CRS84|urn:ogc:def:crs:OGC::CRS84|urn:ogc:def:crs:EPSG::4326|EPSG:4326|CRS84|OGC:CRS84)$/i;

export interface CrsCheck {
  crs: string;          // what we will record
  declared: string | null;
  problem: string | null;
}

/** RFC 7946 GeoJSON is always WGS 84. An older "crs" member naming anything else is refused, not reprojected. */
export function checkGeoJsonCrs(doc: unknown): CrsCheck {
  const crs = (doc as { crs?: { type?: string; properties?: { name?: string; code?: number } } })?.crs;
  if (!crs) return { crs: 'EPSG:4326', declared: null, problem: null };
  const name = crs.properties?.name ?? (crs.properties?.code != null ? `EPSG:${crs.properties.code}` : null);
  if (name && WGS84_NAMES.test(name.trim())) return { crs: 'EPSG:4326', declared: name, problem: null };
  return {
    crs: 'EPSG:4326',
    declared: name ?? 'unrecognised',
    problem: `The file declares the coordinate system "${name ?? 'unrecognised'}". DDRiVE-M stores EPSG:4326 (WGS 84) only and does not reproject in the browser. Export the layer as EPSG:4326 from QGIS (Export → Save Features As → CRS EPSG:4326) and try again.`,
  };
}

// ─── Import report ───────────────────────────────────────────────────────────
export interface FeatureProblem {
  index: number;          // 1-based, as people count
  id: string | null;
  message: string;
}

export interface ImportReport {
  features: Feature[];            // the valid ones, ready to send
  total: number;
  problems: FeatureProblem[];     // invalid features: not imported
  warnings: string[];             // imported, but someone should look
  crs: CrsCheck;
  bbox: BBox | null;
  geometryTypes: GeometryType[];
  vertices: number;
}

// Keys that often carry personal data. Spec §13.1: no prohibited personal data in shared properties.
const PERSONAL_KEYS = /(^|_)(name_of|full_?name|first_?name|last_?name|household_head|head_of_family|beneficiary|contact|phone|mobile|cell|email|birth|dob|age|sex|gender|pwd|disability|philhealth|sss|tin|4ps)($|_)/i;

const featureId = (f: { id?: unknown }) => (f.id == null ? null : String(f.id));
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v ?? {})).length;

/**
 * Checks a GeoJSON document (FeatureCollection, Feature or bare geometry) for import.
 * `aoiBbox`: features entirely outside it are flagged (spec §13.1 product/AOI relationship).
 */
export function checkFeatureCollection(doc: unknown, aoiBbox?: BBox | null): ImportReport {
  const report: ImportReport = {
    features: [], total: 0, problems: [], warnings: [], crs: checkGeoJsonCrs(doc), bbox: null, geometryTypes: [], vertices: 0,
  };
  if (!doc || typeof doc !== 'object') {
    report.problems.push({ index: 0, id: null, message: 'The file is not GeoJSON.' });
    return report;
  }
  const d = doc as { type?: string; features?: unknown; geometry?: unknown };
  let raw: unknown[];
  if (d.type === 'FeatureCollection') {
    if (!Array.isArray(d.features)) {
      report.problems.push({ index: 0, id: null, message: 'The FeatureCollection has no "features" list.' });
      return report;
    }
    raw = d.features;
  } else if (d.type === 'Feature') raw = [d];
  else if (GEOMETRY_TYPES.includes(d.type as GeometryType)) raw = [{ type: 'Feature', geometry: d, properties: {} }];
  else {
    report.problems.push({ index: 0, id: null, message: `Unknown GeoJSON type "${String(d.type)}". Expected a FeatureCollection.` });
    return report;
  }
  report.total = raw.length;
  if (report.crs.problem) {
    report.problems.push({ index: 0, id: null, message: report.crs.problem });
    return report;
  }

  const seen = new Map<string, number>();
  const types = new Set<GeometryType>();
  const personal = new Set<string>();
  let outside = 0;
  raw.forEach((f, i) => {
    const index = i + 1;
    if (!f || typeof f !== 'object' || (f as { type?: unknown }).type !== 'Feature') {
      report.problems.push({ index, id: null, message: 'Not a GeoJSON Feature.' });
      return;
    }
    const feat = f as { id?: unknown; geometry?: unknown; properties?: unknown };
    const id = featureId(feat);
    if (feat.geometry == null) {
      report.problems.push({ index, id, message: 'The feature has no geometry.' });
      return;
    }
    const g = inspectGeometry(feat.geometry);
    if (g.problem) {
      report.problems.push({ index, id, message: g.problem });
      return;
    }
    const props = feat.properties == null ? {} : feat.properties;
    if (typeof props !== 'object' || Array.isArray(props)) {
      report.problems.push({ index, id, message: 'Properties must be an object.' });
      return;
    }
    if (bytes(props) > MAX_PROPERTIES_BYTES) {
      report.problems.push({ index, id, message: 'Properties are too large (over 8 kB). Remove long text or embedded files.' });
      return;
    }
    Object.keys(props).forEach((k) => { if (PERSONAL_KEYS.test(k)) personal.add(k); });
    if (id != null) seen.set(id, (seen.get(id) ?? 0) + 1);
    types.add((feat.geometry as Geometry).type);
    report.vertices += g.vertices;
    report.bbox = mergeBbox(report.bbox, g.bbox);
    if (aoiBbox && g.bbox && !bboxOverlaps(g.bbox, aoiBbox)) outside += 1;
    report.features.push({
      type: 'Feature',
      ...(id != null ? { id } : {}),
      geometry: feat.geometry as Geometry,
      properties: props as Record<string, unknown>,
    });
  });

  report.geometryTypes = [...types];
  const dupes = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  if (dupes.length) report.warnings.push(`Duplicate feature ids: ${dupes.slice(0, 5).join(', ')}${dupes.length > 5 ? ` and ${dupes.length - 5} more` : ''}.`);
  if (outside) report.warnings.push(`${outside} feature${outside > 1 ? 's lie' : ' lies'} entirely outside the product's area of interest. Check the data or the AOI.`);
  if (personal.size) {
    report.warnings.push(`Properties that may hold personal information: ${[...personal].join(', ')}. Remove them before sharing beyond the EOC (Data Privacy Act, RA 10173).`);
  }
  if (report.features.length > MAX_FEATURES_PER_LAYER) {
    report.problems.push({ index: 0, id: null, message: `The file has ${report.features.length.toLocaleString()} valid features; a layer holds at most ${MAX_FEATURES_PER_LAYER.toLocaleString()}. Split it into several files.` });
  }
  if (report.bbox && report.bbox[0] > 100 && report.bbox[2] < 135 && report.bbox[1] > -15 && report.bbox[3] < 25) {
    // Inside Southeast Asia: plausible for DDRiVE-M tenants. Nothing to say.
  } else if (report.bbox) {
    report.warnings.push('The data lies outside Southeast Asia. If that is unexpected, longitude and latitude may be swapped.');
  }
  return report;
}

/** Reads text as GeoJSON. JSON errors become a readable problem rather than an exception. */
export function parseGeoJsonText(text: string, aoiBbox?: BBox | null): ImportReport {
  try {
    return checkFeatureCollection(JSON.parse(text), aoiBbox);
  } catch (e) {
    return {
      features: [], total: 0, warnings: [], crs: { crs: 'EPSG:4326', declared: null, problem: null }, bbox: null, geometryTypes: [], vertices: 0,
      problems: [{ index: 0, id: null, message: `The file is not valid JSON: ${(e as Error).message}` }],
    };
  }
}

/** SHA-256 of a file's bytes, as lowercase hex: recorded with the layer so the source can be matched later. */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Batches of features no larger than the server accepts per call. */
export function batches<T>(items: T[], size = MAX_FEATURES_PER_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
