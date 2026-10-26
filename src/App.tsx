import React, { useState, useEffect, useRef } from 'react';
import { ActivityEntry, SyncStatus, Urgency, FinanceEntry, CustomAccount, FinanceCategoryMap } from './types.ts';
import ActivityForm from './components/ActivityForm.tsx';
import ActivityCard from './components/ActivityCard.tsx';
import NotificationToast from './components/NotificationToast.tsx';
import FinanceDashboard from './components/finance/FinanceDashboard.tsx';
import FinanceForm from './components/finance/FinanceForm.tsx';
import { 
  playChime, 
  playSuccessSound, 
  playTickSound 
} from './utils/audio.ts';
import { 
  backupDataToCloud, 
  fetchFromCloud, 
  checkServerHealth 
} from './utils/syncService.ts';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Bell, 
  BellOff, 
  Gamepad2, 
  GraduationCap, 
  Calendar, 
  Trash2, 
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  FolderSync,
  Clock,
  LogIn,
  LogOut,
  User as UserIcon,
  CloudLightning,
  Wallet,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Database & REST API Client (MySQL / MariaDB Backend)
import { apiClient, AppUser, DbStatusInfo } from './services/apiClient.ts';
import AuthScreen from './components/AuthScreen.tsx';
import MobileSyncModal from './components/MobileSyncModal.tsx';
import { generateOfflineTaskBreakdown } from './utils/offlineEngine.ts';
import { SmartExecutiveWidget } from './components/SmartExecutiveWidget.tsx';

const LOCAL_STORAGE_KEY_ENTRIES = 'catatan_harian_entries';
const LOCAL_STORAGE_KEY_CATEGORIES = 'catatan_harian_categories';
const LOCAL_STORAGE_KEY_ACCOUNTS = 'catatan_harian_accounts';
const LOCAL_STORAGE_KEY_FINANCE_CATS = 'catatan_harian_finance_cats';
const LOCAL_STORAGE_KEY_FINANCE = 'catatan_harian_finance';

// Initial dummy data to make the app look great on very first load


const INITIAL_FINANCE_CATEGORIES: FinanceCategoryMap = {
  income: ['Gaji', 'Freelance', 'Bonus', 'Transfer Masuk', 'Lainnya'],
  expense: ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Lainnya'],
  transfer: ['Tarik Tunai', 'Top Up', 'Transfer Rekening']
};

const INITIAL_ACCOUNTS: CustomAccount[] = [
  { id: 'cash', name: 'Tunai', type: 'cash' },
  { id: 'bank_bri', name: 'BRI', type: 'bank' },
  { id: 'bank_seabank', name: 'SeaBank', type: 'bank' },
  { id: 'ewallet_dana', name: 'DANA', type: 'ewallet' },
  { id: 'ewallet_gopay', name: 'GoPay', type: 'ewallet' },
  { id: 'ewallet_shopeepay', name: 'ShopeePay', type: 'ewallet' },
  { id: 'ewallet_ovo', name: 'OVO', type: 'ewallet' }
];

const INITIAL_ENTRIES: ActivityEntry[] = [];

