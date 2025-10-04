import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppStore } from './hooks/useAppStore';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import ThresholdsPage from './pages/ThresholdsPage';
import DashboardPage from './pages/DashboardPage';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAppStore();

  return (
    <HashRouter>
      {isAuthenticated && <Navbar />}
      <main className="p-4 sm:p-6 md:p-8">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage />} />
          <Route path="/thresholds" element={<PrivateRoute><ThresholdsPage /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        </Routes>
      </main>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;