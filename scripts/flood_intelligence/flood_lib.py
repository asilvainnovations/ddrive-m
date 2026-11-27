"""Shared code for the DDRiVE-M Flood Intelligence pipeline (ADR-016).

Tailored from the Ligtas-AI V2.0 notebooks (01-data-preparation, 02-model-training-national,
03-national-tensorflow-exp, 04-national-lstm-exp). The rule lives in src/content/flood-rule-v1.json so the
scripts and the DDRiVE-M app compute exactly the same thing; the golden cases in that file are checked by
both test suites.

What changed from the notebooks, and why:
- Antecedent rainfall is the sum of the 3 days *before* the day, per barangay. The notebook's
  rolling(3).sum() included the day itself, so "rain yesterday" was partly today's rain.
- The NOAH column is called flood_hazard_pct (hazard exposure), not vulnerability_score.
- Labels say where they come from (label_source). Rule-made labels are "synthetic_rule_v1": a model
  trained on them learns the rule, so it is never marked usable for decisions.
- Splits are by time (train on earlier years, test on later ones), not random rows: rows of the same
  barangay and season in both sets make any score look better than it is.
- The rule is vectorised (numpy) instead of DataFrame.apply over 6.4 million rows.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RULE_PATH = ROOT / "src" / "content" / "flood-rule-v1.json"
LEVELS = ("safe", "warning", "danger")
FEATURES = ["rain_today_mm", "rain_prev_mm", "tmax", "tmin", "flood_hazard_pct"]
SYNTHETIC = "synthetic_rule_v1"
OBSERVED = "observed"


def load_rule(path: Path = RULE_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _ramp(r: np.ndarray, part: dict, onset: float) -> np.ndarray:
    """Probability from the ratio of rain to the adjusted threshold (the notebook's piecewise curve)."""
    p = np.where(
        r >= part["full_ratio"], 1.0,
        np.where(r >= part["half_ratio"], part["at_half"] + (r - part["half_ratio"]) * part["ramp_above"],
                 (r - onset) * part["ramp_below"]),
    )
    return np.where(r > onset, p, 0.0)


def rule_probabilities(rain_today, rain_prev, hazard_pct, rule: dict | None = None):
    """Danger and warning probabilities of the rule, element-wise. Inputs are arrays or scalars (mm, mm, %)."""
    rule = rule or load_rule()
    t = np.asarray(rain_today, dtype=float)
    prev = np.asarray(rain_prev, dtype=float)
    h = np.clip(np.asarray(hazard_pct, dtype=float), 0, 100)
    factor = np.maximum(1.0 - h / 100.0, rule["min_factor"])
    onset = rule["onset_ratio"]
    p_danger = _ramp(t / (rule["base_danger_mm"] * factor), rule["danger"], onset)
    p_danger = p_danger + np.where(prev > rule["antecedent_bonus"]["above_mm"], rule["antecedent_bonus"]["add"], 0.0)
    p_danger = np.minimum(p_danger, 1.0)
    p_warning = np.minimum(_ramp(t / (rule["base_warning_mm"] * factor), rule["warning"], onset), 1.0)
    return p_danger, p_warning


def rule_level(p_danger, p_warning) -> np.ndarray:
    """Most likely level under the rule: danger with p_danger, else warning with p_warning, else safe.
    Ties go to the more severe level. Returns 0 safe, 1 warning, 2 danger."""
    pd_ = np.asarray(p_danger, dtype=float)
    pw = np.asarray(p_warning, dtype=float)
    p_safe, p_warn = (1 - pd_) * (1 - pw), (1 - pd_) * pw
    eps = 1e-9
    return np.where(pd_ + eps >= np.maximum(p_warn, p_safe), 2, np.where(p_warn + eps >= p_safe, 1, 0))


def synthetic_labels(rain_today, rain_prev, hazard_pct, seed: int = 42, rule: dict | None = None) -> np.ndarray:
    """The notebook's 'roll the dice' labels (0 safe, 1 warning, 2 danger), vectorised. For pipeline tests only."""
    p_danger, p_warning = rule_probabilities(rain_today, rain_prev, hazard_pct, rule)
    rng = np.random.default_rng(seed)
    d = rng.random(p_danger.shape) < p_danger
    w = rng.random(p_warning.shape) < p_warning
    return np.where(d, 2, np.where(w, 1, 0)).astype(np.int8)


def add_rain_features(df: pd.DataFrame, days: int = 3) -> pd.DataFrame:
    """rain_today_mm and rain_prev_mm (sum of the `days` calendar days before), per barangay.
    rain_prev_mm is NaN, not 0, when any of those days is missing (the first days of a series, or a gap):
    unknown is not dry. Rows of one barangay never borrow rain from another."""
    df = df.sort_values(["adm4_pcode", "date"]).copy()
    df["date"] = pd.to_datetime(df["date"])
    df["rain_today_mm"] = df["pr"].astype(float)
    g = df.groupby("adm4_pcode", sort=False)
    total = pd.Series(0.0, index=df.index)
    complete = pd.Series(True, index=df.index)
    for k in range(1, days + 1):
        total = total + g["pr"].shift(k)
        complete &= (df["date"] - g["date"].shift(k)).dt.days == k
    df["rain_prev_mm"] = total.where(complete)
    return df


@dataclass
class TimeSplit:
    train_end: str = "2016-12-31"
    valid_end: str = "2018-12-31"   # test is everything after

    def masks(self, dates: pd.Series):
        d = pd.to_datetime(dates)
        train = d <= pd.Timestamp(self.train_end)
        valid = (d > pd.Timestamp(self.train_end)) & (d <= pd.Timestamp(self.valid_end))
        test = d > pd.Timestamp(self.valid_end)
        return train.values, valid.values, test.values


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def class_report(y_true, y_pred) -> dict:
    """Per-class precision and recall, and the confusion matrix, without sklearn's formatting."""
    y_true = np.asarray(y_true); y_pred = np.asarray(y_pred)
    out = {"support": {}, "precision": {}, "recall": {}}
    cm = np.zeros((3, 3), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[int(t), int(p)] += 1
    for k, name in enumerate(LEVELS):
        tp = cm[k, k]
        out["support"][name] = int(cm[k].sum())
        out["recall"][name] = float(tp / cm[k].sum()) if cm[k].sum() else None
        out["precision"][name] = float(tp / cm[:, k].sum()) if cm[:, k].sum() else None
    out["confusion"] = cm.tolist()
    return out


def model_card(*, model: str, label_source: str, metrics: dict, manifest: dict, min_danger_recall: float = 0.9) -> dict:
    """Says whether a model may be used for decisions. Only models trained and tested on observed floods,
    with danger recall on the later-years test set at or above min_danger_recall, are eligible; and then
    only after review (DDRiVE-M does not switch models in automatically)."""
    reasons = []
    if label_source != OBSERVED:
        reasons.append("Labels were made by the rule, not observed floods: the model reproduces the rule.")
    rec = metrics.get("test", {}).get("recall", {}).get("danger")
    if rec is None:
        reasons.append("No danger events in the test years.")
    elif rec < min_danger_recall:
        reasons.append(f"Danger recall on the test years is {rec:.2f}, below {min_danger_recall}.")
    return {
        "model": model,
        "rule": load_rule()["id"],
        "label_source": label_source,
        "data": manifest,
        "metrics": metrics,
        "eligible_for_review": not reasons,
        "not_eligible_because": reasons,
        "note": "Decision support only. PAGASA issues rainfall and flood warnings; the LDRRMO decides on action.",
    }
