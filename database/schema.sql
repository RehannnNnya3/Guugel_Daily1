-- =====================================================================
-- SKEMA DATABASE MYSQL / MARIADB LENGKAP DENGAN RELASI & DATA CONTOH
-- Proyek: Catatan Harian & Manajemen Keuangan (SynchroDiary)
-- Cocok diimport langsung melalui phpMyAdmin atau MySQL CLI
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `catatan_harian_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `catatan_harian_db`;

-- Matikan cek foreign key sementara agar pembuatan/reset tabel lancar
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `finance_entries`;
DROP TABLE IF EXISTS `activity_entries`;
DROP TABLE IF EXISTS `custom_accounts`;
DROP TABLE IF EXISTS `user_settings`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. TABEL PENGGUNA (USERS)
-- Tabel master penyimpan identitas akun pengguna
-- =====================================================================
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. TABEL REKENING & DOMPET KUSTOM (CUSTOM ACCOUNTS)
-- Relasi: Many-to-One terhadap `users`
-- =====================================================================
CREATE TABLE `custom_accounts` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL DEFAULT 'local_user',
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('cash', 'bank', 'ewallet') NOT NULL DEFAULT 'cash',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `user_id`),
  CONSTRAINT `fk_accounts_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. TABEL CATATAN & AGENDA HARIAN (ACTIVITY ENTRIES)
-- Relasi: Many-to-One terhadap `users`
-- =====================================================================
CREATE TABLE `activity_entries` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL DEFAULT 'local_user',
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'kuliah',
  `urgency` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  `deadline` DATETIME NOT NULL,
  `reminder_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `reminder_time` DATETIME NULL,
  `reminder_sent` TINYINT(1) NOT NULL DEFAULT 0,
  
  -- Atribut Kategori Spesifik: Game
  `game_platform` VARCHAR(50) NULL DEFAULT 'PC',
  `game_daily_quest` TEXT NULL,
  `game_playtime_minutes` INT NULL DEFAULT 60,
  
  -- Atribut Kategori Spesifik: Tugas Kuliah (Subtasks format JSON array)
  `course_name` VARCHAR(255) NULL,
  `course_subtasks` LONGTEXT NULL,
  
  -- Atribut Kategori Spesifik: Rutinitas
  `routine_frequency` VARCHAR(50) NULL DEFAULT 'daily',
  `routine_time_of_day` VARCHAR(10) NULL DEFAULT '07:00',
  `routine_custom_reset_days` INT NULL,
  `routine_last_reset_at` DATETIME NULL,
  
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_activity_user_deadline` (`user_id`, `deadline`),
  INDEX `idx_activity_category` (`category`),
  INDEX `idx_activity_status` (`status`),
  CONSTRAINT `fk_activity_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. TABEL TRANSAKSI KEUANGAN (FINANCE ENTRIES)
-- Relasi: Many-to-One terhadap `users`
-- =====================================================================
CREATE TABLE `finance_entries` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL DEFAULT 'local_user',
  `type` ENUM('income', 'expense', 'transfer') NOT NULL,
  `amount` BIGINT NOT NULL,
  `source_account` VARCHAR(64) NOT NULL,
  `destination_account` VARCHAR(64) NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `date` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_finance_user_date` (`user_id`, `date`),
  INDEX `idx_finance_type` (`type`),
  INDEX `idx_finance_category` (`category`),
  CONSTRAINT `fk_finance_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. TABEL PENGATURAN KATEGORI & PREFERENSI (USER SETTINGS)
-- Relasi: One-to-One terhadap `users`
-- =====================================================================
CREATE TABLE `user_settings` (
  `user_id` VARCHAR(64) NOT NULL,
  `activity_categories` LONGTEXT NULL,
  `finance_categories` LONGTEXT NULL,
  `budget_goals` LONGTEXT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_settings_user` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- DATA AWAL & TESTING WEB (SEED DATA)
-- =====================================================================

-- 1. Insert Pengguna Testing (local_user)
INSERT INTO `users` (`id`, `username`, `email`, `name`) 
VALUES ('local_user', 'admin_lokal', 'admin@catatanharian.local', 'Mahasiswa Pengguna');

-- 2. Insert Rekening & Dompet Bawaan
INSERT INTO `custom_accounts` (`id`, `user_id`, `name`, `type`) VALUES
('cash', 'local_user', 'Dompet Tunai', 'cash'),
('bank_bri', 'local_user', 'Bank BRI', 'bank'),
('bank_seabank', 'local_user', 'SeaBank', 'bank'),
('ewallet_dana', 'local_user', 'DANA', 'ewallet'),
('ewallet_gopay', 'local_user', 'GoPay', 'ewallet'),
('ewallet_shopeepay', 'local_user', 'ShopeePay', 'ewallet'),
('ewallet_ovo', 'local_user', 'OVO', 'ewallet');

