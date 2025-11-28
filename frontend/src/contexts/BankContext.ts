import { useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import { useAuth } from './AuthContext';

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: 'savings' | 'current';
  balance: number;
  connectedAt: Date;
  setuAccountId?: string;
  isActive: boolean;
}

export interface Transaction {
  id: string
  accountId: string
  date: Date
  type: 'credit' | 'debit'
  merchant: string
  category: string
  amount: number
  description?: string
  refinedMerchant?: string
  aiInsights?: string
  confidenceScore?: number
  setuTransactionId?: string
  setuData?: {
    amount: string
    currentBalance?: string
    mode?: string
    narration: string
    reference: string
    transactionTimestamp: string
    txnId: string
    type: string
    valueDate: string
  }
}

export interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  insights: Array<{
    icon: string;
    text: string;
    type: 'success' | 'warning';
  }>;
}

export const useBank = () => {
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveConsent, setHasActiveConsent] = useState(false);

  const hasBankAccounts = bankAccounts.length > 0;

  const loadBankAccounts = async () => {
    setBankAccounts([]);
  };

  const loadTransactions = async () => {
    if (!user) return;

    try {
      console.log('Loading transactions for user:', user.uid);
      // Load transactions from backend API instead of directly from Firestore
      const { setuApi } = await import('../api');
      const response = await setuApi.getTransactions(user.uid);
      
      if (response.success && response.data) {
        console.log('Loaded transactions from API:', response.data.length);
        // Convert API response to Transaction format
        const txns: Transaction[] = response.data.map((txn: any) => ({
          id: txn.id,
          accountId: txn.accountId || '',
          date: new Date(txn.date),
          type: txn.type,
          merchant: txn.refined_merchant || txn.merchant || txn.description || 'Unknown',
          refinedMerchant: txn.refined_merchant,
          category: txn.category || 'other',
          amount: txn.amount,
          description: txn.description,
          aiInsights: txn.ai_insights,
          confidenceScore: typeof txn.confidence_score === 'number'
            ? txn.confidence_score
            : typeof txn.confidenceScore === 'number'
              ? txn.confidenceScore
              : undefined,
          setuTransactionId: txn.setuTransactionId,
          setuData: txn.setuData
        }));
        console.log('Converted transactions:', txns.length);
        setTransactions(txns);
      } else {
        console.log('No transactions found in API response');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const checkActiveConsents = async () => {
    if (!user) return;

    try {
      // Import setuApi here to avoid circular dependency
      const { setuApi } = await import('../api');
      const response = await setuApi.getUserConsents(user.uid);
      
      if (response.success && response.data) {
        const activeConsents = response.data.filter((consent: any) => consent.status === 'ACTIVE');
        setHasActiveConsent(activeConsents.length > 0);
      }
    } catch (error) {
      console.error('Error checking active consents:', error);
    }
  };

  const calculateFinancialData = () => {
    if (transactions.length === 0) {
      setFinancialData(null);
      return;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTxns = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
    });

    const totalIncome = monthlyTxns
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthlyTxns
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSavings = totalIncome - totalExpenses;

    // Calculate monthly data for the last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthTxns = transactions.filter(t => {
        const txnDate = new Date(t.date);
        return txnDate.getMonth() === date.getMonth() && txnDate.getFullYear() === date.getFullYear();
      });

      const income = monthTxns.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTxns.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        income,
        expense,
      });
    }

    // Calculate category data
    const categoryMap = new Map<string, number>();
    monthlyTxns.filter(t => t.type === 'debit').forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });

    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const categoryData = Array.from(categoryMap.entries()).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));

    // Generate insights
    const insights = [];
    if (totalSavings > 0) {
      insights.push({
        icon: '💰',
        text: `Great job! You've saved ₹${totalSavings.toLocaleString()} this month`,
        type: 'success' as const,
      });
    }

    if (totalExpenses > totalIncome * 0.8) {
      insights.push({
        icon: '⚠️',
        text: 'Your expenses are getting close to your income. Consider reviewing your budget.',
        type: 'warning' as const,
      });
    }

    const diningExpenses = monthlyTxns
      .filter(t => t.category.toLowerCase().includes('dining') && t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    if (diningExpenses > 5000) {
      insights.push({
        icon: '🍽️',
        text: `You've spent ₹${diningExpenses.toLocaleString()} on dining this month`,
        type: 'warning' as const,
      });
    }

    setFinancialData({
      totalIncome,
      totalExpenses,
      totalSavings,
      monthlyData,
      categoryData,
      insights,
    });
  };

  const addBankAccount = async () => {};

  const removeBankAccount = async () => {};

  const refreshData = async () => {
    await Promise.all([loadBankAccounts(), loadTransactions(), checkActiveConsents()]);
  };

  useEffect(() => {
    if (user) {
      refreshData().finally(() => setLoading(false));
    } else {
      setBankAccounts([]);
      setTransactions([]);
      setFinancialData(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    calculateFinancialData();
  }, [transactions]);

  return { user: user as User | null, bankAccounts, transactions, financialData, loading, addBankAccount, removeBankAccount, refreshData, hasBankAccounts, hasActiveConsent };
};