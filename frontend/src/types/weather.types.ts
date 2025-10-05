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

export interface ProbabilityTrend {
  average_slope_per_year: number;
  median_slope_per_year: number;
  per_decade_change_percentage_points: number;
  start_year: number;
  end_year: number;
  estimated_start_probability_percent: number;
  estimated_end_probability_percent: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  risk_level: RiskLevel;
  percent_days_significant_trend: number;
  num_days_analyzed: number;
}

export interface VariableTrend {
  label: string;
  primary_threshold: string;
  primary_trend: ProbabilityTrend;
  all_thresholds: {
    [thresholdKey: string]: ProbabilityTrend;
  };
}

export interface TrendSummary {
  location: string;
  generated_at: string;
  data_period: DataPeriod;
  trends: {
    PRECTOTCORR?: VariableTrend;
    T2M_MAX?: VariableTrend;
    WS10M_MAX?: VariableTrend;
  };
}
