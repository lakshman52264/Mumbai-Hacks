// API Configuration and Endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SetuConsentResponse {
  consentId: string;
  consentUrl: string;
  status: string;
}

export interface SetuWebhookData {
  consentId: string;
  status: string;
  accounts?: any[];
  transactions?: any[];
}

export interface TransactionData {
  id: string;
  amount: number;
  category: string;
  type: 'credit' | 'debit';
  timestamp: string;
  source: string;
  description?: string;
  merchant?: string;
  refined_merchant?: string;
  ai_insights?: string;
  confidence_score?: number;
  confidenceScore?: number;
  accountId?: string;
  date?: string;
}

export interface AccountData {
  id: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: string;
  balance: number;
}

// Generic API call function
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Setu Integration APIs
export const setuApi = {
  // Initiate consent for bank linking
  initiateConsent: async (mobile: string, userId?: string): Promise<ApiResponse<SetuConsentResponse>> => {
    return apiCall<SetuConsentResponse>('/setu/initiate-consent', {
      method: 'POST',
      body: JSON.stringify({ mobile, userId }),
    });
  },

  // Fetch transactions for a consent
  fetchTransactions: async (consentId: string, userId: string, fromDate?: string): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams({ user_id: userId });
    if (fromDate) {
      params.append('from_date', fromDate);
    }
    return apiCall(`/setu/fetch-transactions/${consentId}?${params.toString()}`, {
      method: 'GET',
    });
  },

  // Get consent status
  getConsentStatus: async (consentId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/setu/consent-status/${consentId}`, {
      method: 'GET',
    });
  },

  // Update consent status
  updateConsentStatus: async (consentId: string, userId: string, status: string, additionalData?: any): Promise<ApiResponse<any>> => {
    const data = { userId, status, ...additionalData };
    return apiCall(`/setu/consent-status/${consentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Get user consents
  getUserConsents: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiCall(`/users/${userId}/consents`, {
      method: 'GET',
    });
  },

  // Get user accounts
  getAccounts: async (userId: string): Promise<ApiResponse<AccountData[]>> => {
    return apiCall(`/users/${userId}/accounts`, {
      method: 'GET',
    });
  },

  // Get user transactions
  getTransactions: async (userId: string): Promise<ApiResponse<TransactionData[]>> => {
    return apiCall(`/users/${userId}/transactions`, {
      method: 'GET',
    });
  },
};

// User Management APIs
export const userApi = {
  // Get user profile
  getProfile: async (userId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/profile`, {
      method: 'GET',
    });
  },

  // Update user profile
  updateProfile: async (userId: string, profileData: any): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Financial Goals APIs
export const goalsApi = {
  // Get user goals
  getGoals: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiCall(`/users/${userId}/goals`, {
      method: 'GET',
    });
  },

  // Create new goal
  createGoal: async (userId: string, goalData: any): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/goals`, {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  },

  // Update goal
  updateGoal: async (userId: string, goalId: string, goalData: any): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  },

  // Delete goal
  deleteGoal: async (userId: string, goalId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/goals/${goalId}`, {
      method: 'DELETE',
    });
  },

  // Confirm payment for goal
  confirmPayment: async (userId: string, goalId: string, dueDate: string, amount: number): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/goals/${goalId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ due_date: dueDate, amount }),
    });
  },
};

// AI Coach APIs
export const aiCoachApi = {
  // Get AI insights
  getInsights: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiCall(`/users/${userId}/insights`, {
      method: 'GET',
    });
  },

  // Ask AI coach a question
  askQuestion: async (userId: string, question: string): Promise<ApiResponse<any>> => {
    return apiCall('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ userId, question }),
    });
  },

  // Get personalized recommendations
  getRecommendations: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiCall(`/users/${userId}/recommendations`, {
      method: 'GET',
    });
  },
};

// Reminders APIs
export const remindersApi = {
  // Get user reminders
  getReminders: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiCall(`/users/${userId}/reminders`, {
      method: 'GET',
    });
  },

  // Create reminder
  createReminder: async (userId: string, reminderData: any): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });
  },

  // Update reminder
  updateReminder: async (userId: string, reminderId: string, reminderData: any): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/reminders/${reminderId}`, {
      method: 'PUT',
      body: JSON.stringify(reminderData),
    });
  },

  // Delete reminder
  deleteReminder: async (userId: string, reminderId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/reminders/${reminderId}`, {
      method: 'DELETE',
    });
  },
};

// Analytics APIs
export const analyticsApi = {
  // Get financial summary
  getSummary: async (userId: string, period: string = 'month'): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/analytics/summary?period=${period}`, {
      method: 'GET',
    });
  },

  // Get spending by category
  getSpendingByCategory: async (userId: string, period: string = 'month'): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/analytics/spending-by-category?period=${period}`, {
      method: 'GET',
    });
  },

  // Get income vs expense trend
  getIncomeExpenseTrend: async (userId: string, period: string = '6months'): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/analytics/income-expense-trend?period=${period}`, {
      method: 'GET',
    });
  },

  // Export data
  exportData: async (userId: string, format: 'csv' | 'pdf' = 'csv'): Promise<ApiResponse<any>> => {
    return apiCall(`/users/${userId}/export?format=${format}`, {
      method: 'GET',
    });
  },
};

// Utility functions
export const apiUtils = {
  // Check if API is available
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await apiCall('/health', { method: 'GET' });
      return response.success;
    } catch {
      return false;
    }
  },

  // Get API base URL
  getBaseUrl: (): string => API_BASE_URL,

  // Set auth token for requests (if needed)
  setAuthToken: (token: string) => {
    // Store token for authenticated requests
    localStorage.setItem('authToken', token);
  },

  // Get auth token
  getAuthToken: (): string | null => {
    return localStorage.getItem('authToken');
  },

  // Clear auth token
  clearAuthToken: () => {
    localStorage.removeItem('authToken');
  },
};

export default {
  setu: setuApi,
  user: userApi,
  goals: goalsApi,
  aiCoach: aiCoachApi,
  reminders: remindersApi,
  analytics: analyticsApi,
  utils: apiUtils,
};