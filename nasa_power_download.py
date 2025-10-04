import os
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import requests
import pandas as pd
from tqdm import tqdm

# ----------------------------------------------
# Config: Locations and Parameters
# ----------------------------------------------
LOCATIONS: Dict[str, Dict[str, float]] = {
    'tbilisi': {'lat': 41.7151, 'lon': 44.8271, 'name': 'Tbilisi, Georgia'},
    'batumi': {'lat': 41.6168, 'lon': 41.6367, 'name': 'Batumi, Georgia'},
    'kutaisi': {'lat': 42.2679, 'lon': 42.7050, 'name': 'Kutaisi, Georgia'},
}

# NASA POWER parameter names and human-friendly descriptions
PARAMETERS_DAILY: Dict[str, str] = {
    # Temperature (°C)
    'T2M': 'Temperature at 2 Meters',
    'T2M_MAX': 'Maximum Temperature at 2 Meters',
    'T2M_MIN': 'Minimum Temperature at 2 Meters',

    # Precipitation (mm/day for daily, mm/hour for hourly)
    'PRECTOTCORR': 'Precipitation Corrected',

    # Wind (m/s)
    'WS2M': 'Wind Speed at 2 Meters',
    'WS10M': 'Wind Speed at 10 Meters',
    'WS10M_MAX': 'Maximum Wind Speed at 10 Meters',

    # Humidity & Pressure
    'RH2M': 'Relative Humidity at 2 Meters',
    'PS': 'Surface Pressure (kPa)',

    # Additional useful parameters
    'QV2M': 'Specific Humidity at 2 Meters',
    'ALLSKY_SFC_SW_DWN': 'All Sky Surface Shortwave Downward Irradiance',
}

# Hourly parameters (no MAX/MIN aggregations)
PARAMETERS_HOURLY: Dict[str, str] = {
    # Temperature (°C) - instantaneous only
    'T2M': 'Temperature at 2 Meters',

    # Precipitation (mm/hour)
    'PRECTOTCORR': 'Precipitation Corrected',

    # Wind (m/s) - instantaneous only
    'WS2M': 'Wind Speed at 2 Meters',
    'WS10M': 'Wind Speed at 10 Meters',

    # Humidity & Pressure
    'RH2M': 'Relative Humidity at 2 Meters',
    'PS': 'Surface Pressure (kPa)',

    # Additional useful parameters
    'QV2M': 'Specific Humidity at 2 Meters',
    'ALLSKY_SFC_SW_DWN': 'All Sky Surface Shortwave Downward Irradiance',
}

BASE_URL_DAILY = "https://power.larc.nasa.gov/api/temporal/daily/point"
BASE_URL_HOURLY = "https://power.larc.nasa.gov/api/temporal/hourly/point"
COMMUNITY = "RE"  # Renewable Energy community provides the broadest set of variables

# Ensure output directories exist
os.makedirs(os.path.join('data', 'raw'), exist_ok=True)
os.makedirs(os.path.join('data', 'processed'), exist_ok=True)
os.makedirs(os.path.join('data', 'demo'), exist_ok=True)


# ----------------------------------------------
# HTTP helpers with retry/backoff and polite rate limiting
# ----------------------------------------------
def http_get_json(url: str, max_retries: int = 5, backoff_base: float = 1.5, timeout: float = 60.0):
    """
    GET the URL and parse JSON with robust retry and exponential backoff.

    Notes on NASA POWER API quirks:
    - It sometimes returns HTTP 429 (too many requests). We respect it with backoff.
    - Large date ranges may intermittently fail; chunking requests is safer.
    - JSON always includes a top-level 'properties' with 'parameter'.
    """
    last_exc = None
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, timeout=timeout, headers={"Accept": "application/json"})
            if resp.status_code == 200:
                return resp.json()
            # If rate limited, sleep a bit longer
            if resp.status_code in (429, 503, 502, 500):
                delay = (backoff_base ** attempt) + 1.0
                time.sleep(delay)
                continue
            # For other status codes, raise
            resp.raise_for_status()
        except Exception as e:
            last_exc = e
            delay = (backoff_base ** attempt) + 0.5
            time.sleep(delay)
    if last_exc:
        raise last_exc
    raise RuntimeError("Unknown HTTP failure without exception")


def _build_daily_url(lat: float, lon: float, start: str, end: str, parameters: List[str]) -> str:
    params_str = ",".join(parameters)
    return (
        f"{BASE_URL_DAILY}?parameters={params_str}&community={COMMUNITY}"
        f"&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
    )


def _build_hourly_url(lat: float, lon: float, start: str, end: str, parameters: List[str]) -> str:
    params_str = ",".join(parameters)
    return (
        f"{BASE_URL_HOURLY}?parameters={params_str}&community={COMMUNITY}"
        f"&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
    )


