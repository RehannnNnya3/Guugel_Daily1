import { FinanceEntry, FinanceType, FinanceAccount } from '../types.ts';

/**
 * Model FinanceTransaction mewakili transaksi pemasukan, pengeluaran, atau transfer dana.
 */
export class FinanceTransaction {
  public id: string;
  public type: FinanceType;
  public amount: number;
  public sourceAccount: FinanceAccount;
  public destinationAccount?: FinanceAccount;
  public category: string;
  public description: string;
  public date: string;
  public createdAt: string;
  public userId?: string;

  constructor(params: {
    id?: string;
    type: FinanceType;
    amount: number;
    sourceAccount: FinanceAccount;
    destinationAccount?: FinanceAccount;
    category: string;
    description?: string;
    date?: string;
    createdAt?: string;
    userId?: string;
  }) {
    this.id = params.id || `fin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = params.type;
    this.amount = Math.max(0, Number(params.amount) || 0);
    this.sourceAccount = params.sourceAccount;
    this.destinationAccount = params.destinationAccount;
    this.category = params.category || 'Lain-lain';
    this.description = (params.description || '').trim();
    this.date = params.date || new Date().toISOString();
    this.createdAt = params.createdAt || new Date().toISOString();
    this.userId = params.userId;
  }

  /**
   * Cek apakah transaksi bertipe pengeluaran
   */
  public isExpense(): boolean {
    return this.type === 'expense';
  }

  /**
   * Cek apakah transaksi bertipe pemasukan
   */
  public isIncome(): boolean {
    return this.type === 'income';
  }

  /**
   * Cek apakah transaksi bertipe pemindahan antar rekening
   */
  public isTransfer(): boolean {
    return this.type === 'transfer';
  }

  /**
   * Format nominal ke format rupiah standar Indonesia (IDR)
   */
  public getFormattedAmount(): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(this.amount);
  }

  /**
   * Konversi ke FinanceEntry interface
   */
  public toJSON(): FinanceEntry {
    return {
      id: this.id,
      type: this.type,
      amount: this.amount,
      sourceAccount: this.sourceAccount,
      destinationAccount: this.destinationAccount,
      category: this.category,
      description: this.description,
      date: this.date,
      createdAt: this.createdAt,
      userId: this.userId,
    };
  }

  /**
   * Factory method untuk membuat instance dari FinanceEntry
   */
  public static fromJSON(data: FinanceEntry): FinanceTransaction {
    return new FinanceTransaction({
      id: data.id,
      type: data.type,
      amount: data.amount,
      sourceAccount: data.sourceAccount,
      destinationAccount: data.destinationAccount,
      category: data.category,
      description: data.description,
      date: data.date,
      createdAt: data.createdAt,
      userId: data.userId,
    });
  }
}
