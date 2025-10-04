import os
import json
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

# Reuse configuration from preprocess_probabilities to stay consistent
try:
    from preprocess_probabilities import LOCATIONS, THRESHOLDS, NASA_ATTRIBUTION
except Exception:
    # Fallback if import path changes; keep minimal defaults
    LOCATIONS: Dict[str, Dict[str, float]] = {
        'tbilisi': {'lat': 41.7151, 'lon': 44.8271, 'name': 'Tbilisi, Georgia'},
        'batumi': {'lat': 41.6168, 'lon': 41.6367, 'name': 'Batumi, Georgia'},
        'kutaisi': {'lat': 42.2679, 'lon': 42.7050, 'name': 'Kutaisi, Georgia'},
    }
    THRESHOLDS = {
        'PRECTOTCORR': {
            'heavy_rain_above_10mm': 10.0,
            'very_heavy_rain_above_25mm': 25.0,
            'extreme_rain_above_50mm': 50.0,
        },
        'T2M_MAX': {
            'hot_above_30C': 30.0,
            'very_hot_above_35C': 35.0,
            'extreme_heat_above_40C': 40.0,
        },
        'T2M_MIN': {
            'freezing_below_0C': 0.0,
            'very_cold_below_minus10C': -10.0,
        },
        'WS10M_MAX': {
            'windy_above_10mps': 10.0,
            'very_windy_above_15mps': 15.0,
            'extreme_wind_above_20mps': 20.0,
        },
    }
    NASA_ATTRIBUTION = {
        'dataset': 'NASA POWER',
    }

PROCESSED_DIR = os.path.join('data', 'processed')
RAW_DIR = os.path.join('data', 'raw')


@dataclass
class TrendResult:
    coef: float
    coef_ci: Tuple[float, float]
    significant: bool
    direction: str  # 'increasing' | 'decreasing' | 'stable'
    n_days: int
    n_years: int


def _make_binary_series(values: pd.Series, th_name: str, th_val: float) -> pd.Series:
    if 'above' in th_name:
        return (values > th_val).astype(int)
    else:
        return (values < th_val).astype(int)


def _fit_logistic_with_bootstrap(df: pd.DataFrame, bootstrap: int = 200, random_state: int = 42) -> TrendResult:
    # df: columns ['year', 'y']
    df = df.dropna()
    if df.empty or df['y'].nunique() < 2:
        return TrendResult(coef=0.0, coef_ci=(0.0, 0.0), significant=False, direction='stable', n_days=int(df.shape[0]), n_years=int(df['year'].nunique()) if not df.empty else 0)

    years = df['year'].values.astype(float)
    # Standardize year to improve numerical stability
    years_scaled = (years - years.mean()) / (years.std(ddof=0) + 1e-9)
    X = years_scaled.reshape(-1, 1)
    y = df['y'].values.astype(int)

    model = LogisticRegression(solver='liblinear', penalty='l2', C=1.0, random_state=random_state, max_iter=1000)
    model.fit(X, y)
    base_coef = float(model.coef_.ravel()[0])

    # Bootstrap CI for the coefficient
    rng = np.random.default_rng(random_state)
    coefs: List[float] = []
    n = len(y)
    for _ in range(bootstrap):
        idx = rng.integers(0, n, size=n)
        Xb = X[idx]
        yb = y[idx]
        # Guard for all-one or all-zero after resampling
        if len(np.unique(yb)) < 2:
            continue
        try:
            mb = LogisticRegression(solver='liblinear', penalty='l2', C=1.0, random_state=random_state, max_iter=1000)
            mb.fit(Xb, yb)
            coefs.append(float(mb.coef_.ravel()[0]))
        except Exception:
            continue

    if coefs:
        lo, hi = float(np.percentile(coefs, 2.5)), float(np.percentile(coefs, 97.5))
    else:
        lo, hi = 0.0, 0.0

    significant = (lo > 0) or (hi < 0)
    direction = 'increasing' if base_coef > 0 and significant else ('decreasing' if base_coef < 0 and significant else 'stable')

    return TrendResult(coef=base_coef, coef_ci=(lo, hi), significant=bool(significant), direction=direction, n_days=int(len(y)), n_years=int(df['year'].nunique()))


def compute_annual_probabilities(daily: pd.DataFrame, var: str, th_name: str, th_val: float) -> pd.Series:
    y = _make_binary_series(daily[var], th_name, th_val)
    annual_prob = y.groupby(daily.index.year).mean()
    return annual_prob


def analyze_city(city_key: str) -> Dict:
    daily_path = os.path.join(RAW_DIR, f'{city_key}_daily_raw.csv')
    if not os.path.exists(daily_path):
        return {
            'city': city_key,
            'available': False,
            'reason': f'missing file {daily_path}',
        }

    daily_df = pd.read_csv(daily_path, index_col=0, parse_dates=True)
    daily_df = daily_df.sort_index()

    city_out: Dict = {
        'city': city_key,
        'name': LOCATIONS.get(city_key, {}).get('name', city_key.title()),
        'coordinates': LOCATIONS.get(city_key, {}),
        'nasa_source': NASA_ATTRIBUTION,
        'available': True,
        'results': {},
        'annual_probabilities': {},
    }

    for var, thresholds in THRESHOLDS.items():
        if var not in daily_df.columns:
            continue
        city_out['results'].setdefault(var, {})
        city_out['annual_probabilities'].setdefault(var, {})

        for th_name, th_val in thresholds.items():
            # Build daily binary dataset
            y = _make_binary_series(daily_df[var], th_name, th_val)
            df = pd.DataFrame({'year': daily_df.index.year, 'y': y})

            # Require at least 5 years to assess a trend robustly
            if df['year'].nunique() < 5:
                res = TrendResult(coef=0.0, coef_ci=(0.0, 0.0), significant=False, direction='stable', n_days=int(df.shape[0]), n_years=int(df['year'].nunique()))
            else:
                res = _fit_logistic_with_bootstrap(df)

            # Annual probabilities series
            annual_prob = compute_annual_probabilities(daily_df, var, th_name, th_val)
            annual_series = [{'year': int(y_), 'probability': float(p)} for y_, p in annual_prob.items()]

            city_out['results'][var][th_name] = {
                'model': 'logistic_regression(year -> exceedance)',
                'coef_year_standardized': res.coef,
                'coef_ci_95': {'lo': res.coef_ci[0], 'hi': res.coef_ci[1]},
                'significant': res.significant,
                'trend': res.direction,
                'n_days': res.n_days,
                'n_years': res.n_years,
            }
            city_out['annual_probabilities'][var][th_name] = annual_series

    return city_out


def run_all():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    cities = list(LOCATIONS.keys())

    all_results = {
        'cities': [],
        'note': 'ML-based trend detection using logistic regression with bootstrap CI on NASA POWER daily data',
    }

    for city in cities:
        result = analyze_city(city)
        out_path = os.path.join(PROCESSED_DIR, f'{city}_ml_trends.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        all_results['cities'].append({'city': city, 'path': out_path})
        print(f'Wrote ML trend results to {out_path}')

    summary_path = os.path.join(PROCESSED_DIR, 'ml_trends_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2)
    print(f'Wrote ML trends summary to {summary_path}')


if __name__ == '__main__':
    run_all()
