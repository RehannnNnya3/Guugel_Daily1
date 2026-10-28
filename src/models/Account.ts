import { CustomAccount } from '../types.ts';

/**
 * Model Account mewakili dompet atau rekening finansial pengguna (Bank, E-Wallet, Kas Tunai).
 */
export class Account {
  public id: string;
  public name: string;
  public type: 'bank' | 'ewallet' | 'cash';
  public balance: number;

  constructor(params: {
    id?: string;
    name: string;
    type?: 'bank' | 'ewallet' | 'cash';
    balance?: number;
  }) {
    this.id = params.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = params.name.trim();
    this.type = params.type || 'cash';
    this.balance = Number(params.balance) || 0;
  }

  /**
   * Menambahkan saldo ke akun (kredit/pemasukan)
   */
  public credit(amount: number): void {
    if (amount > 0) {
      this.balance += amount;
    }
  }

  /**
   * Mengurangi saldo akun (debit/pengeluaran)
   */
  public debit(amount: number): boolean {
    if (amount > 0) {
      this.balance -= amount;
      return true;
    }
    return false;
  }

  /**
   * Mengambil saldo saat ini
   */
  public getBalance(): number {
    return this.balance;
  }

  /**
   * Format saldo dalam rupiah (IDR)
   */
  public getFormattedBalance(): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(this.balance);
  }

  /**
   * Konversi ke CustomAccount standar
   */
  public toJSON(): CustomAccount & { balance: number } {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      balance: this.balance,
    };
  }

  /**
   * Factory method dari data akun
   */
  public static fromJSON(data: any): Account {
    return new Account({
      id: data.id,
      name: data.name || 'Akun',
      type: data.type || 'cash',
      balance: data.balance || 0,
    });
  }
}
