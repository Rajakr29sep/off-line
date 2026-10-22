import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.schemas import AskRequest
from app.emergency_responses import get_emergency_response
from app.retrieval.search import search_passages
from app.generation.local_llm import generate_answer
from app.config import DB_PATH, ZIM_DIR
from app.zim_search import get_zim_files, search_zim_context
from libzim.reader import Archive
from libzim.search import Query as ZimQuery, Searcher as ZimSearcher
from bs4 import BeautifulSoup

app = FastAPI(
    title="Kiwix Emergency Offline RAG",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
            "url": f"/api/zim/article?archive={item.get('archive')}&path={item.get('path')}",
        }
        for item in items
    ]


def generate_local_answer(question, topic, sources):
    """Generate an answer with local model if available, else return None."""
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
    except Exception as exc:
        print(f"[ERROR] Local answer generation failed: {exc}")
    return None


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
        print(f"[TIMING] {request.method} {request.url.path}: {elapsed:.2f}s")


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health():
    zim_files = get_zim_files()

    archives_info = []
    for zf in zim_files:
        try:
            sz = zf.stat().st_size
            archives_info.append({
                "filename": zf.name,
                "sizeBytes": sz,
                "sizeMb": round(sz / (1024 * 1024), 1),
            })
        except Exception:
            archives_info.append({"filename": zf.name})

    return {
        "ok": True,
        "service": "offline-rag",
        "indexExists": DB_PATH.exists(),
        "zimDirectoryExists": ZIM_DIR.exists(),
        "zimArchives": [path.name for path in zim_files],
        "zimArchiveDetails": archives_info,
        "zimArchiveCount": len(zim_files),
        "emergencyTemplatesEnabled": True,
    }


# --------------------------------------------------
# Direct ZIM Reader Endpoints
# --------------------------------------------------

@app.get("/zim/archives")
def list_archives():
    zim_files = get_zim_files()
    archives = []
    for f in zim_files:
        try:
            a = Archive(str(f))
            archives.append({
                "filename": f.name,
                "sizeBytes": f.stat().st_size,
                "entryCount": a.all_entry_count,
                "articleCount": a.article_count,
                "hasFulltextIndex": a.has_fulltext_index,
            })
        except Exception as exc:
            archives.append({
                "filename": f.name,
                "sizeBytes": f.stat().st_size if f.exists() else 0,
                "error": str(exc),
            })
    return {"ok": True, "archives": archives}


