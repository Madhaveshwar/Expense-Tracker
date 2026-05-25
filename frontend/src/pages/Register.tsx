import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wallet, Mail, Lock, User, Coins, TrendingUp, Loader2, UserPlus } from 'lucide-react';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigateToLogin }) => {
  const { register } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [budget, setBudget] = useState('2000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      return setError('Name, email, and password are required.');
    }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, currency, parseFloat(budget) || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkBg-900 px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Visual background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg z-10 py-8">
        
        {/* Logo and title */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-gradient-to-tr from-brand-600 to-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-brand-500/15 mb-3">
            <Wallet className="h-7 w-7" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Create your account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build smarter budget habits using Gemini AI
          </p>
        </div>

        {/* Form Card container */}
        <div className="glass-card rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 p-8">
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-darkBg-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Row 2: Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-darkBg-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Row 3: Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-darkBg-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="•••••••• (Min. 6 characters)"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {/* Row 4: Preferences (Split grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Currency Preference
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Coins className="h-4.5 w-4.5" />
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-darkBg-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                    <option value="CAD">CAD (C$) - Canadian Dollar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Monthly Budget Limit
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <TrendingUp className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-darkBg-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="2000"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-brand-600 hover:bg-brand-500 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-brand-500/25 mt-4"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4.5 w-4.5" />
                  <span>Register Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Login swap */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 font-semibold">
          Already have an account?{' '}
          <button 
            onClick={onNavigateToLogin}
            className="text-brand-600 dark:text-brand-400 hover:underline font-bold"
          >
            Log in here
          </button>
        </p>

      </div>
    </div>
  );
};
