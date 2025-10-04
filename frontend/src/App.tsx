import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import LocationSelector from './components/LocationSelector';
import DatePicker from './components/DatePicker';
import ProbabilityDisplay from './components/ProbabilityDisplay';
import TrendChart from './components/TrendChart';
import StatsCard from './components/StatsCard';
import ExportButton from './components/ExportButton';
import { 
  loadAllLocationsSummary, 
  loadDailyStatsWithCache,
  loadPresetQueries 
} from './utils/dataLoader';
import { dateToDayOfYear } from './utils/dateHelpers';
import type { 
  AllLocationsSummary, 
  WeatherData, 
  PresetQuery 
} from './types/weather.types';

function App() {
  const [summary, setSummary] = useState<AllLocationsSummary | null>(null);
  const [presetQueries, setPresetQueries] = useState<PresetQuery[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('tbilisi');
  const [selectedDate, setSelectedDate] = useState('10-10'); // MM-DD format
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load summary data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [summaryData, queriesData] = await Promise.all([
          loadAllLocationsSummary(),
          loadPresetQueries()
        ]);
        setSummary(summaryData);
        setPresetQueries(queriesData);
      } catch (err) {
        setError('Failed to load initial data');
        console.error(err);
      }
    };
    loadInitialData();
  }, []);

  // Load weather data when location changes
  useEffect(() => {
    const loadWeatherData = async () => {
      if (!selectedLocation) return;
      
      setLoading(true);
      setError(null);
      try {
        const data = await loadDailyStatsWithCache(selectedLocation);
        setWeatherData(data);
      } catch (err) {
        setError(`Failed to load weather data for ${selectedLocation}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadWeatherData();
  }, [selectedLocation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return; // Don't trigger shortcuts when typing in inputs
      }

      switch (e.key) {
        case '1':
          setSelectedLocation('tbilisi');
          break;
        case '2':
          setSelectedLocation('batumi');
          break;
        case '3':
          setSelectedLocation('kutaisi');
          break;
        case 'r':
        case 'R':
          setSelectedLocation('tbilisi');
          setSelectedDate('10-10');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handlePresetQuery = (query: PresetQuery) => {
    setSelectedLocation(query.location);
    setSelectedDate(query.date);
  };

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-nasa-blue mx-auto mb-4"></div>
          <p className="text-xl text-gray-400">Loading weather data...</p>
        </div>
      </div>
    );
  }

  const currentLocation = summary.locations.find(loc => loc.id === selectedLocation);
  const dayOfYear = dateToDayOfYear(selectedDate);
  
  // Get stats for the selected day
  const rainStats = weatherData?.variables.PRECTOTCORR?.[dayOfYear.toString()];
  const heatStats = weatherData?.variables.T2M_MAX?.[dayOfYear.toString()];
  const windStats = weatherData?.variables.WS10M_MAX?.[dayOfYear.toString()];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Header */}
      <header className="bg-gradient-to-r from-nasa-blue to-blue-700 shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-4">
            <Rocket className="w-12 h-12 text-white" />
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Will It Rain On My Parade?
              </h1>
              <p className="text-blue-100 text-lg">
                NASA Space Apps 2025 • Powered by NASA POWER Data
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Location Selector */}
          <div className="lg:col-span-1">
            <LocationSelector
              locations={summary.locations}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
            />
          </div>

          {/* Middle & Right Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date Picker and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
              {currentLocation && <StatsCard location={currentLocation} />}
            </div>

            {/* Probability Display */}
            <ProbabilityDisplay
              dayOfYear={dayOfYear}
              rainStats={rainStats}
              heatStats={heatStats}
              windStats={windStats}
              loading={loading}
            />
          </div>
        </div>

        {/* Trend Charts - Full Width */}
        <div className="space-y-6 mb-6">
          <h2 className="text-3xl font-bold text-white">Historical Trends</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TrendChart
              stats={rainStats}
              title="Precipitation Trend"
              color="#3B82F6"
              yAxisLabel="Precipitation (mm)"
            />
            <TrendChart
              stats={heatStats}
              title="Maximum Temperature Trend"
              color="#EF4444"
              yAxisLabel="Temperature (°C)"
            />
          </div>
          <TrendChart
            stats={windStats}
            title="Wind Speed Trend"
            color="#06B6D4"
            yAxisLabel="Wind Speed (m/s)"
          />
        </div>

        {/* Preset Demo Buttons */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4 text-nasa-blue">Quick Demo Queries</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {presetQueries.slice(0, 10).map((query, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetQuery(query)}
                className="btn-secondary text-sm py-3 px-4 text-left"
              >
                <div className="font-semibold">{query.location}</div>
                <div className="text-xs text-gray-400">{query.date}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Keyboard shortcuts: [1] Tbilisi, [2] Batumi, [3] Kutaisi, [R] Reset
          </p>
        </div>

        {/* Export and Attribution */}
        <div className="card">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">NASA POWER Data Attribution</h3>
              <p className="text-sm text-gray-400 mb-1">
                <strong>Dataset:</strong> {summary.nasa_attribution.dataset}
              </p>
              <p className="text-sm text-gray-400 mb-1">
                <strong>Citation:</strong> {summary.nasa_attribution.full_citation}
              </p>
              <p className="text-sm text-gray-400 mb-1">
                <strong>URL:</strong>{' '}
                <a 
                  href={summary.nasa_attribution.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nasa-blue hover:underline"
                >
                  {summary.nasa_attribution.url}
                </a>
              </p>
              <p className="text-sm text-gray-400">
                <strong>License:</strong> {summary.nasa_attribution.license}
              </p>
            </div>
            <ExportButton
              location={selectedLocation}
              date={selectedDate}
              dayOfYear={dayOfYear}
              rainStats={rainStats}
              heatStats={heatStats}
              windStats={windStats}
              nasaAttribution={summary.nasa_attribution}
              disabled={!rainStats && !heatStats && !windStats}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>Created for NASA Space Apps 2025 Challenge</p>
          <p className="mt-2">Data provided by NASA POWER • Processing by Team Random5</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
