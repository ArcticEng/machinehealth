import { Button } from './ui/button';
import { BOTTOM_NAV_ITEMS, type Screen } from '../constants/navigation';
import React from 'react';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  return (
    <div className="border-t border-border bg-card">
      <div className="flex items-center justify-around py-2">
        {BOTTOM_NAV_ITEMS.map(({ screen, icon: Icon, label }) => (
          <Button
            key={screen}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 p-2 h-auto ${
              currentScreen === screen 
                ? 'text-primary bg-gradient-to-r from-pink-500/20 to-purple-500/20' 
                : 'text-muted-foreground'
            }`}
            onClick={() => onNavigate(screen)}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}