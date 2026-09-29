export type Urgency = 'low' | 'medium' | 'high' | 'urgent';

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

export interface ActivityEntry {
  id: string;
  title: string;
  content: string;
  category: 'game' | 'kuliah' | 'rutinitas' | string;
  urgency: Urgency;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  deadline: string; // ISO String or Date
  reminderTime?: string; // HH:MM or ISO String for custom notification
  reminderEnabled: boolean;
  reminderSent?: boolean;
  
  // Specific category details
  gameDetails?: {
    platform?: string;
    dailyQuest?: string;
    playtimeMinutes?: number;
  };
  courseDetails?: {
    courseName?: string;
    subtasks?: SubTask[];
  };
  routineDetails?: {
    frequency?: 'daily' | 'weekly_monday' | 'custom' | 'weekly' | 'weekdays' | 'none';
    timeOfDay?: string;
    customResetDays?: number; // every X days
    lastResetAt?: string;
  };
}

export interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  status: 'synced' | 'pending' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface FinanceCategoryMap {
  income: string[];
  expense: string[];
  transfer: string[];
}

export interface CloudDataBackup {
  entries: ActivityEntry[];
  financeEntries: FinanceEntry[];
  customCategories: string[];
  customAccounts?: CustomAccount[];
  financeCategories?: FinanceCategoryMap;
  updatedAt: string;
}

export type FinanceType = 'income' | 'expense' | 'transfer';
export type FinanceAccount = string;

export interface CustomAccount {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash';
}

export interface FinanceEntry {
  id: string;
  type: FinanceType;
  amount: number;
  sourceAccount: FinanceAccount;
  destinationAccount?: FinanceAccount; // Only for transfer
  category: string;
  description: string;
  date: string; // ISO string for the transaction date
  createdAt: string;
  userId?: string;
}
