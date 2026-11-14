## Rapid Mapping & Geospatial Intelligence

## Technical Specification and Implementation Blueprint

**Version:** 1.0 \| **Date:** 14 November 2026\
**Status:** Proposed design baseline --- validate against the live
repository and deployed database before implementation.

> **Implementation note:** This document is a technical blueprint, not a
> claim that DDRiVE-M has has satellite imagery subscriptions, automated
> image processing, a production PostGIS database, or a deployed GIS
> worker. The Copernicus model is adapted as a set of design patterns:
> event-based activations, Areas of Interest (AOIs), staged products,
> interoperable formats, provenance, review and versioning.

------------------------------------------------------------------------

# 1. Executive summary

MODE Rapid Mapping & Geospatial Intelligence (MODE-RM) is a proposed
capability that converts spatial observations and verified field
information into traceable, versioned map products for EOC
decision-making.

It integrates five existing MODE domains:

1.  **EOC:** incident activation, operational priorities, approval and
    decision records.
2.  **Geo-COP:** map display, AOI management, operational layers and
    spatial context.
3.  **DDRiVE:** baseline risk, exposure, vulnerability and resilience
    information.
4.  **SitRep:** operational reporting, impact summaries, map references
    and situation updates.
5.  **Document Vault:** controlled storage of source files, datasets,
    map layouts, reports and versioned artifacts.

The recommended first release is a controlled manual/semi-automated
workflow: incident-linked AOIs, geospatial uploads, GeoJSON/GeoPackage
support, map composition, verification, PDF/CSV exports, metadata and
Vault integration. Satellite acquisition, automated change detection and
raster analytics should follow only after data rights, processing
capacity, QA and staffing are established.

## 1.1 Intended outcomes

-   Assemble a common operating picture more quickly.
-   Standardize spatial references used in briefings and SitReps.
-   Clearly distinguish preliminary information from verified findings.
-   Trace each map feature to its source, observation time and method.
-   Reuse DDRiVE baseline information without duplicating its ownership.
-   Exchange data with GIS tools through open formats.
-   Preserve reviewer decisions, audit trails and product versions.

## 1.2 Design principles

-   Operational question first; every product must support a defined
    decision.
-   Evidence before certainty; record source, time, method, confidence
    and limitations.
-   One authoritative record; reuse existing MODE incident, user and
    Vault records.
-   Offline-aware, authority-controlled; draft capture may be queued
    offline, approval and publication require authorized online actions.
-   Interoperable; prefer open formats and documented APIs.
-   Human-reviewed; automated outputs remain preliminary until reviewed.
-   Privacy by design; restrict sensitive locations and personal
    information.
-   Versioned and reproducible; never silently overwrite a published
    product.

# 2. Scope and assumptions

## 2.1 In scope

-   Mapping activation linked to an EOC incident.
-   AOI creation, editing, approval and version history.
-   GeoJSON and GeoPackage import and display.
-   Controlled reference to raster imagery and later raster processing.
-   Preliminary estimate, delineation, grading, reference and
    situational update products.
-   Feature-level provenance and confidence.
-   Field verification and correction workflow.
-   PDF map and CSV/XLSX summary exports.
-   Document Vault storage and retrieval.
-   Integration with DDRiVE, EOC, Geo-COP and SitRep.
-   Role-based access, audit events and publication controls.

## 2.2 Out of scope for initial release

-   Replacing QGIS or a full desktop GIS.
-   Fully automated damage classification used as an official finding.
-   Guaranteed access to commercial satellite imagery or any particular
    provider.
-   Real-time imagery monitoring guarantees.
-   Automated legal or administrative determinations.
-   Public release of sensitive operational information by default.
-   Replacing mandated official damage assessment processes.

## 2.3 Assumptions to validate in Phase 0

  -----------------------------------------------------------------------
  Assumption                          Required validation
  ----------------------------------- -----------------------------------
  Supabase is MODE's system of record Confirm deployed project and schema

  Dexie/IndexedDB supports offline    Confirm current DB versions and
  persistence                         sync behavior

  Geo-COP has an existing map         Identify map library and layer
  component                           conventions

  EOC incidents have stable IDs       Confirm incident table/type and
                                      lifecycle

  SitRep supports incident-linked     Confirm fields and approval flow
  reports                             

  Document Vault supports controlled  Confirm upload, access and version
  files                               behavior

  PostGIS is enabled                  Check Supabase extensions and
                                      spatial support

  MapLibre GL JS is compatible        Confirm existing map stack before
                                      adding it
  -----------------------------------------------------------------------

**Repository integration rule:** use MODE's existing React + Vite +
TypeScript frontend, Supabase backend, Dexie/IndexedDB offline-first
layer and established services. Inspect `src/lib/db.ts`,
`src/lib/tables.ts`, `src/lib/store.ts`, `src/lib/sync.ts`, auth/RBAC,
routing and existing module components before coding. Do not create a
parallel data or synchronization system.

# 3. Copernicus product model adapted for MODE

Copernicus Rapid Mapping organizes work around an activation, AOIs and
standardized products. MODE should adapt the concepts, not copy
Copernicus' institutional roles, service guarantees or data assumptions.

  -----------------------------------------------------------------------
  Copernicus pattern      MODE product            Operational question
  ----------------------- ----------------------- -----------------------
  Activation              Mapping Activation      What incident/task
                                                  requires mapping
                                                  support?

  AOI                     Area of Interest        Where is the mapping
                                                  task focused?

  First Estimate Product  Preliminary Impact      Where might the event
  (FEP)                   Estimate                have affected people,
                                                  assets or access?

  Delineation (DEL)       Impact Extent           What is the observed or
                                                  interpreted geographic
                                                  extent?

  Grading (GRA)           Damage/Severity Layer   What condition or
                                                  damage class is
                                                  supported by evidence?

  Reference (REF)         Baseline Context        What assets and
                          Package                 exposure existed before
                                                  the event?

  Situational Reporting   Map-supported Situation What has changed and
  (SR)                    Update                  what decisions are
                                                  needed?

  Product revisions       Versioned MODE Products What changed between
                                                  information cut-offs?
  -----------------------------------------------------------------------

## 3.1 Product definitions

### Preliminary Impact Estimate (FEP-inspired)

Uses earliest credible observations, initial field reports, available
imagery and known exposure layers to identify candidate affected
locations. It is explicitly provisional, displays confidence and
limitations, and is not a validated damage assessment.

### Impact Extent (DEL-inspired)

Stores event extent as point, line or polygon features. Distinguishes
observed extent from modelled or inferred extent, records
source/method/time, and supports repeated monitoring updates. Example
layers include flood extent, landslide deposits, debris, fire perimeter
and road obstruction.

### Damage/Severity (GRA-inspired)

Classifies observed or interpreted asset condition using a locally
approved dictionary. Supports buildings, roads, bridges, utilities and
public facilities. `unknown` and `not_assessed` must remain valid
values; absence of evidence is not evidence of no damage. Do not adopt a
damage scale without formal local approval.

