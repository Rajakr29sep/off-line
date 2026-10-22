import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, KIWIX_BASE_URL, PORT, RAG_BASE_URL } from "../config/env.js";

const router = Router();

router.get("/", async (_req, res) => {
  const sqlitePath = path.join(DATA_DIR, "index", "emergency.sqlite3");
  const zimsDir = path.join(DATA_DIR, "zims");
  const mapsDir = path.join(DATA_DIR, "maps");
  const tilesDir = path.join(mapsDir, "tiles");

  let zimFiles = [];
  if (fs.existsSync(zimsDir)) {
    zimFiles = fs
      .readdirSync(zimsDir)
      .filter((f) => f.endsWith(".zim"));
  }

  // Check FastAPI RAG health
  let ragHealthy = false;
  let ragDetails = null;
  try {
    const ragResp = await fetch(`${RAG_BASE_URL.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (ragResp.ok) {
      ragHealthy = true;
      ragDetails = await ragResp.json();
    }
  } catch {
    ragHealthy = false;
  }

  // Check Kiwix server health
  let kiwixHealthy = false;
  try {
    const kiwixResp = await fetch(KIWIX_BASE_URL, {
      signal: AbortSignal.timeout(1500),
    });
    kiwixHealthy = kiwixResp.ok;
  } catch {
    kiwixHealthy = false;
  }

  const mapTilesInstalled =
    fs.existsSync(tilesDir) && fs.readdirSync(tilesDir).length > 0;
  const sqliteExists = fs.existsSync(sqlitePath);

  res.json({
    ok: true,
    service: "kiwix-emergency-api",
    mode: "local",
    timestamp: new Date().toISOString(),
    services: {
      express: {
        status: "online",
        port: PORT,
      },
      ragService: {
        status: ragHealthy ? "online" : "offline",
        port: 8000,
        url: RAG_BASE_URL,
        details: ragDetails,
      },
      kiwix: {
        status: kiwixHealthy ? "online" : "offline",
        port: 8080,
        url: KIWIX_BASE_URL,
        message: kiwixHealthy
          ? "Kiwix reader connected"
          : "Kiwix server not running on port 8080",
      },
    },
    storage: {
      sqliteDatabase: {
        exists: sqliteExists,
        path: sqlitePath,
      },
      zimArchives: {
        count: zimFiles.length,
        files: zimFiles,
      },
      maps: {
        tilesInstalled: mapTilesInstalled,
        status: mapTilesInstalled
          ? "Local tiles detected"
          : "Map data unavailable",
      },
    },
  });
});

export default router;
