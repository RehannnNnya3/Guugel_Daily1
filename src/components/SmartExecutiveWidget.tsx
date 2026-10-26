import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Wallet, 
  Clock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  X,
  Target,
  Sparkles,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { ActivityEntry, FinanceEntry } from '../types.ts';
import { calculateExecutiveSummary, SmartExecutiveSummary } from '../utils/smartSystemEngine.ts';
import { playSuccessSound, playTickSound } from '../utils/audio.ts';

interface SmartExecutiveWidgetProps {
  entries: ActivityEntry[];
  financeEntries: FinanceEntry[];
  onSelectTask?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export const SmartExecutiveWidget: React.FC<SmartExecutiveWidgetProps> = ({
  entries,
  financeEntries,
  onSelectTask,
  onToggleStatus
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Kalkulasi analisis eksekutif cerdas secara lokal & reaktif
  const summary: SmartExecutiveSummary = useMemo(() => {
    return calculateExecutiveSummary(entries, financeEntries, new Date());
  }, [entries, financeEntries]);

  const handleQuickComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSuccessSound();
    if (onToggleStatus) {
      onToggleStatus(id);
    }
  };

  const handleTaskClick = (id: string) => {
    playTickSound();
    if (onSelectTask) {
      onSelectTask(id);
    }
  };

  // Warna aksen berdasarkan skor
  const getScoreTheme = (score: number) => {
    if (score >= 85) return { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', lightBg: 'bg-emerald-50' };
    if (score >= 70) return { bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-200', lightBg: 'bg-indigo-50' };
    if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', lightBg: 'bg-amber-50' };
    return { bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200', lightBg: 'bg-rose-50' };
  };

  const theme = getScoreTheme(summary.pulseScore);

  return (
    <>
      <div 
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs mb-6 overflow-hidden transition-all duration-200"
        id="smart_executive_widget"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  Smart Executive Pilot
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  · Algoritma Cerdas Offline
                </span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2 font-mono">
                <span>Skor Kesiapan: <strong className="text-white">{summary.pulseScore}</strong>/100</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">{summary.statusTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowDetailModal(true); playTickSound(); }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Lihat Rincian Analisis Algoritma"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Rincian</span>
            </button>
            <button
              onClick={() => { setIsMinimized(!isMinimized); playTickSound(); }}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isMinimized ? "Perluas Widget" : "Kecilkan Widget"}
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Widget Body (Collapsible) */}
        {!isMinimized && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* 1. Pulse Score Metric & Readiness Gauge (3 Cols) */}
            <div className="md:col-span-3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Denyut Produktivitas
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                    {summary.pulseScore}
                  </span>
                  <span className="text-sm text-slate-400 font-medium">/ 100</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ml-auto ${theme.lightBg} ${theme.text} border ${theme.border}`}>
                    {summary.statusBadge}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div 
                    className={`h-full ${theme.bg} transition-all duration-500`}
                    style={{ width: `${summary.pulseScore}%` }}
                  />
                </div>
              </div>

              {/* Quick stats unboxed */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Tenggat Hari Ini</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {summary.productivityStats.dueToday} tugas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Lewat Tenggat (Overdue)</span>
                  <span className={`font-semibold font-mono ${summary.productivityStats.totalOverdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {summary.productivityStats.totalOverdue} tugas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Selesai Hari Ini</span>
                  <span className="font-semibold text-emerald-600 font-mono">
                    {summary.productivityStats.completedToday} tugas
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Next Best Action Card (5 Cols) */}
            <div className="md:col-span-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    Next Best Action
                  </span>
                  {summary.nextBestAction && (
                    <span className="text-xs text-indigo-600 font-semibold">
                      Skor Prioritas: {summary.nextBestAction.priorityScore}
                    </span>
                  )}
                </div>

                {summary.nextBestAction ? (
                  <div 
                    onClick={() => handleTaskClick(summary.nextBestAction!.entry.id)}
                    className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50/80 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                        {summary.nextBestAction.entry.title}
                      </h4>
                      <span className={`text-[11px] font-semibold shrink-0 ${summary.nextBestAction.isOverdue ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {summary.nextBestAction.urgencyLabel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {summary.nextBestAction.reason}
                    </p>

                    <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {summary.nextBestAction.incompleteSubtasksCount > 0 
                          ? `${summary.nextBestAction.incompleteSubtasksCount} sub-tugas menunggu` 
                          : 'Siap dieksekusi'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleQuickComplete(summary.nextBestAction!.entry.id, e)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 hover:border-emerald-600 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Selesai
                        </button>
                        <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center font-semibold">
                          Buka <ArrowRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-800">Semua tugas utama telah selesai!</p>
                    <p className="text-[11px] text-slate-500">Pertahankan produktivitas Anda atau tambahkan agenda baru.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Safe Daily Spend & Habit Radar (4 Cols) */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-4">
              {/* Financial Pulse */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    Safe Daily Spend
                  </span>
                  <span className="text-slate-500 font-mono">
                    Sisa {summary.financialPulse.daysRemainingInMonth} hari
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                    Rp {summary.financialPulse.safeDailySpend.toLocaleString('id-ID')}
                    <span className="text-xs text-slate-400 font-normal"> /hari</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Hari ini: <strong>Rp {summary.financialPulse.todayExpense.toLocaleString('id-ID')}</strong>
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full ${
                      summary.financialPulse.status === 'critical' ? 'bg-rose-500' :
                      summary.financialPulse.status === 'caution' ? 'bg-amber-500' : 'bg-emerald-500'
                    } transition-all`}
                    style={{ width: `${Math.min(100, summary.financialPulse.spendRatioToday)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1">
                  {summary.financialPulse.statusMessage}
                </p>
              </div>

              {/* Routine Habit Pulse */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Rutinitas Harian
                  </span>
                  <span className="text-slate-600 font-semibold font-mono">
                    {summary.habitPulse.completedRoutines}/{summary.habitPulse.totalRoutines} ({summary.habitPulse.completionRate}%)
                  </span>
                </div>

                {summary.habitPulse.pendingRoutines.length > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-700 font-medium truncate">
                      {summary.habitPulse.pendingRoutines[0].title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleQuickComplete(summary.habitPulse.pendingRoutines[0].id, e)}
                      className="px-2 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-md transition-all shrink-0 cursor-pointer"
                    >
                      ✓ Selesai
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Semua rutinitas hari ini telah terpenuhi!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Analisis & Formula Modal */}
      {showDetailModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Rincian Sistem Cerdas Lokal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kalkulasi deterministik instan tanpa koneksi internet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formula Breakdown */}
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Formula Denyut Produktivitas ({summary.pulseScore}/100)
                </h4>
                <p>
                  Skor dihitung secara terbobot dengan mengevaluasi rasio penyelesaian tugas, penalti keterlambatan tenggat waktu (-12 poin per overdue), penalti tugas mendesak yang tertunda, serta kedisiplinan menyelesaikan rutinitas harian sebelum malam tiba.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Formula Batas Belanja Aman (Safe Daily Spend)
                </h4>
                <p>
                  Mengalokasikan 50% dari pendapatan aktif bulanan sebagai anggaran fleksibel non-tetap, dikurangi akumulasi pengeluaran berjalan, lalu dibagi rata dengan sisa hari kalender ({summary.financialPulse.daysRemainingInMonth} hari).
                </p>
                <div className="flex gap-4 pt-1 font-mono text-slate-800 font-semibold">
                  <div>Batas Hari Ini: Rp {summary.financialPulse.safeDailySpend.toLocaleString('id-ID')}</div>
                  <div>Pengeluaran: Rp {summary.financialPulse.todayExpense.toLocaleString('id-ID')}</div>
                </div>
              </div>

              {/* Dynamic Insights */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">
                  Insight Terdeteksi Saat Ini:
                </h4>
                <ul className="space-y-1.5">
                  {summary.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-indigo-600 font-bold">·</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
