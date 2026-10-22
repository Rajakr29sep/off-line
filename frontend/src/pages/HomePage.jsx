
import { useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  Search,
  BookOpen,
  LoaderCircle,
  Database,
} from "lucide-react";

import { askOfflineRag } from "../services/api.js";

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
      });

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the offline knowledge backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">OFFLINE EMERGENCY KNOWLEDGE</p>

        <h1>
          When the network goes quiet,
          <br />
          <em>knowledge stays.</em>
        </h1>

        <p>
          Search your installed Urban Prepper knowledge archive
          for emergency preparedness resources without relying
          on an internet connection.
        </p>

        <div className="hero-stat-row">
          <div>
            <strong>LOCAL</strong>
            <span>Knowledge retrieval</span>
          </div>
          <div>
            <strong>ZIM</strong>
            <span>Offline archive</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Local access</span>
          </div>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">YOUR KNOWLEDGE BASE</p>
          <h2>What do you need help with?</h2>
        </div>
      </section>

      <section className="panel" style={{ padding: "28px" }}>
        <div className="category-card-top">
          <span className="category-icon">
            <Search size={25} />
          </span>
          <BookOpen size={21} />
        </div>

        <h3 style={{ fontSize: "1.35rem", marginTop: "20px" }}>
          Emergency Knowledge Assistant
        </h3>

        <p style={{ lineHeight: 1.8, color: "var(--muted)" }}>
          Ask a question about emergency preparedness, survival
          equipment, home readiness, or other topics in your
          offline archive.
        </p>

        <form
          className="question-form"
          onSubmit={handleSearch}
        >
          <label htmlFor="emergency-question">
            Your question
          </label>

          <textarea
            id="emergency-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: What should I prepare for an earthquake?"
            rows={4}
            required
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <>
                <LoaderCircle className="spin" size={18} />
                Searching archive...
              </>
            ) : (
              <>
                Search offline knowledge
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </section>

      {error && (
        <section className="error-panel" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Search failed</strong>
            <p>{error}</p>
            <p>
              Check that your FastAPI backend is running on
              http://127.0.0.1:8000.
            </p>
          </div>
        </section>
      )}

      {result && (
        <section
          className="answer-panel"
          aria-live="polite"
        >
          <div className="answer-header">
            <div>
              <p className="eyebrow">SEARCH RESULT</p>
              <h2>Answer</h2>
            </div>

            <span className="local-tag">
              <Database size={14} />
              {result.mode || "Offline retrieval"}
            </span>
          </div>

          <div className="answer-text">
            {result.answer || "The backend returned no answer."}
          </div>

          {result.fallback && (
            <p className="source-note">
              The response may be a fallback rather than an
              answer grounded in retrieved archive content.
            </p>
          )}

          {result.reason && (
            <p className="source-note">
              {result.reason}
            </p>
          )}

          {result.sources?.length > 0 && (
            <div className="source-list">
              <h3>Retrieved resources</h3>

              {result.sources.map((source, index) => (
                <article
                  className="source-item"
                  key={`${source.path || source.title || "source"}-${index}`}
                >
                  <strong>
                    {source.title || "Untitled resource"}
                  </strong>

                  {source.playlist && (
                    <p>Playlist: {source.playlist}</p>
                  )}

                  {source.path && (
                    <p>Archive path: {source.path}</p>
                  )}

                  {source.excerpt && (
                    <blockquote>{source.excerpt}</blockquote>
                  )}

                  {source.source_type && (
                    <span>{source.source_type}</span>
                  )}
                </article>
              ))}
            </div>
          )}

          {(!result.sources || result.sources.length === 0) && (
            <p className="source-note">
              No source references were returned for this query.
            </p>
          )}
        </section>
      )}

      <section className="urgent-notice">
        <AlertTriangle size={21} />

        <div>
          <strong>Immediate danger?</strong>
          <p>
            In India, call 112 if emergency assistance is needed
            and cellular service is available. Do not delay
            contacting responders while searching this knowledge base.
          </p>
        </div>

        <a href="tel:112" className="call-button">
          Call 112
        </a>
      </section>
    </div>
  );
}
