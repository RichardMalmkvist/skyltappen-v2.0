import { useEffect, useId, useRef, useState } from "react";
import { getPublicRootCategories, getPublicCategoryById } from "../../data/categoryAdmin";

export default function ProductCategoryMenu({ onSelectCategory, activeCategoryId }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const timer = useRef(null);
  const id = useId();
  const focusFirst = useRef(false);
  useEffect(() => {
    if (open && focusFirst.current) { root.current?.querySelector(".jsf-product-menu-links button")?.focus(); focusFirst.current = false; }
  }, [open]);
  const categories = getPublicRootCategories();
  const activeId=getPublicCategoryById(activeCategoryId)?.parentId||activeCategoryId;
  const stopTimer = () => clearTimeout(timer.current);
  const close = () => { stopTimer(); setOpen(false); };
  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("pointerdown", outside); clearTimeout(timer.current); };
  }, []);
  if (!onSelectCategory) return null;
  return <div className="jsf-product-menu" ref={root}
    onPointerEnter={event => { if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) { stopTimer(); timer.current = setTimeout(() => setOpen(true), 180); } }}
    onPointerLeave={event => { if (event.pointerType === "mouse") { stopTimer(); timer.current = setTimeout(() => setOpen(false), 180); } }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
    onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); close(); trigger.current?.focus(); }
      if (event.key === "ArrowDown" && event.target === trigger.current) {
        event.preventDefault(); stopTimer(); focusFirst.current = true; setOpen(true);
        if (open) { root.current?.querySelector(".jsf-product-menu-links button")?.focus(); focusFirst.current = false; }
      }
    }}>
    <button ref={trigger} type="button" className="jsf-product-menu-trigger" aria-expanded={open} aria-controls={id}
      onClick={() => { stopTimer(); setOpen(value => !value); }}>
      Produkter <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{transform:open?"rotate(180deg)":undefined}}><path d="m3 6 5 5 5-5"/></svg>
    </button>
    {open && <div id={id} className="jsf-product-menu-panel">
      <div className="jsf-product-menu-heading"><span>Vårt sortiment</span><span>{categories.length} kategorier</span></div>
      <nav aria-label="Produktkategorier" className="jsf-product-menu-links">
        {categories.map(category => <button key={category.id} type="button" aria-current={category.id === activeId ? "page" : undefined}
          onClick={() => { close(); onSelectCategory(category); }}><span>{category.title}</span><span aria-hidden="true">↗</span></button>)}
      </nav>
      {!categories.length && <p>Inga produktkategorier är öppna just nu.</p>}
      <p className="jsf-product-menu-footer">Hitta rätt skylt för din verksamhet.</p>
    </div>}
  </div>;
}
