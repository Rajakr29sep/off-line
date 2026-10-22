
from pathlib import Path
from libzim.reader import Archive
from bs4 import BeautifulSoup

zim_dir = Path("data/zims")
zim_files = list(zim_dir.glob("*.zim"))

if not zim_files:
    print("ERROR: No ZIM file found.")
    raise SystemExit(1)

zim_path = zim_files[0]
archive = Archive(str(zim_path))

print("ZIM:", zim_path.name)
print("Articles:", archive.article_count)
print("Entries:", archive.entry_count)
print("Full-text index:", archive.has_fulltext_index)

paths_to_check = [
    "index.html",
    "index/fire_extinguishers_types_mounting_demo_vehicle_preps-wT9N",
]

for path in paths_to_check:
    print(f"\n--- {path} ---")

    try:
        item = archive.get_entry_by_path(path).get_item()
        raw = item.content.tobytes()

        print("MIME:", item.mimetype)
        print("Bytes:", len(raw))

        soup = BeautifulSoup(raw, "html.parser")
        print("Title:", soup.title.get_text(strip=True) if soup.title else "(no title)")
        print("Text:", soup.get_text(" ", strip=True)[:700])

        for tag in soup.find_all(["script", "video", "audio", "source", "iframe"]):
            src = tag.get("src") or tag.get("href")
            if src:
                print("Resource:", tag.name, src[:250])

    except Exception as exc:
        print("Could not read:", exc)

print("\n--- Search for fire extinguisher ---")

try:
    from libzim.search import Query, Searcher

    searcher = Searcher(archive)
    results = searcher.search(
        Query().set_query("fire extinguisher")
    )
    paths = list(results.getResults(0, 10))

    for path in paths:
        print("Result:", path)

except Exception as exc:
    print("Search failed:", exc)
