
import React, { useState } from 'react';

interface NavbarProps {
  isLoggedIn: boolean;
  onLogout: () => void;
  setPage: (page: 'dashboard' | 'login' | 'thresholds') => void;
}

const NavButton: React.FC<{onClick: () => void; children: React.ReactNode; isBlock?: boolean}> = ({ onClick, children, isBlock }) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-slate-300 hover:bg-slate-700 hover:text-white ${isBlock ? 'block w-full text-left' : ''}`}
    >
        {children}
    </button>
);


export const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, onLogout, setPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (page: 'dashboard' | 'thresholds') => {
    setPage(page);
    setIsMenuOpen(false);
  }

  const handleAuthAction = (action: 'login' | 'logout') => {
      if (action === 'login') {
          setPage('login');
      } else {
          onLogout();
      }
      setIsMenuOpen(false);
  }

  return (
    <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
      <nav className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center cursor-pointer" onClick={() => setPage('dashboard')}>
              <svg className="h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
              <h1 className="ml-2 text-xl font-bold text-white">Weather Insights</h1>
            </div>
             {isLoggedIn && (
                 <div className="hidden md:flex items-center space-x-4">
                     <NavButton onClick={() => handleNav('dashboard')}>Dashboard</NavButton>
                     <NavButton onClick={() => handleNav('thresholds')}>Thresholds</NavButton>
                 </div>
             )}
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <button
                onClick={isLoggedIn ? onLogout : () => setPage('login')}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors ${
                    isLoggedIn ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                {isLoggedIn ? 'Logout' : 'Login'}
              </button>
            </div>
            <div className="md:hidden ml-4">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <svg className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Close icon */}
                <svg className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`transition-all duration-300 ease-in-out md:hidden ${isMenuOpen ? 'max-h-96' : 'max-h-0'} overflow-hidden`}>
            {isLoggedIn ? (
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    <NavButton onClick={() => handleNav('dashboard')} isBlock>Dashboard</NavButton>
                    <NavButton onClick={() => handleNav('thresholds')} isBlock>Thresholds</NavButton>
                     <button
                        onClick={() => handleAuthAction('logout')}
                        className="block w-full text-left mt-2 px-3 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors bg-red-600 hover:bg-red-700 focus:ring-red-500"
                      >
                        Logout
                    </button>
                </div>
            ) : (
                 <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                     <button
                        onClick={() => handleAuthAction('login')}
                        className="block w-full text-left px-3 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      >
                        Login
                    </button>
                </div>
            )}
        </div>
      </nav>
    </header>
  );
};
