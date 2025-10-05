import React, { useMemo } from 'react';
import type { WeatherDataPoint, Thresholds, DateRange } from '../types/newTypes';
import { Card } from './Card';
import { AlertTriangleIcon, PrecipitationIcon, TempIcon, WindIcon } from './icons/WeatherIcons';

interface WeatherProbabilitiesProps {
  weatherData: WeatherDataPoint[];
  thresholds: Thresholds;
  loading: boolean;
  dateRange: DateRange;
}

const ProbabilityItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  condition: string;
  probability: number;
  color: 'green' | 'red' | 'blue';
  loading: boolean;
}> = ({ icon, title, condition, probability, color, loading }) => {

  const dotColor = probability > 40 ? 'bg-red-500' : 'bg-green-500';
  const progressColor = color === 'red' ? 'bg-red-500' : color === 'blue' ? 'bg-cyan-500' : 'bg-teal-500';
  const years = 20; // Hardcoded as per image

  if(loading) {
    return (
        <div className="animate-pulse flex items-center justify-between p-4">
            <div className="flex items-center">
                <div className="w-10 h-10 bg-slate-700 rounded-full mr-4"></div>
                <div>
                    <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-32"></div>
                </div>
            </div>
            <div className="w-20 h-8 bg-slate-700 rounded"></div>
        </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className="mr-3">{icon}</div>
          <div>
            <h4 className="font-semibold text-white">{title}</h4>
            <p className="text-sm text-slate-400">{condition}</p>
          </div>
        </div>
        <div className="flex items-center">
          <p className={`text-3xl font-bold mr-3 ${color === 'red' ? 'text-red-400' : 'text-cyan-300'}`}>{probability.toFixed(1)}%</p>
          <div className={`w-4 h-4 rounded-full ${dotColor}`}></div>
        </div>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-4">
        <div className={progressColor + " h-1.5 rounded-full"} style={{ width: `${probability}%` }}></div>
      </div>
      <p className="text-xs text-slate-500 mt-2">Based on {years} years of data</p>
    </div>
  );
};


export const WeatherProbabilities: React.FC<WeatherProbabilitiesProps> = ({ weatherData, thresholds, loading, dateRange }) => {

  const dayOfYear = useMemo(() => {
    if (!dateRange.start) return 0;
    // Use UTC to avoid timezone drift
    const startUtc = new Date(dateRange.start + 'T00:00:00Z');
    const yearStartUtc = new Date(Date.UTC(startUtc.getUTCFullYear(), 0, 0));
    const diff = startUtc.getTime() - yearStartUtc.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }, [dateRange.start]);

  const probabilities = useMemo(() => {
    if (!weatherData || weatherData.length === 0) {
      return { rain: 0, temp: 0, wind: 0 };
    }

    // Prefer per-DOY probabilities embedded in the weather data for the selected start day
    const selected = weatherData.find(d => d.date === dateRange.start) || weatherData[0];
    const pmap = selected?.probabilities || {};

    // Map thresholds to the closest available probability key from the dataset
    // Rain thresholds in mm
    let rainProb = 0;
    if (thresholds.rain >= 50) rainProb = (pmap['extreme_rain_above_50mm'] || 0) * 100;
    else if (thresholds.rain >= 25) rainProb = (pmap['very_heavy_rain_above_25mm'] || 0) * 100;
    else if (thresholds.rain >= 10) rainProb = (pmap['heavy_rain_above_10mm'] || 0) * 100;
    else rainProb = (pmap['heavy_rain_above_10mm'] || 0) * 100;

    // Temp thresholds in °C
    let tempProb = 0;
    if (thresholds.hotTemp >= 40) tempProb = (pmap['extreme_heat_above_40C'] || 0) * 100;
    else if (thresholds.hotTemp >= 35) tempProb = (pmap['very_hot_above_35C'] || 0) * 100;
    else if (thresholds.hotTemp >= 30) tempProb = (pmap['hot_above_30C'] || 0) * 100;
    else tempProb = (pmap['hot_above_30C'] || 0) * 100;

    // Wind thresholds in km/h -> m/s keys in dataset (10,15,20 mps)
    const windMs = thresholds.wind / 3.6;
    let windProb = 0;
    if (windMs >= 20) windProb = (pmap['extreme_wind_above_20mps'] || 0) * 100;
    else if (windMs >= 15) windProb = (pmap['very_windy_above_15mps'] || 0) * 100;
    else if (windMs >= 10) windProb = (pmap['windy_above_10mps'] || 0) * 100;
    else windProb = (pmap['windy_above_10mps'] || 0) * 100;

    // Fallback: If all are zero and there is no probabilities map (older data), compute from the range as before
    if ((rainProb + tempProb + windProb) === 0 && Object.keys(pmap).length === 0) {
      const totalDays = weatherData.length;
      const rainDays = weatherData.filter(d => d.precipitation > thresholds.rain).length;
      const tempDays = weatherData.filter(d => d.maxTemp > thresholds.hotTemp).length;
      const windDays = weatherData.filter(d => d.windSpeed > windMs).length;
      return {
        rain: (rainDays / totalDays) * 100,
        temp: (tempDays / totalDays) * 100,
        wind: (windDays / totalDays) * 100,
      };
    }

    return { rain: rainProb, temp: tempProb, wind: windProb };
  }, [weatherData, thresholds, dateRange.start]);

  return (
    <Card title="Weather Probabilities" titleIcon={<AlertTriangleIcon className="w-5 h-5 text-yellow-400"/>}>
        <p className="text-sm text-slate-400 -mt-2 mb-4">Day of year: {dayOfYear}</p>
        <div className="divide-y divide-slate-700">
            <ProbabilityItem
                icon={<PrecipitationIcon className="w-8 h-8 text-cyan-400" />}
                title="Heavy Rain"
                condition={`> ${thresholds.rain}mm precipitation`}
                probability={probabilities.rain}
                color="blue"
                loading={loading}
            />
            <ProbabilityItem
                icon={<TempIcon className="w-8 h-8 text-red-400" />}
                title="Extreme Heat"
                condition={`> ${thresholds.hotTemp}°C temperature`}
                probability={probabilities.temp}
                color="red"
                loading={loading}
            />
            <ProbabilityItem
                icon={<WindIcon className="w-8 h-8 text-cyan-400" />}
                title="High Wind"
                condition={`> ${thresholds.wind} km/h wind speed`}
                probability={probabilities.wind}
                color="green"
                loading={loading}
            />
        </div>
    </Card>
  );
};
