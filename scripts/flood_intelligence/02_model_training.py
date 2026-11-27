# %% [markdown]
# # Flood Intelligence 02: XGBoost model
# Tailored from Ligtas-AI V2.0 `02-model-training-national.ipynb` for DDRiVE-M (ADR-016).
#
# Changes from the notebook:
# - Split by time (train to 2016, validate 2017-2018, test 2019 on), not random rows.
# - `multi:softprob`, so the model gives probabilities, with early stopping on the validation years.
# - Class weights are computed on the training years only.
# - The rule itself is scored on the same test years as a baseline. A model that does no better than the
#   rule adds nothing; with synthetic labels it cannot.
# - Writes a model card (`*.card.json`) that says whether the model may even be reviewed for use.
#
# Run: python scripts/flood_intelligence/02_model_training.py --data data/processed/flood_training.csv --out models/

# %%
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from flood_lib import FEATURES, TimeSplit, class_report, model_card, rule_level, rule_probabilities  # noqa: E402


def balanced_weights(y: np.ndarray) -> np.ndarray:
    classes, counts = np.unique(y, return_counts=True)
    w = {c: len(y) / (len(classes) * n) for c, n in zip(classes, counts)}
    return np.array([w[v] for v in y])


def parse_args(argv=None):
    a = argparse.ArgumentParser()
    a.add_argument("--data", required=True, type=Path)
    a.add_argument("--out", required=True, type=Path)
    a.add_argument("--train-end", default="2016-12-31")
    a.add_argument("--valid-end", default="2018-12-31")
    a.add_argument("--trees", type=int, default=300)
    a.add_argument("--depth", type=int, default=8)
    return a.parse_args(argv)


def main(argv=None) -> dict:
    import xgboost as xgb

    args = parse_args(argv)
    df = pd.read_csv(args.data, dtype={"adm4_pcode": str}, parse_dates=["date"])
    label_source = df["label_source"].iloc[0]
    manifest_path = args.data.with_suffix(".manifest.json")
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    # %% Split by time
    tr, va, te = TimeSplit(args.train_end, args.valid_end).masks(df["date"])
    if not tr.any() or not te.any():
        raise SystemExit("The time split leaves the training or test years empty; adjust --train-end / --valid-end")
    X, y = df[FEATURES].to_numpy(float), df["flood_level"].to_numpy(int)
    print(f"Train {tr.sum():,} rows, validate {va.sum():,}, test {te.sum():,}; labels: {label_source}")

    # %% Train
    model = xgb.XGBClassifier(
        n_estimators=args.trees, learning_rate=0.1, max_depth=args.depth, objective="multi:softprob",
        num_class=3, tree_method="hist", random_state=42, n_jobs=-1,
        early_stopping_rounds=30 if va.any() else None, eval_metric="mlogloss",
    )
    model.fit(X[tr], y[tr], sample_weight=balanced_weights(y[tr]),
              eval_set=[(X[va], y[va])] if va.any() else None, verbose=False)

    # %% Evaluate the model and the rule on the same years
    metrics = {}
    for name, m in (("valid", va), ("test", te)):
        if m.any():
            metrics[name] = class_report(y[m], model.predict(X[m]))
    pdg, pwn = rule_probabilities(df.loc[te, "rain_today_mm"], df.loc[te, "rain_prev_mm"], df.loc[te, "flood_hazard_pct"])
    metrics["rule_baseline_test"] = class_report(y[te], rule_level(pdg, pwn))
    print(json.dumps(metrics, indent=2))

    # %% Save the model and its card
    args.out.mkdir(parents=True, exist_ok=True)
    model_path = args.out / "flood_xgb.json"
    model.save_model(model_path)
    card = model_card(model=f"xgboost {xgb.__version__}, {args.trees} trees, depth {args.depth}, features {FEATURES}",
                      label_source=label_source, metrics=metrics, manifest=manifest)
    (args.out / "flood_xgb.card.json").write_text(json.dumps(card, indent=2))
    print(f"Saved {model_path}. Eligible for review: {card['eligible_for_review']}")
    for r in card["not_eligible_because"]:
        print(f"  - {r}")
    return card


if __name__ == "__main__":
    main()
