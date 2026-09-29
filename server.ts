import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DB_FILE_PATH = path.join(process.cwd(), "sync_db.json");

// Helper to read database safely
async function readDb() {
  try {
    const data = await fs.readFile(DB_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty template
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

  // Parse JSON bodies
  app.use(express.json({ limit: "20mb" }));

  // API Route: Check sync health status
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route: Get synced daily activities
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

  // Integrate Vite for development, serve static files for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server failure:", err);
});
