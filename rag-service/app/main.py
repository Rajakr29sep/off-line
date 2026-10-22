
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import AskRequest
from app.emergency_responses import get_emergency_response
from app.retrieval.search import search_passages
from app.generation.local_llm import generate_answer
from app.config import DB_PATH, ZIM_DIR
from app.zim_search import get_zim_files, search_zim_context


app = FastAPI(
    title="Kiwix Emergency Offline RAG",
    version="0.6.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Timing helper
# --------------------------------------------------

def timed_call(label, function, *args, **kwargs):
    """Run a function and print its execution time."""
    start = time.perf_counter()

    try:
        return function(*args, **kwargs)
    finally:
        elapsed = time.perf_counter() - start
        print(f"[TIMING] {label}: {elapsed:.2f}s")


# --------------------------------------------------
# Source formatting
# --------------------------------------------------

def build_zim_sources(items):
    """Prepare readable ZIM articles for the API response."""
    return [
        {
            "title": item.get("title", "Untitled article"),
            "path": item.get("path", ""),
            "archive": item.get("archive", ""),
            "excerpt": item.get("content", "")[:1200],
            "source_type": item.get("source_type", "zim_article"),
        }
        for item in items
    ]


def generate_local_answer(question, topic, sources):
    """Generate an answer with the existing local model."""
    try:
        answer = timed_call(
            "Local LLM generation",
            generate_answer,
            question,
            topic,
            sources,
        )

        if isinstance(answer, str) and answer.strip():
            return answer.strip()

        print("[WARN] The local LLM returned an empty answer.")

    except Exception as exc:
        print(f"[ERROR] Local answer generation failed: {exc}")

    return None


def retrieval_only_response():
    return (
        "I found relevant information in the offline knowledge library, "
        "but couldn't generate a complete answer. Please review the "
        "source excerpts below."
    )


# --------------------------------------------------
# Request timing middleware
# --------------------------------------------------

@app.middleware("http")
async def log_request_time(request, call_next):
    start = time.perf_counter()

    try:
        response = await call_next(request)
        return response
    finally:
        elapsed = time.perf_counter() - start
        print(
            f"[TIMING] {request.method} {request.url.path}: "
            f"{elapsed:.2f}s"
        )


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health():
    zim_files = get_zim_files()

    return {
        "ok": True,
        "service": "offline-rag",
        "indexExists": DB_PATH.exists(),
        "zimDirectoryExists": ZIM_DIR.exists(),
        "zimArchives": [path.name for path in zim_files],
        "zimArchiveCount": len(zim_files),
        "emergencyTemplatesEnabled": True,
    }


# --------------------------------------------------
# Ask endpoint
# --------------------------------------------------

@app.post("/ask")
def ask(payload: AskRequest):
    request_start = time.perf_counter()

    question = (payload.question or "").strip()
    topic = (payload.topic or "").strip()

    print(f"\n[ASK] Question: {question}")

    if not question:
        return {
            "fallback": True,
            "reason": "Empty question",
            "answer": "Please enter a question.",
            "sources": [],
            "mode": "empty-query",
        }

    # 1. Emergency templates: fastest path for known emergencies.
    try:
        emergency = timed_call(
            "Emergency template lookup",
            get_emergency_response,
            question,
            topic,
        )
    except Exception as exc:
        print(f"[ERROR] Emergency template lookup: {exc}")
        emergency = None

    if emergency:
        print(
            f"[TIMING] Total request: "
            f"{time.perf_counter() - request_start:.2f}s"
        )

        return {
            "fallback": False,
            "answer": emergency.get("answer", ""),
            "title": emergency.get("title", "Emergency guidance"),
            "urgency": emergency.get("urgency", "urgent"),
            "sources": [],
            "mode": "offline-emergency-template",
        }

    # 2. Search SQLite first.
    try:
        sqlite_sources = timed_call(
            "SQLite retrieval",
            search_passages,
            question,
            payload.categoryId,
            topic,
        ) or []
    except Exception as exc:
        print(f"[ERROR] SQLite retrieval failed: {exc}")
        sqlite_sources = []

    if sqlite_sources:
        answer = generate_local_answer(
            question,
            topic,
            sqlite_sources,
        )

        print(
            f"[TIMING] Total request: "
            f"{time.perf_counter() - request_start:.2f}s"
        )

        if answer:
            return {
                "fallback": False,
                "answer": answer,
                "sources": sqlite_sources,
                "mode": "local-llm",
            }

        return {
            "fallback": True,
            "reason": "SQLite retrieval succeeded, but answer generation failed.",
            "answer": retrieval_only_response(),
            "sources": sqlite_sources,
            "mode": "retrieval-only",
        }

    # 3. SQLite returned nothing, so search the ZIM archives.
    # This is the only ZIM search call in this request.
    try:
        zim_context = timed_call(
            "ZIM retrieval and text extraction",
            search_zim_context,
            question,
            limit=3,
        ) or []
    except Exception as exc:
        print(f"[ERROR] ZIM retrieval failed: {exc}")
        zim_context = []

    if zim_context:
        zim_sources = build_zim_sources(zim_context)

        answer = generate_local_answer(
            question,
            topic,
            zim_context,
        )

        print(
            f"[TIMING] Total request: "
            f"{time.perf_counter() - request_start:.2f}s"
        )

        if answer:
            return {
                "fallback": False,
                "answer": answer,
                "sources": zim_sources,
                "mode": "zim-rag",
            }

        return {
            "fallback": True,
            "reason": "ZIM articles were found, but answer generation failed.",
            "answer": retrieval_only_response(),
            "sources": zim_sources,
            "mode": "zim-retrieval-only",
        }

    # 4. No readable content was found.
    # Deliberately skip a second ZIM search to avoid repeating
    # expensive archive queries for the same question.
    print(
        f"[TIMING] Total request: "
        f"{time.perf_counter() - request_start:.2f}s"
    )

    return {
        "fallback": True,
        "reason": "No readable matching content was found.",
        "answer": (
            "I couldn't find sufficient information in the available "
            "offline knowledge sources to answer reliably. Try using "
            "different keywords or a more specific question. If someone "
            "is in immediate danger, contact local emergency services."
        ),
        "sources": [],
        "mode": "no-matching-response",
    }
