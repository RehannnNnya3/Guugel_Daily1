import React, { useState, useEffect, useMemo } from 'react';
import { FinanceEntry, CustomAccount } from '../../types.ts';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  Target, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp,
  Edit2,
  Check
} from 'lucide-react';
import { playSuccessSound, playTickSound } from '../../utils/audio.ts';
import { generateOfflineBudgetAnalysis } from '../../utils/offlineEngine.ts';

interface SmartBudgetAdvisorProps {
  selectedMonth: string;
  entries: FinanceEntry[];
  totalIncome: number;
  totalExpense: number;
  detailedBalances: Record<string, number>;
  customAccounts: CustomAccount[];
  formatRp: (num: number, hideOverride?: boolean) => string;
  isBalanceHidden: boolean;
}

interface AnalysisResult {
  healthStatus: 'Aman' | 'Waspada' | 'Kritis' | string;
  healthScore: number;
  summary: string;
  alerts: string[];
  insights: string[];
  recommendations: string[];
  analyzedAt?: string;
}

export default function SmartBudgetAdvisor({
  selectedMonth,
  entries,
  totalIncome,
  totalExpense,
  detailedBalances,
  customAccounts,
  formatRp,
  isBalanceHidden
}: SmartBudgetAdvisorProps) {
  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const saved = localStorage.getItem(`budget_limit_${selectedMonth}`) || localStorage.getItem('budget_limit_default');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudgetInput, setTempBudgetInput] = useState('');
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    const cached = localStorage.getItem(`ai_budget_analysis_${selectedMonth}`);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Month formatted in Indonesian
  const monthName = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Current month's top expense categories
  const topExpenses = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const catMap: Record<string, number> = {};
    entries.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month && e.type === 'expense') {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      }
    });

    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, amount]) => ({ category, amount }));
  }, [entries, selectedMonth]);

  // Update budget limit when month changes
  useEffect(() => {
    const saved = localStorage.getItem(`budget_limit_${selectedMonth}`) || localStorage.getItem('budget_limit_default');
    setBudgetLimit(saved ? parseInt(saved, 10) : 0);
    
    const cached = localStorage.getItem(`ai_budget_analysis_${selectedMonth}`);
    if (cached) {
      try { setAnalysis(JSON.parse(cached)); } catch (e) { setAnalysis(null); }
    } else {
      setAnalysis(null);
    }
  }, [selectedMonth]);

  const handleSaveBudget = () => {
    const num = parseInt(tempBudgetInput.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      setBudgetLimit(num);
      localStorage.setItem(`budget_limit_${selectedMonth}`, num.toString());
      localStorage.setItem('budget_limit_default', num.toString());
      playSuccessSound();
    }
    setIsEditingBudget(false);
  };

  const runAiAnalysis = async () => {
    setIsLoading(true);
    playTickSound();
    try {
      const balanceSummary: Record<string, number> = {};
      Object.keys(detailedBalances).forEach(key => {
        const acc = customAccounts.find(a => a.id === key);
        balanceSummary[acc?.name || key] = detailedBalances[key];
      });

      // 100% Offline Local Algorithmic Analysis (no internet or API key needed)
      const data = generateOfflineBudgetAnalysis({
        month: monthName,
        totalIncome,
        totalExpense,
        balanceSummary,
        topExpenses,
        transactionCount: entries.filter(e => {
          const d = new Date(e.date);
          const [y, m] = selectedMonth.split('-');
          return d.getFullYear() === parseInt(y) && d.getMonth() === parseInt(m) - 1;
        }).length,
        budgetGoal: budgetLimit > 0 ? budgetLimit : undefined
      });

      setAnalysis(data);
      localStorage.setItem(`ai_budget_analysis_${selectedMonth}`, JSON.stringify(data));
      playSuccessSound();
    } catch (error) {
      console.error("Local Budget Analysis Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Budget progress percentage
  const budgetProgress = budgetLimit > 0 ? Math.min(Math.round((totalExpense / budgetLimit) * 100), 200) : 0;
  const isOverBudget = budgetLimit > 0 && totalExpense > budgetLimit;
  const isNearBudget = budgetLimit > 0 && budgetProgress >= 80 && !isOverBudget;

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'Aman':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        };
      case 'Waspada':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />
        };
      case 'Kritis':
      default:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: <ShieldAlert className="w-4 h-4 text-rose-600" />
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base tracking-tight text-white">Smart Budget & Analisis Finansial (Lokal Offline)</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {monthName}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Evaluasi kesehatan finansial 100% lokal offline: analisis arus kas, rasio tabungan, dan deteksi dini tanpa internet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={runAiAnalysis}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="btn_run_ai_finance_analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Menganalisis...' : analysis ? 'Perbarui Analisis (Lokal)' : 'Analisis Finansial (Lokal)'}</span>
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Ciutkan' : 'Perluas'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-5 bg-slate-50/40">
          
          {/* Top Bar: Budget Target Tracker */}
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Target Batas Anggaran Bulanan:</span>
                
                {isEditingBudget ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempBudgetInput}
                      onChange={(e) => setTempBudgetInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-32 px-2 py-0.5 text-xs font-bold border border-indigo-300 rounded focus:outline-none text-slate-800"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveBudget}
                      className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      title="Simpan Anggaran"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      {budgetLimit > 0 ? formatRp(budgetLimit) : 'Belum ditentukan'}
                    </span>
                    <button
                      onClick={() => {
                        setTempBudgetInput(budgetLimit > 0 ? budgetLimit.toString() : '');
                        setIsEditingBudget(true);
                      }}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      title="Atur target batas budget"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {budgetLimit > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isOverBudget 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : isNearBudget 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isOverBudget ? '⚠️ Melampaui Budget' : isNearBudget ? '⚡ Mendekati Batas' : '✅ Budget Terkendali'}
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {budgetProgress}% Terpakai
                  </span>
                </div>
              )}
            </div>

            {budgetLimit > 0 && (
              <div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium mt-1.5">
                  <span>Terpakai: {formatRp(totalExpense)}</span>
                  <span>Sisa Kuota: {formatRp(Math.max(budgetLimit - totalExpense, 0))}</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Cards */}
          {isLoading ? (
            <div className="py-12 px-4 bg-white rounded-xl border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Gemini AI sedang menelaah pola arus kas & budget Anda...</p>
              <p className="text-xs text-slate-400">Menghitung rasio simpanan, pengeluaran dominan, dan kesehatan finansial.</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              
              {/* Health Score & Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Score Card (4 cols) */}
                <div className="md:col-span-4 bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kesehatan Finansial</span>
                    {getHealthBadge(analysis.healthStatus).icon}
                  </div>
                  
                  <div className="my-3 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900">{analysis.healthScore}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 100</span>
                    <span className={`ml-auto text-xs font-extrabold px-2 py-0.5 rounded-md border ${getHealthBadge(analysis.healthStatus).bg}`}>
                      {analysis.healthStatus}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        analysis.healthScore >= 75 ? 'bg-emerald-500' : analysis.healthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(analysis.healthScore, 5)}%` }}
                    />
                  </div>
                </div>

                {/* Summary Card (8 cols) */}
                <div className="md:col-span-8 bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Ringkasan Eksekutif
                    </span>
                    <p className="text-sm font-semibold text-slate-800 mt-2 leading-relaxed">
                      "{analysis.summary}"
                    </p>
                  </div>
                  
                  {analysis.analyzedAt && (
                    <div className="text-[10px] text-slate-400 mt-2">
                      Dianalisis: {new Date(analysis.analyzedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • Mode AI Real-time
                    </div>
                  )}
                </div>

              </div>

              {/* Alerts & Warnings Panel */}
              {analysis.alerts && analysis.alerts.length > 0 && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  analysis.healthStatus === 'Kritis' 
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                    : analysis.healthStatus === 'Waspada'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Peringatan & Catatan Penting:</span>
                  </div>
                  <ul className="space-y-1 pl-6 list-disc text-xs leading-relaxed font-medium">
                    {analysis.alerts.map((alert, idx) => (
                      <li key={idx}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Insights and Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Insights */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                    Wawasan Pola Pengeluaran
                  </span>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    {analysis.insights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Rekomendasi Hemat & Aksi Praktis
                  </span>
                  <ul className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/70">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">Belum Ada Analisis Finansial Bulan Ini</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Klik tombol di bawah untuk menjalankan algoritma kalkulasi lokal offline guna menganalisis riwayat transaksi, rasio pengeluaran kategori, dan menghasilkan rekomendasi penghematan terukur tanpa membutuhkan internet.
              </p>
              <button
                onClick={runAiAnalysis}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 mx-auto cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Mulai Analisis Keuangan Lokal
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
