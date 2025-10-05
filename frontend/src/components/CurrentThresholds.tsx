import React from 'react';
import type { Thresholds } from '../types/newTypes';
import { Card } from './Card';
import { TempIcon, ColdTempIcon, WindIcon, PrecipitationIcon, HumidityIcon } from './icons/WeatherIcons';

interface CurrentThresholdsProps {
  thresholds: Thresholds;
}

const ThresholdDisplay: React.FC<{ icon: React.ReactNode; label: string; value: string; colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className="flex items-center space-x-2">
        {icon}
        <span className="text-slate-400">{label}:</span>
        <span className={`font-bold ${colorClass}`}>{value}</span>
    </div>
);

export const CurrentThresholds: React.FC<CurrentThresholdsProps> = ({ thresholds }) => {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h3 className="text-lg font-semibold text-white">Current Thresholds</h3>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <ThresholdDisplay icon={<TempIcon className="w-5 h-5 text-red-400" />} label="Hot" value={`${thresholds.hotTemp}°C`} colorClass="text-red-400" />
            <ThresholdDisplay icon={<ColdTempIcon className="w-5 h-5 text-blue-300" />} label="Cold" value={`${thresholds.coldTemp}°C`} colorClass="text-blue-300" />
            <ThresholdDisplay icon={<WindIcon className="w-5 h-5 text-cyan-400" />} label="Windy" value={`${thresholds.wind} km/h`} colorClass="text-cyan-400" />
            <ThresholdDisplay icon={<PrecipitationIcon className="w-5 h-5 text-blue-400" />} label="Rainfall" value={`${thresholds.rain} mm`} colorClass="text-blue-400" />
            <ThresholdDisplay icon={<HumidityIcon className="w-5 h-5 text-lime-300" />} label="Humidity" value={`${thresholds.humidity}%`} colorClass="text-lime-300" />
        </div>
      </div>
    </Card>
  );
};