// GeoPackage (OGC 12-128r18) vector import, in the browser. SQLite is read with sql.js, loaded only when a
// .gpkg file is chosen. Only EPSG:4326 layers are accepted: anything else is reported, never reprojected (spec §9.2).
import type { Database, SqlJsStatic } from 'sql.js';
import type { Geometry, Position } from './types';

export interface GpkgLayer {
  table: string;
  srsId: number | null;
  crs: string;                 // "EPSG:4326", or what the file declares
  crsProblem: string | null;
  geometryColumn: string | null;
  doc: { type: 'FeatureCollection'; features: unknown[] } | null;   // checked afterwards by checkFeatureCollection
  skippedGeometries: { fid: string | null; message: string }[];
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Loads sql.js and its WebAssembly once, on demand. */
export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm-browser.wasm?url')]).then(([mod, wasm]) =>
      // @types/sql.js marks this option required; true is its documented default.
      mod.default({ locateFile: () => wasm.default, useOldExtensionFunctions: true }),
    );
    sqlPromise.catch(() => { sqlPromise = null; });
  }
  return sqlPromise;
}

// ─── GeoPackage binary geometry → GeoJSON ────────────────────────────────────
class Reader {
  private v: DataView;
  pos = 0;
  constructor(buf: Uint8Array) { this.v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); }
  u8() { const r = this.v.getUint8(this.pos); this.pos += 1; return r; }
  u32(le: boolean) { const r = this.v.getUint32(this.pos, le); this.pos += 4; return r; }
  i32(le: boolean) { const r = this.v.getInt32(this.pos, le); this.pos += 4; return r; }
  f64(le: boolean) { const r = this.v.getFloat64(this.pos, le); this.pos += 8; return r; }
  get left() { return this.v.byteLength - this.pos; }
}

const WKB_NAMES: Record<number, Geometry['type']> = {
  1: 'Point', 2: 'LineString', 3: 'Polygon', 4: 'MultiPoint', 5: 'MultiLineString', 6: 'MultiPolygon',
};

function readWkb(r: Reader): Geometry {
  const le = r.u8() === 1;
  let raw = r.u32(le);
  // Extended WKB flags (used by some writers) and ISO 1000/2000/3000 offsets for Z, M, ZM.
  let hasZ = (raw & 0x80000000) !== 0;
  let hasM = (raw & 0x40000000) !== 0;
  raw &= 0x0fffffff;
  if (raw >= 3000) { hasZ = true; hasM = true; raw -= 3000; }
  else if (raw >= 2000) { hasM = true; raw -= 2000; }
  else if (raw >= 1000) { hasZ = true; raw -= 1000; }
  const type = WKB_NAMES[raw];
  if (!type) throw new Error(raw === 7 ? 'Geometry collections are not supported. Explode them into single features first.' : `Unsupported WKB geometry type ${raw}.`);

  const pos = (): Position => {
    const x = r.f64(le), y = r.f64(le);
    const z = hasZ ? r.f64(le) : undefined;
    if (hasM) r.f64(le);           // measures are dropped
    return z === undefined || Number.isNaN(z) ? [x, y] : [x, y, z];
  };
  const list = (): Position[] => { const n = r.u32(le); const out: Position[] = []; for (let i = 0; i < n; i++) out.push(pos()); return out; };
  const rings = (): Position[][] => { const n = r.u32(le); const out: Position[][] = []; for (let i = 0; i < n; i++) out.push(list()); return out; };
  const multi = <T>(expect: Geometry['type'], get: (g: Geometry) => T): T[] => {
    const n = r.u32(le);
    const out: T[] = [];
    for (let i = 0; i < n; i++) {
      const g = readWkb(r);
      if (g.type !== expect) throw new Error(`A ${type} contains a ${g.type}.`);
      out.push(get(g));
    }
    return out;
  };

  switch (type) {
    case 'Point': {
      const p = pos();
      if (Number.isNaN(p[0]) && Number.isNaN(p[1])) throw new Error('Empty point.');
      return { type, coordinates: p };
    }
    case 'LineString': return { type, coordinates: list() };
    case 'Polygon': return { type, coordinates: rings() };
    case 'MultiPoint': return { type, coordinates: multi('Point', (g) => g.coordinates as Position) };
    case 'MultiLineString': return { type, coordinates: multi('LineString', (g) => g.coordinates as Position[]) };
    case 'MultiPolygon': return { type, coordinates: multi('Polygon', (g) => g.coordinates as Position[][]) };
  }
}

