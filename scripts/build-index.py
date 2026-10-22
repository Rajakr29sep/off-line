from pathlib import Path
import html
import re
import sqlite3
import sys

from bs4 import BeautifulSoup
from libzim.reader import Archive
from libzim.search import Query, Searcher

ROOT = Path(__file__).resolve().parents[1]
ZIM_DIR = ROOT / "data" / "zims"
INDEX_DIR = ROOT / "data" / "index"
DB_PATH = INDEX_DIR / "emergency.sqlite3"

# Topics mapped to categories and relevant search terms across Ready.gov & Medical ZIMs
TOPIC_SEARCHES = {
    # Medical Category
    "Heart attack and chest pain": {
        "category": "medical",
        "terms": ["heart attack", "chest pain", "myocardial infarction", "cardiac arrest"],
    },
    "Stroke": {
        "category": "medical",
        "terms": ["stroke", "FAST stroke", "cerebrovascular accident"],
    },
    "Cardiopulmonary resuscitation (CPR)": {
        "category": "medical",
        "terms": ["cardiopulmonary resuscitation", "CPR", "chest compressions"],
    },
    "Severe bleeding": {
        "category": "medical",
        "terms": ["bleeding", "hemorrhage", "tourniquet", "first aid bleeding"],
    },
    "Burns and scalds": {
        "category": "medical",
        "terms": ["burn", "scald", "chemical burn", "burn first aid"],
    },
    "Fractures and dislocations": {
        "category": "medical",
        "terms": ["bone fracture", "dislocation", "splint", "broken bone"],
    },
    "Poisoning": {
        "category": "medical",
        "terms": ["poisoning", "antidote", "toxic ingestion", "carbon monoxide"],
    },
    "Hypothermia and heatstroke": {
        "category": "medical",
        "terms": ["hypothermia", "heatstroke", "heat exhaustion", "cold exposure"],
    },

    # Fire Category
    "House or apartment fire": {
        "category": "fire",
        "terms": ["home fire", "house fire", "smoke detector", "fire escape", "fire extinguisher"],
    },
    "Office or commercial building fire": {
        "category": "fire",
        "terms": ["building fire", "commercial fire", "fire evacuation", "emergency exit"],
    },
    "Electrical fire": {
        "category": "fire",
        "terms": ["electrical fire", "appliance fire", "circuit breaker fire"],
    },

    # Flood Category
    "Floods and flash flooding": {
        "category": "flood",
        "terms": ["floods", "flash flood", "flood safety", "flood evacuation", "flood water"],
    },
    "Contaminated drinking water": {
        "category": "flood",
        "terms": ["safe water", "water purification", "boil water", "disinfect water"],
    },

    # Natural Disasters Category
    "Earthquakes": {
        "category": "natural-disasters",
        "terms": ["earthquakes", "earthquake safety", "drop cover hold", "aftershock"],
    },
    "Tornadoes and severe wind": {
        "category": "natural-disasters",
        "terms": ["tornado", "tornado safety", "tornado shelter", "high winds"],
    },
    "Hurricanes and cyclones": {
        "category": "natural-disasters",
        "terms": ["hurricanes", "cyclone", "storm surge", "hurricane preparedness"],
    },
    "Severe winter storm and extreme cold": {
        "category": "natural-disasters",
        "terms": ["winter storm", "blizzard", "extreme cold", "ice storm"],
    },
    "Extreme heat and heatwaves": {
        "category": "natural-disasters",
        "terms": ["extreme heat", "heat wave", "cooling center", "dehydration"],
    },
    "Wildfires": {
        "category": "natural-disasters",
        "terms": ["wildfires", "wildfire safety", "defensible space", "smoke hazard"],
    },

    # Search & Rescue / Preparedness
    "Emergency supply kit": {
        "category": "search-rescue",
        "terms": ["emergency kit", "build a kit", "disaster supplies", "survival kit"],
    },
    "Emergency evacuation planning": {
        "category": "search-rescue",
        "terms": ["evacuation plan", "evacuation order", "shelter in place", "family emergency plan"],
    },

    # Infrastructure Failures
    "Power outages and utility failures": {
        "category": "infrastructure",
        "terms": ["power outages", "blackout", "generator safety", "food safety power outage"],
    },
}

CHUNK_SIZE = 600
CHUNK_OVERLAP = 80
MAX_RESULTS_PER_TERM = 15