### Baseline Context Package (REF-inspired)

References approved CLUP/CDRA layers, barangay boundaries, roads,
bridges, drainage, waterways, critical facilities and other authorized
datasets. DDRiVE remains the owner of its risk/exposure/vulnerability
records; MODE-RM references them rather than creating competing
baselines.

### Map-supported Situation Update (SR-inspired)

Combines mapped findings with field reports and EOC operational context.
It records the information cut-off and links to the authoritative SitRep
rather than maintaining a second narrative record.

## 3.2 Product status lifecycle

`draft` → `processing` → `preliminary` → `for_field_verification` →
`under_review` → `verified` → `published`

Additional terminal/administrative states: `superseded`, `rejected`,
`archived`.

A product may be published to an internal EOC audience without public
release. Audience and publication status are separate controls.

# 4. Functional architecture and module integration

``` text
Field / Barangay Reports / Drone or Aerial Data / Approved Imagery
                              |
                              v
                       MODE EOC Incident
                              |
                              v
                    MODE Mapping Activation
                              |
                    AOI + Product Work Orders
                              |
              +---------------+----------------+
              |               |                |
              v               v                v
           Geo-COP          DDRiVE       Field Verification
        Map + Layers    Baseline Context   Observations
              |               |                |
              +---------------+----------------+
                              |
                              v
                    Geospatial Processing
              Validate / Transform / Clip / Analyze
                              |
                              v
                      Product QA and Review
                              |
                +-------------+-------------+
                |             |             |
                v             v             v
             Geo-COP        SitRep      Document Vault
          Operational Map  Map-linked    Files + Metadata
                |          Updates            |
                +-------------+---------------+
                              |
                              v
                    EOC Decisions and Actions
```

  ------------------------------------------------------------------------------------------
  MODE module             Authoritative           MODE-RM integration
                          responsibility          
  ----------------------- ----------------------- ------------------------------------------
  EOC                     Incident, activation    Starts mapping activation; consumes
                          and decisions           approved products

  Geo-COP                 Map canvas, layers and  Displays AOIs, products, observations and
                          spatial interaction     baseline overlays

  DDRiVE                  Risk, exposure,         Supplies approved reference layers and
                          vulnerability baseline  indicators

  SitRep                  Official situation      Embeds exact product versions, map
                          report and approval     snapshots and summaries

  Document Vault          File storage, access    Stores source data, outputs, evidence and
                          and retention           metadata

  Identity/RBAC           Users, roles and        Controls all
                          permissions             create/edit/review/verify/publish/export
                                                  actions

  Sync service            Offline queue and       Syncs permitted draft observations;
                          synchronization         authority transitions remain controlled
  ------------------------------------------------------------------------------------------

**Data ownership rules** - EOC remains authoritative for incidents. -
Mapping activation is a child operational record of an incident. - AOIs
belong to an activation; AOI changes are versioned. - Product metadata
and product lifecycle belong to MODE-RM. - DDRiVE owns its baseline
assessment records. - SitRep owns report narratives and approvals. -
Document Vault owns binary files, file permissions and retention. -
Product links reference other records; they do not duplicate them.

# 5. User roles and permissions

Reuse existing MODE roles and permission utilities. The following are
logical permissions, not a mandate to create a second identity system.

  -----------------------------------------------------------------------
  Role                                Permissions
  ----------------------------------- -----------------------------------
  EOC Controller / Incident Manager   Create activation; set priorities;
                                      request products; view operational
                                      products; approve operational use
                                      when delegated

  CDRRMO GIS / Mapping Officer        Create/edit AOIs; upload data;
                                      create products; request
                                      processing; prepare map layouts

  Technical Assessment Officer        Submit observations; assess asset
                                      condition; attach evidence;
                                      recommend corrections

  Barangay Focal Person / Field       Submit assigned geotagged
  Reporter                            observations; view permitted
                                      feedback

  GIS Reviewer                        Review geometry, methodology,
                                      source and confidence; return or
                                      recommend verification

  Authorized Approver                 Verify/publish within delegated
                                      authority; set audience

  SitRep Officer                      Reference approved products; cannot
                                      alter source product geometry

  Document Custodian                  Manage Vault records within
                                      existing Vault policy

  System Administrator                Configure dictionaries,
                                      integrations and access; all
                                      privileged actions audited

  Read-only Stakeholder               View products shared with their
                                      organizational scope
  -----------------------------------------------------------------------

## 5.1 Permission matrix

  -------------------------------------------------------------------------------------
  Action                Field    Mapping         GIS   Approver          EOC     SitRep
                     Reporter    Officer    Reviewer              Controller    Officer
  ---------------- ---------- ---------- ----------- ---------- ------------ ----------
  View permitted          Yes        Yes         Yes        Yes          Yes        Yes
  activation                                                                 

  Submit field            Yes        Yes         Yes   Optional     Optional         No
  observation                                                                

  Create/edit AOI          No        Yes      Review         No      Request         No

  Upload dataset     Assigned        Yes         Yes         No           No         No
                         only                                                

  Create product           No        Yes    Optional         No      Request         No

  Review product           No         No         Yes        Yes           No         No

  Verify/publish           No         No   Recommend        Yes If delegated         No

  Add product to           No         No          No         No     Optional        Yes
  SitRep                                                                     
  -------------------------------------------------------------------------------------

Separation of duties: the author should not be the sole reviewer and
approver for high-consequence products. Published versions are immutable
snapshots. Corrections create a new version. Administrative access does
not automatically confer authority to validate technical findings.

# 6. Database design

## 6.1 Database guidance

Use PostgreSQL/PostGIS for AOIs, spatial queries and selected vector
features, subject to confirmation that PostGIS is enabled. Use UUIDs,
`timestamptz`, spatial indexes, RLS and append-only audit records for
critical transitions. GeoJSON is an interchange format, not necessarily
the primary database storage format.

The schema below is a logical target. Adapt foreign keys and names to
the live MODE schema. Do not run unchanged before confirming the
existing incident, user, barangay, Vault and audit tables.

## 6.2 Entity relationship overview

``` text
eoc_incident
  └── rm_activation
       ├── rm_aoi ── rm_aoi_version
       ├── rm_product ── rm_product_version
       │                    └── rm_layer ── rm_feature
       ├── rm_observation
       ├── rm_processing_job
       ├── rm_review
       └── rm_product_link
```

## 6.3 Core tables and fields

### `rm_activations`

`id uuid PK`, `incident_id uuid FK`, `activation_code text unique`,
`title text`, `hazard_type text`, `phase text`, `priority text`,
`status text`, `requested_by uuid FK`, `activated_at timestamptz`,
`closed_at timestamptz nullable`, `operational_objective text`,
`information_cutoff_at timestamptz`, `created_at`, `updated_at`.

### `rm_aois`

`id uuid PK`, `activation_id uuid FK`, `name text`, `aoi_type text`,
`geometry geometry(MultiPolygon, SRID)`, `status text`,
`created_by uuid FK`, `approved_by uuid FK nullable`,
`approved_at timestamptz nullable`, `current_version integer`,
timestamps.

