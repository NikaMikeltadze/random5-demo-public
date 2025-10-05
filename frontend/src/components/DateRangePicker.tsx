import React, { useState, useEffect } from 'react';
import type { DateRange } from '../types/newTypes';
import { Card } from './Card';
import { CalendarIcon } from './icons/WeatherIcons';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateChange: (dateRange: DateRange) => void;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ dateRange, onDateChange }) => {
  
  const startDate = new Date(dateRange.start + 'T00:00:00');
  const endDate = new Date(dateRange.end + 'T00:00:00');

  const [startDayStr, setStartDayStr] = useState(startDate.getUTCDate().toString());
  const [endDayStr, setEndDayStr] = useState(endDate.getUTCDate().toString());

  useEffect(() => {
      setStartDayStr(startDate.getUTCDate().toString());
  }, [dateRange.start]);

  useEffect(() => {
      setEndDayStr(endDate.getUTCDate().toString());
  }, [dateRange.end]);

  const handleInputChange = (part: 'sm' | 'sd' | 'em' | 'ed', value: number) => {
    if (isNaN(value)) return;

    let sMonth = startDate.getUTCMonth();
    let sDay = startDate.getUTCDate();
    let eMonth = endDate.getUTCMonth();
    let eDay = endDate.getUTCDate();
    
    switch(part) {
        case 'sm': sMonth = value ; break;
        case 'sd': sDay = value; break;
        case 'em': eMonth = value ; break;
        case 'ed': eDay = value; break;
    }
    
    // Use the current year as the anchor for the end date's year.
   
    const startYear = 2000;

    const newStartDate = new Date(Date.UTC(startYear, sMonth, sDay));
    const newEndDate = new Date(Date.UTC(startYear, eMonth, eDay));

    const newStart = newStartDate.toISOString().split('T')[0];
    const newEnd = newEndDate.toISOString().split('T')[0];
    
    onDateChange({ start: newStart, end: newEnd });
  };

  const handleDayInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
      const val = e.target.value;
      if (/^\d{0,2}$/.test(val)) {
          if (type === 'start') {
              setStartDayStr(val);
          } else {
              setEndDayStr(val);
          }
          const numVal = parseInt(val, 10);
          if (!isNaN(numVal) && numVal > 0 && numVal <= 31) {
              handleInputChange(type === 'start' ? 'sd' : 'ed', numVal);
          }
      }
  };


  const formattedStart = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const formattedEnd = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

  return (
    <Card title="Select Date Period" titleIcon={<CalendarIcon className="w-5 h-5" />}>
      <div className="flex flex-col justify-center space-y-4 lg:space-y-0 lg:flex-row lg:items-end lg:space-x-4 flex-grow">
        <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
            <div className="flex space-x-2">
            <select
                value={startDate.getUTCMonth() + 1}
                onChange={(e) => handleInputChange('sm', parseInt(e.target.value))}
                className="w-2/3 p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
                ))}
            </select>
            <input
                type="text"
                inputMode="numeric"
                value={startDayStr}
                onChange={(e) => handleDayInputChange(e, 'start')}
                placeholder="Day"
                className="w-1/3 p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
            />
            </div>
        </div>
        
        <div className="flex-1">
            <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
            <div className="flex space-x-2">
            <select
                value={endDate.getUTCMonth() + 1}
                onChange={(e) => handleInputChange('em', parseInt(e.target.value))}
                className="w-2/3 p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
                ))}
            </select>
            <input
                type="text"
                inputMode="numeric"
                value={endDayStr}
                onChange={(e) => handleDayInputChange(e, 'end')}
                placeholder="Day"
                className="w-1/3 p-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
            />
            </div>
        </div>
      </div>
      <div className="text-center text-sm text-slate-400 mt-auto pt-6">
          <p>Showing Data For:</p>
          <p className="font-semibold text-slate-300">
            {formattedStart} – {formattedEnd}
          </p>
      </div>
    </Card>
  );
};