import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

export interface DbStatus {
  driver: 'mysql' | 'json_fallback';
  connected: boolean;
  database: string;
  host: string;
  user: string;
  message: string;
}

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT) || 3306;
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'catatan_harian_db';

const JSON_DB_PATH = path.join(process.cwd(), 'sync_db.json');

let pool: mysql.Pool | null = null;
let isMysqlConnected = false;
let dbStatusMessage = 'Inisialisasi koneksi database...';

export async function initDatabase(): Promise<DbStatus> {
  try {
    // 1. Try to connect to MySQL server (without specifying DB first to create it if not exists)
    const initialConnection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      connectTimeout: 600
    });

    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await initialConnection.end();

    // 2. Create connection pool with database
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const testConn = await pool.getConnection();
    await createTablesIfNotExist(pool);
    testConn.release();

    isMysqlConnected = true;
    dbStatusMessage = `Terhubung ke MySQL di ${MYSQL_HOST}:${MYSQL_PORT} (Database: ${MYSQL_DATABASE})`;
    console.log(`[Database] ${dbStatusMessage}`);

    return getDbStatus();
  } catch (error: any) {
    isMysqlConnected = false;
    dbStatusMessage = `MySQL offline (${error.code || error.message}). Menggunakan penyimpanan lokal sementara.`;
    console.warn(`[Database] ${dbStatusMessage}`);
    return getDbStatus();
  }
}

