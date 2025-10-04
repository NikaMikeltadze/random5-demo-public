import { Calendar } from 'lucide-react';
import { toDateInputValue, fromDateInputValue, formatDateForDisplay, CURRENT_YEAR } from '../utils/dateHelpers';
import { parse } from 'date-fns';

interface DatePickerProps {
  selectedDate: string; // MM-DD format
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const mmdd = fromDateInputValue(value);
      onDateChange(mmdd);
    }
  };

  const displayDate = parse(`${CURRENT_YEAR}-${selectedDate}`, 'yyyy-MM-dd', new Date());
  const displayText = formatDateForDisplay(displayDate);

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-nasa-blue flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        Select Date
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Choose Event Date
          </label>
          <input
            type="date"
            value={toDateInputValue(selectedDate)}
            onChange={handleDateChange}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white text-lg focus:outline-none focus:ring-2 focus:ring-nasa-blue"
          />
        </div>
        
        <div className="p-4 bg-gradient-to-r from-nasa-blue to-blue-600 rounded-lg text-center">
          <p className="text-sm text-blue-100 mb-1">Selected Date</p>
          <p className="text-2xl font-bold">{displayText}</p>
        </div>
      </div>
    </div>
  );
}
