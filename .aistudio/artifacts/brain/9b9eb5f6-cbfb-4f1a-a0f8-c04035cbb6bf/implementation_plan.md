# Sistem Cerdas Terintegrasi (Smart Executive Pilot) & Widget Ringkasan Cerdas

Sistem asisten cerdas 100% lokal offline yang menganalisis beban produktivitas dan ritme keuangan harian secara real-time, menyajikan insight prediktif serta "Next Best Action" melalui Widget Ringkasan Cerdas di bagian atas dashboard SynchroDiary.

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi sebelumnya, seluruh sistem cerdas dirancang berjalan **100% lokal di browser (offline deterministik)** tanpa ketergantungan API pihak ketiga atau internet, disajikan dalam **Widget Ringkasan Cerdas di bagian atas dashboard**.

- **Keputusan Terkonfirmasi (User Choice)**: Penyajian sistem cerdas dalam bentuk **Widget Ringkasan Cerdas di bagian atas dashboard** yang menyatu mulus di atas modul Catatan Harian maupun Keuangan.
- **Rekomendasi Lingkup Sistem Cerdas**:
  1. *Smart Priority & Deadline Engine*: Mengkalkulasi skor urgensi dinamis berbasis waktu tersisa, bobot prioritas, dan sub-tugas yang belum selesai untuk merekomendasikan 1 tugas utama yang harus dieksekusi sekarang (*Next Best Action*).
  2. *Safe Daily Spend & Financial Radar*: Mengestimasi batas belanja aman per hari secara real-time berdasarkan sisa hari di bulan berjalan, total saldo likuid, dan rasio pengeluaran.
  3. *Habit & Routine Streak Guard*: Mendeteksi rutinitas yang terancam terlewat sebelum hari berganti dan mengingatkan pengguna dengan aksi 1-klik selesaikan.

---

### 1. Overview & Core Concept

- **What It Does**: Sebuah mesin rekomendasi lokal berkecepatan tinggi (<2ms) yang membaca seluruh data kegiatan (`entries`) dan transaksi keuangan (`financeEntries`), kemudian mengekstraksi status kesehatan harian (*Daily Health Pulse*), mendeteksi anomali/bottleneck, dan memberikan kartu rekomendasi tindakan langsung.
- **Target Audience / Persona**: Mahasiswa atau profesional muda yang mengelola tugas kuliah/kerja, rutinitas harian, aktivitas hobi/gaming, dan anggaran belanja personal dalam satu aplikasi mandiri tanpa internet.
- **Key Value**: Pengguna tidak perlu membuka tab berbeda atau menganalisis data mentah secara manual; sekali membuka aplikasi, mereka langsung tahu apa prioritas nomor satu hari ini dan berapa sisa budget aman mereka.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Zero State / Fresh Launch**: Saat pengguna membuka aplikasi, widget cerdas di bagian atas dashboard langsung menghitung skor kesiapan hari ini (*Daily Pulse Score* 0–100) dengan status ringkas (*e.g., "Kondisi Terkendali" / "Butuh Perhatian"*).
2. **Next Best Action Focus**: Widget menampilkan kartu fokus utama: "Kerjakan [Judul Tugas] sebelum [Waktu] - 2 sub-tugas tersisa" dengan tombol aksi langsung "Mulai / Selesaikan".
3. **Financial Insight Glance**: Indikator batas belanja aman hari ini (*e.g., "Batas Belanja Hari Ini: Rp 45.000 (Aman)"* atau *"Pengeluaran hari ini tinggi: 78% dari batas aman"*).
4. **Quick Toggle / Expand Details**: Pengguna dapat menekan tombol "Detail Analisis Cerdas" untuk membuka modal rincian algoritma atau menyusutkan widget jika ingin tampilan minimalis.

#### Visual Identity & Theme (Anti-Slop & Zero-Pill Guidelines)
- **Aesthetic Direction**: *Quiet Productivity & Utilitarian Precision* — bersih, fungsional, bernuansa dashboard finansial & task manager modern.
- **Color Palette**:
  - Background widget: Netral bertekstur halus (`bg-white` dengan border halus `border-slate-200/80` dan shadow mikro `shadow-xs`).
  - Aksen status: Slate tua (`text-slate-900`) untuk data primer, Indigo elegan (`text-indigo-600`) untuk fokus aksi tugas, Emerald tenang (`text-emerald-600`) untuk keuangan aman, Amber/Rose untuk peringatan deadline.
  - Bebas dari gradien ungu klise dan pill badges bertumpuk.
- **Typography & Hierarchy**:
  - Label kategori dan timestamp disajikan sebagai teks bersih tanpa bungkus pil (*unboxed metadata* dengan separator titik tengah `·`).
  - Tipografi tegas: Angka metrik dengan font tabular (*tabular-nums*) agar mudah dibaca cepat.
