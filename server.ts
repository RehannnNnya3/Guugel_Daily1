import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  initDatabase, 
  getDbStatus, 
  getActivities, 
  saveActivity, 
  deleteActivity, 
  getFinanceEntries, 
  saveFinanceEntry, 
  deleteFinanceEntry, 
  getUserSettings, 
  saveUserSettings 
} from "./src/server/db.ts";

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE_PATH = path.join(process.cwd(), "sync_db.json");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to read database safely
async function readDb() {
  try {
    const data = await fs.readFile(DB_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {
      entries: [],
      financeEntries: [],
      customCategories: [],
      customAccounts: [],
      financeCategories: null,
      updatedAt: new Date().toISOString()
    };
  }
}

// Helper to write database safely
async function writeDb(data: any) {
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();

  // Initialize MySQL database or fallback
  await initDatabase();

  // Parse JSON bodies
  app.use(express.json({ limit: "20mb" }));

  // API Route: Database connection status (MySQL / phpMyAdmin info)
  app.get("/api/database/status", (req, res) => {
    res.json(getDbStatus());
  });

  // REST API: Activities CRUD
  app.get("/api/activities", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "local_user";
      const data = await getActivities(userId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal mengambil data kegiatan", message: err.message });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const userId = req.body.userId || "local_user";
      const saved = await saveActivity(req.body, userId);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal menyimpan kegiatan", message: err.message });
    }
  });

  app.put("/api/activities/:id", async (req, res) => {
    try {
      const userId = req.body.userId || "local_user";
      const saved = await saveActivity({ ...req.body, id: req.params.id }, userId);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal memperbarui kegiatan", message: err.message });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "local_user";
      await deleteActivity(req.params.id, userId);
      res.json({ success: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: "Gagal menghapus kegiatan", message: err.message });
    }
  });

  // REST API: Finance Entries CRUD
  app.get("/api/finance", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "local_user";
      const data = await getFinanceEntries(userId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal mengambil data keuangan", message: err.message });
    }
  });

  app.post("/api/finance", async (req, res) => {
    try {
      const userId = req.body.userId || "local_user";
      const saved = await saveFinanceEntry(req.body, userId);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal menyimpan data keuangan", message: err.message });
    }
  });

  app.put("/api/finance/:id", async (req, res) => {
    try {
      const userId = req.body.userId || "local_user";
      const saved = await saveFinanceEntry({ ...req.body, id: req.params.id }, userId);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal memperbarui data keuangan", message: err.message });
    }
  });

  app.delete("/api/finance/:id", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "local_user";
      await deleteFinanceEntry(req.params.id, userId);
      res.json({ success: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: "Gagal menghapus data keuangan", message: err.message });
    }
  });

  // REST API: Settings & Custom Accounts
  app.get("/api/settings", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || "local_user";
      const data = await getUserSettings(userId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Gagal mengambil pengaturan", message: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const userId = req.body.userId || "local_user";
      await saveUserSettings(req.body, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Gagal menyimpan pengaturan", message: err.message });
    }
  });

  // REST API: Authentication (Local / MySQL user)
  app.post("/api/auth/login", (req, res) => {
    const { email, name } = req.body;
    const user = {
      uid: "local_user",
      email: email || "user@local.db",
      displayName: name || (email ? email.split("@")[0] : "Pengguna Lokal"),
      photoURL: null
    };
    res.json({ success: true, user });
  });

  app.get("/api/auth/me", (req, res) => {
    res.json({
      uid: "local_user",
      email: "user@local.db",
      displayName: "Pengguna Lokal",
      photoURL: null
    });
  });

  // API Route: Check health status
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: Get synced daily activities (backwards compatibility)
  app.get("/api/sync", async (req, res) => {
    try {
      const data = await readDb();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Gagal membaca data sinkronisasi dari server", message: error.message });
    }
  });

  // API Route: Backup/Sync entries to server
  app.post("/api/sync", async (req, res) => {
    try {
      const { entries, financeEntries, customCategories, customAccounts, financeCategories } = req.body;
      
      if (!Array.isArray(entries)) {
        res.status(400).json({ error: "Format data salah. Harus menyertakan array 'entries'" });
        return;
      }

      const syncData = {
        entries,
        financeEntries: financeEntries || [],
        customCategories: customCategories || [],
        customAccounts: customAccounts || [],
        financeCategories: financeCategories || null,
        updatedAt: new Date().toISOString()
      };

      await writeDb(syncData);
      res.json({ success: true, updatedAt: syncData.updatedAt });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal menyimpan data sinkronisasi ke server", message: error.message });
    }
  });

  // API Route: AI Auto-Breakdown for University/College Subtasks
  app.post("/api/ai/breakdown-task", async (req, res) => {
    const { courseName, title, content } = req.body;
    if (!title && !courseName) {
      res.status(400).json({ error: "Nama mata kuliah atau judul tugas harus diisi." });
      return;
    }

    try {
      if (!process.env.GEMINI_API_KEY) {
        // Smart rule-based fallback if no API key
        res.json({
          subtasks: [
            { text: `Pahami silabus dan instruksi: ${title || courseName}` },
            { text: "Kumpulkan bahan materi / dataset / referensi jurnal" },
            { text: "Buat kerangka rancangan dan metodologi pengerjaan" },
            { text: "Tulis modul utama / implementasi kode / draf analisis" },
            { text: "Tinjau ulang hasil, cek format laporan & sitasi" }
          ],
          estimatedHours: 4,
          advice: "Fokuskan pada pemahaman instruksi dan kumpulkan bahan referensi di awal."
        });
        return;
      }

      const prompt = `Pecah tugas kuliah mahasiswa berikut menjadi 4 sampai 6 langkah (subtask) konkret, terurut secara logis dan praktis.
Mata Kuliah: ${courseName || 'Umum'}
Judul Tugas: ${title || 'Tugas Kuliah'}
Keterangan Tambahan: ${content || 'Tidak ada'}

Pastikan setiap subtask diawali kata kerja tindakan yang jelas (misal: "Kumpulkan...", "Rancang...", "Tulis...", "Analisis...", "Uji coba...", "Finalisasi...").`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "Kamu adalah asisten akademik cerdas untuk mahasiswa Indonesia. Berikan breakdown tugas yang realistis, efisien, dan menggunakan bahasa Indonesia yang baik.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "Langkah pengerjaan tugas konkret" }
                  },
                  required: ["text"]
                }
              },
              estimatedHours: { type: Type.NUMBER, description: "Perkiraan waktu pengerjaan dalam jam" },
              advice: { type: Type.STRING, description: "Tips strategi pengerjaan singkat (1 kalimat)" }
            },
            required: ["subtasks"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        subtasks: Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0 ? parsed.subtasks : [
          { text: `Pelajari topik dan materi: ${title || courseName}` },
          { text: "Kumpulkan referensi dan literatur" },
          { text: "Kerjakan implementasi utama" },
          { text: "Periksa kembali sebelum submit" }
        ],
        estimatedHours: parsed.estimatedHours || 4,
        advice: parsed.advice || "Kerjakan bertahap dan tinjau kembali sebelum batas waktu."
      });
    } catch (error: any) {
      console.error("AI Breakdown Task Error:", error);
      res.json({
        subtasks: [
          { text: `Pahami instruksi tugas: ${title || courseName}` },
          { text: "Kumpulkan referensi dan materi kuliah terkait" },
          { text: "Kerjakan implementasi atau draf tugas utama" },
          { text: "Cek format dan finalisasi berkas tugas" }
        ],
        estimatedHours: 4,
        advice: "Mulai dari mencari bahan sebelum menulis bagian akhir."
      });
    }
  });

  // API Route: AI Monthly Financial Health & Budget Analysis
  app.post("/api/ai/finance-analysis", async (req, res) => {
    const { month, totalIncome, totalExpense, balanceSummary, topExpenses, transactionCount, budgetGoal } = req.body;

    try {
      if (!process.env.GEMINI_API_KEY) {
        const net = (totalIncome || 0) - (totalExpense || 0);
        let status = "Aman";
        let score = 85;
        if (budgetGoal && totalExpense > budgetGoal) {
          status = "Kritis";
          score = 45;
        } else if (totalExpense > totalIncome && totalIncome > 0) {
          status = "Waspada";
          score = 60;
        }
        res.json({
          healthStatus: status,
          healthScore: score,
          summary: `Pengeluaran bulan ini Rp${(totalExpense || 0).toLocaleString('id-ID')} dari pemasukan Rp${(totalIncome || 0).toLocaleString('id-ID')}. Arus kas bersih ${net >= 0 ? '+' : ''}Rp${net.toLocaleString('id-ID')}.`,
          alerts: totalExpense > (budgetGoal || totalIncome)
            ? ["Pengeluaran telah melampaui batas anggaran bulanan yang direncanakan!"]
            : ["Arus kas saat ini dalam rentang terkendali."],
          insights: [
            `Rasio pengeluaran terhadap pemasukan: ${totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 100}%`,
            `Tercatat ${transactionCount || 0} transaksi dalam periode ini.`
          ],
          recommendations: [
            "Pantau pengeluaran harian agar tidak terjadi pengeluaran impulsif.",
            "Sisihkan 10-20% dari setiap pemasukan langsung ke pos simpanan."
          ]
        });
        return;
      }

      const prompt = `Analisis kesehatan keuangan dan anggaran bulanan berikut:
Bulan: ${month}
Total Pemasukan: Rp${totalIncome || 0}
Total Pengeluaran: Rp${totalExpense || 0}
Sisa Bersih (Net Cashflow): Rp${(totalIncome || 0) - (totalExpense || 0)}
Target Batas Budget: ${budgetGoal ? `Rp${budgetGoal}` : 'Belum ditetapkan'}
Jumlah Transaksi: ${transactionCount || 0}
Kategori Pengeluaran Terbanyak: ${JSON.stringify(topExpenses || [])}
Distribusi Saldo Terkini: ${JSON.stringify(balanceSummary || {})}

Evaluasi kesehatan keuangan pengguna:
1. healthStatus: "Aman" jika pengeluaran sehat (< 80% pemasukan/budget), "Waspada" jika mendekati batas (80-100%), "Kritis" jika defisit atau melampaui budget (> 100%).
2. healthScore: angka bulat 0-100.
3. summary: ringkasan lugas 1-2 kalimat mengenai kondisi keuangan periode ini.
4. alerts: array 1-3 string berisi peringatan penting / deteksi lonjakan kategori / potensi defisit. Jika kondisi sangat baik, beri apresiasi penghematan.
5. insights: array 2-3 string berisi wawasan tren dan distribusi pengeluaran.
6. recommendations: array 2-3 string aksi konkret untuk menghemat atau mengatur cashflow.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "Kamu adalah penasihat keuangan pribadi cerdas dan suportif bagi pengguna Indonesia. Berikan evaluasi yang tajam, realistis, dan memotivasi dengan bahasa Indonesia yang natural.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              healthStatus: { type: Type.STRING, description: "Aman | Waspada | Kritis" },
              healthScore: { type: Type.INTEGER, description: "Skor kesehatan 0 sampai 100" },
              summary: { type: Type.STRING, description: "Ringkasan kondisi finansial singkat" },
              alerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Daftar peringatan atau potensi bahaya keuangan"
              },
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Wawasan pola pengeluaran"
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Rekomendasi penghematan praktis"
              }
            },
            required: ["healthStatus", "healthScore", "summary", "alerts", "insights", "recommendations"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("AI Finance Analysis Error:", error);
      const net = (totalIncome || 0) - (totalExpense || 0);
      res.json({
        healthStatus: net >= 0 ? "Aman" : "Waspada",
        healthScore: net >= 0 ? 80 : 55,
        summary: `Pengeluaran bulan ini tercatat Rp${(totalExpense || 0).toLocaleString('id-ID')} dengan pemasukan Rp${(totalIncome || 0).toLocaleString('id-ID')}.`,
        alerts: net < 0 ? ["Pengeluaran melebihi pemasukan bulan ini."] : ["Arus kas masih bernilai positif."],
        insights: ["Periksa kembali kategori pengeluaran terbesar untuk memprioritaskan kebutuhan esensial."],
        recommendations: ["Catat setiap transaksi secara teratur untuk menjaga kestabilan finansial."]
      });
    }
  });

  // Integrate Vite for development, serve static files for production
  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");
  let hasDist = false;
  try {
    const stat = await fs.stat(indexPath);
    hasDist = stat.isFile();
  } catch {
    hasDist = false;
  }

  const isProduction =
    (process.env.NODE_ENV === "production" ||
    Boolean(process.env.K_SERVICE) ||
    process.env.npm_lifecycle_event === "start") && hasDist;

  if (isProduction) {
    console.log(`Starting server in PRODUCTION mode on port ${PORT}... (Serving ${distPath})`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    console.log(`Starting server in DEVELOPMENT / ON-DEMAND mode on port ${PORT}...`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server failure:", err);
});
