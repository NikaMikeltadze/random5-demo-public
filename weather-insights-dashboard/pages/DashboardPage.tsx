import React, { useState, useMemo, FormEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useAppStore } from '../hooks/useAppStore';
import { Location, GeocodeResult, HourlyData } from '../types';
import L, { LatLng } from 'leaflet';

// --- LEAFLET ICON FIX ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- MOCK DATA GENERATION ---
const generateMockWeatherData = (day: number, month: number): HourlyData[] => {
  const data: HourlyData[] = [];
  // Simple seasonal curve: colder in winter (Jan=1), hotter in summer (July=7)
  const monthTempOffset = -Math.cos(((month - 1) / 12) * 2 * Math.PI) * 15;
  const baseTemp = 10 + monthTempOffset + (day % 15) + Math.sin(day / 5) * 5;

  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    const temperature = baseTemp + Math.sin((i - 6) * Math.PI / 12) * 8 + (Math.random() - 0.5) * 2;
    const wind = 10 + Math.random() * 20 + (day % 5);
    const rain = Math.random() > 0.8 ? Math.random() * 5 : 0;
    const humidity = 60 + Math.sin(i * Math.PI / 12) * 20 + (Math.random() - 0.5) * 10;
    data.push({ hour, temperature: parseFloat(temperature.toFixed(1)), wind: parseFloat(wind.toFixed(1)), rain: parseFloat(rain.toFixed(1)), humidity: parseFloat(humidity.toFixed(1)) });
  }
  return data;
};

// --- MAP COMPONENTS ---
const LocationMarker: React.FC = () => {
  const { location, setLocation } = useAppStore();
  const map = useMapEvents({
    click(e) {
      setLocation(e.latlng);
    },
  });

  if (location) {
     map.flyTo(location, map.getZoom());
  }

  return location === null ? null : (
    <Marker position={location}>
      <Popup>
        <WeatherPopupContent location={location} />
      </Popup>
    </Marker>
  );
};

const WeatherPopupContent: React.FC<{location: Location | LatLng}> = ({ location }) => {
    // Mock current weather
    const temp = (20 + (Math.random() * 15)).toFixed(1);
    const condition = ['Sunny', 'Cloudy', 'Partly Cloudy'][Math.floor(Math.random()*3)];
    return (
        <div>
            <h4 className="font-bold text-md">Current Weather</h4>
            <p>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
            <p><strong>Temp:</strong> {temp}°C</p>
            <p><strong>Condition:</strong> {condition}</p>
        </div>
    );
};


// --- DASHBOARD PAGE ---
interface DateType { month: number; day: number; }

