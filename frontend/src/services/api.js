
export async function askOfflineRag({
  question,
  categoryId,
  topic,
}) {
  const baseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      categoryId: categoryId || "emergency-knowledge",
      topic: topic || question,
    }),
  });

  const rawResponse = await response.text();

  let data;

  try {
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    data = { detail: rawResponse || "The server returned an empty response." };
  }

  if (!response.ok) {
    const detail = data.detail || data;
    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  return data;
}
