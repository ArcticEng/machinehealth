import React from 'react';
import { type Screen } from '../constants/navigation';

import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import HomeScreen from './HomeScreen';
import AssetStructureScreen from './AssetStructureScreen';
import RecordSampleScreen from './RecordSampleScreen';
import CompareScreen from './CompareScreen';
import TrendsAlertsScreen from './TrendsAlertsScreen';
import ReportsScreen from './ReportsScreen';
import SubscriptionScreen from './SubscriptionScreen';
import ProcessingScreen from './ProcessingScreen';
import SuccessScreen from './SuccessScreen';
import SaveSampleScreen from './SaveSampleScreen';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  subscriptionTier: string;
}

interface ScreenRendererProps {
  currentScreen: Screen;
  assetTab: 'companies' | 'factories' | 'machines';
  recordedSampleData: any;
  onNavigate: (screen: Screen) => void;
  onLogin: (user: User) => void;
  onNavigateToAssets: (tab: 'companies' | 'factories' | 'machines') => void;
  onSaveSample: (sampleData: any) => void;
  user?: User | null;
}

export default function ScreenRenderer({
  currentScreen,
  assetTab,
  recordedSampleData,
  onNavigate,
  onLogin,
  onNavigateToAssets,
  onSaveSample,
  user,
}: ScreenRendererProps) {
  switch (currentScreen) {
    case 'login':
      return <LoginScreen onNavigate={onNavigate} onLogin={onLogin} />;
    case 'signup':
      return <SignUpScreen onNavigate={onNavigate} onLogin={onLogin} />;
    case 'forgot':
      return <ForgotPasswordScreen onNavigate={onNavigate} />;
    case 'home':
      return (
        <HomeScreen
          onNavigate={onNavigate}
          onNavigateToAssets={onNavigateToAssets}
          userName={user?.firstName || user?.email?.split('@')[0]}
        />
      );
    case 'record':
      return <RecordSampleScreen onSaveSample={onSaveSample} />;
    case 'compare':
      return <CompareScreen />;
    case 'trends':
      return <TrendsAlertsScreen />;
    case 'reports':
      return <ReportsScreen />;
    case 'assets':
      return <AssetStructureScreen defaultTab={assetTab} />;
    case 'subscription':
      return <SubscriptionScreen onNavigate={onNavigate} />;
    case 'processing':
      return <ProcessingScreen onNavigate={onNavigate} />;
    case 'success':
      return <SuccessScreen onNavigate={onNavigate} />;
    case 'save-sample':
      return (
        <SaveSampleScreen
          sampleData={recordedSampleData}
          onNavigate={onNavigate}
        />
      );
    default:
      return (
        <HomeScreen
          onNavigate={onNavigate}
          onNavigateToAssets={onNavigateToAssets}
          userName={user?.firstName || user?.email?.split('@')[0]}
        />
      );
  }
}
