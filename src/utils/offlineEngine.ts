/**
 * Offline Intelligent Calculation Engine
 * Berjalan 100% lokal di browser tanpa koneksi internet atau dependensi API eksternal.
 */

export interface OfflineSubtask {
  text: string;
}

export interface OfflineBreakdownResult {
  subtasks: OfflineSubtask[];
  estimatedHours: number;
  advice: string;
}

export interface OfflineBudgetAnalysisResult {
  healthStatus: 'Aman' | 'Waspada' | 'Kritis';
  healthScore: number;
  summary: string;
  alerts: string[];
  insights: string[];
  recommendations: string[];
  analyzedAt?: string;
}

/**
 * Algoritma lokal untuk memecah tugas akademik/kegiatan menjadi sub-tugas terstruktur
 */
export function generateOfflineTaskBreakdown(
  courseName: string,
  title: string,
  content: string = ''
): OfflineBreakdownResult {
  const combined = `${courseName} ${title} ${content}`.toLowerCase();

  let subtasks: string[] = [];
  let estimatedHours = 4;
  let advice = "Bagi fokus pengerjaan ke dalam interval waktu 45 menit untuk hasil maksimal.";

  if (
    combined.includes('koding') ||
    combined.includes('coding') ||
    combined.includes('program') ||
    combined.includes('web') ||
    combined.includes('aplikasi') ||
    combined.includes('react') ||
    combined.includes('python') ||
    combined.includes('java') ||
    combined.includes('database') ||
    combined.includes('sql') ||
    combined.includes('backend') ||
    combined.includes('frontend') ||
    combined.includes('api')
  ) {
    subtasks = [
      `Analisis kebutuhan & spesifikasi fitur untuk "${title || courseName}"`,
      "Rancang arsitektur struktur data, komponen, dan relasi skema",
      "Implementasikan fungsi logika utama secara modular",
      "Uji alur aplikasi, validasi input pengguna, dan debug error",
      "Refaktor kerapian kode dan simpan progres versi ke Git lokal"
    ];
    estimatedHours = 5;
    advice = "Uji coba setiap fungsi secara bertahap sebelum melanjutkan ke modul berikutnya.";
  } else if (
    combined.includes('makalah') ||
    combined.includes('paper') ||
    combined.includes('essay') ||
    combined.includes('esai') ||
    combined.includes('laporan') ||
    combined.includes('jurnal') ||
    combined.includes('skripsi') ||
    combined.includes('resume')
  ) {
    subtasks = [
      `Tentukan rumusan masalah dan batasan materi "${title || courseName}"`,
      "Kumpulkan referensi ilmiah, jurnal, dan sumber data pendukung",
      "Susun kerangka penulisan (outline bab & sub-bab)",
      "Tulis pembahasan inti disertai sitasi sumber acuan",
      "Cek format dokumen, kerapian tata bahasa, dan daftar pustaka"
    ];
    estimatedHours = 4;
    advice = "Pastikan sumber referensi relevan dan catat kutipan sejak awal penulisan.";
  } else if (
    combined.includes('presentasi') ||
    combined.includes('slide') ||
    combined.includes('ppt') ||
    combined.includes('pitch') ||
    combined.includes('seminar')
  ) {
    subtasks = [
      `Pahami poin utama yang ingin disampaikan mengenai "${title || courseName}"`,
      "Susun struktur alur presentasi ringkas (maksimal 10-12 slide utama)",
      "Rancang visualisasi grafik/diagram dan minimalisir dinding teks",
      "Latihan pemaparan dengan batas waktu yang telah ditentukan",
      "Siapkan lembar rangkuman jawaban untuk kemungkinan pertanyaan audiens"
    ];
    estimatedHours = 3;
    advice = "Fokus pada visual dan poin kunci, biarkan penjelasan mendalam Anda sampaikan secara lisan.";
  } else if (
    combined.includes('hitung') ||
    combined.includes('matematika') ||
    combined.includes('statistik') ||
    combined.includes('kalkulus') ||
    combined.includes('fisika') ||
    combined.includes('akuntansi') ||
    combined.includes('rumus')
  ) {
    subtasks = [
      `Identifikasi variabel yang diketahui dan target soal "${title || courseName}"`,
      "Pilih teorema atau formula matematis yang relevan",
      "Kerjakan langkah penyelesaian matematis tahap demi tahap",
      "Lakukan verifikasi balik hasil perhitungan dengan metode alternatif",
      "Tuliskan kesimpulan akhir dan satuan hasil dengan presisi"
    ];
    estimatedHours = 3;
    advice = "Teliti setiap operasi hitung tanda negatif dan perpangkatan untuk menghindari kekeliruan sepele.";
  } else {
    subtasks = [
      `Pahami petunjuk & kriteria keberhasilan: ${title || courseName}`,
      "Kumpulkan bahan pendukung, dokumen acuan, dan peralatan yang dibutuhkan",
      "Kerjakan tahapan pengerjaan utama secara sistematis",
      "Tinjau kelengkapan hasil kerja terhadap instruksi awal",
      "Finalisasi hasil pengerjaan dan simpan arsip cadangan"
    ];
    estimatedHours = 4;
    advice = "Mulai dari bagian yang paling mudah dipahami untuk membangun momentum pengerjaan.";
  }

  return {
    subtasks: subtasks.map(text => ({ text })),
    estimatedHours,
    advice
  };
}

