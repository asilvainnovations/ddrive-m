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
