"""Run: python -m pytest scripts/flood_intelligence/tests -q"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import flood_lib as fl  # noqa: E402


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), HERE / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fixture(tmp: Path, barangays=("PH0001", "PH0002", "PH0003"), start="2014-01-01", end="2020-12-31", seed=1):
    """A small CCHAIN-shaped dataset: random daily rain with storms, three barangays of low to high hazard."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range(start, end, freq="D")
    rows = []
    for b in barangays:
        rain = rng.gamma(0.4, 12, len(dates))
        storms = rng.random(len(dates)) < 0.01
        rain[storms] += rng.uniform(60, 260, storms.sum())
        rows.append(pd.DataFrame({"uuid": "x", "adm4_pcode": b, "date": dates.strftime("%Y-%m-%d"), "freq": "D",
                                  "pr": rain.round(1), "tmax": 31.0, "tmin": 24.0}))
    climate = pd.concat(rows)
    hz = pd.DataFrame({"adm4_pcode": list(barangays) + ["PH9999"], "pct_area_flood_hazard_100yr_high": [0, 40, 85, 10]})
    climate.to_csv(tmp / "climate_atmosphere.csv", index=False)
    hz.to_csv(tmp / "project_noah_hazards.csv", index=False)
    return tmp / "climate_atmosphere.csv", tmp / "project_noah_hazards.csv"


def test_rule_matches_the_golden_cases_shared_with_the_app():
    rule = fl.load_rule()
    for g in rule["golden"]:
        pdg, pwn = fl.rule_probabilities(g["rain_today_mm"], g["rain_prev_mm"], g["flood_hazard_pct"], rule)
        assert pdg == pytest.approx(g["p_danger"]), g
        assert pwn == pytest.approx(g["p_warning"]), g
        assert fl.LEVELS[int(fl.rule_level(pdg, pwn))] == g["level"], g


def test_synthetic_labels_follow_the_rule_and_are_reproducible():
    t = np.array([0, 50, 300, 300])
    p = np.array([0, 0, 0, 0])
    h = np.array([0, 0, 0, 90])
    a = fl.synthetic_labels(t, p, h, seed=7)
    assert (a == fl.synthetic_labels(t, p, h, seed=7)).all()
    assert a[0] == 0 and a[1] == 0           # no rain, below onset: never a flood
    assert a[2] == 2 and a[3] == 2           # far above the danger threshold: always danger


def test_antecedent_rain_excludes_the_day_and_never_crosses_barangays():
    df = pd.DataFrame({
        "adm4_pcode": ["A"] * 5 + ["B"] * 3,
        "date": pd.to_datetime(["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04", "2020-01-05", "2020-01-01", "2020-01-02", "2020-01-04"]),
        "pr": [10, 20, 30, 40, 50, 100, 100, 5],
    })
    out = fl.add_rain_features(df).set_index(["adm4_pcode", "date"])
    assert out.loc[("A", pd.Timestamp("2020-01-04")), "rain_prev_mm"] == 60       # 10+20+30, not 40
    assert out.loc[("A", pd.Timestamp("2020-01-05")), "rain_prev_mm"] == 90
    assert np.isnan(out.loc[("A", pd.Timestamp("2020-01-03")), "rain_prev_mm"])   # not enough days: unknown
    assert np.isnan(out.loc[("B", pd.Timestamp("2020-01-01")), "rain_prev_mm"])   # does not take A's rain
    assert np.isnan(out.loc[("B", pd.Timestamp("2020-01-04")), "rain_prev_mm"])   # 3 Jan missing: unknown


def test_preparation_with_synthetic_labels(tmp_path):
    c, h = fixture(tmp_path)
    prep = load("01_data_preparation")
    m = prep.main(["--climate", str(c), "--hazards", str(h), "--out", str(tmp_path / "out.csv"), "--labels", "synthetic"])
    df = pd.read_csv(tmp_path / "out.csv", dtype={"adm4_pcode": str})
    assert m["label_source"] == "synthetic_rule_v1" and set(df["label_source"]) == {"synthetic_rule_v1"}
    assert list(df.columns) == ["adm4_pcode", "date"] + fl.FEATURES + ["flood_level", "label_source"]
    assert m["barangays"] == 3 and m["rows"] == 3 * (2557 - 3)     # first 3 days of each barangay have no antecedent rain
    assert json.loads((tmp_path / "out.manifest.json").read_text())["inputs"]


def test_preparation_with_observed_floods(tmp_path):
    c, h = fixture(tmp_path)
    pd.DataFrame({"adm4_pcode": ["PH0002", "PH0002"], "date": ["2018-08-11", "2018-08-11"], "level": ["warning", "danger"]}).to_csv(tmp_path / "floods.csv", index=False)
    prep = load("01_data_preparation")
    prep.main(["--climate", str(c), "--hazards", str(h), "--out", str(tmp_path / "obs.csv"), "--labels", "observed",
               "--observed", str(tmp_path / "floods.csv"), "--absent-as-safe"])
    df = pd.read_csv(tmp_path / "obs.csv", dtype={"adm4_pcode": str})
    day = df[(df.adm4_pcode == "PH0002") & (df.date == "2018-08-11")]
    assert day["flood_level"].item() == 2                                  # the worse record of the day
    assert (df["flood_level"] > 0).sum() == 1 and set(df["label_source"]) == {"observed"}


def test_without_absent_as_safe_unrecorded_days_are_not_labelled(tmp_path):
    c, h = fixture(tmp_path)
    pd.DataFrame({"adm4_pcode": ["PH0002"], "date": ["2018-08-11"], "level": ["2"]}).to_csv(tmp_path / "floods.csv", index=False)
    prep = load("01_data_preparation")
    m = prep.main(["--climate", str(c), "--hazards", str(h), "--out", str(tmp_path / "obs.csv"), "--labels", "observed", "--observed", str(tmp_path / "floods.csv")])
    assert m["rows"] == 1


def test_lstm_windows_are_built_per_barangay(tmp_path):
    lstm = load("04_lstm")
    df = pd.DataFrame({"adm4_pcode": ["A"] * 4 + ["B"] * 4, "date": pd.to_datetime(["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04"] * 2),
                       "rain_today_mm": [1, 2, 3, 4, 100, 200, 300, 400], "tmax": 30.0, "tmin": 24.0, "flood_hazard_pct": [10] * 4 + [80] * 4,
                       "flood_level": [0, 0, 0, 1, 0, 0, 2, 2]})
    seq, hz, y, _ = lstm.build_windows(df, 3)
    assert seq.shape == (4, 3, 3)
    assert seq[2][0][0] == 100                # B's first window starts with B's rain, not A's
    assert hz[:, 0].tolist() == [10, 10, 80, 80] and y.tolist() == [0, 1, 2, 2]


def test_training_on_synthetic_labels_is_never_eligible(tmp_path):
    pytest.importorskip("xgboost")
    c, h = fixture(tmp_path)
    load("01_data_preparation").main(["--climate", str(c), "--hazards", str(h), "--out", str(tmp_path / "out.csv"), "--labels", "synthetic"])
    card = load("02_model_training").main(["--data", str(tmp_path / "out.csv"), "--out", str(tmp_path / "models"), "--trees", "40", "--depth", "4"])
    assert card["eligible_for_review"] is False
    assert any("reproduces the rule" in r for r in card["not_eligible_because"])
    assert "rule_baseline_test" in card["metrics"] and (tmp_path / "models" / "flood_xgb.json").exists()
