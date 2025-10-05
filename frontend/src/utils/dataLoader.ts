import type { WeatherData, AllLocationsSummary, PresetQuery } from '../types/weather.types';

// Use BASE_URL so the app works when hosted under a subpath. Serve data from public/static-data
const DATA_BASE = `${import.meta.env.BASE_URL}static-data`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (status ${res.status})`);
  }
  // Guard against HTML being served (e.g., 404 fallback to index.html)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Expected JSON but received: ${text.slice(0, 120)}...`);
  }
  return res.json();
}

/**
 * Load daily stats for a specific location
 */
export async function loadDailyStats(location: string): Promise<WeatherData> {
  const primary = `${DATA_BASE}/processed/${location}_daily_stats.json`;
  try {
    return await fetchJson<WeatherData>(primary);
  } catch (e) {
    // Fallback path: some deployments serve data under /data instead of /static-data
    const alt = `${import.meta.env.BASE_URL}data/processed/${location}_daily_stats.json`;
    return await fetchJson<WeatherData>(alt);
  }
}

/**
 * Load ML monthly forecast for a specific location (next 12 months). Returns null if unavailable.
 */
export async function loadMonthlyForecast(location: string): Promise<any | null> {
  const primary = `${DATA_BASE}/processed/${location}_monthly_forecast.json`;
  try {
    return await fetchJson<any>(primary);
  } catch (e) {
    // Fallback path
    const alt = `${import.meta.env.BASE_URL}data/processed/${location}_monthly_forecast.json`;
    try {
      return await fetchJson<any>(alt);
    } catch (e2) {
      return null;
    }
  }
}

/**
 * Load optional hourly profiles (climatological hourly multipliers or means) for a location.
 * The expected shape (if provided) is:
 * {
 *   "months": ["Jan", ...],
 *   "wind": { "Jan": number[24], ... }, // multipliers summing ~24 or mean profile
 *   "temp"?: { "Jan": number[24] },
 *   "humidity"?: { "Jan": number[24] }
 * }
 */
export async function loadHourlyProfiles(location: string): Promise<any | null> {
  const primary = `${DATA_BASE}/processed/${location}_hourly_profiles.json`;
  try {
    return await fetchJson<any>(primary);
  } catch (e) {
    const alt = `${import.meta.env.BASE_URL}data/processed/${location}_hourly_profiles.json`;
    try {
      return await fetchJson<any>(alt);
    } catch (e2) {
      return null;
    }
  }
}

/**
 * Load summary data for all locations
 */
export async function loadAllLocationsSummary(): Promise<AllLocationsSummary> {
  return fetchJson<AllLocationsSummary>(`${DATA_BASE}/demo/all_locations_summary.json`);
}

/**
 * Load preset demo queries
 */
export async function loadPresetQueries(): Promise<PresetQuery[]> {
  return fetchJson<PresetQuery[]>(`${DATA_BASE}/demo/preset_demo_queries.json`);
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
