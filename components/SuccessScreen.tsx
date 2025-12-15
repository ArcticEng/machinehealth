import { motion } from 'framer-motion';
import { CheckCircle, Crown, Zap, TrendingUp, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import React from 'react';
import { type Screen } from '../constants/navigation';
interface SuccessScreenProps {
  onNavigate: (screen: Screen) => void;
}

const newFeatures = [
  {
    icon: Zap,
    title: 'AI-Powered Insights',
    description: 'Advanced machine learning analysis of your equipment',
    color: 'text-purple-500'
  },
  {
    icon: TrendingUp,
    title: 'Predictive Maintenance',
    description: 'Prevent failures before they happen',
    color: 'text-blue-500'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share insights and reports with your team',
    color: 'text-green-500'
  }
];

export default function SuccessScreen({ onNavigate }: SuccessScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-accent/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-8 max-w-md w-full"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            delay: 0.2, 
            type: "spring", 
            stiffness: 200, 
            damping: 10 
          }}
          className="mx-auto w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25"
        >
          <CheckCircle className="h-10 w-10 text-white" />
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-2xl font-semibold">Welcome to Pro!</h1>
          <p className="text-muted-foreground">
            Your subscription has been activated successfully. You now have access to all premium features.
          </p>
        </motion.div>

        {/* Plan Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Pro Plan</span>
                </div>
                <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                  Active
                </Badge>
              </div>
              
              <div className="text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly billing</span>
                  <span className="font-medium">$89.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Next billing date</span>
                  <span className="font-medium">Sep 30, 2025</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Machines included</span>
                  <span className="font-medium">Up to 50</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* New Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-medium">What's New for You</h3>
          
          <div className="space-y-3">
            {newFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + (index * 0.1) }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <IconComponent className={`h-5 w-5 ${feature.color}`} />
                        <div className="text-left flex-1">
                          <p className="font-medium text-sm">{feature.title}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="space-y-3 w-full"
        >
          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 transition-all duration-300"
            onClick={() => onNavigate('home')}
          >
            Explore New Features
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onNavigate('reports')}
            >
              View AI Insights
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onNavigate('subscription')}
            >
              Manage Plan
            </Button>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="space-y-3"
        >
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4 space-y-2">
              <h4 className="font-medium text-sm">Need Help Getting Started?</h4>
              <p className="text-xs text-muted-foreground">
                Check out our quick start guide or contact our support team for personalized assistance.
              </p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="text-xs">
                  Quick Start Guide
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            You can manage your subscription anytime in the settings
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}