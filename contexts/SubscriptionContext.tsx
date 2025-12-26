import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

// Subscription levels
export const SUBSCRIPTION_LEVELS = {
  FREE: 0,
  BASIC: 1,
  PREMIUM: 2,
} as const;

export type SubscriptionLevel = typeof SUBSCRIPTION_LEVELS[keyof typeof SUBSCRIPTION_LEVELS];

export interface SubscriptionFeatures {
  name: string;
  canSaveSamples: boolean;
  canUseAI: boolean;
  canCreateCompanies: boolean;
  canCreateFactories: boolean;
  canCreateMachines: boolean;
  canGenerateReports: boolean;
  canViewHistory: boolean;
  machineLimit: number;
  samplesPerDay: number;
}

export interface SubscriptionInfo {
  level: SubscriptionLevel;
  tier: string;
  features: SubscriptionFeatures;
  machinesUsed: number;
  machineLimit: number;
  expiresAt: string | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  canAccess: (feature: keyof SubscriptionFeatures) => boolean;
  canCreateMoreMachines: () => boolean;
  refreshSubscription: () => Promise<void>;
  upgradeRequired: (feature: string) => string;
  isFreeTier: () => boolean;
  isBasicTier: () => boolean;
  isPremiumTier: () => boolean;
}

const defaultFeatures: SubscriptionFeatures = {
  name: 'Free',
  canSaveSamples: false,
  canUseAI: false,
  canCreateCompanies: false,
  canCreateFactories: false,
  canCreateMachines: false,
  canGenerateReports: false,
  canViewHistory: false,
  machineLimit: 0,
  samplesPerDay: 0,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  canAccess: () => false,
  canCreateMoreMachines: () => false,
  refreshSubscription: async () => {},
  upgradeRequired: () => '',
  isFreeTier: () => true,
  isBasicTier: () => false,
  isPremiumTier: () => false,
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  // Return default values if context is not available (e.g., not authenticated)
  if (!context) {
    return {
      subscription: null,
      loading: false,
      canAccess: () => false,
      canCreateMoreMachines: () => false,
      refreshSubscription: async () => {},
      upgradeRequired: () => 'Please log in to access this feature.',
      isFreeTier: () => true,
      isBasicTier: () => false,
      isPremiumTier: () => false,
    };
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    try {
      const userData = await authAPI.getMe();
      setSubscription({
        level: userData.subscriptionLevel || 0,
        tier: userData.subscriptionTier || 'free',
        features: userData.features || defaultFeatures,
        machinesUsed: userData.machinesUsed || 0,
        machineLimit: userData.machineLimit || 0,
        expiresAt: userData.subscriptionExpiresAt,
      });
    } catch (error) {
      console.error('Failed to load subscription:', error);
      // Set default free tier on error
      setSubscription({
        level: SUBSCRIPTION_LEVELS.FREE,
        tier: 'free',
        features: defaultFeatures,
        machinesUsed: 0,
        machineLimit: 0,
        expiresAt: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, []);

  const canAccess = (feature: keyof SubscriptionFeatures): boolean => {
    if (!subscription) return false;
    const value = subscription.features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return false;
  };

  const canCreateMoreMachines = (): boolean => {
    if (!subscription) return false;
    if (subscription.features.machineLimit === -1) return true; // Unlimited
    return subscription.machinesUsed < subscription.features.machineLimit;
  };

  const upgradeRequired = (feature: string): string => {
    if (!subscription) return 'Please log in to access this feature.';
    
    if (subscription.level === SUBSCRIPTION_LEVELS.FREE) {
      return `${feature} requires a Basic or Premium subscription. Upgrade to unlock this feature.`;
    }
    
    if (subscription.level === SUBSCRIPTION_LEVELS.BASIC) {
      return `${feature} requires a Premium subscription. Upgrade to unlock unlimited access.`;
    }
    
    return '';
  };

  const isFreeTier = () => subscription?.level === SUBSCRIPTION_LEVELS.FREE;
  const isBasicTier = () => subscription?.level === SUBSCRIPTION_LEVELS.BASIC;
  const isPremiumTier = () => subscription?.level === SUBSCRIPTION_LEVELS.PREMIUM;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        canAccess,
        canCreateMoreMachines,
        refreshSubscription,
        upgradeRequired,
        isFreeTier,
        isBasicTier,
        isPremiumTier,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