# ----------------------------------------------
# Parsing helpers
# ----------------------------------------------

def parse_daily_response(json_obj: Dict) -> pd.DataFrame:
    """Parse NASA POWER daily JSON to a DataFrame with Date index.

    Expected shape:
    json['properties']['parameter'] = {
      'T2M': {'20050101': 3.1, ...},
      'PRECTOTCORR': {'20050101': 5.2, ...}
    }
    """
    parameters = json_obj.get('properties', {}).get('parameter', {})
    if not parameters:
        return pd.DataFrame()

    # Collect all date keys
    all_dates = set()
    for vmap in parameters.values():
        if isinstance(vmap, dict):
            all_dates.update(vmap.keys())

    # Build table
    data = {var: [] for var in parameters.keys()}
    dates_sorted = sorted(all_dates)
    for d in dates_sorted:
        for var, vmap in parameters.items():
            val = None
            if isinstance(vmap, dict):
                val = vmap.get(d, None)
            data[var].append(val)

    df = pd.DataFrame(data, index=pd.to_datetime(dates_sorted, format='%Y%m%d'))
    df.index.name = 'date'
    return df


def parse_hourly_response(json_obj: Dict) -> pd.DataFrame:
    """Parse NASA POWER hourly JSON to a DataFrame with Datetime index.

    The API typically returns per-variable mapping to date→list[24] of hourly values.
    Example shape:
    'parameter': {
      'T2M': {'20200101': [h0, h1, ... h23], ...}
    }
    If we encounter alternative shapes, we try to coerce them sensibly.
    """
    parameters = json_obj.get('properties', {}).get('parameter', {})
    if not parameters:
        return pd.DataFrame()

    # Gather rows of (timestamp, {var: value})
    records: Dict[pd.Timestamp, Dict[str, float]] = {}
    for var, date_map in parameters.items():
        if not isinstance(date_map, dict):
            continue
        for dstr, values in date_map.items():
            try:
                day = datetime.strptime(dstr, '%Y%m%d')
            except Exception:
                # sometimes hourly data may use YYYYMMDDHH as key; handle that
                try:
                    ts = datetime.strptime(dstr, '%Y%m%d%H')
                    records.setdefault(pd.Timestamp(ts), {})[var] = float(values)
                    continue
                except Exception:
                    continue
            if isinstance(values, list) or isinstance(values, tuple):
                for hour, v in enumerate(values):
                    ts = day + timedelta(hours=hour)
                    records.setdefault(pd.Timestamp(ts), {})[var] = None if v is None else float(v)
            elif isinstance(values, dict):
                for hour_str, v in values.items():
                    # hour_str might be '0'..'23' or '00'..'23'
                    try:
                        hour = int(hour_str)
                    except Exception:
                        continue
                    ts = day + timedelta(hours=hour)
                    records.setdefault(pd.Timestamp(ts), {})[var] = None if v is None else float(v)
            else:
                # Single value for the day (rare); assign to noon
                ts = day + timedelta(hours=12)
                records.setdefault(pd.Timestamp(ts), {})[var] = None if values is None else float(values)

    if not records:
        return pd.DataFrame()

    # Convert to DataFrame
    idx = sorted(records.keys())
    cols = sorted({k for r in records.values() for k in r.keys()})
    data = {c: [] for c in cols}
    for ts in idx:
        row = records[ts]
        for c in cols:
            data[c].append(row.get(c, None))
    df = pd.DataFrame(data, index=pd.DatetimeIndex(idx, name='datetime'))
    return df


# ----------------------------------------------
# Public download functions (chunking + progress bars)
# ----------------------------------------------

def download_nasa_power_daily(lat: float, lon: float, start_date: str, end_date: str, parameters: List[str],
                              chunk_years: int = 1, sleep_between: float = 1.0) -> pd.DataFrame:
    """
    Download NASA POWER daily data by chunking across years for reliability.

    Args:
        lat, lon: coordinates
        start_date, end_date: 'YYYYMMDD'
        parameters: list of variable names
        chunk_years: number of years per request (1 is safest)
        sleep_between: polite delay between requests
    Returns: DataFrame indexed by date
    """
    start_dt = datetime.strptime(start_date, '%Y%m%d')
    end_dt = datetime.strptime(end_date, '%Y%m%d')

    frames = []
    cur = datetime(start_dt.year, 1, 1)
    pbar_total = end_dt.year - start_dt.year + 1
    with tqdm(total=pbar_total, desc='Daily year chunks', unit='year') as pbar:
        while cur.year <= end_dt.year:
            chunk_start = max(start_dt, datetime(cur.year, 1, 1))
            chunk_end = min(end_dt, datetime(cur.year + chunk_years - 1, 12, 31))
            url = _build_daily_url(lat, lon, chunk_start.strftime('%Y%m%d'), chunk_end.strftime('%Y%m%d'), parameters)
            try:
                json_obj = http_get_json(url)
                df_part = parse_daily_response(json_obj)
                if not df_part.empty:
                    frames.append(df_part)
            except Exception as e:
                print(f"Warning: Daily chunk {chunk_start.date()} to {chunk_end.date()} failed: {e}")
            time.sleep(sleep_between)
            pbar.update(chunk_years)
            cur = datetime(cur.year + chunk_years, 1, 1)

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames).sort_index()
    # Drop duplicate indices keeping the last non-null values
    df = df[~df.index.duplicated(keep='last')]
    return df


