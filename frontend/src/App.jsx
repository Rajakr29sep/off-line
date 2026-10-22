import { useEffect, useState } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  ShieldAlert,
  MapPin,
  Search,
  Activity,
  Layers,
  Heart,
} from "lucide-react";
import HomePage from "./pages/HomePage.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import TopicPage from "./pages/TopicPage.jsx";
import MapPage from "./pages/MapPage.jsx";
import { fetchAppHealth } from "./services/api.js";
import "leaflet/dist/leaflet.css";
import "./map.css";

export default function App() {
  const location = useLocation();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchAppHealth().then(setHealth);
    const interval = setInterval(() => {
      fetchAppHealth().then(setHealth);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const ragOnline = health?.services?.ragService?.status === "online";
  const expressOnline = health?.services?.express?.status === "online";
  const kiwixOnline = health?.services?.kiwix?.status === "online";

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Kiwix Emergency home">
          <ShieldAlert size={26} aria-hidden="true" style={{ color: "#38bdf8" }} />
          <span>Kiwix Emergency</span>
        </Link>

        <nav className="top-navigation" aria-label="Main navigation">
          <Link
            to="/"
            className={location.pathname === "/" ? "active-nav" : ""}
          >
            <Search size={15} /> Search &amp; Guidance
          </Link>

          <Link
            to="/map"
            className={location.pathname === "/map" ? "active-nav" : ""}
          >
            <MapPin size={15} /> Emergency Map
          </Link>

          <a
            href="/kiwix/"
            target="_blank"
            rel="noopener noreferrer"
            title="Browse full ZIM archive in Kiwix reader"
          >
            <BookOpen size={15} aria-hidden="true" />
            Offline Library
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </nav>

        {/* Live Service Status Bar */}
        <div className="app-health-pills" title="Real-time appliance service connectivity">
          <span
            className={`health-pill ${ragOnline ? "pill-green" : "pill-amber"}`}
            title={`RAG Service: ${ragOnline ? "Online (Port 8000)" : "Offline"}`}
          >
            <span className="dot" /> RAG: {ragOnline ? "8000" : "Off"}
          </span>

          <span
            className={`health-pill ${expressOnline ? "pill-green" : "pill-amber"}`}
            title={`Express API: ${expressOnline ? "Online (Port 3000)" : "Offline"}`}
          >
            <span className="dot" /> API: {expressOnline ? "3000" : "Off"}
          </span>

          <span
            className={`health-pill ${kiwixOnline ? "pill-green" : "pill-dim"}`}
            title={`Kiwix Reader: ${kiwixOnline ? "Online (Port 8080)" : "Standby (Port 8080)"}`}
          >
            <span className="dot" /> Kiwix: {kiwixOnline ? "8080" : "Standby"}
          </span>
        </div>
      </header>

      {/* Main Content Router */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route
            path="/category/:categoryId/topic/:topicSlug"
            element={<TopicPage />}
          />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          <strong>KIWIX EMERGENCY APPLIANCE</strong>
          <span>Local ZIM Knowledge · Grounded Offline Retrieval</span>
        </div>
        <small>
          In an immediate life-threatening emergency, call <strong>112</strong>. Offline information is
          for guidance and contingency planning when networks fail.
        </small>
      </footer>
    </div>
  );
}