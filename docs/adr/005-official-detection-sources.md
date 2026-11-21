# ADR-005: More official detection sources, and risk-informed warnings

- Status: Accepted
- Date: 2026-11-22
- Phase: 3
- Builds on: ADR-002 (PAGASA CAP ingestion)

## Context

Detection relayed PAGASA's CAP alerts only (ADR-002). Earthquakes, tsunamis, volcanic activity and regional multi-hazard alerts were missing, and an alert did not say what it meant for the organisation's own assessed risks.

What the candidate sources publish (checked 22 November 2026):

| Source | Machine-readable output | Use here |
| --- | --- | --- |
| PAGASA-DOST | CAP 1.2 Atom feed, CC BY 4.0 | Already ingested (ADR-002) |
| PHIVOLCS-DOST | HTML earthquake and volcano bulletins only; no documented feed or API | **Not ingested.** Linked as the authoritative Philippine source. Scraping HTML was rejected: it breaks silently when the page changes, and a missed or garbled earthquake bulletin is worse than none |
| NOAA Pacific Tsunami Warning Center (PTWC) | Atom feed (`tsunami.gov/events/xml/PHEBAtom.xml`) linking CAP documents | Ingested with the existing CAP parser |
| USGS Earthquake Hazards Program | FDSN event web service, GeoJSON, public domain | Ingested: earthquakes in a configurable region and minimum magnitude |
| GDACS (UN OCHA and European Commission JRC) | Public GeoJSON event API, no key | Ingested: earthquakes, tropical cyclones, floods, volcanoes, droughts, wildfires, with GDACS alert levels |

## Decision

1. **One more Edge Function, `ingest-official`,** runs every 10 minutes and reads PTWC, USGS and GDACS, each recorded as its own run in `ddrive_ingest_runs`. One failing source does not stop the others. Each reader keeps the original payload (`raw_payload`, with `raw_format`), follows only its own host over https, and caps time, size and items per run. `ingest-pagasa` is unchanged.
2. **International sources are labelled as such.** USGS and GDACS readings are shown as "USGS (international)" or "GDACS (UN/EC)", with the reminder that PHIVOLCS issues the official Philippine earthquake, tsunami and volcano information. PTWC messages are labelled as a regional tsunami centre's message. Philippine tsunami warnings come from PHIVOLCS.
3. **Nothing is invented or recoloured.** CAP fields stay verbatim (ADR-002). USGS magnitude, depth, PAGER alert colour and tsunami flag, and the GDACS alert level and severity text, are stored as published. No CAP severity is made up for non-CAP sources.
4. **Revisions replace earlier readings.** A USGS event (same id) or a GDACS event (same type and id) that is revised supersedes the earlier row through a new `event_key` column, the way CAP `references` work for PAGASA.
5. **In force:** USGS earthquakes for 24 hours after origin time. GDACS events until their `todate` plus 48 hours, or 72 hours after `fromdate` for earthquakes. CAP alerts as before.
6. **Watch points.** Watch areas may now also carry a point and a radius (km). An alert with coordinates (USGS, GDACS) is in an organisation's watch area when it lies within that radius (great-circle distance). Province matching for CAP is unchanged.
7. **Risk-informed warnings.** `ddrive_alert_risk_context` (a security-invoker view) joins each active alert in the organisation's watch areas with the organisation's latest **approved** DDRiVE hazard assessment (ADR-006), by main hazard. Detection then shows, beside the alert: the assessed risk rating, total vulnerability, the four vulnerability categories and the response-capacity score for that hazard, and links to the assessment and to anticipatory action. It is context for the duty officer, not a forecast, and says so.
8. **Freshness per source.** The Detection screen shows when each feed was last read successfully, and warns after 30 minutes (PAGASA, PTWC) or 60 minutes (USGS, GDACS) without a successful read.

## Consequences

- Earthquake and tsunami information is available in DDRiVE-M for the first time, with clear limits: USGS locations and magnitudes are preliminary and can differ from PHIVOLCS.
- The region and thresholds are environment variables (`DETECTION_BBOX`, `USGS_MIN_MAGNITUDE`), so other countries' tenants can use the same function.
- PHIVOLCS ingestion can be added if PHIVOLCS publishes a structured feed (CAP is the natural choice); the tables already handle any source.
- Alert-to-hazard matching uses event names and GDACS types; unusual event names fall back to "no assessed risk for this hazard", never to a guess.
