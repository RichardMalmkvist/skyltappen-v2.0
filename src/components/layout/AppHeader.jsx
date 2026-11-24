import PublicProductSearch from "./PublicProductSearch";
import CartAddedPanel from "./CartAddedPanel";
import TopBar from "./TopBar";
import ProductCategoryMenu from "./ProductCategoryMenu";

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
}) {
  return (
    <header className="jsf-public-header">
      <div className="jsf-public-header-inner">
        <TopBar
          navigation={<><button className="jsf-storefront-home-link" type="button" onClick={onLogoClick}>Start</button><ProductCategoryMenu onSelectCategory={onSelectCategory} activeCategoryId={activeCategoryId}/></>}
          search={onSearchProduct ? <PublicProductSearch onSelect={onSearchProduct} /> : null}
          cartCount={cartCount}
          onCartClick={showCartButton ? onCartClick : undefined}
          onLoginClick={showLoginButton ? onLoginClick : undefined}
          onLogoClick={onLogoClick}
        />
      </div>
      <CartAddedPanel flight={cartFlight} item={cartAddedItem} cartCount={cartCount} onClose={onCloseCartAdded} onCartClick={onCartClick} />
    </header>
  );
}
