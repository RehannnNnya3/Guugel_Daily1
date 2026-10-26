import { ActivityEntry, FinanceEntry } from '../types.ts';

export interface NextBestAction {
  entry: ActivityEntry;
  priorityScore: number;
  reason: string;
  urgencyLabel: string;
  isOverdue: boolean;
  hoursUntilDeadline: number | null;
  incompleteSubtasksCount: number;
}

export interface FinancialPulse {
  safeDailySpend: number;
  todayExpense: number;
  monthTotalIncome: number;
  monthTotalExpense: number;
  monthNetSavings: number;
  daysRemainingInMonth: number;
  spendRatioToday: number; // percentage of todayExpense / safeDailySpend
  status: 'safe' | 'caution' | 'critical';
  statusMessage: string;
}

export interface HabitPulse {
  totalRoutines: number;
  completedRoutines: number;
  completionRate: number; // 0 - 100
  pendingRoutines: ActivityEntry[];
}

export interface SmartExecutiveSummary {
  pulseScore: number; // 0 - 100
  statusLevel: 'excellent' | 'good' | 'warning' | 'alert';
  statusTitle: string;
  statusBadge: string;
  nextBestAction: NextBestAction | null;
  financialPulse: FinancialPulse;
  habitPulse: HabitPulse;
  insights: string[];
  productivityStats: {
    totalPending: number;
    totalOverdue: number;
    dueToday: number;
    completedToday: number;
  };
}

/**
 * Menghitung selisih jam dari sekarang hingga deadline
 */
