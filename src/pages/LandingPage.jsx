import { useEffect, useRef } from "react";
import ProductArcCarousel from "../components/products/ProductArcCarousel";
import "../styles/landingCalm.css";
import AppHeader from "../components/layout/AppHeader";
import HomepageSlides from "../components/layout/HomepageSlides";
import PageContainer from "../components/layout/PageContainer";
import { getPublicCategories } from "../data/categoryAdmin";
import { getStorefrontProducts } from "../data/products";
import { getCatalogSnapshot } from "../data/catalogStore";

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
  const openSlideDestination = target => {
    if (target === 'account') { headerProps.onLoginClick?.(); return; }
    const category = available.find(item => item.id === target);
    if (category) openCategory(category); else browse();
  };
  function renderSlideButton({buttonLabel, buttonTarget}, className) {
    if (!buttonLabel || buttonTarget === 'none' || buttonTarget === 'details' || (buttonTarget === 'account' && !headerProps.onLoginClick)) return null;
    return <button className={className} type="button" onClick={() => openSlideDestination(buttonTarget)}>{buttonLabel} <span aria-hidden="true">↗</span></button>;
  }
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
    <AppHeader {...headerProps} homepage />
    <main className="jsf-home-editorial" ref={root}>
      {toastMessage && <div className="jsf-home-toast" role="status">{toastMessage}</div>}
      <HomepageSlides settings={images} slot="hero" label="Headerbilder">{({image, content, sectionProps, controls}) => <section className="jsf-home-hero" aria-labelledby="home-title" {...sectionProps}>
        <img className="jsf-home-hero-photo" src={image.src} alt={image.alt} style={{objectPosition:image.position}} fetchPriority="high" />
        <div className="jsf-home-hero-shade" />
        <div className="jsf-home-hero-copy">
          {content.eyebrow && <p className="jsf-home-eyebrow">{content.eyebrow}</p>}
          <h1 id="home-title" className="jsf-home-slide-text">{content.heading || 'Beställningsportalen'}</h1>
          {content.body && <p className="jsf-home-slide-text">{content.body}</p>}
          {renderSlideButton(content, 'jsf-home-primary')}
          {controls}
        </div>
      </section>}</HomepageSlides>
      <section className="jsf-home-featured" aria-labelledby="home-featured-title" data-home-reveal>
        <div className="jsf-home-section-intro"><p className="jsf-home-eyebrow">Utvalt</p><h2 id="home-featured-title">Utvalda<br/>produkter</h2><button className="jsf-home-text-link" type="button" onClick={browse}>Visa alla <span aria-hidden="true">→</span></button></div>
        <div className="jsf-home-carousel"><ProductArcCarousel products={featured} onOpen={openFeaturedProduct}/>{!featured.length && <p>Utforska vårt sortiment nedan.</p>}</div>
      </section>
      <HomepageSlides settings={images} slot="detail" label="Bilder för produktsektionen">{({image, content, hasCustomImage, sectionProps, controls}) => <section className={`jsf-home-detail${hasCustomImage ? ' has-full-background' : ''}`} data-home-reveal {...sectionProps}>
        {hasCustomImage && <img className="jsf-home-detail-background" src={image.src} alt={image.alt} loading="lazy" style={{objectPosition:image.position}}/>}
        <div className="jsf-home-detail-copy">
          {content.eyebrow && <p className="jsf-home-eyebrow">{content.eyebrow}</p>}
          {content.heading && <h2>{content.heading}</h2>}
          {content.body && <p>{content.body}</p>}
          {renderSlideButton(content, 'jsf-home-text-link')}
          {controls}
        </div>
        {!hasCustomImage && <div className="jsf-home-detail-image"><img src={image.src} alt={image.alt} loading="lazy" style={{objectPosition:image.position}}/></div>}
      </section>}</HomepageSlides>
      <HomepageSlides settings={images} slot="proof" label="Korrekturbilder">{({image, content, sectionProps, controls, activeIndex}) => <section className="jsf-home-proof" data-home-reveal {...sectionProps}>
        <div>
          {content.eyebrow && <p className="jsf-home-eyebrow">{content.eyebrow}</p>}
          {content.heading && <h2 className="jsf-home-slide-text">{content.heading}</h2>}
          {content.body && <p className="jsf-home-slide-text">{content.body}</p>}
          {content.buttonTarget === 'details' && content.buttonLabel && content.detailsText && <details key={activeIndex} className="jsf-home-proof-more">
            <summary>{content.buttonLabel} <span aria-hidden="true">+</span></summary><p className="jsf-home-slide-text">{content.detailsText}</p>
          </details>}
          {renderSlideButton(content, 'jsf-home-text-link')}
          {controls}
        </div>
        <div className="jsf-home-proof-image">{image.src ? <img src={image.src} alt={image.alt} loading="lazy" style={{objectPosition:image.position}}/> : <ProofPlan/>}</div>
      </section>}</HomepageSlides>
      <section className="jsf-home-directory" id="jsf-start-categories" data-home-reveal>
        <p className="jsf-home-eyebrow">Sortiment</p><h2>Hitta rätt skylt för din verksamhet.</h2>
        <div className="jsf-home-category-links">{available.filter(category => !category.parentId || !allowed.has(category.parentId)).map(category => <button key={category.id} type="button" onClick={()=>openCategory(category)}>{category.title}<span aria-hidden="true">↗</span></button>)}</div>
      </section>
    </main>
    <footer className="jsf-home-footer"><div><strong>Jönköpings Skyltfabrik</strong><p>Beställningsportal för Region Jönköpings län</p></div><div><p className="jsf-home-eyebrow">Konto</p>{headerProps.onLoginClick && <button type="button" onClick={headerProps.onLoginClick}>Mitt konto</button>}{headerProps.onCartClick && <button type="button" onClick={headerProps.onCartClick}>Kundkorg</button>}</div><div><p className="jsf-home-eyebrow">Sortiment</p><button type="button" onClick={browse}>Alla produktkategorier</button></div></footer>
  </PageContainer>;
}

