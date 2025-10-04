export interface Thresholds {
  tempHot: number;
  tempCold: number;
  windSpeed: number;
  rainfall: number;
  humidity: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export interface HourlyData {
  hour: string;
  temperature: number;
  wind: number;
  rain: number;
  humidity: number;
}
