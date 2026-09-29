import React, { useState } from 'react';
import { FinanceEntry, FinanceType, FinanceAccount, CustomAccount, FinanceCategoryMap } from '../../types.ts';
import { X, Check } from 'lucide-react';
import { playTickSound } from '../../utils/audio.ts';

interface FinanceFormProps {
  customAccounts: CustomAccount[];
  financeCategories: FinanceCategoryMap;
  initialData?: FinanceEntry | null;
  onSave: (entry: Omit<FinanceEntry, 'id' | 'createdAt' | 'userId'> & { id?: string }) => void;
  onCancel: () => void;
}

export default function FinanceForm({ financeCategories, customAccounts, initialData, onSave, onCancel }: FinanceFormProps) {
  const [type, setType] = useState<FinanceType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [sourceAccount, setSourceAccount] = useState<FinanceAccount>(() => {
    if (initialData?.sourceAccount) return initialData.sourceAccount;
    return customAccounts.length > 0 ? customAccounts[0].id : 'cash';
  });
  const [destinationAccount, setDestinationAccount] = useState<FinanceAccount>(() => {
    if (initialData?.destinationAccount) return initialData.destinationAccount;
    return customAccounts.length > 1 ? customAccounts[1].id : (customAccounts[0]?.id || 'bank');
  });
  const [formError, setFormError] = useState<string | null>(null);
  
  const initialCat = initialData?.category;
  const [category, setCategory] = useState(initialCat || (financeCategories && financeCategories['expense'] && financeCategories['expense'][0]) || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const cats = financeCategories[type] || [];
  
  // Format current date exactly for local input, or use existing date
  const getTodayStr = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };
  const [date, setDate] = useState(initialData?.date ? initialData.date.slice(0, 16) : getTodayStr());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Masukkan nominal transaksi yang valid (lebih dari 0).");
      return;
    }
    
    if (type === 'transfer' && sourceAccount === destinationAccount) {
      setFormError("Rekening asal dan tujuan tidak boleh sama.");
      return;
    }

    if (!category.trim()) {
      setFormError("Silakan pilih kategori transaksi.");
      return;
    }

    const payload: any = {
      ...(initialData?.id && { id: initialData.id }),
      type,
      amount: parsedAmount,
      sourceAccount,
      category,
      description,
      date: new Date(date).toISOString()
    };
    if (type === 'transfer') {
      payload.destinationAccount = destinationAccount;
    }
    onSave(payload);
  };

  const handleTypeChange = (newType: FinanceType) => {
    playTickSound();
    setType(newType);
    setFormError(null);
    setCategory(financeCategories[newType] && financeCategories[newType][0] ? financeCategories[newType][0] : '');
  };

  const formatRupiah = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    return isNaN(num) ? '' : num.toLocaleString('id-ID');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
          <h2 className="font-bold text-lg">
            {initialData ? 'Edit Transaksi' : 'Catat Transaksi'}
          </h2>
          <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {formError}
            </div>
          )}
          
          {/* Type Selection */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              PENGELUARAN
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              PEMASUKAN
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'transfer' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              TRANSFER
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nominal (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
              <input
                type="text"
                value={formatRupiah(amount)}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="0"
              />
            </div>
          </div>

          {/* Accounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {type === 'income' ? 'Masuk Ke' : type === 'expense' ? 'Sumber Dana' : 'Dari'}
              </label>
              <select
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value as FinanceAccount)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                
                {customAccounts.filter(a => a.type === 'cash').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                <optgroup label="Bank">
                  {customAccounts.filter(a => a.type === 'bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
                <optgroup label="E-Wallet">
                  {customAccounts.filter(a => a.type === 'ewallet').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
              </select>
            </div>
            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ke</label>
                <select
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value as FinanceAccount)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  
                {customAccounts.filter(a => a.type === 'cash').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                <optgroup label="Bank">
                  {customAccounts.filter(a => a.type === 'bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
                <optgroup label="E-Wallet">
                  {customAccounts.filter(a => a.type === 'ewallet').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>

                  
                </select>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {cats.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    category === cat 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal & Waktu</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Keterangan Singkat</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Makan siang, bensin..."
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              SIMPAN TRANSAKSI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
