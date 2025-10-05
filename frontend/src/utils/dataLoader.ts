import type { WeatherData, AllLocationsSummary, PresetQuery, TrendSummary } from '../types/weather.types';

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
  return fetchJson<WeatherData>(`${DATA_BASE}/processed/${location}_daily_stats.json`);
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

/**
 * Load trend summary for a specific location
 */
export async function loadTrendSummary(location: string): Promise<TrendSummary> {
  return fetchJson<TrendSummary>(`${DATA_BASE}/processed/${location}_trend_summary.json`);
}

/**
 * Cache for loaded trend summaries
 */
const trendSummaryCache = new Map<string, TrendSummary>();

/**
 * Load trend summary with caching
 */
export async function loadTrendSummaryWithCache(location: string): Promise<TrendSummary> {
  if (trendSummaryCache.has(location)) {
    return trendSummaryCache.get(location)!;
  }
  const data = await loadTrendSummary(location);
  trendSummaryCache.set(location, data);
  return data;
}
