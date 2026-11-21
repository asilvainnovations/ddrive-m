# ADR-006: DDRiVE hazard, vulnerability and risk assessment in Diagnosis

- Status: Accepted
- Date: 2026-11-22
- Phase: 3
- Source: `DDRiVE_Diagnosis_Tool.xlsm`, the Data-Driven Risk and Vulnerability Estimation (DDRiVE) Tool, an adaptation of UNDRR's Quick Risk Estimation (QRE) tool for the Making Cities Resilient campaigns

## Context

Diagnosis held a bare likelihood × impact register. ASilva's DDRiVE workbook is the method its workshops use: per hazard event, a group scores **exposure**, **vulnerability** in four categories and **current response measures** on 0–10 verbal scales; the workbook derives a total vulnerability, a likelihood ranking, a severity rating and a risk rating from a 5×5 matrix (VL1 … VH9). It adds hazard-family reports, compound scenarios and a hazard glossary (IRDR peril classification).

The workbook's formulas (sheet *Hazard Data Entry*, parameters in *Assumptions*):

- Total vulnerability `TV = (V_infra + V_productive + V_services + V_social) × 0.25 × 10` (0–100)
- Likelihood ranking `LR = INDEX(scores, MATCH(exposure) × 0.5 + (TV / 10) × 0.5)`
- Severity `SR = LR × 10 − response × 10` (−100 to 100)
- Risk rating: `VL1` when `SR ≤ 0`, else the matrix cell for SR's band (0–10, 11–25, 26–50, 51–75, 76–100) and LR's band (0–2, 2.1–4, 4.1–6, 6.1–8, 8.1–10)

The `INDEX` call truncates the fractional row number and the list is offset by one, so the workbook computes `LR = floor(0.5 × exposure + 0.05 × TV − 0.5)` (an integer), not the weighted average `0.5 × exposure + 0.05 × TV` that its Instructions and scenario examples describe. Example: exposure 9, TV 80 gives 8 in the workbook and 8.5 by the described method. The workbook's own case study table (Instructions rows 144–149) matches the truncated values; its scenario examples (rows 171–192) use the continuous ones.

## Decision

1. **Same method, in the database.** `ddrive_hazard_assessments` (ref `HA-001`) holds the Information sheet (location, assets examined, assessor, completion and review dates, version, PSGC code). `ddrive_hazard_assessment_entries` holds one row per hazard event, with the workbook's inputs. A trigger computes TV, LR, SR, the severity class, the likelihood level and the risk rating, so every screen, report and export shows the same numbers. A TypeScript copy (`src/lib/ddriveAssessment/scoring.ts`) gives instant previews and is tested against the SQL on the same cases.
2. **Both likelihood methods, recorded.** Each assessment stores its `method`: `workbook` (default; reproduces the DDRiVE workbook and its case study exactly) or `continuous` (the weighting the Instructions describe, one decimal). The parameters (likelihood proportion 0.5, maximum 10, vulnerability weighting 0.25) are stored with the assessment. The method and parameters cannot change after approval. The matrix bands are applied as half-open intervals so decimal values never fall between bands.
3. **Hazard catalogue as reference data.** The eight families (H1 Geophysical … H7 Anthropogenic, H8 Other/user-defined), their main hazards and their hazard events are seeded from the workbook's *Assumptions* lists into `ddrive_hazard_catalogue`, with the IRDR glossary definitions. Entries are checked against it; H8 accepts a user-named main hazard and any event.
4. **Scales keep their words.** 0–10 scores are entered and shown with the workbook's labels ("9-Extremely likely", "4-Some measures in place"), never as bare numbers.
5. **Scenarios** follow the Instructions: average LR over the chosen events; severity is the event's own SR for a single event, otherwise the mean over hazard families of Σ(LR × SR) / 10 per family, capped at 100. This reproduces the three worked examples (H8, M5, H7).
6. **Templates make it quick.** Starting sets of hazard events for common Philippine settings (coastal LGU, upland LGU, volcanic area, highly urbanised city, enterprise site) prefill unscored rows; the group then scores them. A filled workbook (`.xlsm`/`.xlsx`) can be imported as a draft: the *Information* and *Hazard Data Entry* sheets are read in the browser; macros are never run.
7. **Link to the risk register.** An analyst can add a scored entry to the register (`ddrive_risks`). The register keeps its 1–5 × 1–5 scale; the server maps the LR level (Very Low … Very High → 1–5) and severity class (Insignificant … Catastrophic → 1–5) and keeps the DDRiVE rating, total vulnerability and a link back to the entry.
8. **Approval.** Analysts draft and score; a DRRM officer approves. An approved assessment is locked; a new version copies it as a draft. Only the latest approved assessment feeds the risk-informed warnings (ADR-005).
9. **Reports**: Data Scores (per family, with total severity per family), Risk Summary (likelihood × severity and exposure × vulnerability bubble charts), Vulnerability Report (the four categories), CSV export, and a print view replacing the workbook's "PDF active sheet" macro.

## Consequences

- Results match the workbook the facilitators already use, and the deviation from the described method is visible and selectable rather than silently "fixed".
- The workbook's guidance holds: the tool is for workshops with several stakeholders, not one assessor. The screen says so, and the assessor field names the facilitator.
- Scores are relative rankings for prioritising, not probabilities. Every report says so.