def clean_article(raw_bytes, path_str):
    soup = BeautifulSoup(raw_bytes, "html.parser")
    for el in soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "aside"]):
        el.decompose()

    title = (
        soup.title.get_text(" ", strip=True)
        if soup.title
        else Path(path_str).stem.replace("_", " ")
    )
    title = re.sub(r"\s+", " ", title).strip()

    text = html.unescape(soup.get_text(" ", strip=True))
    text = re.sub(r"\s+", " ", text).strip()
    return title[:300], text


def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        chunk = " ".join(words[start : start + size]).strip()
        if chunk:
            chunks.append(chunk)
        if start + size >= len(words):
            break
        start += max(1, size - overlap)
    return chunks


def search_paths(searcher, term):
    try:
        query = Query().set_query(term)
        results = searcher.search(query)
        count = min(MAX_RESULTS_PER_TERM, results.getEstimatedMatches())
        return [str(p) for p in results.getResults(0, count)]
    except Exception as exc:
        print(f"  [Warn] Search failed for {term!r}: {exc}")
        return []


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
        INSERT INTO passages (source_zim, title, article_path, category, topic, chunk_text)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (zim_name, title, path, category, topic, chunk),
    )
    conn.execute(
        """
        INSERT INTO passages_fts (rowid, title, article_path, category, topic, chunk_text)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (cur.lastrowid, title, path, category, topic, chunk),
    )


def main():
    if not ZIM_DIR.is_dir():
        print(f"Error: ZIM directory not found: {ZIM_DIR}")
        return 1

    zim_files = sorted(ZIM_DIR.glob("*.zim"))
    if not zim_files:
        print(f"No ZIM archives found in {ZIM_DIR}.")
        return 1

    print(f"Discovered {len(zim_files)} ZIM archive(s) in {ZIM_DIR}:")
    for f in zim_files:
        print(f"  - {f.name} ({f.stat().st_size / (1024*1024):.1f} MB)")

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    create_database(conn)

    total_chunks = 0
    total_articles = 0

    try:
        for zim_path in zim_files:
            # Skip openstreetmap-wiki archive for medical/disaster passages (it's OSM wiki docs)
            if "openstreetmap" in zim_path.name.lower():
                print(f"\n[Info] Skipping {zim_path.name} from emergency FTS index (reference wiki, not procedural guidance).")
                continue

            print(f"\nIndexing from: {zim_path.name}")
            try:
                archive = Archive(str(zim_path))
                searcher = Searcher(archive)
            except Exception as exc:
                print(f"  Could not open archive {zim_path.name}: {exc}")
                continue

            article_cache = {}

            for topic, config in TOPIC_SEARCHES.items():
                category = config["category"]
                matched_paths = set()

                for term in config["terms"]:
                    matches = search_paths(searcher, term)
                    matched_paths.update(matches)

                if not matched_paths:
                    continue

                print(f"  {topic} [{category}]: found {len(matched_paths)} candidate articles")

                for path in matched_paths:
                    if path not in article_cache:
                        try:
                            entry = archive.get_entry_by_path(path)
                            item = entry.get_item()
                            mimetype = str(item.mimetype).lower()
                            if not mimetype.startswith("text/html"):
                                continue

                            raw_bytes = item.content.tobytes()
                            title, text = clean_article(raw_bytes, path)

                            if len(text) < 150:
                                continue

                            article_cache[path] = (title, text)
                        except Exception:
                            continue

                    if path not in article_cache:
                        continue

                    title, text = article_cache[path]
                    chunks = chunk_text(text)

                    # Index up to 4 chunks per article to balance variety and database size
                    for chunk in chunks[:4]:
                        index_passage(
                            conn,
                            zim_path.name,
                            title,
                            path,
                            category,
                            topic,
                            chunk,
                        )
                        total_chunks += 1

                    if chunks:
                        total_articles += 1

            conn.commit()

        print(f"\nIndex build completed successfully!")
        print(f"Database: {DB_PATH}")
        print(f"Unique articles indexed: {total_articles}")
        print(f"Total passages indexed: {total_chunks}")

        count = conn.execute("SELECT COUNT(*) FROM passages").fetchone()[0]
        print(f"Verified row count: {count}")

    except Exception as exc:
        conn.rollback()
        print(f"Error during index build: {exc}")
        return 1
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
