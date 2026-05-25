import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, 
  Coins, 
  TrendingUp, 
  Sparkles, 
  CheckCircle, 
  Sliders, 
  Layers, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateProfile, setCategoryLimit, stats, fetchStats, currencySymbol } = useApp();

  // Profile forms state
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [budget, setBudget] = useState('2000');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Category limits state
  const [category, setCategory] = useState('Food');
  const [limitAmount, setLimitAmount] = useState('');
  const [settingLimit, setSettingLimit] = useState(false);
  const [limitSuccess, setLimitSuccess] = useState('');

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Investments', 'Other'];
  const currencies = [
    { value: 'USD', label: 'USD ($) - US Dollar' },
    { value: 'EUR', label: 'EUR (€) - Euro' },
    { value: 'GBP', label: 'GBP (£) - British Pound' },
    { value: 'INR', label: 'INR (₹) - Indian Rupee' },
    { value: 'JPY', label: 'JPY (¥) - Japanese Yen' },
    { value: 'CAD', label: 'CAD (C$) - Canadian Dollar' }
  ];

  // Pre-fill profile forms when user mounts
  useEffect(() => {
    if (user) {
      setName(user.name);
      setCurrency(user.currencyPreference);
      setBudget(user.monthlyBudget.toString());
    }
    fetchStats();
  }, [user]);

  // Handle Profile Update submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !budget) return;

    setUpdatingProfile(true);
    setProfileSuccess('');

    const success = await updateProfile(name, currency, parseFloat(budget) || 0);
    setUpdatingProfile(false);

    if (success) {
      setProfileSuccess('Profile preferences updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } else {
      alert('Failed to update profile.');
    }
  };

  // Handle Category Budget Limit submit
  const handleSetLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limitAmount) return;

    setSettingLimit(true);
    setLimitSuccess('');

    const success = await setCategoryLimit(category, parseFloat(limitAmount) || 0);
    setSettingLimit(false);

    if (success) {
      setLimitSuccess(`Spending limit for "${category}" set successfully!`);
      setLimitAmount('');
      setTimeout(() => setLimitSuccess(''), 4000);
    } else {
      alert('Failed to record category limit.');
    }
  };

  // Map category totals for budget items breakdown progress bars
  const getCategorySpent = (catName: string) => {
    if (!stats || !stats.categoryTotals) return 0;
    const cat = stats.categoryTotals.find(c => c.category === catName);
    return cat ? cat.amount : 0;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Profile & Limits</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Configure profile metrics, multi-currencies, and category budget ceilings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Side: General Profile settings */}
        <div className="space-y-6">
          
          <div className="glass-card rounded-3xl border border-slate-200/40 dark:border-slate-800/40 p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-850 pb-3">
              <Sliders className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <h3 className="font-extrabold text-sm">General Profile Settings</h3>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-2xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 text-brand-800 dark:text-brand-300 text-xs font-semibold flex items-center space-x-2 leading-none">
                <CheckCircle className="h-4.5 w-4.5 text-brand-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">User Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Preferred Currency</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Coins className="h-4 w-4" />
                    </div>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none appearance-none focus:ring-1 focus:ring-brand-500"
                    >
                      {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monthly Budget cap</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-500"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 flex items-center space-x-1.5"
                >
                  {updatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Update Profile</span>}
                </button>
              </div>
            </form>
          </div>

          {/* Category Budget setup Form */}
          <div className="glass-card rounded-3xl border border-slate-200/40 dark:border-slate-800/40 p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-850 pb-3">
              <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-sm">Category Spending Limits</h3>
            </div>

            {limitSuccess && (
              <div className="p-3.5 rounded-2xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 text-brand-800 dark:text-brand-300 text-xs font-semibold flex items-center space-x-2 leading-none">
                <CheckCircle className="h-4.5 w-4.5 text-brand-600" />
                <span>{limitSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSetLimit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Budget Ceiling Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                      {currencySymbol}
                    </div>
                    <input
                      type="number"
                      value={limitAmount}
                      onChange={(e) => setLimitAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-500"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={settingLimit}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
                >
                  {settingLimit ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Set Ceiling</span>}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Side: Active category budgets and progress visualizers */}
        <div className="glass-card rounded-3xl border border-slate-200/40 dark:border-slate-800/40 p-6 space-y-4 shadow-sm min-h-[400px]">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-850 pb-3">
            <Sparkles className="h-5 w-5 text-amber-500 pulse-glow" />
            <h3 className="font-extrabold text-sm">Active Category Ceilings</h3>
          </div>

          {stats?.budgets && stats.budgets.length > 0 ? (
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {stats.budgets.map((b) => {
                const spent = getCategorySpent(b.category);
                const progress = b.limitAmount > 0 ? Math.min(Math.round((spent / b.limitAmount) * 100), 100) : 0;
                
                return (
                  <div key={b.category} className="space-y-1.5 p-3.5 bg-slate-50/50 dark:bg-darkBg-750/30 rounded-2xl border border-slate-200/30 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center font-bold text-[11px]">
                      <span className="text-slate-800 dark:text-slate-200">{b.category} Limit</span>
                      <span className={`${spent > b.limitAmount ? 'text-red-650 dark:text-red-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>
                        {progress}% Spent
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-darkBg-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          spent > b.limitAmount ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>Spent: {currencySymbol}{spent.toFixed(2)}</span>
                      <span>Ceiling: {currencySymbol}{b.limitAmount.toFixed(2)}</span>
                    </div>

                    {spent > b.limitAmount && (
                      <div className="flex items-center space-x-1 text-[9px] text-red-650 dark:text-red-400 font-bold mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Ceiling Exceeded by {currencySymbol}{(spent - b.limitAmount).toFixed(2)}!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center">
              <Layers className="h-10 w-10 text-slate-350 dark:text-slate-700 mb-2" />
              <span className="text-xs font-bold text-slate-500">No Category Limits defined</span>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-normal">
                Define ceiling amounts on the left. We will audit your expenditures and render gauges.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
