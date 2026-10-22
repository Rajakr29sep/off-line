import { RAG_BASE_URL } from "../config/env.js";

export async function askRag(payload) {
  const url = `${RAG_BASE_URL.replace(/\/+$/, "")}/ask`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = `RAG service returned HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || parsed.message || detail;
    } catch {}
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return response.json();
}
