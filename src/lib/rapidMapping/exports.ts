// Product exports (spec §12): GeoJSON, CSV summary and metadata.json (Appendix B).
// Built in the browser from rows the user can already read; nothing here widens access.
import type { Activation, Aoi, Layer, Product, ProductVersion, StoredFeature } from './types';
import { isPreliminary, PRELIMINARY_DISCLAIMER, productCode, VERIFIED_DISCLAIMER } from './types';
import { positions } from './geometry';

export const EXPORT_SCHEMA_VERSION = '1.0';

export interface ExportInput {
  activation: Activation;
  product: Product;
  version: ProductVersion;
  aoi: Aoi | null;
  layers: Layer[];
  features: StoredFeature[];
}

const disclaimer = (v: ProductVersion) => (isPreliminary(v) ? PRELIMINARY_DISCLAIMER : VERIFIED_DISCLAIMER);

/** A FeatureCollection with provenance on every feature. */
export function toGeoJson({ activation, product, version, layers, features }: ExportInput) {
  const byId = new Map(layers.map((l) => [l.id, l]));
  return {
    type: 'FeatureCollection' as const,
    name: productCode(activation.ref, product, version.version_no),
    // Foreign member (RFC 7946 §6.1): what the data is and how far it can be trusted.
    ddrive_m: {
      product_code: productCode(activation.ref, product, version.version_no),
      status: version.status,
      publication_level: version.publication_level,
      data_cutoff_at: version.data_cutoff_at,
      crs: 'EPSG:4326',
      disclaimer: disclaimer(version),
    },
    features: features.map((f) => {
      const l = byId.get(f.layer_id);
      return {
        type: 'Feature' as const,
        id: f.external_feature_id ?? f.id,
        geometry: f.geometry,
        properties: {
          ...f.properties,
          _layer: l?.name ?? null,
          _layer_role: l?.layer_role ?? null,
          _source: l?.source_name ?? null,
          _source_acquired_at: l?.source_acquired_at ?? null,
          _confidence: f.confidence,
          _verification: f.verification_status,
          _condition_code: f.condition_code,
        },
      };
    }),
  };
}

// Cells starting with these are run as formulas by spreadsheet apps. Prefix them so a CSV cannot run code.
const FORMULA = /^[=+\-@\t\r]/;
export function csvCell(v: unknown): string {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Simple representative point: the mean of the positions (good enough for a table, not for analysis). */
export function representativePoint(f: Pick<StoredFeature, 'geometry'>): [number, number] {
  const ps = positions(f.geometry);
  const n = ps.length || 1;
  const sum = ps.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [Number((sum[0] / n).toFixed(6)), Number((sum[1] / n).toFixed(6))];
}

/** One row per feature, with the product's header and disclaimer as comment-free leading rows. */
export function toCsv(input: ExportInput): string {
  const { activation, product, version, layers, features } = input;
  const byId = new Map(layers.map((l) => [l.id, l]));
  const propKeys = [...new Set(features.flatMap((f) => Object.keys(f.properties ?? {})))].sort().slice(0, 30);
  const head = ['product_code', 'version', 'status', 'data_cutoff_at', 'layer', 'layer_role', 'source', 'feature_id', 'geometry_type',
    'longitude', 'latitude', 'confidence', 'verification', 'condition_code', ...propKeys];
  const code = productCode(activation.ref, product, version.version_no);
  const lines = [head.map(csvCell).join(',')];
  for (const f of features) {
    const l = byId.get(f.layer_id);
    const [lon, lat] = representativePoint(f);
    lines.push([
      code, version.version_no, version.status, version.data_cutoff_at, l?.name, l?.layer_role, l?.source_name,
      f.external_feature_id ?? f.id, f.geometry.type, lon, lat, f.confidence, f.verification_status, f.condition_code,
      ...propKeys.map((k) => f.properties?.[k]),
    ].map(csvCell).join(','));
  }
  lines.push('');
  lines.push(csvCell(disclaimer(version)));
  return lines.join('\r\n');
}

/** metadata.json for the product package (spec §12.2 and Appendix B). */
export function toMetadata({ activation, product, version, aoi, layers }: ExportInput, generatedAt = new Date()) {
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    product_code: productCode(activation.ref, product, version.version_no),
    product_type: product.product_type,
    title: version.title_snapshot ?? product.title,
    status: version.status,
    publication_level: version.publication_level,
    audience: version.published_audience,
    activation_code: activation.ref,
    activation_title: activation.title,
    incident: activation.ddrive_incidents ? { ref: activation.ddrive_incidents.ref, title: activation.ddrive_incidents.title } : { id: activation.incident_id },
    aoi: aoi ? { id: aoi.id, version: version.aoi_version_no ?? aoi.current_version, name: aoi.name } : null,
    version: version.version_no,
    change_summary: version.change_summary,
    data_cutoff_at: version.data_cutoff_at,
    generated_at: generatedAt.toISOString(),
    crs: 'EPSG:4326',
    sources: version.source_manifest?.length
      ? version.source_manifest
      : layers.map((l) => ({ layer: l.name, role: l.layer_role, source_type: l.source_type, source_name: l.source_name,
                              acquired_at: l.source_acquired_at, reference: l.source_reference, file: l.source_file_name,
                              format: l.source_format, sha256: l.source_checksum, crs: l.source_crs, features: l.feature_count })),
    methodology: version.methodology_snapshot ?? product.methodology,
    limitations: version.limitations_snapshot ?? product.limitations,
    confidence: version.confidence_snapshot ?? product.confidence,
    review: {
      submitted_at: version.submitted_at,
      verified_at: version.verified_at,
      verification_note: version.verification_note,
      published_at: version.published_at,
    },
    disclaimer: disclaimer(version),
    software: 'DDRiVE-M Rapid Mapping',
  };
}

/** Saves text as a file on the user's device. */
export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFileName = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