### `rm_aoi_versions`

`id uuid PK`, `aoi_id uuid FK`, `version_no integer`,
`geometry geometry(MultiPolygon, SRID)`, `change_reason text`,
`created_by uuid FK`, `created_at timestamptz`.

### `rm_products`

`id uuid PK`, `activation_id uuid FK`, `aoi_id uuid FK nullable`,
`product_code text unique`, `product_type text`, `title text`,
`status text`, `audience text`, `summary text`, `methodology text`,
`limitations text`, `confidence text`, `created_by uuid FK`,
`reviewed_by uuid FK nullable`, `approved_by uuid FK nullable`,
`published_at timestamptz nullable`, `current_version integer`,
timestamps.

### `rm_product_versions`

`id uuid PK`, `product_id uuid FK`, `version_no integer`,
`status_snapshot text`, `data_cutoff_at timestamptz`,
`source_manifest jsonb`, `methodology_snapshot text`,
`limitations_snapshot text`, `change_summary text`,
`created_by uuid FK`, `vault_file_id uuid nullable`,
`created_at timestamptz`.

### `rm_layers`

`id uuid PK`, `product_version_id uuid FK`, `layer_name text`,
`layer_role text`, `geometry_type text`, `source_type text`,
`source_name text`, `source_acquired_at timestamptz`,
`source_reference text`, `srid integer`, `feature_count integer`,
`storage_type text`, `storage_reference text`, `style_config jsonb`,
`created_at`.

### `rm_features`

`id uuid PK`, `layer_id uuid FK`, `external_feature_id text nullable`,
`geometry geometry(Geometry, SRID)`, `properties jsonb`,
`source_observation_id uuid nullable`, `confidence text`,
`verification_status text`, `created_at`.

For large datasets, do not insert every feature into a generic table by
default. Retain source files in controlled storage and expose a
controlled feature/tile service where appropriate.

### `rm_observations`

`id uuid PK`, `activation_id uuid FK`, `aoi_id uuid FK nullable`,
`incident_report_id uuid nullable`, `observed_at timestamptz`,
`submitted_at timestamptz`, `observer_id uuid FK`,
`observation_type text`, `description text`,
`geometry geometry(Geometry, SRID)`, `condition_code text nullable`,
`confidence text`, `verification_status text`,
`evidence_vault_file_id uuid nullable`, `created_at`.

### `rm_reviews`

`id uuid PK`, `product_id uuid FK`, `product_version_id uuid FK`,
`reviewer_id uuid FK`, `decision text`, `comments text`,
`reviewed_at timestamptz`.

### `rm_processing_jobs`

`id uuid PK`, `activation_id uuid FK`, `product_id uuid FK nullable`,
`job_type text`, `status text`, `input_manifest jsonb`,
`output_manifest jsonb`, `requested_by uuid FK`,
`started_at timestamptz`, `finished_at timestamptz`, `error_code text`,
`error_message text`, `created_at`.

### `rm_product_links`

`id uuid PK`, `product_id uuid FK`, `target_module text`,
`target_record_id uuid`, `relationship text`, `created_by uuid FK`,
`created_at`.

## 6.4 SQL migration starter

This is a starter migration for core entities only. Confirm SRID and
replace/attach the incident and user foreign keys to actual MODE tables.
Add RLS policies using MODE's real organization, assignment and
incident-scope logic; do not deploy permissive policies.

``` sql
create extension if not exists postgis;

create table if not exists public.rm_activations (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null,
  activation_code text not null unique,
  title text not null,
  hazard_type text not null,
  phase text not null check (phase in ('response','recovery','preparedness')),
  priority text not null default 'routine'
    check (priority in ('routine','urgent','critical')),
  status text not null default 'draft'
    check (status in ('draft','active','on_hold','closed','cancelled')),
  requested_by uuid not null,
  activated_at timestamptz,
  closed_at timestamptz,
  operational_objective text,
  information_cutoff_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rm_aois (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.rm_activations(id) on delete restrict,
  name text not null,
  aoi_type text not null default 'custom',
  geometry geometry(MultiPolygon, 4326) not null,
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','retired')),
  created_by uuid not null,
  approved_by uuid,
  approved_at timestamptz,
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rm_aois_geometry_gix
  on public.rm_aois using gist (geometry);
create index if not exists rm_aois_activation_idx
  on public.rm_aois (activation_id);

create table if not exists public.rm_products (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.rm_activations(id) on delete restrict,
  aoi_id uuid references public.rm_aois(id) on delete restrict,
  product_code text not null unique,
  product_type text not null check (product_type in (
    'preliminary_estimate','delineation','grading','reference','situational_update'
  )),
  title text not null,
  status text not null default 'draft' check (status in (
    'draft','processing','preliminary','for_field_verification','under_review',
    'verified','published','superseded','rejected','archived'
  )),
  audience text not null default 'internal_eoc'
    check (audience in ('internal_eoc','partner_restricted','public_approved')),
  summary text,
  methodology text,
  limitations text,
  confidence text not null default 'not_assessed'
    check (confidence in ('low','moderate','high','not_assessed')),
  created_by uuid not null,
  reviewed_by uuid,
  approved_by uuid,
  published_at timestamptz,
  current_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rm_products_activation_idx
  on public.rm_products (activation_id);
create index if not exists rm_products_status_idx
  on public.rm_products (status);

create table if not exists public.rm_product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.rm_products(id) on delete restrict,
  version_no integer not null,
  status_snapshot text not null,
  data_cutoff_at timestamptz,
  source_manifest jsonb not null default '[]'::jsonb,
  methodology_snapshot text,
  limitations_snapshot text,
  change_summary text,
  created_by uuid not null,
  vault_file_id uuid,
  created_at timestamptz not null default now(),
  unique (product_id, version_no)
);

create table if not exists public.rm_layers (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.rm_product_versions(id) on delete restrict,
  layer_name text not null,
  layer_role text not null,
  geometry_type text not null,
  source_type text not null,
  source_name text,
  source_acquired_at timestamptz,
  source_reference text,
  srid integer,
  feature_count integer,
  storage_type text not null,
  storage_reference text not null,
  style_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rm_features (
  id uuid primary key default gen_random_uuid(),
  layer_id uuid not null references public.rm_layers(id) on delete restrict,
  external_feature_id text,
  geometry geometry(Geometry, 4326) not null,
  properties jsonb not null default '{}'::jsonb,
  source_observation_id uuid,
  confidence text not null default 'not_assessed',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','field_checked','verified','disputed')),
  created_at timestamptz not null default now()
);
create index if not exists rm_features_geometry_gix
  on public.rm_features using gist (geometry);
create index if not exists rm_features_layer_idx
  on public.rm_features (layer_id);

create table if not exists public.rm_observations (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.rm_activations(id) on delete restrict,
  aoi_id uuid references public.rm_aois(id) on delete restrict,
  incident_report_id uuid,
  observed_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  observer_id uuid not null,
  observation_type text not null,
  description text not null,
  geometry geometry(Geometry, 4326) not null,
  condition_code text,
  confidence text not null default 'not_assessed',
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted','triaged','field_verified','rejected')),
  evidence_vault_file_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists rm_observations_geometry_gix
  on public.rm_observations using gist (geometry);

create table if not exists public.rm_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.rm_products(id) on delete restrict,
  product_version_id uuid not null references public.rm_product_versions(id) on delete restrict,
  reviewer_id uuid not null,
  decision text not null check (decision in ('accept','return','reject')),
  comments text,
  reviewed_at timestamptz not null default now()
);

create table if not exists public.rm_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.rm_activations(id) on delete restrict,
  product_id uuid references public.rm_products(id) on delete restrict,
  job_type text not null,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','cancelled')),
  input_manifest jsonb not null default '{}'::jsonb,
  output_manifest jsonb not null default '{}'::jsonb,
  requested_by uuid not null,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

-- Enable RLS and add MODE-specific policies before deployment.
-- Do not grant broad write access to all authenticated users.
```

