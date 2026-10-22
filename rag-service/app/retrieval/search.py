
import re
import sqlite3

from app.config import DB_PATH


def search_passages(
    question: str,
    category_id: str,
    topic: str,
    limit: int = 6,
):
    if not DB_PATH.exists():
        return []

    # Search the user's actual question first.
    tokens = re.findall(r"[A-Za-z0-9]{2,}", question.lower())
    tokens = list(dict.fromkeys(tokens))[:20]

    if not tokens:
        return []

    match_query = " OR ".join(f'"{token}"' for token in tokens)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        # First, search within the selected category and topic.
        rows = conn.execute(
            """
            SELECT p.id, p.source_zim, p.title, p.article_path,
                   p.category, p.topic, p.chunk_text,
                   bm25(passages_fts) AS rank
            FROM passages_fts
            JOIN passages p ON p.id = passages_fts.rowid
            WHERE passages_fts MATCH ?
              AND p.category = ?
              AND p.topic = ?
            ORDER BY rank
            LIMIT ?
            """,
            (match_query, category_id, topic, limit),
        ).fetchall()

        # If nothing matches, try the selected category.
        # Never silently return unrelated categories.
        if not rows:
            rows = conn.execute(
                """
                SELECT p.id, p.source_zim, p.title, p.article_path,
                       p.category, p.topic, p.chunk_text,
                       bm25(passages_fts) AS rank
                FROM passages_fts
                JOIN passages p ON p.id = passages_fts.rowid
                WHERE passages_fts MATCH ?
                  AND p.category = ?
                ORDER BY rank
                LIMIT ?
                """,
                (match_query, category_id, limit),
            ).fetchall()

    except sqlite3.OperationalError:
        return []

    finally:
        conn.close()

    return [
        {
            "id": row["id"],
            "chunk_id": row["id"],
            "source_zim": row["source_zim"],
            "title": row["title"],
            "article_path": row["article_path"],
            "category": row["category"],
            "topic": row["topic"],
            "excerpt": row["chunk_text"][:1200],
            "relevance": max(
                0.0,
                min(
                    1.0,
                    1.0 / (1.0 + abs(float(row["rank"] or 0.0))),
                ),
            ),
        }
        for row in rows
    ]
