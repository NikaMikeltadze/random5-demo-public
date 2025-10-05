import React, { useMemo } from 'react';
import type { WeatherDataPoint, Thresholds, ClimateStats } from '../types/newTypes';
import { Card } from './Card';
import { RainfallIcon, ThermometerIcon, CalendarDaysIcon } from './icons/WeatherIcons';

interface ClimateSummaryProps {
  weatherData: WeatherDataPoint[];
  thresholds: Thresholds;
  loading: boolean;
}

const SkeletonLoader = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-700 rounded-lg"></div>
        <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-slate-700 rounded-lg"></div>
            <div className="h-20 bg-slate-700 rounded-lg"></div>
        </div>
        <div className="h-24 bg-slate-700 rounded-lg"></div>
        <div className="h-24 bg-slate-700 rounded-lg"></div>
    </div>
);

export const ClimateSummary: React.FC<ClimateSummaryProps> = ({ weatherData, thresholds, loading }) => {

  const stats: ClimateStats | null = useMemo(() => {
    if (!weatherData || weatherData.length === 0) return null;

    const totalDays = weatherData.length;
    const totalPrecipitation = weatherData.reduce((sum, day) => sum + day.precipitation, 0);
    const totalAvgTemp = weatherData.reduce((sum, day) => sum + (day.maxTemp + day.minTemp) / 2, 0);
    const yearsInPeriod = Math.max(1, totalDays / 365.25);

    const monthlyData: { [key: string]: { temps: number[], precips: number[], count: number } } = {};
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    weatherData.forEach(day => {
        const month = new Date(day.date).getMonth();
        if (!monthlyData[month]) {
            monthlyData[month] = { temps: [], precips: [], count: 0 };
        }
        monthlyData[month].temps.push((day.maxTemp + day.minTemp) / 2);
        monthlyData[month].precips.push(day.precipitation);
        monthlyData[month].count++;
    });

    let wettest = { month: '', avg: -1 }, driest = { month: '', avg: Infinity }, hottest = { month: '', avg: -Infinity };

    Object.entries(monthlyData).forEach(([monthIdx, data]) => {
        const avgPrecip = data.precips.reduce((a, b) => a + b, 0) / data.count;
        const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.count;
        const monthName = monthNames[parseInt(monthIdx)];

        if (avgPrecip > wettest.avg) wettest = { month: monthName, avg: avgPrecip };
        if (avgPrecip < driest.avg) driest = { month: monthName, avg: avgPrecip };
        if (avgTemp > hottest.avg) hottest = { month: monthName, avg: avgTemp };
    });

    // Calculate expected annual extreme events from daily probabilities
    // Sum up the probabilities across all days in the period to get expected counts
    let heavyRainDays = 0;
    let extremeHeatDays = 0;
    let highWindDays = 0;
    
    weatherData.forEach(day => {
        if (day.probabilities) {
            // Use pre-calculated probabilities from NASA data
            heavyRainDays += day.probabilities['heavy_rain_above_10mm'] || 0;
            extremeHeatDays += day.probabilities['very_hot_above_35C'] || 0;
            highWindDays += day.probabilities['windy_above_10mps'] || 0;
        }
    });

    return {
        avgPrecipitation: totalPrecipitation / yearsInPeriod,
        avgTemperature: totalAvgTemp / totalDays,
        monthlyPatterns: {
            wettest: wettest.month,
            driest: driest.month,
            hottest: hottest.month
        },
        extremeEvents: { 
            heavyRainDays: heavyRainDays / yearsInPeriod, 
            extremeHeatDays: extremeHeatDays / yearsInPeriod, 
            highWindDays: highWindDays / yearsInPeriod,
        }
    };
  }, [weatherData, thresholds]);


  if (loading) {
      return <Card title="Climate Summary"><SkeletonLoader /></Card>;
  }
  
  if (!stats) {
    return <Card title="Climate Summary"><p>No data available for this period.</p></Card>;
  }

  return (
    <Card title="Climate Summary">
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-center text-blue-400 text-sm"><RainfallIcon className="w-5 h-5 mr-1"/> Annual Precipitation</div>
                    <div className="text-xl font-bold text-white">{stats.avgPrecipitation.toFixed(0)} mm</div>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-center text-red-400 text-sm"><ThermometerIcon className="w-5 h-5 mr-1"/> Avg Temperature</div>
                    <div className="text-xl font-bold text-white">{stats.avgTemperature.toFixed(1)}°C</div>
                </div>
            </div>
            
            <div className="bg-slate-700/50 p-3 rounded-lg text-sm">
                <h4 className="font-semibold text-white mb-2 text-center flex items-center justify-center">
                    <CalendarDaysIcon className="w-5 h-5 mr-2" />
                    Monthly Patterns
                </h4>
                <div className="flex justify-around text-center">
                    <div><span className="block text-slate-400">Wettest</span> <span className="font-bold text-blue-300">{stats.monthlyPatterns.wettest}</span></div>
                    <div><span className="block text-slate-400">Driest</span> <span className="font-bold text-yellow-500">{stats.monthlyPatterns.driest}</span></div>
                    <div><span className="block text-slate-400">Hottest</span> <span className="font-bold text-red-400">{stats.monthlyPatterns.hottest}</span></div>
                </div>
            </div>

            <div className="bg-slate-700/50 p-3 rounded-lg text-sm">
                <h4 className="font-semibold text-white mb-2">Average Annual Extreme Events</h4>
                <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                        <span>Heavy Rain Days (&gt;{thresholds.rain}mm)</span> 
                        <span className="font-mono font-bold text-white text-right">{stats.extremeEvents.heavyRainDays.toFixed(1)} days</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Extreme Heat Days (&gt;{thresholds.hotTemp}°C)</span> 
                        <span className="font-mono font-bold text-white text-right">{stats.extremeEvents.extremeHeatDays.toFixed(1)} days</span>
                    </div>
                    <div className="flex justify-between">
                        <span>High Wind Days (&gt;{thresholds.wind}km/h)</span> 
                        <span className="font-mono font-bold text-white text-right">{stats.extremeEvents.highWindDays.toFixed(1)} days</span>
                    </div>
                </div>
            </div>
        </div>
    </Card>
  );
};