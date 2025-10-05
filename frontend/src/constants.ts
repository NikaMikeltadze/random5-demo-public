import type { Location, Thresholds, QuickQuery } from './types/newTypes';

export const LOCATIONS: Location[] = [
  { name: 'Tbilisi, Georgia', lat: 41.7151, lon: 44.8271 },
  { name: 'Batumi, Georgia', lat: 41.6168, lon: 41.6367 },
  { name: 'Kutaisi, Georgia', lat: 42.2662, lon: 42.7180 },
];

// Guest user defaults
export const DEFAULT_THRESHOLDS: Thresholds = {
  hotTemp: 35, // °C
  coldTemp: 0, // °C
  wind: 36, // km/h (equivalent to 10 m/s)
  rain: 10, // mm
  humidity: 85, // %
};

// Default settings for a logged-in user
export const USER_THRESHOLDS: Thresholds = {
  hotTemp: 30, // °C
  coldTemp: 5, // °C
  wind: 50, // km/h
  rain: 10, // mm
  humidity: 80, // %
};

export const QUICK_QUERIES: QuickQuery[] = [
    { location: 'Tbilisi', date: '08-15' },
    { location: 'Batumi', date: '07-04' },
    { location: 'Kutaisi', date: '10-10' },
    { location: 'Tbilisi', date: '05-12' },
    { location: 'Batumi', date: '09-01' },
    { location: 'Kutaisi', date: '12-31' },
    { location: 'Tbilisi', date: '01-20' },
    { location: 'Batumi', date: '03-08' },
    { location: 'Kutaisi', date: '04-25' },
    { location: 'Tbilisi', date: '06-10' },
];
