# ADR-016: Flood Intelligence

- Status: Accepted for controlled testing
- Date: 2026-11-27
- Migration: `20261127080000_phase1_flood_intelligence.sql`; scripts: `scripts/flood_intelligence/`
- Builds on: ADR-005 (detection sources), ADR-010 (hazard sync), ADR-014 (UP NOAH)

## Context

The Ligtas-AI V2.0 notebooks (`01-data-preparation`, `02-model-training-national`, `03-national-tensorflow-exp`, `04-national-lstm-exp`) join daily climate with UP NOAH's 100-year flood hazard per barangay. They then train XGBoost, a dense network and an LSTM to classify each day as safe, warning or danger, and report about 99% recall.

The review found these problems:

1. **The labels are not floods.** Notebook 01 creates `flood_risk` from the same rainfall and hazard columns with a hand-written rule (150 mm and 80 mm a day, lowered by the hazard share), plus random draws. The models learn the rule back. Their scores measure that, not flood prediction.
2. **Antecedent rainfall includes the day itself.** The notebook uses `rolling(3).sum()`, and fills missing values with 0.
3. **The LSTM shifts the whole table.** A barangay's first days take the previous barangay's rain. The hazard input is also left out.
4. **The split is random.** Days of the same barangays and seasons end up in both training and test data. Notebook 03 also fits its scaler on all rows, test rows included.
5. **The hazard share is called `vulnerability_score`.** It is hazard exposure, not vulnerability.
6. **"National" is overstated.** The data is Project CCHAIN: 12 cities, 2003–2022, CC BY 4.0.

## Decision

1. **One rule, written once.** The rule is kept in `src/content/flood-rule-v1.json`, with its parameters, source, status and golden cases. Both the Python pipeline and the app read it, and both test suites check the golden cases.
   - The only change from the notebook is antecedent rainfall, which is now the 3 days *before* the day.
   - The app shows the most likely level, without random draws:
     - **High** with probability p_danger,
     - otherwise **Watch** with probability p_warning,
     - otherwise **Low**.
2. **Pipeline scripts** (`scripts/flood_intelligence/01_…04_…`) fix problems 2 to 5.
   - Labels carry their source: `observed` or `synthetic_rule_v1`.
   - Each trained model gets a model card. It is `eligible_for_review` only when it was trained and tested on observed floods and its danger recall on the later years is at least 0.9.
   - Synthetic labels are never eligible.
3. **In the app (Detection → Flood intelligence):**
   - **Barangays (`ddrive_flood_areas`):** each has its flood hazard share and the source of that value. An analyst adds them or imports a CSV, for example CCHAIN's `project_noah_hazards.csv`.
   - **Daily rainfall (`ddrive_rainfall`):** observed or forecast, with its source. Responders record or import it. An observation cannot be for a future day, and a reading always belongs to the organisation of its barangay.
   - **The outlook table:** for the chosen day, each barangay's rainfall, the rain of the 3 days before (missing days are flagged), the thresholds lowered by its hazard, the probabilities and the level. A barangay with no rainfall for the day gets no outlook, because no reading is not "no rain".
   - **"Log as hazard record"** opens a flood hazard record prefilled from the outlook. From that record, actions go to Response as before (ADR-008).
   - The panel says it is decision support, not a warning or a forecast (PAGASA warns, RA 10639; the LDRRMO decides). It also says the rule has not been checked against recorded floods.
4. **No trained model runs in the app.** A model trained on synthetic labels is the rule with extra error. A model trained on observed floods can replace the rule only after its card is reviewed. That will be its own change, with the model file, its card and a switch, and it is not part of this ADR.

## Consequences

- **The outlook is only as good as the rule and its inputs.** Calibrating against recorded floods comes next, using the flood hazard records DDRiVE-M collects by barangay.
- **No automatic rainfall feed is connected.** PAGASA publishes no open rainfall data feed, and commercial weather APIs need a licence. Rainfall comes from LGU gauges, PAGASA readings and forecasts typed in or imported. PAGASA's rainfall warnings still arrive in Detection's official alerts (ADR-002).
- **Credit:** UP NOAH for the hazard data, and Project CCHAIN (CC BY 4.0) when imported from it. Both are named in the panel.
- **Tests:**
  - SQL suite `100_phase1_flood_intelligence.sql` (23 checks)
  - unit tests `floodIntel.test.ts` (7)
  - pipeline tests `scripts/flood_intelligence/tests` (8)
  - browser test `e2e/flood.mjs`
