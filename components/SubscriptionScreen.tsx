import { motion } from 'framer-motion';
import { Check, Crown, Zap, Building, Settings, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import React from 'react';
import { type Screen } from '../constants/navigation';

interface SubscriptionScreenProps {
  onNavigate: (screen: Screen) => void;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for small operations',
    icon: Settings,
    color: 'from-gray-500 to-gray-600',
    popular: false,
    features: [
      'Up to 3 machines',
      'Basic vibration monitoring',
      'Weekly reports',
      'Email alerts',
      'Community support'
    ],
    limitations: [
      'Limited AI insights',
      'Basic trend analysis',
      'No custom alerts'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$29',
    period: 'per month',
    description: 'For growing operations',
    icon: Zap,
    color: 'from-blue-500 to-purple-600',
    popular: false,
    features: [
      'Up to 15 machines',
      'Advanced vibration analysis',
      'Daily reports & alerts',
      'Real-time monitoring',
      'Email & SMS alerts',
      'Basic AI insights',
      'Priority support'
    ],
    limitations: [
      'Limited custom dashboards',
      'Basic API access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$89',
    period: 'per month',
    description: 'For serious manufacturers',
    icon: Crown,
    color: 'from-purple-500 to-pink-600',
    popular: true,
    features: [
      'Up to 50 machines',
      'Full AI-powered insights',
      'Custom alert thresholds',
      'Predictive maintenance',
      'Custom dashboards',
      'API access',
      'Priority support',
      'Export capabilities',
      'Team collaboration'
    ],
    limitations: []
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$249',
    period: 'per month',
    description: 'For large-scale operations',
    icon: Building,
    color: 'from-orange-500 to-red-600',
    popular: false,
    features: [
      'Unlimited machines',
      'Advanced AI & ML models',
      'Custom integrations',
      'Dedicated support',
      'On-premise deployment',
      'Custom training',
      'SLA guarantees',
      'White-label options',
      'Advanced security'
    ],
    limitations: []
  }
];

export default function SubscriptionScreen({ onNavigate }: SubscriptionScreenProps) {
  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      // Free plan activation
      onNavigate('success');
    } else {
      // Paid plan processing
      onNavigate('processing');
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <h1 className="text-2xl font-semibold">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Select the perfect plan for your machine monitoring needs
        </p>
        
        {/* Current Plan Status */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-500">Currently on Free Plan</span>
        </div>
      </motion.div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {plans.map((plan, index) => {
          const IconComponent = plan.icon;
          
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`border-border/50 hover:shadow-lg transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-purple-500/50 shadow-purple-500/25' : ''
              }`}>
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{plan.name}</h3>
                          {plan.popular && (
                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                              Most Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{plan.price}</span>
                        {plan.price !== '$0' && (
                          <span className="text-sm text-muted-foreground">/{plan.period.split(' ')[0]}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.period}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    <div className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {plan.limitations.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Limitations:</p>
                        {plan.limitations.map((limitation, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                            </div>
                            <span className="text-xs text-muted-foreground">{limitation}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25'
                        : plan.id === 'free'
                        ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white'
                        : `bg-gradient-to-r ${plan.color} hover:opacity-90 text-white shadow-lg`
                    } transition-all duration-300`}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {plan.id === 'free' ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="space-y-4"
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              View Billing History
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Update Payment Method
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Restore Previous Purchase
            </Button>
            <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600">
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Can I change plans later?</p>
              <p className="text-xs text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">What happens to my data if I cancel?</p>
              <p className="text-xs text-muted-foreground">
                Your data is retained for 30 days after cancellation, allowing you to export or reactivate.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Do you offer refunds?</p>
              <p className="text-xs text-muted-foreground">
                We offer a 30-day money-back guarantee on all paid plans.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Need Something Custom?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Have specific requirements? We offer custom enterprise solutions tailored to your unique needs.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Contact Sales
              </Button>
              <Button variant="outline" className="flex-1">
                Schedule Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </div>
  );
}