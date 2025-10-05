export interface Coordinates {
  lat: number;
  lon: number;
  name: string;
}

export interface DataPeriod {
  start: string | null;
  end: string | null;
  years: number;
}

export interface NASASource {
  dataset: string;
  api_url: string;
  citation: string;
  access_date: string;
}

export interface Percentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface Probabilities {
  [key: string]: number;
}

export interface YearlyValue {
  year: number;
  value: number;
}

export interface Trend {
  slope: number;
  p_value: number;
  r_squared: number;
  significant: boolean;
}

export interface DayStats {
  day_of_year: number;
  variable: string;
  sample_size: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  percentiles: Percentiles;
  probabilities: Probabilities;
  yearly_values: YearlyValue[];
  trend?: Trend;
}

export interface VariableStats {
  [dayOfYear: string]: DayStats;
}

export interface WeatherData {
  location: string;
  coordinates: Coordinates;
  data_period: DataPeriod;
  nasa_source: NASASource;
  variables: {
    PRECTOTCORR?: VariableStats;
    T2M_MAX?: VariableStats;
    T2M_MIN?: VariableStats;
    WS10M_MAX?: VariableStats;
    // Newly added variables for full coverage
    T2M?: VariableStats;
    WS2M?: VariableStats;
    WS10M?: VariableStats;
    RH2M?: VariableStats;
    PS?: VariableStats;
    QV2M?: VariableStats;
    ALLSKY_SFC_SW_DWN?: VariableStats;
  };
}

export interface LocationInfo {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  climate_summary: {
    annual_precipitation_mm: number;
    avg_annual_temp_c: number;
    wettest_month: string;
    driest_month: string;
    hottest_month: string;
  };
  extreme_event_annual_probabilities: {
    heavy_rain_days: number;
    extreme_heat_days: number;
    high_wind_days: number;
  };
  data_files: {
    daily_stats: string;
    hourly_stats: string;
  };
}

export interface AllLocationsSummary {
  generated_at: string;
  hackathon: string;
  project: string;
  locations: LocationInfo[];
  nasa_attribution: {
    dataset: string;
    full_citation: string;
    url: string;
    license: string;
  };
}

export interface PresetQuery {
  location: string;
  date: string;
  label: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';
