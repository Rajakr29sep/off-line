import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  Search,
  BookOpen,
  LoaderCircle,
  Database,
  MapPin,
  HeartPulse,
  Flame,
  Waves,
  CloudLightning,
  Car,
  ShieldAlert,
  Radio,
  Zap,
  LifeBuoy,
  Users,
} from "lucide-react";

import { askOfflineRag } from "../services/api.js";
import { emergencyCategories } from "../data/emergencyCategories.js";
import VoiceControls from "../components/VoiceControls.jsx";

const iconMap = {
  "heart-pulse": HeartPulse,
  flame: Flame,
  waves: Waves,
  "cloud-lightning": CloudLightning,
  "car-front": Car,
  "shield-alert": ShieldAlert,
  radiation: Radio,
  zap: Zap,
  "life-buoy": LifeBuoy,
  users: Users,
};

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await askOfflineRag({
        question: trimmedQuestion,
        categoryId: "emergency-knowledge",
        topic: trimmedQuestion,
      });
      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the offline knowledge backend. Ensure backend or RAG service is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page home-page">
      {/* Hero Section */}
      <section className="hero">
        <p className="eyebrow">OFFLINE EMERGENCY KNOWLEDGE &amp; NAVIGATION</p>
        <h1>
          When the network goes quiet,
          <br />
          <em>knowledge stays.</em>
        </h1>
        <p>
          Search your installed Ready.gov and Medical ZIM archives for emergency guidance,
          first-aid protocols, and disaster preparedness without an active internet connection.
        </p>

        <div className="hero-stat-row">
          <div>
            <strong>5,300+</strong>
            <span>Indexed passages</span>
          </div>
          <div>
            <strong>3 ZIMs</strong>
            <span>Offline archives</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>Local &amp; Offline</span>
          </div>
        </div>
      </section>

      {/* Emergency Assistant Panel */}
      <section className="panel" style={{ padding: "28px" }} aria-labelledby="assistant-heading">
        <div className="category-card-top">
          <span className="category-icon" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
            <Search size={25} />
          </span>
          <BookOpen size={21} />
        </div>

        <h2 id="assistant-heading" style={{ fontSize: "1.45rem", marginTop: "18px", color: "var(--text)" }}>
          Emergency Knowledge Assistant
        </h2>

        <p style={{ lineHeight: 1.8, color: "var(--muted)" }}>
          Ask a question about immediate first aid, disaster response, evacuation kits, or home safety.
          All answers are grounded in locally installed ZIM archives.
        </p>

        <form className="question-form" onSubmit={handleSearch}>
          <label htmlFor="emergency-question">Your emergency question</label>
          <textarea
            id="emergency-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: How do I treat a severe burn? What should be in an earthquake kit?"
            rows={3}
            required
          />

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="submit"
              className="primary-button"
              disabled={loading || !question.trim()}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin" size={18} />
                  Searching local archives...
                </>
              ) : (
                <>
                  Search offline knowledge
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {question && (
              <button
                type="button"
                className="clear-button"
                onClick={() => {
                  setQuestion("");
                  setResult(null);
                  setError("");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Error Panel */}
      {error && (
        <section className="error-panel" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Search failed</strong>
            <p>{error}</p>
            <small>
              Ensure the Python RAG service is running on <code>http://127.0.0.1:8000</code> or Express
              on <code>http://127.0.0.1:3000</code>.
            </small>
          </div>
        </section>
      )}

      {/* Result Panel */}
      {result && (
        <section className="answer-panel" aria-live="polite">
          <div className="answer-header">
            <div>
              <p className="eyebrow">RETRIEVED OFFLINE EVIDENCE</p>
              <h2>{result.title || "Emergency Guidance"}</h2>
            </div>

            <span className="local-tag">
              <Database size={14} />
              {result.mode === "offline-emergency-template"
                ? "Verified Template"
                : result.mode === "local-llm"
                ? "Local AI Generated"
                : "Grounded Excerpt"}
            </span>
          </div>

          <div className="answer-text">
            {result.answer || "No response text was returned."}
          </div>

          {result.answer && <VoiceControls text={result.answer} />}

          {result.disclaimer && (
            <p className="source-note" style={{ fontStyle: "italic", marginTop: "12px" }}>
              ⚠️ {result.disclaimer}
            </p>
          )}

          {result.sources?.length > 0 && (
            <div className="source-list" style={{ marginTop: "24px" }}>
              <h3>Sources from your offline archives</h3>

              {result.sources.map((source, index) => (
                <article
                  className="source-item"
                  key={`${source.article_path || source.path || "source"}-${index}`}
                >
                  <strong>[{index + 1}] {source.title || "Untitled resource"}</strong>
                  <p>
                    Archive: <code>{source.source_zim || source.archive || "Local Archive"}</code>
                    {source.article_path || source.path ? ` · Path: ${source.article_path || source.path}` : ""}
                  </p>

                  {source.excerpt && <blockquote>{source.excerpt}</blockquote>}

                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-read-link"
                    >
                      Read full article in offline reader →
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Quick Navigation Card for Offline Map */}
      <section className="panel map-shortcut-card">
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div className="shortcut-icon" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "14px", borderRadius: "12px" }}>
            <MapPin size={28} />
          </div>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <p className="eyebrow">OFFLINE NAVIGATION</p>
            <h3 style={{ margin: "4px 0", fontSize: "1.25rem", color: "var(--text)" }}>Emergency Map &amp; Coordinate Locator</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
              Pin your location, view GPS coordinates, calculate geodesic distance to emergency facilities, and review offline tile setup.
            </p>
          </div>
          <Link to="/map" className="button-primary" style={{ padding: "12px 20px" }}>
            Open Emergency Map <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Emergency Categories Section */}
      <section className="section-heading" id="categories">
        <div>
          <p className="eyebrow">CATEGORIZED PROCEDURES</p>
          <h2>Browse Emergency Categories</h2>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
            Select an emergency category to drill down into specific situations and step-by-step guidance.
          </p>
        </div>
      </section>

      <section className="category-grid" aria-label="Emergency categories">
        {emergencyCategories.map((cat) => {
          const Icon = iconMap[cat.icon] || ShieldAlert;
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              className="category-card"
              style={{ borderTop: `3px solid ${cat.color}` }}
            >
              <div className="category-card-top">
                <span
                  className="category-icon"
                  style={{
                    background: `${cat.color}20`,
                    color: cat.color,
                  }}
                >
                  <Icon size={24} />
                </span>
                <span className="topic-count-pill">{cat.topics.length} situations</span>
              </div>

              <h3>{cat.title}</h3>
              <p>{cat.description}</p>

              <div className="category-card-footer">
                <span>View situations</span>
                <ArrowRight size={16} />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Immediate Danger Notice */}
      <section className="urgent-notice">
        <AlertTriangle size={22} />
        <div>
          <strong>Immediate danger?</strong>
          <p>
            In India, call <strong>112</strong> if cellular or satellite service is active. Do not delay
            contacting first responders while searching this offline knowledge appliance.
          </p>
        </div>
        <a href="tel:112" className="call-button">
          Call 112
        </a>
      </section>
    </div>
  );
}
