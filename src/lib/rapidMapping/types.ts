// Rapid Mapping: types and labels. These mirror the database
// (supabase/migrations/20261122010000_phase3_rapid_mapping.sql, ADR-004). The database enforces every rule;
// the app only uses these to show and explain them.

export type ActivationStatus = 'draft' | 'active' | 'on_hold' | 'closed' | 'cancelled';
export type HazardType =
  | 'flood' | 'tropical_cyclone' | 'storm_surge' | 'landslide' | 'earthquake' | 'volcanic' | 'tsunami' | 'fire' | 'drought' | 'other';
export type Phase = 'preparedness' | 'response' | 'recovery';
export type Priority = 'routine' | 'urgent' | 'critical';
export type AoiStatus = 'draft' | 'submitted' | 'approved' | 'retired';
export type AoiType = 'barangay' | 'municipality' | 'facility_cluster' | 'watershed' | 'corridor' | 'custom';
export type ProductType = 'preliminary_estimate' | 'delineation' | 'grading' | 'reference' | 'situational_update';
export type VersionStatus =
  | 'draft' | 'processing' | 'under_review' | 'preliminary' | 'for_field_verification' | 'verified' | 'published' | 'superseded' | 'rejected';
export type ProductStatus = VersionStatus | 'archived';
export type Audience = 'internal_eoc' | 'partner_restricted' | 'public_approved';
export type Confidence = 'low' | 'moderate' | 'high' | 'not_assessed';
export type LayerRole = 'observed' | 'modelled' | 'inferred' | 'reference';
export type SourceType = 'field' | 'imagery' | 'drone' | 'agency' | 'model' | 'baseline' | 'other';
export type SourceFormat = 'geojson' | 'gpkg' | 'drawn' | 'observations';
export type ObservationType =
  | 'flood_extent' | 'water_depth' | 'road_access' | 'structure_damage' | 'landslide' | 'debris' | 'utility' | 'facility_status' | 'other';
export type AccessStatus = 'passable' | 'restricted' | 'impassable';
export type ObservationStatus = 'submitted' | 'triaged' | 'field_verified' | 'rejected';
export type FeatureVerification = 'unverified' | 'field_checked' | 'verified' | 'disputed';
export type ReviewDecision = 'accept' | 'return' | 'reject';
export type LinkModule = 'incident' | 'aa_case' | 'document' | 'plan';

// ─── GeoJSON (RFC 7946, EPSG:4326) ───────────────────────────────────────────
export type Position = [number, number] | [number, number, number];
export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'MultiPoint'; coordinates: Position[] }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };
export type GeometryType = Geometry['type'];
export interface Feature {
  type: 'Feature';
  id?: string | number;
  geometry: Geometry;
  properties: Record<string, unknown>;
}
export type BBox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