export default function App() {
  const [activeModule, setActiveModule] = useState<'activity' | 'finance'>('activity');
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>(['Kesehatan', 'Pekerjaan']);
  const [customAccounts, setCustomAccounts] = useState<CustomAccount[]>(INITIAL_ACCOUNTS);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryMap>(INITIAL_FINANCE_CATEGORIES);
  
  // Auth & Database State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('app_user_session');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileSyncModal, setShowMobileSyncModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'deadline' | 'created'>('deadline');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ActivityEntry | null>(null);
  
  // Finance Form State
  const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
  const [editingFinanceEntry, setEditingFinanceEntry] = useState<FinanceEntry | null>(null);

  // Live clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Notification states
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    entry: ActivityEntry;
    type: 'alarm' | 'deadline';
  } | null>(null);
  const [browserNotificationAllowed, setBrowserNotificationAllowed] = useState(false);

  // Cloud Sync Status State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncedAt: null,
    status: 'pending'
  });

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const customCategoriesRef = useRef(customCategories);
  const customAccountsRef = useRef(customAccounts);
  const financeCategoriesRef = useRef(financeCategories);
  const entriesRef = useRef(entries);
  const financeEntriesRef = useRef(financeEntries);

  useEffect(() => {
    customCategoriesRef.current = customCategories;
  }, [customCategories]);
  useEffect(() => {
    customAccountsRef.current = customAccounts;
  }, [customAccounts]);
  useEffect(() => {
    financeCategoriesRef.current = financeCategories;
  }, [financeCategories]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    financeEntriesRef.current = financeEntries;
  }, [financeEntries]);

  // 1. Database & REST API Data Loader (MySQL / Local Backend)
  useEffect(() => {
    // Check notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotificationAllowed(Notification.permission === 'granted');
    }

    // Check DB status
    apiClient.getDbStatus().then(status => {
      setDbStatus(status);
    }).catch(err => {
      console.warn("Koneksi status DB:", err);
    });

    const loadAppData = async () => {
      setIsAuthLoading(true);
      setSyncStatus({ status: 'syncing', lastSyncedAt: null });

      const uid = currentUser?.uid || 'local_user';
      try {
        const [acts, fins, sets] = await Promise.all([
          apiClient.getActivities(uid),
          apiClient.getFinanceEntries(uid),
          apiClient.getSettings(uid)
        ]);

        const cleanedActs = Array.isArray(acts) ? acts.filter((e: ActivityEntry) => !e.id?.startsWith('demo-')) : [];
        setEntries(cleanedActs);
        localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(cleanedActs));

        setFinanceEntries(fins || []);
        localStorage.setItem(LOCAL_STORAGE_KEY_FINANCE, JSON.stringify(fins || []));

        if (sets?.customCategories && Array.isArray(sets.customCategories)) {
          setCustomCategories(sets.customCategories);
          localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(sets.customCategories));
        }
        if (sets?.financeCategories) {
          setFinanceCategories(sets.financeCategories);
          localStorage.setItem(LOCAL_STORAGE_KEY_FINANCE_CATS, JSON.stringify(sets.financeCategories));
        }
        if (sets?.customAccounts && Array.isArray(sets.customAccounts) && sets.customAccounts.length > 0) {
          setCustomAccounts(sets.customAccounts);
          localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(sets.customAccounts));
        }

        setSyncStatus({
          status: 'synced',
          lastSyncedAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.warn("Gagal memuat dari API, beralih ke cache lokal:", err);
        const storedEntries = localStorage.getItem(LOCAL_STORAGE_KEY_ENTRIES);
        const storedCategories = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
        const storedAccounts = localStorage.getItem(LOCAL_STORAGE_KEY_ACCOUNTS);
        const storedFinCats = localStorage.getItem(LOCAL_STORAGE_KEY_FINANCE_CATS);
        const storedFinance = localStorage.getItem(LOCAL_STORAGE_KEY_FINANCE);

        if (storedEntries) {
          try {
            const parsed = JSON.parse(storedEntries);
            const cleaned = Array.isArray(parsed) ? parsed.filter((e: ActivityEntry) => !e.id?.startsWith('demo-')) : [];
            setEntries(cleaned);
          } catch (e) {
            setEntries([]);
          }
        } else {
          setEntries([]);
        }

        if (storedCategories) {
          try { setCustomCategories(JSON.parse(storedCategories)); } catch (e) {}
        }
        if (storedAccounts) {
          try { setCustomAccounts(JSON.parse(storedAccounts)); } catch (e) {}
        }
        if (storedFinCats) {
          try { setFinanceCategories(JSON.parse(storedFinCats)); } catch (e) { setFinanceCategories(INITIAL_FINANCE_CATEGORIES); }
        } else {
          setFinanceCategories(INITIAL_FINANCE_CATEGORIES);
        }
        
        if (storedFinance) {
          try { setFinanceEntries(JSON.parse(storedFinance)); } catch(e) {}
        } else {
          setFinanceEntries([]);
        }

        setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
      } finally {
        setIsAuthLoading(false);
      }
    };

    loadAppData();
  }, [currentUser]);

  // 2. Alarm checking loop - Runs every 5 seconds to check deadlines and alerts
  useEffect(() => {
    const alarmCheckInterval = setInterval(() => {
      const now = new Date();
      let stateChanged = false;
      const currentEntries = entriesRef.current;

      const updatedEntries = currentEntries.map(entry => {
        if (entry.status === 'completed') return entry;

        // 2a. Check Custom Alarm Time
        if (entry.reminderEnabled && entry.reminderTime && !entry.reminderSent) {
          const reminderDate = new Date(entry.reminderTime);
          
          // If past or equal to current time, and within last 15 minutes (to avoid stale old triggers)
          const diffMs = now.getTime() - reminderDate.getTime();
          if (diffMs >= 0 && diffMs < 15 * 60000) {
            triggerAlarmNotification(entry, 'alarm');
            stateChanged = true;
            return { ...entry, reminderSent: true };
          }
        }

        // 2b. Check exact deadline approaching if alarm is on but no specific alarm time was hit, or as fallback
        if (entry.deadline && !entry.reminderSent) {
          const deadlineDate = new Date(entry.deadline);
          const diffMs = deadlineDate.getTime() - now.getTime();
          
          // Trigger deadline warning 5 minutes before
          if (diffMs > 0 && diffMs <= 5 * 60000) {
            triggerAlarmNotification(entry, 'deadline');
            stateChanged = true;
            return { ...entry, reminderSent: true };
          }
        }

        return entry;
      });

      if (stateChanged) {
        setEntries(updatedEntries);
        localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updatedEntries));
        // Auto sync with server
        triggerCloudSyncPush(updatedEntries, customCategoriesRef.current, financeEntriesRef.current, customAccountsRef.current);
      }

      // 3. Auto-delete completed tasks at 4 AM
      const getPurgeDateStr = (date: Date) => {
        const d = new Date(date);
        if (d.getHours() < 4) {
          d.setDate(d.getDate() - 1);
        }
        return d.toDateString();
      };

      const currentPurgeDate = getPurgeDateStr(now);
      const lastPurgeDate = localStorage.getItem('last_purge_date');

      if (lastPurgeDate !== currentPurgeDate) {
        let hasChanges = false;
        
        const nextEntries = currentEntries.filter(entry => {
          if (entry.status !== 'completed') return true;
          
          if (entry.routineDetails && entry.routineDetails.frequency) {
            // It's a recurring task
            const { frequency, customResetDays, lastResetAt } = entry.routineDetails;
            let shouldReset = false;
            
            if (frequency === 'daily') {
              shouldReset = true;
            } else if (frequency === 'weekly_monday') {
              // Check if today is Monday
              const day = now.getDay();
              if (day === 1 || !lastResetAt) {
                // If it's monday, or it hasn't been reset before, we reset
                shouldReset = true;
              }
            } else if (frequency === 'custom' && customResetDays) {
              if (lastResetAt) {
                const diffTime = Math.abs(now.getTime() - new Date(lastResetAt).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays >= customResetDays) {
                  shouldReset = true;
                }
              } else {
                shouldReset = true;
              }
            }
            
            if (shouldReset) {
              entry.status = 'pending';
              entry.routineDetails.lastResetAt = now.toISOString();
              if (entry.courseDetails && entry.courseDetails.subtasks) {
                entry.courseDetails.subtasks.forEach(st => st.done = false);
              }
              hasChanges = true;
              return true; // Keep it
            }
          }
          
          // Non-recurring completed task -> Delete
          hasChanges = true;
          return false;
        });

        if (hasChanges) {
          setEntries(nextEntries);
          localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(nextEntries));
          triggerCloudSyncPush(nextEntries, customCategoriesRef.current, financeEntriesRef.current, customAccountsRef.current);
        }
        // Mark as purged for this "day"
        localStorage.setItem('last_purge_date', currentPurgeDate);
      }
    }, 5000);

    return () => clearInterval(alarmCheckInterval);
  }, []);

  // Handle playing chimes and showing notification
  const triggerAlarmNotification = (entry: ActivityEntry, type: 'alarm' | 'deadline') => {
    playChime();
    setActiveNotification({
      id: `${entry.id}-${Date.now()}`,
      entry,
      type
    });

    // Native browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = type === 'alarm' ? `⏰ Pengingat: ${entry.title}` : `🚨 Deadline Dekat: ${entry.title}`;
      const options = {
        body: entry.content || `Aktivitas ${entry.category} Anda sudah mendekati waktunya.`,
        icon: '/favicon.ico',
        tag: entry.id,
        requireInteraction: true
      };
      new Notification(title, options);
    }
  };

  // Browser Notification Perms
  const requestBrowserNotificationPermission = () => {
    if ('Notification' in window) {
      playTickSound();
      Notification.requestPermission().then(permission => {
        setBrowserNotificationAllowed(permission === 'granted');
        if (permission === 'granted') {
          new Notification('Notifikasi Aktif!', {
            body: 'Anda akan menerima pengingat harian secara real-time di desktop.',
            icon: '/favicon.ico'
          });
        }
      });
    } else {
      console.warn('Browser Anda tidak mendukung push notification.');
    }
  };

  // Helper to sync push (upload state to backend)
  const triggerCloudSyncPush = async (currentEntries: ActivityEntry[], categories: string[], currentFinance: FinanceEntry[], currentAccounts: CustomAccount[] = customAccountsRef.current, currentFinCats: FinanceCategoryMap = financeCategoriesRef.current) => {
    setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
    try {
      const serverAvailable = await checkServerHealth();
      if (!serverAvailable) {
        setSyncStatus(prev => ({ 
          ...prev, 
          status: 'pending',
          errorMessage: 'Server offline, perubahan disimpan secara lokal.'
        }));
        return;
      }

      const syncTime = await backupDataToCloud(currentEntries, currentFinance, categories, currentAccounts, currentFinCats);
      setSyncStatus({
        status: 'synced',
        lastSyncedAt: syncTime
      });
    } catch (error: any) {
      console.warn("Frictionless push backup failed:", error);
      setSyncStatus(prev => ({ 
        ...prev, 
        status: 'error',
        errorMessage: 'Gagal sinkron otomatis.'
      }));
    }
  };

  // Helper to sync pull (load backup from backend or merge)
  const triggerCloudSyncPull = async (localEntries: ActivityEntry[]) => {
    setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
    try {
      const serverAvailable = await checkServerHealth();
      if (!serverAvailable) {
        setSyncStatus(prev => ({ 
          ...prev, 
          status: 'pending',
          lastSyncedAt: null,
          errorMessage: 'Server tidak terjangkau. Menggunakan data lokal.'
        }));
        return;
      }

      const cloudData = await fetchFromCloud();
      if (cloudData && Array.isArray(cloudData.entries)) {
        // If server data exists, compare timestamps or directly load
        // For a single-user applet, we replace with cloud backup if cloud is newer or simply trust cloud
        const cleanEntries = cloudData.entries.filter(e => !e.id?.startsWith('demo-'));
        setEntries(cleanEntries);
        localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(cleanEntries));
        
        if (cloudData.customCategories && cloudData.customCategories.length > 0) {
          setCustomCategories(cloudData.customCategories);
          localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(cloudData.customCategories));
        }
        if (cloudData.customAccounts && cloudData.customAccounts.length > 0) {
          setCustomAccounts(cloudData.customAccounts);
          localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(cloudData.customAccounts));
        }
        if (cloudData.financeCategories) {
          setFinanceCategories(cloudData.financeCategories);
          localStorage.setItem(LOCAL_STORAGE_KEY_FINANCE_CATS, JSON.stringify(cloudData.financeCategories));
        }
        
        if (cloudData.financeEntries && cloudData.financeEntries.length > 0) {
          setFinanceEntries(cloudData.financeEntries);
          localStorage.setItem(LOCAL_STORAGE_KEY_FINANCE, JSON.stringify(cloudData.financeEntries));
        }

        setSyncStatus({
          status: 'synced',
          lastSyncedAt: cloudData.updatedAt
        });
      } else {
        // If cloud is empty but local is populated, sync local to cloud!
        await backupDataToCloud(localEntries, financeEntries, customCategories, customAccounts, financeCategories);
        setSyncStatus({
          status: 'synced',
          lastSyncedAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error("Cloud data fetch failed:", error);
      setSyncStatus(prev => ({ 
        ...prev, 
        status: 'error',
        errorMessage: 'Sinkronisasi awan gagal pada startup.'
      }));
    }
  };

  // Save Finance Entry
  const handleSaveFinanceEntry = async (formOutput: Omit<FinanceEntry, 'id' | 'createdAt' | 'userId'> & { id?: string }) => {
    playSuccessSound();
    
    setIsFinanceFormOpen(false);
    setEditingFinanceEntry(null);

    let updatedFinance: FinanceEntry[] = [];
    const newId = formOutput.id || ('finance-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
    const isEditing = !!formOutput.id;
    const existing = isEditing ? financeEntries.find(e => e.id === formOutput.id) : null;
    
    const baseEntry = {
        ...formOutput,
        id: newId,
        createdAt: existing?.createdAt || new Date().toISOString()
    };

    if (isEditing) {
        updatedFinance = financeEntries.map(e => e.id === formOutput.id ? { ...e, ...baseEntry } as FinanceEntry : e);
    } else {
        updatedFinance = [baseEntry as FinanceEntry, ...financeEntries];
    }

    const uid = currentUser?.uid || 'local_user';
    try {
      if (isEditing) {
        await apiClient.updateFinanceEntry(newId, baseEntry, uid);
      } else {
        await apiClient.createFinanceEntry(baseEntry, uid);
      }
      setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Gagal menyimpan transaksi ke database:", err);
      localStorage.setItem(LOCAL_STORAGE_KEY_FINANCE, JSON.stringify(updatedFinance));
      triggerCloudSyncPush(entries, customCategories, updatedFinance, customAccounts);
    }
  };

  // Delete Finance Entry
  const handleDeleteFinanceEntry = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      playTickSound();
      const updated = financeEntries.filter(entry => entry.id !== id);
      setFinanceEntries(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY_FINANCE, JSON.stringify(updated));

      const uid = currentUser?.uid || 'local_user';
      try {
        await apiClient.deleteFinanceEntry(id, uid);
        setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Gagal menghapus transaksi dari database:", err);
        triggerCloudSyncPush(entries, customCategories, updated, customAccounts);
      }
    }
  };

  // Save / Add handler
  const handleSaveEntry = async (formOutput: Omit<ActivityEntry, 'id' | 'createdAt'> & { id?: string }) => {
    playSuccessSound();
    
    // Close form immediately for better UX
    setIsFormOpen(false);
    setEditingEntry(null);

    let updatedEntries: ActivityEntry[] = [];
    const newId = formOutput.id || ('task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
    const isEditing = !!formOutput.id;
    const existing = isEditing ? entries.find(e => e.id === formOutput.id) : null;
    
    const baseEntry = {
        ...formOutput,
        id: newId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        reminderSent: (existing?.deadline !== formOutput.deadline || existing?.reminderTime !== formOutput.reminderTime) ? false : (existing?.reminderSent || false)
    };

    if (isEditing) {
        updatedEntries = entries.map(e => e.id === formOutput.id ? { ...e, ...baseEntry } as ActivityEntry : e);
    } else {
        updatedEntries = [baseEntry as ActivityEntry, ...entries];
    }

    // Optimistic update
    setEntries(updatedEntries);
    localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updatedEntries));
    
    const uid = currentUser?.uid || 'local_user';
    try {
      if (isEditing) {
        await apiClient.updateActivity(newId, baseEntry, uid);
      } else {
        await apiClient.createActivity(baseEntry, uid);
      }
      setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Gagal menyimpan kegiatan ke database:", err);
      triggerCloudSyncPush(updatedEntries, customCategories, financeEntries, customAccounts);
    }
  };

  // Toggle complete
  const handleToggleStatus = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const newStatus = entry.status === 'completed' ? 'pending' : 'completed';
    if (newStatus === 'completed') {
      playSuccessSound();
    } else {
      playTickSound();
    }

    const updated = entries.map(e => e.id === id ? { ...e, status: newStatus as any } : e);
    setEntries(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    const uid = currentUser?.uid || 'local_user';
    try {
      await apiClient.updateActivity(id, { status: newStatus as any }, uid);
      setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Gagal mengubah status di database:", err);
    }
  };

  // Quick Reschedule: Tunda deadline + alarm push
  const handleQuickReschedule = async (id: string, hoursToAdd: number) => {
    playTickSound();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const currentDeadline = new Date(entry.deadline);
    const newDeadline = new Date(currentDeadline.getTime() + hoursToAdd * 3600000);
    
    let newReminderTime = entry.reminderTime;
    if (entry.reminderEnabled && entry.reminderTime) {
      const currentReminder = new Date(entry.reminderTime);
      newReminderTime = new Date(currentReminder.getTime() + hoursToAdd * 3600000).toISOString();
    }

    const patch = {
      deadline: newDeadline.toISOString(),
      reminderTime: newReminderTime,
      reminderSent: false
    };

    const updated = entries.map(e => e.id === id ? { ...e, ...patch } : e);
    setEntries(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    const uid = currentUser?.uid || 'local_user';
    try {
      await apiClient.updateActivity(id, patch, uid);
      setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Gagal reschedule di database:", err);
    }
  };

  // Toggle college subtask directly on Card
  const handleToggleSubtask = async (entryId: string, subtaskId: string) => {
    playTickSound();
    const entry = entries.find(e => e.id === entryId);
    if (!entry || !entry.courseDetails?.subtasks) return;

    const updatedSubtasks = entry.courseDetails.subtasks.map(t => 
      t.id === subtaskId ? { ...t, done: !t.done } : t
    );

    const patch = {
      courseDetails: {
        ...entry.courseDetails,
        subtasks: updatedSubtasks
      }
    };

    const updated = entries.map(e => e.id === entryId ? { ...e, ...patch } : e);
    setEntries(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    const uid = currentUser?.uid || 'local_user';
    try {
      await apiClient.updateActivity(entryId, patch, uid);
    } catch (err) {
      console.error("Gagal mengubah subtask di database:", err);
    }
  };

  // AI Auto-Breakdown for university tasks directly on Card
  const handleAiBreakdownTask = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    playTickSound();
    try {
      // 100% Offline Local Breakdown
      const data = generateOfflineTaskBreakdown(
        entry.courseDetails?.courseName || entry.title,
        entry.title,
        entry.content
      );

      if (Array.isArray(data.subtasks) && data.subtasks.length > 0) {
        const newSubtasks = data.subtasks.map((st, idx) => ({
          id: `local-${Date.now()}-${idx}`,
          text: st.text,
          done: false
        }));

        playSuccessSound();

        const patch = {
          courseDetails: {
            courseName: entry.courseDetails?.courseName || entry.title,
            subtasks: newSubtasks
          }
        };

        const updated = entries.map(e => e.id === entryId ? { ...e, ...patch } : e);
        setEntries(updated);
        localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updated));

        const uid = currentUser?.uid || 'local_user';
        try {
          await apiClient.updateActivity(entryId, patch, uid);
        } catch (err) {
          console.warn("Simpan subtask lokal:", err);
        }
      }
    } catch (err) {
      console.error("Gagal auto-breakdown lokal:", err);
    }
  };

  // Delete
  const handleDeleteEntry = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan kegiatan ini?')) {
      playTickSound();
      const updated = entries.filter(entry => entry.id !== id);
      setEntries(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updated));

      const uid = currentUser?.uid || 'local_user';
      try {
        await apiClient.deleteActivity(id, uid);
        setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Gagal menghapus dari database:", err);
        triggerCloudSyncPush(updated, customCategories, financeEntries, customAccounts);
      }
    }
  };

  // Add Custom tag
  const handleAddCategory = async (newCat: string) => {
    playSuccessSound();
    const updatedCats = [...customCategories, newCat];
    setCustomCategories(updatedCats);
    localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(updatedCats));

    const uid = currentUser?.uid || 'local_user';
    try {
      await apiClient.saveSettings({ customCategories: updatedCats }, uid);
      setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Gagal menyimpan kategori ke database:", err);
      triggerCloudSyncPush(entries, updatedCats, financeEntries, customAccounts, financeCategories);
    }
  };

  // Clear all data
  const handleClearAllData = async () => {
    if (confirm('Hapus semua data kegiatan lokal dan setel ulang ke setelan awal?')) {
      playTickSound();
      const uid = currentUser?.uid || 'local_user';
      try {
        for (const entry of entries) {
          await apiClient.deleteActivity(entry.id, uid);
        }
      } catch (err) {
        console.error("Gagal menghapus seluruh data kegiatan:", err);
      }
      setEntries(INITIAL_ENTRIES);
      localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(INITIAL_ENTRIES));
      setSyncStatus({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    }
  };

  // Notification Toast interactions
  const handleNotificationDismiss = () => {
    setActiveNotification(null);
  };

  const handleNotificationComplete = (id: string) => {
    handleToggleStatus(id);
    setActiveNotification(null);
  };

  const handleNotificationSnooze = async (id: string) => {
    // Postpone the activity by 15 minutes
    playTickSound();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const currentDeadline = new Date();
    const snoozedDeadline = new Date(currentDeadline.getTime() + 15 * 60000); // 15 mins snooze
    const patch = {
      deadline: snoozedDeadline.toISOString(),
      reminderTime: snoozedDeadline.toISOString(),
      reminderSent: false
    };

    const updated = entries.map(e => e.id === id ? { ...e, ...patch } : e);
    setEntries(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    const uid = currentUser?.uid || 'local_user';
    try {
      await apiClient.updateActivity(id, patch, uid);
    } catch (err) {
      console.error("Gagal menunda notifikasi:", err);
    }
    setActiveNotification(null);
  };

  // 3. Filtering & Sorting Logic
  const filteredEntries = entries.filter(entry => {
    // Search query match
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (entry.courseDetails?.courseName && entry.courseDetails.courseName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Category match
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;

    // Urgency match
    const matchesUrgency = selectedUrgency === 'all' || entry.urgency === selectedUrgency;

    return matchesSearch && matchesCategory && matchesUrgency;
  });

  // Sort entries
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortBy === 'urgency') {
      const urgencyWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
      const weightA = urgencyWeight[a.urgency] || 0;
      const weightB = urgencyWeight[b.urgency] || 0;
      return weightB - weightA;
    } else if (sortBy === 'deadline') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    } else {
      // created
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Count highlights
  const countPending = entries.filter(e => e.status !== 'completed').length;
  const countUrgent = entries.filter(e => e.urgency === 'urgent' && e.status !== 'completed').length;
  const countCompleted = entries.filter(e => e.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col pb-8" id="app_root_layout">
      
      {/* 1. Header Navigation Bar & Cloud Sync Panel */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="app_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-sm shadow-indigo-600/10 shrink-0">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                SynchroDiary
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">| Catatan & Pengingat</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Mode Lokal Offline
                </span>
              </div>
            </div>
          </div>

          {/* Static Local Date Display - Offline Mode */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50 flex items-center gap-2 text-xs font-semibold text-slate-700 hidden md:flex shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Module Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveModule('activity'); playTickSound(); }}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeModule === 'activity' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Catatan Harian
          </button>
          <button
            onClick={() => { setActiveModule('finance'); playTickSound(); }}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeModule === 'finance' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Catatan Keuangan
          </button>
        </div>
      </div>

      {/* 2. Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1" id="app_main">
        {/* Smart Executive Widget - Ringkasan Cerdas 100% Offline */}
        <SmartExecutiveWidget
          entries={entries}
          financeEntries={financeEntries}
          onSelectTask={(id) => {
            const entry = entries.find(e => e.id === id);
            if (entry) {
              setEditingEntry(entry);
              setIsFormOpen(true);
            }
          }}
          onToggleStatus={(id) => {
            handleToggleStatus(id);
          }}
        />

        {activeModule === 'finance' ? (
          <FinanceDashboard
            financeCategories={financeCategories}
            setFinanceCategories={(cats) => { setFinanceCategories(cats); triggerCloudSyncPush(entries, customCategories, financeEntries, customAccounts, cats); }}
            entries={financeEntries}
            customAccounts={customAccounts}
            setCustomAccounts={setCustomAccounts}
            triggerCloudSyncPush={(acc) => triggerCloudSyncPush(entries, customCategories, financeEntries, acc, financeCategories)}
            onAddEntry={() => setIsFinanceFormOpen(true)}
            onEditEntry={(entry) => {
              setEditingFinanceEntry(entry);
              setIsFinanceFormOpen(true);
            }}
            onDeleteEntry={handleDeleteFinanceEntry}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (Filters & Sidebar) - 3 of 12 columns */}
            <aside className="col-span-1 lg:col-span-3 flex flex-col gap-6" id="sidebar_filters">
          
          {/* Categories List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => { setSelectedCategory('all'); playTickSound(); }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">📅</span> 
                <span className="flex-1 text-left">All Schedules</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">{entries.length}</span>
              </button>

              <button
                onClick={() => { setSelectedCategory('game'); playTickSound(); }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                  selectedCategory === 'game'
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">🎮</span> 
                <span className="flex-1 text-left">Gaming List</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">
                  {entries.filter(e => e.category === 'game').length}
                </span>
              </button>

              <button
                onClick={() => { setSelectedCategory('kuliah'); playTickSound(); }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                  selectedCategory === 'kuliah'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">🎓</span> 
                <span className="flex-1 text-left">University Tasks</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">
                  {entries.filter(e => e.category === 'kuliah').length}
                </span>
              </button>

              <button
                onClick={() => { setSelectedCategory('rutinitas'); playTickSound(); }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                  selectedCategory === 'rutinitas'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">🏠</span> 
                <span className="flex-1 text-left">Life Routine</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">
                  {entries.filter(e => e.category === 'rutinitas').length}
                </span>
              </button>

              {/* Custom User categories */}
              {customCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); playTickSound(); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-100 text-slate-800'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">🏷️</span> 
                  <span className="flex-1 text-left truncate">{cat}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-200/50 text-slate-600 rounded-full font-bold">
                    {entries.filter(e => e.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Urgency Filter</h3>
            <div className="space-y-2 text-xs font-medium">
              {[
                { val: 'all', label: 'All Urgencies', dot: 'bg-slate-400' },
                { val: 'urgent', label: 'Critical / Gawat', dot: 'bg-rose-500' },
                { val: 'high', label: 'High Priority', dot: 'bg-amber-500' },
                { val: 'medium', label: 'Medium Priority', dot: 'bg-blue-500' },
                { val: 'low', label: 'Low / Routine', dot: 'bg-emerald-500' }
              ].map((urg) => (
                <button
                  key={urg.val}
                  onClick={() => { setSelectedUrgency(urg.val); playTickSound(); }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                    selectedUrgency === urg.val
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${urg.dot}`} />
                    <span>{urg.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Progress Module (Slate-900 Card) */}
          <div className="p-5 bg-slate-900 rounded-xl text-white shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Daily Progress</p>
              <div className="text-3xl font-extrabold mb-3">
                {entries.length > 0 ? Math.round((countCompleted / entries.length) * 100) : 0}%
              </div>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]" 
                style={{ width: `${entries.length > 0 ? (countCompleted / entries.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3">
              <span>{countCompleted} Selesai</span>
              <span>{entries.length} Total</span>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Bell className="h-3 w-3 text-indigo-600" />
              Push Notifications
            </h3>

            {browserNotificationAllowed ? (
              <div className="bg-indigo-50/70 text-indigo-900 p-3 rounded-lg border border-indigo-100 text-[11px] font-medium leading-relaxed">
                <span className="flex items-center gap-1.5 font-bold text-indigo-800">🟢 Push Active</span>
                <p className="mt-1 text-slate-500">
                  Alarm push akan muncul di pojok layar Anda tepat waktu saat deadline tiba.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-normal">
                  Izinkan akses notifikasi browser agar alarm push berbunyi tepat waktu.
                </p>
                <button
                  type="button"
                  onClick={requestBrowserNotificationPermission}
                  className="w-full py-1.5 px-3 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 active:scale-95 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn_request_notif_perm"
                >
                  Aktifkan Push Notif
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => { playChime(); }}
              className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 text-[11px] font-bold rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
              id="btn_test_sound"
            >
              🔈 Uji Coba Alarm Sound
            </button>
          </div>

          {/* Reset button inside sidebar filter block */}
          <button
            onClick={handleClearAllData}
            className="w-full py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 border border-dashed border-rose-200 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            id="btn_reset_data"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Setel Ulang Data Kegiatan
          </button>

        </aside>

        {/* Right Column (Task Stream Canvas) - 9 of 12 columns */}
        <section className="col-span-1 lg:col-span-9 space-y-5" id="entries_canvas">
          
          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Agenda & Aktivitas</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Kelola jadwal, tugas, dan rutinitas harian Anda.</p>
            </div>
            <button
              onClick={() => {
                setEditingEntry(null);
                setIsFormOpen(true);
                playTickSound();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              id="btn_open_add_form_main"
            >
              <Plus className="w-4 h-4" />
              <span>TAMBAH AKTIVITAS</span>
            </button>
          </div>

          {/* Controls: Search & Sort Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari agenda, tugas kuliah, game, atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 text-slate-800 transition-all"
                id="input_search"
              />
            </div>

            {/* Sorting trigger */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500 font-semibold select-none whitespace-nowrap">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="select_sort_by"
              >
                <option value="deadline">⏱️ Batas Waktu Terdekat</option>
                <option value="urgency">🚨 Tingkat Urgensi</option>
                <option value="created">📅 Waktu Dibuat (Terbaru)</option>
              </select>
            </div>

          </div>

          {/* Active Filtering Info Badge if active */}
          {(selectedCategory !== 'all' || selectedUrgency !== 'all' || searchQuery) && (
            <div className="flex items-center justify-between bg-indigo-50/40 border border-indigo-100/50 py-2 px-4 rounded-xl text-xs text-indigo-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>Filter aktif:</span>
                {selectedCategory !== 'all' && (
                  <span className="bg-indigo-100 px-2 py-0.5 rounded-md font-bold">Kategori: {selectedCategory}</span>
                )}
                {selectedUrgency !== 'all' && (
                  <span className="bg-indigo-100 px-2 py-0.5 rounded-md font-bold">Urgensi: {selectedUrgency}</span>
                )}
                {searchQuery && (
                  <span className="bg-indigo-100 px-2 py-0.5 rounded-md font-bold">Kata kunci: "{searchQuery}"</span>
                )}
              </div>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedUrgency('all');
                  setSearchQuery('');
                  playTickSound();
                }}
                className="text-indigo-600 hover:underline font-bold text-[11px]"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Task Grid Stream */}
          {selectedCategory === 'all' && selectedUrgency === 'all' && !searchQuery ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="grid_activity_cards_3_cols">
              
              {/* Column 1: DAILY GAMES */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2 py-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                  <h2 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <span className="p-1 bg-purple-100 rounded text-purple-600 text-[10px]">🎮</span> DAILY GAMES
                  </h2>
                  <span className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {sortedEntries.filter(e => e.category === 'game').length} ITEMS
                  </span>
                </div>
                
                <div className="space-y-3 flex-1">
                  <AnimatePresence mode="popLayout">
                    {sortedEntries.filter(e => e.category === 'game').map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onToggleStatus={handleToggleStatus}
                        onEdit={(item) => {
                          setEditingEntry(item);
                          setIsFormOpen(true);
                          playTickSound();
                        }}
                        onDelete={handleDeleteEntry}
                        onQuickReschedule={handleQuickReschedule}
                        onToggleSubtask={handleToggleSubtask}
                      />
                    ))}
                  </AnimatePresence>
                  {sortedEntries.filter(e => e.category === 'game').length === 0 && (
                    <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold bg-white/50">
                      Tidak ada game hari ini
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: UNIVERSITY */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2 py-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                  <h2 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <span className="p-1 bg-blue-100 rounded text-blue-600 text-[10px]">🎓</span> UNIVERSITY
                  </h2>
                  <span className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {sortedEntries.filter(e => e.category === 'kuliah').length} ITEMS
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  <AnimatePresence mode="popLayout">
                    {sortedEntries.filter(e => e.category === 'kuliah').map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onToggleStatus={handleToggleStatus}
                        onEdit={(item) => {
                          setEditingEntry(item);
                          setIsFormOpen(true);
                          playTickSound();
                        }}
                        onDelete={handleDeleteEntry}
                        onQuickReschedule={handleQuickReschedule}
                        onToggleSubtask={handleToggleSubtask}
                        onAiBreakdown={handleAiBreakdownTask}
                      />
                    ))}
                  </AnimatePresence>
                  {sortedEntries.filter(e => e.category === 'kuliah').length === 0 && (
                    <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold bg-white/50">
                      Tidak ada tugas kuliah
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: ROUTINE & OTHERS */}
              <div className="flex flex-col gap-4 bg-white/60 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <span className="p-1 bg-emerald-100 rounded text-emerald-600 text-[10px]">🏠</span> ROUTINE
                  </h2>
                  <span className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {sortedEntries.filter(e => e.category !== 'game' && e.category !== 'kuliah').length} ITEMS
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {sortedEntries.filter(e => e.category !== 'game' && e.category !== 'kuliah').map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onToggleStatus={handleToggleStatus}
                        onEdit={(item) => {
                          setEditingEntry(item);
                          setIsFormOpen(true);
                          playTickSound();
                        }}
                        onDelete={handleDeleteEntry}
                        onQuickReschedule={handleQuickReschedule}
                        onToggleSubtask={handleToggleSubtask}
                      />
                    ))}
                  </AnimatePresence>
                  {sortedEntries.filter(e => e.category !== 'game' && e.category !== 'kuliah').length === 0 && (
                    <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold bg-white">
                      Tidak ada rutinitas harian
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border-dashed border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-semibold italic">"A task managed is a worry solved."</p>
                    <span className="text-[9px] font-extrabold text-indigo-500">— SYSTEM QUOTE</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="grid_activity_cards">
              <AnimatePresence mode="popLayout">
                {sortedEntries.map((entry) => (
                  <ActivityCard
                    key={entry.id}
                    entry={entry}
                    onToggleStatus={handleToggleStatus}
                    onEdit={(item) => {
                      setEditingEntry(item);
                      setIsFormOpen(true);
                      playTickSound();
                    }}
                    onDelete={handleDeleteEntry}
                    onQuickReschedule={handleQuickReschedule}
                    onToggleSubtask={handleToggleSubtask}
                    onAiBreakdown={handleAiBreakdownTask}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state illustration/placeholder */}
          {sortedEntries.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-100 py-16 px-6 text-center space-y-4 max-w-xl mx-auto shadow-xs"
              id="empty_state_panel"
            >
              <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <Filter className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tidak ada agenda ditemukan</h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  {entries.length === 0 
                    ? "Agenda harian Anda masih kosong. Mulailah mencatat agenda game harian, tugas kuliah, atau kegiatan rutinitas nyata Anda!" 
                    : "Tidak ada agenda yang cocok dengan filter atau kata kunci pencarian Anda. Silakan setel ulang filter."}
                </p>
              </div>

              {entries.length === 0 && (
                <button
                  onClick={() => { setIsFormOpen(true); playTickSound(); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Buat Agenda Pertama Anda
                </button>
              )}
            </motion.div>
          )}

        </section>
          </div>
        )}
      </main>

      {/* 3. Form Modal Overlay */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl"
            >
              <ActivityForm
                initialData={editingEntry}
                onSave={handleSaveEntry}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingEntry(null);
                  playTickSound();
                }}
                customCategories={customCategories}
                onAddCategory={handleAddCategory}
              />
            </motion.div>
          </div>
        )}
        {isFinanceFormOpen && (
          <FinanceForm
            financeCategories={financeCategories}
            customAccounts={customAccounts}
            initialData={editingFinanceEntry}
            onSave={handleSaveFinanceEntry}
            onCancel={() => {
              setIsFinanceFormOpen(false);
              setEditingFinanceEntry(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Auth Screen Modal Overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthScreen 
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={() => setShowAuthModal(false)}
          />
        )}
        {showMobileSyncModal && (
          <MobileSyncModal
            currentUser={currentUser}
            onClose={() => setShowMobileSyncModal(false)}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}
      </AnimatePresence>

      {/* 4. Notification Toast Overlay Trigger */}
      <NotificationToast
        activeNotification={activeNotification}
        onDismiss={handleNotificationDismiss}
        onComplete={handleNotificationComplete}
        onSnooze={handleNotificationSnooze}
      />

      {/* 5. Bottom Status Bar */}
      <footer className="h-8 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between shrink-0 text-slate-500 text-[10px] font-medium z-10">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex gap-3">
             <span>{countCompleted} Tasks Completed Today</span>
             <span className="text-slate-300">|</span>
             <span>Penyimpanan Lokal Aktif (Offline)</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
             <span className="font-bold uppercase tracking-tight">System Ready</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
