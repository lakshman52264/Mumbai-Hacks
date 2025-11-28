import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Building2, Shield, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { setuApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export function GetStarted() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkBank = async () => {
    if (!user) {
      setError('Please log in to continue');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get user's mobile number (you might need to add this to user profile)
      const mobile = user.phoneNumber || '6364732782'; // Default for demo

      console.log('Initiating consent for mobile:', mobile);
      const response = await setuApi.initiateConsent(mobile, user.uid);
      console.log('API Response:', response);
      console.log('Response success:', response.success);
      console.log('Response data:', response.data);

      if (response.success && response.data) {
        console.log('Consent URL:', response.data.consentUrl);
        // Store user ID for callback
        localStorage.setItem('pendingConsentUserId', user.uid);
        // Redirect to Setu consent URL
        window.location.href = response.data.consentUrl;
      } else {
        console.error('API Error:', response.error);
        setError(response.error || 'Failed to initiate bank linking');
      }
    } catch (err) {
      console.error('Exception:', err);
      setError('An unexpected error occurred');
      console.error('Bank linking error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  const features = [
    {
      icon: Building2,
      title: 'Connect Your Banks',
      description: 'Securely link your bank accounts to automatically track transactions',
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your data is encrypted and never stored on our servers',
    },
    {
      icon: Zap,
      title: 'Smart Insights',
      description: 'Get AI-powered insights to optimize your spending and savings',
    },
  ];

  const steps = [
    'Choose your bank from our supported list',
    'Enter your account details securely',
    'Authorize FinPath to access your transaction data',
    'Start getting personalized financial insights',
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-3xl font-bold text-[#4F46E5]">₹</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to FinPath</h1>
          <p className="text-white/90 text-lg max-w-2xl mx-auto">
            Take control of your finances with AI-powered insights. Connect your bank accounts to get started.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 text-center bg-white/10 backdrop-blur-sm border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/80 text-sm">{feature.description}</p>
              </Card>
            );
          })}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-8 bg-white">
            <h2 className="text-2xl font-bold text-[#1F2937] mb-6 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-sm font-semibold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-gray-700">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <Button
            onClick={handleLinkBank}
            disabled={isLoading}
            size="lg"
            className="bg-white text-[#4F46E5] hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Plus className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Connecting...' : 'Connect Your First Bank Account'}
          </Button>
          <p className="text-white/80 text-sm mt-4">
            It's free and takes less than 2 minutes
          </p>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-6 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>RBI Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>GDPR Compliant</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}