// ─── Records ─────────────────────────────────────────────────────────────────
interface Stamped {
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activation extends Stamped {
  id: string;
  ref: string;
  incident_id: string;
  aa_case_id: string | null;
  title: string;
  hazard_type: HazardType;
  phase: Phase;
  priority: Priority;
  status: ActivationStatus;
  operational_objective: string | null;
  information_cutoff_at: string | null;
  activated_at: string | null;
  closed_at: string | null;
  close_reason: string | null;
  ddrive_incidents?: { ref: string; title: string } | null;
}

export interface Aoi extends Stamped {
  id: string;
  activation_id: string;
  name: string;
  aoi_type: AoiType;
  psgc_code: string | null;
  geometry: Geometry;
  min_lon: number; min_lat: number; max_lon: number; max_lat: number;
  status: AoiStatus;
  current_version: number;
  change_reason: string | null;
  geometry_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  return_note: string | null;
}

export interface AoiVersion {
  id: string;
  aoi_id: string;
  version_no: number;
  change_reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Product extends Stamped {
  id: string;
  ref: string;
  activation_id: string;
  aoi_id: string | null;
  product_type: ProductType;
  title: string;
  summary: string | null;
  methodology: string | null;
  limitations: string | null;
  confidence: Confidence;
  status: ProductStatus;
  current_version: number;
  published_version: number | null;
  audience: Audience | null;
  archived_at: string | null;
  archive_reason: string | null;
}

export interface SourceManifestEntry {
  layer: string;
  role: LayerRole;
  source_type: SourceType;
  source_name: string;
  acquired_at: string | null;
  reference: string | null;
  file: string | null;
  format: SourceFormat;
  sha256: string | null;
  crs: string;
  features: number;
}

export interface ProductVersion extends Stamped {
  id: string;
  product_id: string;
  version_no: number;
  status: VersionStatus;
  data_cutoff_at: string | null;
  change_summary: string | null;
  title_snapshot: string | null;
  summary_snapshot: string | null;
  methodology_snapshot: string | null;
  limitations_snapshot: string | null;
  confidence_snapshot: Confidence | null;
  aoi_id: string | null;
  aoi_version_no: number | null;
  source_manifest: SourceManifestEntry[];
  submitted_by: string | null;
  submitted_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_note: string | null;
  published_by: string | null;
  published_at: string | null;
  published_audience: Audience | null;
  publication_level: 'preliminary' | 'verified' | null;
  publication_note: string | null;
  superseded_at: string | null;
}

export interface Layer extends Stamped {
  id: string;
  version_id: string;
  name: string;
  layer_role: LayerRole;
  source_type: SourceType;
  source_name: string;
  source_acquired_at: string | null;
  source_reference: string | null;
  source_file_name: string | null;
  source_format: SourceFormat;
  source_checksum: string | null;
  source_crs: string;
  geometry_type: string | null;
  feature_count: number;
  min_lon: number | null; min_lat: number | null; max_lon: number | null; max_lat: number | null;
  style: { color?: string };
}

export interface StoredFeature {
  id: string;
  layer_id: string;
  external_feature_id: string | null;
  geometry: Geometry;
  properties: Record<string, unknown>;
  observation_id: string | null;
  condition_code: string | null;
  confidence: Confidence;
  verification_status: FeatureVerification;
}

export interface Observation extends Stamped {
  id: string;
  activation_id: string;
  aoi_id: string | null;
  client_key: string;
  observed_at: string;
  submitted_at: string;
  observation_type: ObservationType;
  access_status: AccessStatus | null;
  description: string;
  geometry: Geometry;
  condition_code: string | null;
  confidence: Confidence;
  verification_status: ObservationStatus;
  triage_note: string | null;
  triaged_at: string | null;
  evidence_ref: string | null;
}

export interface Review {
  id: string;
  version_id: string;
  reviewer_id: string;
  decision: ReviewDecision;
  needs_field_verification: boolean;
  comments: string | null;
  reviewed_at: string;
}

export interface ProductLink {
  id: string;
  version_id: string;
  target_module: LinkModule;
  target_id: string;
  relationship: 'supports' | 'referenced_in' | 'evidence_for';
  note: string | null;
  created_at: string;
}

export interface ConditionCode {
  code: string;
  label: string;
  asset_class: string;
  definition: string;
  approval_basis: string;
  active: boolean;
}

// ─── Labels ──────────────────────────────────────────────────────────────────
export const ACTIVATION_STATUS_LABEL: Record<ActivationStatus, string> = {
  draft: 'Draft', active: 'Active', on_hold: 'On hold', closed: 'Closed', cancelled: 'Cancelled',
};
export const HAZARD_LABEL: Record<HazardType, string> = {
  flood: 'Flood', tropical_cyclone: 'Tropical cyclone', storm_surge: 'Storm surge', landslide: 'Landslide',
  earthquake: 'Earthquake', volcanic: 'Volcanic', tsunami: 'Tsunami', fire: 'Fire', drought: 'Drought', other: 'Other',
};
export const PRIORITY_LABEL: Record<Priority, string> = { routine: 'Routine', urgent: 'Urgent', critical: 'Critical' };
export const PHASE_LABEL: Record<Phase, string> = { preparedness: 'Preparedness', response: 'Response', recovery: 'Recovery' };
export const AOI_STATUS_LABEL: Record<AoiStatus, string> = {
  draft: 'Draft', submitted: 'Awaiting approval', approved: 'Approved', retired: 'Retired',
};
export const AOI_TYPE_LABEL: Record<AoiType, string> = {
  barangay: 'Barangay or barangay cluster', municipality: 'City or municipality', facility_cluster: 'Facility cluster',
  watershed: 'Watershed or river basin', corridor: 'Road or lifeline corridor', custom: 'Custom area',
};

// Adapted from the Copernicus EMS Rapid Mapping portfolio (spec §3).
export const PRODUCT_TYPES: { type: ProductType; label: string; code: string; question: string }[] = [
  { type: 'preliminary_estimate', label: 'Preliminary impact estimate', code: 'FEP', question: 'Where might the event have affected people, assets or access?' },
  { type: 'delineation', label: 'Impact extent', code: 'DEL', question: 'What is the observed or interpreted geographic extent?' },
  { type: 'grading', label: 'Damage / severity layer', code: 'GRA', question: 'What condition or damage class is supported by evidence?' },
  { type: 'reference', label: 'Baseline context package', code: 'REF', question: 'What assets and exposure existed before the event?' },
  { type: 'situational_update', label: 'Map-supported situation update', code: 'SR', question: 'What has changed and what decisions are needed?' },
];
export const productTypeMeta = (t: ProductType) => PRODUCT_TYPES.find((p) => p.type === t) ?? PRODUCT_TYPES[0];

export const VERSION_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  processing: 'Processing',
  under_review: 'Under review',
  preliminary: 'Accepted · preliminary',
  for_field_verification: 'Accepted · needs field verification',
  verified: 'Verified',
  published: 'Published',
  superseded: 'Superseded',
  rejected: 'Rejected',
  archived: 'Archived',
};
export const AUDIENCE_LABEL: Record<Audience, string> = {
  internal_eoc: 'Internal EOC (responders and above)',
  partner_restricted: 'Whole organisation, including viewers and partners',
  public_approved: 'Approved for public release',
};
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: 'Low', moderate: 'Moderate', high: 'High', not_assessed: 'Not assessed',
};
export const LAYER_ROLE_LABEL: Record<LayerRole, string> = {
  observed: 'Observed', modelled: 'Modelled', inferred: 'Inferred', reference: 'Reference (baseline)',
};
export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  field: 'Field report', imagery: 'Satellite or aerial imagery', drone: 'Drone survey', agency: 'Agency dataset',
  model: 'Model output', baseline: 'Baseline (CLUP / CDRA)', other: 'Other',
};
export const OBSERVATION_TYPE_LABEL: Record<ObservationType, string> = {
  flood_extent: 'Flooded area', water_depth: 'Water depth', road_access: 'Road access', structure_damage: 'Structure damage',
  landslide: 'Landslide', debris: 'Debris', utility: 'Utility (power, water, telecom)', facility_status: 'Facility status', other: 'Other',
};
export const ACCESS_LABEL: Record<AccessStatus, string> = { passable: 'Passable', restricted: 'Restricted', impassable: 'Impassable' };
export const OBSERVATION_STATUS_LABEL: Record<ObservationStatus, string> = {
  submitted: 'Submitted', triaged: 'Triaged', field_verified: 'Field verified', rejected: 'Rejected',
};
export const FEATURE_VERIFICATION_LABEL: Record<FeatureVerification, string> = {
  unverified: 'Unverified', field_checked: 'Field checked', verified: 'Verified', disputed: 'Disputed',
};

