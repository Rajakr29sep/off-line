
from pathlib import Path
import html
import re
import sqlite3

from bs4 import BeautifulSoup
from libzim.reader import Archive
from libzim.search import Query, Searcher

ROOT = Path(__file__).resolve().parents[1]
ZIM_PATH = ROOT / "data" / "zims" / "urban-prepper_en_all_2026-08.zim"
INDEX_DIR = ROOT / "data" / "index"
DB_PATH = INDEX_DIR / "emergency.sqlite3"

# Keep these topic names identical to the frontend.
# Search terms are used to discover articles in the new ZIM.
TOPIC_SEARCHES = {
    "Heart attack and chest pain": {
        "category": "medical",
        "terms": [
            "heart attack",
            "chest pain",
            "heart",
            "stroke",
            "CPR",
        ],
    },
    "Stroke": {
        "category": "medical",
        "terms": [
            "stroke",
            "FAST",
        ],
    },
    "House or apartment fire": {
        "category": "fire",
        "terms": [
            "fire",
            "smoke",
            "extinguisher",
            "burn",
            "evacuation",
            "escape",
            "carbon monoxide",
        ],
    },
    "Office or commercial building fire": {
        "category": "fire",
        "terms": [
            "fire",
            "smoke",
            "extinguisher",
            "evacuation",
            "escape",
            "exit",
            "carbon monoxide",
        ],
    },
}

CHUNK_SIZE = 900
CHUNK_OVERLAP = 120
MAX_RESULTS_PER_TERM = 50


def clean_article(item):
    raw = item.content.tobytes()
    soup = BeautifulSoup(raw, "html.parser")

    for element in soup(
        ["script", "style", "nav", "footer", "header", "noscript"]
    ):
        element.decompose()

    title = (
        soup.title.get_text(" ", strip=True)
        if soup.title
        else str(item.title or item.path)
    )

    text = html.unescape(soup.get_text(" ", strip=True))
    text = re.sub(r"\s+", " ", text).strip()

    return title[:500], text


def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        chunk = " ".join(words[start:start + size]).strip()

        if chunk:
            chunks.append(chunk)

        if start + size >= len(words):
            break

        start += size - overlap

    return chunks


def search_paths(searcher, term):
    """Return unique article paths matching a ZIM search term."""
    try:
        query = Query().set_query(term)
        results = searcher.search(query)
        count = min(
            MAX_RESULTS_PER_TERM,
            results.getEstimatedMatches(),
        )

        # In the installed libzim version, results are path strings.
        return {
            str(path)
            for path in results.getResults(0, count)
        }

    except Exception as exc:
        print(f"Search failed for {term!r}: {exc}")
        return set()


def create_database(conn):
    conn.execute("DROP TABLE IF EXISTS passages_fts")
    conn.execute("DROP TABLE IF EXISTS passages")

    conn.execute("""
        CREATE TABLE passages (
            id INTEGER PRIMARY KEY,
            source_zim TEXT NOT NULL,
            title TEXT NOT NULL,
            article_path TEXT NOT NULL,
            category TEXT NOT NULL,
            topic TEXT NOT NULL,
            chunk_text TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE VIRTUAL TABLE passages_fts USING fts5(
            title,
            article_path,
            category,
            topic,
            chunk_text,
            content='passages',
            content_rowid='id'
        )
    """)


def index_passage(conn, zim_name, title, path, category, topic, chunk):
    cur = conn.execute(
        """
        INSERT INTO passages
        (source_zim, title, article_path, category, topic, chunk_text)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (zim_name, title, path, category, topic, chunk),
    )

    conn.execute(
        """
        INSERT INTO passages_fts
        (rowid, title, article_path, category, topic, chunk_text)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (cur.lastrowid, title, path, category, topic, chunk),
    )


def main():
    if not ZIM_PATH.is_file():
        print(f"ZIM file not found: {ZIM_PATH}")
        return 1

    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Opening ZIM: {ZIM_PATH.name}")

    try:
        archive = Archive(str(ZIM_PATH))
        searcher = Searcher(archive)
    except Exception as exc:
        print(f"Could not open or search ZIM: {exc}")
        return 1

    print(f"Total archive entries: {archive.all_entry_count}")

    # Discover candidate articles for every topic.
    topic_paths = {}

    for topic, config in TOPIC_SEARCHES.items():
        paths = set()

        for term in config["terms"]:
            matches = search_paths(searcher, term)
            paths.update(matches)

            print(
                f"  {topic}: {term!r} -> {len(matches)} results"
            )

        topic_paths[topic] = sorted(paths)
        print(
            f"Candidates for {topic}: "
            f"{len(topic_paths[topic])}"
        )

    conn = sqlite3.connect(DB_PATH)

    try:
        conn.execute("PRAGMA journal_mode=WAL")
        create_database(conn)

        total_chunks = 0
        indexed_articles = set()

        # Cache extracted articles so overlapping topics don't
        # repeatedly read the same ZIM entries.
        article_cache = {}

        for topic, config in TOPIC_SEARCHES.items():
            print(f"\nIndexing topic: {topic}")
            indexed_for_topic = 0

            for path in topic_paths[topic]:
                if path not in article_cache:
                    try:
                        item = archive.get_entry_by_path(path).get_item()

                        if not str(item.mimetype).lower().startswith(
                            "text/html"
                        ):
                            continue

                        title, text = clean_article(item)

                        if len(text) < 100:
                            continue

                        article_cache[path] = (title, text)

                    except Exception as exc:
                        print(f"Skipping {path}: {exc}")
                        continue

                title, text = article_cache[path]
                chunks = chunk_text(text)

                for chunk in chunks:
                    index_passage(
                        conn,
                        ZIM_PATH.name,
                        title,
                        path,
                        config["category"],
                        topic,
                        chunk,
                    )

                if chunks:
                    indexed_articles.add(path)
                    indexed_for_topic += 1
                    total_chunks += len(chunks)
                    print(f"  Indexed: {title} ({len(chunks)} chunks)")

            print(
                f"Articles indexed for this topic: "
                f"{indexed_for_topic}"
            )

        conn.commit()

        print("\nIndex build complete.")
        print(f"Source archive: {ZIM_PATH.name}")
        print(f"Unique articles indexed: {len(indexed_articles)}")
        print(f"Total passages indexed: {total_chunks}")
        print(f"Database: {DB_PATH}")

        print("\nTopic coverage in the index:")
        for topic in TOPIC_SEARCHES:
            row = conn.execute(
                "SELECT COUNT(*) FROM passages WHERE topic = ?",
                (topic,),
            ).fetchone()
            print(f"  {topic}: {row[0]} passages")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