/**
 * Algoritma lokal untuk evaluasi kesehatan finansial dan budget
 */
export function generateOfflineBudgetAnalysis(params: {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balanceSummary: Record<string, number>;
  topExpenses: { name: string; amount: number }[];
  transactionCount: number;
  budgetGoal?: number;
}): OfflineBudgetAnalysisResult {
  const { month, totalIncome, totalExpense, topExpenses, transactionCount, budgetGoal } = params;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) : 0;
  const budgetProgress = budgetGoal && budgetGoal > 0 ? (totalExpense / budgetGoal) : 0;

  let healthStatus: 'Aman' | 'Waspada' | 'Kritis' = 'Aman';
  let healthScore = 80;

  if (totalExpense > totalIncome || (budgetGoal && totalExpense > budgetGoal * 1.15)) {
    healthStatus = 'Kritis';
    const deficitRatio = totalIncome > 0 ? Math.abs(netSavings) / totalIncome : 1;
    healthScore = Math.max(20, Math.round(50 - deficitRatio * 25));
  } else if (savingsRate < 0.20 || (budgetGoal && budgetProgress >= 0.85)) {
    healthStatus = 'Waspada';
    healthScore = Math.min(78, Math.max(55, Math.round(55 + savingsRate * 80)));
  } else {
    healthStatus = 'Aman';
    healthScore = Math.min(98, Math.max(80, Math.round(75 + savingsRate * 35)));
  }

  // Ringkasan
  const summary = `Evaluasi finansial lokal bulan ${month}: Pemasukan Rp${totalIncome.toLocaleString('id-ID')} dan pengeluaran Rp${totalExpense.toLocaleString('id-ID')}. ` +
    (netSavings >= 0 
      ? `Terdapat sisa surplus tabungan sebesar Rp${netSavings.toLocaleString('id-ID')}.` 
      : `Terjadi defisit arus kas sebesar Rp${Math.abs(netSavings).toLocaleString('id-ID')}.`);

  // Peringatan / Alerts
  const alerts: string[] = [];
  if (totalExpense > totalIncome) {
    alerts.push(`Pengeluaran melebihi pendapatan sebesar Rp${Math.abs(netSavings).toLocaleString('id-ID')}. Defisit arus kas terjadi.`);
  }
  if (budgetGoal && budgetGoal > 0) {
    const pct = Math.round(budgetProgress * 100);
    if (totalExpense > budgetGoal) {
      alerts.push(`Pengeluaran telah melampaui limit anggaran Rp${budgetGoal.toLocaleString('id-ID')} (${pct}% terpakai).`);
    } else if (pct >= 85) {
      alerts.push(`Pengeluaran mendekati batas anggaran (${pct}% terpakai dari Rp${budgetGoal.toLocaleString('id-ID')}).`);
    }
  }
  if (topExpenses.length > 0 && totalExpense > 0) {
    const topRatio = topExpenses[0].amount / totalExpense;
    if (topRatio >= 0.40) {
      alerts.push(`Kategori "${topExpenses[0].name}" menghabiskan ${Math.round(topRatio * 100)}% dari seluruh pengeluaran bulan ini.`);
    }
  }
  if (alerts.length === 0) {
    alerts.push("Arus kas dan pengeluaran berada dalam rentang aman dan terkendali.");
  }

  // Wawasan / Insights
  const insights: string[] = [
    `Rasio tabungan saat ini tercatat ${Math.max(0, Math.round(savingsRate * 100))}% dari total pemasukan bulan ini.`
  ];
  if (topExpenses.length > 0) {
    const topSummary = topExpenses.slice(0, 2).map(e => `${e.name} (Rp${e.amount.toLocaleString('id-ID')})`).join(' dan ');
    insights.push(`Pos pengeluaran terbesar tertuju pada: ${topSummary}.`);
  }
  insights.push(`Tercatat ${transactionCount} transaksi aktif tersimpan secara lokal pada periode ini.`);

  // Rekomendasi / Recommendations
  const recommendations: string[] = [];
  if (healthStatus === 'Kritis') {
    recommendations.push("Tunda pengeluaran sekunder/tersier dan prioritaskan pemulihan arus kas pada siklus berikutnya.");
  }
  if (savingsRate < 0.20) {
    recommendations.push("Terapkan alokasi anggaran 50/30/20 (50% kebutuhan pokok, 30% keinginan, 20% tabungan cadangan).");
  }
  if (!budgetGoal || budgetGoal <= 0) {
    recommendations.push("Pasang batas limit anggaran bulanan untuk memicu alarm peringatan otomatis saat mendekati batas aman.");
  }
  recommendations.push("Catat transaksi harian secara konsisten agar rekapitulasi grafik keuangan lokal tetap akurat.");

  return {
    healthStatus,
    healthScore,
    summary,
    alerts,
    insights,
    recommendations,
    analyzedAt: new Date().toISOString()
  };
}