async function createTablesIfNotExist(p: mysql.Pool) {
  // 1. users
  await p.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`username\` VARCHAR(100) NOT NULL UNIQUE,
      \`email\` VARCHAR(255) NOT NULL UNIQUE,
      \`name\` VARCHAR(150) NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. activity_entries
  await p.query(`
    CREATE TABLE IF NOT EXISTS \`activity_entries\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`user_id\` VARCHAR(64) NOT NULL DEFAULT 'local_user',
      \`title\` VARCHAR(255) NOT NULL,
      \`content\` TEXT NULL,
      \`category\` VARCHAR(50) NOT NULL DEFAULT 'game',
      \`urgency\` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
      \`status\` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
      \`deadline\` DATETIME NOT NULL,
      \`reminder_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
      \`reminder_time\` DATETIME NULL,
      \`reminder_sent\` TINYINT(1) NOT NULL DEFAULT 0,
      \`game_platform\` VARCHAR(50) NULL,
      \`game_daily_quest\` TEXT NULL,
      \`game_playtime_minutes\` INT NULL DEFAULT 60,
      \`course_name\` VARCHAR(255) NULL,
      \`course_subtasks\` LONGTEXT NULL,
      \`routine_frequency\` VARCHAR(50) NULL,
      \`routine_time_of_day\` VARCHAR(10) NULL,
      \`routine_custom_reset_days\` INT NULL,
      \`routine_last_reset_at\` DATETIME NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. finance_entries
  await p.query(`
    CREATE TABLE IF NOT EXISTS \`finance_entries\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`user_id\` VARCHAR(64) NOT NULL DEFAULT 'local_user',
      \`type\` ENUM('income', 'expense', 'transfer') NOT NULL,
      \`amount\` BIGINT NOT NULL,
      \`source_account\` VARCHAR(64) NOT NULL,
      \`destination_account\` VARCHAR(64) NULL,
      \`category\` VARCHAR(100) NOT NULL,
      \`description\` TEXT NULL,
      \`date\` DATETIME NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. custom_accounts
  await p.query(`
    CREATE TABLE IF NOT EXISTS \`custom_accounts\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`user_id\` VARCHAR(64) NOT NULL DEFAULT 'local_user',
      \`name\` VARCHAR(100) NOT NULL,
      \`type\` ENUM('cash', 'bank', 'ewallet') NOT NULL,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`, \`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. user_settings
  await p.query(`
    CREATE TABLE IF NOT EXISTS \`user_settings\` (
      \`user_id\` VARCHAR(64) NOT NULL,
      \`activity_categories\` LONGTEXT NULL,
      \`finance_categories\` LONGTEXT NULL,
      \`budget_goals\` LONGTEXT NULL,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export function getDbStatus(): DbStatus {
  return {
    driver: isMysqlConnected ? 'mysql' : 'json_fallback',
    connected: isMysqlConnected,
    database: MYSQL_DATABASE,
    host: MYSQL_HOST,
    user: MYSQL_USER,
    message: dbStatusMessage
  };
}

// -------------------------------------------------------------
// HELPER FILE BACKUP JIKA MYSQL OFFLINE
// -------------------------------------------------------------
async function readJsonDb() {
  try {
    const raw = await fs.readFile(JSON_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      entries: [],
      financeEntries: [],
      customCategories: ['Kesehatan', 'Pekerjaan'],
      customAccounts: [
        { id: 'cash', name: 'Dompet Tunai', type: 'cash' },
        { id: 'bank_bri', name: 'BRI', type: 'bank' },
        { id: 'bank_seabank', name: 'SeaBank', type: 'bank' },
        { id: 'ewallet_dana', name: 'DANA', type: 'ewallet' },
        { id: 'ewallet_gopay', name: 'GoPay', type: 'ewallet' },
        { id: 'ewallet_shopeepay', name: 'ShopeePay', type: 'ewallet' },
        { id: 'ewallet_ovo', name: 'OVO', type: 'ewallet' }
      ],
      financeCategories: {
        income: ['Gaji', 'Freelance', 'Hadiah', 'Investasi'],
        expense: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'],
        transfer: ['Transfer Antar Rekening']
      },
      updatedAt: new Date().toISOString()
    };
  }
}

async function writeJsonDb(data: any) {
  await fs.writeFile(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// -------------------------------------------------------------
// CRUD REPOSITORY FOR ACTIVITIES
// -------------------------------------------------------------
export async function getActivities(userId: string = 'local_user') {
  if (isMysqlConnected && pool) {
    const [rows]: any = await pool.query(
      'SELECT * FROM `activity_entries` WHERE `user_id` = ? ORDER BY `deadline` ASC',
      [userId]
    );
    return rows.map(mapRowToActivity);
  } else {
    const data = await readJsonDb();
    return data.entries || [];
  }
}

export async function saveActivity(entry: any, userId: string = 'local_user') {
  const id = entry.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const deadlineStr = new Date(entry.deadline).toISOString().slice(0, 19).replace('T', ' ');
  const reminderTimeStr = entry.reminderTime ? new Date(entry.reminderTime).toISOString().slice(0, 19).replace('T', ' ') : null;
  const subtasksJson = entry.courseDetails?.subtasks ? JSON.stringify(entry.courseDetails.subtasks) : null;

  if (isMysqlConnected && pool) {
    await pool.query(
      `INSERT INTO \`activity_entries\` (
        \`id\`, \`user_id\`, \`title\`, \`content\`, \`category\`, \`urgency\`, \`status\`,
        \`deadline\`, \`reminder_enabled\`, \`reminder_time\`, \`reminder_sent\`,
        \`game_platform\`, \`game_daily_quest\`, \`game_playtime_minutes\`,
        \`course_name\`, \`course_subtasks\`,
        \`routine_frequency\`, \`routine_time_of_day\`, \`routine_custom_reset_days\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`title\` = VALUES(\`title\`),
        \`content\` = VALUES(\`content\`),
        \`category\` = VALUES(\`category\`),
        \`urgency\` = VALUES(\`urgency\`),
        \`status\` = VALUES(\`status\`),
        \`deadline\` = VALUES(\`deadline\`),
        \`reminder_enabled\` = VALUES(\`reminder_enabled\`),
        \`reminder_time\` = VALUES(\`reminder_time\`),
        \`reminder_sent\` = VALUES(\`reminder_sent\`),
        \`game_platform\` = VALUES(\`game_platform\`),
        \`game_daily_quest\` = VALUES(\`game_daily_quest\`),
        \`game_playtime_minutes\` = VALUES(\`game_playtime_minutes\`),
        \`course_name\` = VALUES(\`course_name\`),
        \`course_subtasks\` = VALUES(\`course_subtasks\`),
        \`routine_frequency\` = VALUES(\`routine_frequency\`),
        \`routine_time_of_day\` = VALUES(\`routine_time_of_day\`),
        \`routine_custom_reset_days\` = VALUES(\`routine_custom_reset_days\`)`,
      [
        id, userId, entry.title, entry.content || '', entry.category, entry.urgency || 'medium', entry.status || 'pending',
        deadlineStr, entry.reminderEnabled ? 1 : 0, reminderTimeStr, entry.reminderSent ? 1 : 0,
        entry.gameDetails?.platform || null, entry.gameDetails?.dailyQuest || null, entry.gameDetails?.playtimeMinutes || 0,
        entry.courseDetails?.courseName || null, subtasksJson,
        entry.routineDetails?.frequency || null, entry.routineDetails?.timeOfDay || null, entry.routineDetails?.customResetDays || null
      ]
    );
    return { ...entry, id };
  } else {
    const data = await readJsonDb();
    const existingIdx = data.entries.findIndex((e: any) => e.id === id);
    const item = { ...entry, id };
    if (existingIdx >= 0) {
      data.entries[existingIdx] = item;
    } else {
      data.entries.push(item);
    }
    data.updatedAt = new Date().toISOString();
    await writeJsonDb(data);
    return item;
  }
}

