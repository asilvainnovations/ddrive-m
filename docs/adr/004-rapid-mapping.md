# ADR-004: Rapid Mapping and geospatial intelligence

- Status: Accepted
- Date: 2026-11-22
- Phase: 3 (operational MVP of the spec's Phase 1)
- Source: `Rapid_Mapping_Technical_Specs.md` (MODE-RM blueprint v1.0, 14 Nov 2026), adapted to DDRiVE-M

## Context

The Rapid Mapping specification was written for the Ormoc MODE platform (EOC, Geo-COP, SitRep, Document Vault, Dexie sync). It asks for incident-linked mapping activations, Areas of Interest (AOIs), versioned map products adapted from the Copernicus EMS portfolio (FEP, DEL, GRA, REF, SR), reviewer and approver separation, feature-level provenance, open-format import and export, and offline field observations.

Phase 0 discovery against DDRiVE-M `main` at `2db761f` found:

| Spec assumption | DDRiVE-M reality | Decision |
| --- | --- | --- |
| EOC incident table | `ddrive_incidents` (text id, ref `I-001`, tenant-scoped) | Activations reference it; optionally also an RA 12287 case (`ddrive_aa_cases`) |
| MODE roles | Ladder `viewer < responder < analyst < drrm_officer < tenant_admin` (ADR-001) | Mapped below; no second identity system |
| PostGIS enabled | Not used anywhere; not available in the test database | GeoJSON in `jsonb`, validated in SQL, with bounding-box columns. PostGIS is a later, tested migration |
| Geo-COP map component | No map library in the bundle | A dependency-free SVG preview (no basemap, no tile provider, works offline). MapLibre is deferred until a tile source and its licence are chosen |
| SitRep module | None | Published versions link to incidents, anticipatory-action cases and documents |
| Document Vault (binary storage) | `ddrive_documents` holds metadata, no object storage policy yet | Layers record source file name, format, SHA-256 and the Vault/document reference; binaries are not uploaded in this release |
| Dexie/IndexedDB sync | None; PWA shell only | A small per-device queue for draft field observations, made idempotent by a client-generated key |
| GIS worker | None | Out of scope (spec Phase 3). Browser import handles EPSG:4326 vector data only and refuses anything else |

## Decision

1. **Tables** (all tenant-scoped, server-stamped, audited, RLS): `ddrive_rm_activations` (ref `M-001`), `ddrive_rm_aois` + append-only `ddrive_rm_aoi_versions`, `ddrive_rm_products` (ref `MP-001`) + `ddrive_rm_product_versions`, `ddrive_rm_layers`, `ddrive_rm_features`, `ddrive_rm_observations`, append-only `ddrive_rm_reviews`, `ddrive_rm_product_links`, and `ddrive_rm_condition_codes` (the organisation's own approved damage/severity dictionary).
2. **Geometry** is stored as RFC 7946 GeoJSON in EPSG:4326. `ddrive_rm_geom_check()` rejects unknown types, non-numeric or out-of-range coordinates, unclosed or short polygon rings, empty geometries and more than 50,000 vertices. The server derives the bounding box; the browser cannot set it. Source CRS is recorded per layer; anything other than EPSG:4326 is refused rather than guessed (spec §9.2).
3. **Role mapping**

   | Spec role | DDRiVE-M role |
   | --- | --- |
   | Field reporter, Technical assessment officer | responder |
   | Mapping officer, GIS reviewer | analyst |
   | Authorized approver, EOC controller | drrm_officer |
   | System administrator | tenant_admin (public release needs this) |
   | Read-only stakeholder | viewer |

4. **Lifecycle is enforced in the database**, by `security definer` step functions and guard triggers in the ADR-003 pattern:
   - Activation: `draft → active → on_hold ↔ active → closed`, or `cancelled`. Analysts open drafts; DRRM officers activate, hold, close and cancel. Closing needs a reason and no open product drafts or reviews.
   - AOI: `draft → submitted → approved → retired`. Geometry changes only in draft and write a new version row. An approver cannot approve an AOI whose current geometry they drew.
   - Product version: `draft → under_review → preliminary | for_field_verification → verified → published → superseded`, plus `rejected`. A reviewer records `accept`, `return` or `reject` on the exact version; publishing a new version supersedes the previous one, which stays readable. Published, superseded and rejected versions, their layers and their features are frozen.
   - **Separation of duties**: the person who submitted a version cannot review, verify or publish it.
   - **Publication** needs title, methodology, limitations, confidence, information cut-off and at least one layer. A preliminary (unverified) version may be published only to `internal_eoc`. `public_approved` needs a verified version and an administrator.
5. **Who sees what**: activations and approved AOIs are visible to every member, so field teams know where to look. Unpublished product versions and their layers are visible to analysts and above. Published versions are visible to responders and above (`internal_eoc`) or every member (`partner_restricted`, `public_approved`). Field observations are visible to analysts and to the person who sent them.
6. **Damage/severity classes are not invented.** `unknown` and `not_assessed` are always allowed; other codes must be in the organisation's dictionary, approved by a DRRM officer (spec §3.1 GRA).
7. **Labels**: every preliminary product carries the spec's preliminary disclaimer on screen, in print and in exports; verified products carry the verified disclaimer. Status is shown in words as well as colour.
8. **Exports** are generated in the browser from rows the user can already read: GeoJSON, CSV summary, `metadata.json` (spec Appendix B) and a print view (PDF via the browser) with legend, scale bar, north arrow, product code, version, cut-off and disclaimer.

## Not in this release

Shapefile ZIP import, raster/COG, the processing-job table and worker, PostGIS columns and spatial joins, map tiles, binary upload to object storage, XLSX and GeoPackage export, public (anonymous) product pages, automated change detection. Each is listed in the README backlog.

## Consequences

- The full flood scenario in spec §14 (incident → activation → AOI → observations → preliminary estimate → review → publish → link) runs end to end, and an update cycle produces a superseding version with the old one retained.
- When PostGIS is confirmed on the live project, a later migration can add `geometry` columns generated from the stored GeoJSON, GIST indexes and spatial checks (features inside the AOI) without changing the API the app uses.
- The disclaimers are suggested text from the spec; the organisation's legal and records officers should approve them before operational use.
