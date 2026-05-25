import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config/api';

interface User {
  id: string;
  name: string;
  email: string;
  currencyPreference: string;
  monthlyBudget: number;
}

interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  merchant: string;
  paymentMethod: string;
  transactionDate: string;
  receiptImageUrl?: string;
  createdAt: string;
}

interface Budget {
  category: string;
  limitAmount: number;
}

interface Stats {
  monthlyBudget: number;
  totalSpent: number;
  currency: string;
  categoryTotals: { category: string; amount: number }[];
  budgets: Budget[];
  trends: { date: string; amount: number }[];
  recent: any[];
}

interface AiInsights {
  insights: string[];
  summary: string;
  anomalies: { id: string; merchant: string; amount: number; category: string; reason: string }[];
}

interface AppContextType {
  user: User | null;
  token: string | null;
  currencySymbol: string;
  isDarkMode: boolean;
  expenses: Expense[];
  stats: Stats | null;
  aiInsights: AiInsights | null;
  loadingAuth: boolean;
  loadingExpenses: boolean;
  loadingStats: boolean;
  loadingInsights: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, currency: string, budget: number) => Promise<void>;
  logout: () => void;
  toggleDarkMode: () => void;
  fetchExpenses: (filters?: any) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchInsights: (force?: boolean) => Promise<void>;
  addExpenseItem: (data: any) => Promise<{ success: boolean; data?: any; aiSuggestions?: any; error?: string }>;
  editExpenseItem: (id: string, data: any) => Promise<boolean>;
  deleteExpenseItem: (id: string) => Promise<boolean>;
  updateProfile: (name: string, currency: string, budget: number) => Promise<boolean>;
  setCategoryLimit: (category: string, limitAmount: number) => Promise<boolean>;
  apiCall: (url: string, method?: string, body?: any, isBlob?: boolean) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('expense_tracker_token'));
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('dark_mode') === 'true');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Initialize Auth state from LocalStorage token
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser({
              id: data.id,
              name: data.name,
              email: data.email,
              currencyPreference: data.currencyPreference,
              monthlyBudget: data.monthlyBudget
            });
          } else {
            logout();
          }
        } catch (err) {
          console.error('Auth verification error:', err);
          logout();
        }
      }
      setLoadingAuth(false);
    }
    checkAuth();
  }, [token]);

  // Sync Dark Mode state to standard document body class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('dark_mode', 'true');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // General Fetch API Wrapper
  const apiCall = async (url: string, method = 'GET', body: any = null, isBlob = false) => {
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body && !isBlob) {
      headers['Content-Type'] = 'application/json';
    }

    const options: any = { method, headers };
    if (body) {
      options.body = isBlob ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}/api${url}`, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errData.error || 'Server error');
    }

    if (options.headers['Content-Type'] === undefined && method === 'GET' && url.includes('/export/')) {
      return res.text(); // Return CSV string directly
    }

    return res.json();
  };

  const login = async (email: string, password: string) => {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    localStorage.setItem('expense_tracker_token', data.token);
    setToken(data.token);
    setUser({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      currencyPreference: data.user.currencyPreference,
      monthlyBudget: data.user.monthlyBudget
    });
  };

  const register = async (name: string, email: string, password: string, currency: string, budget: number) => {
    const data = await apiCall('/auth/signup', 'POST', {
      name,
      email,
      password,
      currencyPreference: currency,
      monthlyBudget: budget
    });
    localStorage.setItem('expense_tracker_token', data.token);
    setToken(data.token);
    setUser({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      currencyPreference: data.user.currencyPreference,
      monthlyBudget: data.user.monthlyBudget
    });
  };

  const logout = () => {
    localStorage.removeItem('expense_tracker_token');
    setToken(null);
    setUser(null);
    setExpenses([]);
    setStats(null);
    setAiInsights(null);
  };

  const fetchExpenses = async (filters: any = {}) => {
    if (!token) return;
    setLoadingExpenses(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const data = await apiCall(`/expenses?${params.toString()}`);
      setExpenses(data.expenses);
    } catch (err) {
      console.error('Fetch expenses failed:', err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const data = await apiCall('/insights/dashboard');
      setStats(data);
    } catch (err) {
      console.error('Fetch stats failed:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchInsights = async (force = false) => {
    if (!token) return;
    if (aiInsights && !force) return;
    setLoadingInsights(true);
    try {
      const data = await apiCall('/insights/insights');
      setAiInsights(data);
    } catch (err) {
      console.error('Fetch insights failed:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const addExpenseItem = async (data: any) => {
    try {
      const resData = await apiCall('/expenses', 'POST', data);
      setExpenses(prev => [resData.expense, ...prev]);
      await fetchStats(); // Refresh dashboard numbers
      if (aiInsights) {
        await fetchInsights(true); // Refetch AI insights on new data
      }
      return { success: true, data: resData.expense, aiSuggestions: resData.aiSuggestions };
    } catch (err: any) {
      console.error('Add expense failed:', err.message);
      return { success: false, error: err.message };
    }
  };

  const editExpenseItem = async (id: string, data: any) => {
    try {
      const resData = await apiCall(`/expenses/${id}`, 'PUT', data);
      setExpenses(prev => prev.map(e => e.id === id ? resData.expense : e));
      await fetchStats();
      if (aiInsights) {
        await fetchInsights(true);
      }
      return true;
    } catch (err) {
      console.error('Edit expense failed:', err);
      return false;
    }
  };

  const deleteExpenseItem = async (id: string) => {
    try {
      await apiCall(`/expenses/${id}`, 'DELETE');
      setExpenses(prev => prev.filter(e => e.id !== id));
      await fetchStats();
      if (aiInsights) {
        await fetchInsights(true);
      }
      return true;
    } catch (err) {
      console.error('Delete expense failed:', err);
      return false;
    }
  };

  const updateProfile = async (name: string, currency: string, budget: number) => {
    try {
      const data = await apiCall('/auth/me', 'PUT', { name, currencyPreference: currency, monthlyBudget: budget });
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        currencyPreference: data.currencyPreference,
        monthlyBudget: data.monthlyBudget
      });
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Update profile failed:', err);
      return false;
    }
  };

  const setCategoryLimit = async (category: string, limitAmount: number) => {
    try {
      await apiCall('/insights/budget', 'POST', { category, limitAmount });
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Set category budget limit failed:', err);
      return false;
    }
  };

  // Helper currency translator
  const getCurrencySymbol = (pref: string) => {
    switch (pref) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'INR': return '₹';
      case 'JPY': return '¥';
      case 'CAD': return 'C$';
      default: return '$';
    }
  };

  const currencySymbol = user ? getCurrencySymbol(user.currencyPreference) : '$';

  return (
    <AppContext.Provider value={{
      user,
      token,
      currencySymbol,
      isDarkMode,
      expenses,
      stats,
      aiInsights,
      loadingAuth,
      loadingExpenses,
      loadingStats,
      loadingInsights,
      login,
      register,
      logout,
      toggleDarkMode,
      fetchExpenses,
      fetchStats,
      fetchInsights,
      addExpenseItem,
      editExpenseItem,
      deleteExpenseItem,
      updateProfile,
      setCategoryLimit,
      apiCall
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an AppProvider');
  return context;
};
