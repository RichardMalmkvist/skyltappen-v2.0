import { useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import { AdminLayout } from "../components/admin/AdminNavigation";

export default function ReadOnlyArticlesPage({ adminPassword, ...nav }) {
  const [catalog, setCatalog] = useState({ articles: [], categories: [] });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/catalog", { headers: { "x-admin-password": adminPassword }, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Kunde inte hämta artiklarna. Logga in igen och försök på nytt."); return response.json(); })
      .then(data => { if (active) setCatalog(data); })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adminPassword]);
  const category = article => catalog.categories?.find(item => item.id === article.categoryId)?.name || article.categoryId || "";
  const articles = (catalog.articles || []).filter(article => !article.adminArchived && `${article.articleNumber} ${article.name} ${category(article)}`.toLocaleLowerCase("sv").includes(search.toLocaleLowerCase("sv")));
  return <PageContainer><AdminLayout active="articles" {...nav}><main style={{ padding: "32px", maxWidth: 1180, margin: "auto" }}>
    <h1>Artiklar</h1><p>Se artikelsortimentet. Beställ via beställningsportalen.</p>
    {error && <p role="alert">{error}</p>}
    <label>Sök artiklar <input type="search" placeholder="Artikelnummer, namn eller grupp" value={search} onChange={event => setSearch(event.target.value)} /></label>
    {selected && <section style={{ ...card, margin: "20px 0" }} aria-label="Artikelinformation">
      <button type="button" onClick={() => setSelected(null)}>Stäng artikel</button>
      <h2>{selected.articleNumber} · {selected.name}</h2>
      {selected.image && <img src={selected.image} alt={selected.name} style={{ maxWidth: 360, width: "100%", maxHeight: 280, objectFit: "contain" }} />}
      <dl>{[["Artikelgrupp", category(selected)], ["Format", selected.format], ["Beskrivning", selected.desc || selected.description], ["Pris exkl. moms", selected.unitPrice == null ? "–" : `${Number(selected.unitPrice).toLocaleString("sv-SE")} kr`]].map(([label, value]) => <div key={label}><dt><b>{label}</b></dt><dd>{value || "–"}</dd></div>)}</dl>
    </section>}
    <p role="status">{loading ? "Hämtar artiklar …" : `${articles.length} artiklar`}</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
      {articles.map(article => <button key={article.id} type="button" style={{ ...card, cursor: "pointer", textAlign: "left", color: "inherit", font: "inherit" }} onClick={() => setSelected(article)}><small>{article.articleNumber} · {category(article)}</small><h2 style={{ fontSize: 18 }}>{article.name}</h2><span>Visa artikel →</span></button>)}
    </div>
  </main></AdminLayout></PageContainer>;
}
const card = { background: "white", border: "1px solid #e1e8e2", borderRadius: 12, padding: 20 };
