import { useId, useRef, useState, useEffect } from "react";
import { getPublicCategories } from "../../data/categoryAdmin";
import { getStorefrontProducts } from "../../data/products";
import "../../styles/searchFocus.css";

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function searchPublicProducts(query) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const categories = getPublicCategories().filter(category => category.isImplemented);
  const allowed = new Map(categories.map(category => [category.id, category.title]));
  return getStorefrontProducts().filter(product => {
    if (!product.isImplemented || product.storefrontOrderable===false || product.adminArchived || !allowed.has(product.categoryId)) return false;
    const text = normalize([product.articleNumber, product.name, product.desc, product.format, allowed.get(product.categoryId)].join(" "));
    return words.every(word => text.includes(word));
  });
}

export default function PublicProductSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const resultsId = useId();
  const matches = searchPublicProducts(query);
  const showing = open && Boolean(query.trim());
  useEffect(() => {
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <div className="jsf-product-search" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => { if (event.key === "Escape") { root.current.querySelector("input")?.focus(); setOpen(false); event.stopPropagation(); } }}>
    <label htmlFor={`${resultsId}-input`}>Sök i sortimentet</label>
    <svg className="jsf-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
    <input id={`${resultsId}-input`} type="search" placeholder="Sök artikelnummer eller namn" value={query}
      aria-controls={showing ? resultsId : undefined}
      onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" && showing) { event.preventDefault(); root.current.querySelector('.jsf-search-results button')?.focus(); }
      }}/>
    {showing && <div className="jsf-search-results" id={resultsId}>
      <p role="status">{matches.length ? `${matches.length} träff${matches.length === 1 ? "" : "ar"}` : "Inga produkter matchar din sökning."}</p>
      <ul>{matches.map(product => <li key={product.id}><button type="button" onClick={() => {
        setOpen(false); setQuery(""); onSelect(product);
      }}>
        {(product.cardImage || product.image) && <img src={product.cardImage || product.image} alt="" loading="lazy"/>}
        <span><small>{product.articleNumber ? `Art.nr ${product.articleNumber}` : "Produkt"}</small><span>{product.name}</span>{product.format && <small>{product.format}</small>}</span>
        <span aria-hidden="true">→</span>
      </button></li>)}</ul>
    </div>}
  </div>;
}
