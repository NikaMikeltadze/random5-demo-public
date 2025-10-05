
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { WeatherDataPoint, Thresholds } from '../types/newTypes';
import { Card } from './Card';

interface HistoricalTrendsProps {
  weatherData: WeatherDataPoint[];
  loading: boolean;
  thresholds: Thresholds;
}

interface TrendChartProps {
    data: any[];
    title: string;
    dataKey: string;
    unit: string;
    stroke: string;
    thresholdLines?: { value: number; label: string; stroke: string }[];
    yDomain?: [number | 'auto', number | 'auto'];
}

const TrendChart: React.FC<TrendChartProps> = ({ data, title, dataKey, unit, stroke, thresholdLines, yDomain }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg">
        <h3 className="text-md font-semibold text-white mb-4">{title} Trend</h3>
        <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} fontSize={12} />
                    <YAxis tick={{ fill: '#94a3b8' }} fontSize={12} tickFormatter={(value) => value.toFixed(1)} domain={yDomain} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1' }}
                        labelStyle={{ color: '#f1f5f9' }}
                        formatter={(value: number) => `${value.toFixed(2)} ${unit}`}
                    />
                    <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} verticalAlign="top" align="right" />
                    {thresholdLines?.map(line => (
                        <ReferenceLine 
                            key={line.label} 
                            y={line.value} 
                            label={{ value: line.label, fill: line.stroke, position: 'insideTopLeft', fontSize: 10, dy: -5 }} 
                            stroke={line.stroke} 
                            strokeDasharray="4 4" 
                        />
                    ))}
                    <Line type="monotone" dataKey={dataKey} name="Actual" stroke={stroke} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({ weatherData, loading, thresholds }) => {
  // FIX: Refactored useMemo to return null for the empty state.
  // This allows for a simple null check that correctly narrows the type for the memoizedData object,
  // resolving TypeScript errors when accessing the `domains` property.
  const memoizedData = useMemo(() => {
    if (!weatherData || weatherData.length === 0) return null;

    const monthlyAggregates: { [key: string]: { precips: number[], temps: number[], winds: number[], humidities: number[], count: number } } = {};
    
    weatherData.forEach(day => {
      // Use UTC to prevent local timezone from shifting the date into adjacent months
      const d = new Date(day.date + 'T00:00:00Z');
      const monthIndex = d.getUTCMonth();
      if (!monthlyAggregates[monthIndex]) {
        monthlyAggregates[monthIndex] = { precips: [], temps: [], winds: [], humidities: [], count: 0 };
      }
      monthlyAggregates[monthIndex].precips.push(day.precipitation);
      monthlyAggregates[monthIndex].temps.push(day.maxTemp);
      monthlyAggregates[monthIndex].winds.push(day.windSpeed * 3.6); // Convert m/s to km/h
      monthlyAggregates[monthIndex].humidities.push(day.humidity);
      monthlyAggregates[monthIndex].count++;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const processedMonthlyData = monthNames.map((month, index) => {
        const data = monthlyAggregates[index];
        if(!data) return { month, precipitation: 0, temperature: 0, windSpeed: 0, humidity: 0 };
        return {
            month,
            precipitation: data.precips.reduce((a,b) => a+b, 0) / data.count,
            temperature: data.temps.reduce((a,b) => a+b, 0) / data.count,
            windSpeed: data.winds.reduce((a,b) => a+b, 0) / data.count,
            humidity: data.humidities.reduce((a,b) => a+b, 0) / data.count,
        }
    });
    
    const tempValues = processedMonthlyData.map(d => d.temperature);
    const minTemp = tempValues.length > 0 ? Math.min(...tempValues) : 0;

    const calculatedDomains = {
        precipitation: [0, 30] as [number, number],
        temperature: [Math.floor(minTemp * 0.9), 60] as [number, number],
        windSpeed: [0, 75] as [number, number],
        humidity: [0, 100] as [number, number]
    };

    return { monthlyData: processedMonthlyData, domains: calculatedDomains };

  }, [weatherData]);

  if (loading) {
    return (
        <Card title="Historical Trends (Monthly Averages)">
            <div className="animate-pulse bg-slate-700 rounded-lg h-96 w-full mt-4"></div>
        </Card>
    );
  }

  if (!memoizedData) {
    return (
      <Card title="Historical Trends (Monthly Averages)">
        <p className="text-center text-slate-400 p-4">No data available to display trends for the selected period.</p>
      </Card>
    );
  }

  return (
    <Card title="Historical Trends (Monthly Averages)">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <TrendChart 
                data={memoizedData.monthlyData} 
                title="Precipitation" 
                dataKey="precipitation" 
                unit="mm" 
                stroke="#3b82f6"
                thresholdLines={[{ value: thresholds.rain, label: 'Wet', stroke: '#60a5fa'}]}
                yDomain={memoizedData.domains.precipitation}
            />
            <TrendChart 
                data={memoizedData.monthlyData} 
                title="Maximum Temperature" 
                dataKey="temperature" 
                unit="°C" 
                stroke="#ef4444"
                thresholdLines={[
                    { value: thresholds.hotTemp, label: 'Hot', stroke: '#f87171'},
                    { value: thresholds.coldTemp, label: 'Cold', stroke: '#93c5fd'},
                ]}
                yDomain={memoizedData.domains.temperature}
            />
            <TrendChart 
                data={memoizedData.monthlyData} 
                title="Wind Speed" 
                dataKey="windSpeed" 
                unit="km/h" 
                stroke="#22d3ee"
                thresholdLines={[{ value: thresholds.wind, label: 'Windy', stroke: '#67e8f9'}]}
                yDomain={memoizedData.domains.windSpeed}
            />
            <TrendChart 
                data={memoizedData.monthlyData} 
                title="Humidity" 
                dataKey="humidity" 
                unit="%" 
                stroke="#a3e635"
                thresholdLines={[{ value: thresholds.humidity, label: 'Humid', stroke: '#bef264'}]}
                yDomain={memoizedData.domains.humidity}
            />
        </div>
    </Card>
  );
};