**Additional schema requirements:** create `rm_aoi_versions`, audit
events and product-link tables; add foreign keys to actual MODE
user/incident/Vault records; add updated-at triggers; add constraints
for status transitions; and add retention/indexing policies after the
real schema is inspected.

## 6.5 RLS and security

1.  Enable RLS on every MODE-RM table.
2.  Scope reads by the same incident, organization, assignment and
    audience rules used elsewhere in MODE.
3.  Restrict writes to authorized roles and activation scope.
4.  Enforce privileged status transitions through server-side functions
    or controlled API operations.
5.  Prevent ordinary users from directly publishing.
6.  Apply equivalent controls to object storage; a private DB row
    pointing to a public file is still a leak.
7.  Use short-lived signed URLs for restricted downloads.
8.  Never expose service-role credentials in browser code.
9.  Validate file type, size, archive expansion and content.
10. Sanitize feature properties and map popups; never render untrusted
    HTML.
11. Audit sensitive-layer access and exports where required.

# 7. API contracts

## 7.1 Conventions

-   Base path: `/api/v1/rapid-mapping`.
-   Authentication: existing MODE session/JWT; no separate login.
-   Authorization: server-side role and record-scope checks.
-   JSON for standard requests; multipart or existing Vault upload flow
    for files.
-   UUID identifiers; ISO 8601 timestamps.
-   GeoJSON interchange with documented CRS policy.
-   Idempotency keys for retryable create requests.
-   Standard error body:
    `{ "code": "...", "message": "...", "correlation_id": "..." }`.
-   All writes must use MODE's established service/data layer; do not
    bypass RLS or sync policy.

## 7.2 Endpoint catalogue

  Method      Endpoint                           Purpose
  ----------- ---------------------------------- ------------------------------------------
  GET         `/activations`                     List authorized activations
  POST        `/activations`                     Create activation linked to EOC incident
  GET         `/activations/{id}`                Read activation
  PATCH       `/activations/{id}`                Update editable fields
  POST        `/activations/{id}/activate`       Activate after checks
  POST        `/activations/{id}/close`          Close with note
  GET/POST    `/activations/{id}/aois`           List/create AOIs
  GET/PATCH   `/aois/{id}`                       Read/edit draft AOI
  POST        `/aois/{id}/submit`                Submit AOI
  POST        `/aois/{id}/approve`               Approve AOI
  GET         `/aois/{id}/versions`              AOI history
  GET/POST    `/activations/{id}/products`       List/create products
  GET/PATCH   `/products/{id}`                   Read/edit product metadata
  POST        `/products/{id}/submit-review`     Submit exact version
  POST        `/products/{id}/review`            Record review decision
  POST        `/products/{id}/verify`            Verify eligible product
  POST        `/products/{id}/publish`           Publish to audience
  POST        `/products/{id}/supersede`         Create replacement version
  GET         `/products/{id}/versions`          Version history
  GET         `/products/{id}/layers`            Layer metadata
  POST        `/activations/{id}/observations`   Submit field observation
  GET         `/activations/{id}/observations`   List observations
  POST        `/products/{id}/jobs`              Request processing
  GET         `/jobs/{id}`                       Processing status
  POST        `/jobs/{id}/cancel`                Cancel eligible job
  GET         `/jobs/{id}/outputs`               Output manifest

## 7.3 Example activation request/response

Request:

``` json
{
  "incident_id": "00000000-0000-0000-0000-000000000001",
  "title": "Flood impact mapping — sample incident",
  "hazard_type": "flood",
  "phase": "response",
  "priority": "urgent",
  "operational_objective": "Identify affected communities and access constraints."
}
```

Response:

``` json
{
  "id": "00000000-0000-0000-0000-000000000010",
  "activation_code": "ORM-RM-2026-0001",
  "status": "draft",
  "incident_id": "00000000-0000-0000-0000-000000000001",
  "created_at": "2026-11-14T00:00:00Z"
}
```

The identifiers are illustrative, not live MODE records.

## 7.4 Example AOI request

``` json
{
  "name": "Sample AOI — Barangay Cluster A",
  "aoi_type": "barangay",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": []
  },
  "change_reason": "Initial operational mapping boundary"
}
```

A real request must contain valid coordinates. The server validates
geometry, coordinate bounds, CRS and user scope.

## 7.5 Example product request

``` json
{
  "aoi_id": "00000000-0000-0000-0000-000000000020",
  "product_type": "preliminary_estimate",
  "title": "Preliminary flood impact estimate",
  "summary": "Initial interpretation for operational prioritization.",
  "methodology": "Combined initial field reports and available reference layers.",
  "limitations": "Not yet field verified; incomplete reporting is possible.",
  "confidence": "low"
}
```

## 7.6 Review and publish contracts

Review request:

``` json
{
  "product_version_id": "00000000-0000-0000-0000-000000000030",
  "decision": "return",
  "comments": "Clarify observation time and correct AOI overlap before verification."
}
```

Publish request:

``` json
{
  "product_version_id": "00000000-0000-0000-0000-000000000030",
  "audience": "internal_eoc",
  "publication_note": "Approved for internal operational coordination."
}
```

Reject publication if the version is ineligible, required metadata is
missing, the user lacks authority or review is incomplete.

## 7.7 Processing job contract

``` json
{
  "job_type": "validate_vector",
  "input_manifest": {
    "vault_file_id": "00000000-0000-0000-0000-000000000040",
    "expected_format": "gpkg"
  },
  "options": {
    "check_geometry": true,
    "check_crs": true,
    "check_invalid_geometries": true
  }
}
```

Do not accept arbitrary shell commands, GDAL command strings, filesystem
paths or unvalidated URLs from the browser. The server maps allow-listed
job types to controlled implementations.

## 7.8 Module integration contracts

**Geo-COP** - `GET /activations/{id}/map-context` returns authorized
AOIs, product layers, styles and temporal metadata. - The response
excludes restricted layers. - Reuse the existing map and layer registry
where feasible.

