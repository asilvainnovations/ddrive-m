# %% [markdown]
# # Flood Intelligence 03: dense neural network (experiment)
# Tailored from Ligtas-AI V2.0 `03-national-tensorflow-exp.ipynb` for DDRiVE-M (ADR-016).
#
# Changes from the notebook:
# - The scaler is fitted on the training years only (the notebook fitted it on all rows, test included).
# - Time split as in 02; class weights, which the notebook left out for this model.
# - Writes a model card like 02. This stays an experiment: DDRiVE-M does not run TensorFlow models.
#
# Needs: pip install tensorflow
# Run: python scripts/flood_intelligence/03_tensorflow_dense.py --data data/processed/flood_training.csv --out models/

# %%
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from flood_lib import FEATURES, TimeSplit, class_report, model_card  # noqa: E402


def main(argv=None) -> dict:
    a = argparse.ArgumentParser()
    a.add_argument("--data", required=True, type=Path)
    a.add_argument("--out", required=True, type=Path)
    a.add_argument("--epochs", type=int, default=10)
    a.add_argument("--train-end", default="2016-12-31")
    a.add_argument("--valid-end", default="2018-12-31")
    args = a.parse_args(argv)
    from tensorflow import keras  # imported here so the other scripts do not need TensorFlow

    df = pd.read_csv(args.data, dtype={"adm4_pcode": str}, parse_dates=["date"])
    tr, va, te = TimeSplit(args.train_end, args.valid_end).masks(df["date"])
    X, y = df[FEATURES].to_numpy("float32"), df["flood_level"].to_numpy(int)
    mean, std = X[tr].mean(0), X[tr].std(0) + 1e-6          # training years only
    Xs = (X - mean) / std
    counts = np.bincount(y[tr], minlength=3)
    class_weight = {k: (len(y[tr]) / (3 * c) if c else 0.0) for k, c in enumerate(counts)}

    model = keras.Sequential([
        keras.Input(shape=(len(FEATURES),)),
        keras.layers.Dense(64, activation="relu"), keras.layers.BatchNormalization(), keras.layers.Dropout(0.2),
        keras.layers.Dense(32, activation="relu"), keras.layers.BatchNormalization(),
        keras.layers.Dense(3, activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(Xs[tr], y[tr], validation_data=(Xs[va], y[va]) if va.any() else None,
              epochs=args.epochs, batch_size=2048, class_weight=class_weight, verbose=2,
              callbacks=[keras.callbacks.EarlyStopping(patience=2, restore_best_weights=True)] if va.any() else [])

    metrics = {"test": class_report(y[te], model.predict(Xs[te], batch_size=4096).argmax(1))}
    args.out.mkdir(parents=True, exist_ok=True)
    model.save(args.out / "flood_dense.keras")
    np.savez(args.out / "flood_dense_scaler.npz", mean=mean, std=std, features=np.array(FEATURES))
    manifest_path = args.data.with_suffix(".manifest.json")
    card = model_card(model="keras dense 64-32-3 (experiment)", label_source=df["label_source"].iloc[0], metrics=metrics,
                      manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {})
    (args.out / "flood_dense.card.json").write_text(json.dumps(card, indent=2))
    print(json.dumps(card["metrics"], indent=2))
    return card


if __name__ == "__main__":
    main()
