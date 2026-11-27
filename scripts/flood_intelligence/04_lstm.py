# %% [markdown]
# # Flood Intelligence 04: LSTM over the days before (experiment)
# Tailored from Ligtas-AI V2.0 `04-national-lstm-exp.ipynb` for DDRiVE-M (ADR-016).
#
# Changes from the notebook:
# - Sequences are built per barangay from consecutive days only. The notebook shifted the whole table,
#   so a barangay's first days took the previous barangay's rain.
# - The flood hazard (static) joins the sequence through a second input, instead of being left out.
# - The window is 7 days (rain, tmax, tmin), and the target is the level on the last day.
# - Time split by the target day; scaler fitted on the training years; class weights; model card.
#
# Needs: pip install tensorflow
# Run: python scripts/flood_intelligence/04_lstm.py --data data/processed/flood_training.csv --out models/

# %%
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from flood_lib import TimeSplit, class_report, model_card  # noqa: E402

SEQ = ["rain_today_mm", "tmax", "tmin"]


def build_windows(df: pd.DataFrame, window: int):
    """(sequences [n, window, 3], hazard [n, 1], target [n], target date [n]) from consecutive days of one
    barangay at a time. A window that spans a missing day is skipped."""
    seqs, statics, ys, dates = [], [], [], []
    for _, g in df.sort_values(["adm4_pcode", "date"]).groupby("adm4_pcode", sort=False):
        v = g[SEQ].to_numpy("float32")
        d = g["date"].to_numpy("datetime64[D]")
        if len(g) < window:
            continue
        idx = np.arange(window - 1, len(g))
        ok = (d[idx] - d[idx - (window - 1)]).astype(int) == window - 1   # no gap inside the window
        idx = idx[ok]
        seqs.append(np.stack([v[i - window + 1:i + 1] for i in idx]))
        statics.append(np.full((len(idx), 1), g["flood_hazard_pct"].iloc[0], "float32"))
        ys.append(g["flood_level"].to_numpy(int)[idx])
        dates.append(d[idx])
    if not seqs:
        raise SystemExit("No complete windows: check that the data has consecutive daily rows")
    return np.concatenate(seqs), np.concatenate(statics), np.concatenate(ys), np.concatenate(dates)


def main(argv=None) -> dict:
    a = argparse.ArgumentParser()
    a.add_argument("--data", required=True, type=Path)
    a.add_argument("--out", required=True, type=Path)
    a.add_argument("--window", type=int, default=7)
    a.add_argument("--epochs", type=int, default=5)
    a.add_argument("--train-end", default="2016-12-31")
    a.add_argument("--valid-end", default="2018-12-31")
    args = a.parse_args(argv)
    from tensorflow import keras

    df = pd.read_csv(args.data, dtype={"adm4_pcode": str}, parse_dates=["date"])
    Xs, Xh, y, d = build_windows(df, args.window)
    tr, va, te = TimeSplit(args.train_end, args.valid_end).masks(pd.Series(d))
    m, s = Xs[tr].reshape(-1, len(SEQ)).mean(0), Xs[tr].reshape(-1, len(SEQ)).std(0) + 1e-6
    Xs = (Xs - m) / s
    Xh = Xh / 100.0
    counts = np.bincount(y[tr], minlength=3)
    cw = {k: (len(y[tr]) / (3 * c) if c else 0.0) for k, c in enumerate(counts)}

    seq_in = keras.Input(shape=(args.window, len(SEQ)), name="days")
    haz_in = keras.Input(shape=(1,), name="flood_hazard")
    h = keras.layers.LSTM(32)(seq_in)
    h = keras.layers.Dropout(0.2)(h)
    h = keras.layers.Concatenate()([h, haz_in])
    h = keras.layers.Dense(16, activation="relu")(h)
    out = keras.layers.Dense(3, activation="softmax")(h)
    model = keras.Model([seq_in, haz_in], out)
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit([Xs[tr], Xh[tr]], y[tr], validation_data=([Xs[va], Xh[va]], y[va]) if va.any() else None,
              epochs=args.epochs, batch_size=4096, class_weight=cw, verbose=2)

    metrics = {"test": class_report(y[te], model.predict([Xs[te], Xh[te]], batch_size=4096).argmax(1))}
    args.out.mkdir(parents=True, exist_ok=True)
    model.save(args.out / "flood_lstm.keras")
    manifest_path = args.data.with_suffix(".manifest.json")
    card = model_card(model=f"keras LSTM(32) over {args.window} days + flood hazard (experiment)",
                      label_source=df["label_source"].iloc[0], metrics=metrics,
                      manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {})
    (args.out / "flood_lstm.card.json").write_text(json.dumps(card, indent=2))
    print(json.dumps(card["metrics"], indent=2))
    return card


if __name__ == "__main__":
    main()
