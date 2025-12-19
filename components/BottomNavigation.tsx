import { Button } from './ui/button';
import { BOTTOM_NAV_ITEMS, type Screen } from '../constants/navigation';
import React from 'react';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2 px-1">
          {BOTTOM_NAV_ITEMS.map(({ screen, icon: Icon, label }) => (
            <Button
              key={screen}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 p-2 h-auto min-w-[60px] ${
                currentScreen === screen 
                  ? 'text-primary bg-gradient-to-r from-pink-500/20 to-purple-500/20' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onNavigate(screen)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
        {/* Safe area padding for iOS home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
