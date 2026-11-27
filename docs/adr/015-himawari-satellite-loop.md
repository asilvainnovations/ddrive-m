# ADR-015: Himawari satellite loop in Detection

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Migration: `20261127070000_phase1_himawari_frames.sql`; source `HIMAWARI` in `ingest-official`

## Context

`bahanonu/geoSatView` (MIT, last change 2021) downloads GOES GeoColor images from NOAA's CDN, crops them to an area and makes a timed video; it also screenshots zoom.earth. Its first model (read an agency's published images, cut to an area, play them in time order) fits Detection. GOES does not cover the Philippines; JMA's Himawari does. The screenshot model does not fit (a commercial site, no agency source). The R code (local files, ffmpeg) does not suit DDRiVE-M's hosting, so nothing is copied.

JMA's Himawari Real-Time Image service keeps a 24-hour rolling archive per sector, one JPEG per product per 10-minute slot, named by UTC time of day only (`img/se2/se2_b13_0310.jpg`). Sector `se2` (105°E-140°E, 30°N-0°) covers the Philippines. JMA's terms allow reuse, including commercial use, with the citation "Source: Meteorological Satellite Center of JMA website (URL)".

## Decision

1. **Verify, don't store**: every 10 minutes `ingest-official` checks (HEAD) the slots of the last 3 hours it has not yet listed, for infrared band 13 (day and night) and visible band 3. A frame is listed only when JMA's `Last-Modified` is within 2 hours after the slot time. Because file names carry no date, a slot JMA did not refresh still holds yesterday's image; this rule keeps it out. The database checks the same rule.
2. `ddrive_satellite_frames` keeps sector, product, time, address and Last-Modified for 24 hours. No image is stored or re-served.
3. **Detection → Satellite**: opened on demand; plays the last 3 hours in Manila time, with play/pause and a frame slider; cites JMA under the image; says it is not a forecast or warning (PAGASA issues warnings). If the newest verified frame is older than 60 minutes, no loop is shown: "Satellite imagery is not available right now", with a link to JMA. A past picture is never shown as the current one (for example during JMA's Himawari-9 outage in October 2025).
4. True Color Reproduction images are not used; they carry their own acknowledgement terms.
5. Each run is recorded as source `HIMAWARI` in `ddrive_ingest_runs`.

## Consequences

- Images are shown as JMA publishes them; DDRiVE-M does not crop or overlay them, because JMA does not publish the sector's projection details needed to place watch areas accurately.
- The browser loads images from JMA; the privacy notice says so.
- Settings: `HIMAWARI_SECTOR` (default `se2`), `HIMAWARI_PRODUCTS` (default `b13,b03`), `HIMAWARI_BASE_URL` (tests only). Remove `HIMAWARI` from `DETECTION_SOURCES` to switch it off.
- Tests: `_shared/himawari_test.ts` (7), `supabase/tests/99_phase1_himawari_frames.sql` (10), `satellite.test.ts` (3), browser checks in `detection.mjs` against a stand-in JMA server that includes a stale slot.
