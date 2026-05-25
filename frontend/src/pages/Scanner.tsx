import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config/api';
import { 
  ScanLine, 
  UploadCloud, 
  Sparkles, 
  Loader2, 
  Plus, 
  X, 
  CheckCircle,
  FileImage,
  Calendar,
  Layers,
  ShoppingBag,
  CreditCard
} from 'lucide-react';

export const Scanner: React.FC = () => {
  const { addExpenseItem, currencySymbol, token } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  
  // Parsed result state
  const [parsedResult, setParsedResult] = useState<any>(null);
  
  // Form Review State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Debit Card');
  const [transactionDate, setTransactionDate] = useState('');
  const [useTodayDate, setUseTodayDate] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Investments', 'Other'];
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Wallet', 'Auto-Pay'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setParsedResult(null);
      setSuccessMsg('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setParsedResult(null);
        setSuccessMsg('');
      } else {
        alert('Please drop a valid receipt image (PNG, JPG, WEBP).');
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setParsedResult(null);
    setSuccessMsg('');
  };

  // Upload receipt image and trigger Gemini OCR scan
  const handleScanReceipt = async () => {
    if (!file) return;

    setScanning(true);
    setParsedResult(null);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const res = await fetch(`${API_BASE}/api/receipts/scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to scan receipt');
      }

      const scanData = resData.data;
      setParsedResult(scanData);
      setUseTodayDate(false);

      // Pre-fill editable forms for review
      setAmount(scanData.amount.toString());
      setMerchant(scanData.merchant);
      setTransactionDate(scanData.date);
      
      // Auto assign category by merchant names
      const mName = scanData.merchant.toLowerCase();
      if (mName.includes('food') || mName.includes('starbucks') || mName.includes('grocer') || mName.includes('market') || mName.includes('walmart') || mName.includes('restaurant')) {
        setCategory('Food');
      } else if (mName.includes('uber') || mName.includes('transit') || mName.includes('gas') || mName.includes('station')) {
        setCategory('Transport');
      } else {
        setCategory('Shopping');
      }

      // Compile items summary for description box
      const itemsList = scanData.items && scanData.items.length > 0
        ? scanData.items.map((it: any) => `${it.name} (${currencySymbol}${it.price})`).join(', ')
        : 'Scanned receipt';
      
      setDescription(`Parsed items: ${itemsList}`);
      
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred while connecting to receipt vision processor.');
    } finally {
      setScanning(false);
    }
  };

  // Commit verified details to standard Expense Ledger
  const handleSaveToLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !transactionDate) return;

    setSaving(true);
    const result = await addExpenseItem({
      amount: parseFloat(amount),
      category,
      merchant,
      description,
      paymentMethod,
      transactionDate
    });
    setSaving(false);

    if (result.success) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const selected = new Date(transactionDate);
      const isCurrentMonth = selected.getFullYear() === currentYear && selected.getMonth() === currentMonth;

      if (isCurrentMonth) {
        setSuccessMsg('Expense recorded successfully! Scanned receipt has been logged and updated on your current month financial dashboard.');
      } else {
        setSuccessMsg(`Expense recorded successfully! Saved under historical date (${transactionDate}). Note: Current Month Dashboard filters exclude historical transactions, but your full ledger has saved this successfully.`);
      }

      setParsedResult(null);
      setFile(null);
      setPreviewUrl(null);
      setUseTodayDate(false);
    } else {
      alert(result.error || 'Failed to record scanned expense.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Receipt Scanner</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
          Scan receipts inline using Gemini vision multimodal analysis
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 text-brand-800 dark:text-brand-300 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <CheckCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Drag-Drop Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Side: Upload Zone */}
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-slate-200/40 dark:border-slate-800/40 p-6 flex flex-col items-center">
            
            {!previewUrl ? (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-350 dark:border-slate-700/80 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl py-14 flex flex-col items-center justify-center cursor-pointer smooth-hover bg-slate-50/50 dark:bg-darkBg-850"
              >
                <UploadCloud className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3 animate-pulse" />
                <span className="text-xs font-extrabold tracking-wide">Drag & Drop Receipt Photo</span>
                <span className="text-[10px] text-slate-400 mt-1">Accepts JPEG, PNG, WEBP files up to 10MB</span>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 max-h-[300px] flex items-center justify-center">
                  <img src={previewUrl} alt="Receipt preview" className="object-contain max-h-[300px]" />
                  <button 
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-450">
                    <FileImage className="h-4 w-4 text-brand-500" />
                    <span className="font-semibold truncate max-w-[150px]">{file?.name}</span>
                    <span className="text-[10px] opacity-75">({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>

                  <button
                    onClick={handleScanReceipt}
                    disabled={scanning}
                    className="flex items-center space-x-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-md shadow-brand-500/10 transition-colors disabled:opacity-50"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-4 w-4" />
                        <span>Process Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>

          {scanning && (
            <div className="glass-card p-6 rounded-3xl border border-brand-200/20 dark:border-brand-900/20 bg-brand-50/20 dark:bg-brand-950/5 flex items-center space-x-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-brand-700 dark:text-brand-400">Gemini OCR Engine Processing</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Transcribing receipt text, compiling lines, calculating tax sums, and detecting purchase dates using multimodal AI vision.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Parsed Preview Review Form */}
        <div className="space-y-4">
          {parsedResult ? (
            <div className="relative bg-white dark:bg-darkBg-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 p-8 shadow-2xl rounded-[32px] overflow-hidden animate-[fadeIn_0.3s_ease-out]">
              
              {/* Premium Glow Accents */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-28 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/40 pb-4 mb-6">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <Sparkles className="h-4.5 w-4.5 pulse-glow" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-tight text-slate-800 dark:text-slate-100">Review Parsed AI Data</h3>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Verify or adjust detected transaction values</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-[9px] font-extrabold text-brand-600 dark:text-brand-400 tracking-wider uppercase">
                  <span>AI Audited</span>
                </div>
              </div>

              {/* Form Review fields */}
              <form onSubmit={handleSaveToLedger} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="scanned-merchant" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Merchant Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <input
                        id="scanned-merchant"
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder="e.g. Hospital or Store"
                        className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/85 focus:border-brand-500 rounded-2xl text-xs outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:ring-4 focus:ring-brand-500/10 transition-all font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="scanned-amount" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Total Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-600 dark:text-brand-400 font-extrabold text-xs">
                        {currencySymbol}
                      </div>
                      <input
                        id="scanned-amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="block w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/85 focus:border-brand-500 rounded-2xl text-xs outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:ring-4 focus:ring-brand-500/10 transition-all font-black text-xs"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="scanned-date" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Transaction Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        id="scanned-date"
                        type="date"
                        value={transactionDate}
                        onChange={(e) => {
                          setTransactionDate(e.target.value);
                          setUseTodayDate(e.target.value === new Date().toISOString().split('T')[0]);
                        }}
                        className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/85 focus:border-brand-500 rounded-2xl text-xs outline-none text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-brand-500/10 transition-all font-semibold"
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2 mt-2 pl-1 select-none">
                      <input
                        id="use-today-date"
                        type="checkbox"
                        checked={useTodayDate}
                        onChange={(e) => {
                          setUseTodayDate(e.target.checked);
                          if (e.target.checked) {
                            setTransactionDate(new Date().toISOString().split('T')[0]);
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-350 dark:border-slate-800 text-brand-600 focus:ring-brand-500 bg-slate-50 dark:bg-slate-950 cursor-pointer"
                      />
                      <label htmlFor="use-today-date" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
                        Use today's date instead
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="scanned-category" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
                        <Layers className="h-4 w-4" />
                      </div>
                      <select
                        id="scanned-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="block w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/85 focus:border-brand-500 rounded-2xl text-xs outline-none text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-brand-500/10 transition-all font-semibold appearance-none"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="scanned-payment-method" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Payment Method</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <select
                      id="scanned-payment-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="block w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/85 focus:border-brand-500 rounded-2xl text-xs outline-none text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-brand-500/10 transition-all font-semibold appearance-none"
                    >
                      {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Itemized Line Items (AI Audit Summary)</label>
                  
                  {/* Digital Receipt Container */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden font-mono text-[11px] space-y-3 shadow-inner">
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-slate-400/20 dark:via-slate-800/30 to-transparent" />
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-200/40 dark:border-slate-800/30 pb-2">
                      <span>PURCHASE ITEM</span>
                      <span>PRICE</span>
                    </div>

                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                      {parsedResult.items && parsedResult.items.length > 0 ? (
                        parsedResult.items.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-0.5">
                            <span className="text-slate-500 dark:text-slate-300 font-semibold">{it.name}</span>
                            <span className="flex-1 mx-2 border-b border-dotted border-slate-300 dark:border-slate-800" />
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{currencySymbol}{it.price.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 py-2">No individual item prices parsed.</div>
                      )}
                    </div>
                    
                    <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2.5 flex justify-between items-center text-xs font-black tracking-tight mt-1 text-slate-800 dark:text-slate-100">
                      <span>TOTAL SUMMARY</span>
                      <span>{currencySymbol}{parseFloat(amount || '0').toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="scanned-description" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Description / Notes</label>
                  <textarea
                    id="scanned-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2.5}
                    placeholder="Enter visual insights or personal annotations..."
                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/85 focus:border-brand-500 rounded-2xl text-xs outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:ring-4 focus:ring-brand-500/10 transition-all font-semibold leading-relaxed"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setParsedResult(null)}
                    className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-extrabold text-slate-500 hover:text-red-500 dark:text-slate-450 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-darkBg-750 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <X className="h-4 w-4" />
                    <span>Reset Scan</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-brand-600 via-purple-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBg-900"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Confirm & Add to Ledger</span>
                  </button>
                </div>

              </form>

            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-slate-200/40 dark:border-slate-800/40 p-6 flex flex-col justify-center items-center h-[360px] text-slate-400 text-center">
              <ScanLine className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3 pulse-glow animate-[spin_5s_linear_infinite]" />
              <span className="font-extrabold text-xs">Awaiting Receipt Capture</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] leading-normal">
                Upload a receipt photo on the left. Gemini will process its lines and render a review panel.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
