import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root is kiwix-emergency (3 directories up from backend/src/config)
export const PROJECT_ROOT = path.resolve(__dirname, "../../..");

// Check multiple potential locations for .env
const candidates = [
  path.resolve(PROJECT_ROOT, ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
];

for (const envFile of candidates) {
  if (fs.existsSync(envFile)) {
    try {
      const text = fs.readFileSync(envFile, "utf-8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const splitIdx = trimmed.indexOf("=");
          const key = trimmed.slice(0, splitIdx).trim();
          const val = trimmed.slice(splitIdx + 1).trim();
          if (key && !(key in process.env)) {
            process.env[key] = val;
          }
        }
      }
      break;
    } catch {
      // Ignore read errors and continue
    }
  }
}

export const PORT = Number(process.env.PORT || 3000);
export const RAG_BASE_URL = process.env.RAG_BASE_URL || "http://127.0.0.1:8000";
export const KIWIX_BASE_URL = process.env.KIWIX_BASE_URL || "http://127.0.0.1:8080";

// Always ensure DATA_DIR points to the valid data directory
let resolvedDataDir = path.join(PROJECT_ROOT, "data");
if (process.env.DATA_DIR) {
  const custom = path.resolve(PROJECT_ROOT, process.env.DATA_DIR);
  if (fs.existsSync(custom)) {
    resolvedDataDir = custom;
  }
}
export const DATA_DIR = resolvedDataDir;
