import { Activity } from './Activity.ts';
import { FinanceTransaction } from './FinanceTransaction.ts';
import { ActivityEntry, FinanceEntry } from '../types.ts';
import {
  calculateExecutiveSummary as calcExecSummary,
  calculateFinancialPulse as calcFinPulse,
  calculateHabitPulse as calcHabitPulse,
  selectNextBestAction as selNextBestAction,
  getRecommendedFocusBlock as getFocusBlock,
  SmartExecutiveSummary,
  FinancialPulse,
  HabitPulse,
  NextBestAction,
} from '../utils/smartSystemEngine.ts';

/**
 * Model SmartEngine mewakili mesin kalkulasi kecerdasan lokal sistem (100% offline).
 * Sesuai revisi Class Diagram:
 * - calculateExecutiveSummary(): SmartExecutiveSummary
 * - calculateFinancialPulse(): FinancialPulse
 * - calculateHabitPulse(): HabitPulse
 * - selectNextBestAction(): NextBestAction | null
 */
export class SmartEngine {
  public activities: Activity[];
  public transactions: FinanceTransaction[];

  constructor(
    activities: (Activity | ActivityEntry)[] = [],
    transactions: (FinanceTransaction | FinanceEntry)[] = []
  ) {
    this.activities = activities.map(a => a instanceof Activity ? a : Activity.fromJSON(a));
    this.transactions = transactions.map(t => t instanceof FinanceTransaction ? t : FinanceTransaction.fromJSON(t));
  }

  /**
   * Mengambil data entri mentah untuk kompatibilitas fungsi utilitas
   */
  private getRawEntries(): { rawActivities: ActivityEntry[]; rawTransactions: FinanceEntry[] } {
    return {
      rawActivities: this.activities.map(a => a.toJSON()),
      rawTransactions: this.transactions.map(t => t.toJSON()),
    };
  }

  /**
   * Menghitung ringkasan eksekutif komprehensif sistem (Pulse Score 0-100, status, rekomendasi)
   */
  public calculateExecutiveSummary(now: Date = new Date()): SmartExecutiveSummary {
    const { rawActivities, rawTransactions } = this.getRawEntries();
    return calcExecSummary(rawActivities, rawTransactions, now);
  }

  /**
   * Menghitung denyut kestabilan finansial dan batas pengeluaran harian aman
   */
  public calculateFinancialPulse(now: Date = new Date()): FinancialPulse {
    const { rawTransactions } = this.getRawEntries();
    return calcFinPulse(rawTransactions, now);
  }

  /**
   * Menghitung rasio konsistensi rutinitas dan kebiasaan harian
   */
  public calculateHabitPulse(): HabitPulse {
    const { rawActivities } = this.getRawEntries();
    return calcHabitPulse(rawActivities);
  }

  /**
   * Menentukan tugas prioritas tunggal terbaik untuk dikerjakan saat ini (Next Best Action)
   */
  public selectNextBestAction(now: Date = new Date()): NextBestAction | null {
    const { rawActivities } = this.getRawEntries();
    return selNextBestAction(rawActivities, now);
  }

  /**
   * Memberikan rekomendasi blok waktu fokus berdasarkan beban tugas tertunda
   */
  public getRecommendedFocusBlock() {
    const { rawActivities } = this.getRawEntries();
    return getFocusBlock(rawActivities);
  }

  // --- Static Convenience Methods ---

  public static calculateExecutiveSummary(
    activities: ActivityEntry[],
    transactions: FinanceEntry[],
    now: Date = new Date()
  ): SmartExecutiveSummary {
    return calcExecSummary(activities, transactions, now);
  }

  public static calculateFinancialPulse(
    transactions: FinanceEntry[],
    now: Date = new Date()
  ): FinancialPulse {
    return calcFinPulse(transactions, now);
  }

  public static calculateHabitPulse(
    activities: ActivityEntry[]
  ): HabitPulse {
    return calcHabitPulse(activities);
  }

  public static selectNextBestAction(
    activities: ActivityEntry[],
    now: Date = new Date()
  ): NextBestAction | null {
    return selNextBestAction(activities, now);
  }
}
