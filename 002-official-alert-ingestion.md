# ADR-002: Ingesting official alerts from PAGASA's CAP feed

- Status: Accepted
- Date: 2026-11-03
- Phase: 2

## Context

The Detection phase showed only hazards typed in by users. DDRiVE-M must relay official warnings, never originate them (RA 10639), and say how fresh its information is. PAGASA publishes its alerts as CAP 1.2 documents listed in an Atom feed at `https://publicalert.pagasa.dost.gov.ph/feeds/`, licensed CC BY 4.0, registered with the WMO. PHIVOLCS and NDRRMC publish no structured feed (HTML and PDF only).

Facts from PAGASA's own documents (fixtures in `supabase/functions/_shared/testdata/`, October 2026):

- Wind signals: event "Tropical Cyclone Warning", signal number in the parameter "Public Storm Warning Signal Level", and CAP severity "Minor" whatever the signal.
- Flood advisories: event such as "General Flood Advisory (Moderate)", one area per province with an outline and a SAME geocode.
- Province geocodes are 9-digit PSGC (`083700000` = Leyte). PSA now issues 10-digit codes; Metro Manila's were renumbered.
- Updates and cancellations point to earlier alerts through CAP `references`.

## Decision

1. **One Supabase Edge Function (`ingest-pagasa`)** polls the feed every 10 minutes, downloads only alerts not yet stored, and records each run. It follows only links on the feed's own host, caps size, time and alerts per run, and accepts calls only with the service role key.
2. **Alerts are stored once, shared by all organisations**, written only by the service (`ddrive_apply_official_alert`), never edited, readable by signed-in users. The original CAP document is kept for provenance but not exposed to users, who get the agency's link instead.
3. **CAP fields are stored and shown verbatim.** The interface leads with the wind signal number or the event name, not with CAP severity, and is not colour-coded by severity, because PAGASA marks every alert "Minor".
4. **Updates replace, cancellations end** the alerts they reference, including when they arrive out of order. "In force" means actual, not replaced or cancelled, and not expired (24 hours after sending when no expiry is given).
5. **Watch areas** are the provinces an organisation follows: a name, as PAGASA writes it, and an optional PSGC code. Matching compares region and province across 9- and 10-digit codes, treats Metro Manila as one region, and falls back to the name.
6. **Freshness is part of the display.** If the feed has not been read successfully for 30 minutes, the dashboard and Detection say the information may be out of date and point to pagasa.dost.gov.ph.
7. **Attribution**: every alert shows "Source: PAGASA-DOST · CC BY 4.0" and links to the original.
8. An alert can be **logged as a hazard record**, which keeps a link to the alert.

## Consequences

- The function accepts Supabase's secret keys (`apikey` header, with `verify_jwt` off) as well as the legacy service_role key, so the schedule keeps working when Supabase retires the legacy keys at the end of 2026.
- The project needs Edge Functions and a scheduler (pg_cron with pg_net on Supabase). On a host without them, the same function can be run on a schedule elsewhere (for example a GitHub Actions workflow with Deno), with the same service key.
- Earthquakes, volcano bulletins and tsunami information need a separate decision: PHIVOLCS publishes HTML only, so options are a carefully tested scraper or an international structured source (USGS, GDACS) clearly labelled as not PHIVOLCS.
- Alert outlines are stored for later map display; they are not plotted yet.
- The anticipatory-action workflow under RA 12287 can now use these alerts as forecast triggers.
