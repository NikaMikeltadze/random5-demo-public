import React from 'react';
import type { Location, DateRange, WeatherDataPoint, Thresholds, QuickQuery } from '../types';
import { LocationSelector } from './LocationSelector';
import { DateRangePicker } from './DateRangePicker';
import { ClimateSummary } from './ClimateSummary';
import { WeatherProbabilities } from './WeatherProbabilities';
import { HourlyCarousel } from './HourlyCarousel';
import { HistoricalTrends } from './HistoricalTrends';
import { QuickQueries } from './QuickQueries';
import { DataDownloader } from './DataDownloader';
import { CurrentThresholds } from './CurrentThresholds';

interface DashboardProps {
  locations: Location[];
  selectedLocation: Location;
  onLocationChange: (location: Location) => void;
  dateRange: DateRange;
  onDateChange: (dateRange: DateRange) => void;
  weatherData: WeatherDataPoint[];
  thresholds: Thresholds;
  loading: boolean;
  error: string | null;
  quickQueries: QuickQuery[];
  onQuickQuery: (query: QuickQuery) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  locations,
  selectedLocation,
  onLocationChange,
  dateRange,
  onDateChange,
  weatherData,
  thresholds,
  loading,
  error,
  quickQueries,
  onQuickQuery,
}) => {
  return (
    <div className="space-y-6">
      <CurrentThresholds thresholds={thresholds} />

      <div className="grid grid-cols-1 gap-6">
        <LocationSelector
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={onLocationChange}
        />
        <DateRangePicker dateRange={dateRange} onDateChange={onDateChange} />
      </div>

      {error && <div className="text-red-500 bg-red-900/50 p-4 rounded-lg">{error}</div>}

      <WeatherProbabilities weatherData={weatherData} thresholds={thresholds} loading={loading} dateRange={dateRange} />

      <HourlyCarousel weatherData={weatherData} thresholds={thresholds} loading={loading} />

      <ClimateSummary weatherData={weatherData} thresholds={thresholds} loading={loading} />
      
      <HistoricalTrends weatherData={weatherData} loading={loading} thresholds={thresholds} />

      {/* FIX: Pass the correct `onQuickQuery` prop to the `onQueryClick` handler. The variable `onQueryClick` was not defined. */}
      <QuickQueries queries={quickQueries} onQueryClick={onQuickQuery} />

      <DataDownloader weatherData={weatherData} />
    </div>
  );
};