-- 3. Insert Pengaturan Kategori & Budget
INSERT INTO `user_settings` (`user_id`, `activity_categories`, `finance_categories`, `budget_goals`) VALUES
('local_user', 
 '["Kesehatan","Pekerjaan","Organisasi"]',
 '{"income":["Gaji","Freelance","Hadiah","Investasi"],"expense":["Makanan","Transportasi","Belanja","Tagihan","Hiburan","Kesehatan","Pendidikan","Lainnya"],"transfer":["Transfer Antar Rekening"]}',
 '{"monthly_limit": 2500000, "warning_threshold": 80}'
);

-- 4. Insert Kegiatan / Tugas Testing (activity_entries)
INSERT INTO `activity_entries` (
  `id`, `user_id`, `title`, `content`, `category`, `urgency`, `status`,
  `deadline`, `reminder_enabled`, `reminder_time`,
  `course_name`, `course_subtasks`
) VALUES (
  'act_test_tugas_01',
  'local_user',
  'Tugas Proyek Basis Data: Desain ERD & Normalisasi',
  'Membuat skema database relasional lengkap, DDL, dan laporan normalisasi 3NF.',
  'kuliah',
  'urgent',
  'in_progress',
  DATE_ADD(NOW(), INTERVAL 2 DAY),
  1,
  DATE_ADD(NOW(), INTERVAL 1 DAY),
  'Basis Data Lanjut',
  '[{"id":"sub_1","title":"Membuat diagram relasi ERD","completed":true},{"id":"sub_2","title":"Menulis skrip DDL CREATE TABLE & Foreign Key","completed":true},{"id":"sub_3","title":"Uji coba query DML & seeding data testing","completed":false},{"id":"sub_4","title":"Menyusun laporan akhir PDF","completed":false}]'
);

INSERT INTO `activity_entries` (
  `id`, `user_id`, `title`, `content`, `category`, `urgency`, `status`,
  `deadline`, `reminder_enabled`, `reminder_time`,
  `course_name`, `course_subtasks`
) VALUES (
  'act_test_tugas_02',
  'local_user',
  'Makalah Algoritma & Struktur Data',
  'Analisis kompleksitas waktu Big-O pada algoritma sorting QuickSort vs MergeSort.',
  'kuliah',
  'high',
  'pending',
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  1,
  DATE_ADD(NOW(), INTERVAL 4 DAY),
  'Algoritma & Pemrograman',
  '[{"id":"sub_2_1","title":"Mencari referensi jurnal IEEE","completed":false},{"id":"sub_2_2","title":"Implementasi benchmark kode program","completed":false},{"id":"sub_2_3","title":"Kesimpulan dan cek plagiasi","completed":false}]'
);

INSERT INTO `activity_entries` (
  `id`, `user_id`, `title`, `content`, `category`, `urgency`, `status`,
  `deadline`, `reminder_enabled`,
  `game_platform`, `game_daily_quest`, `game_playtime_minutes`
) VALUES (
  'act_test_game_01',
  'local_user',
  'Daily Quest & Event Farming Genshin',
  'Selesaikan 4 daily commission di Fontaine dan klaim reward primogem.',
  'game',
  'low',
  'pending',
  DATE_ADD(NOW(), INTERVAL 12 HOUR),
  0,
  'PC',
  'Selesaikan 4x Daily Commission + Klaim Reward Katheryne',
  45
);

INSERT INTO `activity_entries` (
  `id`, `user_id`, `title`, `content`, `category`, `urgency`, `status`,
  `deadline`, `reminder_enabled`,
  `routine_frequency`, `routine_time_of_day`
) VALUES (
  'act_test_routine_01',
  'local_user',
  'Olahraga Pagi & Jogging Ringan',
  'Jogging keliling kompleks 20 menit dan minum air putih 500ml.',
  'rutinitas',
  'medium',
  'completed',
  DATE_ADD(NOW(), INTERVAL 1 DAY),
  1,
  'daily',
  '06:30'
);

-- 5. Insert Transaksi Keuangan Testing (finance_entries)
INSERT INTO `finance_entries` (
  `id`, `user_id`, `type`, `amount`, `source_account`, `destination_account`, `category`, `description`, `date`
) VALUES 
(
  'fin_test_01',
  'local_user',
  'income',
  3500000,
  'bank_bri',
  NULL,
  'Gaji',
  'Gaji bulanan / transfer uang saku kuliah',
  DATE_SUB(NOW(), INTERVAL 5 DAY)
),
(
  'fin_test_02',
  'local_user',
  'transfer',
  300000,
  'bank_bri',
  'ewallet_dana',
  'Transfer Antar Rekening',
  'Top up saldo DANA untuk makan dan jajan harian',
  DATE_SUB(NOW(), INTERVAL 4 DAY)
),
(
  'fin_test_03',
  'local_user',
  'expense',
  35000,
  'cash',
  NULL,
  'Makanan',
  'Makan siang nasi padang dan es teh',
  DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
  'fin_test_04',
  'local_user',
  'expense',
  125000,
  'bank_bri',
  NULL,
  'Pendidikan',
  'Buku referensi kuliah Basis Data & Pemrograman',
  DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
  'fin_test_05',
  'local_user',
  'expense',
  25000,
  'ewallet_dana',
  NULL,
  'Hiburan',
  'Kopi santai saat mengerjakan tugas',
  NOW()
);
