# Rencana Perbaikan & Mode 100% Lokal Offline

## 1. Perbaikan Utama Error Produksi (ENOENT `/app/applet/dist/index.html`)

### Akar Masalah:
Saat aplikasi dipublikasikan secara online atau dijalankan dalam mode produksi (`NODE_ENV === "production"` atau `K_SERVICE`), `server.ts` mencoba melayani file statis dari direktori `dist/index.html`. Jika build belum dijalankan atau file `dist/index.html` belum ada, Node.js melempar error fatal:
`Error: ENOENT: no such file or directory, stat '/app/applet/dist/index.html'`

### Solusi & Mitigasi:
1. **Fallback Cerdas di `server.ts`**:
   - Tambahkan pengecekan `fs.existsSync(path.join(distPath, "index.html"))`.
   - Jika direktori `dist/index.html` belum tersedia, server secara otomatis fallback menjalankan Vite middleware (`createViteServer`) sehingga aplikasi tetap berjalan normal tanpa pernah crash 404/500/ENOENT.
   - Jika direktori `dist/index.html` tersedia, server melayani file statis dengan aman.
2. **Eksekusi Build Produksi (`npm run build`)**:
   - Menghasilkan bundle `dist/` terkompilasi agar siap digunakan langsung dalam lingkungan hosting/production.

---

## 2. Transisi Menyeluruh ke Mode 100% Lokal Offline

Berdasarkan keputusan klarifikasi pengguna:

### A. Header & Tampilan Jam Lokal Statis
- **Hapus polling interval detik** (`setInterval` 1000ms pada `currentTime`) di `src/App.tsx`.
- Ganti dengan tampilan **tanggal lokal statis** (`Hari, DD MMMM YYYY`) yang dibaca sekali saat inisialisasi dari perangkat pengguna.
- Menghilangkan konsumsi CPU re-render detik demi kinerja yang sangat ringan dan hemat daya.

### B. Penyembunyian Elemen Cloud & QR Code
- Sembunyikan tombol **Cloud Sync** dan **QR Code Buka di HP** dari header navigasi utama.
- Hilangkan badge/indikator status cloud yang membingungkan.
- Aplikasi sepenuhnya berfokus pada mode lokal di komputer pengguna (terhubung ke database lokal / phpMyAdmin / local storage).

### C. Penggantian AI dengan Mesin Kalkulasi Algoritma Lokal (Offline Engine)
- **Analisis Finansial Cerdas Offline**:
  - Ganti panggilan API eksternal dengan modul kalkulasi deterministik offline di `SmartBudgetAdvisor.tsx` dan `server.ts`.
  - Menghitung rasio tabungan, simulasi alokasi 50/30/20, batas belanja harian aman (safe daily spend), dan rekomendasi penghematan praktis secara instan (<5ms) tanpa membutuhkan kunci API internet.
- **Pecah Tugas Otomatis Offline**:
  - Ganti endpoint AI breakdown tugas dengan parser heuristik berbasis aturan lokal yang mengenali jenis tugas (skripsi, koding, makalah, ujian, game quest, presentasi) dan otomatis menghasilkan sub-tugas terstruktur.

---

## 3. Langkah Implementasi Terurut
1. **Perbaiki `server.ts`**: Pasang proteksi `fs.existsSync` untuk fallback ke Vite middleware jika `dist` belum dibuat, dan pasang algoritma kalkulasi offline internal.
2. **Modifikasi `src/App.tsx`**:
   - Hapus state jam interval detik `currentTime`.
   - Tampilkan tanggal lokal statis.
   - Sembunyikan tombol Cloud Sync dan QR HP.
3. **Modifikasi `src/components/finance/SmartBudgetAdvisor.tsx`**:
   - Ganti pemanggilan Gemini AI dengan algoritma analisis finansial offline lokal langsung di browser.
4. **Jalankan `npm run build`**:
   - Memastikan `dist/index.html` dan aset statis selalu siap dan tidak memicu error ENOENT.
5. **Verifikasi & Uji Kompilasi**:
   - Jalankan `compile_applet` untuk memastikan seluruh aplikasi lulus validasi tanpa error.
