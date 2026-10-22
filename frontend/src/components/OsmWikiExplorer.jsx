import { useState } from "react";
import { BookOpen, Search, ExternalLink, LoaderCircle, X, ShieldAlert } from "lucide-react";

export default function OsmWikiExplorer() {
  const [query, setQuery] = useState("emergency");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingPath, setReadingPath] = useState(null);

  const quickTags = [
    { label: "Hospital Tag", query: "Tag:amenity=hospital" },
    { label: "Fire Station Tag", query: "Tag:amenity=fire_station" },
    { label: "Police Tag", query: "Tag:amenity=police" },
    { label: "Emergency Key", query: "Key:emergency" },
    { label: "Disaster Management", query: "Disaster_Management" },
    { label: "Emergency Routing", query: "Emergency_Routing" },
    { label: "India Health Import", query: "India_Health_Facilities_Import" },
  ];

  async function handleSearch(termToSearch) {
    const term = (termToSearch !== undefined ? termToSearch : query).trim();
    if (!term) return;

    setLoading(true);
    setError("");

    try {
      const url = `http://127.0.0.1:8000/zim/search?archive=openstreetmap-wiki_en_all_nopic_2026-10.zim&query=${encodeURIComponent(
        term
      )}&limit=6`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        throw new Error(`Search failed with status ${res.status}`);
      }
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError(
        "Could not query the OpenStreetMap Wiki archive. Ensure the Python RAG service is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel osm-explorer-panel" aria-labelledby="osm-explorer-heading">
      <div className="category-card-top">
        <span className="category-icon" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
          <BookOpen size={24} />
        </span>
        <span className="topic-count-pill">130,000+ OSM Articles</span>
      </div>

      <h3 id="osm-explorer-heading" style={{ fontSize: "1.25rem", margin: "14px 0 6px", color: "var(--text)" }}>
        OpenStreetMap Wiki Reference Explorer
      </h3>

      <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 16px" }}>
        Directly search and read documentation articles from your attached archive:
        <br />
        <code>openstreetmap-wiki_en_all_nopic_2026-10.zim</code>
      </p>

      {/* Search Input & Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}
      >
        <div style={{ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", background: "#0b0f19", border: "1px solid #374151", borderRadius: "8px", padding: "8px 12px", gap: "8px" }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tags, e.g. Tag:amenity=hospital..."
            style={{ background: "transparent", border: "none", outline: "none", color: "#f8fafc", width: "100%", fontSize: "0.875rem" }}
          />
        </div>

        <button type="submit" className="primary-button" disabled={loading || !query.trim()} style={{ padding: "8px 16px" }}>
          {loading ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />} Search Wiki
        </button>
      </form>

      {/* Quick Tag Suggestion Chips */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
        {quickTags.map((item) => (
          <button
            key={item.label}
            type="button"
            className="chip"
            onClick={() => {
              setQuery(item.query);
              handleSearch(item.query);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-panel" role="alert" style={{ margin: "12px 0" }}>
          <ShieldAlert size={18} />
          <p style={{ margin: 0, fontSize: "0.85rem" }}>{error}</p>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="osm-results-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {results.map((item) => (
            <article
              key={item.path}
              style={{
                background: "#0b0f19",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>{item.title}</strong>
                <button
                  type="button"
                  onClick={() => setReadingPath(item.path)}
                  className="action-button secondary"
                  style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                >
                  Read Article
                </button>
              </div>

              <small style={{ color: "#64748b" }}>Path: {item.path}</small>
              {item.excerpt && (
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.825rem", lineHeight: 1.5 }}>
                  {item.excerpt}...
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Article Reader Modal */}
      {readingPath && (
        <div
          className="wiki-modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
          onClick={() => setReadingPath(null)}
        >
          <div
            className="wiki-modal"
            style={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "14px",
              maxWidth: "850px",
              width: "100%",
              height: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid #1e293b",
                background: "#0b0f19",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BookOpen size={18} color="#38bdf8" />
                <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>OSM Wiki: {readingPath}</strong>
              </div>
              <button
                type="button"
                onClick={() => setReadingPath(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <iframe
              src={`http://127.0.0.1:8000/zim/article?archive=openstreetmap-wiki_en_all_nopic_2026-10.zim&path=${encodeURIComponent(
                readingPath
              )}`}
              title="OSM Wiki Article Reader"
              style={{
                width: "100%",
                flex: 1,
                border: "none",
                background: "#ffffff",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
