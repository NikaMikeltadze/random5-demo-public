
import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { WeatherDataPoint, Thresholds } from '../types/newTypes';
import { Card } from './Card';
import { loadDailyStatsWithCache, loadMonthlyForecast } from '../utils/dataLoader';
import type { WeatherData as NASAWeatherData, DayStats } from '../types/weather.types';

interface HistoricalTrendsProps {
  weatherData: WeatherDataPoint[];
  loading: boolean;
  thresholds: Thresholds;
  // Location id to load ML/climatology baselines (e.g., "tbilisi")
  locationId: string;
}

interface TrendChartProps {
    data: any[];
    title: string;
    dataKey: string;
    unit: string;
    stroke: string;
    thresholdLines?: { value: number; label: string; stroke: string }[];
    yDomain?: [number | 'auto', number | 'auto'];
    mlKey?: string; // optional baseline series key
    mlStroke?: string;
    forecastKey?: string; // optional forecast series key
    forecastStroke?: string;
    ciLowerKey?: string; // optional CI lower bound
    ciUpperKey?: string; // optional CI upper bound
    ciLowerStroke?: string; // distinct color for CI lower
    ciUpperStroke?: string; // distinct color for CI upper
}

const TrendChart: React.FC<TrendChartProps> = ({ data, title, dataKey, unit, stroke, thresholdLines, yDomain, mlKey, mlStroke, forecastKey, forecastStroke, ciLowerKey, ciUpperKey, ciLowerStroke, ciUpperStroke }) => (
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
                        formatter={(value: any) => (typeof value === 'number' ? `${value.toFixed(2)} ${unit}` : '—')}
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
                    <Line type="monotone" dataKey={dataKey} name="Actual (Selected)" stroke={stroke} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    {mlKey && (
                      <Line type="monotone" dataKey={mlKey} name="Climatology" stroke={mlStroke || '#9ca3af'} strokeOpacity={0.9} strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 3" />
                    )}
                    {forecastKey && (
                      <Line type="monotone" dataKey={forecastKey} name="Forecast (ML)" stroke={forecastStroke || '#a855f7'} strokeWidth={2} dot={false} strokeDasharray="6 2" />
                    )}
                    {ciUpperKey && (
                      <Line type="monotone" dataKey={ciUpperKey} name="Forecast CI" stroke={ciUpperStroke || '#c084fc'} strokeOpacity={0.7} strokeWidth={1} dot={false} />
                    )}
                    {ciLowerKey && (
                      <Line type="monotone" dataKey={ciLowerKey} name="Lower Forecast CI" stroke={ciLowerStroke || '#6d28d9'} strokeOpacity={0.7} strokeWidth={1} dot={false} />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({ weatherData, loading, thresholds, locationId }) => {
  // Load ML/climatology monthly baselines from processed dataset
  const [mlMonthly, setMlMonthly] = useState<null | {
    precipitation: number[];
    temperature: number[];
    windSpeed: number[];
    humidity: number[];
  }>(null);
  const [mlLoading, setMlLoading] = useState(false);
  // Load ML forecast (next 12 months) with CI
  const [forecast, setForecast] = useState<null | {
    months: string[];
    forecast: { precipitation?: number[]; temperature?: number[]; windSpeed?: number[]; humidity?: number[] };
    ci_lower?: { [k: string]: number[] };
    ci_upper?: { [k: string]: number[] };
  }>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMl() {
      try {
        if (!locationId) { setMlMonthly(null); return; }
        setMlLoading(true);
        const nasaData: NASAWeatherData = await loadDailyStatsWithCache(locationId);
        // helper to compute month index from DOY (1..366) using non-leap year baseline
        const doyToMonth = (doy: number) => {
          const base = new Date(Date.UTC(2001, 0, 1)); // 2001 non-leap
          const dt = new Date(base.getTime() + (doy - 1) * 24 * 3600 * 1000);
          return dt.getUTCMonth();
        };
        const mkAgg = () => Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
        const precipAgg = mkAgg();
        const tAgg = mkAgg();
        const windAgg = mkAgg();
        const rhAgg = mkAgg();

        const addVar = (vars?: Record<string, DayStats>, target?: { sum: number; count: number }[]) => {
          if (!vars || !target) return;
          for (const [doyStr, stat] of Object.entries(vars)) {
            const doy = parseInt(doyStr, 10);
            if (!Number.isFinite(stat?.mean)) continue;
            const m = doyToMonth(doy);
            target[m].sum += stat.mean;
            target[m].count += 1;
          }
        };

        // Always have precipitation
        addVar(nasaData.variables.PRECTOTCORR, precipAgg);
        // Temperature: prefer T2M_MAX else T2M
        if (nasaData.variables.T2M_MAX) addVar(nasaData.variables.T2M_MAX, tAgg);
        else if (nasaData.variables.T2M) addVar(nasaData.variables.T2M, tAgg);
        // Wind: prefer WS10M_MAX else WS10M else WS2M
        if (nasaData.variables.WS10M_MAX) addVar(nasaData.variables.WS10M_MAX, windAgg);
        else if (nasaData.variables.WS10M) addVar(nasaData.variables.WS10M, windAgg);
        else if (nasaData.variables.WS2M) addVar(nasaData.variables.WS2M, windAgg);
        // Humidity: RH2M if present; proxy computed later if missing
        if (nasaData.variables.RH2M) addVar(nasaData.variables.RH2M, rhAgg);

        const safeAvg = (x: { sum: number; count: number }) => (x.count > 0 ? x.sum / x.count : undefined as number | undefined);

        const precipitation = precipAgg.map(safeAvg);
        const temperature = tAgg.map(safeAvg);
        const windSpeed = windAgg.map(x => {
          const v = safeAvg(x);
          return typeof v === 'number' ? v * 3.6 : undefined; // m/s -> km/h
        });
        // If RH2M missing, use calibrated monthly climatology baseline
        const humidity = rhAgg.map(x => {
          const v = safeAvg(x);
          if (typeof v === 'number') return Math.max(0, Math.min(100, v));
          return undefined;
        });

        if (!nasaData.variables.RH2M) {
          // Monthly baseline for Georgian climate (Jan-Dec)
          // Based on typical Black Sea/Caucasus humidity patterns
          const climatologyBaseline = [66, 64, 60, 57, 60, 63, 65, 65, 64, 63, 65, 67];
          
          for (let m = 0; m < 12; m++) {
            const p = precipitation[m];
            const t = temperature[m];
            
            if (typeof p === 'number' && typeof t === 'number') {
              // Start with climatology baseline
              const baseline = climatologyBaseline[m];
              
              // Adjust for precipitation anomaly (compared to expected 2-3mm/day)
              const rainAnomaly = p - 2.5; // mm/day deviation
              const rainAdjust = Math.max(-10, Math.min(15, rainAnomaly * 3)); // ±10-15%
              
              // Adjust for temperature anomaly (compared to 15°C baseline)
              const tempAnomaly = t - 15;
              const tempAdjust = Math.max(-12, Math.min(8, -tempAnomaly * 0.6)); // Hot = drier
              
              // Combine adjustments with bounds
              humidity[m] = Math.max(25, Math.min(90, baseline + rainAdjust + tempAdjust));
            }
          }
        }

        if (!cancelled) setMlMonthly({
          precipitation: precipitation.map(v => (typeof v === 'number' ? v : 0)),
          temperature: temperature.map(v => (typeof v === 'number' ? v : 0)),
          windSpeed: windSpeed.map(v => (typeof v === 'number' ? v : 0)),
          humidity: humidity.map(v => (typeof v === 'number' ? v : 0)),
        });
      } catch (e) {
        if (!cancelled) setMlMonthly(null);
      } finally {
        if (!cancelled) setMlLoading(false);
      }
    }
    loadMl();
    return () => { cancelled = true; };
  }, [locationId]);

  // Load forecast JSON for location
  useEffect(() => {
    let cancelled = false;
    async function loadFc() {
      try {
        if (!locationId) { setForecast(null); return; }
        setForecastLoading(true);
        const fc = await loadMonthlyForecast(locationId);
        if (!cancelled) setForecast(fc);
      } catch (e) {
        if (!cancelled) setForecast(null);
      } finally {
        if (!cancelled) setForecastLoading(false);
      }
    }
    loadFc();
    return () => { cancelled = true; };
  }, [locationId]);

  // Selected-period monthly aggregates
  const memoizedData = useMemo(() => {
    if (!weatherData || weatherData.length === 0) return null;

    const monthlyAggregates: { [key: string]: { precips: number[], temps: number[], winds: number[], humidities: number[], count: number } } = {};
    const hasData: boolean[] = Array.from({ length: 12 }, () => false);
    
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
      hasData[monthIndex] = true;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const processedMonthlyData = monthNames.map((month, index) => {
        const data = monthlyAggregates[index];
        if(!data) return { month, precipitation: null as any, temperature: null as any, windSpeed: null as any, humidity: null as any } as any;
        return {
            month,
            precipitation: data.precips.reduce((a,b) => a+b, 0) / data.count,
            temperature: data.temps.reduce((a,b) => a+b, 0) / data.count,
            windSpeed: data.winds.reduce((a,b) => a+b, 0) / data.count,
            humidity: data.humidities.reduce((a,b) => a+b, 0) / data.count,
        }
    });
    
    const tempValues = processedMonthlyData
      .map(d => d.temperature)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const minTemp = tempValues.length > 0 ? Math.min(...tempValues) : 0;

    const calculatedDomains = {
        precipitation: [0, 30] as [number, number],
        temperature: [Math.floor(minTemp * 0.9), 60] as [number, number],
        windSpeed: [0, 75] as [number, number],
        humidity: [0, 100] as [number, number]
    };

    return { monthlyData: processedMonthlyData, domains: calculatedDomains, hasData };

  }, [weatherData]);

  if (loading || mlLoading) {
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

  // Merge ML baseline into chart rows
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Map forecast arrays (which are month-abbrev ordered) to month indices 0..11
  const fcMap: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const fcByIndex = (key: 'precipitation'|'temperature'|'windSpeed'|'humidity') => {
    if (!forecast || !forecast.forecast || !forecast.forecast[key]) return Array(12).fill(undefined);
    const arr = forecast.forecast[key]!;
    const months = (forecast.months || []).map(m => (m || '').slice(0,3));
    const out: (number|undefined)[] = Array(12).fill(undefined);
    months.forEach((m, idx) => { const mi = fcMap[m as keyof typeof fcMap]; if (mi !== undefined) out[mi] = arr[idx]; });
    return out;
  };
  const fcLowerByIndex = (key: 'precipitation'|'temperature'|'windSpeed'|'humidity') => {
    if (!forecast || !forecast.ci_lower || !forecast.ci_lower[key]) return Array(12).fill(undefined);
    const arr = forecast.ci_lower[key]!;
    const months = (forecast.months || []).map(m => (m || '').slice(0,3));
    const out: (number|undefined)[] = Array(12).fill(undefined);
    months.forEach((m, idx) => { const mi = fcMap[m as keyof typeof fcMap]; if (mi !== undefined) out[mi] = arr[idx]; });
    return out;
  };
  const fcUpperByIndex = (key: 'precipitation'|'temperature'|'windSpeed'|'humidity') => {
    if (!forecast || !forecast.ci_upper || !forecast.ci_upper[key]) return Array(12).fill(undefined);
    const arr = forecast.ci_upper[key]!;
    const months = (forecast.months || []).map(m => (m || '').slice(0,3));
    const out: (number|undefined)[] = Array(12).fill(undefined);
    months.forEach((m, idx) => { const mi = fcMap[m as keyof typeof fcMap]; if (mi !== undefined) out[mi] = arr[idx]; });
    return out;
  };

  const withMl = memoizedData.monthlyData.map((row, i) => ({
    ...row,
    precipitation_ml: mlMonthly ? mlMonthly.precipitation[i] ?? null : undefined,
    temperature_ml: mlMonthly ? mlMonthly.temperature[i] ?? null : undefined,
    windSpeed_ml: mlMonthly ? mlMonthly.windSpeed[i] ?? null : undefined,
    humidity_ml: mlMonthly ? mlMonthly.humidity[i] ?? null : undefined,
    // Forecasts
    precipitation_fc: forecast ? fcByIndex('precipitation')[i] ?? null : undefined,
    temperature_fc: forecast ? fcByIndex('temperature')[i] ?? null : undefined,
    windSpeed_fc: forecast ? fcByIndex('windSpeed')[i] ?? null : undefined,
    humidity_fc: forecast ? fcByIndex('humidity')[i] ?? null : undefined,
    precipitation_ci_lower: forecast ? fcLowerByIndex('precipitation')[i] ?? null : undefined,
    precipitation_ci_upper: forecast ? fcUpperByIndex('precipitation')[i] ?? null : undefined,
    temperature_ci_lower: forecast ? fcLowerByIndex('temperature')[i] ?? null : undefined,
    temperature_ci_upper: forecast ? fcUpperByIndex('temperature')[i] ?? null : undefined,
    windSpeed_ci_lower: forecast ? fcLowerByIndex('windSpeed')[i] ?? null : undefined,
    windSpeed_ci_upper: forecast ? fcUpperByIndex('windSpeed')[i] ?? null : undefined,
    humidity_ci_lower: forecast ? fcLowerByIndex('humidity')[i] ?? null : undefined,
    humidity_ci_upper: forecast ? fcUpperByIndex('humidity')[i] ?? null : undefined,
    month: monthNames[i] || row.month,
  }));

  return (
    <Card title="Historical Trends (Monthly Averages)">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <TrendChart 
                data={withMl} 
                title="Precipitation" 
                dataKey="precipitation" 
                unit="mm" 
                stroke="#3b82f6"
                thresholdLines={[{ value: thresholds.rain, label: 'Wet', stroke: '#60a5fa'}]}
                yDomain={memoizedData.domains.precipitation}
                mlKey={mlMonthly ? 'precipitation_ml' : undefined}
                mlStroke="#9ca3af"
                forecastKey={forecast ? 'precipitation_fc' : undefined}
                forecastStroke="#a855f7"
                ciLowerKey={forecast ? 'precipitation_ci_lower' : undefined}
                ciUpperKey={forecast ? 'precipitation_ci_upper' : undefined}
                ciUpperStroke="#c084fc"
                ciLowerStroke="#6d28d9"
            />
            <TrendChart 
                data={withMl} 
                title="Maximum Temperature" 
                dataKey="temperature" 
                unit="°C" 
                stroke="#ef4444"
                thresholdLines={[
                    { value: thresholds.hotTemp, label: 'Hot', stroke: '#f87171'},
                    { value: thresholds.coldTemp, label: 'Cold', stroke: '#93c5fd'},
                ]}
                yDomain={memoizedData.domains.temperature}
                mlKey={mlMonthly ? 'temperature_ml' : undefined}
                mlStroke="#9ca3af"
                forecastKey={forecast ? 'temperature_fc' : undefined}
                forecastStroke="#a855f7"
                ciLowerKey={forecast ? 'temperature_ci_lower' : undefined}
                ciUpperKey={forecast ? 'temperature_ci_upper' : undefined}
                ciUpperStroke="#c084fc"
                ciLowerStroke="#6d28d9"
            />
            <TrendChart 
                data={withMl} 
                title="Wind Speed" 
                dataKey="windSpeed" 
                unit="km/h" 
                stroke="#22d3ee"
                thresholdLines={[{ value: thresholds.wind, label: 'Windy', stroke: '#67e8f9'}]}
                yDomain={memoizedData.domains.windSpeed}
                mlKey={mlMonthly ? 'windSpeed_ml' : undefined}
                mlStroke="#9ca3af"
                forecastKey={forecast ? 'windSpeed_fc' : undefined}
                forecastStroke="#a855f7"
                ciLowerKey={forecast ? 'windSpeed_ci_lower' : undefined}
                ciUpperKey={forecast ? 'windSpeed_ci_upper' : undefined}
                ciUpperStroke="#c084fc"
                ciLowerStroke="#6d28d9"
            />
            <TrendChart 
                data={withMl} 
                title="Humidity" 
                dataKey="humidity" 
                unit="%" 
                stroke="#a3e635"
                thresholdLines={[{ value: thresholds.humidity, label: 'Humid', stroke: '#bef264'}]}
                yDomain={memoizedData.domains.humidity}
                mlKey={mlMonthly ? 'humidity_ml' : undefined}
                mlStroke="#9ca3af"
                forecastKey={forecast ? 'humidity_fc' : undefined}
                forecastStroke="#a855f7"
                ciLowerKey={forecast ? 'humidity_ci_lower' : undefined}
                ciUpperKey={forecast ? 'humidity_ci_upper' : undefined}
            />
        </div>
    </Card>
  );
};
