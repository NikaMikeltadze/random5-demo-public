import React from 'react';
import type { WeatherDataPoint } from '../types/newTypes';
import { Card } from './Card';
import { DownloadIcon } from './icons/WeatherIcons';

interface DataDownloaderProps {
  weatherData: WeatherDataPoint[];
}

export const DataDownloader: React.FC<DataDownloaderProps> = ({ weatherData }) => {
  const handleExport = () => {
    if (weatherData.length === 0) {
      alert('No data to export.');
      return;
    }
    const header = 'Date,Max Temp (°C),Min Temp (°C),Precipitation (mm),Wind Speed (m/s),Humidity (%)\n';
    const csvContent = weatherData.map(d => 
      `${d.date},${d.maxTemp.toFixed(2)},${d.minTemp.toFixed(2)},${d.precipitation.toFixed(2)},${d.windSpeed.toFixed(2)},${d.humidity.toFixed(2)}`
    ).join('\n');

    const csv = header + csvContent;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'climate_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card title="NASA POWER Data Attribution">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="space-y-2 text-sm text-slate-400">
                <p><span className="font-semibold text-slate-300">Dataset:</span> NASA POWER</p>
                <p><span className="font-semibold text-slate-300">Citation:</span> NASA/POWER CERES/MERRA2 Native Resolution Daily and Hourly Data. Derived from satellite and model reanalysis data</p>
                <p><span className="font-semibold text-slate-300">URL:</span> <a href="https://power.larc.nasa.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://power.larc.nasa.gov/</a></p>
                <p><span className="font-semibold text-slate-300">License:</span> Creative Commons Attribution 4.0 International</p>
            </div>
            <button
                onClick={handleExport}
                className="mt-4 md:mt-0 flex-shrink-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Export to CSV
            </button>
        </div>
    </Card>
  );
};