**DDRiVE** - `GET /activations/{id}/reference-layers` returns authorized
baseline layer references, custodian, vintage, source, CRS and
limitations. - Do not duplicate DDRiVE source records unless a versioned
snapshot is required for reproducibility.

**SitRep** - Link an exact product version, approved summary and map
snapshot to the existing SitRep record. - SitRep narrative and approval
remain in the current SitRep workflow.

**Document Vault** - Use the existing Vault upload/linking mechanism. -
Vault owns file permissions, retention and binary storage. - MODE-RM
stores Vault record IDs and a minimal source/output manifest.

# 8. Processing workflows

## 8.1 Open activation

1.  EOC user opens an existing incident.
2.  Selects **Create Mapping Activation**.
3.  MODE creates a child activation.
4.  User records hazard, priority, operational question and cut-off.
5.  Mapping Officer creates AOI(s).
6.  AOI is submitted and approved.
7.  Product work orders are created.
8.  Geo-COP displays the activation and approved AOIs.

## 8.2 Import geospatial data

1.  Mapping Officer uploads an allowed file against a product.
2.  File enters private quarantine/staging storage.
3.  Server validates extension, MIME/signature, size, archive structure
    and security policy.
4.  Validator checks geometry, CRS, coordinate bounds, schema and
    required attributes.
5.  Invalid features are reported; original source is retained.
6.  Ambiguous CRS requires explicit confirmation; no silent guessing.
7.  Worker transforms/clips if requested.
8.  Layer and product-version records are created.
9.  Geo-COP displays the authorized layer.
10. Processing logs and file references are stored.

Initial vector formats: GeoJSON, GeoPackage, and Shapefile as a
validated ZIP package containing required sidecar files. Enable
raster/COG only after storage, tiling and performance controls are
implemented.

## 8.3 Preliminary estimate

1.  Create `preliminary_estimate`.
2.  Link initial reports and approved reference layers.
3.  Record information cut-off.
4.  Draw/import candidate impact features.
5.  Record source and confidence per feature/layer.
6.  Create preliminary product version.
7.  Reviewer checks source completeness, geometry and limitations.
8.  Publish to internal EOC as preliminary if authorized.
9.  SitRep references it with explicit preliminary label.
10. Assign priority locations for field verification.

## 8.4 Delineation update

1.  New field reports, imagery or observations arrive.
2.  Create a new product version or update layer.
3.  Preserve prior published version.
4.  Summarize added/removed/changed features.
5.  Reviewer checks evidence for the changes.
6.  Approver publishes new version.
7.  Prior version becomes superseded but remains retrievable.
8.  Geo-COP defaults to latest authorized version and supports
    comparison.

## 8.5 Damage/severity assessment

1.  Select asset class and approved local classification scheme.
2.  Link observations to an asset/location.
3.  Record evidence and assessment method.
4.  Allow `unknown` and `not_assessed`.
5.  Reviewer checks classification and evidence.
6.  Verified features become available for authorized use.
7.  Aggregates state inclusion criteria and cut-off time.
8.  Official damage assessment remains subject to mandated process and
    authority.

## 8.6 SitRep integration

1.  SitRep Officer opens current incident report.
2.  Selects **Add Mapping Product**.
3.  MODE lists products authorized for that user.
4.  Officer selects an exact product version.
5.  MODE inserts link, snapshot and approved summary.
6.  Officer adds narrative and information cut-off.
7.  Existing SitRep review/approval proceeds.
8.  Final SitRep retains the exact version reference.

## 8.7 Close activation

1.  EOC Controller records closure reason.
2.  Mapping Officer resolves outstanding jobs and drafts.
3.  Products are published, rejected or archived.
4.  Activation closes; reopening requires authority.
5.  Files and versions remain under retention policy.
6.  Closure summary links to EOC incident.

# 9. Geospatial processing architecture

  -----------------------------------------------------------------------
  Layer                   Recommended technology  Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                Existing React + Vite + MODE user interface
                          TypeScript              

  Map                     Existing map stack;     Rendering and
                          MapLibre GL JS if       interaction
                          compatible              

  Spatial database        Supabase PostgreSQL +   AOIs, spatial queries,
                          PostGIS                 selected features

  Storage                 Existing Document       Source and generated
                          Vault/private object    files
                          storage                 

  Vector processing       GDAL/OGR and controlled Validation, conversion,
                          Python tooling          clipping, reprojection

  Raster processing       GDAL and evaluated      Metadata, tiling and
                          supporting tools        analysis

  Worker                  Separate isolated       CPU/memory-intensive
                          service                 jobs

  API                     Existing MODE           Authenticated
                          API/RPC/Edge Function   orchestration
                          conventions             

  Offline                 Existing                Draft observations and
                          Dexie/IndexedDB         permitted queued writes
  -----------------------------------------------------------------------

Heavy raster and batch processing should not run in the browser or be
forced into short-lived edge functions. A dedicated worker should fetch
files using short-lived authorized references, process in an isolated
workspace, enforce resource limits, store outputs privately, return a
manifest and clean temporary files.

## 9.1 Worker security

-   Allow-list job types; never execute user-supplied commands.
-   Restrict outbound network access.
-   Protect against archive path traversal and archive bombs.
-   Enforce CPU, memory, file-size and runtime quotas.
-   Use least-privilege credentials and server-side secrets.
-   Scan uploads according to city security policy.
-   Log job ID, user, input/output IDs, tool version and outcome.
-   Never log secrets or signed URLs.

## 9.2 CRS policy

-   Record source CRS for every dataset.
-   Never assume all files are WGS84.
-   Require CRS confirmation when metadata is absent or ambiguous.
-   Use an appropriate projected CRS for area/distance calculations.
-   Transform to map display CRS at the correct boundary.
-   Record transformation details and software version.
-   Flag implausible coordinates instead of silently correcting them.

## 9.3 Layer metadata minimum

Layer name/purpose; geometry type; CRS/SRID; source and custodian;
acquisition/observation time; processing date; product/version;
confidence and verification status; scale/resolution limits; access
classification; legend/style; and whether data is observed, modelled,
inferred or reference.

# 10. Frontend implementation

## 10.1 Suggested routes

Adapt to the existing router and navigation conventions; do not create a
second application shell.

``` text
/eoc/rapid-mapping
/eoc/rapid-mapping/activations/:activationId
/eoc/rapid-mapping/products/:productId
```

## 10.2 Screens

**Rapid Mapping Dashboard** - Active activations, incident/hazard, AOI
count and product status. - Processing jobs/failures, latest information
cut-off. - Items awaiting review or field verification.

**Activation Workspace** - Overview, AOIs, Products, Observations,
Processing, Activity/Audit.

**AOI Editor** - Existing Geo-COP map; draw/edit tools;
barangay/facility search; geometry validation; version history;
submit/approve.

**Product Workspace** - Product type/status;
methodology/limitations/confidence; source manifest; layers/legend; map
preview; review history; version comparison; role-permitted exports.

**Field Verification** - Assigned tasks; map location; evidence capture
through existing field-report mechanisms; offline draft; sync state;
verification outcome.

