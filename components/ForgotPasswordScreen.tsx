import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import React from 'react';
import { type Screen } from '../constants/navigation';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function ForgotPasswordScreen({ onNavigate }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setEmailSent(true);
    }, 1500);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col justify-center p-6 bg-gradient-to-br from-background via-background to-accent/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25"
          >
            <CheckCircle className="h-8 w-8 text-white" />
          </motion.div>
          
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Email Sent!</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. 
              Check your inbox and follow the instructions.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
              onClick={() => onNavigate('login')}
            >
              Back to Sign In
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEmailSent(false)}
            >
              Send Another Email
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-gradient-to-br from-background via-background to-accent/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25"
          >
            <Mail className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-semibold">Reset Password</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Reset Form */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center">Forgot Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input-background border-border/50 focus:border-primary"
              />
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/25 transition-all duration-300"
              onClick={handleResetPassword}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                'Send Reset Email'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer Link */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Remember your password?</span>
            <Button
              variant="link"
              className="p-0 h-auto text-primary hover:text-primary/80 font-medium"
              onClick={() => onNavigate('login')}
            >
              Sign in
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}