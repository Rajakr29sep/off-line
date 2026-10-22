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

console.log(`[Index Runner] Using Python: ${py}`);

const scriptPath = path.join(root, "scripts", "build-index.py");
const extraArgs = process.argv.slice(2);

const child = spawn(py, [scriptPath, ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

child.on("error", (err) => {
  console.error(`[Index Runner] Failed to start index script:`, err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
