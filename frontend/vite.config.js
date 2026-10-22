import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            if (!res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Express backend unavailable",
                  message:
                    "Express API on port 3000 is not responding. Ensure the backend process is running.",
                  detail: err.message,
                })
              );
            }
          });
        },
      },

      "/kiwix": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kiwix/, "") || "/",
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            if (!res.headersSent) {
              res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
              res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kiwix Server Not Running — Kiwix Emergency</title>
  <style>
    :root {
      --bg: #0b0f19;
      --surface: #111827;
      --border: #263449;
      --accent: #38bdf8;
      --amber: #f59e0b;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      line-height: 1.6;
    }
    .container {
      max-width: 680px;
      width: 100%;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.15);
      color: var(--amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 1.75rem;
      color: var(--text);
    }
    p {
      color: var(--muted);
      margin: 0 0 16px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin: 24px 0;
    }
    .card h2 {
      margin-top: 0;
      font-size: 1.15rem;
      color: var(--text);
    }
    pre {
      background: #060911;
      border: 1px solid var(--border);
      padding: 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      color: var(--accent);
      overflow-x: auto;
      margin: 12px 0;
    }
    ul {
      margin: 0;
      padding-left: 20px;
      color: var(--muted);
    }
    li {
      margin-bottom: 6px;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    a.button {
      display: inline-flex;
      align-items: center;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      background: var(--accent);
      color: #0b0f19;
      transition: opacity 0.2s;
    }
    a.button:hover {
      opacity: 0.9;
    }
    a.secondary {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Offline Service Notice</span>
    <h1>Kiwix Library Server is Not Running</h1>
    <p>
      The frontend tried to connect to the offline Kiwix reader at
      <code>http://127.0.0.1:8080/</code>, but the port is currently closed (ECONNREFUSED).
    </p>

    <div class="card">
      <h2>How to start the Kiwix reader</h2>
      <p>
        If Kiwix-tools is installed, you can start the native HTTP archive server in PowerShell:
      </p>
      <pre>kiwix-serve --port=8080 data\\zims\\wikipedia_en_medicine_maxi_2026-10.zim</pre>
      <p>Or serve multiple archives together:</p>
      <pre>kiwix-serve --port=8080 data\\zims\\*.zim</pre>
      <p>Available archives detected in <code>data/zims/</code>:</p>
      <ul>
        <li><code>wikipedia_en_medicine_maxi_2026-10.zim</code> (Medicine & First Aid)</li>
        <li><code>ready.gov_en_all_2026-10.zim</code> (Disaster Readiness & Evacuation)</li>
        <li><code>openstreetmap-wiki_en_all_nopic_2026-10.zim</code> (OSM Documentation Wiki)</li>
      </ul>
    </div>

    <div class="card">
      <h2>Using Offline Search without Kiwix-serve</h2>
      <p>
        The emergency RAG search and AI guidance engine works directly through the local Python
        service using <code>libzim</code>. You do not need Kiwix-serve running to ask questions
        or retrieve sourced guidance.
      </p>
    </div>

    <div class="actions">
      <a class="button" href="/">← Back to Kiwix Emergency</a>
      <a class="button secondary" href="javascript:location.reload()">Retry Connection</a>
    </div>
  </div>
</body>
</html>`);
            }
          });
        },
      },
    },
  },
});
