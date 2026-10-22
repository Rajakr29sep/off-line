
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

from libzim.reader import Archive
from libzim.search import Query, Searcher


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parents[2]
ZIM_DIR = ROOT / "data" / "zims"


# --------------------------------------------------
# Search configuration
# --------------------------------------------------

STOPWORDS = {
    "what", "how", "do", "does", "to", "during", "the",
    "a", "an", "is", "are", "i", "my", "we", "you",
    "for", "of", "in", "on", "should", "can", "could",
    "please", "tell", "me", "about", "and", "or", "this",
    "that", "with", "from", "it", "be", "when", "where",
    "why", "who", "which", "your", "their", "need",
    "want", "give", "show", "help", "information",
}

# Normalize common forms so "preparedness", "preparing",
# and "prepare" can contribute to similar relevance scores.
WORD_ALIASES = {
    "floods": "flood",
    "flooding": "flood",
    "flooded": "flood",
    "earthquakes": "earthquake",
    "storms": "storm",
    "hurricanes": "hurricane",
    "fires": "fire",
    "burns": "burn",
    "preparedness": "prepare",
    "preparation": "prepare",
    "preparations": "prepare",
    "preparing": "prepare",
    "prepared": "prepare",
    "protecting": "protect",
    "protection": "protect",
    "supplies": "supply",
    "emergencies": "emergency",
}

# These terms often indicate a supporting resource rather
# than the primary disaster guidance page.
SUPPORTING_TITLE_TERMS = {
    "toolkit",
    "social",
    "media",
    "poster",
    "posters",
    "graphics",
    "campaign",
    "newsletter",
}


# --------------------------------------------------
# Discover ZIM archives
# --------------------------------------------------

def get_zim_files() -> list[Path]:
    """Discover all ZIM archives in data/zims."""
    if not ZIM_DIR.exists():
        return []

    return sorted(
        path
        for path in ZIM_DIR.glob("*.zim")
        if path.is_file()
    )


# --------------------------------------------------
# Text normalization
# --------------------------------------------------

def normalize_title(title: str) -> str:
    """Normalize titles to identify duplicate translated pages."""
    title = re.sub(
        r"\s*\|\s*Ready\.gov\s*$",
        "",
        title,
        flags=re.IGNORECASE,
    )
    title = re.sub(r"\s+", " ", title).strip()
    return title.casefold()


def normalize_words(text: str) -> list[str]:
    """Tokenize text and normalize common word variants."""
    words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    normalized = []

    for word in words:
        word = WORD_ALIASES.get(word, word)

        if (
            len(word) > 4
            and word.endswith("s")
            and not word.endswith("ss")
        ):
            word = word[:-1]

        normalized.append(word)

    return normalized


def query_terms(question: str) -> list[str]:
    """Build useful search terms from a natural-language question."""
    words = normalize_words(question)

    terms = [question.strip()]

    terms.extend(
        word
        for word in words
        if len(word) > 2 and word not in STOPWORDS
    )

    # Search useful topic synonyms when the question expresses
    # a common disaster-preparedness intent.
    normalized = set(words)

    if "flood" in normalized:
        terms.extend([
            "floods",
            "flood safety",
            "flood preparedness",
            "flood emergency kit",
        ])

    if "earthquake" in normalized:
        terms.extend([
            "earthquake safety",
            "earthquake preparedness",
        ])

    if "fire" in normalized:
        terms.extend([
            "fire safety",
            "fire emergency preparedness",
        ])

    if "prepare" in normalized:
        terms.extend([
            "emergency supplies",
            "emergency kit",
            "disaster preparedness",
        ])

    return list(dict.fromkeys(terms))


# --------------------------------------------------
# HTML extraction
# --------------------------------------------------

