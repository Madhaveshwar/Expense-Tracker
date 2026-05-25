import React, { useState } from 'react';
import { useApp, AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Ledger } from './pages/Ledger';
import { Scanner } from './pages/Scanner';
import { Assistant } from './pages/Assistant';
import { Settings } from './pages/Settings';
import { Loader2, Wallet } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loadingAuth } = useApp();
  const [activePage, setActivePage] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // 1. Initial Authentication Loading Screen
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-darkBg-900 transition-colors duration-300">
        <div className="bg-brand-600 text-white p-3.5 rounded-2xl shadow-xl shadow-brand-500/15 mb-4 animate-pulse">
          <Wallet className="h-7 w-7" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-brand-600 mb-2" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Syncing Safe Ledgers...
        </span>
      </div>
    );
  }

  // 2. Unauthenticated Views (Login / Register)
  if (!user) {
    return authView === 'login' ? (
      <Login onNavigateToRegister={() => setAuthView('register')} />
    ) : (
      <Register onNavigateToLogin={() => setAuthView('login')} />
    );
  }

  // 3. Authenticated App Pages Layout Routing
  const renderActivePage = () => {
    switch (activePage) {
      case 'ledger':
        return <Ledger />;
      case 'scanner':
        return <Scanner />;
      case 'assistant':
        return <Assistant />;
      case 'settings':
        return <Settings />;
      case 'dashboard':
      default:
        return (
          <Dashboard 
            onNavigateToLedger={() => setActivePage('ledger')} 
            onNavigateToScanner={() => setActivePage('scanner')} 
          />
        );
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderActivePage()}
    </Layout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
