# Remix Catatan Harian & Pengingat (Daily Tracker & Task Reminder)

Aplikasi manajemen catatan harian, pemantau game harian, tugas kuliah/kantor, pencatatan keuangan harian, serta pengingat prioritas dengan sinkronisasi database MySQL (phpMyAdmin) & Cloud Firestore.

---

## 🚀 Fitur Utama
1. **Kegiatan & Game Harian**: Pantau check-in game, daily quest, dan rutinitas harian dengan tombol centang instan.
2. **Tugas & Deadline**: Manajemen tugas dengan label prioritas (*Tinggi*, *Sedang*, *Rendah*), deadline tanggal, dan filter status.
3. **Catatan Keuangan**: Catat pemasukan & pengeluaran harian lengkap dengan kategori dan ringkasan saldo otomatis.
4. **Export Laporan PDF & Backup**: Cetak laporan rekap kegiatan & tugas ke file PDF rapi serta backup/restore data JSON.
5. **Dukungan Dua Database**:
   - **Local / Remote MySQL (phpMyAdmin)**: Dapat dihubungkan ke phpMyAdmin lokal (XAMPP/Laragon) atau hosting cPanel/Cloud MySQL.
   - **Cloud Firestore**: Sinkronisasi online real-time.

---

## 🛠️ Panduan Menjalankan di Komputer Lokal

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
- [Git](https://git-scm.com/)
- XAMPP / Laragon (jika ingin menggunakan MySQL & phpMyAdmin lokal)

### 2. Langkah Instalasi
```bash
# 1. Clone repository ini
git clone https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
cd NAMA_REPO_ANDA

# 2. Install dependensi
npm install

# 3. Setup file konfigurasi .env
cp .env.example .env
```

### 3. Setup Database MySQL (phpMyAdmin)
1. Buka XAMPP / Laragon dan nyalakan service **Apache** dan **MySQL**.
2. Buka browser dan pergi ke `http://localhost/phpmyadmin`.
3. Buat database baru bernama: `catatan_harian_db`.
4. Klik tab **Import**, pilih file `database/schema.sql` dari project ini, lalu klik **Import / Go**.
5. Sesuaikan file `.env` di komputer Anda:
```env
MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASSWORD=""
MYSQL_DATABASE="catatan_harian_db"
```

### 4. Jalankan Aplikasi
```bash
npm run dev
```
Buka browser di `http://localhost:3000`. Aplikasi siap digunakan!

---

## 🌐 Panduan Deploy Online (Gratis)
Untuk menjalankan aplikasi ini secara online 24/7 di internet:
1. **Platform Backend & Frontend**: Hubungkan repo GitHub ini ke [Render](https://render.com/) atau [Railway](https://railway.app/).
2. **Database Cloud Gratis**: Buat database MySQL gratis di [Aiven](https://aiven.io/), [Clever Cloud](https://clever-cloud.com/), atau [TiDB Cloud](https://tidbcloud.com/).
3. Masukkan `DATABASE_URL` atau konfigurasi MySQL Host ke Environment Variables di dashboard hosting Anda.
