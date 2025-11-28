import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { setuApi } from '../api';

export function SetuCallback({ onContinue }: { onContinue?: () => void }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your bank connection...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const consentId = urlParams.get('id');

        if (success !== 'true' || !consentId) {
          throw new Error('Consent was not approved or consent ID is missing');
        }

        // Get user ID from localStorage
        const userId = localStorage.getItem('pendingConsentUserId');
        if (!userId) {
          throw new Error('User session not found. Please try logging in again.');
        }

        // Clear the stored user ID
        localStorage.removeItem('pendingConsentUserId');

        // Update consent status to ACTIVE in Firestore with comprehensive data
        const comprehensiveConsentData: Record<string, unknown> = {
          userId,
          status: 'ACTIVE',
          approvedAt: new Date().toISOString(),
          callbackData: {
            success: urlParams.get('success'),
            id: consentId
          }
        };

        try {
          // Get consent details from Setu API
          const consentDetailsResponse = await setuApi.getConsentStatus(consentId);
          console.log('Consent details:', consentDetailsResponse);

          if (consentDetailsResponse.success) {
            comprehensiveConsentData.consentDetails = consentDetailsResponse.data;
          }

          // Try to fetch transaction data (might not be immediately available)
          try {
            const response = await setuApi.fetchTransactions(consentId, userId);
            console.log('Fetch transactions response:', response);

            if (response.success && response.data) {
              // Save account and transaction data if available
              comprehensiveConsentData.accountsData = response.data;
              setStatus('success');
              setMessage('Your bank account has been successfully connected! Your transaction data has been synced.');
            } else {
              // Data not ready yet, but consent was successful
              setStatus('success');
              setMessage('Your bank account has been successfully connected! Your transaction data will be available shortly.');
            }
          } catch (fetchError) {
            console.warn('Could not fetch transaction data immediately:', fetchError);
            // Still show success since consent was approved
            setStatus('success');
            setMessage('Your bank account has been successfully connected! Your transaction data will be available shortly.');
          }

          await setuApi.updateConsentStatus(consentId, userId, 'ACTIVE', comprehensiveConsentData);
          console.log('Consent status updated to ACTIVE with comprehensive data');
        } catch (updateError) {
          console.warn('Could not update consent status:', updateError);
          // Continue anyway - the consent was successful
          setStatus('success');
          setMessage('Your bank account has been successfully connected! Your transaction data will be available shortly.');
        }

      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      }
    };

    handleCallback();
  }, []);

  const handleContinue = () => {
    // Redirect back to home/dashboard
    if (onContinue) {
      onContinue()
    } else {
      window.location.href = '/'; // Or use navigation if using router
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connecting Your Account</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Connected!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={handleContinue} className="w-full">
              Continue to FinPath
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connection Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={handleContinue} variant="outline" className="w-full">
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}