# ADR-019: Sub-regional validation operations (ICS simulator, flood watch, ECHO, EOC activation from contingency plans)

- Status: Accepted for controlled testing
- Date: 2026-11-28
- Migration: `20261128020000_phase5_validation_operations.sql`
- Builds on: ADR-013 (plans, forms, exercises), ADR-014 (UP NOAH), ADR-016 (flood intelligence), ADR-017 (EOC operations)
- Source reviewed: MODE, the Ormoc City CDRRMO platform (`ormoc-drrmo-main`), Apache License 2.0

## Context

MODE serves one city (Ormoc, 110 barangays). It has four tools that the Validation phase of DDRiVE-M lacked:

1. An ICS exercise: a scoring engine and six Ormoc scenarios.
2. Flood intelligence: a barangay watch list, a benefit-cost screen, and a reference prototype that lists UP NOAH / LiPAD flood hazard layers. Four of those layers are for Metro Manila LGUs.
3. ECHO, for evacuation and camp handling: Sphere, JMC No. 02 s. 2021 and RA 12076 benchmarks, kept apart.
4. Contingency plans that activate response clusters on an open EOC activation (MODE ADR-017).

The request was to tailor these to a provincial or sub-regional level such as Metro Manila. That level is different from a city:

- **Several Responsible Officials.** Each Local Chief Executive is the Responsible Official in their own LGU.
- **A coordinating council.** The MMDRRMC, chaired by the MMDA Chair with OCD-NCR as Senior Vice-Chair, coordinates across LGUs.
- **Hazards cross boundaries.** For example, a reading at the Marikina River's Sto. Niño gauge is lead time for Pasig and Manila downstream.
- **Evacuees cross boundaries.** One LGU may host another LGU's evacuees.

## Decision

1. **Sub-region as data** (`src/content/subRegions.ts`).
   - Metro Manila is the first preset. It holds:
     - the 17 LGUs with their 9-digit PSGC codes and districts;
     - the council and its secretariat;
     - the UP NOAH flood layer names known from MODE;
     - the Marikina River alarm protocol (15 m prepare, 16 m evacuate, 18 m forced evacuation), with its source.
   - There are no population or hazard figures in code. Those come from the organisation's own records.
   - Another province or sub-region is a new entry, not a code change.
2. **ICS simulator** (Validation → ICS simulator).
   - The MODE engine is adapted: scoring on five weighted dimensions, timeliness, the doctrine behind each answer, and the tabletop spotlight.
   - There are three Metro Manila scenarios:
     - a Marikina–Pasig flood;
     - a West Valley Fault magnitude 7.2 earthquake (MMEIRS Model 08; Oplan Metro Yakal Plus quadrants);
     - a Manila Bay storm surge.
   - The best options test multi-LGU coordination: sharing the upstream gauge with downstream LGUs, hosting only with the receiving LGU's consent, and declarations under RA 10121 Sec. 16.
   - Runs are saved to `ddrive_ics_runs`, which is append-only:
     - anyone in the organisation can train;
     - a participant sees their own runs, and analysts see all runs;
     - a run can be linked to an exercise.
   - The tests check that every phase has exactly one best option, and that the best option leads on decision quality.
3. **Flood watch** (Validation → Flood intelligence).
   - The outlook from ADR-016 is rolled up to LGUs by PSGC.
   - Areas that cannot be matched to an LGU are kept and listed as unmatched.
   - The watch list can be copied or added to the EOC operations log.
   - The Marikina gauge reading is shown against the published alarms.
   - UP NOAH layers are listed as references and are not loaded (ADR-014).
   - MODE's benefit-cost screen is included. It has no built-in figures and saves nothing.
   - No new rainfall or river threshold is set.
4. **ECHO with evacuation intelligence** (Validation → ECHO).
   - A per-LGU worksheet covers displaced persons (sex, age and disability) and the centres' covered area, water and toilets.
   - The checks are against Sphere 3.5 m², Sphere 15 L, JMC 52 L, and JMC 1:50 / 1:20, each with its own source.
   - For each LGU short of space, **candidate hosts** in the same district are listed, the largest spare space first. A candidate is labelled as needing the receiving LGU's consent, a checked route, and the CCCM cluster.
   - Gaps and hosting become exercise checks (`ddrive_exercise_checks`).
   - The worksheet itself stays in the browser.
5. **EOC activation from contingency plans** (Validation → EOC activation from plans).
   - `ddrive_response_clusters` holds the 12 clusters of the national cluster approach, as listed in the DILG Region VIII harmonised SOP. Shelter is led by DHSUD under NDRRMC Res. 10 s. 2021.
   - `ddrive_cp_items` holds the activation set of each contingency plan:
     - each cluster or Memo 131 EOC function is lead, on or standby, from BLUE or RED;
     - analysts edit the sets of draft plans;
     - only a DRRM officer edits the set of an approved plan.
   - `ddrive_cp_activate()` records activations in `ddrive_cp_activations`, which is append-only:
     - **Live:** a DRRM officer activates on the current BLUE or RED status. The activation is logged as a decision in the EOC operations log.
     - **Exercise:** an analyst activates at the level the exercise assumes. Nothing is written to the EOC log.
   - In both cases, items whose minimum level is above the current level are on standby. A plan that is not yet approved can be activated, and the record and the log say so.
   - Activation never changes the EOC level.
6. **Licence.**
   - MODE code adapted here keeps its Apache 2.0 notice in the file header and in `THIRD_PARTY_NOTICES.md`.
   - The scenario text is new.

## Consequences

- Validation now exercises the multi-LGU decisions that a single-city tool cannot. These are coordination through the council, cross-boundary warning, cross-boundary hosting, and cluster activation by plan.
- Host suggestions are only as good as the figures entered.
  - Covered area is the capacity measure. Sphere's 45 m² settlement figure is shown as a reference, not used.
  - Suggestions stay within a district. Hosting across districts is a decision for the MMDRRMC, not a suggestion.
- The Marikina alarm levels are the city's. If the city changes them, `subRegions.ts` is updated. The city's advisory always governs.
- The ICS scenarios are composites for training, not forecasts. MMEIRS figures are cited from the 2004 study as context.
- Tests:
  - SQL suite `120_phase5_validation_operations.sql` (39 checks)
  - unit tests `validationOps.test.ts` (19)
  - browser suite `e2e/validation.mjs` (29)
