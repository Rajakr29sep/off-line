import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LoaderCircle,
  Search,
  ShieldAlert,
  Database,
  ExternalLink,
} from "lucide-react";
import { findTopic } from "../data/emergencyCategories.js";
import { askOfflineRag } from "../services/api.js";
import VoiceControls from "../components/VoiceControls.jsx";

export default function TopicPage() {
  const { categoryId, topicSlug } = useParams();
  const found = findTopic(categoryId, topicSlug);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!found) {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> All emergencies
        </Link>
        <section className="empty-state">Emergency topic not found.</section>
      </div>
    );
  }

  const { category, topic } = found;
  const suggestions = [
    `What are the immediate first aid steps for ${topic.toLowerCase()}?`,
    `What safety precautions are documented in the archive for ${topic.toLowerCase()}?`,
    `When should emergency services (112) be called for ${topic.toLowerCase()}?`,
  ];

  async function submit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await askOfflineRag({
        question: q,
        categoryId: category.id,
        topic,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to search the offline knowledge base.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page topic-page">
      <Link to={`/category/${category.id}`} className="back-link">
        <ArrowLeft size={16} /> {category.title}
      </Link>

      <section className="page-heading">
        <p className="eyebrow">03 / SELECTED EMERGENCY SITUATION</p>
        <h1>{topic}</h1>
        <p>
          Ask questions about this situation. Guidance is retrieved from your locally indexed
          ZIM archives and includes source citations.
        </p>
      </section>

      <section className="topic-workspace">
        <div className="panel question-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">OFFLINE KNOWLEDGE SEARCH</p>
              <h2>What do you need to know?</h2>
            </div>
            <BookOpen size={21} />
          </div>

          <div className="suggested-questions">
            <p className="eyebrow">SUGGESTED QUESTIONS</p>
            {suggestions.map((s) => (
              <button type="button" key={s} onClick={() => setQuestion(s)}>
                {s} <ArrowRight size={15} />
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="question-form">
            <label htmlFor="emergency-question">Ask your own question</label>
            <textarea
              id="emergency-question"
              rows={3}
              maxLength={3000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask anything relevant to ${topic.toLowerCase()}...`}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={loading || !question.trim()}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin" size={17} /> Searching offline sources...
                </>
              ) : (
                <>
                  <Search size={17} /> Find answer
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="error-panel" role="alert">
              <ShieldAlert size={18} />
              <p>{error}</p>
            </div>
          )}

          {result && (
            <section className="answer-panel" aria-live="polite">
              <div className="answer-header">
                <div>
                  <p className="eyebrow">RETRIEVAL RESULT</p>
                  <h2>{result.title || "Offline Guidance"}</h2>
                </div>
                <span className="local-tag">
                  <Database size={13} />
                  {result.mode === "offline-emergency-template"
                    ? "Verified Protocol"
                    : result.mode === "local-llm"
                    ? "AI Generated"
                    : "Grounded Retrieval"}
                </span>
              </div>

              {/* Display answer whenever present, regardless of fallback flag */}
              {result.answer ? (
                <>
                  <p className="answer-text">{result.answer}</p>
                  <VoiceControls text={result.answer} />
                </>
              ) : (
                <div className="fallback-message">
                  <ShieldAlert size={20} />
                  <div>
                    <strong>Not enough reliable evidence was found.</strong>
                    <p>{result.reason || "Try rephrasing the question."}</p>
                    <a href="tel:112">Call 112 for immediate danger</a>
                  </div>
                </div>
              )}

              {result.disclaimer && (
                <p className="source-note" style={{ fontStyle: "italic", marginTop: "12px" }}>
                  ⚠️ {result.disclaimer}
                </p>
              )}

              <div className="source-list">
                <h3>Sources from the offline library</h3>
                {result.sources?.length ? (
                  result.sources.map((s, i) => (
                    <article className="source-item" key={s.chunk_id || s.id || i}>
                      <strong>
                        [{i + 1}] {s.title || "Untitled article"}
                      </strong>
                      <p>
                        Archive: <code>{s.source_zim || s.archive || "Local Archive"}</code>
                        {s.article_path || s.path ? ` · Path: ${s.article_path || s.path}` : ""}
                      </p>
                      {s.excerpt && <blockquote>{s.excerpt}</blockquote>}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="source-read-link"
                        >
                          Open source article in reader <ExternalLink size={12} />
                        </a>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="source-note">No specific source passages were cited for this query.</p>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="panel topic-info-panel">
          <BookOpen size={23} />
          <h2>Offline source information</h2>
          <p>
            The local retrieval service searches your installed ZIM archives through the generated SQLite index.
            No data is sent outside your device.
          </p>
          <div className="topic-metadata">
            <span>Category</span>
            <strong>{category.title}</strong>
            <span>Selected situation</span>
            <strong>{topic}</strong>
            <span>Database status</span>
            <strong>5,370+ Passages Indexed</strong>
          </div>
          <a
            href="/kiwix/"
            target="_blank"
            rel="noreferrer"
            className="button-primary secondary"
            style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <BookOpen size={15} /> Browse original Kiwix library
          </a>
        </aside>
      </section>
    </div>
  );
}
