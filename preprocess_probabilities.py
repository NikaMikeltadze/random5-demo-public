import os
import json
from datetime import datetime, timezone
from typing import Dict

import numpy as np
import pandas as pd
from scipy import stats

# Reuse locations from download script (duplicated here to keep scripts standalone)
LOCATIONS: Dict[str, Dict[str, float]] = {
    'tbilisi': {'lat': 41.7151, 'lon': 44.8271, 'name': 'Tbilisi, Georgia'},
    'batumi': {'lat': 41.6168, 'lon': 41.6367, 'name': 'Batumi, Georgia'},
    'kutaisi': {'lat': 42.2679, 'lon': 42.7050, 'name': 'Kutaisi, Georgia'},
}

# Thresholds for extreme events (configurable)
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
    'api_url': 'https://power.larc.nasa.gov/',
    'citation': 'NASA/POWER CERES/MERRA2 Native Resolution Daily and Hourly Data',
    'access_date': datetime.now(timezone.utc).date().isoformat(),
}

os.makedirs(os.path.join('data', 'processed'), exist_ok=True)
os.makedirs(os.path.join('data', 'demo'), exist_ok=True)


def calculate_day_of_year_stats(df: pd.DataFrame, variable: str, thresholds: Dict[str, float]) -> Dict:
    """
    Calculate statistics and probabilities by day-of-year for a given variable.
    df is expected to have a DatetimeIndex named 'date'.
    """
    work = df.copy()
    work = work.sort_index()
    work = work[[variable]].dropna()
    work['day_of_year'] = work.index.dayofyear
    work['year'] = work.index.year

    results: Dict[int, Dict] = {}

    for doy in range(1, 367):
        sel = work[work['day_of_year'] == doy][variable].dropna()
        if sel.empty:
            # Keep missing days out; validator will report
            continue
        stats_dict = {
            'day_of_year': doy,
            'variable': variable,
            'sample_size': int(sel.shape[0]),
            'mean': float(sel.mean()),
            'median': float(sel.median()),
            'std': float(sel.std(ddof=1)) if sel.shape[0] > 1 else 0.0,
            'min': float(sel.min()),
            'max': float(sel.max()),
            'percentiles': {
                'p25': float(sel.quantile(0.25)),
                'p50': float(sel.quantile(0.50)),
                'p75': float(sel.quantile(0.75)),
                'p90': float(sel.quantile(0.90)),
                'p95': float(sel.quantile(0.95)),
            },
        }
        # Extreme event probabilities
        probs = {}
        for th_name, th_val in thresholds.items():
            if 'above' in th_name:
                prob = float((sel > th_val).mean())
            else:
                prob = float((sel < th_val).mean())
            probs[th_name] = 0.0 if np.isnan(prob) else float(prob)
        stats_dict['probabilities'] = probs

        # Yearly means for this DOY
        yearly = work[work['day_of_year'] == doy].groupby('year')[variable].mean().dropna()
        stats_dict['yearly_values'] = [
            {'year': int(y), 'value': float(v)} for y, v in yearly.items()
        ]
        if yearly.shape[0] >= 4:
            years = yearly.index.values.astype(float)
            values = yearly.values.astype(float)
            slope, intercept, r_value, p_value, std_err = stats.linregress(years, values)
            stats_dict['trend'] = {
                'slope': float(slope),
                'p_value': float(p_value),
                'r_squared': float(r_value ** 2),
                'significant': bool(p_value < 0.05),
            }
        results[doy] = stats_dict

    return results


def build_daily_json(city_key: str, daily_df: pd.DataFrame) -> Dict:
    period = {
        'start': daily_df.index.min().date().isoformat() if not daily_df.empty else None,
        'end': daily_df.index.max().date().isoformat() if not daily_df.empty else None,
        'years': int(daily_df.index.year.nunique()) if not daily_df.empty else 0,
    }
    city_stats = {
        'location': city_key,
        'coordinates': LOCATIONS[city_key],
        'data_period': period,
        'nasa_source': NASA_ATTRIBUTION,
        'variables': {},
    }
    for variable, thresholds in THRESHOLDS.items():
        if variable in daily_df.columns:
            city_stats['variables'][variable] = calculate_day_of_year_stats(daily_df, variable, thresholds)
    return city_stats


