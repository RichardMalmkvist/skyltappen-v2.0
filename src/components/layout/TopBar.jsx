import { useEffect, useRef, useState } from "react";

export default function TopBar({
  search,
  navigation,
  cartCount = 0,
  onCartClick,
  onLoginClick,
  onLogoClick,
}) {
  const previousCount = useRef(cartCount);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (cartCount > previousCount.current) setPulse(value => value + 1);
    previousCount.current = cartCount;
  }, [cartCount]);
  return (
    <div className="jsf-public-topbar">
      <div className="jsf-public-brand-group">
        <button type="button" className="jsf-public-logo-button" onClick={onLogoClick} aria-label="Gå till startsidan">
          <img src="/jsf-logo.jpg" alt="Jönköpings Skyltfabrik" />
        </button>
        <div className="jsf-header-region" aria-label="Beställningsportal för Region Jönköpings län">
          <span>Beställningsportal för</span>
          <img src="/logoRJL_transparent.png" alt="Region Jönköpings län" />
        </div>
      </div>
      {navigation && <nav className="jsf-storefront-navigation" aria-label="Huvudmeny">{navigation}</nav>}
      <div className="jsf-public-header-actions">
        {search}
        {onLoginClick && <button type="button" aria-label="Mitt konto" onClick={onLoginClick}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="7" r="3.5"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z"/></svg><span className="jsf-header-action-label">Mitt konto</span></button>}
        {onCartClick && <button type="button" aria-label={`Kundkorg (${cartCount})`} onClick={onCartClick}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 7h16l1 14H3L4 7Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg><span className="jsf-header-action-label">Kundkorg </span>(<span key={pulse} className={`jsf-cart-count${pulse ? " jsf-cart-count-added" : ""}`}>{cartCount}</span>)</button>}
      </div>
    </div>
  );
}