export async function deleteActivity(id: string, userId: string = 'local_user') {
  if (isMysqlConnected && pool) {
    await pool.query('DELETE FROM `activity_entries` WHERE `id` = ? AND `user_id` = ?', [id, userId]);
  } else {
    const data = await readJsonDb();
    data.entries = data.entries.filter((e: any) => e.id !== id);
    data.updatedAt = new Date().toISOString();
    await writeJsonDb(data);
  }
}

// -------------------------------------------------------------
// CRUD REPOSITORY FOR FINANCE
// -------------------------------------------------------------
export async function getFinanceEntries(userId: string = 'local_user') {
  if (isMysqlConnected && pool) {
    const [rows]: any = await pool.query(
      'SELECT * FROM `finance_entries` WHERE `user_id` = ? ORDER BY `date` DESC',
      [userId]
    );
    return rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      sourceAccount: r.source_account,
      destinationAccount: r.destination_account || undefined,
      category: r.category,
      description: r.description || '',
      date: new Date(r.date).toISOString()
    }));
  } else {
    const data = await readJsonDb();
    return data.financeEntries || [];
  }
}

export async function saveFinanceEntry(entry: any, userId: string = 'local_user') {
  const id = entry.id || `fin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dateStr = new Date(entry.date).toISOString().slice(0, 19).replace('T', ' ');

  if (isMysqlConnected && pool) {
    await pool.query(
      `INSERT INTO \`finance_entries\` (
        \`id\`, \`user_id\`, \`type\`, \`amount\`, \`source_account\`, \`destination_account\`, \`category\`, \`description\`, \`date\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`type\` = VALUES(\`type\`),
        \`amount\` = VALUES(\`amount\`),
        \`source_account\` = VALUES(\`source_account\`),
        \`destination_account\` = VALUES(\`destination_account\`),
        \`category\` = VALUES(\`category\`),
        \`description\` = VALUES(\`description\`),
        \`date\` = VALUES(\`date\`)`,
      [
        id, userId, entry.type, entry.amount, entry.sourceAccount,
        entry.destinationAccount || null, entry.category, entry.description || '', dateStr
      ]
    );
    return { ...entry, id };
  } else {
    const data = await readJsonDb();
    const idx = (data.financeEntries || []).findIndex((e: any) => e.id === id);
    const item = { ...entry, id };
    if (idx >= 0) {
      data.financeEntries[idx] = item;
    } else {
      data.financeEntries = data.financeEntries || [];
      data.financeEntries.push(item);
    }
    data.updatedAt = new Date().toISOString();
    await writeJsonDb(data);
    return item;
  }
}

export async function deleteFinanceEntry(id: string, userId: string = 'local_user') {
  if (isMysqlConnected && pool) {
    await pool.query('DELETE FROM `finance_entries` WHERE `id` = ? AND `user_id` = ?', [id, userId]);
  } else {
    const data = await readJsonDb();
    data.financeEntries = (data.financeEntries || []).filter((e: any) => e.id !== id);
    data.updatedAt = new Date().toISOString();
    await writeJsonDb(data);
  }
}