class VisibleTextExtractor(HTMLParser):
    """Extract text while excluding navigation and page chrome."""

    IGNORED_TAGS = {
        "script",
        "style",
        "noscript",
        "svg",
        "nav",
        "header",
        "footer",
        "aside",
        "form",
        "button",
        "select",
        "option",
    }

    IGNORED_CLASSES = {
        "usa-banner",
        "usa-header",
        "usa-footer",
        "usa-nav",
        "usa-overlay",
        "breadcrumb",
        "breadcrumbs",
        "menu",
        "navigation",
        "site-header",
        "site-footer",
        "skip-link",
    }

    VOID_TAGS = {
        "area", "base", "br", "col", "embed", "hr", "img",
        "input", "link", "meta", "param", "source", "track", "wbr",
    }

    BLOCK_TAGS = {
        "p", "div", "section", "article", "li",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "main", "blockquote", "tr",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.parts = []

    def _is_ignored(self) -> bool:
        return any(item["ignored"] for item in self.stack)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").lower().split())
        element_id = (attrs.get("id") or "").lower()

        ignored = (
            tag in self.IGNORED_TAGS
            or bool(classes & self.IGNORED_CLASSES)
            or element_id in self.IGNORED_CLASSES
            or "navigation" in element_id
            or "breadcrumb" in element_id
        )

        inherited_ignored = self._is_ignored()

        if tag in self.BLOCK_TAGS and not inherited_ignored:
            self.parts.append(" ")

        if tag not in self.VOID_TAGS:
            self.stack.append({
                "tag": tag,
                "ignored": ignored,
            })

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                del self.stack[index:]
                break

        if tag in self.BLOCK_TAGS and not self._is_ignored():
            self.parts.append(" ")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

        if tag not in self.VOID_TAGS:
            self.handle_endtag(tag)

    def handle_data(self, data):
        if not self._is_ignored():
            self.parts.append(data)


def extract_title(raw: str, fallback: str) -> str:
    """Extract the HTML title."""
    match = re.search(
        r"<title\b[^>]*>(.*?)</title>",
        raw,
        flags=re.IGNORECASE | re.DOTALL,
    )

    if not match:
        return fallback

    return unescape(
        re.sub(r"\s+", " ", match.group(1))
    ).strip()


def extract_visible_text(raw: str) -> str:
    """Extract visible text, ignoring common navigation elements."""
    parser = VisibleTextExtractor()

    try:
        parser.feed(raw)
        parser.close()
        text = " ".join(parser.parts)
    except Exception:
        text = re.sub(r"<[^>]+>", " ", raw)

    text = unescape(text)

    # Remove common government-site boilerplate that may appear
    # outside semantic header and navigation elements.
    boilerplate = [
        r"Skip to main content",
        r"An official website of the United States government",
        r"Official websites use \.gov",
        r"A \.gov website belongs to an official government organization"
        r"(?: in the United States)?\.?",
        r"Secure \.gov websites use HTTPS",
        r"A lock\s*\(\s*\)",
        r"you've safely connected to an official website",
    ]

    for pattern in boilerplate:
        text = re.sub(
            pattern,
            " ",
            text,
            flags=re.IGNORECASE,
        )

    return re.sub(r"\s+", " ", text).strip()


def is_redirect_page(raw: str) -> bool:
    """Detect redirect pages and SPA viewer entries."""
    meta_refresh = re.search(
        r"""<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b""",
        raw,
        flags=re.IGNORECASE,
    )

    return bool(
        meta_refresh
        or "#/watch/" in raw
    )


# --------------------------------------------------
# Relevance scoring
# --------------------------------------------------

def relevance_score(question: str, item: dict) -> int:
    """Score results, prioritizing relevant titles over incidental mentions."""
    query_words = {
        word
        for word in normalize_words(question)
        if len(word) > 2 and word not in STOPWORDS
    }

    if not query_words:
        return 0

    title_words = set(
        normalize_words(item.get("title", ""))
    )

    content_words = normalize_words(
        item.get("content", "")
    )
    content_counts = {
        word: content_words.count(word)
        for word in query_words
    }

    # A title match is stronger than a mention in the body.
    score = len(query_words & title_words) * 15

    # Cap body contributions to reduce the impact of repeated words.
    score += sum(
        min(count, 4)
        for count in content_counts.values()
    )

    title = normalize_title(item.get("title", ""))
    title_tokens = set(normalize_words(title))

    # Prefer a page about the disaster itself over promotional
    # or supporting materials when both are relevant.
    if title_tokens & SUPPORTING_TITLE_TERMS:
        score -= 12

    # A dedicated disaster title should rank strongly.
    for disaster in (
        "flood",
        "earthquake",
        "hurricane",
        "tornado",
        "wildfire",
        "fire",
        "drought",
    ):
        if disaster in query_words and disaster in title_tokens:
            score += 10
            break

    return score


def is_english_preferred_path(path: str) -> bool:
    """
    Prefer English-looking pages when duplicate titles exist.
    This is a heuristic, not a guarantee of page language.
    """
    normalized = "/" + path.replace("\\", "/").lower().lstrip("/")

    non_english_prefixes = (
        "/es/",
        "/ar/",
        "/fr/",
        "/ru/",
        "/zh/",
        "/de/",
        "/pt/",
        "/ja/",
        "/ko/",
        "/it/",
        "/hi/",
    )

    return not any(
        prefix in normalized
        for prefix in non_english_prefixes
    )


# --------------------------------------------------
# Search one archive
# --------------------------------------------------

def _search_one_archive(
    zim_path: Path,
    question: str,
    limit: int,
) -> list[dict]:
    """Search one ZIM archive and rank candidate entries."""
    try:
        archive = Archive(str(zim_path))
        searcher = Searcher(archive)
    except Exception as exc:
        print(f"[ZIM] Could not open {zim_path.name}: {exc}")
        return []

    results_by_path = {}

    for term in query_terms(question):
        try:
            query_results = searcher.search(
                Query().set_query(term)
            )
            paths = list(
                query_results.getResults(
                    0,
                    max(limit * 10, 50),
                )
            )
        except Exception as exc:
            print(
                f"[ZIM] Search failed for {zim_path.name}, "
                f"term={term!r}: {exc}"
            )
            continue

        for path in paths:
            if path in results_by_path:
                continue

            try:
                entry = archive.get_entry_by_path(path)
                item = entry.get_item()
                raw_bytes = item.content.tobytes()
                raw = raw_bytes.decode(
                    "utf-8",
                    errors="replace",
                )
            except Exception:
                continue

            redirect = is_redirect_page(raw)
            title = extract_title(raw, path)

            # Video redirects do not contain readable article evidence.
            content = (
                ""
                if redirect
                else extract_visible_text(raw)
            )

            result = {
                "title": title,
                "path": path,
                "archive": zim_path.name,
                "type": (
                    "video_redirect"
                    if redirect
                    else "zim_entry"
                ),
                "contentBytes": len(raw_bytes),
                "content": content,
                "hasReadableArticleText": (
                    not redirect and len(content) >= 200
                ),
            }

            result["_relevance"] = relevance_score(
                question,
                result,
            )

            result["_english_preference"] = (
                1 if is_english_preferred_path(path) else 0
            )

            results_by_path[path] = result

    # Rank before deduplication so an English page is preferred
    # when equivalent pages exist in several languages.
    candidates = sorted(
        results_by_path.values(),
        key=lambda item: (
            item["_relevance"],
            item["_english_preference"],
        ),
        reverse=True,
    )

    results = []
    seen_titles = set()

    for item in candidates:
        if item["_relevance"] <= 0:
            continue

        title_key = normalize_title(item["title"])

        # Avoid returning the same titled resource repeatedly
        # in different languages within the same archive.
        if title_key in seen_titles:
            continue

        seen_titles.add(title_key)
        item.pop("_english_preference", None)
        results.append(item)

        if len(results) >= limit:
            break

    return results


# --------------------------------------------------
# Search all archives
# --------------------------------------------------

def search_zim(
    question: str,
    limit: int = 5,
) -> list[dict]:
    """Search every ZIM archive and return globally ranked results."""
    if not question or not question.strip() or limit < 1:
        return []

    zim_files = get_zim_files()

    if not zim_files:
        print(f"[ZIM] No .zim files found in {ZIM_DIR}")
        return []

    combined = []

    for zim_path in zim_files:
        results = _search_one_archive(
            zim_path=zim_path,
            question=question,
            limit=max(limit * 3, 15),
        )
        combined.extend(results)

    combined.sort(
        key=lambda item: item["_relevance"],
        reverse=True,
    )

    final_results = []
    seen_entries = set()
    seen_titles = set()

    for item in combined:
        if item["_relevance"] <= 0:
            continue

        identity = (item["archive"], item["path"])
        title_key = normalize_title(item["title"])

        if identity in seen_entries:
            continue

        # Suppress identical titles across archives as well.
        # The first item is the highest-ranked candidate.
        if title_key in seen_titles:
            continue

        seen_entries.add(identity)
        seen_titles.add(title_key)

        item.pop("_relevance", None)
        final_results.append(item)

        if len(final_results) >= limit:
            break

    return final_results


# --------------------------------------------------
# Readable article context
# --------------------------------------------------

def search_zim_context(
    question: str,
    limit: int = 5,
) -> list[dict]:
    """Return readable article text only, not redirect pages."""
    if not question or not question.strip() or limit < 1:
        return []

    candidates = search_zim(
        question,
        limit=max(limit * 5, 20),
    )

    context = []

    for item in candidates:
        if not item.get("hasReadableArticleText"):
            continue

        content = (item.get("content") or "").strip()

        if not content:
            continue

        context.append({
            "title": item.get("title", "Untitled ZIM entry"),
            "path": item.get("path", ""),
            "archive": item.get("archive", ""),
            "content": content,
            "source_type": "zim_article",
            "hasReadableArticleText": True,
        })

        if len(context) >= limit:
            break

    return context
