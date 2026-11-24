import { useEffect, useRef } from "react";
import ProductArcCarousel from "../components/products/ProductArcCarousel";
import "../styles/landingCalm.css";
import AppHeader from "../components/layout/AppHeader";
import PageContainer from "../components/layout/PageContainer";
import { getPublicCategories } from "../data/categoryAdmin";
import { getStorefrontProducts } from "../data/products";
import { getCatalogSnapshot } from "../data/catalogStore";
import { getHomepageImage, getHomepageDetailContent } from "../data/homepageImages";

function ProofPlan() {
  return <svg viewBox="0 0 600 390" role="img" aria-label="Exempel på ritning med fyra skyltplaceringar">
    <g fill="none" stroke="#a5a5a3" strokeWidth="4">
      <path d="M35 30H565V360H35Z M35 185H205 M285 185H430 M510 185H565 M305 30V100 M305 160V185 M180 185V270 M180 330V360 M430 185V270 M430 330V360"/>
      <path d="M205 185V125Q265 125 265 185 M305 100H365Q365 160 305 160 M430 185V125Q490 125 490 185 M180 270H120Q120 330 180 330" strokeWidth="1.3"/>
    </g>
    {[[225,175],[315,100],[130,285],[470,175]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><path d="M-10 23H10" stroke="#638c50" strokeWidth="3"/><circle r="17" fill="#171717"/><text y="6" textAnchor="middle" fill="white" fontSize="18" fontFamily="Arial">{i+1}</text></g>)}
  </svg>;
}

