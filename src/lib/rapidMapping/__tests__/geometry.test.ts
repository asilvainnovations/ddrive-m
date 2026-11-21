import { describe, expect, it } from 'vitest';
import { checkFeatureCollection, checkGeoJsonCrs, inspectGeometry, parseGeoJsonText, toMultiPolygon, batches } from '../geometry';
import type { BBox } from '../types';

const square = { type: 'Polygon', coordinates: [[[124.6, 11.0], [124.62, 11.0], [124.62, 11.02], [124.6, 11.02], [124.6, 11.0]]] };
const fc = (features: unknown[], extra: Record<string, unknown> = {}) => ({ type: 'FeatureCollection', features, ...extra });
const feat = (geometry: unknown, properties: Record<string, unknown> = {}, id?: string) => ({ type: 'Feature', id, geometry, properties });

describe('inspectGeometry (mirrors ddrive_rm_geom_inspect)', () => {
  it('accepts a closed polygon and computes its extent', () => {
    const r = inspectGeometry(square);
    expect(r.problem).toBeNull();
    expect(r.vertices).toBe(5);
    expect(r.bbox).toEqual([124.6, 11.0, 124.62, 11.02]);
  });
  it('refuses an unclosed ring', () => {
    expect(inspectGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 2]]] }).problem).toMatch(/end at its first position/);
  });
  it('refuses a ring that is too short', () => {
    expect(inspectGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] }).problem).toMatch(/at least 4/);
  });
  it('refuses projected coordinates and says why', () => {
    expect(inspectGeometry({ type: 'Point', coordinates: [714000, 1217000] }).problem).toMatch(/projected CRS/);
  });
  it('refuses a line with one position', () => {
    expect(inspectGeometry({ type: 'LineString', coordinates: [[124.6, 11]] }).problem).toMatch(/at least 2/);
  });
  it('refuses non-numeric positions and unknown types', () => {
    expect(inspectGeometry({ type: 'Point', coordinates: ['124', '11'] }).problem).toMatch(/numbers/);
    expect(inspectGeometry({ type: 'GeometryCollection', geometries: [] }).problem).toMatch(/not supported/);
  });
  it('enforces the allowed types', () => {
    expect(inspectGeometry({ type: 'Point', coordinates: [124.6, 11] }, ['MultiPolygon']).problem).toMatch(/not allowed/);
  });
  it('accepts a MultiPolygon and refuses one with an empty polygon', () => {
    expect(inspectGeometry(toMultiPolygon(square as never)).problem).toBeNull();
    expect(inspectGeometry({ type: 'MultiPolygon', coordinates: [[]] }).problem).toMatch(/no rings/);
  });
});

describe('CRS policy (spec §9.2)', () => {
  it('treats GeoJSON without a crs member as WGS 84', () => {
    expect(checkGeoJsonCrs(fc([])).problem).toBeNull();
  });
  it('accepts CRS84 and EPSG:4326 names', () => {
    expect(checkGeoJsonCrs({ crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } } }).problem).toBeNull();
    expect(checkGeoJsonCrs({ crs: { type: 'name', properties: { name: 'EPSG:4326' } } }).problem).toBeNull();
  });
  it('refuses any other declared CRS instead of guessing', () => {
    const r = checkFeatureCollection(fc([feat(square)], { crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::32651' } } }));
    expect(r.features).toHaveLength(0);
    expect(r.problems[0].message).toMatch(/32651.*does not reproject/);
  });
});

describe('checkFeatureCollection (import QA, spec §13.1)', () => {
  it('keeps valid features and reports invalid ones by position and id', () => {
    const r = checkFeatureCollection(fc([
      feat(square, { name: 'A' }, 'a'),
      feat({ type: 'LineString', coordinates: [[124.6, 11]] }, {}, 'b'),
      { type: 'Feature', geometry: null, properties: {} },
    ]));
    expect(r.total).toBe(3);
    expect(r.features).toHaveLength(1);
    expect(r.problems.map((p) => [p.index, p.id])).toEqual([[2, 'b'], [3, null]]);
  });
  it('warns about duplicate ids, features outside the AOI and possible personal data', () => {
    const aoi: BBox = [124.6, 11.0, 124.62, 11.02];
    const r = checkFeatureCollection(fc([
      feat({ type: 'Point', coordinates: [124.61, 11.01] }, { household_head: 'x' }, 'p1'),
      feat({ type: 'Point', coordinates: [124.9, 11.3] }, {}, 'p1'),
    ]), aoi);
    expect(r.features).toHaveLength(2);
    expect(r.warnings.join(' ')).toMatch(/Duplicate feature ids: p1/);
    expect(r.warnings.join(' ')).toMatch(/1 feature lies entirely outside/);
    expect(r.warnings.join(' ')).toMatch(/household_head/);
  });
  it('flags data outside Southeast Asia (possible swapped coordinates)', () => {
    const r = checkFeatureCollection(fc([feat({ type: 'Point', coordinates: [11.01, 124.61 - 100] })]));
    expect(r.warnings.join(' ')).toMatch(/swapped/);
  });
  it('accepts a single Feature or a bare geometry', () => {
    expect(checkFeatureCollection(feat(square)).features).toHaveLength(1);
    expect(checkFeatureCollection(square).features).toHaveLength(1);
  });
  it('turns broken JSON into a readable problem', () => {
    expect(parseGeoJsonText('{ not json').problems[0].message).toMatch(/not valid JSON/);
  });
  it('refuses oversized properties', () => {
    const r = checkFeatureCollection(fc([feat(square, { note: 'x'.repeat(9000) })]));
    expect(r.problems[0].message).toMatch(/too large/);
  });
});

describe('batches', () => {
  it('splits at the server limit', () => {
    expect(batches(Array.from({ length: 12001 }, (_, i) => i)).map((b) => b.length)).toEqual([5000, 5000, 2001]);
  });
});
