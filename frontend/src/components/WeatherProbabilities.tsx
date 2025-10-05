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
    if(!dateRange.start) return 0;
    // Use the start of the range to determine the day of the year
    const start = new Date(dateRange.start + 'T00:00:00');
    const yearStart = new Date(start.getFullYear(), 0, 0);
    const diff = start.getTime() - yearStart.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }, [dateRange]);

  const probabilities = useMemo(() => {
    if (!weatherData || weatherData.length === 0) {
      return { rain: 0, temp: 0, wind: 0 };
    }
    const totalDays = weatherData.length;
    const rainDays = weatherData.filter(d => d.precipitation > thresholds.rain).length;
    const tempDays = weatherData.filter(d => d.maxTemp > thresholds.hotTemp).length;
    // Convert threshold from km/h to m/s for comparison with data
    const windThresholdMS = thresholds.wind / 3.6;
    const windDays = weatherData.filter(d => d.windSpeed > windThresholdMS).length;
    
    return {
      rain: (rainDays / totalDays) * 100,
      temp: (tempDays / totalDays) * 100,
      wind: (windDays / totalDays) * 100,
    };
  }, [weatherData, thresholds]);

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
