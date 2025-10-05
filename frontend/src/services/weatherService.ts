import type { WeatherDataPoint, HourlyDataPoint, Location, DateRange } from '../types/newTypes';
import { loadDailyStatsWithCache } from '../utils/dataLoader';
import type { WeatherData as NASAWeatherData } from '../types/weather.types';

// Convert NASA data to the format expected by the new frontend
export const fetchWeatherData = async (
  location: Location,
  dateRange: DateRange
): Promise<WeatherDataPoint[]> => {
  try {
    // Load NASA data for the location
    const locationId = location.name.toLowerCase().split(',')[0].trim();
    const nasaData: NASAWeatherData = await loadDailyStatsWithCache(locationId);
    
    const data: WeatherDataPoint[] = [];
    const startDate = new Date(dateRange.start + 'T00:00:00');
    const endDate = new Date(dateRange.end + 'T00:00:00');
    
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Calculate day of year (1-366)
      const yearStart = new Date(currentDate.getFullYear(), 0, 0);
      const diff = currentDate.getTime() - yearStart.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      // Get data for this day from NASA dataset
      const rainData = nasaData.variables.PRECTOTCORR?.[dayOfYear.toString()];
      const maxTempData = nasaData.variables.T2M_MAX?.[dayOfYear.toString()];
      const minTempData = nasaData.variables.T2M_MIN?.[dayOfYear.toString()];
      const windData = nasaData.variables.WS10M_MAX?.[dayOfYear.toString()];

      // Create a data point with NASA data
      // Use mean values for the day
      const maxTemp = maxTempData?.mean ?? 20;
      const minTemp = minTempData?.mean ?? 10;
      const precipitation = rainData?.mean ?? 0;
      const windSpeed = windData?.mean ?? 5;
      
      // Calculate humidity (not in NASA data, so we estimate based on temp and precipitation)
      // Higher precipitation and lower temps generally mean higher humidity
      const tempFactor = 1 - ((maxTemp - 10) / 30); // Normalize temp effect
      const precipFactor = Math.min(precipitation / 10, 1); // Normalize precip effect
      const humidity = 40 + (tempFactor * 30) + (precipFactor * 30);

      // Generate pseudo-hourly data based on daily aggregates for visualization
      const hourly: HourlyDataPoint[] = [];
      const tempAmplitude = (maxTemp - minTemp) / 2;
      const avgTemp = (maxTemp + minTemp) / 2;
      
      for (let i = 0; i < 24; i++) {
        // Temperature peaks around 2 PM (hour 14)
        const hourlyTempVariation = Math.sin((i - 8) * (Math.PI / 12));
        const hourTemp = avgTemp + tempAmplitude * hourlyTempVariation;
        
        const hourHumidity = humidity - hourlyTempVariation * 10;
        const hourWind = windSpeed * 3.6; // convert m/s to km/h
        
        hourly.push({
          hour: `${String(i).padStart(2, '0')}:00`,
          temp: hourTemp,
          humidity: Math.max(20, Math.min(100, hourHumidity)),
          wind: Math.max(0, hourWind),
        });
      }

      data.push({
        date: currentDate.toISOString().split('T')[0],
        maxTemp,
        minTemp,
        precipitation,
        windSpeed,
        humidity: Math.max(0, Math.min(100, humidity)),
        hourly,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data from NASA POWER dataset');
  }
};
