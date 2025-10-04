import { Droplets, Thermometer, Calendar } from 'lucide-react';
import type { LocationInfo } from '../types/weather.types';

interface StatsCardProps {
  location: LocationInfo;
}

export default function StatsCard({ location }: StatsCardProps) {
  const { climate_summary, extreme_event_annual_probabilities } = location;

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-nasa-blue">Climate Summary</h2>
      
      <div className="space-y-4">
        {/* Annual Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Droplets className="w-5 h-5" />
              <span className="text-sm font-medium">Annual Precipitation</span>
            </div>
            <p className="text-2xl font-bold">{climate_summary.annual_precipitation_mm.toFixed(0)} mm</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Thermometer className="w-5 h-5" />
              <span className="text-sm font-medium">Avg Temperature</span>
            </div>
            <p className="text-2xl font-bold">{climate_summary.avg_annual_temp_c.toFixed(1)}°C</p>
          </div>
        </div>

        {/* Monthly Extremes */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400 mb-3">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Monthly Patterns</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400">Wettest</p>
              <p className="font-semibold text-blue-300">{climate_summary.wettest_month}</p>
            </div>
            <div>
              <p className="text-gray-400">Driest</p>
              <p className="font-semibold text-orange-300">{climate_summary.driest_month}</p>
            </div>
            <div>
              <p className="text-gray-400">Hottest</p>
              <p className="font-semibold text-red-300">{climate_summary.hottest_month}</p>
            </div>
          </div>
        </div>

        {/* Annual Event Probabilities */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Average Annual Extreme Events</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Heavy Rain Days (&gt;10mm)</span>
              <span className="font-semibold">{extreme_event_annual_probabilities.heavy_rain_days.toFixed(1)} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Extreme Heat Days (&gt;35°C)</span>
              <span className="font-semibold">{extreme_event_annual_probabilities.extreme_heat_days.toFixed(1)} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">High Wind Days (&gt;10m/s)</span>
              <span className="font-semibold">{extreme_event_annual_probabilities.high_wind_days.toFixed(1)} days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
