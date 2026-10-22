import json
import requests
from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL, LLAMA_CPP_BASE_URL

def generate_answer(question: str, topic: str, sources: list[dict]):
    if not sources:
        return None

    context = "\n\n".join(
        f"[Source {i+1}] {s.get('title', 'Resource')} ({s.get('source_zim', s.get('archive', 'Offline Archive'))} / {s.get('article_path', s.get('path', ''))}):\n{s.get('excerpt', s.get('content', ''))[:1000]}"
        for i, s in enumerate(sources[:4])
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

    # 1. Try Ollama if configured
    if OLLAMA_MODEL:
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
                timeout=30,
            )
            if resp.ok:
                answer = resp.json().get("response", "").strip()
                if answer:
                    return answer
        except requests.RequestException:
            pass

    # 2. Try llama-server if running on LLAMA_CPP_BASE_URL
    try:
        resp = requests.post(
            f"{LLAMA_CPP_BASE_URL}/v1/chat/completions",
            json={
                "messages": [
                    {"role": "system", "content": "You are an offline emergency knowledge assistant."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 512,
            },
            timeout=15,
        )
        if resp.ok:
            data = resp.json()
            answer = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if answer:
                return answer
    except requests.RequestException:
        pass

    # When no local LLM service is active or model is unavailable, return None.
    # The pipeline will safely return grounded retrieval citations.
    return None
