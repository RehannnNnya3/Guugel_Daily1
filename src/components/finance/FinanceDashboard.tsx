import React, { useState, useMemo } from 'react';
import { FinanceEntry, FinanceAccount } from '../../types.ts';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ArrowRightLeft, 
  Wallet, 
  Landmark, 
  Smartphone,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ManageAccountsModal from './ManageAccountsModal.tsx';
import { Download, Settings } from 'lucide-react';
import { CustomAccount, FinanceCategoryMap } from '../../types.ts';
import ManageCategoriesModal from './ManageCategoriesModal.tsx';
import { Tag } from 'lucide-react';
import FinanceTransactionListModal from './FinanceTransactionListModal.tsx';
import { playTickSound } from '../../utils/audio.ts';

interface FinanceDashboardProps {
  entries: FinanceEntry[];
  customAccounts: CustomAccount[];
  financeCategories: FinanceCategoryMap;
  setFinanceCategories: (cats: FinanceCategoryMap) => void;
  setCustomAccounts: (acc: CustomAccount[]) => void;
  triggerCloudSyncPush: (acc: CustomAccount[]) => void;
  onAddEntry: () => void;
  onEditEntry: (entry: FinanceEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const accountLabels: Record<FinanceAccount, string> = {
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

export default function FinanceDashboard({ entries, financeCategories, setFinanceCategories, customAccounts, setCustomAccounts, triggerCloudSyncPush, onAddEntry, onEditEntry, onDeleteEntry }: FinanceDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAllTransactionsOpen, setIsAllTransactionsOpen] = useState(false);
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(() => {
    return localStorage.getItem('hide_balance') === 'true';
  });

  const toggleHideBalance = () => {
    const newValue = !isBalanceHidden;
    setIsBalanceHidden(newValue);
    localStorage.setItem('hide_balance', String(newValue));
    playTickSound();
  };

  const detailedBalances = useMemo(() => {
    const bals: Record<string, number> = {};
    customAccounts.forEach(acc => {
      bals[acc.id] = 0;
    });
    
    entries.forEach(e => {
      if (e.type === 'income') {
        bals[e.sourceAccount] = (bals[e.sourceAccount] || 0) + e.amount;
      } else if (e.type === 'expense') {
        bals[e.sourceAccount] = (bals[e.sourceAccount] || 0) - e.amount;
      } else if (e.type === 'transfer' && e.destinationAccount) {
        bals[e.sourceAccount] = (bals[e.sourceAccount] || 0) - e.amount;
        bals[e.destinationAccount] = (bals[e.destinationAccount] || 0) + e.amount;
      }
    });
    return bals;
  }, [entries]);

  const balances = useMemo(() => {
    const bal = { cash: 0, bank: 0, ewallet: 0 };
    Object.keys(detailedBalances).forEach(key => {
      const amt = detailedBalances[key];
      const acc = customAccounts.find(a => a.id === key);
      const type = acc ? acc.type : (key.startsWith('bank') ? 'bank' : key.startsWith('ewallet') ? 'ewallet' : 'cash');
      
      if (type === 'cash') bal.cash += amt;
      else if (type === 'bank') bal.bank += amt;
      else if (type === 'ewallet') bal.ewallet += amt;
    });
    return bal;
  }, [detailedBalances, customAccounts]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

  const recentEntries = sortedEntries.slice(0, 50);

  const groupedRecentEntries = useMemo(() => {
    const groups: { dateLabel: string, dateStr: string, entries: FinanceEntry[] }[] = [];
    let currentGroup = '';
    
    recentEntries.forEach(entry => {
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
  }, [recentEntries]);

  const chartData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed
    
    // Get number of days in the selected month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dailyData = new Map<number, { income: number, expense: number }>();
    for (let i = 1; i <= daysInMonth; i++) {
      dailyData.set(i, { income: 0, expense: 0 });
    }
    
    const validEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    validEntries.forEach(e => {
      if (e.type === 'transfer') return;
      const day = new Date(e.date).getDate();
      const current = dailyData.get(day)!;
      if (e.type === 'income') current.income += e.amount;
      else if (e.type === 'expense') current.expense += e.amount;
    });

    return Array.from(dailyData.entries()).map(([day, data]) => ({
      name: `${day} ${new Date(year, month).toLocaleDateString('id-ID', { month: 'short' })}`,
      income: data.income,
      expense: data.expense
    }));
  }, [entries, selectedMonth]);

  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);

  
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const [yearStr, monthStr] = selectedMonth.split('-');
    const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    doc.setFontSize(18);
    doc.text(`Laporan Keuangan - ${monthName}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Pemasukan: ${formatRp(totalIncome, false)}`, 14, 32);
    doc.text(`Pengeluaran: ${formatRp(totalExpense, false)}`, 14, 38);
    doc.text(`Netto: ${formatRp(totalIncome - totalExpense, false)}`, 14, 44);
    
    const validEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === parseInt(yearStr) && d.getMonth() === parseInt(monthStr) - 1;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const tableData = validEntries.map(e => [
      new Date(e.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      e.description,
      e.category,
      e.type === 'income' ? 'Pemasukan' : e.type === 'expense' ? 'Pengeluaran' : 'Transfer',
      e.type === 'transfer' && e.destinationAccount ? `${getAccountLabel(e.sourceAccount)} -> ${getAccountLabel(e.destinationAccount)}` : getAccountLabel(e.sourceAccount),
      formatRp(e.amount, false)
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Rekening', 'Jumlah']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Laporan_Keuangan_${monthName.replace(' ', '_')}.pdf`);
  };

  const formatRp = (num: number, hideOverride = false) => {
    if (hideOverride || isBalanceHidden) return 'Rp •••••••';
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
    return accountLabels[acc] || acc;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Keuangan</h2>
          <p className="text-sm text-slate-500 font-medium">Kelola arus kas dan pantau saldo Anda.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={toggleHideBalance}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm flex-1 sm:flex-none justify-center"
          >
            {isBalanceHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {isBalanceHidden ? 'Tampilkan' : 'Sembunyikan'}
          </button>
          <button 
            onClick={() => { playTickSound(); onAddEntry(); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-5 h-5" />
            Catat Transaksi
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-2 rounded-xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Dompet Tunai</p>
            <p className="text-3xl font-extrabold text-white mb-3">{formatRp(balances.cash)}</p>

            {/* Details */}
            <div className="space-y-1.5 border-t border-white/20 pt-3">
              {Object.keys(detailedBalances).filter(k => {
                const acc = customAccounts.find(a => a.id === k);
                return acc ? acc.type === 'cash' : (k === 'cash');
              }).map(key => (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="text-emerald-100">{getAccountLabel(key)}</span>
                  <span className="font-semibold">{formatRp(detailedBalances[key])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bank */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-2 rounded-xl">
                <Landmark className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Rekening Bank</p>
            <p className="text-3xl font-extrabold text-white mb-3">{formatRp(balances.bank)}</p>
            
            {/* Details */}
            <div className="space-y-1.5 border-t border-white/20 pt-3">
              {Object.keys(detailedBalances).filter(k => {
                const acc = customAccounts.find(a => a.id === k);
                return acc ? acc.type === 'bank' : k.startsWith('bank');
              }).map(key => (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="text-indigo-100">{getAccountLabel(key)}</span>
                  <span className="font-semibold">{formatRp(detailedBalances[key])}</span>
                </div>
              ))}
              {Object.keys(detailedBalances).filter(k => {
                const acc = customAccounts.find(a => a.id === k);
                return acc ? acc.type === 'bank' : k.startsWith('bank');
              }).length === 0 && (
                <p className="text-xs text-indigo-200 italic">Belum ada data bank</p>
              )}
            </div>
          </div>
        </div>

        {/* E-Wallet */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-slate-900 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-10 -mt-10 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-slate-100 p-2 rounded-xl">
                <Smartphone className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-Wallet</p>
            <p className="text-3xl font-extrabold text-slate-900 mb-3">{formatRp(balances.ewallet)}</p>

            {/* Details */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              {Object.keys(detailedBalances).filter(k => {
                const acc = customAccounts.find(a => a.id === k);
                return acc ? acc.type === 'ewallet' : k.startsWith('ewallet');
              }).map(key => (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{getAccountLabel(key)}</span>
                  <span className="font-bold text-slate-700">{formatRp(detailedBalances[key])}</span>
                </div>
              ))}
              {Object.keys(detailedBalances).filter(k => {
                const acc = customAccounts.find(a => a.id === k);
                return acc ? acc.type === 'ewallet' : k.startsWith('ewallet');
              }).length === 0 && (
                <p className="text-xs text-slate-400 italic">Belum ada data e-wallet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Arus Kas (Cash Flow)</h3>
              <p className="text-xs text-slate-500 font-medium">Grafik pemasukan vs pengeluaran</p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-sm font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 bg-slate-50"
              />
              <button onClick={() => { playTickSound(); setIsManageCategoriesOpen(true); }} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Kelola Kategori">
                <Tag className="w-4 h-4" />
              </button>
              <button onClick={() => { playTickSound(); setIsManageAccountsOpen(true); }} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Kelola Rekening">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => { playTickSound(); handleExportPDF(); }} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Export PDF">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pemasukan</p>
              <p className="text-lg font-bold text-emerald-600">{formatRp(totalIncome, false)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pengeluaran</p>
              <p className="text-lg font-bold text-rose-600">{formatRp(totalExpense, false)}</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    dy={10}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) => `Rp${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatRp(value, false)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="linear" dataKey="income" name="Pemasukan" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="linear" dataKey="expense" name="Pengeluaran" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                Belum ada data untuk periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-2 p-5 pb-0">
            <h3 className="text-lg font-bold text-slate-900">Transaksi Terbaru</h3>
            <button
              onClick={() => setIsAllTransactionsOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Lihat Semua
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 p-5 pt-2 custom-scrollbar">
            {groupedRecentEntries.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Belum ada transaksi.
              </div>
            ) : (
              groupedRecentEntries.map(group => (
                <div key={group.dateStr} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur py-1 z-10">
                    {group.dateLabel}
                  </h4>
                  {group.entries.map(entry => (
                    <div key={entry.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group flex items-start justify-between gap-3">
                      <div className="flex gap-3 items-start">
                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
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
                          <p className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="bg-slate-200/50 px-1.5 py-0.5 rounded">{entry.category}</span>
                            <span>•</span>
                            <span>{new Date(entry.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
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
                          {formatRp(entry.amount, false)}
                        </p>
                        <div className="mt-2 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onEditEntry(entry)}
                            className="text-slate-400 hover:text-indigo-500 p-1 rounded transition-colors"
                            title="Edit transaksi"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteEntry(entry.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
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

      {isManageAccountsOpen && (
        <ManageAccountsModal
          accounts={customAccounts}
          setAccounts={(acc) => { setCustomAccounts(acc); triggerCloudSyncPush(acc); }}
          onClose={() => setIsManageAccountsOpen(false)}
        />
      )}
      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          categories={financeCategories}
          setCategories={setFinanceCategories}
          onClose={() => setIsManageCategoriesOpen(false)}
        />
      )}
      {isAllTransactionsOpen && (
        <FinanceTransactionListModal
          entries={entries}
          customAccounts={customAccounts}
          onClose={() => setIsAllTransactionsOpen(false)}
          onEditEntry={onEditEntry}
          onDeleteEntry={onDeleteEntry}
          isBalanceHidden={isBalanceHidden}
        />
      )}
    </div>
  );
}