// -------------------------------------------------------------
// SETTINGS, CATEGORIES, & CUSTOM ACCOUNTS
// -------------------------------------------------------------
export async function getUserSettings(userId: string = 'local_user') {
  if (isMysqlConnected && pool) {
    const [settingsRows]: any = await pool.query(
      'SELECT * FROM `user_settings` WHERE `user_id` = ?',
      [userId]
    );
    const [accountsRows]: any = await pool.query(
      'SELECT * FROM `custom_accounts` WHERE `user_id` = ?',
      [userId]
    );

    let customCategories = ['Kesehatan', 'Pekerjaan'];
    let financeCategories = {
      income: ['Gaji', 'Freelance', 'Hadiah', 'Investasi'],
      expense: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'],
      transfer: ['Transfer Antar Rekening']
    };

    if (settingsRows.length > 0) {
      try {
        if (settingsRows[0].activity_categories) customCategories = JSON.parse(settingsRows[0].activity_categories);
        if (settingsRows[0].finance_categories) financeCategories = JSON.parse(settingsRows[0].finance_categories);
      } catch (e) {}
    }

    const customAccounts = accountsRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type
    }));

    return {
      customCategories,
      financeCategories,
      customAccounts: customAccounts.length > 0 ? customAccounts : [
        { id: 'cash', name: 'Dompet Tunai', type: 'cash' },
        { id: 'bank_bri', name: 'BRI', type: 'bank' },
        { id: 'bank_seabank', name: 'SeaBank', type: 'bank' },
        { id: 'ewallet_dana', name: 'DANA', type: 'ewallet' },
        { id: 'ewallet_gopay', name: 'GoPay', type: 'ewallet' },
        { id: 'ewallet_shopeepay', name: 'ShopeePay', type: 'ewallet' },
        { id: 'ewallet_ovo', name: 'OVO', type: 'ewallet' }
      ]
    };
  } else {
    const data = await readJsonDb();
    return {
      customCategories: data.customCategories || ['Kesehatan', 'Pekerjaan'],
      financeCategories: data.financeCategories || null,
      customAccounts: data.customAccounts || []
    };
  }
}

export async function saveUserSettings(settings: any, userId: string = 'local_user') {
  const { customCategories, financeCategories, customAccounts } = settings;

  if (isMysqlConnected && pool) {
    await pool.query(
      `INSERT INTO \`user_settings\` (\`user_id\`, \`activity_categories\`, \`finance_categories\`)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`activity_categories\` = VALUES(\`activity_categories\`),
         \`finance_categories\` = VALUES(\`finance_categories\`)`,
      [userId, JSON.stringify(customCategories || []), JSON.stringify(financeCategories || {})]
    );

    if (Array.isArray(customAccounts) && customAccounts.length > 0) {
      for (const acc of customAccounts) {
        await pool.query(
          `INSERT INTO \`custom_accounts\` (\`id\`, \`user_id\`, \`name\`, \`type\`)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`name\` = VALUES(\`name\`),
             \`type\` = VALUES(\`type\`)`,
          [acc.id, userId, acc.name, acc.type]
        );
      }
    }
  } else {
    const data = await readJsonDb();
    if (customCategories) data.customCategories = customCategories;
    if (financeCategories) data.financeCategories = financeCategories;
    if (customAccounts) data.customAccounts = customAccounts;
    data.updatedAt = new Date().toISOString();
    await writeJsonDb(data);
  }
}

function mapRowToActivity(r: any) {
  let subtasks: any[] = [];
  if (r.course_subtasks) {
    try {
      const parsed = typeof r.course_subtasks === 'string' ? JSON.parse(r.course_subtasks) : r.course_subtasks;
      if (Array.isArray(parsed)) {
        subtasks = parsed.map((st: any, idx: number) => {
          const itemTitle = st.title || st.text || '';
          const isCompleted = Boolean(st.completed ?? st.done ?? false);
          return {
            id: st.id || `sub_${idx + 1}`,
            title: itemTitle,
            completed: isCompleted,
            text: itemTitle,
            done: isCompleted
          };
        });
      }
    } catch {}
  }

  const activity: any = {
    id: r.id,
    title: r.title,
    content: r.content || '',
    category: r.category,
    urgency: r.urgency,
    status: r.status,
    createdAt: new Date(r.created_at || Date.now()).toISOString(),
    deadline: new Date(r.deadline).toISOString(),
    reminderEnabled: Boolean(r.reminder_enabled),
    reminderSent: Boolean(r.reminder_sent)
  };

  if (r.reminder_time) activity.reminderTime = new Date(r.reminder_time).toISOString();

  if (r.category === 'game') {
    activity.gameDetails = {
      platform: r.game_platform || 'PC',
      dailyQuest: r.game_daily_quest || '',
      playtimeMinutes: r.game_playtime_minutes || 60
    };
  }

  if (r.category === 'kuliah') {
    activity.courseDetails = {
      courseName: r.course_name || '',
      subtasks
    };
  }

  if (r.category === 'rutinitas') {
    activity.routineDetails = {
      frequency: r.routine_frequency || 'daily',
      timeOfDay: r.routine_time_of_day || '07:00',
      customResetDays: r.routine_custom_reset_days || undefined,
      lastResetAt: r.routine_last_reset_at ? new Date(r.routine_last_reset_at).toISOString() : undefined
    };
  }

  return activity;
}
