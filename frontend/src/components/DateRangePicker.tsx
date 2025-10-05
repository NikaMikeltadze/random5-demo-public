import React, { useState, useEffect } from 'react';
import type { DateRange } from '../types/newTypes';
import { Card } from './Card';
import { CalendarIcon } from './icons/WeatherIcons';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateChange: (dateRange: DateRange) => void;
}

// Simplified manual date inputs without automatic adjustments or pickers
export const DateRangePicker: React.FC<DateRangePickerProps> = ({ dateRange, onDateChange }) => {
  const [startStr, setStartStr] = useState(dateRange.start);
  const [endStr, setEndStr] = useState(dateRange.end);

  useEffect(() => {
    setStartStr(dateRange.start);
  }, [dateRange.start]);

  useEffect(() => {
    setEndStr(dateRange.end);
  }, [dateRange.end]);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setStartStr(v);
    if (dateRegex.test(v)) {
      onDateChange({ start: v, end: endStr });
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEndStr(v);
    if (dateRegex.test(v)) {
      onDateChange({ start: startStr, end: v });
    }
  };

  return (
    <Card title="Select Date Period" titleIcon={<CalendarIcon className="w-5 h-5" />}>
      <div className="flex flex-col justify-center space-y-4 lg:space-y-0 lg:flex-row lg:items-end lg:space-x-4 flex-grow">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
          <input
            type="date"
            value={startStr}
            onChange={handleStartChange}
            placeholder="YYYY-MM-DD"
            className="w-full p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
          <input
            type="date"
            value={endStr}
            onChange={handleEndChange}
            placeholder="YYYY-MM-DD"
            className="w-full p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="text-center text-sm text-slate-400 mt-auto pt-6">
        <p>Showing Data For:</p>
        <p className="font-semibold text-slate-300">
          {startStr || dateRange.start} – {endStr || dateRange.end}
        </p>
      </div>
    </Card>
  );
};