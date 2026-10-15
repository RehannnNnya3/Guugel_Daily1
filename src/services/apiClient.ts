import { ActivityEntry, FinanceEntry, CustomAccount, FinanceCategoryMap } from '../types.ts';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface DbStatusInfo {
  driver: 'mysql' | 'json_fallback';
  connected: boolean;
  database: string;
  host: string;
  user: string;
  message: string;
}

export const apiClient = {
  // Database status
  async getDbStatus(): Promise<DbStatusInfo> {
    const res = await fetch('/api/database/status');
    if (!res.ok) throw new Error('Failed to get database status');
    return res.json();
  },

  // Activities CRUD
  async getActivities(userId: string = 'local_user'): Promise<ActivityEntry[]> {
    const res = await fetch(`/api/activities?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch activities');
    return res.json();
  },

  async createActivity(entry: Omit<ActivityEntry, 'id' | 'createdAt'> & { id?: string }, userId: string = 'local_user'): Promise<ActivityEntry> {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, userId })
    });
    if (!res.ok) throw new Error('Failed to create activity');
    return res.json();
  },

  async updateActivity(id: string, entry: Partial<ActivityEntry>, userId: string = 'local_user'): Promise<ActivityEntry> {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, userId })
    });
    if (!res.ok) throw new Error('Failed to update activity');
    return res.json();
  },

  async deleteActivity(id: string, userId: string = 'local_user'): Promise<void> {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete activity');
  },

  // Finance CRUD
  async getFinanceEntries(userId: string = 'local_user'): Promise<FinanceEntry[]> {
    const res = await fetch(`/api/finance?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch finance entries');
    return res.json();
  },

  async createFinanceEntry(entry: Omit<FinanceEntry, 'id'> & { id?: string }, userId: string = 'local_user'): Promise<FinanceEntry> {
    const res = await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, userId })
    });
    if (!res.ok) throw new Error('Failed to create finance entry');
    return res.json();
  },

  async updateFinanceEntry(id: string, entry: Partial<FinanceEntry>, userId: string = 'local_user'): Promise<FinanceEntry> {
    const res = await fetch(`/api/finance/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, userId })
    });
    if (!res.ok) throw new Error('Failed to update finance entry');
    return res.json();
  },

  async deleteFinanceEntry(id: string, userId: string = 'local_user'): Promise<void> {
    const res = await fetch(`/api/finance/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete finance entry');
  },

  // Settings & Accounts
  async getSettings(userId: string = 'local_user'): Promise<{
    customCategories: string[];
    financeCategories: FinanceCategoryMap | null;
    customAccounts: CustomAccount[];
  }> {
    const res = await fetch(`/api/settings?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async saveSettings(settings: {
    customCategories?: string[];
    financeCategories?: FinanceCategoryMap | null;
    customAccounts?: CustomAccount[];
  }, userId: string = 'local_user'): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, userId })
    });
    if (!res.ok) throw new Error('Failed to save settings');
  },

  // Auth (Local / MySQL user)
  async login(email?: string, name?: string): Promise<AppUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });
    if (!res.ok) throw new Error('Failed to login');
    const data = await res.json();
    return data.user;
  },

  async getMe(): Promise<AppUser> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Failed to get user profile');
    return res.json();
  }
};