const DashboardPage: React.FC = () => {
  const { thresholds, location, setLocation } = useAppStore();
  
  const [startDate, setStartDate] = useState<DateType>({ month: 7, day: 1 });
  const [endDate, setEndDate] = useState<DateType>({ month: 7, day: 7 });
  const [currentDate, setCurrentDate] = useState<DateType>({ month: 7, day: 1 });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const defaultPosition: [number, number] = [location?.lat || 41.7151, location?.lng || 44.8271];

  const monthNames = useMemo(() => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], []);
  
  const getDaysInMonth = (month: number) => {
    const daysInMonths = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonths[month] || 31;
  };
  
  const isDateAfter = (date1: DateType, date2: DateType) => date1.month > date2.month || (date1.month === date2.month && date1.day > date2.day);
  const isDateBefore = (date1: DateType, date2: DateType) => date1.month < date2.month || (date1.month === date2.month && date1.day < date2.day);
  const isDateEqual = (date1: DateType, date2: DateType) => date1.month === date2.month && date1.day === date2.day;

  const chartData = useMemo(() => generateMockWeatherData(currentDate.day, currentDate.month), [currentDate]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsLoading(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        const data: GeocodeResult[] = await response.json();
        setSearchResults(data.slice(0, 5));
    } catch (error) {
        console.error("Geocoding search failed:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSelectSearchResult = (result: GeocodeResult) => {
      const newLocation = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
      setLocation(newLocation);
      setSearchResults([]);
      setSearchQuery('');
  };

  const handleDateChange = (type: 'start' | 'end', part: 'month' | 'day', value: number) => {
    let newStartDate = { ...startDate };
    let newEndDate = { ...endDate };

    if (type === 'start') {
        newStartDate[part] = value;
        if (part === 'month') {
            newStartDate.day = Math.min(newStartDate.day, getDaysInMonth(value));
        }
        if (isDateAfter(newStartDate, newEndDate)) {
            newEndDate = newStartDate;
        }
    } else { // type === 'end'
        newEndDate[part] = value;
        if (part === 'month') {
            newEndDate.day = Math.min(newEndDate.day, getDaysInMonth(value));
        }
        if (isDateBefore(newEndDate, newStartDate)) {
            newStartDate = newEndDate;
        }
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);

    if(isDateBefore(currentDate, newStartDate)) {
        setCurrentDate(newStartDate);
    } else if (isDateAfter(currentDate, newEndDate)) {
        setCurrentDate(newEndDate);
    }
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
        if(isDateEqual(prev, startDate)) return prev;
        
        let newDay = prev.day - 1;
        let newMonth = prev.month;

        if (newDay < 1) {
            newMonth -= 1;
            // Note: Does not handle year wrapping, assumes single year context
            if (newMonth < 1) newMonth = 12;
            newDay = getDaysInMonth(newMonth);
        }
        return { month: newMonth, day: newDay };
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
        if (isDateEqual(prev, endDate)) return prev;

        let newDay = prev.day + 1;
        let newMonth = prev.month;

        if (newDay > getDaysInMonth(newMonth)) {
            newDay = 1;
            newMonth += 1;
            // Note: Does not handle year wrapping
            if (newMonth > 12) newMonth = 1;
        }
        return { month: newMonth, day: newDay };
    });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-white mb-2">Current Thresholds</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm">
            <p className="text-slate-500 dark:text-slate-300">Hot: <span className="font-bold text-red-500">{thresholds.tempHot}°C</span></p>
            <p className="text-slate-500 dark:text-slate-300">Cold: <span className="font-bold text-blue-500">{thresholds.tempCold}°C</span></p>
            <p className="text-slate-500 dark:text-slate-300">Windy: <span className="font-bold text-yellow-500">{thresholds.windSpeed} km/h</span></p>
            <p className="text-slate-500 dark:text-slate-300">Rainfall: <span className="font-bold text-green-500">{thresholds.rainfall} mm/hr</span></p>
            <p className="text-slate-500 dark:text-slate-300">Humidity: <span className="font-bold text-purple-500">{thresholds.humidity}%</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-white">Location Explorer</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
            <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                {isLoading ? '...' : 'Search'}
            </button>
          </form>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-2 h-[50vh]">
            <MapContainer center={defaultPosition} zoom={10} scrollWheelZoom={true} className="rounded-lg">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <LocationMarker />
              {searchResults.map(result => (
                  <Marker key={result.place_id} position={[parseFloat(result.lat), parseFloat(result.lon)]}>
                      <Popup>
                         <div>
                            <p>{result.display_name}</p>
                            <button onClick={() => handleSelectSearchResult(result)} className="text-sm text-sky-600 hover:underline mt-1">Select this location</button>
                         </div>
                      </Popup>
                  </Marker>
              ))}
            </MapContainer>
          </div>
           {location && <p className="text-sm text-center text-slate-500 dark:text-slate-300">Selected Location: Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>}
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg space-y-4">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white">Daily Weather Analysis</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                  <div className="flex gap-2">
                       <select value={startDate.month} onChange={(e) => handleDateChange('start', 'month', Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                          {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                       </select>
                       <input type="number" value={startDate.day} onChange={(e) => handleDateChange('start', 'day', Number(e.target.value))} min="1" max={getDaysInMonth(startDate.month)} className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
                  </div>
              </div>
              <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                  <div className="flex gap-2">
                       <select value={endDate.month} onChange={(e) => handleDateChange('end', 'month', Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                          {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                       </select>
                       <input type="number" value={endDate.day} onChange={(e) => handleDateChange('end', 'day', Number(e.target.value))} min="1" max={getDaysInMonth(endDate.month)} className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
                  </div>
              </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
              <button onClick={handlePrevDay} disabled={isDateEqual(currentDate, startDate)} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  &lt; Prev Day
              </button>
              <p className="font-semibold text-slate-700 dark:text-white text-center">
                  Showing: {monthNames[currentDate.month - 1]} {currentDate.day}
              </p>
              <button onClick={handleNextDay} disabled={isDateEqual(currentDate, endDate)} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Next Day &gt;
              </button>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#8884d8" domain={[dataMin => (Math.floor(Math.min(dataMin, thresholds.tempCold) - 5)), dataMax => Math.max(dataMax, 50)]}/>
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip
                    contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                    borderColor: '#334155',
                    color: '#f1f5f9'
                    }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ef4444" name="Temp (°C)" />
                <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" name="Humidity (%)" />
                <Line yAxisId="right" type="monotone" dataKey="wind" stroke="#eab308" name="Wind (km/h)" />

                <ReferenceLine y={thresholds.tempHot} yAxisId="left" label={{value: "Hot", fill: '#ef4444', position: 'insideTopLeft' }} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={thresholds.tempCold} yAxisId="left" label={{value: "Cold", fill: '#3b82f6', position: 'insideBottomLeft'}} stroke="#3b82f6" strokeDasharray="3 3" />
                <ReferenceLine y={thresholds.windSpeed} yAxisId="right" label={{value: "Windy", fill: '#eab308', position: 'insideTopLeft'}} stroke="#eab308" strokeDasharray="3 3" />

              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
