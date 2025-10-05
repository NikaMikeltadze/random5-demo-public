import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.preprocessing import OneHotEncoder

# Locations to process
DEMO_LOCATIONS = ["tbilisi", "batumi", "kutaisi"]

# Variables mapping from NASA file to our names and unit conversions
VAR_MAP = {
    "PRECTOTCORR": ("precipitation", 1.0),   # mm/day means; when monthly aggregated by mean, stays mm/day; we'll output mean mm/day
    "T2M_MAX": ("temperature", 1.0),        # deg C
    # Wind preference handled downstream by fallback if WS10M_MAX missing
}

# Wind fallbacks in priority
WIND_CANDIDATES = ["WS10M_MAX", "WS10M", "WS2M"]  # m/s; convert to km/h

# Humidity variable
HUM_VAR = "RH2M"  # %

PROCESSED_DIRS = [
    os.path.join("data", "processed"),
    os.path.join("frontend", "public", "static-data", "processed"),
]

OUTPUT_DIR = os.path.join("frontend", "public", "static-data", "processed")


@dataclass
class SeriesSpec:
    name: str
    values: pd.Series  # indexed by monthly period
    unit: str


def load_daily_stats(location: str) -> Dict:
    for base in PROCESSED_DIRS:
        path = os.path.join(base, f"{location}_daily_stats.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError(f"daily_stats not found for {location}")


def monthly_time_series(nasa: Dict, var_key: str) -> Tuple[pd.Series, str]:
    """
    Build a monthly mean time series across years using per-DOY yearly_values.
    Returns series indexed by period (YYYY-MM) and unit string.
    """
    variables = nasa.get("variables", {})
    if var_key not in variables:
        raise KeyError(f"Variable {var_key} not in dataset")

    # Determine year range from metadata
    start = nasa.get("data_period", {}).get("start")
    end = nasa.get("data_period", {}).get("end")
    if not start or not end:
        # Fallback: infer from yearly_values keys
        years = set()
        for day in variables[var_key].values():
            for yv in day.get("yearly_values", []):
                years.add(yv.get("year"))
        if not years:
            raise ValueError("Cannot infer years from dataset")
        start_year, end_year = min(years), max(years)
    else:
        start_year, end_year = int(start[:4]), int(end[:4])

    # Build dataframe of daily values per date
    rows = []
    # Non-leap baseline for mapping DOY to month (we'll map by actual calendar using each year)
    for doy_str, day in variables[var_key].items():
        try:
            doy = int(doy_str)
        except ValueError:
            continue
        for yv in day.get("yearly_values", []):
            y = int(yv["year"])
            if y < start_year or y > end_year:
                continue
            # Create date from year and day-of-year
            # Handle leap: cap at 365 for simplicity; if doy=366, map to Dec 31
            dd = min(doy, 365)
            date = pd.Timestamp(y, 1, 1) + pd.Timedelta(days=dd - 1)
            rows.append({"date": date, "value": yv["value"]})

    if not rows:
        raise ValueError(f"No data rows built for {var_key}")

    df = pd.DataFrame(rows).dropna()
    df = df.sort_values("date")
    # Aggregate to monthly mean
    s = df.set_index("date")["value"].resample("MS").mean()
    # Drop any all-NaN months
    s = s.dropna()

    # Units
    if var_key == "PRECTOTCORR":
        unit = "mm"
    elif var_key.startswith("T2M"):
        unit = "°C"
    elif var_key.startswith("WS"):
        unit = "km/h"  # we'll convert later
    elif var_key == "RH2M":
        unit = "%"
    else:
        unit = ""

    return s, unit


def pick_wind_var(nasa: Dict) -> str:
    variables = nasa.get("variables", {})
    for k in WIND_CANDIDATES:
        if k in variables:
            return k
    raise KeyError("No wind variable present")


def to_kmh(series: pd.Series) -> pd.Series:
    return series * 3.6


def build_all_series(nasa: Dict) -> List[SeriesSpec]:
    out: List[SeriesSpec] = []

    # Precipitation
    try:
        s, unit = monthly_time_series(nasa, "PRECTOTCORR")
        out.append(SeriesSpec("precipitation", s, unit))
    except Exception:
        pass

    # Temperature (prefer T2M_MAX else T2M)
    temp_key = "T2M_MAX" if "T2M_MAX" in nasa.get("variables", {}) else ("T2M" if "T2M" in nasa.get("variables", {}) else None)
    if temp_key:
        s, unit = monthly_time_series(nasa, temp_key)
        out.append(SeriesSpec("temperature", s, unit))

    # Wind
    try:
        wind_key = pick_wind_var(nasa)
        s, unit = monthly_time_series(nasa, wind_key)
        s = to_kmh(s)
        out.append(SeriesSpec("windSpeed", s, "km/h"))
    except Exception:
        pass

    # Humidity
    if HUM_VAR in nasa.get("variables", {}):
        s, unit = monthly_time_series(nasa, HUM_VAR)
        out.append(SeriesSpec("humidity", s.clip(lower=0, upper=100), unit))

    return out


def make_features(index: pd.DatetimeIndex) -> np.ndarray:
    # month one-hots + linear trend + seasonal sin/cos
    months = index.month.values.reshape(-1, 1)
    enc = OneHotEncoder(categories=[np.arange(1, 13)], drop=None, sparse_output=False)
    month_oh = enc.fit_transform(months)
    t = np.arange(len(index)).reshape(-1, 1)
    # seasonal cycles
    sin1 = np.sin(2 * np.pi * (index.month.values) / 12).reshape(-1, 1)
    cos1 = np.cos(2 * np.pi * (index.month.values) / 12).reshape(-1, 1)
    X = np.hstack([month_oh, t, sin1, cos1])
    return X


def forecast_series(series: pd.Series, horizon: int = 12) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str]]:
    series = series.dropna()
    if len(series) < 24:
        # Not enough data; repeat seasonal monthly means
        last = series.index[-1]
        idx_future = pd.period_range(last.to_period("M"), periods=horizon + 1, freq="M")[1:].to_timestamp()
        month_means = series.groupby(series.index.month).mean()
        preds = np.array([month_means.get(ts.month, series.mean()) for ts in idx_future], dtype=float)
        resid_std = float(series.std()) if series.std() == series.std() else 0.0
        ci = 1.96 * resid_std
        lower = preds - ci
        upper = preds + ci
        months = [ts.strftime("%b") for ts in idx_future]
        return preds, lower, upper, months

    idx = series.index
    X = make_features(idx)
    y = series.values.astype(float)

    model = Ridge(alpha=1.0)
    model.fit(X, y)

    # Residual std for simple CI
    yhat_in = model.predict(X)
    resid = y - yhat_in
    resid_std = float(np.nanstd(resid, ddof=1))

    # Build future index
    last = idx[-1]
    idx_future = pd.period_range(last.to_period("M"), periods=horizon + 1, freq="M")[1:].to_timestamp()
    X_future = make_features(idx_future)
    preds = model.predict(X_future)

    lower = preds - 1.96 * resid_std
    upper = preds + 1.96 * resid_std
    months = [ts.strftime("%b") for ts in idx_future]
    return preds, lower, upper, months


