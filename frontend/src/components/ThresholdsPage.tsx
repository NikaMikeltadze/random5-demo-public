import React, { useState } from 'react';
import type { Thresholds } from '../types/newTypes';
import { Card } from './Card';
import { TempIcon, ColdTempIcon, WindIcon, PrecipitationIcon, HumidityIcon } from './icons/WeatherIcons';

interface ThresholdsPageProps {
  thresholds: Thresholds;
  onSave: (newThresholds: Thresholds) => void;
}

const ThresholdSlider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    unit: string;
    icon: React.ReactNode;
}> = ({ label, value, onChange, min, max, step, unit, icon }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <label className="flex items-center text-slate-300 md:col-span-1">
          {icon}
          <span className="ml-2">{label}</span>
        </label>
        <div className="md:col-span-2">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="flex items-center justify-end">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-20 bg-slate-900 text-white text-center rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="ml-2 text-slate-400 w-8">{unit}</span>
        </div>
    </div>
);

export const ThresholdsPage: React.FC<ThresholdsPageProps> = ({ thresholds, onSave }) => {
  const [currentThresholds, setCurrentThresholds] = useState<Thresholds>(thresholds);

  const handleSave = () => {
    onSave(currentThresholds);
  };

  return (
    <div className="max-w-4xl mx-auto">
        <Card title="Weather Threshold Settings">
            <div className="space-y-8">
                <ThresholdSlider
                    label="Very Hot Temperature"
                    icon={<TempIcon className="w-5 h-5 text-red-400" />}
                    value={currentThresholds.hotTemp}
                    onChange={(val) => setCurrentThresholds(t => ({...t, hotTemp: val}))}
                    min={20} max={50} step={1} unit="°C"
                />
                 <ThresholdSlider
                    label="Very Cold Temperature"
                    icon={<ColdTempIcon className="w-5 h-5 text-blue-300" />}
                    value={currentThresholds.coldTemp}
                    onChange={(val) => setCurrentThresholds(t => ({...t, coldTemp: val}))}
                    min={-20} max={15} step={1} unit="°C"
                />
                 <ThresholdSlider
                    label="Very Windy"
                    icon={<WindIcon className="w-5 h-5 text-cyan-400" />}
                    value={currentThresholds.wind}
                    onChange={(val) => setCurrentThresholds(t => ({...t, wind: val}))}
                    min={10} max={100} step={1} unit="km/h"
                />
                 <ThresholdSlider
                    label="Very Wet"
                    icon={<PrecipitationIcon className="w-5 h-5 text-blue-400" />}
                    value={currentThresholds.rain}
                    onChange={(val) => setCurrentThresholds(t => ({...t, rain: val}))}
                    min={1} max={50} step={1} unit="mm"
                />
                 <ThresholdSlider
                    label="Uncomfortable Humidity"
                    icon={<HumidityIcon className="w-5 h-5 text-lime-300" />}
                    value={currentThresholds.humidity}
                    onChange={(val) => setCurrentThresholds(t => ({...t, humidity: val}))}
                    min={50} max={100} step={1} unit="%"
                />
            </div>
            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                    Save Settings
                </button>
            </div>
        </Card>
    </div>
  );
};