@app.get("/zim/article")
def read_zim_article(
    archive: str = Query(..., description="ZIM filename in data/zims"),
    path: str = Query(..., description="Path to article inside ZIM"),
):
    zim_path = ZIM_DIR / archive
    if not zim_path.is_file():
        raise HTTPException(status_code=404, detail=f"ZIM archive {archive!r} not found in {ZIM_DIR}")

    try:
        a = Archive(str(zim_path))
        entry = a.get_entry_by_path(path)
        item = entry.get_item()
        raw_bytes = item.content.tobytes()
        content_type = str(item.mimetype)

        if content_type.startswith("text/html"):
            html_text = raw_bytes.decode("utf-8", errors="replace")
            return HTMLResponse(content=html_text, status_code=200)

        return HTMLResponse(
            content=f"<pre>{raw_bytes.decode('utf-8', errors='replace')}</pre>",
            status_code=200,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read article {path!r}: {exc}")


@app.get("/zim/search")
def search_zim_archive(
    archive: str = Query(..., description="ZIM filename in data/zims"),
    query: str = Query(..., description="Search term"),
    limit: int = 8,
):
    zim_path = ZIM_DIR / archive
    if not zim_path.is_file():
        raise HTTPException(status_code=404, detail=f"ZIM archive {archive!r} not found in {ZIM_DIR}")

    try:
        a = Archive(str(zim_path))
        searcher = ZimSearcher(a)
        q = ZimQuery().set_query(query)
        search_res = searcher.search(q)
        total_matches = search_res.getEstimatedMatches()
        count = min(limit, total_matches)
        paths = list(search_res.getResults(0, count))

        results = []
        for p in paths:
            path_str = str(p)
            try:
                entry = a.get_entry_by_path(path_str)
                item = entry.get_item()
                raw = item.content.tobytes()
                soup = BeautifulSoup(raw, "html.parser")
                title = soup.title.get_text(" ", strip=True) if soup.title else path_str.replace("_", " ")
                for el in soup(["script", "style", "nav", "footer", "header"]):
                    el.decompose()
                excerpt = soup.get_text(" ", strip=True)[:350]
                results.append({
                    "title": title,
                    "path": path_str,
                    "archive": archive,
                    "excerpt": excerpt,
                })
            except Exception:
                results.append({
                    "title": path_str.replace("_", " "),
                    "path": path_str,
                    "archive": archive,
                    "excerpt": "OpenStreetMap documentation entry.",
                })

        return {
            "ok": True,
            "query": query,
            "archive": archive,
            "totalMatches": total_matches,
            "count": len(results),
            "results": results,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Search failed on {archive!r}: {exc}")


# --------------------------------------------------
# Ask endpoint
# --------------------------------------------------

@app.post("/ask")
def ask(payload: AskRequest):
    request_start = time.perf_counter()

    question = (payload.question or "").strip()
    topic = (payload.topic or "").strip()
    category_id = (payload.categoryId or "emergency-knowledge").strip()

    print(f"\n[ASK] Question: {question} (Category: {category_id}, Topic: {topic})")

    if not question:
        return {
            "fallback": True,
            "reason": "Empty question",
            "answer": "Please enter a question to search offline emergency guidance.",
            "sources": [],
            "mode": "empty-query",
        }

    # 1. Emergency templates: instant verified protocol for life-critical emergencies.
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
        print(f"[TIMING] Total request: {time.perf_counter() - request_start:.2f}s")
        return {
            "fallback": False,
            "answer": emergency.get("answer", ""),
            "title": emergency.get("title", "Emergency guidance"),
            "urgency": emergency.get("urgency", "urgent"),
            "disclaimer": emergency.get("disclaimer", "General emergency information, not a substitute for professional care."),
            "sources": [],
            "mode": "offline-emergency-template",
        }

    # 2. Search SQLite index.
    try:
        sqlite_sources = timed_call(
            "SQLite retrieval",
            search_passages,
            question,
            category_id,
            topic,
        ) or []
    except Exception as exc:
        print(f"[ERROR] SQLite retrieval failed: {exc}")
        sqlite_sources = []

    if sqlite_sources:
        answer = generate_local_answer(
            question,
            topic or question,
            sqlite_sources,
        )

        print(f"[TIMING] Total request: {time.perf_counter() - request_start:.2f}s")

        if answer:
            return {
                "fallback": False,
                "answer": answer,
                "sources": sqlite_sources,
                "mode": "local-llm",
            }

        # Retrieval succeeded without generative model: present top grounded excerpts!
        top_excerpt = sqlite_sources[0]["excerpt"]
        summary = (
            f"Retrieved offline emergency knowledge regarding {topic or question}:\n\n"
            f"{top_excerpt}\n\n"
            f"Please review the detailed source passages and citations below."
        )

        return {
            "fallback": False,
            "answer": summary,
            "sources": sqlite_sources,
            "mode": "sqlite-retrieval",
            "reason": "Grounded passages retrieved from local SQLite index.",
        }

    # 3. SQLite returned nothing: search the live ZIM archives directly.
    try:
        zim_context = timed_call(
            "ZIM retrieval and text extraction",
            search_zim_context,
            question,
            limit=4,
        ) or []
    except Exception as exc:
        print(f"[ERROR] ZIM retrieval failed: {exc}")
        zim_context = []

    if zim_context:
        zim_sources = build_zim_sources(zim_context)

        answer = generate_local_answer(
            question,
            topic or question,
            zim_context,
        )

        print(f"[TIMING] Total request: {time.perf_counter() - request_start:.2f}s")

        if answer:
            return {
                "fallback": False,
                "answer": answer,
                "sources": zim_sources,
                "mode": "zim-llm",
            }

        top_article = zim_sources[0]
        summary = (
            f"Retrieved offline article '{top_article['title']}' from {top_article['archive']}:\n\n"
            f"{top_article['excerpt']}\n\n"
            f"Refer to the source passages below for complete reference text."
        )

        return {
            "fallback": False,
            "answer": summary,
            "sources": zim_sources,
            "mode": "zim-retrieval",
            "reason": "Grounded articles retrieved directly from offline ZIM archives.",
        }

    # 4. No matching readable content found.
    print(f"[TIMING] Total request: {time.perf_counter() - request_start:.2f}s")

    return {
        "fallback": True,
        "reason": "No matching readable content was found in offline archives.",
        "answer": (
            "I couldn't find sufficient information in the available offline knowledge sources "
            "to answer reliably. Try rephrasing with key disaster or medical terms (e.g., 'earthquake', "
            "'burn', 'bleeding', 'flood preparedness'). In an immediate emergency, call 112."
        ),
        "sources": [],
        "mode": "no-matching-response",
    }