**Review and Publication** - Geometry/CRS results; missing metadata
warnings; reviewer decision; audience selection; approval confirmation.

## 10.3 UX and accessibility

-   Responsive desktop/tablet/mobile layouts and touch-friendly map
    controls.
-   Keyboard-accessible dialogs, visible focus and text labels in
    addition to colors.
-   Legends with units and definitions; loading, empty, error and
    offline states.
-   Respect reduced-motion settings; do not use animation that
    interferes with incident operations.
-   Never use color alone to communicate confidence or damage class.

## 10.4 Illustrative TypeScript domain types

Align with current `src/types.ts`; do not introduce conflicting
duplicate types.

``` ts
export type RmProductType =
  | "preliminary_estimate" | "delineation" | "grading"
  | "reference" | "situational_update";

export type RmProductStatus =
  | "draft" | "processing" | "preliminary"
  | "for_field_verification" | "under_review" | "verified"
  | "published" | "superseded" | "rejected" | "archived";

export type RmConfidence = "low" | "moderate" | "high" | "not_assessed";

export interface RmActivation {
  id: string;
  incident_id: string;
  activation_code: string;
  title: string;
  hazard_type: string;
  phase: "response" | "recovery" | "preparedness";
  priority: "routine" | "urgent" | "critical";
  status: "draft" | "active" | "on_hold" | "closed" | "cancelled";
  operational_objective?: string | null;
  activated_at?: string | null;
  information_cutoff_at?: string | null;
}

export interface RmProduct {
  id: string;
  activation_id: string;
  aoi_id?: string | null;
  product_code: string;
  product_type: RmProductType;
  title: string;
  status: RmProductStatus;
  audience: "internal_eoc" | "partner_restricted" | "public_approved";
  summary?: string | null;
  methodology?: string | null;
  limitations?: string | null;
  confidence: RmConfidence;
  current_version: number;
}
```

## 10.5 Illustrative API client

This demonstrates a typed contract only. Integrate with MODE's actual
session, error and service utilities.

``` ts
export interface ApiError {
  code: string;
  message: string;
  correlation_id?: string;
}

export async function createRmActivation(
  input: {
    incident_id: string;
    title: string;
    hazard_type: string;
    phase: "response" | "recovery" | "preparedness";
    priority: "routine" | "urgent" | "critical";
    operational_objective?: string;
  },
  accessToken: string
): Promise<RmActivation> {
  const response = await fetch("/api/v1/rapid-mapping/activations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.message ?? `Activation request failed (${response.status})`);
  }

  return response.json() as Promise<RmActivation>;
}
```

If MODE uses Supabase queries/RPC rather than a separate REST API,
implement the same service contract through the existing layer instead
of adding an unnecessary API server.

# 11. Offline-first and synchronization

MODE's offline architecture is a core constraint. Extend it; do not
bypass it.

**Suitable offline operations** - Draft field observations and
descriptions. - Capture location when device permissions/GPS are
available. - Queue permitted attachments through existing offline file
handling. - View cached, authorized activation summaries/reference
layers where policy allows.

**Online-only authority operations** - Approve AOI;
verify/publish/supersede product; change audience; close activation;
privileged processing/export; approve SitRep.

**Sync requirements** - Register every new table in existing table
registry and sync configuration. - Add Dexie schema versions through the
established migration sequence. - Preserve existing local data and
migration compatibility. - Use stable UUIDs according to MODE
conventions. - Make retries idempotent; handle duplicates and conflicts
explicitly. - Never silently overwrite server changes with stale offline
records. - Preserve creator, client time and server receipt time as
appropriate. - Server validates all privileged transitions. - Show
pending/synced/conflict/failed states.

Inspect and coordinate changes to: - `src/lib/db.ts` --- Dexie
tables/schema version. - `src/lib/tables.ts` --- table registry and sync
metadata. - `src/lib/store.ts` --- typed save/read/update behavior. -
`src/lib/sync.ts` --- push/pull, retries and conflicts. - `src/types.ts`
--- domain contracts. - Domain validation/service files. - Supabase
migrations, RLS and triggers. - Tests for migration, store, sync and
role behavior.

Actual paths may differ; confirm in the repository before editing.

# 12. Export formats and product package

## 12.1 Release-one formats

  Format          Use
  --------------- -------------------------------------------------------------
  PDF             Briefing/print map
  GeoJSON         Lightweight web/GIS interchange
  GeoPackage      Portable multi-layer vector package
  CSV             Attribute/summary table
  XLSX            Human-readable summary if existing export stack supports it
  ZIP Shapefile   Legacy GIS compatibility

Later options: COG GeoTIFF, GeoTIFF, MBTiles/vector tiles, OGC API
Features, subject to an approved need and support model.

## 12.2 Suggested package

``` text
MODE-RM_<activation-code>_<product-code>_v<version>/
  README.md
  metadata.json
  map.pdf
  summary.csv
  data.gpkg
  preview.png
  methodology.md
  checksums.txt
```

The manifest records incident/activation, product and version,
AOI/version, status/audience, data cut-off, generation time, sources,
CRS, methodology, limitations, reviewer/approver where disclosure is
allowed, processing software version and file checksums.

# 13. Quality assurance and acceptance criteria

## 13.1 Data QA

-   Geometry valid and non-empty; geometry type allowed.
-   CRS known; transformations recorded.
-   Coordinates plausible for expected geographic extent.
-   Required attributes present; duplicate IDs detected.
-   Source and observation timestamps present where applicable.
-   No prohibited personal data in public properties.
-   Product/AOI spatial relationship checked.
-   Summary statistics state criteria and cut-off.

## 13.2 Product QA

-   Purpose and intended use clear.
-   Methodology, limitations and confidence documented.
-   Preliminary and verified data visually distinct.
-   Legend, units, scale, north arrow, timestamp and source notes on
    printable maps.
-   Product code/version/data cut-off visible.
-   Reviewer decision and audience recorded.

## 13.3 Acceptance criteria

1.  Authorized EOC user creates activation linked to an existing
    incident.
2.  Mapping Officer creates/submits AOI; approver approves or returns
    it.
3.  Valid GeoJSON and GeoPackage can be imported.
4.  Invalid geometry or missing CRS produces a useful validation result.
5.  Product is linked to an AOI and versioned.
6.  Preliminary products cannot be mistaken for verified products.
7.  Reviewer accepts, returns or rejects an exact version.
8.  Only authorized users verify and publish.
9.  Published versions cannot be silently edited.
10. New version can supersede a prior version.
11. Geo-COP displays only authorized layers.
12. Product links to an existing SitRep without duplicating narrative.
13. Vault controls source/output file access.
14. Offline observations sync without duplicates or unauthorized status
    changes.
15. Audit captures lifecycle transitions.
16. Mobile and desktop layouts are usable.
17. Tests cover permission denial, malformed geometry, sync retry and
    version conflict.

Do not promise fixed performance times before benchmarking the current
hosting/data environment. Measure dashboard load, map render, AOI save,
import validation by file size, feature query, export, worker queue and
sync under intermittent connectivity.