def build_hourly_json(city_key: str, hourly_df: pd.DataFrame) -> Dict:
    if hourly_df is None or hourly_df.empty:
        return {
            'location': city_key,
            'coordinates': LOCATIONS[city_key],
            'data_period': {
                'start': None,
                'end': None,
                'years': 0,
                'note': 'No hourly data available',
            },
            'hourly_patterns': {},
            'diurnal_patterns': {},
            'nasa_source': NASA_ATTRIBUTION,
        }

    df = hourly_df.copy()
    df = df.sort_index()
    df['day_of_year'] = df.index.dayofyear
    df['hour'] = df.index.hour

    hourly_patterns = {}

    # Example: precipitation hourly probabilities above 1 mm
    if 'PRECTOTCORR' in df.columns:
        var = 'PRECTOTCORR'
        var_map = {}
        for doy in range(1, 367):
            day_sel = df[df['day_of_year'] == doy]
            if day_sel.empty:
                continue
            hour_map = {}
            for h in range(24):
                hs = day_sel[day_sel['hour'] == h][var].dropna()
                if hs.empty:
                    continue
                hour_map[f'hour_{h}'] = {
                    'mean': float(hs.mean()),
                    'probability_above_1mm': float((hs > 1.0).mean()),
                }
            if hour_map:
                var_map[f'day_of_year_{doy}'] = hour_map
        hourly_patterns[var] = var_map

    # Simple diurnal pattern for temperature
    diurnal_patterns = {}
    if 'T2M' in df.columns:
        temp_by_hour = df.groupby('hour')['T2M'].mean().dropna()
        if not temp_by_hour.empty:
            diurnal_patterns['T2M'] = {
                'summary': 'Peak temperatures typically occur between 14:00-16:00 local time',
                'hottest_hour': int(temp_by_hour.idxmax()),
                'coldest_hour': int(temp_by_hour.idxmin()),
            }

    period = {
        'start': df.index.min().date().isoformat(),
        'end': df.index.max().date().isoformat(),
        'years': int(df.index.year.nunique()),
        'note': 'Hourly data limited to recent years due to data volume',
    }

    return {
        'location': city_key,
        'coordinates': LOCATIONS[city_key],
        'data_period': period,
        'hourly_patterns': hourly_patterns,
        'diurnal_patterns': diurnal_patterns,
        'nasa_source': NASA_ATTRIBUTION,
    }


