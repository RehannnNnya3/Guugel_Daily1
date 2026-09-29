import React, { useState, useMemo } from 'react';
import { FinanceEntry, FinanceAccount, CustomAccount } from '../../types.ts';
import { X, Search, Filter, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Wallet, Landmark, Smartphone, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { playTickSound } from '../../utils/audio.ts';

interface FinanceTransactionListModalProps {
  entries: FinanceEntry[];
  customAccounts?: CustomAccount[];
  onClose: () => void;
  onEditEntry: (entry: FinanceEntry) => void;
  onDeleteEntry: (id: string) => void;
  isBalanceHidden?: boolean;
}

export default function FinanceTransactionListModal({ entries, customAccounts = [], onClose, onEditEntry, onDeleteEntry, isBalanceHidden }: FinanceTransactionListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match = e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
          if (!match) return false;
        }
        
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0,0,0,0);
          const eDate = new Date(e.date);
          if (eDate.getTime() < s.getTime()) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23,59,59,999);
          const eDate = new Date(e.date);
          if (eDate.getTime() > end.getTime()) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchQuery, filterType, startDate, endDate]);

  const groupedFilteredEntries = useMemo(() => {
    const groups: { dateLabel: string, dateStr: string, entries: FinanceEntry[] }[] = [];
    let currentGroup = '';
    
    filteredEntries.forEach(entry => {
      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
      
      if (currentGroup !== dateStr) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let label = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (d.toDateString() === today.toDateString()) label = 'Hari Ini';
        else if (d.toDateString() === yesterday.toDateString()) label = 'Kemarin';

        groups.push({ dateLabel: label, dateStr, entries: [entry] });
        currentGroup = dateStr;
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    });
    return groups;
  }, [filteredEntries]);

  const formatRp = (num: number) => {
    if (isBalanceHidden) return 'Rp •••••••';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const getAccountIcon = (acc: FinanceAccount) => {
    const custom = customAccounts.find(a => a.id === acc);
    const type = custom ? custom.type : (acc === 'cash' ? 'cash' : acc.startsWith('bank') ? 'bank' : 'ewallet');
    if (type === 'cash') return <Wallet className="w-4 h-4" />;
    if (type === 'bank') return <Landmark className="w-4 h-4" />;
    return <Smartphone className="w-4 h-4" />;
  };

  const getAccountLabel = (acc: FinanceAccount) => {
    const custom = customAccounts.find(a => a.id === acc);
    if (custom) return custom.name;
    const standardLabels: Record<string, string> = {
      cash: 'Tunai',
      bank_bri: 'BRI',
      bank_seabank: 'SeaBank',
      ewallet_dana: 'DANA',
      ewallet_gopay: 'GoPay',
      ewallet_shopeepay: 'ShopeePay',
      ewallet_ovo: 'OVO',
      bank: 'Bank',
      ewallet: 'E-Wallet'
    };
    return standardLabels[acc] || acc;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Semua Transaksi</h2>
            <p className="text-xs text-slate-500">{entries.length} total transaksi tercatat</p>
          </div>
          <button onClick={() => { playTickSound(); onClose(); }} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari deskripsi atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 text-slate-800 transition-all bg-white"
              />
            </div>
            <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit shrink-0">
              {['all', 'income', 'expense', 'transfer'].map(type => (
                <button
                  key={type}
                  onClick={() => { playTickSound(); setFilterType(type as any); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                    filterType === type ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transfer'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 font-medium text-xs">Periode:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-500 hover:text-rose-700 ml-2 font-medium"
              >
                Reset Tanggal
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
          {groupedFilteredEntries.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Tidak ada transaksi yang cocok.
            </div>
          ) : (
            groupedFilteredEntries.map(group => (
              <div key={group.dateStr} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/95 backdrop-blur py-1 z-10">
                  {group.dateLabel}
                </h4>
                {group.entries.map(entry => (
                  <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-100 transition-colors group flex items-start justify-between gap-3 shadow-xs hover:shadow-sm">
                    <div className="flex gap-3 items-start">
                      <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        entry.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                        entry.type === 'expense' ? 'bg-rose-100 text-rose-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {entry.type === 'income' && <ArrowUpCircle className="w-5 h-5" />}
                        {entry.type === 'expense' && <ArrowDownCircle className="w-5 h-5" />}
                        {entry.type === 'transfer' && <ArrowRightLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {entry.description}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">{entry.category}</span>
                          <span>•</span>
                          <span>{new Date(entry.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        <div className="text-[10px] font-medium text-slate-400 mt-1.5 flex items-center gap-1">
                          {getAccountIcon(entry.sourceAccount)}
                          <span>{getAccountLabel(entry.sourceAccount)}</span>
                          {entry.type === 'transfer' && entry.destinationAccount && (
                            <>
                              <ArrowRightLeft className="w-3 h-3 mx-1" />
                              {getAccountIcon(entry.destinationAccount)}
                              <span>{getAccountLabel(entry.destinationAccount)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-extrabold ${
                        entry.type === 'income' ? 'text-emerald-600' :
                        entry.type === 'expense' ? 'text-rose-600' :
                        'text-blue-600'
                      }`}>
                        {entry.type === 'income' ? '+' : entry.type === 'expense' ? '-' : ''}
                        {formatRp(entry.amount)}
                      </p>
                      <div className="mt-2 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditEntry(entry)}
                          className="text-slate-400 hover:text-indigo-500 p-1.5 rounded transition-colors"
                          title="Edit transaksi"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteEntry(entry.id)}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded transition-colors"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
