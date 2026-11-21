# Test data

Real CAP documents and an Atom feed published by PAGASA-DOST at https://publicalert.pagasa.dost.gov.ph/feeds/
(October 2026), used to test the parser. Copyright PAGASA-DOST, licensed CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/). Unmodified, except that `pagasa-gfa-update.cap` is renamed.

| File | What it is |
| --- | --- |
| `pagasa-feed.xml` | The Atom feed index; each entry links to one CAP document |
| `pagasa-wcp-signal1.cap` | Tropical Cyclone Warning, Signal No. 1, one province by PSGC code |
| `pagasa-acp.cap` | Tropical Cyclone Alert for the Philippine Area of Responsibility (polygon, no codes); an Update |
| `pagasa-gfa.cap` | General Flood Advisory, six provinces with codes and outlines; an Update |
| `pagasa-gfa-update.cap` | General Flood Advisory update for Cagayan and Batanes |

## Other sources (ADR-005)

These fixtures are **constructed for the tests**, following each source's published format; they are not copies of
real alerts, and the events in them did not happen.

| File | What it is |
| --- | --- |
| `usgs-sample.geojson` | USGS FDSN event GeoJSON (format: earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php): a reviewed M5.3 off Eastern Samar with a PAGER colour, an automatic M4.4 in Mindanao, an M6.1 near Fiji (outside the region, tsunami flag set), and a "deleted" event |
| `gdacs-sample.json` | GDACS event list (structure as served by gdacs.org/gdacsapi/api/events/geteventlist/SEARCH, November 2026): an Orange tropical cyclone near the Philippines, a European drought (outside the region), a Green earthquake in the Philippines, and an unknown event type |
| `ptwc-feed.xml`, `ptwc-cap.xml` | PTWC Atom feed entry linking a CAP 1.2 Tsunami Information Statement (structure as on tsunami.gov/events/xml/PHEBAtom.xml) |
