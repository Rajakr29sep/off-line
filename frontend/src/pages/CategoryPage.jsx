import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { findCategory, slugify } from "../data/emergencyCategories.js";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const category = findCategory(categoryId);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => !category ? [] : category.topics.filter((t) => t.toLowerCase().includes(search.trim().toLowerCase())), [category, search]);
  if (!category) return <section className="empty-state">Category not found.</section>;
  return <div className="page">
    <Link to="/" className="back-link"><ArrowLeft size={16}/> All emergencies</Link>
    <section className="page-heading"><p className="eyebrow">02 / EMERGENCY CATEGORY</p><h1>{category.title}</h1><p>{category.description}</p></section>
    <label className="topic-search"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={`Search ${category.title.toLowerCase()} situations...`}/></label>
    <section className="topic-grid">{filtered.map((topic)=>{const slug=slugify(topic);return <Link key={slug} className="topic-card" to={`/category/${category.id}/topic/${slug}`}><div><span className="topic-label">EMERGENCY SITUATION</span><h3>{topic}</h3><p>Open the offline guide and ask questions about this situation.</p></div><ArrowRight size={18}/></Link>;})}</section>
    {!filtered.length && <section className="empty-state">No matching situations. Try another search.</section>}
  </div>;
}
