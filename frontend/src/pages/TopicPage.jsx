import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle, Search, ShieldAlert } from "lucide-react";
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
  if (!found) return <section className="empty-state">Emergency topic not found.</section>;
  const { category, topic } = found;
  const suggestions = [
    `What does the offline library say about ${topic.toLowerCase()}?`,
    `What safety precautions are documented for ${topic.toLowerCase()}?`,
    `What should I know when seeking professional help for ${topic.toLowerCase()}?`
  ];
  async function submit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true); setError(""); setResult(null);
    try { setResult(await askOfflineRag({ question: q, categoryId: category.id, topic })); }
    catch (err) { setError(err.message || "Unable to search the offline knowledge base."); }
    finally { setLoading(false); }
  }
  return <div className="page topic-page">
    <Link to={`/category/${category.id}`} className="back-link"><ArrowLeft size={16}/> {category.title}</Link>
    <section className="page-heading"><p className="eyebrow">03 / SELECTED EMERGENCY</p><h1>{topic}</h1><p>Ask about this situation. Answers should be grounded in locally indexed ZIM content and include source references.</p></section>
    <section className="topic-workspace">
      <div className="panel question-panel">
        <div className="panel-heading"><div><p className="eyebrow">OFFLINE KNOWLEDGE SEARCH</p><h2>What do you need to know?</h2></div><BookOpen size={21}/></div>
        <div className="suggested-questions"><p className="eyebrow">SUGGESTED QUESTIONS</p>{suggestions.map((s)=><button type="button" key={s} onClick={()=>setQuestion(s)}>{s}<ArrowRight size={15}/></button>)}</div>
        <form onSubmit={submit} className="question-form"><label htmlFor="emergency-question">Ask your own question</label><textarea id="emergency-question" rows={4} maxLength={3000} value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder={`Ask anything relevant to ${topic.toLowerCase()}...`}/><button type="submit" className="primary-button" disabled={loading||!question.trim()}>{loading?<LoaderCircle className="spin" size={17}/>:<Search size={17}/>} {loading?"Searching offline sources...":"Find answer"}</button></form>
        {error && <div className="error-panel" role="alert"><ShieldAlert size={18}/><p>{error}</p></div>}
        {result && <section className="answer-panel" aria-live="polite">
          <div className="answer-header"><div><p className="eyebrow">RETRIEVAL RESULT</p><h2>{result.fallback?"Evidence not sufficient":"Retrieved answer"}</h2></div><span className="local-tag">LOCAL</span></div>
          {result.fallback ? <div className="fallback-message"><ShieldAlert size={20}/><div><strong>Not enough reliable evidence was found.</strong><p>{result.reason || "Try rephrasing the question or consult a trained responder."}</p><a href="tel:112">Call 112 for immediate danger</a></div></div> : <><p className="answer-text">{result.answer}</p><VoiceControls text={result.answer}/></>}
          <div className="source-list"><h3>Sources from the offline library</h3>{result.sources?.length ? result.sources.map((s,i)=><article className="source-item" key={s.chunk_id||s.id||i}><strong>[{i+1}] {s.title||"Untitled article"}</strong><p>{s.heading_path||s.article_path||"Article reference"} {s.source_zim ? `· ${s.source_zim}` : ""}</p>{s.excerpt&&<blockquote>{s.excerpt}</blockquote>}{s.url&&<a href={s.url} target="_blank" rel="noreferrer">Open source article</a>}</article>) : <p>No source passages were returned.</p>}</div>
        </section>}
      </div>
      <aside className="panel topic-info-panel"><BookOpen size={23}/><h2>Offline source information</h2><p>The local retrieval service searches your installed ZIM archives through a generated index. No archive is sent to an external service.</p><div className="topic-metadata"><span>Category</span><strong>{category.title}</strong><span>Selected situation</span><strong>{topic}</strong><span>Source mode</span><strong>Offline retrieval</strong></div><a href="/kiwix/" target="_blank" rel="noreferrer">Browse original Kiwix library</a></aside>
    </section>
  </div>;
}
