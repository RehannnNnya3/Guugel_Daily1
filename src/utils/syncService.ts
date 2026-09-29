import { ActivityEntry, CloudDataBackup, CustomAccount, FinanceCategoryMap, FinanceEntry } from '../types';

const API_SYNC_URL = '/api/sync';

export async function backupDataToCloud(
  entries: ActivityEntry[], 
  financeEntries: FinanceEntry[], 
  customCategories: string[],
  customAccounts?: CustomAccount[],
  financeCategories?: FinanceCategoryMap
): Promise<string> {
  const payload = {
    entries,
    financeEntries: financeEntries || [],
    customCategories: customCategories || [],
    customAccounts: customAccounts || [],
    financeCategories: financeCategories || null,
    updatedAt: new Date().toISOString()
  };

  const response = await fetch(API_SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Server error during sync');
  }

  const result = await response.json();
  return result.updatedAt;
}

export async function fetchFromCloud(): Promise<CloudDataBackup> {
  const response = await fetch(API_SYNC_URL);
  
  if (!response.ok) {
    throw new Error('Gagal mengambil data sinkronisasi dari cloud');
  }

  const data = await response.json();
  return data;
}

// Check server connectivity health
export async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(id);
    return response.ok;
  } catch (error) {
    return false;
  }
}
