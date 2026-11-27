# ADR-014: UP NOAH "Know Your Hazards" on the Dashboard

- Status: Accepted
- Date: 2026-11-27

## Context

Project NOAH (UP Resilience Institute) shows, for a place in the Philippines, its exposure to flood (100-year rain return period), landslide (including alluvial fan and debris flow) and storm surge (Storm Surge Advisory 4), rated "little to none", "low", "medium" or "high".

Review of `UPRI-NOAH/noah-frontend`:

- The repository has **no licence file**, so its code and assets cannot be copied.
- The hazard layers are Mapbox tilesets on NOAH's own account (`upri-noah.ph_fh_100yr_tls`, `ph_lh_lh1_tls`, `ph_lh_lh2_tls`, `ph_ssh_ssa4_tls`), read with NOAH's access token. Using that token from another site would be misuse.
- Other layers (critical facilities, typhoon track, rainfall, exposure assessment "4As", IoT sensors) come from `webgis-static.up.edu.ph/api`, which has no published documentation or terms.
- The Know Your Hazards page takes no location in its address.

## Decision

1. The Dashboard shows a NOAH panel: the three hazard maps with their scenarios, a link to each, the organisation's watch areas with a "copy" button (to paste in NOAH's search), and the official page in a frame **only when the user presses "Show the map here"**. Nothing is loaded from NOAH before that.
2. What a user reads in NOAH can be recorded as a hazard record with NOAH as the source (`/detection?log=1&source=NOAH`) or used as evidence in a DDRiVE hazard assessment.
3. The panel says these are reference maps, not warnings, and names the source. DDRiVE-M is not affiliated with UP NOAH.
4. The unused `GeoRiskPanel`, which showed made-up hazard levels, is removed.
5. Data from NOAH's API is not read until UPRI publishes an API or gives permission (the same rule as PHIVOLCS, ADR-010).

## Consequences

- If NOAH does not allow its page in a frame, the frame stays blank and the panel says to use "Open NOAH". This could not be checked from the build environment.
- The privacy notice names UP NOAH as a site the browser contacts when the map is opened.
