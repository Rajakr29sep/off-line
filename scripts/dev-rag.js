import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const venvWin = path.join(root, ".venv", "Scripts", "python.exe");
const venvUnix = path.join(root, ".venv", "bin", "python");

let py = "python";
if (fs.existsSync(venvWin)) {
  py = venvWin;
} else if (fs.existsSync(venvUnix)) {
  py = venvUnix;
}

console.log(`[RAG Launcher] Using Python: ${py}`);

const args = [
  "-m",
  "uvicorn",
  "app.main:app",
  "--app-dir",
  "rag-service",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
  "--reload",
];

const child = spawn(py, args, {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

child.on("error", (err) => {
  console.error(`[RAG Launcher] Failed to start Python RAG service:`, err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
