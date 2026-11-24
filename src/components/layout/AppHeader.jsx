import PublicProductSearch from "./PublicProductSearch";
import CartAddedPanel from "./CartAddedPanel";
import TopBar from "./TopBar";
import ProductCategoryMenu from "./ProductCategoryMenu";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import HomepageNotice from "./HomepageNotice";
import {readApiResponse} from "../../data/apiResponse";

export default function AppHeader({
  onSearchProduct,
  onSelectCategory,
  activeCategoryId,
  cartAddedItem,
  cartFlight,
  onCloseCartAdded,
  cartCount,
  onCartClick,
  onLoginClick,
  onLogoClick,
  showCartButton = true,
  showLoginButton = true,
  homepage = false,
}) {
  const [notice, setNotice] = useState(null);
  const header = useRef(null);
  const menu = useRef(null);
  useEffect(() => {
    let controller;
    async function refresh() {
      if (document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      const {signal} = controller;
      try {
        const response = await fetch(homepage ? '/api/homepage-notice' : '/api/homepage-notice?scope=portal', {signal});
        const {notice} = await readApiResponse(response);
        if (!signal.aborted) setNotice(notice);
      } catch { /* Notice availability does not block navigation. */ }
    }
    refresh();
    const refreshTimer = window.setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller?.abort();
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [homepage]);
  const visibleNotice = (notice?.message || notice?.imageSrc) && (homepage || notice.allPages);
  const hasImageNotice = Boolean(visibleNotice && notice.imageSrc);
  useLayoutEffect(() => {
    if (!hasImageNotice) return;
    const node = header.current;
    const row = menu.current;
    const update = () => node.style.setProperty('--notice-height', `${row.getBoundingClientRect().height}px`);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(row);
    return () => {observer?.disconnect(); node.style.removeProperty('--notice-height');};
  }, [hasImageNotice]);
  return (
    <header ref={header} className={`jsf-public-header${visibleNotice ? ' has-homepage-notice' : ''}`}>
      <div ref={menu} className="jsf-public-header-inner">
        <TopBar
          navigation={<><button className="jsf-storefront-home-link" type="button" onClick={onLogoClick}>Start</button><ProductCategoryMenu onSelectCategory={onSelectCategory} activeCategoryId={activeCategoryId}/></>}
          search={onSearchProduct ? <PublicProductSearch onSelect={onSearchProduct} /> : null}
          cartCount={cartCount}
          onCartClick={showCartButton ? onCartClick : undefined}
          onLoginClick={showLoginButton ? onLoginClick : undefined}
          onLogoClick={onLogoClick}
        />
      </div>
      {visibleNotice && <HomepageNotice notice={notice}/>}
      <CartAddedPanel flight={cartFlight} item={cartAddedItem} cartCount={cartCount} onClose={onCloseCartAdded} onCartClick={onCartClick} />
    </header>
  );
}
