import { describe, expect, it } from 'vitest';
import { csvCell, toCsv, toGeoJson, toMetadata, type ExportInput } from '../exports';
import { isPreliminary, PRELIMINARY_DISCLAIMER, productCode, VERIFIED_DISCLAIMER } from '../types';

const input = (status: 'published' | 'verified', level: 'preliminary' | 'verified' | null): ExportInput => ({
  activation: { id: 'a', ref: 'M-001', title: 'Anilao flood mapping', incident_id: 'i', ddrive_incidents: { ref: 'I-004', title: 'Flood' } } as never,
  product: { id: 'p', ref: 'MP-001', product_type: 'delineation', title: 'Flood extent', confidence: 'low' } as never,
  version: { id: 'v', version_no: 2, status, publication_level: level, data_cutoff_at: '2026-11-14T00:00:00Z', source_manifest: [],
             title_snapshot: 'Flood extent', methodology_snapshot: 'Field reports', limitations_snapshot: 'Partial', aoi_version_no: 1 } as never,
  aoi: null,
  layers: [{ id: 'l', name: 'Streets', layer_role: 'observed', source_name: 'Barangay radio' } as never],
  features: [{ id: 'f', layer_id: 'l', external_feature_id: 's1', geometry: { type: 'LineString', coordinates: [[124.6, 11], [124.62, 11.02]] },
               properties: { name: '=HYPERLINK("http://x")' }, observation_id: null, condition_code: null, confidence: 'low', verification_status: 'unverified' }],
});

describe('exports', () => {
  it('neutralises spreadsheet formulas and quotes commas', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('-5')).toBe("'-5");
  });
  it('writes the CSV with the product code and the preliminary disclaimer', () => {
    const csv = toCsv(input('published', 'preliminary'));
    expect(csv).toContain('M-001-DEL-MP-001 v2');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('124.61');
    expect(csv).toContain('PRELIMINARY');
  });
  it('labels verified publications as verified', () => {
    expect(toMetadata(input('published', 'verified')).disclaimer).toBe(VERIFIED_DISCLAIMER);
    expect(toGeoJson(input('published', 'preliminary')).ddrive_m.disclaimer).toBe(PRELIMINARY_DISCLAIMER);
  });
  it('carries provenance on every exported feature', () => {
    const f = toGeoJson(input('published', 'verified')).features[0];
    expect(f.properties).toMatchObject({ _layer: 'Streets', _source: 'Barangay radio', _verification: 'unverified' });
  });
  it('builds metadata in the Appendix B shape', () => {
    const m = toMetadata(input('published', 'verified'), new Date('2026-11-14T01:00:00Z'));
    expect(m).toMatchObject({ schema_version: '1.0', activation_code: 'M-001', crs: 'EPSG:4326', generated_at: '2026-11-14T01:00:00.000Z', version: 2 });
  });
  it('treats anything not verified as preliminary', () => {
    expect(isPreliminary({ status: 'published', publication_level: 'preliminary' })).toBe(true);
    expect(isPreliminary({ status: 'superseded', publication_level: 'verified' })).toBe(false);
    expect(isPreliminary({ status: 'for_field_verification', publication_level: null })).toBe(true);
    expect(isPreliminary({ status: 'verified', publication_level: null })).toBe(false);
    expect(productCode('M-001', { ref: 'MP-002', product_type: 'grading' }, 3)).toBe('M-001-GRA-MP-002 v3');
  });
});
