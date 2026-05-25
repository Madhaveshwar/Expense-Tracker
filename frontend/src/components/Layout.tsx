import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  ReceiptText, 
  ScanLine, 
  MessageSquareCode, 
  Settings as SettingsIcon, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Wallet, 
  Sparkles,
  TrendingDown
} from 'lucide-react';

interface LayoutProps {
  activePage: string;
  setActivePage: (page: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activePage, setActivePage, children }) => {
  const { user, logout, isDarkMode, toggleDarkMode, currencySymbol, stats } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'ledger', name: 'Ledger', icon: ReceiptText },
    { id: 'scanner', name: 'Receipt Scanner', icon: ScanLine, highlight: true },
    { id: 'assistant', name: 'AI Assistant', icon: MessageSquareCode },
    { id: 'settings', name: 'Profile & Limits', icon: SettingsIcon },
  ];

  const budgetUsedPercent = stats && stats.monthlyBudget > 0
    ? Math.min(Math.round((stats.totalSpent / stats.monthlyBudget) * 100), 100)
    : 0;

  const handleNav = (pageId: string) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-darkBg-900 transition-colors duration-300">
      
      {/* 1. Mobile Topbar Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-darkBg-800 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors duration-300">
        <div className="flex items-center space-x-2">
          <div className="bg-brand-600 text-white p-1.5 rounded-lg">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
            FinAI Ledger
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-slate-100 dark:bg-darkBg-700 text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-darkBg-700 text-slate-600 dark:text-slate-300"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. Mobile Nav Drawer Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex transition-opacity duration-300">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Card */}
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white dark:bg-darkBg-850 h-full p-6 shadow-2xl transition-transform duration-300 transform translate-x-0 border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
                  FinAI Ledger
                </span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-darkBg-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="space-y-2 flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive 
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                        : item.highlight
                          ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-darkBg-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : item.highlight ? 'text-brand-500' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.highlight && <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />}
                  </button>
                );
              })}
            </nav>

            {/* Bottom Actions profile panel */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3 mb-4 px-2">
                <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-sm truncate">{user?.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm font-medium transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop Permanent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-darkBg-800 border-r border-slate-200 dark:border-slate-800 p-6 sticky top-0 h-screen transition-colors duration-300 shadow-sm z-20">
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="bg-brand-600 text-white p-2 rounded-xl shadow-md shadow-brand-500/20">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
              FinAI Ledger
            </span>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">PRO EDITION</div>
          </div>
        </div>

        {/* Sidebar Nav menu links */}
        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25 scale-[1.02]' 
                    : item.highlight
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 hover:bg-brand-100 dark:hover:bg-brand-950/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-darkBg-750'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : item.highlight ? 'text-brand-500' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.highlight && <Sparkles className="h-4 w-4 text-amber-500 pulse-glow" />}
              </button>
            );
          })}
        </nav>

        {/* Desktop Sidebar Bottom widget (Compact Budget Progress bar) */}
        {stats && stats.monthlyBudget > 0 && (
          <div className="my-6 p-4 bg-slate-50 dark:bg-darkBg-750 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors">
            <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-brand-500" /> Month Budget
              </span>
              <span>{budgetUsedPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-darkBg-600 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUsedPercent >= 90 
                    ? 'bg-red-500' 
                    : budgetUsedPercent >= 75 
                      ? 'bg-amber-500' 
                      : 'bg-brand-600'
                }`}
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
              <span>{currencySymbol}{stats.totalSpent.toFixed(0)}</span>
              <span>{currencySymbol}{stats.monthlyBudget.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Desktop Profile bottom panel */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-xs truncate leading-tight">{user?.name}</h4>
                <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user?.email}</p>
              </div>
            </div>
            
            <button 
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-darkBg-700 text-slate-500 dark:text-slate-400 hover:scale-105 transition-transform"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button 
            onClick={logout}
            className="w-full flex items-center space-x-2 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* 4. Main Contents Area Layout */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-8 animate-[fadeIn_0.3s_ease-out]">
          {children}
        </div>
      </main>
      
    </div>
  );
};
