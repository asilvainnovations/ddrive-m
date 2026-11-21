import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { decodeGpkgGeometry, readGeoPackage } from '../gpkg';
import { checkFeatureCollection } from '../geometry';

// Minimal writers for the test fixtures: GeoPackage header ("GP", version 0, little-endian, no envelope) + WKB.
function wkb(type: number, coords: number[][][] | number[][] | number[], le = true): Uint8Array {
  const parts: number[] = [];
  const buf: ArrayBuffer[] = [];
  const push = (n: number, kind: 'u8' | 'u32' | 'f64') => {
    const b = new ArrayBuffer(kind === 'u8' ? 1 : kind === 'u32' ? 4 : 8);
    const v = new DataView(b);
    if (kind === 'u8') v.setUint8(0, n); else if (kind === 'u32') v.setUint32(0, n, le); else v.setFloat64(0, n, le);
    buf.push(b);
  };
  push(le ? 1 : 0, 'u8');
  push(type, 'u32');
  if (type === 1) (coords as number[]).forEach((c) => push(c, 'f64'));
  else if (type === 2) { push((coords as number[][]).length, 'u32'); (coords as number[][]).flat().forEach((c) => push(c, 'f64')); }
  else if (type === 3) {
    push((coords as number[][][]).length, 'u32');
    for (const ring of coords as number[][][]) { push(ring.length, 'u32'); ring.flat().forEach((c) => push(c, 'f64')); }
  }
  void parts;
  const total = buf.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const b of buf) { out.set(new Uint8Array(b), o); o += b.byteLength; }
  return out;
}
function gp(srsId: number, body: Uint8Array): Uint8Array {
  const head = new Uint8Array(8);
  head.set([0x47, 0x50, 0, 0b00000001]);
  new DataView(head.buffer).setInt32(4, srsId, true);
  const out = new Uint8Array(8 + body.length);
  out.set(head); out.set(body, 8);
  return out;
}

let SQL: SqlJsStatic;
beforeAll(async () => { SQL = await initSqlJs(); });

function makeGpkg(srsId: number, org: string, code: number, rows: { fid: number; geom: Uint8Array | null; name: string }[]) {
  const db = new SQL.Database();
  db.run(`create table gpkg_spatial_ref_sys (srs_name text, srs_id integer primary key, organization text, organization_coordsys_id integer, definition text);
          create table gpkg_contents (table_name text primary key, data_type text, identifier text, srs_id integer);
          create table gpkg_geometry_columns (table_name text, column_name text, geometry_type_name text, srs_id integer, z integer, m integer);
          create table roads (fid integer primary key autoincrement, geom blob, name text);`);
  db.run('insert into gpkg_spatial_ref_sys values (?, ?, ?, ?, ?)', ['Test CRS', srsId, org, code, '']);
  db.run("insert into gpkg_contents values ('roads', 'features', 'roads', ?)", [srsId]);
  db.run("insert into gpkg_geometry_columns values ('roads', 'geom', 'GEOMETRY', ?, 0, 0)", [srsId]);
  for (const r of rows) db.run('insert into roads (fid, geom, name) values (?, ?, ?)', [r.fid, r.geom, r.name]);
  const bytes = db.export();
  db.close();
  return bytes;
}

describe('GeoPackage geometry decoding', () => {
  it('reads a point, a line and a polygon', () => {
    expect(decodeGpkgGeometry(gp(4326, wkb(1, [124.61, 11.01]))).geometry).toEqual({ type: 'Point', coordinates: [124.61, 11.01] });
    expect(decodeGpkgGeometry(gp(4326, wkb(2, [[124.6, 11], [124.61, 11.01]]))).geometry?.type).toBe('LineString');
    const ring = [[124.6, 11], [124.62, 11], [124.62, 11.02], [124.6, 11]];
    expect(decodeGpkgGeometry(gp(4326, wkb(3, [ring], false))).geometry).toEqual({ type: 'Polygon', coordinates: [ring] });
  });
  it('rejects a blob without the GP header', () => {
    expect(() => decodeGpkgGeometry(wkb(1, [1, 2]))).toThrow(/GP/);
  });
});

describe('readGeoPackage', () => {
  it('imports an EPSG:4326 layer with its attributes', () => {
    const file = makeGpkg(4326, 'EPSG', 4326, [
      { fid: 1, geom: gp(4326, wkb(2, [[124.6, 11], [124.61, 11.01]])), name: 'Real St' },
      { fid: 2, geom: null, name: 'No geometry' },
    ]);
    const [layer] = readGeoPackage(SQL, file);
    expect(layer.crsProblem).toBeNull();
    expect(layer.skippedGeometries).toHaveLength(1);
    const report = checkFeatureCollection(layer.doc);
    expect(report.problems).toHaveLength(0);
    expect(report.features[0]).toMatchObject({ id: '1', properties: { name: 'Real St' } });
  });
  it('refuses a layer in another CRS (no silent reprojection)', () => {
    const file = makeGpkg(32651, 'EPSG', 32651, [{ fid: 1, geom: gp(32651, wkb(1, [714000, 1217000])), name: 'x' }]);
    const [layer] = readGeoPackage(SQL, file);
    expect(layer.doc).toBeNull();
    expect(layer.crsProblem).toMatch(/EPSG:32651.*does not reproject/);
  });
  it('says clearly when the file is not a GeoPackage', () => {
    expect(() => readGeoPackage(SQL, new TextEncoder().encode('{"type":"FeatureCollection"}'))).toThrow(/not a GeoPackage/);
    const plain = new SQL.Database(); plain.run('create table t (a)'); const bytes = plain.export(); plain.close();
    expect(() => readGeoPackage(SQL, bytes)).toThrow(/gpkg_contents/);
  });
});
