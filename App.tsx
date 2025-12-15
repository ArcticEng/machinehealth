import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { type Screen } from './constants/navigation';
import { shouldShowBottomNav, shouldShowBackButton, getBackNavigationTarget } from './utils/navigation';
import AppHeader from './components/AppHeader';
import BottomNavigation from './components/BottomNavigation';
import ScreenRenderer from './components/ScreenRenderer';
import { getAuthToken, setAuthToken, authAPI } from './services/api';
import React from 'react';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  subscriptionTier: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [assetTab, setAssetTab] = useState<'companies' | 'factories' | 'machines'>('companies');
  const [recordedSampleData, setRecordedSampleData] = useState<any>(null);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authAPI.getMe();
          setUser(userData);
          setIsAuthenticated(true);
          setCurrentScreen('home');
        } catch (error) {
          // Token invalid, clear it
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setCurrentScreen('login');
  };

  const showBottomNav = shouldShowBottomNav(currentScreen);
  const showBackButton = shouldShowBackButton(currentScreen, isAuthenticated);

  const goBack = () => {
    const targetScreen = getBackNavigationTarget(currentScreen);
    setCurrentScreen(targetScreen);
  };

  const handleNavigateToAssets = (tab: 'companies' | 'factories' | 'machines') => {
    setAssetTab(tab);
    setCurrentScreen('assets');
  };

  const handleSaveSample = (sampleData: any) => {
    setRecordedSampleData(sampleData);
    setCurrentScreen('save-sample');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen max-w-md mx-auto text-foreground flex flex-col">
        {isAuthenticated && (
          <AppHeader 
            isDarkMode={isDarkMode}
            showBackButton={showBackButton}
            onToggleDarkMode={toggleDarkMode}
            onGoBack={goBack}
            userName={user?.firstName || user?.email?.split('@')[0]}
            onLogout={handleLogout}
          />
        )}

        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ScreenRenderer
                currentScreen={currentScreen}
                assetTab={assetTab}
                recordedSampleData={recordedSampleData}
                onNavigate={setCurrentScreen}
                onLogin={handleLogin}
                onNavigateToAssets={handleNavigateToAssets}
                onSaveSample={handleSaveSample}
                user={user}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {showBottomNav && (
          <BottomNavigation 
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
          />
        )}
      </div>
    </div>
  );
}
