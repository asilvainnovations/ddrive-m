# Flood Intelligence pipeline

These scripts are adapted from the Ligtas-AI V2.0 notebooks (author E. Publico) for DDRiVE-M. The design is recorded in [ADR-016](../../docs/adr/016-flood-intelligence.md).

| Script | From notebook | Does |
| --- | --- | --- |
| `01_data_preparation.py` | `01-data-preparation.ipynb` | Joins daily climate with the UP NOAH flood hazard per barangay. Adds rainfall features and labels, and says where the labels came from. |
| `02_model_training.py` | `02-model-training-national.ipynb` | Trains an XGBoost model on a split by time. Scores it against the rule on the same test years and writes a model card. |
| `03_tensorflow_dense.py` | `03-national-tensorflow-exp.ipynb` | Dense network experiment. The scaler is fitted on the training years only, and class weights are used. |
| `04_lstm.py` | `04-national-lstm-exp.ipynb` | LSTM experiment. It builds 7-day windows per barangay, with the flood hazard as a second input. |
| `flood_lib.py` | — | Code shared by the scripts. The rule is read from `src/content/flood-rule-v1.json`, the same file the app uses. |

The scripts are written as plain Python with `# %%` cells, so they open as notebooks in VS Code or with Jupytext.

## Read this before using the results

The original notebooks created the `flood_risk` labels themselves. They applied a hand-written rule (150 mm and 80 mm a day, lowered by the NOAH hazard %) to the same rainfall and hazard columns, and added random draws. The models were then trained on those columns. Their ~99% recall therefore shows that a model can copy the rule. It does not show that it predicts floods.

These scripts keep that option as `--labels synthetic`, which is useful for testing the pipeline. Every model card made from synthetic labels says `"eligible_for_review": false`.

A model can only become eligible for review when two things are true:

1. It is trained and tested on **recorded floods** (`--labels observed`). Sources include:
   - the LGU's own flood incidents
   - DDRiVE-M flood hazard records, by barangay
   - DSWD DROMIC or NDRRMC situation reports
2. Its danger recall on the later test years is at least 0.9.

Even then, DDRiVE-M does not switch models in by itself. Someone reviews the model card first.

## Other changes from the notebooks

- **Antecedent rainfall** is now the 3 days before the day, per barangay. The notebook's `rolling(3).sum()` included the day itself. A missing day makes the value unknown, not zero.
- **The NOAH column** is called `flood_hazard_pct`, not `vulnerability_score`. It measures exposure to the flood hazard, not vulnerability.
- **The split** is by time: training up to 2016, validation 2017–2018, testing from 2019. The notebooks used random rows, which put the same barangays and seasons in both training and test sets.
- **The LSTM** no longer lets one barangay's rain carry into the next barangay's rows, and it uses the hazard input.
- **The synthetic labels** are vectorised, so making them takes seconds instead of a `DataFrame.apply` over 6.4 million rows.
- **The data is described as it is:** Project CCHAIN covers 12 cities from 2003 to 2022, not the whole country.

## Data

The data is the [Project CCHAIN linked dataset](https://thinkingmachines.github.io/project-cchain/), CC BY 4.0. Cite it as: Thinking Machines Data Science (2024), doi:10.34740/kaggle/ds/4918229. You need two of its tables:

- `climate_atmosphere.csv`: `adm4_pcode`, `date`, `freq`, `pr`, `tmax`, `tmin`, …
- `project_noah_hazards.csv`: `adm4_pcode`, `pct_area_flood_hazard_100yr_high`, …

Recorded floods for `--labels observed` go in a CSV with the columns `adm4_pcode,date,level`, where `level` is `warning`, `danger`, `1` or `2`. Add `--absent-as-safe` only if the records list every flood for those barangays and years.

## Run

```bash
pip install -r scripts/flood_intelligence/requirements.txt   # tensorflow as well, for 03 and 04
python scripts/flood_intelligence/01_data_preparation.py --climate data/raw/climate_atmosphere.csv \
  --hazards data/raw/project_noah_hazards.csv --out data/processed/flood_training.csv \
  --labels observed --observed data/raw/recorded_floods.csv --absent-as-safe
python scripts/flood_intelligence/02_model_training.py --data data/processed/flood_training.csv --out models/
cat models/flood_xgb.card.json             # eligible_for_review and the reasons
```

Tests run on a small generated dataset. XGBoost is needed for the training test; TensorFlow is not.

```bash
python -m pytest scripts/flood_intelligence/tests -q
```

## In DDRiVE-M

Detection → **Flood intelligence** applies the same rule (`src/content/flood-rule-v1.json`) to each barangay's recorded or forecast rainfall and its flood hazard. It shows every input and says that the result is decision support, not a warning. `src/lib/__tests__/floodIntel.test.ts` and `tests/test_flood_pipeline.py` both check the rule's golden cases, so the app and the scripts cannot drift apart.

The hazard file (`project_noah_hazards.csv`) can be imported into the app directly. A CCHAIN `climate_atmosphere.csv` extract for one barangay can be imported as rainfall too: it has the columns `adm4_pcode`, `date` and `pr`.
