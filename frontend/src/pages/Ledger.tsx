import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  Download, 
  X, 
  Sparkles, 
  AlertCircle,
  Loader2,
  Wallet
} from 'lucide-react';

export const Ledger: React.FC = () => {
  const { 
    expenses, 
    fetchExpenses, 
    loadingExpenses, 
    addExpenseItem, 
    editExpenseItem, 
    deleteExpenseItem, 
    currencySymbol,
    apiCall
  } = useApp();

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  // Form inputs state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  // AI highlights alerts
  const [aiAlert, setAiAlert] = useState<{ type: 'duplicate' | 'auto_cat'; message: string } | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Investments', 'Other'];
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Wallet', 'Auto-Pay'];

  useEffect(() => {
    fetchExpenses({
      category: categoryFilter,
      paymentMethod: paymentFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
      search: searchQuery
    });
  }, [categoryFilter, paymentFilter, startDateFilter, endDateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses({
      category: categoryFilter,
      paymentMethod: paymentFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
      search: searchQuery
    });
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setPaymentFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
    fetchExpenses({});
  };

  // Reset Add Form
  const openAddModal = () => {
    setAmount('');
    setCategory('');
    setMerchant('');
    setDescription('');
    setPaymentMethod('Credit Card');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setAddModalOpen(true);
  };

  // Open Edit Form
  const openEditModal = (exp: any) => {
    setSelectedExpense(exp);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setMerchant(exp.merchant);
    setDescription(exp.description);
    setPaymentMethod(exp.paymentMethod || 'Credit Card');
    setTransactionDate(exp.transactionDate);
    setEditModalOpen(true);
  };

  // Add Action handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !transactionDate) return;

    setFormLoading(true);
    setAiAlert(null);

    const result = await addExpenseItem({
      amount: parseFloat(amount),
      category,
      merchant,
      description,
      paymentMethod,
      transactionDate
    });

    setFormLoading(false);

    if (result.success) {
      setAddModalOpen(false);
      
      // Auto-trigger alerts on special Gemini outputs
      if (result.aiSuggestions?.detectedDuplicate) {
        setAiAlert({
          type: 'duplicate',
          message: `⚠️ duplicate warning: A transaction for $${parseFloat(amount).toFixed(2)} at "${merchant}" has already been logged on this date.`
        });
      } else if (result.aiSuggestions?.categoryAutoSelected) {
        setAiAlert({
          type: 'auto_cat',
          message: `✨ gemini categorized: We mapped this expense to "${result.data.category}" using tags: ${result.aiSuggestions.tags.join(', ')}.`
        });
      }
    } else {
      alert(result.error || 'Failed to record expense');
    }
  };

  // Edit Action handler
  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !transactionDate || !selectedExpense) return;

    setFormLoading(true);
    const success = await editExpenseItem(selectedExpense.id, {
      amount: parseFloat(amount),
      category,
      merchant,
      description,
      paymentMethod,
      transactionDate
    });
    setFormLoading(false);

    if (success) {
      setEditModalOpen(false);
    } else {
      alert('Failed to update expense');
    }
  };

  // Delete Action handler
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense? This action is permanent.')) {
      await deleteExpenseItem(id);
    }
  };

  // CSV Ledger exporter
  const handleExportCsv = async () => {
    try {
      const csv = await apiCall('/expenses/export/csv');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `finai_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      a.click();
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to compile ledger export.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Transaction Ledger</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage, filter, and export your expense records</p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleExportCsv}
            className="flex items-center space-x-1 px-4 py-2.5 bg-white dark:bg-darkBg-800 hover:bg-slate-100 dark:hover:bg-darkBg-700 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          
          <button 
            onClick={openAddModal}
            className="flex items-center space-x-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* AI Suggestions Toast Banner */}
      {aiAlert && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold leading-relaxed ${
          aiAlert.type === 'duplicate' 
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300' 
            : 'bg-brand-50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900/50 text-brand-800 dark:text-brand-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            {aiAlert.type === 'duplicate' ? <AlertCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5 pulse-glow" />}
            <span>{aiAlert.message}</span>
          </div>
          <button onClick={() => setAiAlert(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Search & Filters Bar */}
      <div className="glass-card p-4 rounded-3xl border border-slate-200/40 dark:border-slate-800/40">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by merchant or description..."
              className="block w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs transition-all focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-darkBg-750 dark:hover:bg-darkBg-700 text-slate-700 dark:text-slate-350 rounded-2xl text-xs font-bold transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                showFilters 
                  ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 border-brand-200 dark:border-brand-900/50' 
                  : 'bg-white dark:bg-darkBg-800 text-slate-600 border-slate-200 dark:border-slate-850'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>
            {(categoryFilter || paymentFilter || startDateFilter || endDateFilter || searchQuery) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 font-bold px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Collapsible Filters Expansion Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/40">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
              >
                <option value="">All Methods</option>
                {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Date</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Expense Table List */}
      <div className="glass-card rounded-3xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 overflow-hidden">
        {loadingExpenses ? (
          <div className="py-20 flex flex-col items-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
            <span className="text-xs font-semibold">Pulling ledger transactions...</span>
          </div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-550/20 border-b border-slate-150 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 pl-6">Merchant / Details</th>
                  <th className="py-3.5">Category</th>
                  <th className="py-3.5">Transaction Date</th>
                  <th className="py-3.5">Payment</th>
                  <th className="py-3.5 text-right pr-6">Amount</th>
                  <th className="py-3.5 text-center pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/45">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-darkBg-750/30 transition-colors group">
                    <td className="py-4 pl-6">
                      <div className="font-bold text-slate-850 dark:text-slate-100">{exp.merchant}</div>
                      {exp.description && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[250px]">{exp.description}</div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-darkBg-700 text-slate-650 dark:text-slate-350 text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{exp.transactionDate}</td>
                    <td className="py-4 text-slate-400 dark:text-slate-500 font-medium">{exp.paymentMethod}</td>
                    <td className="py-4 text-right pr-6 font-extrabold text-slate-850 dark:text-slate-50 text-[13px]">
                      {currencySymbol}{exp.amount.toFixed(2)}
                    </td>
                    <td className="py-4 text-center pr-4">
                      <div className="flex items-center justify-center space-x-1 bg-transparent opacity-100 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-650 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-darkBg-700 transition-colors"
                          title="Edit transaction"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">
            <Wallet className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2 mx-auto" />
            <p className="text-xs font-semibold">No expenses recorded matching the query filters.</p>
          </div>
        )}
      </div>

      {/* 4. ADD MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          
          <div className="bg-white dark:bg-darkBg-800 rounded-3xl w-full max-w-lg shadow-2xl z-10 border border-slate-200 dark:border-slate-700 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-extrabold text-base">Record New Expense</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-amount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount*</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                      {currencySymbol}
                    </div>
                    <input
                      id="add-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="add-category" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                  <select
                    id="add-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  >
                    <option value="">Auto-Categorize (AI) 🤖</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-merchant" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Merchant Name</label>
                  <input
                    id="add-merchant"
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Starbucks"
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="add-date" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Transaction Date*</label>
                  <input
                    id="add-date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-payment-method" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</label>
                <select
                  id="add-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                >
                  {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="add-description" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description / Notes</label>
                <textarea
                  id="add-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about the transaction..."
                  rows={2}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100 dark:border-slate-700/60 mt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-darkBg-750 rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBg-800 transition-all"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Log Expense</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          
          <div className="bg-white dark:bg-darkBg-800 rounded-3xl w-full max-w-lg shadow-2xl z-10 border border-slate-200 dark:border-slate-700 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="font-extrabold text-base">Edit Expense Record</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-550">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-amount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount*</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                      {currencySymbol}
                    </div>
                    <input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-category" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                  <select
                    id="edit-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-merchant" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Merchant Name</label>
                  <input
                    id="edit-merchant"
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="edit-date" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Transaction Date*</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-payment-method" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</label>
                <select
                  id="edit-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                >
                  {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description / Notes</label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="block w-full px-3 py-2 bg-slate-50 dark:bg-darkBg-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100 dark:border-slate-700/60 mt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-darkBg-750 rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBg-800 transition-all"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Updates</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
