import type { WeatherDataPoint, HourlyDataPoint, Location, DateRange } from '../types/newTypes';
import { loadDailyStatsWithCache } from '../utils/dataLoader';
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

    const data: WeatherDataPoint[] = [];
    const startDate = new Date(dateRange.start + 'T00:00:00');
    const endDate = new Date(dateRange.end + 'T00:00:00');

    // Defensive: ensure valid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`Invalid date range: ${JSON.stringify(dateRange)}`);
    }

    let currentDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endUtc = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    while (currentDate <= endUtc) {
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

      // Optional pseudo-hourly curve strictly derived from daily min/max and wind; no randomization
      const hourly: HourlyDataPoint[] = [];
      const tempAmplitude = (maxTemp - minTemp) / 2;
      const avgTempBase = typeof meanTempData?.mean === 'number' ? meanTempData!.mean : (maxTemp + minTemp) / 2;
      for (let i = 0; i < 24; i++) {
        // Temperature peaks around 14:00 (local approximation)
        const hourlyTempVariation = Math.sin((i - 8) * (Math.PI / 12));
        const hourTemp = avgTempBase + tempAmplitude * hourlyTempVariation;
        const hourHumidity = Math.max(0, Math.min(100, (humidity ?? 50) - hourlyTempVariation * 10));
        const meanWindMs = typeof ws10MeanData?.mean === 'number' ? ws10MeanData!.mean : (typeof ws2MeanData?.mean === 'number' ? ws2MeanData!.mean : windSpeed ?? 0);
        const hourWind = Math.max(0, meanWindMs * 3.6); // km/h
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