// Suggested disclaimers from the spec (§16.2). The organisation's legal and records officers approve them before adoption.
export const PRELIMINARY_DISCLAIMER =
  'PRELIMINARY — FOR OPERATIONAL SITUATIONAL AWARENESS. This product is based on sources and information available at the stated cut-off time. ' +
  'It has not necessarily been field verified and may be incomplete or subject to revision. It must not be treated as a final damage ' +
  'assessment or as the sole basis for legal, administrative or resource-allocation decisions.';
export const VERIFIED_DISCLAIMER =
  'VERIFIED FOR THE STATED PURPOSE AND INFORMATION CUT-OFF. Verification applies to the features and evidence reviewed in this product ' +
  'version. Conditions may change after the stated observation period. Refer to the source manifest, methodology and limitations before reuse.';

/** Display code, e.g. "M-001-FEP-MP-003 v2". */
export const productCode = (activationRef: string | undefined, p: Pick<Product, 'ref' | 'product_type'>, version?: number) =>
  `${activationRef ? `${activationRef}-` : ''}${productTypeMeta(p.product_type).code}-${p.ref}${version ? ` v${version}` : ''}`;

/** True when a version is not verified, so it must carry the preliminary label wherever it is shown. */
export const isPreliminary = (v: Pick<ProductVersion, 'status' | 'publication_level'>) =>
  v.status === 'published' || v.status === 'superseded' ? v.publication_level !== 'verified' : v.status !== 'verified';
