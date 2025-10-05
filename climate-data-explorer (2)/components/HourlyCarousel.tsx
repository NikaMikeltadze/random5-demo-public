import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { WeatherDataPoint, Thresholds } from '../types';
import { Card } from './Card';

interface HourlyCarouselProps {
  weatherData: WeatherDataPoint[];
  thresholds: Thresholds;
  loading: boolean;
}

const CarouselSkeletonLoader = () => (
    <div className="animate-pulse">
        <div className="flex justify-between items-center mb-4">
            <div className="h-8 w-24 bg-slate-700 rounded-md"></div>
            <div className="h-6 w-32 bg-slate-700 rounded-md"></div>
            <div className="h-8 w-24 bg-slate-700 rounded-md"></div>
        </div>
        <div className="bg-slate-700 rounded-lg h-96 w-full"></div>
    </div>
);


export const HourlyCarousel: React.FC<HourlyCarouselProps> = ({ weatherData, thresholds, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when weather data changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [weatherData]);

  if (loading) {
      return <Card><CarouselSkeletonLoader /></Card>
  }

  if (!weatherData || weatherData.length === 0) {
    return <Card><p>No daily data available for carousel.</p></Card>;
  }

  // FIX: Add a guard to handle the race condition where currentIndex might be out of bounds
  // for a single render cycle after weatherData has shrunk, but before the useEffect resets the index.
  if (currentIndex >= weatherData.length) {
    // This is a temporary state, so rendering a loader or null is safe.
    // The useEffect will trigger a re-render with a valid index.
    return <Card><CarouselSkeletonLoader /></Card>;
  }

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? weatherData.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === weatherData.length - 1 ? 0 : prev + 1));
  };
  
  const currentDayData = weatherData[currentIndex];
  const hourlyData = currentDayData?.hourly || [];
  
  // FIX: Added timeZone: 'UTC' to prevent the date from shifting due to the user's local timezone.
  // FIX: Removed year from the display format.
  const formattedDate = new Date(currentDayData.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', timeZone: 'UTC'
  });

  return (
    <Card>
        <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrev} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">&lt; Prev Day</button>
            <h3 className="font-semibold text-lg text-white text-center">Showing: {formattedDate}</h3>
            <button onClick={handleNext} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">Next Day &gt;</button>
        </div>
        <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" tick={{ fill: '#94a3b8' }} fontSize={12} interval={2} />
                    <YAxis yAxisId="temp" dataKey="temp" tick={{ fill: '#fca5a5' }} fontSize={12} unit="°C" domain={[-20, 60]} />
                    <YAxis yAxisId="humidity" dataKey="humidity" orientation="right" tick={{ fill: '#a3e635' }} fontSize={12} unit="%" domain={[0, 100]}/>
                     <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f1f5f9' }}
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}`, name]}
                    />
                    <Legend wrapperStyle={{fontSize: "14px", paddingTop: "20px"}}/>
                    
                    {/* Threshold Lines */}
                    <ReferenceLine yAxisId="temp" y={thresholds.hotTemp} label={{ value: 'Hot', fill: '#ef4444', position: 'insideTopLeft' }} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine yAxisId="temp" y={thresholds.coldTemp} label={{ value: 'Cold', fill: '#60a5fa', position: 'insideBottomLeft' }} stroke="#60a5fa" strokeDasharray="3 3" />
                    <ReferenceLine yAxisId="temp" y={thresholds.wind} stroke="#22d3ee" strokeDasharray="3 3" label={{ value: 'Windy', fill: '#22d3ee', position: 'insideTopRight' }} />


                    <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line yAxisId="humidity" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#a3e635" strokeWidth={2} dot={false} />
                    <Line yAxisId="temp" type="monotone" dataKey="wind" name="Wind (km/h)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </Card>
  );
};