# 14. Testing strategy

**Unit tests:** status transitions, RBAC, geometry validation,
metadata/source manifest validation, version numbering, supersession and
export manifests.

**Integration tests:** EOC-to-activation; Geo-COP map context; DDRiVE
references; SitRep links; Vault access; RLS; Dexie migration/sync;
worker job lifecycle.

**End-to-end scenarios** - Flood: incident → activation → AOI →
observations → preliminary estimate → review/publish → SitRep. - Update:
new evidence → new delineation version → compare → review/publish →
previous version retained as superseded. - Unauthorized access: user
outside scope requests restricted product; API and storage both deny. -
Offline field submission: observations queue offline, sync once online,
server checks scope; reporter cannot verify/publish.

# 15. Phased implementation roadmap

## Phase 0 --- Repository and operational discovery

Tasks: inspect repo/branch; map EOC schema/lifecycle; review Geo-COP map
and layer model; review DDRiVE ownership, SitRep approval and Vault
controls; inspect Supabase/RLS/PostGIS and Dexie/sync; confirm
datasets/custodians, local classification and disclosure rules.

Deliverables: architecture fit-gap report; confirmed schema mapping;
role matrix; dataset/source inventory; approved product dictionary and
lifecycle.

**Exit gate:** no unresolved conflict with identity, data ownership,
sync or authority architecture.

## Phase 1 --- Operational MVP

Build activation linked to incident; AOI create/edit/version/approval;
product metadata/status; GeoJSON/GeoPackage import; geometry/CRS
validation; Geo-COP display; PDF/CSV export; Vault linkage;
review/publication; audit/RLS; dashboard/workspace.

Deliverables: staging MVP, migrations/rollback, test dataset, UAT
results, user/admin guide.

**Exit gate:** core acceptance criteria 1--15 pass in staging.

## Phase 2 --- Field verification and operational integration

Build field observation/triage; offline queue; observation-to-feature
linkage; DDRiVE references; SitRep product/version linking; map
snapshots; version comparison; review queues.

Deliverables: field verification workflow, SitRep integration, DDRiVE
context, SOP/training update.

**Exit gate:** flood/typhoon tabletop exercise demonstrates traceable
product-to-SitRep links.

## Phase 3 --- Advanced processing

Build isolated worker; batch vector validation/clipping/reprojection;
raster metadata and COG handling; controlled rendering/tiles; optional
change detection; product package generation; job monitoring/retries.

Deliverables: worker deployment/security review, processing catalogue,
reproducibility and QA documentation, benchmark.

**Exit gate:** jobs are isolated, observable, reproducible and pass
security/performance tests.

## Phase 4 --- Interoperability and improvement

Potential standards-based services, approved imagery/data provider
integration, partner service accounts, historical event comparison,
resilience/recovery monitoring and additional hazard products.

**Exit gate:** each integration has owner, data-sharing basis, security
assessment, service expectation and support plan.

# 16. Operational governance and SOP

CDRRMO should approve an SOP defining: 1. Who may request an activation.
2. Who defines and approves AOIs. 3. Approved sources and data
custodians. 4. How preliminary information is labelled. 5. Authorized
local damage/severity classifications. 6. Technical review and
verification authority. 7. Publication authority for EOC, partners and
public. 8. Field verification assignment and closure. 9. Corrections and
superseded versions. 10. SitRep and incident decision-log references.
11. Protection of sensitive locations and personal data. 12. Retention
and archival.

## 16.1 Required product metadata

Title/type; incident/activation; AOI and version; source list/dates;
information cut-off; methodology; limitations; confidence; author;
reviewer decision; product version.

## 16.2 Suggested disclaimer for preliminary products

> **PRELIMINARY --- FOR OPERATIONAL SITUATIONAL AWARENESS.** This
> product is based on sources and information available at the stated
> cut-off time. It has not necessarily been field verified and may be
> incomplete or subject to revision. It must not be treated as a final
> damage assessment or as the sole basis for legal, administrative or
> resource-allocation decisions.

Suggested verified-product disclaimer:

> **VERIFIED FOR THE STATED PURPOSE AND INFORMATION CUT-OFF.**
> Verification applies to the features and evidence reviewed in this
> product version. Conditions may change after the stated observation
> period. Refer to the source manifest, methodology and limitations
> before reuse.

Have the City Government's legal, records and operational authorities
review these statements before adoption.

# 17. Recommended Ormoc use cases

These are proposed use cases, not claims that all required datasets or
imagery are currently available in MODE.

**Flood impact and access mapping** - Map reported flood locations and
observed extent. - Overlay waterways, roads, bridges, facilities and
approved exposure layers. - Record passable/restricted/impassable access
segments with time and source. - Provide preliminary affected-area
summaries and field verification priorities.

**Typhoon impact and lifeline disruption** - Map reported structural
damage, blocked roads and utility disruption. - Distinguish
field-confirmed observations from inferred impact. - Link critical
facility status to authoritative MODE records. - Support EOC
prioritization and SitRep updates.

**Landslide and slope-related incidents** - Map reported locations and
observed deposits. - Record road obstruction and nearby exposed
assets. - Link observations to field evidence. - Do not treat a deposit
boundary as a complete geotechnical hazard assessment.

**Evacuation and facility context** - Display authorized evacuation
centers and critical facilities. - Overlay access constraints and
incident extents. - Link status to authoritative facility/evacuation
records. - Protect sensitive occupancy and personal data.

# 18. Risks and mitigations

  -------------------------------------------------------------------------
  Risk                    Effect                  Mitigation
  ----------------------- ----------------------- -------------------------
  Unverified data shown   Incorrect decisions     Strong status labels,
  as confirmed                                    confidence and review
                                                  gates

  Inconsistent CRS        Misplaced features      CRS validation and
                                                  explicit transformation

  Duplicate data          Conflicting records     Preserve
  ownership                                       EOC/DDRiVE/SitRep/Vault
                                                  as authoritative owners

  Heavy browser           Unstable UI             Separate worker and
  processing                                      resource limits

  Weak RLS/storage access Data disclosure         Test database and object
                                                  storage controls

  Offline conflict        Duplicate/stale         Idempotency, conflict
                          observations            states and server
                                                  validation

  Incomplete baseline     Misleading exposure     Show dataset vintage and
                          summaries               coverage

  Unapproved grading      Inconsistent assessment Locally approved
  scale                                           classification dictionary

  Over-automation         False precision         Human review and
                                                  transparent methodology

  No SOP                  Unclear accountability  Approve SOP and train
                                                  role holders
  -------------------------------------------------------------------------

