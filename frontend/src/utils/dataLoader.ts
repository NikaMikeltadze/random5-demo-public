import type { WeatherData, AllLocationsSummary, PresetQuery } from '../types/weather.types';

const DATA_BASE = '/data';

/**
 * Load daily stats for a specific location
 */
export async function loadDailyStats(location: string): Promise<WeatherData> {
  const response = await fetch(`${DATA_BASE}/processed/${location}_daily_stats.json`);
  if (!response.ok) {
    throw new Error(`Failed to load daily stats for ${location}`);
  }
  return response.json();
}

/**
 * Load summary data for all locations
 */
export async function loadAllLocationsSummary(): Promise<AllLocationsSummary> {
  const response = await fetch(`${DATA_BASE}/demo/all_locations_summary.json`);
  if (!response.ok) {
    throw new Error('Failed to load locations summary');
  }
  return response.json();
}

/**
 * Load preset demo queries
 */
export async function loadPresetQueries(): Promise<PresetQuery[]> {
  const response = await fetch(`${DATA_BASE}/demo/preset_demo_queries.json`);
  if (!response.ok) {
    throw new Error('Failed to load preset queries');
  }
  return response.json();
}

/**
 * Cache for loaded weather data to avoid redundant fetches
 */
const weatherDataCache = new Map<string, WeatherData>();

/**
 * Load daily stats with caching
 */
export async function loadDailyStatsWithCache(location: string): Promise<WeatherData> {
  if (weatherDataCache.has(location)) {
    return weatherDataCache.get(location)!;
  }
  const data = await loadDailyStats(location);
  weatherDataCache.set(location, data);
  return data;
}
