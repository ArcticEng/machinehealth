import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle } from 'lucide-react';
import React from 'react';
import { type Screen } from '../constants/navigation';

interface ProcessingScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function ProcessingScreen({ onNavigate }: ProcessingScreenProps) {
  useEffect(() => {
    // Simulate processing time
    const timer = setTimeout(() => {
      onNavigate('success');
    }, 3000);

    return () => clearTimeout(timer);
  }, [onNavigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-accent/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-8 max-w-sm"
      >
        {/* Animated Icon */}
        <motion.div
          className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Zap className="h-10 w-10 text-white" />
        </motion.div>

        {/* Text Content */}
        <div className="space-y-4">
          <motion.h1 
            className="text-2xl font-semibold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Processing Your Subscription
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            We're setting up your Pro plan and activating all the premium features. This won't take long!
          </motion.p>
        </div>

        {/* Progress Animation */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="space-y-2">
            {[
              'Validating payment method',
              'Activating premium features',
              'Setting up AI insights',
              'Finalizing your account'
            ].map((step, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 text-sm"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{ 
                  delay: 1 + (index * 0.5),
                  duration: 0.3
                }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-purple-500 flex items-center justify-center"
                  animate={{ 
                    borderColor: ['#a855f7', '#10b981'],
                    backgroundColor: ['transparent', '#10b981']
                  }}
                  transition={{ 
                    delay: 1 + (index * 0.5),
                    duration: 0.3
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      delay: 1.3 + (index * 0.5),
                      duration: 0.2
                    }}
                  >
                    <CheckCircle className="h-3 w-3 text-white" />
                  </motion.div>
                </motion.div>
                <span className="text-muted-foreground">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Loading Spinner */}
        <motion.div
          className="mx-auto w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <motion.p 
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Please don't close this screen while we process your request
        </motion.p>
      </motion.div>
    </div>
  );
}