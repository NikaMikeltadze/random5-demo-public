import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Thresholds, Location } from '../types';

interface AppState {
  isAuthenticated: boolean;
  thresholds: Thresholds;
  location: Location | null;
  login: () => void;
  logout: () => void;
  setThresholds: (thresholds: Thresholds) => void;
  setLocation: (location: Location) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const getInitialThresholds = (): Thresholds => {
  try {
    const item = window.localStorage.getItem('weather-thresholds');
    return item ? JSON.parse(item) : { tempHot: 30, tempCold: 5, windSpeed: 50, rainfall: 10, humidity: 80 };
  } catch (error) {
    console.error('Error reading thresholds from localStorage', error);
    return { tempHot: 30, tempCold: 5, windSpeed: 50, rainfall: 10, humidity: 80 };
  }
};

const getInitialLocation = (): Location | null => {
  try {
    const item = window.localStorage.getItem('weather-location');
    return item ? JSON.parse(item) : { lat: 41.7151, lng: 44.8271 }; // Default to Tbilisi, Georgia
  } catch (error) {
    console.error('Error reading location from localStorage', error);
    return { lat: 41.7151, lng: 44.8271 }; // Default to Tbilisi, Georgia
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [thresholds, _setThresholds] = useState<Thresholds>(getInitialThresholds);
  const [location, _setLocation] = useState<Location | null>(getInitialLocation);

  const login = useCallback(() => setIsAuthenticated(true), []);
  const logout = useCallback(() => setIsAuthenticated(false), []);

  const setThresholds = useCallback((newThresholds: Thresholds) => {
    _setThresholds(newThresholds);
    try {
      window.localStorage.setItem('weather-thresholds', JSON.stringify(newThresholds));
    } catch (error) {
      console.error('Error saving thresholds to localStorage', error);
    }
  }, []);
  
  const setLocation = useCallback((newLocation: Location) => {
    _setLocation(newLocation);
     try {
      window.localStorage.setItem('weather-location', JSON.stringify(newLocation));
    } catch (error) {
      console.error('Error saving location to localStorage', error);
    }
  }, []);

  const value = { isAuthenticated, thresholds, location, login, logout, setThresholds, setLocation };

  // FIX: Replaced JSX syntax with React.createElement to resolve compilation errors in a .ts file.
  return React.createElement(AppContext.Provider, { value }, children);
};

export const useAppStore = (): AppState => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};