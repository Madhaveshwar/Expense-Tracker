import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  TrendingUp as BudgetIcon, 
  Activity, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw,
  Coins,
  ArrowUpRight,
  Clock,
  HelpCircle,
  Loader2
} from 'lucide-react';

interface DashboardProps {
  onNavigateToLedger: () => void;
  onNavigateToScanner: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToLedger, onNavigateToScanner }) => {
  const { 
    currencySymbol, 
    stats, 
    fetchStats, 
    loadingStats, 
    aiInsights, 
    fetchInsights, 
    loadingInsights,
    isDarkMode
  } = useApp();

  useEffect(() => {
    fetchStats();
    fetchInsights();
  }, []);

  const handleRefresh = async () => {
    await fetchStats();
    await fetchInsights(true); // Force refetch AI insights
  };

  // Safe dashboard statistics fallbacks
  const budget = stats?.monthlyBudget || 0;
  const spent = stats?.totalSpent || 0;
  const remaining = Math.max(budget - spent, 0);
  const percentUsed = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
  
  // Format trends for Area Chart
  const trendData = stats?.trends && stats.trends.length > 0 
    ? stats.trends 
    : [
        { date: '1', amount: 0 },
        { date: '15', amount: 0 },
        { date: '30', amount: 0 }
      ];

  // Recharts color palettes
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#64748b'];

  // Map category totals for Recharts
  const pieData = stats?.categoryTotals && stats.categoryTotals.length > 0
    ? stats.categoryTotals.map(c => ({ name: c.category, value: c.amount }))
    : [{ name: 'No data', value: 1 }];

  return (
    <div className="space-y-6">
      
      {/* 1. Header greeting & Refresh controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Financial Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Real-time ledger analytics & predictive intelligence insights</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={onNavigateToScanner}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 smooth-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBg-900 transition-all"
            aria-label="Scan a new receipt to automatically record expenses"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Scan Receipt</span>
          </button>
          
          <button 
            onClick={handleRefresh}
            disabled={loadingStats || loadingInsights}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-darkBg-800 hover:bg-slate-100 dark:hover:bg-darkBg-700 text-slate-500 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBg-900"
            title="Refresh Ledger Analysis"
            aria-label="Refresh financial charts and predictive insights"
          >
            <RefreshCw className={`h-4 w-4 ${loadingStats || loadingInsights ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 2. Top-level Analytical Numeric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Spent */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Spent This Month</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold tracking-tight">{currencySymbol}{spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold ${percentUsed >= 90 ? 'bg-red-50 dark:bg-red-950/20 text-red-600' : 'bg-brand-50 dark:bg-brand-950/20 text-brand-600'}`}>
              {percentUsed}%
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-semibold">of budget consumed</span>
          </div>
        </div>

        {/* Card 2: Remaining Budget */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Available Balance</span>
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold tracking-tight">{currencySymbol}{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-brand-500 pulse-glow" />
            <span className="text-slate-400 dark:text-slate-500 font-semibold">Safe-to-spend remainder</span>
          </div>
        </div>

        {/* Card 3: Budget Set Limit */}
        <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly Limit Cap</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <BudgetIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold tracking-tight">{currencySymbol}{budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold">
            <span>Adjustable under Settings panel</span>
          </div>
        </div>

      </div>

      {/* 3. Recharts Graphical Dashboard Panel (Grid 2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Trend Area Chart (Columns: 3/5) */}
        <div className="glass-card lg:col-span-3 p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col h-[380px]">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-sm tracking-wide">30-Day Spending Timeline</h3>
          </div>

          <div className="flex-1 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1f293d' : '#f1f5f9'} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDarkMode ? '#64748b' : '#94a3b8'} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const parts = val.split('-');
                    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
                  }}
                />
                <YAxis 
                  stroke={isDarkMode ? '#64748b' : '#94a3b8'} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: isDarkMode ? '#151c2c' : '#ffffff', 
                    border: `1px solid ${isDarkMode ? '#2b384e' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    color: isDarkMode ? '#f8fafc' : '#0f172a'
                  }}
                  formatter={(val: any) => [`${currencySymbol}${Number(val || 0).toFixed(2)}`, 'Spending']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSpent)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown Pie Chart (Columns: 2/5) */}
        <div className="glass-card lg:col-span-2 p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col h-[380px]">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-sm tracking-wide">Category Distribution</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative text-xs">
            {stats?.categoryTotals && stats.categoryTotals.length > 0 ? (
              <div className="w-full h-full flex flex-col justify-center">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          background: isDarkMode ? '#151c2c' : '#ffffff', 
                          border: `1px solid ${isDarkMode ? '#2b384e' : '#e2e8f0'}`,
                          borderRadius: '12px'
                        }}
                        formatter={(val: any) => [`${currencySymbol}${Number(val || 0).toFixed(2)}`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Visual Legend */}
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 max-h-[80px] overflow-y-auto px-2">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-center flex flex-col items-center">
                <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                <span className="text-xs font-semibold">No transactions recorded this month</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Gemini AI Insights Panel & Anomaly Flags (Grid 2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gemini saving advice (2/3 columns) */}
        <div className="glass-card lg:col-span-2 p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 pulse-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Gemini Financial Insights</h3>
                <p className="text-[10px] text-slate-400 font-medium">AI-generated customized budget improvements & saving advice</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {loadingInsights ? (
              <div className="py-12 flex flex-col items-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-3" />
                <p className="text-xs font-semibold tracking-wide animate-pulse">Gemini intelligence model analyzing your transactions...</p>
              </div>
            ) : aiInsights && aiInsights.insights && aiInsights.insights.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-brand-50/50 dark:bg-brand-950/10 rounded-2xl border border-brand-100/30 text-xs leading-relaxed text-slate-700 dark:text-slate-350">
                  <span className="font-bold text-brand-600 dark:text-brand-400">Executive Summary: </span>
                  {aiInsights.summary}
                </div>
                
                <ul className="space-y-2.5">
                  {aiInsights.insights.map((ins, i) => (
                    <li key={i} className="flex items-start space-x-2.5 text-xs">
                      <span className="bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded font-bold mt-0.5 flex-shrink-0 font-mono">
                        {i + 1}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5 font-medium">{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2 mx-auto" />
                <p className="text-xs font-semibold">Ready to extract insights. Press refresh to trigger Gemini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Anomaly list (1/3 columns) */}
        <div className="glass-card lg:col-span-1 p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col min-h-[300px]">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Anomaly Alerts</h3>
              <p className="text-[10px] text-slate-400 font-medium">Unusual spending spikes detected</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {loadingInsights ? (
              <div className="py-12 flex flex-col items-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-red-600 mb-3" />
                <p className="text-[10px] font-semibold tracking-wide">Auditing for anomalies...</p>
              </div>
            ) : aiInsights && aiInsights.anomalies && aiInsights.anomalies.length > 0 ? (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {aiInsights.anomalies.map((anom) => (
                  <div 
                    key={anom.id || anom.merchant} 
                    className="p-3 rounded-2xl bg-red-50/50 dark:bg-red-950/10 border border-red-200/20 dark:border-red-900/20 text-xs relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate pr-2 max-w-[120px]">{anom.merchant}</span>
                      <span className="font-extrabold text-red-600 dark:text-red-400">{currencySymbol}{anom.amount.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{anom.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-darkBg-750 flex items-center justify-center mx-auto mb-2 text-slate-400 dark:text-slate-500">
                  <Activity className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-450">All Clear</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No unusual transaction spikes found</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Recent Transaction List */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-extrabold text-sm tracking-wide">Recent Transactions</h3>
          </div>
          
          <button 
            onClick={onNavigateToLedger}
            className="flex items-center text-brand-600 dark:text-brand-400 hover:underline text-xs font-bold"
          >
            <span>View Ledger</span>
            <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {stats?.recent && stats.recent.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Merchant / Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3 text-right pr-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {stats.recent.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/55 dark:hover:bg-darkBg-750/30 transition-colors">
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{exp.merchant}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{exp.description}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-darkBg-700 text-slate-600 dark:text-slate-350 text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">{exp.transactionDate}</td>
                    <td className="py-3.5 text-slate-400 dark:text-slate-500 font-medium">{exp.paymentMethod}</td>
                    <td className="py-3.5 text-right pr-2 font-extrabold text-slate-800 dark:text-slate-100">
                      {currencySymbol}{exp.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <span className="text-xs font-semibold">No recorded expenses found in this period.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
