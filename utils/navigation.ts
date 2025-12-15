import { type Screen, MAIN_SCREENS } from '../constants/navigation';

export const shouldShowBottomNav = (currentScreen: Screen): boolean => {
  return MAIN_SCREENS.includes(currentScreen);
};

export const shouldShowBackButton = (
  currentScreen: Screen, 
  isAuthenticated: boolean
): boolean => {
  return (
    !MAIN_SCREENS.includes(currentScreen) && 
    isAuthenticated && 
    currentScreen !== 'login' && 
    currentScreen !== 'signup' && 
    currentScreen !== 'forgot'
  );
};

export const getBackNavigationTarget = (currentScreen: Screen): Screen => {
  if (currentScreen === 'assets' || currentScreen === 'subscription') {
    return 'home';
  } else if (currentScreen === 'processing' || currentScreen === 'success') {
    return 'subscription';
  } else if (currentScreen === 'save-sample') {
    return 'record';
  }
  return 'home';
};