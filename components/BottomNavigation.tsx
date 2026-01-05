import { useState } from 'react';
import { Button } from './ui/button';
import { BOTTOM_NAV_ITEMS, type Screen } from '../constants/navigation';
import { useSubscription, SUBSCRIPTION_LEVELS } from '../contexts/SubscriptionContext';
import { Lock, Crown, X } from 'lucide-react';
import React from 'react';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

// Screens that require a paid subscription
const PAID_SCREENS: Screen[] = ['compare', 'trends', 'reports'];

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const { isFreeTier } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<string>('');

  const handleNavClick = (screen: Screen, label: string) => {
    // Check if this is a paid feature and user is on free tier
    if (isFreeTier() && PAID_SCREENS.includes(screen)) {
      setBlockedFeature(label);
      setShowUpgradeModal(true);
      return;
    }
    onNavigate(screen);
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    onNavigate('subscription');
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-around py-2 px-1">
            {BOTTOM_NAV_ITEMS.map(({ screen, icon: Icon, label }) => {
              const isLocked = isFreeTier() && PAID_SCREENS.includes(screen);
              const isActive = currentScreen === screen;
              
              return (
                <Button
                  key={screen}
                  variant="ghost"
                  size="sm"
                  className={`flex flex-col items-center gap-1 p-2 h-auto min-w-[60px] relative ${
                    isActive
                      ? 'text-primary bg-gradient-to-r from-pink-500/20 to-purple-500/20' 
                      : isLocked
                      ? 'text-muted-foreground/50 hover:text-muted-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => handleNavClick(screen, label)}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${isLocked ? 'opacity-50' : ''}`} />
                    {isLocked && (
                      <Lock className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isLocked ? 'opacity-50' : ''}`}>
                    {label}
                  </span>
                </Button>
              );
            })}
          </div>
          {/* Safe area padding for iOS home indicator */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </nav>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUpgradeModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Crown className="h-8 w-8 text-amber-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Upgrade Required</h3>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{blockedFeature}</span> is a premium feature. 
                  Upgrade to Basic or Premium to unlock:
                </p>
              </div>

              <ul className="text-sm text-left space-y-2 py-2">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  <span>Compare samples & baselines</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  <span>View trends & alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  <span>Generate AI reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-xs">✓</span>
                  </div>
                  <span>Save & track samples</span>
                </li>
              </ul>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Maybe Later
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  onClick={handleUpgrade}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
