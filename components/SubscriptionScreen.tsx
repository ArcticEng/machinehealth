import { motion } from 'framer-motion';
import { Check, Crown, Zap, X, Sparkles, Lock, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import React, { useState } from 'react';
import { type Screen } from '../constants/navigation';
import { useSubscription, SUBSCRIPTION_LEVELS } from '../contexts/SubscriptionContext';

interface SubscriptionScreenProps {
  onNavigate: (screen: Screen) => void;
}

const plans = [
  {
    id: 'free',
    level: SUBSCRIPTION_LEVELS.FREE,
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try before you buy',
    icon: Activity,
    color: 'from-gray-500 to-gray-600',
    popular: false,
    features: [
      'Record vibration samples',
      'View real-time metrics (RMS, Peak, Crest Factor)',
      'Basic vibration analysis',
      'Mobile app access'
    ],
    notIncluded: [
      'Save samples to database',
      'AI-powered analysis',
      'Company/Factory/Machine structure',
      'Historical data & trends',
      'Reports & exports',
      'Alerts & notifications'
    ]
  },
  {
    id: 'basic',
    level: SUBSCRIPTION_LEVELS.BASIC,
    name: 'Basic',
    price: '$9.99',
    period: 'per month',
    description: 'For small teams',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    popular: true,
    features: [
      'Everything in Free, plus:',
      'Save samples to cloud',
      'AI-powered vibration analysis',
      'Company/Factory/Machine hierarchy',
      'Up to 10 machines',
      'Historical data & trends',
      'Generate PDF reports',
      'Email alerts',
      'Compare samples',
      'Baseline management'
    ],
    notIncluded: [
      'Unlimited machines',
      'Priority support'
    ]
  },
  {
    id: 'premium',
    level: SUBSCRIPTION_LEVELS.PREMIUM,
    name: 'Premium',
    price: '$29.99',
    period: 'per month',
    description: 'For growing operations',
    icon: Crown,
    color: 'from-purple-500 to-pink-600',
    popular: false,
    features: [
      'Everything in Basic, plus:',
      'Unlimited machines',
      'Advanced AI insights',
      'Predictive maintenance',
      'Priority support',
      'API access',
      'Custom alert thresholds',
      'Team collaboration',
      'Export to CSV/Excel'
    ],
    notIncluded: []
  }
];

export default function SubscriptionScreen({ onNavigate }: SubscriptionScreenProps) {
  const { subscription, refreshSubscription } = useSubscription();
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentLevel = subscription?.level ?? 0;

  const handleSelectPlan = async (level: number) => {
    if (level === currentLevel) return;
    
    setUpgrading(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ level })
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      await refreshSubscription();
      
      const planName = level === 0 ? 'Free' : level === 1 ? 'Basic' : 'Premium';
      setMessage({ type: 'success', text: `Successfully switched to ${planName} plan!` });
      
    } catch (error) {
      console.error('Upgrade error:', error);
      setMessage({ type: 'error', text: 'Failed to update subscription. Please try again.' });
    } finally {
      setUpgrading(false);
    }
  };

  const getPlanStatus = (planLevel: number) => {
    if (planLevel === currentLevel) return 'current';
    if (planLevel < currentLevel) return 'downgrade';
    return 'upgrade';
  };

  const getButtonText = (planLevel: number) => {
    const status = getPlanStatus(planLevel);
    if (status === 'current') return 'Current Plan';
    if (status === 'downgrade') return 'Downgrade';
    return 'Upgrade';
  };

  const getCurrentPlanName = () => {
    return currentLevel === 0 ? 'Free' : currentLevel === 1 ? 'Basic' : 'Premium';
  };

  return (
    <div className="relative min-h-screen">
      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h1 className="text-2xl font-semibold">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Unlock powerful features for machine monitoring
          </p>
          
          {/* Current Plan Status */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">Currently on {getCurrentPlanName()} Plan</span>
          </div>

          {/* Usage Info for Basic users */}
          {currentLevel === SUBSCRIPTION_LEVELS.BASIC && subscription && (
            <div className="text-sm text-muted-foreground">
              Machines: {subscription.machinesUsed} / {subscription.machineLimit}
            </div>
          )}
        </motion.div>

        {/* Message Alert */}
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}>
            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Plan Cards */}
        <div className="space-y-4">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const status = getPlanStatus(plan.level);
            const isCurrent = status === 'current';
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`border-border/50 transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-primary/50 shadow-lg' : ''
                } ${isCurrent ? 'border-primary/50 bg-primary/5' : ''}`}>
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
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                Popular
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge variant="secondary">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">{plan.price}</span>
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
                      
                      {plan.notIncluded.length > 0 && (
                        <div className="pt-2 border-t border-border/50 space-y-2">
                          {plan.notIncluded.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 opacity-50">
                              <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button
                      className={`w-full ${
                        isCurrent
                          ? 'bg-muted text-muted-foreground cursor-default'
                          : status === 'upgrade'
                          ? `bg-gradient-to-r ${plan.color} hover:opacity-90 text-white shadow-lg`
                          : 'bg-muted hover:bg-muted/80'
                      } transition-all duration-300`}
                      onClick={() => handleSelectPlan(plan.level)}
                      disabled={isCurrent || upgrading}
                    >
                      {upgrading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <>
                          {status === 'upgrade' && <Sparkles className="h-4 w-4 mr-2" />}
                          {getButtonText(plan.level)}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Free Tier Notice */}
        {currentLevel === SUBSCRIPTION_LEVELS.FREE && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-700 dark:text-amber-400">Free Plan Limitations</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can record samples and view real-time metrics, but samples won't be saved. 
                      Upgrade to Basic to save your data, access AI analysis, and create a machine hierarchy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Can I change plans later?</p>
                <p className="text-xs text-muted-foreground">
                  Yes, you can upgrade or downgrade at any time. Changes take effect immediately.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">What happens to my data if I downgrade?</p>
                <p className="text-xs text-muted-foreground">
                  Your data is retained but access to premium features will be limited. 
                  If you exceed machine limits, you won't be able to add new machines.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Is there a trial period?</p>
                <p className="text-xs text-muted-foreground">
                  The Free plan lets you try recording and viewing metrics. 
                  Paid plans have a 7-day money-back guarantee.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
