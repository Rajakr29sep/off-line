import json
from pathlib import Path
from fastapi import HTTPException

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = PROJECT_ROOT / "data" / "index" / "urban_prepper_catalog.json"


def load_catalog():
    if not CATALOG_PATH.exists():
        raise HTTPException(status_code=503, detail="ZIM catalog not found")

    try:
        return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Could not read catalog") from exc


def get_playlists():
    return load_catalog().get("playlists", [])


def get_playlist(slug: str):
    for playlist in get_playlists():
        if playlist.get("slug") == slug:
            return playlist
    raise HTTPException(status_code=404, detail="Playlist not found")


def search_catalog(query: str):
    query = query.strip().casefold()
    if not query:
        return []

    matches = []

    for playlist in get_playlists():
        if query in (
            str(playlist.get("title", "")) + " " +
            str(playlist.get("description", ""))
        ).casefold():
            matches.append({
                "type": "playlist",
                "title": playlist.get("title"),
                "slug": playlist.get("slug"),
                "description": playlist.get("description", ""),
            })

        for video in playlist.get("videos", []):
            text = (
                str(video.get("title", "")) + " " +
                str(video.get("slug", ""))
            ).casefold()

            if query in text:
                matches.append({
                    "type": "video",
                    **video,
                    "playlistTitle": playlist.get("title"),
                    "playlistSlug": playlist.get("slug"),
                })

    return matches
