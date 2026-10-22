import requests
from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL

def generate_answer(question: str, topic: str, sources: list[dict]):
    if not OLLAMA_MODEL or not sources:
        return None
    context = "\n\n".join(
        f"[Source {i+1}] {s['title']} ({s['source_zim']} / {s['article_path']}):\n{s['excerpt']}"
        for i, s in enumerate(sources)
    )
    prompt = f"""You are an offline emergency information assistant.
Answer the user's question about {topic!r} using ONLY the source passages below.
Do not invent facts, emergency phone numbers, citations, or steps. If the sources do not support a reliable answer, say that the local sources are insufficient and advise contacting qualified emergency responders.
Keep the answer concise. Cite sources inline as [Source 1], [Source 2].
This is information support, not a replacement for emergency responders.

QUESTION:
{question}

SOURCE PASSAGES:
{context}
"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=90,
        )
        response.raise_for_status()
        answer = response.json().get("response", "").strip()
        return answer or None
    except requests.RequestException:
        return None
