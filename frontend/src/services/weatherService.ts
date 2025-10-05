import type { WeatherDataPoint, HourlyDataPoint, Location, DateRange } from '../types/newTypes';
import { loadDailyStatsWithCache, loadHourlyProfiles } from '../utils/dataLoader';
import type { WeatherData as NASAWeatherData, DayStats } from '../types/weather.types';

// Convert processed NASA day-of-year stats into UI-friendly daily data using only validated values
export const fetchWeatherData = async (
  location: Location,
  dateRange: DateRange
): Promise<WeatherDataPoint[]> => {
  try {
    // Load processed daily stats for the location
    const locationId = location.name.toLowerCase().split(',')[0].trim();
    const nasaData: NASAWeatherData = await loadDailyStatsWithCache(locationId);
    const hourlyProfiles = await loadHourlyProfiles(locationId);

    const data: WeatherDataPoint[] = [];
    const startDate = new Date(dateRange.start + 'T00:00:00');
    const endDate = new Date(dateRange.end + 'T00:00:00');

    // Defensive: ensure valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`Invalid date range: ${JSON.stringify(dateRange)}`);
    }

    let currentDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endUtc = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    while (currentDate.getTime() <= endUtc.getTime()) {
      // Calculate day of year (1-366) in UTC to avoid TZ drift
      const yearStart = new Date(Date.UTC(currentDate.getUTCFullYear(), 0, 0));
      const diff = currentDate.getTime() - yearStart.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      let dayOfYear = Math.floor(diff / oneDay);

      // Leap day guard: if 366 missing, fall back to 365
      const doyKey = (n: number) => n.toString();
      const keyToUse = (obj?: Record<string, DayStats>) => {
        if (!obj) return undefined;
        if (doyKey(dayOfYear) in obj) return doyKey(dayOfYear);
        if (dayOfYear === 366 && '365' in obj) return '365';
        return undefined;
      };

      // Look up stats for each variable; skip the day if critical stats are missing
      const rainStatsKey = keyToUse(nasaData.variables.PRECTOTCORR);
      const maxTStatsKey = keyToUse(nasaData.variables.T2M_MAX);
      const minTStatsKey = keyToUse(nasaData.variables.T2M_MIN);
      const windStatsKey = keyToUse(nasaData.variables.WS10M_MAX);
      // Optional additional variables to enrich predictions
      const meanTStatsKey = keyToUse(nasaData.variables.T2M);
      const rhStatsKey = keyToUse(nasaData.variables.RH2M);
      const ws10StatsKey = keyToUse(nasaData.variables.WS10M);
      const ws2StatsKey = keyToUse(nasaData.variables.WS2M);

      // Require, at minimum, precipitation and temperature stats. Wind is optional.
      if (!rainStatsKey || !maxTStatsKey || !minTStatsKey) {
        // Move to next date without synthesizing defaults
        currentDate = new Date(currentDate.getTime() + oneDay);
        continue;
      }

      const rainData = nasaData.variables.PRECTOTCORR![rainStatsKey];
      const maxTempData = nasaData.variables.T2M_MAX![maxTStatsKey];
      const minTempData = nasaData.variables.T2M_MIN![minTStatsKey];
      const windData = windStatsKey ? nasaData.variables.WS10M_MAX![windStatsKey] : undefined;
      const meanTempData = meanTStatsKey ? nasaData.variables.T2M![meanTStatsKey] : undefined;
      const rhData = rhStatsKey ? nasaData.variables.RH2M![rhStatsKey] : undefined;
      const ws10MeanData = ws10StatsKey ? nasaData.variables.WS10M![ws10StatsKey] : undefined;
      const ws2MeanData = ws2StatsKey ? nasaData.variables.WS2M![ws2StatsKey] : undefined;

      const maxTemp = maxTempData.mean;
      const minTemp = minTempData.mean;
      const precipitation = rainData.mean; // mm/day
      const windSpeed = windData?.mean ?? 0; // m/s

      // Merge per-DOY probabilities across available variables so the UI can consume them deterministically
      const probabilities: Record<string, number> = {
        ...(rainData?.probabilities || {}),
        ...(maxTempData?.probabilities || {}),
        ...(windData?.probabilities || {}),
      };

      // Use actual RH2M mean when available; otherwise derive a bounded proxy.
      let humidity = typeof rhData?.mean === 'number' ? Math.max(0, Math.min(100, rhData!.mean)) : undefined;
      if (humidity === undefined) {
        // Derive from precip and temperature spread
        const tempSpread = Math.max(0, maxTemp - minTemp);
        const spreadFactor = Math.min(tempSpread / 20, 1); // 0..1
        const precipFactor = Math.min(precipitation / 20, 1); // 0..1 for heavy rain days
        const h = 50 + precipFactor * 40 - spreadFactor * 20; // base 50%
        humidity = Math.max(0, Math.min(100, h));
      }

      // Build hourly curves; temperature uses sinusoidal daily cycle, wind uses diurnal profile (or hourly profiles if provided)
      const hourly: HourlyDataPoint[] = [];
      const tempAmplitude = (maxTemp - minTemp) / 2;
      const avgTempBase = typeof meanTempData?.mean === 'number' ? meanTempData!.mean : (maxTemp + minTemp) / 2;

      // Prepare wind diurnal profile
      const meanWindMs = typeof ws10MeanData?.mean === 'number' ? ws10MeanData!.mean : (typeof ws2MeanData?.mean === 'number' ? ws2MeanData!.mean : windSpeed ?? 0);
      const monthIdx = currentDate.getUTCMonth();
      const monthAbbrs = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthAbbr = monthAbbrs[monthIdx];
      const prof = (hourlyProfiles && hourlyProfiles.wind && hourlyProfiles.wind[monthAbbr]) ? hourlyProfiles.wind[monthAbbr] as number[] : null;

      // Deterministic seeded noise based on date
      const dateKey = currentDate.toISOString().slice(0,10);
      let seed = 0;
      for (let k = 0; k < dateKey.length; k++) seed = (seed * 31 + dateKey.charCodeAt(k)) >>> 0;
      const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed & 0xffff) / 0x10000; };

      // If profile provided, normalize and scale to daily mean
      let windHours: number[] = new Array(24).fill(0);
      if (prof && prof.length === 24) {
        const sum = prof.reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
        const norm = sum > 0 ? prof.map(v => v / (sum / 24)) : new Array(24).fill(1);
        windHours = norm.map((m, i) => Math.max(0, (meanWindMs * m) * 3.6));
      } else {
        // Synthetic diurnal: calmer early morning, peak afternoon, secondary evening
        const seasonal = 0.6 + 0.4 * Math.sin(((monthIdx + 1) / 12) * 2 * Math.PI); // 0.2..1.0 roughly
        const amp = meanWindMs * (0.35 + 0.25 * seasonal);
        for (let i = 0; i < 24; i++) {
          const primary = Math.max(0, Math.sin((i - 9) * (Math.PI / 12))); // peak ~15:00
          const secondary = Math.max(0, Math.sin((i - 15) * (Math.PI / 12))) * 0.4; // smaller evening peak
          const noise = (rand() - 0.5) * 0.2; // +/-10%
          const ms = Math.max(0, meanWindMs + amp * (primary + secondary) + meanWindMs * noise);
          windHours[i] = ms * 3.6;
        }
      }

      for (let i = 0; i < 24; i++) {
        // Temperature peaks around ~14:00 (local approximation)
        const hourlyTempVariation = Math.sin((i - 8) * (Math.PI / 12));
        const hourTemp = avgTempBase + tempAmplitude * hourlyTempVariation;
        const hourHumidity = Math.max(0, Math.min(100, (humidity ?? 50) - hourlyTempVariation * 10));
        const hourWind = windHours[i];
        hourly.push({
          hour: `${String(i).padStart(2, '0')}:00`,
          temp: hourTemp,
          humidity: hourHumidity,
          wind: hourWind,
        });
      }

      data.push({
        date: currentDate.toISOString().split('T')[0],
        maxTemp,
        minTemp,
        precipitation,
        windSpeed,
        humidity,
        probabilities,
        hourly,
      });

      // Next day (UTC)
      currentDate = new Date(currentDate.getTime() + oneDay);
    }

    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data from processed NASA dataset');
  }
};