export function getHoursUntil(dateString: string, now: Date = new Date()): number {
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return 999;
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Memilih tugas terpenting berikutnya (Next Best Action) berdasarkan formula terbobot
 */
export function getNextBestAction(entries: ActivityEntry[], now: Date = new Date()): NextBestAction | null {
  const pendingEntries = entries.filter(e => e.status !== 'completed');
  if (pendingEntries.length === 0) return null;

  const scored = pendingEntries.map(entry => {
    let score = 0;
    const hours = getHoursUntil(entry.deadline, now);
    const isOverdue = hours < 0;

    // Bobot Urgency
    switch (entry.urgency) {
      case 'urgent': score += 45; break;
      case 'high': score += 30; break;
      case 'medium': score += 18; break;
      case 'low': score += 8; break;
      default: score += 10;
    }

    // Bobot Deadline
    if (isOverdue) {
      score += 60; // Paling kritis jika sudah lewat tenggat
    } else if (hours <= 6) {
      score += 45; // Sangat mendesak (< 6 jam)
    } else if (hours <= 24) {
      score += 30; // Hari ini (< 24 jam)
    } else if (hours <= 48) {
      score += 15; // Besok
    } else if (hours <= 120) {
      score += 5;
    }

    // Bobot Subtask tersisa
    const subtasks = entry.courseDetails?.subtasks || [];
    const incompleteSubtasks = subtasks.filter(s => !s.done).length;
    score += incompleteSubtasks * 4;

    // Alasan cerdas
    let reason = "Tugas dengan prioritas tertinggi saat ini.";
    if (isOverdue) {
      reason = `Tenggat waktu terlewati ${Math.abs(Math.round(hours))} jam lalu! Perlu segera diselesaikan.`;
    } else if (hours <= 6) {
      reason = `Tenggat waktu sisa ${Math.max(1, Math.round(hours))} jam lagi hari ini.`;
    } else if (entry.urgency === 'urgent') {
      reason = "Memiliki label Prioritas Urgent yang membutuhkan perhatian penuh.";
    } else if (incompleteSubtasks > 0) {
      reason = `Memiliki ${incompleteSubtasks} sub-tugas yang siap dikerjakan.`;
    }

    let urgencyLabel = "Normal";
    if (isOverdue) urgencyLabel = "Overdue";
    else if (hours <= 6) urgencyLabel = "Kritis Hari Ini";
    else if (entry.urgency === 'urgent') urgencyLabel = "Urgent";
    else if (entry.urgency === 'high') urgencyLabel = "Prioritas Tinggi";

    return {
      entry,
      priorityScore: score,
      reason,
      urgencyLabel,
      isOverdue,
      hoursUntilDeadline: isNaN(hours) ? null : hours,
      incompleteSubtasksCount: incompleteSubtasks
    };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  return scored[0];
}

/**
 * Menghitung denyut keuangan & batas belanja aman harian (Safe Daily Spend)
 */
export function calculateFinancialPulse(
  financeEntries: FinanceEntry[],
  now: Date = new Date()
): FinancialPulse {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Hitung jumlah hari dalam bulan ini
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(1, lastDayOfMonth - currentDay + 1);

  // Filter transaksi bulan ini
  const currentMonthEntries = financeEntries.filter(entry => {
    const entryDate = new Date(entry.date || entry.createdAt);
    return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
  });

  let monthIncome = 0;
  let monthExpense = 0;
  let todayExpense = 0;

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  currentMonthEntries.forEach(entry => {
    if (entry.type === 'income') {
      monthIncome += Number(entry.amount) || 0;
    } else if (entry.type === 'expense') {
      const amount = Number(entry.amount) || 0;
      monthExpense += amount;

      const eDate = new Date(entry.date || entry.createdAt);
      const eDateStr = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}-${String(eDate.getDate()).padStart(2, '0')}`;
      if (eDateStr === todayStr) {
        todayExpense += amount;
      }
    }
  });

  const monthNetSavings = monthIncome - monthExpense;

  // Algoritma Safe Daily Spend:
  // Sisa alokasi belanja yang aman dibagi sisa hari
  let safeDailySpend = 0;
  if (monthIncome > 0) {
    // Patokan standar 50% untuk kebutuhan rutin dibagi total hari
    const totalDiscretionaryBudget = monthIncome * 0.5;
    const remainingBudget = Math.max(0, totalDiscretionaryBudget - monthExpense);
    safeDailySpend = Math.round(remainingBudget / daysRemaining);
  } else if (monthExpense > 0) {
    // Jika belum ada income tercatat, gunakan rata-rata pengeluaran harian sebagai pembanding
    const avgDailyExpense = Math.round(monthExpense / Math.max(1, currentDay));
    safeDailySpend = Math.max(25000, avgDailyExpense);
  } else {
    // Default wajar untuk mahasiswa/personal
    safeDailySpend = 50000;
  }

  const spendRatio = safeDailySpend > 0 ? (todayExpense / safeDailySpend) * 100 : 0;

  let status: 'safe' | 'caution' | 'critical' = 'safe';
  let statusMessage = "Pengeluaran hari ini masih dalam batas aman.";

  if (todayExpense > safeDailySpend * 1.5) {
    status = 'critical';
    statusMessage = `Pengeluaran hari ini (${spendRatio.toFixed(0)}%) telah melampaui batas harian yang disarankan.`;
  } else if (todayExpense > safeDailySpend) {
    status = 'caution';
    statusMessage = "Mendekati batas belanja harian aman. Tahan pengeluaran non-primer.";
  } else if (todayExpense === 0) {
    statusMessage = "Belum ada pengeluaran hari ini. Anggaran harian utuh.";
  }

  return {
    safeDailySpend,
    todayExpense,
    monthTotalIncome: monthIncome,
    monthTotalExpense: monthExpense,
    monthNetSavings,
    daysRemainingInMonth: daysRemaining,
    spendRatioToday: Math.round(spendRatio),
    status,
    statusMessage
  };
}

/**
 * Menghitung kepatuhan rutinitas & kebiasaan harian
 */
export function calculateHabitPulse(entries: ActivityEntry[]): HabitPulse {
  const routineEntries = entries.filter(e => e.category === 'rutinitas');
  const totalRoutines = routineEntries.length;
  const completedRoutines = routineEntries.filter(e => e.status === 'completed').length;
  const pendingRoutines = routineEntries.filter(e => e.status !== 'completed');
  const completionRate = totalRoutines > 0 ? Math.round((completedRoutines / totalRoutines) * 100) : 100;

  return {
    totalRoutines,
    completedRoutines,
    completionRate,
    pendingRoutines
  };
}

/**
 * Menghitung Skor Denyut Harian Komprehensif (Daily Executive Pulse 0 - 100)
 */
export function calculateExecutiveSummary(
  entries: ActivityEntry[],
  financeEntries: FinanceEntry[],
  now: Date = new Date()
): SmartExecutiveSummary {
  const nextAction = getNextBestAction(entries, now);
  const finPulse = calculateFinancialPulse(financeEntries, now);
  const habPulse = calculateHabitPulse(entries);

  // Produktivitas
  const pendingEntries = entries.filter(e => e.status !== 'completed');
  const completedEntries = entries.filter(e => e.status === 'completed');
  const overdueEntries = pendingEntries.filter(e => getHoursUntil(e.deadline, now) < 0);
  const dueTodayEntries = pendingEntries.filter(e => {
    const hours = getHoursUntil(e.deadline, now);
    return hours >= 0 && hours <= 24;
  });

  // Skor Dasar: 100
  let score = 100;

  // Penalti keterlambatan tugas (-12 per tugas overdue)
  score -= Math.min(40, overdueEntries.length * 12);

  // Penalti tugas urgent yang menumpuk (> 2 tugas urgent pending)
  const urgentCount = pendingEntries.filter(e => e.urgency === 'urgent').length;
  if (urgentCount > 2) {
    score -= Math.min(15, (urgentCount - 2) * 5);
  }

  // Penalti pengeluaran berlebih
  if (finPulse.status === 'critical') {
    score -= 15;
  } else if (finPulse.status === 'caution') {
    score -= 8;
  }

  // Penalti rutinitas belum selesai jika sudah sore/malam (> jam 16:00)
  if (now.getHours() >= 16 && habPulse.completionRate < 50 && habPulse.totalRoutines > 0) {
    score -= 12;
  }

  // Reward penyelesaian tugas
  const totalTasks = entries.length;
  if (totalTasks > 0) {
    const taskCompletionRate = (completedEntries.length / totalTasks) * 20;
    score = Math.min(100, Math.round(score * 0.8 + taskCompletionRate));
  }

  score = Math.max(15, Math.min(100, Math.round(score)));

  let statusLevel: 'excellent' | 'good' | 'warning' | 'alert' = 'good';
  let statusTitle = "Kondisi Seimbang & Terkendali";
  let statusBadge = "Optimal";

  if (score >= 85) {
    statusLevel = 'excellent';
    statusTitle = "Kinerja Sangat Produktif";
    statusBadge = "Prima";
  } else if (score >= 70) {
    statusLevel = 'good';
    statusTitle = "Ritme Kerja & Keuangan Terkendali";
    statusBadge = "Stabil";
  } else if (score >= 50) {
    statusLevel = 'warning';
    statusTitle = "Perlu Fokus Prioritas Hari Ini";
    statusBadge = "Perhatian";
  } else {
    statusLevel = 'alert';
    statusTitle = "Beban Tugas & Batas Anggaran Kritis";
    statusBadge = "Kritis";
  }

  // Generate Insight Dinamis Cerdas
  const insights: string[] = [];

  if (overdueEntries.length > 0) {
    insights.push(`Ada ${overdueEntries.length} kegiatan melewati tenggat waktu. Selesaikan segera untuk memulihkan skor harian.`);
  } else if (dueTodayEntries.length > 0) {
    insights.push(`${dueTodayEntries.length} tugas harus tuntas hari ini sebelum tengah malam.`);
  } else {
    insights.push("Tidak ada tugas tertunda yang mendesak hari ini. Beban kerja sangat terkontrol.");
  }

  if (finPulse.status === 'critical') {
    insights.push(`Pengeluaran hari ini Rp ${finPulse.todayExpense.toLocaleString('id-ID')} melampaui batas harian aman (Rp ${finPulse.safeDailySpend.toLocaleString('id-ID')}).`);
  } else if (finPulse.todayExpense === 0) {
    insights.push(`Batas belanja aman hari ini adalah Rp ${finPulse.safeDailySpend.toLocaleString('id-ID')}. Belum ada pengeluaran dicatat.`);
  } else {
    insights.push(`Pengeluaran hari ini Rp ${finPulse.todayExpense.toLocaleString('id-ID')} (${finPulse.spendRatioToday}% dari batas harian Rp ${finPulse.safeDailySpend.toLocaleString('id-ID')}).`);
  }

  if (habPulse.totalRoutines > 0 && habPulse.completedRoutines < habPulse.totalRoutines) {
    insights.push(`${habPulse.pendingRoutines.length} rutinitas harian belum dicentang hari ini.`);
  }

  return {
    pulseScore: score,
    statusLevel,
    statusTitle,
    statusBadge,
    nextBestAction: nextAction,
    financialPulse: finPulse,
    habitPulse: habPulse,
    insights,
    productivityStats: {
      totalPending: pendingEntries.length,
      totalOverdue: overdueEntries.length,
      dueToday: dueTodayEntries.length,
      completedToday: completedEntries.length
    }
  };
}
