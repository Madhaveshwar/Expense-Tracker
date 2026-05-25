import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wallet, Mail, Lock, Loader2, LogIn as LogInIcon, Sparkles } from 'lucide-react';

interface LoginProps {
  onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToRegister }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return setError('Please enter both email and password.');
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('demo@example.com');
    setPassword('demo123');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkBg-900 px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background visual circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-gradient-to-tr from-brand-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-xl shadow-brand-500/15 mb-4">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access your AI-powered financial companion
          </p>
        </div>

        {/* Form Card wrapper */}
        <div className="glass-card rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 p-8">
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Password
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
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-brand-600 hover:bg-brand-500 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-brand-500/20"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogInIcon className="h-4.5 w-4.5" />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill button */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 bg-slate-50 dark:bg-darkBg-900 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider transition-colors duration-300">
              OR TEST DEMO
            </span>
          </div>

          <button
            onClick={handleDemoFill}
            type="button"
            className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-darkBg-750 dark:hover:bg-darkBg-700 text-slate-700 dark:text-slate-350 rounded-2xl font-bold text-xs transition-colors border border-transparent dark:border-slate-800"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Auto-fill Demo Credentials</span>
          </button>
        </div>

        {/* Footer Navigation */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 font-semibold">
          Don't have an account?{' '}
          <button 
            onClick={onNavigateToRegister}
            className="text-brand-600 dark:text-brand-400 hover:underline font-bold"
          >
            Sign up now
          </button>
        </p>

      </div>
    </div>
  );
};
