import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Thresholds } from '../types';
import SliderInput from '../components/SliderInput';

const ThresholdsPage: React.FC = () => {
  const { thresholds, setThresholds } = useAppStore();
  const [localThresholds, setLocalThresholds] = useState<Thresholds>(thresholds);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  const handleSave = () => {
    setThresholds(localThresholds);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const updateThreshold = <K extends keyof Thresholds,>(key: K, value: Thresholds[K]) => {
    setLocalThresholds(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Weather Threshold Settings</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 space-y-8">
        
        <SliderInput 
          label="Very Hot Temperature"
          value={localThresholds.tempHot}
          onChange={(val) => updateThreshold('tempHot', val)}
          min={20} max={50} unit="°C"
        />

        <SliderInput 
          label="Very Cold Temperature"
          value={localThresholds.tempCold}
          onChange={(val) => updateThreshold('tempCold', val)}
          min={-20} max={15} unit="°C"
        />

        <SliderInput 
          label="Very Windy"
          value={localThresholds.windSpeed}
          onChange={(val) => updateThreshold('windSpeed', val)}
          min={0} max={150} unit="km/h"
        />
        
        <SliderInput 
          label="Very Wet"
          value={localThresholds.rainfall}
          onChange={(val) => updateThreshold('rainfall', val)}
          min={0} max={50} unit="mm/hr"
        />

        <SliderInput 
          label="Very Uncomfortable Humidity"
          value={localThresholds.humidity}
          onChange={(val) => updateThreshold('humidity', val)}
          min={0} max={100} unit="%"
        />

        <div className="flex justify-end items-center pt-4">
          {saveStatus === 'success' && (
            <span className="text-green-500 mr-4 transition-opacity duration-300">Settings saved!</span>
          )}
          <button 
            onClick={handleSave}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThresholdsPage;