export default function LandingPage({ toastMessage, getHeaderProps, openCategory, openFeaturedProduct }) {
  const root = useRef(null);
  const available = getPublicCategories().filter(category => category.isImplemented);
  const allowed = new Set(available.map(category => category.id));
  const activeProducts = getStorefrontProducts().filter(product => product.isImplemented && product.storefrontOrderable !== false && !product.adminArchived && allowed.has(product.categoryId));
  const chosen = activeProducts.filter(product => Number(product.homepageFeaturedOrder) > 0).sort((a,b) => Number(a.homepageFeaturedOrder)-Number(b.homepageFeaturedOrder));
  const featured = chosen.length ? chosen.slice(0,8) : activeProducts.slice(0,8);
  const headerProps = getHeaderProps();
  const images = getCatalogSnapshot().homepageImages;
  const hero = getHomepageImage(images, 'hero');
  const detail = getHomepageImage(images, 'detail');
  const detailContent = getHomepageDetailContent(images);
  const openDetailDestination = () => {
    if (detailContent.buttonTarget === 'account') { headerProps.onLoginClick?.(); return; }
    const category = available.find(item => item.id === detailContent.buttonTarget);
    if (category) openCategory(category); else browse();
  };
  const proof = getHomepageImage(images, 'proof');
  const browse = () => document.getElementById('jsf-start-categories')?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth', block: 'start' });

  useEffect(() => {
    const node = root.current;
    if (!node || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }), { threshold: .08 });
      node.querySelectorAll('[data-home-reveal]').forEach(element => {
        if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('home-will-reveal');
        observer.observe(element);
      });
    }
    let frame = 0;
    const paint = () => {
      frame = 0;
      node.style.setProperty('--home-drift', `${Math.min(65, Math.max(0, -node.getBoundingClientRect().top) * .12)}px`);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    window.addEventListener('scroll', scroll, { passive: true }); paint();
    return () => { observer?.disconnect(); window.removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, []);

  return <PageContainer variant="public" className="jsf-calm-home-shell">
    <AppHeader {...headerProps} />
    <main className="jsf-home-editorial" ref={root}>
      {toastMessage && <div className="jsf-home-toast" role="status">{toastMessage}</div>}
      <section className="jsf-home-hero" aria-labelledby="home-title">
        <img className="jsf-home-hero-photo" src={hero.src} alt={hero.alt} style={{objectPosition:hero.position}} fetchPriority="high" />
        <div className="jsf-home-hero-shade" />
        <div className="jsf-home-hero-copy">
          <p className="jsf-home-eyebrow">Skyltar för vård och verksamhet</p>
          <h1 id="home-title">Tydligt.<br/>Tryggt.<br/>Välkomnande.</h1>
          <p>Beställ och anpassa skyltar för<br/> din verksamhet.</p>
          <button className="jsf-home-primary" type="button" onClick={browse}>Se sortimentet <span aria-hidden="true">↗</span></button>
        </div>
      </section>
      <section className="jsf-home-featured" aria-labelledby="home-featured-title" data-home-reveal>
        <div className="jsf-home-section-intro"><p className="jsf-home-eyebrow">Utvalt</p><h2 id="home-featured-title">Utvalda<br/>produkter</h2><button className="jsf-home-text-link" type="button" onClick={browse}>Visa alla <span aria-hidden="true">→</span></button></div>
        <div className="jsf-home-carousel"><ProductArcCarousel products={featured} onOpen={openFeaturedProduct}/>{!featured.length && <p>Utforska vårt sortiment nedan.</p>}</div>
      </section>
      <section className={`jsf-home-detail${images?.detail?.src ? ' has-full-background' : ''}`} data-home-reveal>
        {images?.detail?.src && <img className="jsf-home-detail-background" src={detail.src} alt={detail.alt} loading="lazy" style={{objectPosition:detail.position}}/>}
        <div className="jsf-home-detail-copy">
          {detailContent.eyebrow && <p className="jsf-home-eyebrow">{detailContent.eyebrow}</p>}
          <h2>{detailContent.heading}</h2>
          {detailContent.body && <p>{detailContent.body}</p>}
          {detailContent.buttonTarget !== 'none' && detailContent.buttonLabel && (detailContent.buttonTarget !== 'account' || headerProps.onLoginClick) &&
            <button type="button" className="jsf-home-text-link" onClick={openDetailDestination}>{detailContent.buttonLabel}<span aria-hidden="true">↗</span></button>}
        </div>
        {!images?.detail?.src && <div className="jsf-home-detail-image"><img src={detail.src} alt={detail.alt} loading="lazy" style={{objectPosition:detail.position}}/></div>}
      </section>
      <section className="jsf-home-proof" data-home-reveal>
        <div><p className="jsf-home-eyebrow">Korrektur och godkännande</p><h2>Du ser exakt vad<br/>som tillverkas.</h2><p>Granska text, utseende och placering i ett samlat korrektur. När allt stämmer godkänner du, och ordern skapas direkt från projektet.</p>
          <details className="jsf-home-proof-more"><summary>Så fungerar det <span aria-hidden="true">+</span></summary><p>Skyltarna samlas i projektet, med eller utan placering på ritning. Du får ett korrektur att granska och kan lämna kommentarer innan du godkänner det.</p></details>
        </div>
        <div className="jsf-home-proof-image">{proof.src ? <img src={proof.src} alt={proof.alt} loading="lazy" style={{objectPosition:proof.position}}/> : <ProofPlan/>}</div>
      </section>
      <section className="jsf-home-directory" id="jsf-start-categories" data-home-reveal>
        <p className="jsf-home-eyebrow">Sortiment</p><h2>Hitta rätt skylt för din verksamhet.</h2>
        <div className="jsf-home-category-links">{available.filter(category => !category.parentId || !allowed.has(category.parentId)).map(category => <button key={category.id} type="button" onClick={()=>openCategory(category)}>{category.title}<span aria-hidden="true">↗</span></button>)}</div>
      </section>
    </main>
    <footer className="jsf-home-footer"><div><strong>Jönköpings Skyltfabrik</strong><p>Beställningsportal för Region Jönköpings län</p></div><div><p className="jsf-home-eyebrow">Konto</p>{headerProps.onLoginClick && <button type="button" onClick={headerProps.onLoginClick}>Mitt konto</button>}{headerProps.onCartClick && <button type="button" onClick={headerProps.onCartClick}>Kundkorg</button>}</div><div><p className="jsf-home-eyebrow">Sortiment</p><button type="button" onClick={browse}>Alla produktkategorier</button></div></footer>
  </PageContainer>;
}

