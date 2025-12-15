import { Home, Activity, TrendingUp, BarChart3, FileText } from 'lucide-react';

export type Screen = 'login' | 'signup' | 'forgot' | 'home' | 'record' | 'compare' | 'trends' | 'reports' | 'assets' | 'subscription' | 'processing' | 'success' | 'save-sample';

export const MAIN_SCREENS: Screen[] = ['home', 'record', 'compare', 'trends', 'reports'];

export const BOTTOM_NAV_ITEMS = [
  { screen: 'home' as Screen, icon: Home, label: 'Home' },
  { screen: 'record' as Screen, icon: Activity, label: 'Record' },
  { screen: 'compare' as Screen, icon: TrendingUp, label: 'Compare' },
  { screen: 'trends' as Screen, icon: BarChart3, label: 'Trends' },
  { screen: 'reports' as Screen, icon: FileText, label: 'Reports' },
];