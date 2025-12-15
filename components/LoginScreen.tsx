import { useState } from 'react';
import { motion } from "framer-motion";
import { Eye, EyeOff, Zap, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import React from 'react';
import { type Screen } from '../constants/navigation';
import { authAPI } from '../services/api';

interface LoginScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogin: (user: any) => void;
}

export default function LoginScreen({ onNavigate, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user } = await authAPI.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@example.com');
    setPassword('demo123');
    setIsLoading(true);
    setError(null);
    
    try {
      const { user } = await authAPI.login('demo@example.com', 'demo123');
      onLogin(user);
    } catch (err: any) {
      setError('Demo login failed. Make sure the backend is running and seeded.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-8"
      >
        {/* Logo and Header */}
        <Card className="border-border/50 shadow-xl">
          <CardContent className="text-center space-y-4 py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25"
            >
              <Zap className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-semibold">Welcome Back</h1>
            <p className="text-muted-foreground">Monitor your machines with precision</p>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input-background border-border/50 focus:border-primary"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input-background border-border/50 focus:border-primary pr-10"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-0 h-full w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25 transition-all duration-300"
              onClick={handleLogin}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Try Demo Account
            </Button>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="space-y-4 text-center">
          <Button
            variant="link"
            className="text-muted-foreground hover:text-primary"
            onClick={() => onNavigate('forgot')}
          >
            Forgot your password?
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Don't have an account?</span>
            <Button
              variant="link"
              className="p-0 h-auto text-primary hover:text-primary/80 font-medium"
              onClick={() => onNavigate('signup')}
            >
              Sign up
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
