const RAG_URL = process.env.RAG_BASE_URL || "http://127.0.0.1:8000";
export async function askRag(payload) {
  const response = await fetch(`${RAG_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error(`RAG service returned ${response.status}`);
  return response.json();
}
