import React from 'react';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useSubscription, SUBSCRIPTION_LEVELS } from '../contexts/SubscriptionContext';

interface FeatureLockedProps {
  feature: string;
  requiredLevel?: number;
  onUpgrade?: () => void;
  children?: React.ReactNode;
  compact?: boolean;
}

export const FeatureLocked: React.FC<FeatureLockedProps> = ({
  feature,
  requiredLevel = SUBSCRIPTION_LEVELS.BASIC,
  onUpgrade,
  children,
  compact = false,
}) => {
  const { subscription, isFreeTier } = useSubscription();

  const planName = requiredLevel === SUBSCRIPTION_LEVELS.PREMIUM ? 'Premium' : 'Basic';
  
  if (compact) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-sm">{planName} required</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2 border-muted">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {requiredLevel === SUBSCRIPTION_LEVELS.PREMIUM ? (
            <Crown className="h-6 w-6 text-primary" />
          ) : (
            <Lock className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{feature}</h3>
          <p className="text-muted-foreground text-sm">
            This feature requires a {planName} subscription.
          </p>
        </div>

        {onUpgrade && (
          <Button onClick={onUpgrade} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Upgrade to {planName}
          </Button>
        )}

        {isFreeTier() && (
          <p className="text-xs text-muted-foreground">
            Free users can only record samples and view real-time metrics.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Badge to show on locked buttons/features
interface LockedBadgeProps {
  requiredLevel?: number;
  className?: string;
}

export const LockedBadge: React.FC<LockedBadgeProps> = ({
  requiredLevel = SUBSCRIPTION_LEVELS.BASIC,
  className = '',
}) => {
  const planName = requiredLevel === SUBSCRIPTION_LEVELS.PREMIUM ? 'Premium' : 'Basic';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary ${className}`}>
      <Lock className="h-3 w-3" />
      {planName}
    </span>
  );
};

// Wrapper to disable elements for free users
interface RequireSubscriptionProps {
  level?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLocked?: boolean;
}

export const RequireSubscription: React.FC<RequireSubscriptionProps> = ({
  level = SUBSCRIPTION_LEVELS.BASIC,
  children,
  fallback,
  showLocked = true,
}) => {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <>{fallback}</>;
  }

  const userLevel = subscription?.level ?? 0;
  
  if (userLevel >= level) {
    return <>{children}</>;
  }

  if (showLocked && fallback) {
    return <>{fallback}</>;
  }

  return null;
};

export default FeatureLocked;
