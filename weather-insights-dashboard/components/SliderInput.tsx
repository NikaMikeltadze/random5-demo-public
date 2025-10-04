import React from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}

const SliderInput: React.FC<SliderInputProps> = ({ label, value, onChange, min, max, step = 1, unit }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{label}</label>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
        />
        <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-md">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className="w-24 p-2 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-md dark:text-white"
          />
          <span className="pr-3 text-slate-500 dark:text-slate-400">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default SliderInput;
