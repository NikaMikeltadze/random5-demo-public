import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { ThresholdsPage } from './components/ThresholdsPage';
import { Footer } from './components/Footer';
import type { Location, DateRange, WeatherDataPoint, Thresholds, QuickQuery } from './types';
import { LOCATIONS, QUICK_QUERIES, DEFAULT_THRESHOLDS, USER_THRESHOLDS } from './constants';
import { fetchWeatherData } from './services/weatherService';

const getInitialDateRange = (): DateRange => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return {
        start: todayStr,
        end: todayStr,
    };
};


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState<'dashboard' | 'login' | 'thresholds'>('dashboard');
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());

  const [weatherData, setWeatherData] = useState<WeatherDataPoint[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setThresholds(USER_THRESHOLDS);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setThresholds(DEFAULT_THRESHOLDS);
    setPage('dashboard');
  };

  const handleSaveThresholds = (newThresholds: Thresholds) => {
    setThresholds(newThresholds);
    alert('Thresholds saved!');
    setPage('dashboard');
  };

  const handleQuickQuery = useCallback((query: QuickQuery) => {
    const location = LOCATIONS.find(l => l.name.toLowerCase().includes(query.location.toLowerCase()));
    if (location) {
      setSelectedLocation(location);
    }
    // Set date range to the single day from the query, using today's year for the end date
    const [month, day] = query.date.split('-');
    const year = new Date().getFullYear();
    const dateStr = `${year}-${month}-${day}`;
    
    setDateRange({
        start: dateStr,
        end: dateStr,
    });
    setPage('dashboard');
  }, []);

  useEffect(() => {
    const loadWeatherData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeatherData(selectedLocation, dateRange);
        setWeatherData(data);
      } catch (err) {
        setError('Failed to fetch weather data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadWeatherData();
  }, [selectedLocation, dateRange]);

  const renderPage = () => {
    switch(page) {
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      case 'thresholds':
        if (!isLoggedIn) {
          setPage('login'); // Redirect to login if not logged in
          return <LoginPage onLogin={handleLogin} />;
        }
        return <ThresholdsPage thresholds={thresholds} onSave={handleSaveThresholds} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            locations={LOCATIONS}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            dateRange={dateRange}
            onDateChange={setDateRange}
            weatherData={weatherData}
            thresholds={thresholds}
            loading={loading}
            error={error}
            quickQueries={QUICK_QUERIES}
            onQuickQuery={handleQuickQuery}
          />
        );
    }
  };

  return (
    <div className="bg-slate-900 text-slate-300 min-h-screen font-sans">
      <Navbar isLoggedIn={isLoggedIn} onLogout={handleLogout} setPage={setPage} />
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}

export default App;