# 19. Implementation backlog

  ID       Work item                                  Priority   Dependency
  -------- ------------------------------------------ ---------- ---------------------
  RM-001   Repository/schema discovery                P0         None
  RM-002   Product dictionary and state transitions   P0         RM-001
  RM-003   Roles and RLS mapping                      P0         RM-001
  RM-004   SQL migration for activation/AOI/product   P0         RM-001--003
  RM-005   TypeScript domain types                    P0         RM-002
  RM-006   Dexie schema migration                     P0         RM-004
  RM-007   MODE table registry and sync integration   P0         RM-006
  RM-008   Dashboard and activation workspace         P1         RM-004--007
  RM-009   AOI editor using existing Geo-COP map      P1         RM-008
  RM-010   GeoJSON validation/import                  P1         RM-004
  RM-011   GeoPackage validation/import               P1         RM-010
  RM-012   Product review/version workflow            P1         RM-008
  RM-013   Document Vault linkage                     P1         Vault discovery
  RM-014   PDF map and CSV summary export             P1         RM-009--012
  RM-015   Geo-COP layer integration                  P1         RM-010--012
  RM-016   RLS/security tests                         P0         RM-004
  RM-017   Field observation workflow                 P2         RM-007
  RM-018   DDRiVE reference integration               P2         DDRiVE discovery
  RM-019   SitRep product linking                     P2         SitRep discovery
  RM-020   Offline sync/conflict tests                P1         RM-006--007
  RM-021   Geospatial worker prototype                P3         RM-010--011
  RM-022   Raster/COG pipeline                        P3         RM-021
  RM-023   External API interoperability              P4         Governance approval

# 20. Definition of done

Operational pilot requires: - Existing MODE identity, routing, data,
sync and UI architecture reused. - Incident/activation relationships
enforced. - AOI and product version histories. - Preliminary, verified
and published states distinct. - Geospatial imports validated and
auditable. - RLS and storage access tested. - Publication authority
enforced. - Geo-COP displays authorized layers. - DDRiVE
ownership/vintage retained. - SitRep links to exact versions. - Vault
controls files. - Offline observations sync safely. - Metadata,
limitations and source manifests retained. - SOP, training and support
ownership approved. - UAT completed with realistic Ormoc scenarios. -
Backup, retention, incident response and rollback documented.

# 21. Decisions required before development

1.  Which existing EOC incident table and lifecycle will be referenced?
2.  Which existing user roles and permissions can be reused?
3.  Which map library/layer architecture is deployed in Geo-COP?
4.  Is PostGIS enabled in Supabase?
5.  Which CRS is the city's approved storage/measurement standard?
6.  Which baseline datasets are approved and who is custodian?
7.  Which damage/severity classifications are formally authorized?
8.  What file formats and upload limits can hosting support?
9.  Does Document Vault support immutable versions and private object
    references?
10. Which operations must remain online-only under MODE sync?
11. Who approves internal, partner-restricted and public products?
12. What retention/disclosure rules apply to geospatial data and field
    evidence?

# 22. Reference basis

The following public Copernicus EMS resources informed the product-model
adaptation. MODE-specific architecture and implementation decisions are
recommendations requiring local validation.

1.  Copernicus Emergency Management Service. (2026, June 25). *Rapid
    Mapping products delivered faster and with new formats*.
    https://mapping.emergency.copernicus.eu/news/rapid-mapping-products-delivered-faster-and-with-new-formats/
2.  Copernicus Emergency Management Service. (n.d.). *Rapid Mapping
    portfolio*.
    https://mapping.emergency.copernicus.eu/about/rapid-mapping-portfolio/
3.  Copernicus Emergency Management Service. (n.d.). *How to harvest
    CEMS mapping data*.
    https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/
4.  Copernicus Emergency Management Service. (2026). *Rapid Mapping
    crisis information now available as a GeoPackage*.
    https://mapping.emergency.copernicus.eu/news/rapid-mapping-crisis-information-now-available-as-a-geopackage/
5.  Copernicus Emergency Management Service. (2026, January 20). *Launch
    of the new Rapid Mapping Viewer*.
    https://mapping.emergency.copernicus.eu/news/launch-of-the-new-rapid-mapping-viewer/
6.  Copernicus Emergency Management Service. (n.d.). *What is delivered
    in a product?*
    https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-delivered-in-a-product/

# Appendix A --- Suggested repository structure

Adapt to MODE's current feature-folder conventions; this is
illustrative.

``` text
src/
  features/
    rapid-mapping/
      pages/
        RapidMappingDashboard.tsx
        MappingActivationPage.tsx
        MappingProductPage.tsx
        MappingReviewPage.tsx
      components/
        ActivationSummary.tsx
        AoiEditor.tsx
        ProductStatusBadge.tsx
        ProductLayerPanel.tsx
        SourceManifest.tsx
        ObservationList.tsx
        ProductVersionTimeline.tsx
      domain/
        rapidMapping.types.ts
        rapidMapping.validation.ts
        rapidMapping.transitions.ts
      services/
        rapidMapping.service.ts
        rapidMapping.exports.ts
      hooks/
        useMappingActivations.ts
        useMappingProducts.ts
      tests/
        rapidMapping.validation.test.ts
        rapidMapping.transitions.test.ts

supabase/
  migrations/
    <timestamp>_rapid_mapping_core.sql

workers/
  geospatial/
    README.md
    job-router
    validators
    vector-processing
    raster-processing
```

# Appendix B --- Example product metadata JSON

``` json
{
  "schema_version": "1.0",
  "product_code": "ORM-RM-2026-0001-DEL-01",
  "product_type": "delineation",
  "title": "Observed flood extent — sample AOI",
  "status": "preliminary",
  "audience": "internal_eoc",
  "activation_code": "ORM-RM-2026-0001",
  "aoi": {
    "id": "00000000-0000-0000-0000-000000000020",
    "version": 1,
    "name": "Sample AOI"
  },
  "data_cutoff_at": "2026-11-14T00:00:00Z",
  "generated_at": "2026-11-14T01:00:00Z",
  "crs": "EPSG:4326",
  "sources": [
    {
      "type": "field",
      "name": "Initial field observations",
      "acquired_at": "2026-11-14T00:30:00Z",
      "reference": "internal-record-reference"
    }
  ],
  "methodology": "Illustrative metadata only; replace with actual method.",
  "limitations": "Not field verified; sample record.",
  "confidence": "low",
  "review": {
    "reviewer_id": null,
    "reviewed_at": null,
    "decision": "pending"
  },
  "files": []
}
```

# Appendix C --- Go-live checklist

-   [ ] Phase 0 discovery signed off.
-   [ ] Database migration reviewed and tested on a copy.
-   [ ] RLS and storage policies reviewed.
-   [ ] Existing sync architecture extended and regression-tested.
-   [ ] Product dictionary and local grading scheme approved.
-   [ ] Geo-COP integration tested.
-   [ ] DDRiVE custodians confirmed.
-   [ ] SitRep linkage tested.
-   [ ] Document Vault linkage/retention tested.
-   [ ] Field workflow tested on supported mobile devices.
-   [ ] Offline/reconnect tests passed.
-   [ ] Security and privacy review completed.
-   [ ] Operational SOP approved.
-   [ ] Users trained and support owner assigned.
-   [ ] Backup and rollback procedures tested.
-   [ ] Pilot exercise completed and lessons incorporated.

------------------------------------------------------------------------

**End of specification.**
