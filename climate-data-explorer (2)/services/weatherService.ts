import type { Location, DateRange, WeatherDataPoint, HourlyDataPoint } from '../types';

// This is a mock data generator. In a real application, this would fetch from a real API.
export const fetchWeatherData = async (
  location: Location,
  dateRange: DateRange
): Promise<WeatherDataPoint[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const data: WeatherDataPoint[] = [];
      // FIX: Add 'T00:00:00' to ensure dates are parsed consistently in UTC, avoiding timezone-related off-by-one errors.
      const startDate = new Date(dateRange.start + 'T00:00:00');
      const endDate = new Date(dateRange.end + 'T00:00:00');
      
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Generate pseudo-random daily data based on location and date
        const dayOfYear = (Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()) - Date.UTC(currentDate.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
        const latFactor = (location.lat - 40) / 10; // Simple latitude influence
        
        // Seasonal temperature variation
        const tempVariation = Math.sin((dayOfYear - 90) * (Math.PI / 182.5)); // Sine wave peaking in summer
        const baseTemp = 15 + latFactor * 5;
        const maxTemp = baseTemp + tempVariation * 15 + (Math.random() - 0.5) * 5;
        const minTemp = maxTemp - (8 + Math.random() * 4);
        
        const precipChance = 0.1 + Math.max(0, Math.cos(dayOfYear * (Math.PI / 182.5)) * 0.2);
        const precipitation = Math.random() < precipChance ? Math.random() * 25 : 0;
        
        const windSpeed = 4 + Math.random() * 8 + tempVariation * 2;
        
        const baseHumidity = 65;
        const humidity = baseHumidity + tempVariation * 20 + (Math.random() - 0.5) * 10;
        
        // Generate hourly data based on daily aggregates
        const hourly: HourlyDataPoint[] = [];
        const tempAmplitude = (maxTemp - minTemp) / 2;
        const avgTemp = (maxTemp + minTemp) / 2;
        
        for (let i = 0; i < 24; i++) {
          // Temperature peaks around 2 PM (hour 14)
          const hourlyTempVariation = Math.sin((i - 8) * (Math.PI / 12));
          const hourTemp = avgTemp + tempAmplitude * hourlyTempVariation + (Math.random() - 0.5) * 2;
          
          const hourHumidity = humidity - hourlyTempVariation * 10 + (Math.random() - 0.5) * 5;
          
          const hourWind = windSpeed * 3.6 + (Math.random() - 0.5) * 5; // convert to km/h and add noise
          
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
          humidity: Math.max(0, Math.min(100, humidity)), // Clamp between 0-100
          hourly,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      resolve(data);
    }, 1000); // Simulate network delay
  });
};