def save_forecast(location: str, specs: List[SeriesSpec]):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    result: Dict = {
        "location": location,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "horizon_months": 12,
        "months": None,  # filled below
        "forecast": {
            "precipitation": [],
            "temperature": [],
            "windSpeed": [],
            "humidity": []
        },
        "ci_lower": {},
        "ci_upper": {},
        "meta": {
            "model": "Ridge + seasonal one-hot + trend + sin/cos",
            "units": {
                "precipitation": "mm",
                "temperature": "°C",
                "windSpeed": "km/h",
                "humidity": "%"
            }
        }
    }

    # Map month abbreviations to month number for calibration blending
    month_abbr_to_num = {m: i for i, m in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], start=1)}

    months_common: List[str] = []
    for sp in specs:
        preds, lower, upper, months = forecast_series(sp.values, horizon=12)

        # Humidity-specific calibration: replace with seasonal monthly climatology and clip to [0,100]
        if sp.name == "humidity":
            # Use historical monthly means directly to ensure alignment with actuals
            month_means = sp.values.groupby(sp.values.index.month).mean()
            widths = (upper - lower) / 2.0
            preds_list = []
            for i, m_abbr in enumerate(months):
                m_num = month_abbr_to_num.get(m_abbr, None)
                clim = float(month_means.get(m_num, np.nan)) if m_num is not None else float("nan")
                if not np.isfinite(clim):
                    clim = float(np.nanmean(sp.values.values))
                preds_list.append(clim)
            preds = np.array(preds_list, dtype=float)
            # Re-center CI around climatology with same half-width
            lower = preds - widths
            upper = preds + widths
            # Clip to physical bounds
            preds = np.clip(preds, 0.0, 100.0)
            lower = np.clip(lower, 0.0, 100.0)
            upper = np.clip(upper, 0.0, 100.0)

        result["forecast"][sp.name] = [float(x) for x in preds]
        result["ci_lower"][sp.name] = [float(x) for x in lower]
        result["ci_upper"][sp.name] = [float(x) for x in upper]
        if not months_common:
            months_common = months

    result["months"] = months_common

    out_path = os.path.join(OUTPUT_DIR, f"{location}_monthly_forecast.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Saved forecast: {out_path}")


def main():
    for loc in DEMO_LOCATIONS:
        try:
            nasa = load_daily_stats(loc)
            specs = build_all_series(nasa)
            if not specs:
                print(f"No usable series for {loc}, skipping")
                continue
            save_forecast(loc, specs)
        except Exception as e:
            print(f"Failed {loc}: {e}")


if __name__ == "__main__":
    main()
