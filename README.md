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

All available NASA POWER variables are now processed and included in the output:

**Temperature:**
- `T2M` - Temperature at 2 Meters (°C)
- `T2M_MAX` - Maximum Temperature at 2 Meters (°C)
- `T2M_MIN` - Minimum Temperature at 2 Meters (°C)

**Precipitation:**
- `PRECTOTCORR` - Precipitation Corrected (mm/day for daily, mm/hour for hourly)

**Wind:**
- `WS2M` - Wind Speed at 2 Meters (m/s)
- `WS10M` - Wind Speed at 10 Meters (m/s)
- `WS10M_MAX` - Maximum Wind Speed at 10 Meters (m/s)

**Humidity & Atmosphere:**
- `RH2M` - Relative Humidity at 2 Meters (%)
- `QV2M` - Specific Humidity at 2 Meters (g/kg)
- `PS` - Surface Pressure (kPa)

**Solar:**
- `ALLSKY_SFC_SW_DWN` - All Sky Surface Shortwave Downward Irradiance (W/m²)

## Extreme Event Thresholds (configurable)

All variables now have configurable thresholds for extreme events:

**Precipitation:**
- Heavy rain > 10 mm/day, very heavy > 25 mm/day, extreme > 50 mm/day

**Temperature (T2M):**
- Warm > 25°C, hot > 30°C, cold < 5°C, freezing < 0°C

**Temperature (T2M_MAX):**
- Hot > 30°C, very hot > 35°C, extreme heat > 40°C

**Temperature (T2M_MIN):**
- Freezing < 0°C, very cold < -10°C

**Wind (all wind variables):**
- Breezy > 5 m/s, windy > 10 m/s, very windy > 15 m/s, extreme > 20 m/s

**Humidity:**
- Dry < 30%, humid > 70%, very humid > 85%

**Pressure:**
- Low pressure < 100 kPa, high pressure > 102 kPa

**Specific Humidity:**
- Dry < 5 g/kg, humid > 15 g/kg

**Solar Irradiance:**
- Sunny > 600 W/m², very sunny > 800 W/m²

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
