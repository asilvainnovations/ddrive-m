# %% [markdown]
# # Flood Intelligence 01: data preparation
# Tailored from Ligtas-AI V2.0 `01-data-preparation.ipynb` for DDRiVE-M (ADR-016).
#
# Joins daily climate (Project CCHAIN `climate_atmosphere.csv`) with UP NOAH flood hazard per barangay
# (Project CCHAIN `project_noah_hazards.csv`, column `pct_area_flood_hazard_100yr_high`), adds rainfall
# features per barangay, and attaches labels with their source.
#
# Project CCHAIN covers 12 Philippine cities, 2003-2022 (CC BY 4.0, Thinking Machines Data Science,
# doi:10.34740/kaggle/ds/4918229). Credit it wherever its data or results are shown.
#
# Labels:
# - `--labels observed --observed floods.csv` (recommended): recorded floods per barangay and day, with
#   columns adm4_pcode, date, level (warning|danger or 1|2). Days not listed count as safe only if the
#   record is complete for the barangay; say so with --absent-as-safe.
# - `--labels synthetic`: the notebook's rule with random draws. A model trained on these learns the rule;
#   use them to test the pipeline, never to judge a model.
#
# Run: python scripts/flood_intelligence/01_data_preparation.py --climate data/raw/climate_atmosphere.csv \
#        --hazards data/raw/project_noah_hazards.csv --out data/processed/flood_training.csv --labels synthetic

# %%
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from flood_lib import FEATURES, OBSERVED, SYNTHETIC, add_rain_features, file_sha256, load_rule, synthetic_labels  # noqa: E402

HAZARD_COL = "pct_area_flood_hazard_100yr_high"
CLIMATE_COLS = {"adm4_pcode", "date", "pr", "tmax", "tmin"}
LEVEL_CODES = {"safe": 0, "warning": 1, "danger": 2, "0": 0, "1": 1, "2": 2}


def parse_args(argv=None):
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--climate", required=True, type=Path)
    a.add_argument("--hazards", required=True, type=Path)
    a.add_argument("--out", required=True, type=Path)
    a.add_argument("--labels", choices=["observed", "synthetic"], required=True)
    a.add_argument("--observed", type=Path, help="CSV of recorded floods: adm4_pcode,date,level")
    a.add_argument("--absent-as-safe", action="store_true", help="Days with no recorded flood are safe (only if records are complete)")
    a.add_argument("--seed", type=int, default=42)
    return a.parse_args(argv)


def main(argv=None) -> dict:
    args = parse_args(argv)
    if args.labels == "observed" and not args.observed:
        raise SystemExit("--labels observed needs --observed floods.csv")

    # %% 1. Load (codes as text: PSGC codes have leading characters and zeros)
    climate = pd.read_csv(args.climate, dtype={"adm4_pcode": str})
    hazards = pd.read_csv(args.hazards, dtype={"adm4_pcode": str})
    missing = CLIMATE_COLS - set(climate.columns)
    if missing:
        raise SystemExit(f"climate file lacks columns: {sorted(missing)}")
    if HAZARD_COL not in hazards.columns:
        raise SystemExit(f"hazard file lacks {HAZARD_COL}")
    if "freq" in climate.columns:
        climate = climate[climate["freq"] == "D"]          # daily rows only
    climate["date"] = pd.to_datetime(climate["date"])
    print(f"Climate rows: {len(climate):,} for {climate['adm4_pcode'].nunique():,} barangays")

    # %% 2. Join the hazard; barangays without a NOAH value are dropped and counted
    hz = hazards[["adm4_pcode", HAZARD_COL]].dropna().drop_duplicates("adm4_pcode")
    df = climate.merge(hz, on="adm4_pcode", how="inner").rename(columns={HAZARD_COL: "flood_hazard_pct"})
    dropped = sorted(set(climate["adm4_pcode"]) - set(df["adm4_pcode"]))
    print(f"Joined rows: {len(df):,}; barangays without a NOAH hazard value: {len(dropped)}")

    # %% 3. Rainfall features per barangay (3 days before the day; unknown stays unknown)
    rule = load_rule()
    df = add_rain_features(df, rule["antecedent_days"])

    # %% 4. Labels, with their source
    if args.labels == "synthetic":
        ok = df["rain_prev_mm"].notna()
        df["flood_level"] = pd.Series(pd.NA, index=df.index, dtype="Int8")
        df.loc[ok, "flood_level"] = synthetic_labels(df.loc[ok, "rain_today_mm"], df.loc[ok, "rain_prev_mm"], df.loc[ok, "flood_hazard_pct"], seed=args.seed, rule=rule)
        label_source = SYNTHETIC
    else:
        obs = pd.read_csv(args.observed, dtype={"adm4_pcode": str, "level": str})
        obs["date"] = pd.to_datetime(obs["date"])
        obs["flood_level"] = obs["level"].str.strip().str.lower().map(LEVEL_CODES)
        if obs["flood_level"].isna().any():
            raise SystemExit("observed levels must be warning, danger, 1 or 2")
        obs = obs.groupby(["adm4_pcode", "date"], as_index=False)["flood_level"].max()
        df = df.merge(obs, on=["adm4_pcode", "date"], how="left")
        if args.absent_as_safe:
            df["flood_level"] = df["flood_level"].fillna(0)
        label_source = OBSERVED

    # %% 5. Save the prepared data and a manifest that says what it is
    out = df.dropna(subset=FEATURES + ["flood_level"])[["adm4_pcode", "date"] + FEATURES + ["flood_level"]].copy()
    out["flood_level"] = out["flood_level"].astype(int)
    out["label_source"] = label_source
    args.out.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(args.out, index=False, date_format="%Y-%m-%d")
    manifest = {
        "created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rows": int(len(out)),
        "barangays": int(out["adm4_pcode"].nunique()),
        "dates": [out["date"].min().strftime("%Y-%m-%d"), out["date"].max().strftime("%Y-%m-%d")] if len(out) else None,
        "label_source": label_source,
        "absent_as_safe": bool(args.absent_as_safe) if args.labels == "observed" else None,
        "class_counts": {str(k): int(v) for k, v in out["flood_level"].value_counts().sort_index().items()},
        "barangays_without_hazard": len(dropped),
        "rule": rule["id"],
        "seed": args.seed if args.labels == "synthetic" else None,
        "inputs": {p.name: file_sha256(p) for p in [args.climate, args.hazards] + ([args.observed] if args.observed else [])},
        "credit": "Project CCHAIN, Thinking Machines Data Science (2024), CC BY 4.0; flood hazard: UP NOAH",
    }
    with open(args.out.with_suffix(".manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))
    if label_source == SYNTHETIC:
        print("NOTE: synthetic labels. A model trained on them learns the rule; it is not evidence of flood prediction.")
    return manifest


if __name__ == "__main__":
    main()
