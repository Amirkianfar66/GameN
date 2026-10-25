import { useEffect, useState } from "react";
import { api, base } from "./session";
import WindowStudy from './WindowStudy';
type DesignPillar = "Deduction" | "Interaction" | "Comic & feel";
export default function DevelopmentIdeas() {
  const [designReferences, setReferences] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"All" | DesignPillar | "Needs study">("All");
  const [query, setQuery] = useState("");
  useEffect(() => { api("/api/references").then(setReferences).catch(e => setError(e.message)); }, []);
  const filtered = designReferences.filter(reference =>
    (filter === "All" || (filter === "Needs study" ? reference.status === "Needs further study" : reference.pillars.includes(filter))) &&
    JSON.stringify(reference).toLowerCase().includes(query.trim().toLowerCase())
  );
  return <div className="di-page">
    <header className="di-header"><a href={base} className="di-brand"><span className="di-brand-symbol">M</span><span>GAMEN<small>DESIGN STUDIO</small></span></a><nav aria-label="Studio navigation"><a href={base}>Roles & canvas</a><a href={base + "?view=events"}>Development Ideas</a><a href={base + "?view=winning"}>Winning Conditions</a></nav><span className="di-private">Private studio</span></header>
    <main id="di-main" className="di-main">
      <div className="di-hero"><div><span className="di-kicker">GAMEN / DESIGN REFERENCES</span><h1>Reference<br /><em>Library.</em></h1><p className="di-intro">Social deduction you can reason about.<br />Actions you can feel. A world told in comic panels.</p></div><div className="di-hero-note"><span className="di-kicker">SELECTED BY THE GAME OWNER</span><p>Ten references inform the design. Feign remains a subject for further study.</p><p>The four completed ideas and their latest rules are editable in Development Ideas. Examples below explain inspiration; they do not override those decisions.</p><a href={base + "?view=events"}>Open the four ideas →</a></div></div>
      {error && <p role="alert">{error}</p>}
      <section id="windows-study" className="di-section"><div className="di-section-heading"><div><span className="di-kicker">WINDOWS / INTERACTION STUDY</span><h2>Draw for the next room.</h2><p>Explore the agreed window access and image lifetime. The full owner decision is in Development Ideas.</p></div></div><WindowStudy /></section>
        <section id="reference-library" className="di-section di-library">
          <div className="di-section-heading"><span className="di-section-no">↗</span><div><span className="di-kicker">THE SELECTED REFERENCE LIBRARY</span><h2>What we take. How it fits.</h2><p>Each reference connects a specific feature to a concrete GameN experience.</p></div></div>
          <div className="di-library-controls"><div className="di-filters" aria-label="Filter references">{(["All", "Deduction", "Interaction", "Comic & feel", "Needs study"] as const).map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div><label className="di-search"><span>Search references</span><input type="search" placeholder="Game, feature or idea…" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
          <p className="di-result-count" aria-live="polite">Showing {filtered.length} of {designReferences.length} references</p>
          <div className="di-reference-list">{filtered.map((reference) => <article id={reference.id} key={reference.id} className="di-reference-card">
            <div className="di-reference-heading"><span className="di-reference-no">{reference.number}</span><div><h3>{reference.title}</h3><p>{reference.subtitle}</p></div><span className={`di-status ${reference.status === "Selected" ? "di-selected" : "di-study"}`}>{reference.status}</span></div>
            <div className="di-pillars">{reference.pillars.map((pillar) => <span key={pillar}>{pillar}</span>)}</div>
            {reference.features.map((feature, index) => <div className="di-feature" key={feature.title}><h4><span>{String(index + 1).padStart(2, "0")}</span>{feature.title}</h4><div className="di-feature-body"><div><span className="di-kicker">IN THE REFERENCE</span><p>{feature.inReference}</p></div><div><span className="di-kicker">IN GAMEN</span><p>{feature.inGameN}</p></div></div><div className="di-example"><span className="di-kicker">CONCRETE APPLICATION / DESIGN PROPOSAL</span><p>{feature.example}</p></div></div>)}
            <div className="di-boundary"><strong>{reference.status === "Selected" ? "Design boundary" : "Research status"}</strong><p>{reference.boundary}</p></div>
            <a className="di-source-link" href={reference.source.url} target="_blank" rel="noreferrer">{reference.source.label} ↗</a>
          </article>)}</div>
          {!filtered.length && <div className="di-no-results"><h3>No matching references.</h3><p>Try another phrase or show the full collection.</p><button onClick={() => { setQuery(""); setFilter("All"); }}>Show all references</button></div>}
        </section>


      <footer className="di-footer"><span>GAMEN / DESIGN DEVELOPMENT</span><p>Source references and design inspiration · runtime adoption is separate</p><a href={base}>Back to canvas →</a></footer>
    </main>
  </div>;
}