def download_nasa_power_hourly(lat: float, lon: float, start_date: str, end_date: str, parameters: List[str],
                               chunk_months: int = 1, sleep_between: float = 1.0) -> pd.DataFrame:
    """
    Download NASA POWER hourly data by chunking monthly for size and reliability.

    Note: Not all variables are available hourly; missing ones will appear as NaN.
    """
    start_dt = datetime.strptime(start_date, '%Y%m%d')
    end_dt = datetime.strptime(end_date, '%Y%m%d')

    frames = []

    # Iterate month by month
    cur = datetime(start_dt.year, start_dt.month, 1)
    # Compute number of month steps for progress bar
    total_months = (end_dt.year - start_dt.year) * 12 + (end_dt.month - start_dt.month) + 1
    with tqdm(total=total_months, desc='Hourly month chunks', unit='mo') as pbar:
        while cur <= end_dt:
            # Determine chunk end
            year = cur.year
            month = cur.month
            chunk_start = max(start_dt, datetime(year, month, 1))
            # Last day of month
            if month == 12:
                last_day = datetime(year, 12, 31)
            else:
                last_day = datetime(year, month + 1, 1) - timedelta(days=1)
            chunk_end = min(end_dt, last_day)

            url = _build_hourly_url(lat, lon, chunk_start.strftime('%Y%m%d'), chunk_end.strftime('%Y%m%d'), parameters)
            try:
                json_obj = http_get_json(url)
                df_part = parse_hourly_response(json_obj)
                if not df_part.empty:
                    frames.append(df_part)
            except Exception as e:
                print(f"Warning: Hourly chunk {chunk_start.date()} to {chunk_end.date()} failed: {e}")
            time.sleep(sleep_between)
            pbar.update(1)
            # Move to next month
            if month == 12:
                cur = datetime(year + 1, 1, 1)
            else:
                cur = datetime(year, month + 1, 1)

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames).sort_index()
    df = df[~df.index.duplicated(keep='last')]
    return df


# ----------------------------------------------
# Main execution
# ----------------------------------------------
if __name__ == "__main__":
    # Time ranges
    daily_start = '20050101'
    daily_end = '20241231'

    hourly_start = '20200101'  # reduce size
    hourly_end = '20241231'

    params_daily = list(PARAMETERS_DAILY.keys())
    params_hourly = list(PARAMETERS_HOURLY.keys())

    for city_key, location in LOCATIONS.items():
        print(f"Downloading data for {location['name']} ({city_key}) ...")
        lat = location['lat']
        lon = location['lon']

        # # DAILY
        # try:
        #     daily_df = download_nasa_power_daily(lat, lon, daily_start, daily_end, params_daily, chunk_years=1)
        #     if daily_df is not None and not daily_df.empty:
        #         out_path = os.path.join('data', 'raw', f'{city_key}_daily_raw.csv')
        #         daily_df.to_csv(out_path)
        #         print(f"Saved daily data to {out_path} with shape {daily_df.shape}")
        #     else:
        #         print("No daily data returned.")
        # except Exception as e:
        #     print(f"Error downloading daily data for {city_key}: {e}")

        # HOURLY
        try:
            hourly_df = download_nasa_power_hourly(lat, lon, hourly_start, hourly_end, params_hourly, chunk_months=1)
            if hourly_df is not None and not hourly_df.empty:
                out_path = os.path.join('data', 'raw', f'{city_key}_hourly_raw.csv')
                hourly_df.to_csv(out_path)
                print(f"Saved hourly data to {out_path} with shape {hourly_df.shape}")
            else:
                print("No hourly data returned (may be unavailable for some parameters or date ranges).")
        except Exception as e:
            print(f"Error downloading hourly data for {city_key}: {e}")

        # Polite pause to help with rate limiting
        time.sleep(5)
