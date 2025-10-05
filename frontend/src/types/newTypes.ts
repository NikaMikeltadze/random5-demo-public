// Types for the new frontend UI components
export interface Location {
  name: string;
  lat: number;
  lon: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface HourlyDataPoint {
  hour: string;
  temp: number;
  humidity: number;
  wind: number; // km/h
}

export interface WeatherDataPoint {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  windSpeed: number; // m/s
  humidity: number; // %
  hourly?: HourlyDataPoint[];
}

export interface Thresholds {
  hotTemp: number; // °C
  coldTemp: number; // °C
  wind: number; // km/h
  rain: number; // mm
  humidity: number; // %
}

export interface ClimateStats {
    avgPrecipitation: number;
    avgTemperature: number;
    monthlyPatterns: {
        wettest: string;
        driest: string;
        hottest: string;
    };
    extremeEvents: {
        heavyRainDays: number;
        extremeHeatDays: number;
        highWindDays: number;
    };
}

export interface QuickQuery {
    location: string;
    date: string;
}