def summarize_city(daily_df: pd.DataFrame, city_key: str) -> Dict:
    # Basic climate summary from daily data
    summary = {
        'id': city_key,
        'name': LOCATIONS[city_key]['name'],
        'coordinates': {'lat': LOCATIONS[city_key]['lat'], 'lon': LOCATIONS[city_key]['lon']},
        'climate_summary': {},
        'extreme_event_annual_probabilities': {},
        'data_files': {
            'daily_stats': f'data/processed/{city_key}_daily_stats.json',
            'hourly_stats': f'data/processed/{city_key}_hourly_stats.json',
        },
    }
    if daily_df is None or daily_df.empty:
        return summary

    # Annual precipitation (approx)
    if 'PRECTOTCORR' in daily_df.columns:
        annual_ppt = daily_df['PRECTOTCORR'].resample('YE').sum(min_count=1).mean()
        summary['climate_summary']['annual_precipitation_mm'] = float(annual_ppt) if pd.notna(annual_ppt) else None
    # Average annual temp
    if 'T2M' in daily_df.columns:
        avg_temp = daily_df['T2M'].resample('YE').mean().mean()
        summary['climate_summary']['avg_annual_temp_c'] = float(avg_temp) if pd.notna(avg_temp) else None

    # Monthly summaries for wettest/driest/hottest
    if 'PRECTOTCORR' in daily_df.columns:
        ppt_monthly = daily_df['PRECTOTCORR'].groupby(daily_df.index.month).sum(min_count=1)
        if not ppt_monthly.empty and ppt_monthly.max() == ppt_monthly.max():
            wettest_month = int(ppt_monthly.idxmax())
            driest_month = int(ppt_monthly.idxmin())
            month_names = ['January','February','March','April','May','June','July','August','September','October','November','December']
            summary['climate_summary']['wettest_month'] = month_names[wettest_month-1]
            summary['climate_summary']['driest_month'] = month_names[driest_month-1]
    if 'T2M' in daily_df.columns:
        t_monthly = daily_df['T2M'].groupby(daily_df.index.month).mean()
        if not t_monthly.empty:
            hottest_month = int(t_monthly.idxmax())
            month_names = ['January','February','March','April','May','June','July','August','September','October','November','December']
            summary['climate_summary']['hottest_month'] = month_names[hottest_month-1]

    # Simple annual counts for extremes (approximate)
    if 'PRECTOTCORR' in daily_df.columns:
        yearly_heavy = (daily_df['PRECTOTCORR'] > 10.0).resample('YE').sum(min_count=1).mean()
        summary['extreme_event_annual_probabilities']['heavy_rain_days'] = float(yearly_heavy) if pd.notna(yearly_heavy) else None
    if 'T2M_MAX' in daily_df.columns:
        yearly_heat = (daily_df['T2M_MAX'] > 35.0).resample('YE').sum(min_count=1).mean()
        summary['extreme_event_annual_probabilities']['extreme_heat_days'] = float(yearly_heat) if pd.notna(yearly_heat) else None
    if 'WS10M_MAX' in daily_df.columns:
        yearly_wind = (daily_df['WS10M_MAX'] > 10.0).resample('YE').sum(min_count=1).mean()
        summary['extreme_event_annual_probabilities']['high_wind_days'] = float(yearly_wind) if pd.notna(yearly_wind) else None

    return summary


if __name__ == '__main__':
    processed_dir = os.path.join('data', 'processed')

    all_locations = []

    for city_key in ['tbilisi', 'batumi', 'kutaisi']:
        print(f'Processing {city_key} ...')
        daily_path = os.path.join('data', 'raw', f'{city_key}_daily_raw.csv')
        hourly_path = os.path.join('data', 'raw', f'{city_key}_hourly_raw.csv')

        daily_df = pd.read_csv(daily_path, index_col=0, parse_dates=True) if os.path.exists(daily_path) else pd.DataFrame()
        hourly_df = pd.read_csv(hourly_path, index_col=0, parse_dates=True) if os.path.exists(hourly_path) else pd.DataFrame()

        # DAILY JSON
        daily_json = build_daily_json(city_key, daily_df)
        with open(os.path.join(processed_dir, f'{city_key}_daily_stats.json'), 'w', encoding='utf-8') as f:
            json.dump(daily_json, f, indent=2)

        # HOURLY JSON
        hourly_json = build_hourly_json(city_key, hourly_df)
        with open(os.path.join(processed_dir, f'{city_key}_hourly_stats.json'), 'w', encoding='utf-8') as f:
            json.dump(hourly_json, f, indent=2)

        # Summary contribution
        all_locations.append(summarize_city(daily_df, city_key))

    demo_summary = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'hackathon': 'NASA Space Apps 2025',
        'project': 'Will It Rain On My Parade?',
        'locations': all_locations,
        'nasa_attribution': {
            'dataset': 'NASA POWER',
            'full_citation': 'NASA/POWER CERES/MERRA2 Native Resolution Daily and Hourly Data; Derived from satellite and model reanalysis data',
            'url': 'https://power.larc.nasa.gov/',
            'license': 'Creative Commons Attribution 4.0 International',
        }
    }

    with open(os.path.join('data', 'demo', 'all_locations_summary.json'), 'w', encoding='utf-8') as f:
        json.dump(demo_summary, f, indent=2)

    print('Processing complete.')
