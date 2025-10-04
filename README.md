# Will It Rain On My Parade? — NASA POWER Data Pipeline

This repository contains a fully scripted, offline-first pipeline to download, preprocess, validate, and package NASA POWER weather data for three Georgian cities: Tbilisi, Batumi, and Kutaisi. The output JSON files are optimized for instant loading during the NASA Space Apps 2025 hackathon demo.

## Quick Start

1. Install Python 3.9+
2. Create a virtual environment (optional but recommended)
3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Download raw data (daily for 2005–2024; hourly for 2020–2024)

```bash
python nasa_power_download.py
```

5. Preprocess into demo-ready JSON

```bash
python preprocess_probabilities.py
```

6. Validate and generate demo helpers

```bash
python validate_data.py
```

## Output Files

```
data/
├── raw/
│   ├── tbilisi_daily_raw.csv
│   ├── tbilisi_hourly_raw.csv
│   ├── batumi_daily_raw.csv
│   ├── batumi_hourly_raw.csv
│   ├── kutaisi_daily_raw.csv
│   └── kutaisi_hourly_raw.csv
├── processed/
│   ├── tbilisi_daily_stats.json
│   ├── tbilisi_hourly_stats.json
│   ├── batumi_daily_stats.json
│   ├── batumi_hourly_stats.json
│   ├── kutaisi_daily_stats.json
│   └── kutaisi_hourly_stats.json
└── demo/
    └── all_locations_summary.json
```

## NASA POWER API Notes

- Base: https://power.larc.nasa.gov/api/
- Daily endpoint: /temporal/daily/point
- Hourly endpoint: /temporal/hourly/point
- Format: JSON (properties.parameter maps variable → {date → value})
- Date range limits: Large ranges are allowed, but chunking by year/month is recommended
- Rate limits: Keep below ~300 requests/hour. We use chunking + sleep + retries with exponential backoff
- Time format: YYYYMMDD for daily; hourly data returns 24 values per date (handled in code)

## Variables

```
T2M, T2M_MAX, T2M_MIN, PRECTOTCORR,
WS2M, WS10M, WS10M_MAX, RH2M, PS, QV2M, ALLSKY_SFC_SW_DWN
```

See inline code comments for definitions and units.

## Extreme Event Thresholds (configurable)

- Heavy rain > 10 mm/day (very heavy > 25 mm/day, extreme > 50 mm/day)
- Hot day > 30°C (very hot > 35°C, extreme > 40°C)
- Freezing < 0°C, very cold < -10°C
- Windy > 10 m/s (very windy > 15 m/s, extreme > 20 m/s)

These are defined in preprocess_probabilities.py and can be adjusted as needed.

## Example Frontend Query

```javascript
// Get probability for August 15 (day 227)
const stats = await (await fetch('/data/processed/tbilisi_daily_stats.json')).json();
const aug15 = stats.variables.PRECTOTCORR['227'];
console.log(`Heavy rain probability: ${aug15.probabilities.heavy_rain_above_10mm * 100}%`);
console.log(`Trend: ${aug15.trend && aug15.trend.significant ? 'Increasing ↑' : 'Stable'}`);
```

## Attribution (required)

- Dataset: NASA POWER
- URL: https://power.larc.nasa.gov/
- Citation: NASA/POWER CERES/MERRA2 Native Resolution Daily and Hourly Data; Derived from satellite and model reanalysis data
- License: Creative Commons Attribution 4.0 International

Please include this attribution in all visualizations and derived data products.
