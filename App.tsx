import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { type Screen } from './constants/navigation';
import { shouldShowBottomNav, shouldShowBackButton, getBackNavigationTarget } from './utils/navigation';
import AppHeader from './components/AppHeader';
import BottomNavigation from './components/BottomNavigation';
import ScreenRenderer from './components/ScreenRenderer';
import { getAuthToken, setAuthToken, authAPI } from './services/api';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import React from 'react';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  subscriptionTier: string;
  subscriptionLevel: number;
  features: any;
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

  // Handle browser back button
  const handlePopState = useCallback((event: PopStateEvent) => {
    const state = event.state;
    if (state && state.screen) {
      // Navigate to the screen from history without pushing new state
      setCurrentScreen(state.screen);
    } else if (isAuthenticated) {
      // No state, go to home
      setCurrentScreen('home');
    }
  }, [isAuthenticated]);

  // Set up popstate listener for browser back button
  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    
    // Initialize history state with current screen
    if (!window.history.state?.screen) {
      window.history.replaceState({ screen: currentScreen }, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handlePopState, currentScreen]);

  // Custom navigation function that manages browser history
  const navigateToScreen = useCallback((screen: Screen) => {
    // Don't push duplicate states
    if (screen === currentScreen) return;
    
    // Push new state to browser history
    window.history.pushState({ screen }, '', window.location.href);
    setCurrentScreen(screen);
  }, [currentScreen]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Replace state instead of push for login
    window.history.replaceState({ screen: 'home' }, '', window.location.href);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    // Replace state instead of push for logout
    window.history.replaceState({ screen: 'login' }, '', window.location.href);
    setCurrentScreen('login');
  };

  const showBottomNav = shouldShowBottomNav(currentScreen);
  const showBackButton = shouldShowBackButton(currentScreen, isAuthenticated);

  const goBack = () => {
    // Use browser's back if we have history, otherwise use app logic
    if (window.history.length > 1) {
      window.history.back();
    } else {
      const targetScreen = getBackNavigationTarget(currentScreen);
      navigateToScreen(targetScreen);
    }
  };

  const handleNavigateToAssets = (tab: 'companies' | 'factories' | 'machines') => {
    setAssetTab(tab);
    navigateToScreen('assets');
  };

  const handleSaveSample = (sampleData: any) => {
    setRecordedSampleData(sampleData);
    navigateToScreen('save-sample');
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

  const appContent = (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen min-h-[100dvh] max-w-md mx-auto text-foreground flex flex-col bg-background">
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

        {/* Main scrollable content with bottom padding for fixed nav */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${showBottomNav ? 'pb-20' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ScreenRenderer
                currentScreen={currentScreen}
                assetTab={assetTab}
                recordedSampleData={recordedSampleData}
                onNavigate={navigateToScreen}
                onLogin={handleLogin}
                onNavigateToAssets={handleNavigateToAssets}
                onSaveSample={handleSaveSample}
                user={user}
              />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Fixed bottom navigation */}
        {showBottomNav && (
          <BottomNavigation 
            currentScreen={currentScreen}
            onNavigate={navigateToScreen}
          />
        )}
      </div>
    </div>
  );

  // Wrap with SubscriptionProvider only if authenticated
  if (isAuthenticated) {
    return (
      <SubscriptionProvider>
        {appContent}
      </SubscriptionProvider>
    );
  }

  return appContent;
}
