import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, ShieldAlert, MapPin } from "lucide-react";
import HomePage from "./pages/HomePage.jsx";
import "leaflet/dist/leaflet.css";
import "./map.css";

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Kiwix Emergency home">
          <ShieldAlert size={24} aria-hidden="true" />
          <span>Kiwix Emergency</span>
        </Link>

        <nav className="top-navigation" aria-label="Main navigation">
          <Link to="/">Search</Link>
          <a
            href="/kiwix/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen size={16} aria-hidden="true" />
            Offline library
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </nav>

        <span className="offline-badge">
          <span className="status-dot" aria-hidden="true" />
          OFFLINE FIRST
        </span>
      </header>

      <main className="main-content">
        <HomePage />

        {/* Offline map section */}
        <section className="map-panel" aria-labelledby="emergency-map-title">
          <div className="map-header">
            <div>
              <p className="eyebrow">EMERGENCY NAVIGATION</p>
              <h2 id="emergency-map-title">Offline Emergency Map</h2>
              <p>
                Access locally available map data for emergency navigation.
              </p>
            </div>

            <span className="map-status">
              <span className="map-status-dot" />
              Offline ready
            </span>
          </div>

          <div className="map-container">
            <div className="map-placeholder">
              <MapPin size={42} />
              <h3>Offline Map Area</h3>
              <p>
                Your local map tiles will appear here when connected to a
                configured offline map source.
              </p>
            </div>
          </div>

          <div className="map-actions">
            <button
              type="button"
              onClick={() =>
                document.querySelector(".map-container")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
            >
              <MapPin size={16} style={{ verticalAlign: "middle" }} /> View map
            </button>
          </div>
        </section>

        <section className="panel osm-wiki-card" aria-labelledby="osm-wiki-title">
          <div className="osm-wiki-icon" aria-hidden="true">
            <BookOpen size={23} />
          </div>

          <div className="osm-wiki-copy">
            <p className="eyebrow">OFFLINE MAP REFERENCE</p>
            <h2 id="osm-wiki-title">OpenStreetMap Wiki</h2>
            <p>
              Browse locally available OpenStreetMap documentation, mapping
              guides, and reference articles through your Kiwix library.
            </p>
            <small>
              Archive: openstreetmap-wiki_en_all_nopic_2026-10.zim
            </small>
          </div>

          <a
            className="button-primary osm-wiki-button"
            href="/kiwix/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen size={16} aria-hidden="true" />
            Open Wiki
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>
      </main>

      <footer className="app-footer">
        <strong>KIWIX EMERGENCY</strong>
        <span>Offline knowledge · Evidence-based retrieval</span>
        <small>
          In an immediate emergency, contact local emergency services.
          Offline information may be incomplete.
        </small>
      </footer>
    </div>
  );
}

// Start the Python service separately if needed:
// .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir rag-service --host 127.0.0.1 --port 8000 --reload