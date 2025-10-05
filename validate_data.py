import json
import os
import time
from typing import Dict, List

# Validation configuration
VARIABLES_TO_CHECK = [
    'PRECTOTCORR',
    'T2M_MAX',
    'T2M_MIN',
    'WS10M_MAX',
    # Extended coverage
    'T2M',
    'WS2M',
    'WS10M',
    'RH2M',
    'PS',
    'QV2M',
    'ALLSKY_SFC_SW_DWN',
]


def _is_number(x) -> bool:
    try:
        _ = float(x)
        return True
    except Exception:
        return False


def validate_json_file(path: str) -> Dict:
    t0 = time.perf_counter()
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    load_ms = (time.perf_counter() - t0) * 1000.0

    issues: List[str] = []

    # Basic keys
    for key in ['location', 'coordinates', 'data_period', 'nasa_source', 'variables']:
        if key not in data:
            issues.append(f"Missing top-level key: {key}")

    variables = data.get('variables', {})

    # Check day-of-year coverage and value ranges
    for var in VARIABLES_TO_CHECK:
        if var not in variables:
            # Not all variables are required to be present depending on API availability
            continue
        day_map: Dict = variables[var]

        # Keys must be '1'..'366'
        bad_keys = [k for k in day_map.keys() if not k.isdigit() or int(k) < 1 or int(k) > 366]
        if bad_keys:
            issues.append(f"{var}: Invalid DOY keys detected (examples: {bad_keys[:5]})")

        # Expect up to 366 days; allow gaps but report
        missing_days = [str(d) for d in range(1, 367) if str(d) not in day_map]
        if missing_days:
            issues.append(f"{var}: Missing {len(missing_days)} DOY entries (e.g., {missing_days[:5]})")

        # Validate stats block
        for dstr, stats_dict in day_map.items():
            # Numeric sanity
            for num_key in ['mean', 'median', 'std', 'min', 'max']:
                val = stats_dict.get(num_key, None)
                if val is None or not _is_number(val):
                    issues.append(f"{var} DOY {dstr}: non-numeric {num_key}: {val}")
            # Min/Max relation
            mn, mx = stats_dict.get('min', None), stats_dict.get('max', None)
            if _is_number(mn) and _is_number(mx) and float(mn) > float(mx):
                issues.append(f"{var} DOY {dstr}: min > max ({mn} > {mx})")

            # Probabilities
            probs = stats_dict.get('probabilities', {})
            for name, p in probs.items():
                if p is None or not _is_number(p) or not (0.0 <= float(p) <= 1.0):
                    issues.append(f"{var} DOY {dstr}: probability {name} out of bounds: {p}")

    return {
        'path': path,
        'size_kb': os.path.getsize(path) / 1024.0,
        'load_ms': load_ms,
        'issues': issues,
    }


def validate_json_files():
    processed_dir = os.path.join('data', 'processed')
    reports = []
    for city in ['tbilisi', 'batumi', 'kutaisi']:
        daily_path = os.path.join(processed_dir, f'{city}_daily_stats.json')
        hourly_path = os.path.join(processed_dir, f'{city}_hourly_stats.json')
        if os.path.exists(daily_path):
            reports.append(validate_json_file(daily_path))
        if os.path.exists(hourly_path):
            # Lightweight check for hourly
            t0 = time.perf_counter()
            with open(hourly_path, 'r', encoding='utf-8') as f:
                _ = json.load(f)
            load_ms = (time.perf_counter() - t0) * 1000.0
            reports.append({'path': hourly_path, 'size_kb': os.path.getsize(hourly_path) / 1024.0, 'load_ms': load_ms, 'issues': []})

    # Print summary
    any_issues = False
    for r in reports:
        print(f"File: {r['path']} | size: {r['size_kb']:.1f} KB | load: {r['load_ms']:.1f} ms")
        if r['issues']:
            any_issues = True
            for issue in r['issues']:
                print(f"  - {issue}")
    if not reports:
        print('No processed files found. Run preprocess_probabilities.py first.')
    elif not any_issues:
        print('All files passed basic validation.')


def generate_test_queries():
    """
    Create preset demo queries that can be used by the frontend for instant responses.
    Writes demo\preset_demo_queries.json
    """
    demo_queries = [
        {'location': 'tbilisi', 'date': '08-15', 'label': 'Tbilisi wedding, August 15'},
        {'location': 'batumi', 'date': '07-04', 'label': 'Batumi beach day, July 4'},
        {'location': 'kutaisi', 'date': '10-10', 'label': 'Kutaisi hiking, October 10'},
        {'location': 'tbilisi', 'date': '05-12', 'label': 'Tbilisi festival, May 12'},
        {'location': 'batumi', 'date': '09-01', 'label': 'Batumi marina, September 1'},
        {'location': 'kutaisi', 'date': '12-31', 'label': 'Kutaisi New Year Eve, Dec 31'},
        {'location': 'tbilisi', 'date': '01-20', 'label': 'Tbilisi winter fair, Jan 20'},
        {'location': 'batumi', 'date': '03-08', 'label': 'Batumi spring event, Mar 8'},
        {'location': 'kutaisi', 'date': '04-25', 'label': 'Kutaisi trail run, Apr 25'},
        {'location': 'tbilisi', 'date': '06-10', 'label': 'Tbilisi park day, Jun 10'},
    ]

    os.makedirs(os.path.join('data', 'demo'), exist_ok=True)
    out_path = os.path.join('data', 'demo', 'preset_demo_queries.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(demo_queries, f, indent=2)
    print(f'Wrote preset demo queries to {out_path}')


if __name__ == '__main__':
    validate_json_files()
    generate_test_queries()
