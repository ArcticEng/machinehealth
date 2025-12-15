import { Sun, Moon, ArrowLeft, LogOut, User } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import React from 'react';

interface AppHeaderProps {
  isDarkMode: boolean;
  showBackButton: boolean;
  onToggleDarkMode: () => void;
  onGoBack: () => void;
  userName?: string;
  onLogout?: () => void;
}

export default function AppHeader({ 
  isDarkMode, 
  showBackButton, 
  onToggleDarkMode, 
  onGoBack,
  userName,
  onLogout
}: AppHeaderProps) {
  return (
    <div className="flex justify-between items-center p-4 border-b border-border bg-card">
      <div className="w-10">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <h1 className="text-lg font-medium">MachineHealth</h1>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch checked={isDarkMode} onCheckedChange={onToggleDarkMode} />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>

        {userName && onLogout && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">Logged in</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-500">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