/** Decodes a GeoPackage geometry blob ("GP" header + WKB). Returns null for an empty geometry. */
export function decodeGpkgGeometry(blob: Uint8Array): { srsId: number; geometry: Geometry | null } {
  if (blob.length < 8 || blob[0] !== 0x47 || blob[1] !== 0x50) throw new Error('Not a GeoPackage geometry (missing "GP" header).');
  const r = new Reader(blob);
  r.pos = 2;
  r.u8(); // version
  const flags = r.u8();
  const le = (flags & 1) === 1;
  const envelope = (flags >> 1) & 7;
  const empty = ((flags >> 4) & 1) === 1;
  if (((flags >> 5) & 1) === 1) throw new Error('Extended GeoPackage geometry types are not supported.');
  const srsId = r.i32(le);
  const envBytes = [0, 32, 48, 48, 64][envelope];
  if (envBytes === undefined) throw new Error('Invalid GeoPackage envelope flag.');
  r.pos += envBytes;
  if (empty || r.left === 0) return { srsId, geometry: null };
  return { srsId, geometry: readWkb(r) };
}

// ─── File → layers ───────────────────────────────────────────────────────────
const quoteIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;

function rows(db: Database, sql: string, params: (string | number)[] = []): Record<string, unknown>[] {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    const out: Record<string, unknown>[] = [];
    while (st.step()) out.push(st.getAsObject());
    return out;
  } finally {
    st.free();
  }
}

/** Reads every feature table in a GeoPackage. `SQL` comes from loadSqlJs() (or sql.js directly in tests). */
export function readGeoPackage(SQL: SqlJsStatic, data: ArrayBuffer | Uint8Array): GpkgLayer[] {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 16 || new TextDecoder().decode(bytes.slice(0, 15)) !== 'SQLite format 3') {
    throw new Error('This is not a GeoPackage file (it is not an SQLite database).');
  }
  const db = new SQL.Database(bytes);
  try {
    let tables: Record<string, unknown>[];
    try {
      tables = rows(db, "select table_name from gpkg_contents where data_type = 'features' order by table_name");
    } catch {
      throw new Error('This SQLite file has no gpkg_contents table, so it is not a GeoPackage.');
    }
    return tables.map(({ table_name }) => {
      const table = String(table_name);
      const layer: GpkgLayer = { table, srsId: null, crs: 'unknown', crsProblem: null, geometryColumn: null, doc: null, skippedGeometries: [] };
      const gc = rows(db, 'select column_name, srs_id from gpkg_geometry_columns where table_name = ?', [table])[0];
      if (!gc) {
        layer.crsProblem = 'The table has no entry in gpkg_geometry_columns.';
        return layer;
      }
      layer.geometryColumn = String(gc.column_name);
      layer.srsId = Number(gc.srs_id);
      const srs = rows(db, 'select organization, organization_coordsys_id, srs_name from gpkg_spatial_ref_sys where srs_id = ?', [layer.srsId])[0];
      const org = String(srs?.organization ?? '').toUpperCase();
      const code = Number(srs?.organization_coordsys_id ?? NaN);
      layer.crs = srs ? `${org || 'SRS'}:${Number.isFinite(code) ? code : layer.srsId}` : `srs_id ${layer.srsId}`;
      if (!(org === 'EPSG' && code === 4326)) {
        layer.crsProblem = layer.srsId === 0 || layer.srsId === -1
          ? 'The layer has an undefined coordinate system. Assign EPSG:4326 in QGIS (only if that is what the data really is) and export again.'
          : `The layer is in ${layer.crs}${srs?.srs_name ? ` (${String(srs.srs_name)})` : ''}. DDRiVE-M stores EPSG:4326 only and does not reproject in the browser. Reproject in QGIS (Export → Save Features As → CRS EPSG:4326) and try again.`;
        return layer;
      }

      const info = rows(db, `pragma table_info(${quoteIdent(table)})`);
      const pk = info.find((c) => Number(c.pk) === 1)?.name as string | undefined;
      const features: unknown[] = [];
      for (const row of rows(db, `select * from ${quoteIdent(table)}`)) {
        const fid = pk != null && row[pk] != null ? String(row[pk]) : null;
        const blob = row[layer.geometryColumn];
        const properties: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k === layer.geometryColumn || k === pk) continue;
          if (v instanceof Uint8Array) continue;  // binary attributes are not carried over
          properties[k] = v;
        }
        if (!(blob instanceof Uint8Array)) {
          layer.skippedGeometries.push({ fid, message: 'No geometry.' });
          continue;
        }
        try {
          const { geometry } = decodeGpkgGeometry(blob);
          if (!geometry) { layer.skippedGeometries.push({ fid, message: 'Empty geometry.' }); continue; }
          features.push({ type: 'Feature', ...(fid != null ? { id: fid } : {}), geometry, properties });
        } catch (e) {
          layer.skippedGeometries.push({ fid, message: (e as Error).message });
        }
      }
      layer.doc = { type: 'FeatureCollection', features };
      return layer;
    });
  } finally {
    db.close();
  }
}