- **Interactive Feedback**:
  - Tombol aksi dengan hover transition mikro (`hover:bg-slate-100`, `active:scale-[0.98]`).
  - Animasi transisi smooth saat sub-tugas diselesaikan dan skor kesehatan harian ter-update otomatis secara instan.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Algoritma Heuristik Deterministik vs Remote LLM**
  - *Pendekatan*: Menjalankan algoritma pemeringkatan terbobot (*multi-criteria decision scoring*) murni di sisi klien (`src/utils/smartSystemEngine.ts`).
  - *Alasan*: Menjawab kebutuhan 100% offline, zero-latency, tidak memerlukan kunci API/kuota internet, serta hasil kalkulasi 100% konsisten dan transparan.
  - *Alternatif yang Ditolak*: Panggilan API eksternal (memerlukan koneksi internet dan rawan kegagalan offline).
- **Keputusan 2: Posisi Widget di Puncak Konten Dashboard**
  - *Pendekatan*: Diletakkan di bawah switcher modul dan tepat di atas grid konten utama (`src/App.tsx`).
  - *Alasan*: Sesuai pilihan pengguna pada sesi tanya-jawab; memberikan visibilitas tertinggi saat pertama kali membuka aplikasi tanpa menghalangi alur kerja filter dan pencarian.
  - *Fitur Minimalis*: Menyediakan tombol minimize/expand agar pengguna fleksibel mengatur ruang layar.

---

### 4. Technical Architecture & Data Strategy

#### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 SynchroDiary Local App                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    App Header                         │  │
│  │  Logo · SynchroDiary · Mode Lokal Offline · Tanggal    │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Smart Executive Widget (Top of Main)        │  │
│  │  ┌──────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Daily Pulse 85   │  │ Next Best Action:         │  │  │
│  │  │ Kondisi Seimbang │  │ Tugas Algoritma (2 Subtask)│  │  │
│  │  └──────────────────┘  └───────────────────────────┘  │  │
│  │  ┌──────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Safe Spend Today │  │ Rutinitas:                │  │  │
│  │  │ Rp 52.000 / Hari │  │ 2 dari 3 Selesai (67%)    │  │  │
│  │  └──────────────────┘  └───────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                               │
│             ┌───────────────┴───────────────┐               │
│             ▼                               ▼               │
│  ┌──────────────────────┐      ┌─────────────────────────┐  │
│  │  Module: Catatan     │      │   Module: Keuangan      │  │
│  │  - Task Filters      │      │   - Financial Cards     │  │
│  │  - Activity Cards    │      │   - Smart Advisor       │  │
│  │  - Activity Form     │      │   - Transaction Lists   │  │
│  └──────────────────────┘      └─────────────────────────┘  │
│             ▲                               ▲               │
│             └───────────────┬───────────────┘               │
│                             │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          smartSystemEngine.ts (100% Offline)          │  │
│  │  - calculateDailyPulseScore(entries, finance)         │  │
│  │  - getNextBestAction(entries)                         │  │
│  │  - calculateSafeDailySpend(financeEntries, date)      │  │
│  │  - detectHabitAnomalies(entries)                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model & Engine Logic

```typescript
export interface SmartExecutiveSummary {
  pulseScore: number; // 0 - 100
  pulseStatus: 'excellent' | 'good' | 'warning' | 'critical';
  pulseLabel: string;
  nextBestAction: {
    entryId: string;
    title: string;
    category: string;
    urgencyText: string;
    reason: string;
    remainingSubtasks: number;
    deadlineText: string;
  } | null;
  financialPulse: {
    safeDailySpend: number;
    todaySpent: number;
    spendStatus: 'safe' | 'moderate' | 'overbudget';
    monthNetSavings: number;
  };
  habitStreakPulse: {
    totalRoutines: number;
    completedToday: number;
    pendingRoutineNames: string[];
  };
  smartTips: string[];
}
```

#### State Mapping & Interactive Controls
- **Komponen Baru**: `src/components/SmartExecutiveWidget.tsx`
- **Integrasi di `src/App.tsx`**: Dipasang tepat sebelum grid konten Catatan/Keuangan.
- **Aksi Cepat Interaktif**:
  - Klik pada *Next Best Action* langsung melakukan auto-scroll / membuka form edit kegiatan tersebut.
  - Tombol *"Tandai Rutinitas Selesai"* langsung memperbarui status entitas tanpa perlu membuka form.
  - Tombol *"Lihat Analisis Rinci"* menampilkan modal penjelasan algoritma skor kesehatan.
