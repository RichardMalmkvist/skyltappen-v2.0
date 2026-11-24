import {getPublicChildCategories,getPublicCategoryById} from '../data/categoryAdmin';
import QuantityInput from '../components/forms/QuantityInput';
import {indoorGroup} from '../data/indoorGroups';
import CatalogDisclosure from "../components/products/CatalogDisclosure";
import useCatalogCardMotion from "../hooks/useCatalogCardMotion";
import NameBadgeGroups from "../components/products/NameBadgeGroups";
import useCartFeedback from "../hooks/useCartFeedback";
import "../styles/landingCalm.css";
import "../styles/catalogCalm.css";
import "../styles/catalogMinimal.css";
import { useMemo, useState } from "react";
import BadgeCard from "../components/products/BadgeCard";
import CatalogCardPrice from '../components/products/CatalogCardPrice';
import AppHeader from "../components/layout/AppHeader";
import PageContainer from "../components/layout/PageContainer";
import { getProductsByCategory } from "../data/products";
import { getRuntimeProducts } from "../data/products";
import {
  getCategoryEmptyState,
  getCategoryIntroText,
} from "../data/catalogConfig";
import { getDirectProductQuantityConfig } from "../data/directProductFieldHelpers";

function getProfessionCardColors(color, textColor) {
  const normalizedColor = (color || "").toLowerCase();
  const normalizedTextColor = (textColor || "").toLowerCase();

  const backgroundMap = {
    röd: "#d62828",
    blå: "#2563eb",
    grön: "#2e7d32",
    orange: "#ef6c00",
    lila: "#7b1fa2",
    ljusblå: "#4fc3f7",
    vinröd: "#8e244d",
    svart: "#212121",
    vit: "#ffffff",
    gul: "#ffeb3b",
  };

  const isCssColor = value => /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || (typeof CSS!=="undefined" && CSS.supports("color",value));
  const background = backgroundMap[normalizedColor] || (isCssColor(normalizedColor) ? normalizedColor : "#d62828");

  let colorValue = "#ffffff";

  if (isCssColor(normalizedTextColor)) colorValue=normalizedTextColor;

  if (normalizedTextColor === "svart") {
    colorValue = "#111111";
  }

  if (["vit","white","#fff","#ffffff"].includes(normalizedColor) && !normalizedTextColor) {
    colorValue = "#111111";
  }

  return {
    background,
    color: colorValue,
  };
}

function getProfessionFontSize(title = "") {
  const length = title.trim().length;

  if (length <= 10) return 36;
  if (length <= 14) return 34;
  if (length <= 18) return 32;
  if (length <= 24) return 29;
  if (length <= 30) return 27;

  return 19;
}

function getProfessionLetterSpacing(title = "") {
  const length = title.trim().length;

  if (length <= 14) return "-0.02em";
  if (length <= 24) return "-0.03em";

  return "-0.04em";
}


function isProfessionProduct(product) {
  return (
    product?.previewType === "profession" ||
    product?.productType === "yrkestitelsskylt" ||
    product?.categoryId === "yrkestitelsskyltar"
  );
}

function isCatalogCardProduct(product) {
  if (!product) return false;

  return product.flowType !== "direct" || product.directAddToCart === true;
}

function getProductsGridStyle(categoryId) {
  if (categoryId === "pendlade-vit") {
    return {
      ...productsGridStyle,
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    };
  }

  if (categoryId === "dorrskyltar") {
    return {
      ...productsGridStyle,
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    };
  }

  return productsGridStyle;
}

function getDirectImageStyle(product) {
  const isSmall = product?.imageVariant === "small";

  return {
    ...floatingMediaImageStyle,
    maxWidth: isSmall ? "52%" : "100%",
    maxHeight: isSmall ? 74 : 140,
  };
}

export default function CatalogPage({
  getHeaderProps,
  goBackToLanding,
  backButtonStyle,
  selectedCategory,
  featuredDirectProductId = null,
  openCategory,
  inputStyle,
  openProduct,
  addDirectProductToCart,
}) {
  const { isAdded, confirmAdded } = useCartFeedback();
  const [localSuccessMessage, setLocalSuccessMessage] = useState("");
  const catalogMotionRef = useCatalogCardMotion();
  const [productInputs, setProductInputs] = useState({});

  const categoryId = selectedCategory?.id || null;
  const childCategories=getPublicChildCategories(categoryId);
  const parentCategory=getPublicCategoryById(selectedCategory?.parentId);

  const categoryProducts = useMemo(() => {
    if (!categoryId) return [];
    const children=getPublicChildCategories(categoryId);
    const products = children.length?children.flatMap(category=>getProductsByCategory(category.id)):getProductsByCategory(categoryId);
    return featuredDirectProductId
      ? products.filter((product) => product.id === featuredDirectProductId)
      : products;
  }, [categoryId, featuredDirectProductId]);

  const isElevatorCategory = categoryProducts.some(p => p.previewType === "elevator_board") || categoryId === "vaningsplans-och-hisstavlor";

  const catalogCardProducts = useMemo(() => {
    return categoryProducts.filter((product) => isCatalogCardProduct(product));
  }, [categoryProducts]);

  const directCategoryProducts = useMemo(() => {
    return categoryProducts.filter((product) => !isCatalogCardProduct(product));
  }, [categoryProducts]);

  const emptyState = getCategoryEmptyState(selectedCategory);

  const professionProducts = useMemo(() => {
    return categoryProducts.filter((product) => isProfessionProduct(product));
  }, [categoryProducts]);

  function getProductInputState(product) {
    const existing = productInputs[product.id];
    if (existing) return existing;

    const quantityConfig = getDirectProductQuantityConfig(product);

    return {
      quantity: quantityConfig.defaultValue ?? 1,
    };
  }

  function getProductQuantity(product) {
    return getProductInputState(product).quantity || 1;
  }

  function updateProductQuantity(product, value) {
    const quantityConfig = getDirectProductQuantityConfig(product);

    const normalizedValue = Math.max(
      quantityConfig?.min || 1,
      Number(value) || quantityConfig?.defaultValue || 1
    );

    setProductInputs((prev) => ({
      ...prev,
      [product.id]: {
        ...getProductInputState(product),
        ...(prev[product.id] || {}),
        quantity: normalizedValue,
      },
    }));
  }

  function renderQuantityControl(product) {
    const quantityConfig = getDirectProductQuantityConfig(product);
    const min = quantityConfig.min ?? 1;
    const quantity = getProductQuantity(product);

    return <div className="jsf-card-quantity">
      <label htmlFor={`quantity-${product.id}`} style={fieldLabelStyle}>{quantityConfig.label}</label>
      <div style={{width:108,maxWidth:'100%'}}><QuantityInput id={`quantity-${product.id}`} min={min} value={quantity} onChange={value=>updateProductQuantity(product,value)}/></div>
    </div>;
  }

  function showLocalSuccessMessage(message) {
    setLocalSuccessMessage(message);

    setTimeout(() => {
      setLocalSuccessMessage("");
    }, 3000);
  }

  function getProductDisplayName(product) {
    return product?.articleNumber
      ? `Art.nr ${product.articleNumber}`
      : product?.name || "Produkten";
  }


  function handleCatalogCardAction(product, source) {
    if (product?.flowType === "direct" || product?.directAddToCart) {
      addDirectProductToCart(product, 1, {}, source);
      confirmAdded(product.id);
      showLocalSuccessMessage(
        `${getProductDisplayName(product)} lades i kundkorgen.`
      );
      return;
    }

    openProduct(product);
  }

  function handleSimpleDirectAdd(product, source) {
    const quantity = getProductQuantity(product);
    addDirectProductToCart(product, quantity, {}, source);
    confirmAdded(product.id);
    showLocalSuccessMessage(
      `${getProductDisplayName(product)} lades i kundkorgen.`
    );
  }

  function renderIntroText() {
    return getCategoryIntroText(
      selectedCategory,
      directCategoryProducts.length > 0
    );
  }

  function renderProfessionProductPreview(product) {
    const professionTitle =
      product?.fixedProfessionTitle || product?.name || "Titel";

    const professionTitleLine2 = product?.fixedProfessionTitleLine2 || "";

    const { background, color } = getProfessionCardColors(
      product?.fixedColor,
      product?.fixedTextColor
    );

    const isWhiteBadge = (product?.fixedColor || "").toLowerCase() === "vit";

    return (
      <div style={professionPreviewShellStyle}>
        <div
          style={{
            ...professionPreviewCardStyle,
            background,
            color,
            ...(isWhiteBadge ? whiteProfessionPreviewCardStyle : {}),
          }}
        >
          <div style={professionPreviewSurfaceStyle} />
          <div style={professionPreviewGlossStyle} />
          <div style={professionPreviewBottomShadeStyle} />

          <svg viewBox="0 0 420 100" width="100%" style={{display:"block",position:"relative",zIndex:1,overflow:"visible"}} role="img" aria-label={[professionTitle,professionTitleLine2].filter(Boolean).join(" ")}>
            <text x="210" y={professionTitleLine2?42:52} textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, sans-serif" fontWeight="500" fontSize={getProfessionFontSize(professionTitle)} letterSpacing={getProfessionLetterSpacing(professionTitle)} fill={color}>{professionTitle}</text>
            {professionTitleLine2&&<text x="210" y="72" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, sans-serif" fontWeight="500" fontSize={getProfessionFontSize(professionTitle)*.72} fill={color}>{professionTitleLine2}</text>}
          </svg>
        </div>
      </div>
    );
  }

  function renderProfessionProductCard(product) {
    const title = [product.fixedProfessionTitle || product.name, product.fixedProfessionTitleLine2].filter(Boolean).join(" ");
    return <div key={product.id} className="jsf-catalog-card jsf-profession-catalog-card" style={simpleDirectCardStyle}>
      <div className="jsf-card-media" style={floatingMediaAreaStyle}>
        <button type="button" className="jsf-profession-catalog-preview" style={{border:0,background:"transparent",padding:0,width:"100%",cursor:"pointer"}} aria-label={`Visa ${title} i 3D`} onClick={()=>openProduct(product,{previewProfession:true})}>{renderProfessionProductPreview(product)}</button>
      </div>
      <div className="jsf-card-content" style={directCardContentStyle}>
        <div className="jsf-minimal-card-info">
          <div className="jsf-catalog-card-name">{title}</div>
          <div className="jsf-minimal-card-meta">
            {product.articleNumber && <span>Art.nr {product.articleNumber}</span>}
            {product.format && <span>{product.format}</span>}
          </div>
          <CatalogCardPrice product={product}/>
        </div>
        <div className="jsf-card-order-row" style={simpleDirectFooterStyle}>
          <button type="button" className="jsf-catalog-card-action" style={addToCartLinkStyle}
            aria-label={`Välj produkt – ${title}, ${product.articleNumber || ""}`}
            onClick={()=>openProduct(product,{previewProfession:true})}>
            Välj produkt <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>;
  }

  function renderProfessionGroups() {
    return <NameBadgeGroups key="profession" variant="profession" products={professionProducts} renderProduct={renderProfessionProductCard} autoExpand={Boolean(featuredDirectProductId)} />;
  }

  function renderIndoorGroups() {
    const groups=[{id:"decals",title:"Dekaler"},{id:"dibond",title:"Dibondskyltar"},{id:"flags",title:"Flaggskyltar"},...(categoryProducts.some(product=>indoorGroup(product)==="cubes")?[{id:"cubes",title:"Målpunktsskyltar"}]:[]),{id:"other",title:"Övriga inomhusskyltar"},{id:"accessories",title:"Tillbehör"}].map(group=>({...group,products:categoryProducts.filter(product=>indoorGroup(product)===group.id)})).filter(group=>!['other','accessories'].includes(group.id)||group.products.length);
    return <div className="jsf-grouped-indoor">{groups.map(group=><CatalogDisclosure key={group.id} groupId={`indoor-${group.id}`} title={group.title} count={group.products.length} defaultOpen={Boolean(featuredDirectProductId)&&group.products.length>0}>{group.products.length?<div style={getProductsGridStyle(categoryId)} className="jsf-calm-products-grid">{group.products.map(product=>isCatalogCardProduct(product)?renderProductCard(product):renderSimpleDirectProductCard(product))}</div>:<p className="jsf-indoor-empty">Inga artiklar i denna grupp ännu.</p>}</CatalogDisclosure>)}</div>;
  }

  function renderSimpleDirectProductCard(product) {
    return (
      <div
        key={product.id}
        style={simpleDirectCardStyle}
        className="jsf-catalog-card jsf-direct-card"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.07)";
          e.currentTarget.style.borderColor = "#e2e8e3";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.04)";
          e.currentTarget.style.borderColor = "#ececec";
        }}
      >
        <div style={floatingMediaAreaStyle} className="jsf-card-media">
          <div style={floatingMediaStageStyle}>
            <img
              src={product.image}
              alt={product.name}
              style={getDirectImageStyle(product)}
            />
          </div>

          <div style={floatingMediaShadowStyle} className="jsf-media-shadow" />
        </div>

        <div style={directCardContentStyle} className="jsf-card-content">
          <div className="jsf-minimal-card-info">
            <div className="jsf-catalog-card-name">{product.desc || product.name}</div>
            <div className="jsf-minimal-card-meta">
              {product.articleNumber && <span>Art.nr {product.articleNumber}</span>}
              {product.format && <span>{product.format}</span>}
            </div>
            <CatalogCardPrice product={product}/>
          </div>

          <div style={simpleDirectFooterStyle} className="jsf-card-order-row">
            {renderQuantityControl(product)}

            <div
              role="button"
              tabIndex={0}
              onClick={event => handleSimpleDirectAdd(product, event.currentTarget.closest(".jsf-catalog-card"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSimpleDirectAdd(product, e.currentTarget.closest(".jsf-catalog-card"));
                }
              }}
              className="jsf-catalog-card-action"
            style={addToCartLinkStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              {isAdded(product.id) ? "✓ Tillagd" : "Lägg i kundkorg"} <span aria-hidden="true" style={addToCartArrowStyle}>{isAdded(product.id) ? "" : "→"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderProductCard(product) {
    return (
      <BadgeCard
        key={product.id}
        badge={product}
        ctaLabel={(product.flowType === "direct" || product.directAddToCart) && isAdded(product.id) ? "✓ Tillagd" : undefined}
        onAction={(_badge, _options, source) => handleCatalogCardAction(product, source)}
      />
    );
  }

  function renderProductCards(products) {
    if (products.length === 0) {
      return (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>Inga produkter</div>
          <p style={emptyTextStyle}>
            Det finns inga upplagda produkter för denna kategori ännu.
          </p>
        </div>
      );
    }

    if (categoryId === "namnbrickor") {
      return <NameBadgeGroups key="namebadge" products={products} renderProduct={renderProductCard} autoExpand={Boolean(featuredDirectProductId)} />;
    }

    return (
      <div style={getProductsGridStyle(categoryId)} className="jsf-calm-products-grid">
        {products.map(renderProductCard)}
      </div>
    );
  }

  function renderDirectCategory(products) {
    if (products.length === 0) {
      return (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>{emptyState.title}</div>
          <p style={emptyTextStyle}>{emptyState.text}</p>
        </div>
      );
    }

    return (
      <div style={getProductsGridStyle(categoryId)} className="jsf-calm-products-grid">
        {products.map((product) => renderSimpleDirectProductCard(product))}
      </div>
    );
  }

  function renderCategoryContent() {
    if(childCategories.length)return <div className="jsf-grouped-indoor">{childCategories.map(category=>{const products=getProductsByCategory(category.id);return <CatalogDisclosure key={category.id} groupId={`hanging-${category.id}`} title={category.title} count={products.length}><div style={getProductsGridStyle(category.id)} className="jsf-calm-products-grid">{products.map(product=>isCatalogCardProduct(product)?renderProductCard(product):renderSimpleDirectProductCard(product))}</div>{!products.length&&<p className="jsf-indoor-empty">Inga artiklar i denna grupp ännu.</p>}</CatalogDisclosure>;})}</div>;

    if (!selectedCategory) {
      return (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>Ingen kategori vald</div>
          <p style={emptyTextStyle}>Välj en kategori i menyn.</p>
        </div>
      );
    }
    if (!selectedCategory.isImplemented && categoryProducts.length === 0) {
      return (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>{selectedCategory.title}</div>
          <p style={emptyTextStyle}>
            Denna produktkategori är inte upplagd ännu.
          </p>
        </div>
      );
    }

    if (categoryId === "dorrskyltar" && categoryProducts.some(product=>product.doorAccessory)) {
      const regular=categoryProducts.filter(product=>!product.doorAccessory);
      const accessories=categoryProducts.filter(product=>product.doorAccessory);
      return <div style={{display:"grid",gap:32}}>{regular.length>0&&renderProductCards(regular)}<section aria-label="Tillbehör till dörrskyltar"><h2 style={{fontSize:18,fontWeight:400,margin:"0 0 18px"}}>Tillbehör</h2>{renderProductCards(accessories)}</section></div>;
    }

    if (categoryId === "yrkestitelsskyltar" && professionProducts.length > 0) return renderProfessionGroups();
    if (categoryId === "inomhusskyltar") return renderIndoorGroups();

    if (isElevatorCategory && categoryProducts.length > 0) {
      const boardProduct = categoryProducts.find(p => p.previewType === "elevator_board" && p.elevatorBoards?.length) || categoryProducts.find(p => p.previewType === "elevator_board") || categoryProducts[0];
      return <div style={getProductsGridStyle(categoryId)} className="jsf-calm-products-grid"><BadgeCard badge={{...boardProduct, name:"Våningsplans- och hisstavlor", articleNumber:"", desc:"Beställ komplett hisstavla eller endast pappersutskrift.", previewType:"elevator_catalog_entry", cardImage:getRuntimeProducts().find(p=>String(p.articleNumber)==="0807")?.cardImage || boardProduct.cardImage}} onAction={()=>openProduct(boardProduct)} ctaLabel="Välj hisstavla" /></div>;
    }

    if (catalogCardProducts.length > 0 && directCategoryProducts.length === 0) {
      return renderProductCards(catalogCardProducts);
    }

    if (directCategoryProducts.length > 0 && catalogCardProducts.length === 0) {
      return renderDirectCategory(directCategoryProducts);
    }

    if (catalogCardProducts.length === 0 && directCategoryProducts.length === 0) {
      return (
        <div style={emptyCardStyle}>
          <div style={emptyTitleStyle}>{emptyState.title}</div>
          <p style={emptyTextStyle}>{emptyState.text}</p>
        </div>
      );
    }

    return (
      <div style={mixedSectionsStyle}>
        {catalogCardProducts.length > 0 && (
          <section>
            <div style={sectionHeadingWrapStyle}>
              <div style={sectionEyebrowStyle}>Produkter</div>
              <h2 style={sectionHeadingStyle}>Välj produkt</h2>
            </div>
            {renderProductCards(catalogCardProducts)}
          </section>
        )}

        {directCategoryProducts.length > 0 && (
          <section>
            <div style={sectionHeadingWrapStyle}>
              <div style={sectionEyebrowStyle}>Direktbeställning</div>
              <h2 style={sectionHeadingStyle}>Beställ direkt</h2>
            </div>
            {renderDirectCategory(directCategoryProducts)}
          </section>
        )}
      </div>
    );
  }

  return (
    <PageContainer variant="public" className="jsf-calm-home-shell jsf-calm-catalog-shell jsf-minimal-catalog">
      <AppHeader {...getHeaderProps()} />

      <div style={pageStyle} className="jsf-catalog">
        <button type="button" onClick={()=>parentCategory?openCategory(parentCategory):goBackToLanding()} style={backButtonStyle} className="jsf-calm-back jsf-back-link">
          ← {parentCategory?parentCategory.title:"Tillbaka"}
        </button>

        <div ref={catalogMotionRef} style={layoutStyle} className="jsf-public-content">

          <div style={contentColumnStyle} className="jsf-catalog-layout">
            <section className="jsf-catalog-intro" aria-label="Produktkategori">
              <div className="jsf-catalog-intro-kicker">PRODUKTKATEGORI</div>
              <h1>{selectedCategory?.title || "Produkter"}</h1>
              <span className="jsf-catalog-product-count">{categoryProducts.length} {categoryProducts.length === 1 ? "produkt" : "produkter"}</span>
              {categoryProducts.length === 0 && <p>{renderIntroText()}</p>}
            </section>

            {localSuccessMessage && (
              <div style={successStyle} className="jsf-calm-notice" role="status">{localSuccessMessage}</div>
            )}

            {renderCategoryContent()}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

const pageStyle = {
  maxWidth: 1280,
  margin: "0 auto",
  paddingBottom: 40,
};

const layoutStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 32,
  alignItems: "start",
};

const contentColumnStyle = {
  display: "grid",
  gap: 24,
};













const successStyle = {
  background: "#eef8f1",
  border: "1px solid #d7eddd",
  color: "#1b5e20",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 600,
};

const productsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 24,
};







const mixedSectionsStyle = {
  display: "grid",
  gap: 34,
};

const sectionHeadingWrapStyle = {
  marginBottom: 18,
};

const sectionEyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 8,
};

const sectionHeadingStyle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  color: "#111111",
};

const emptyCardStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
};

const emptyTitleStyle = {
  fontWeight: 700,
  fontSize: 28,
  marginBottom: 10,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
};

const emptyTextStyle = {
  color: "#5f6368",
  marginTop: 0,
  marginBottom: 0,
  lineHeight: 1.7,
  fontSize: 16,
};



const simpleDirectCardStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
  transition:
    "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
  display: "flex",
  flexDirection: "column",
};

const floatingMediaAreaStyle = {
  position: "relative",
  height: 220,
  padding: "18px 16px 6px",
  background: "#f6f7f8",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const floatingMediaStageStyle = {
  width: "100%",
  height: 150,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 2,
};

const floatingMediaImageStyle = {
  maxWidth: "100%",
  maxHeight: 140,
  objectFit: "contain",
  display: "block",
  filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.08))",
};

const floatingMediaShadowStyle = {
  width: "55%",
  height: 14,
  marginTop: 6,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.10)",
  filter: "blur(10px)",
};

const professionPreviewShellStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const professionPreviewCardStyle = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  height: 100,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 10px",
  boxSizing: "border-box",
  overflow: "hidden",
  boxShadow: `
    0 8px 16px rgba(0,0,0,0.10),
    inset 0 1px 0 rgba(255,255,255,0.16),
    inset 0 -1px 0 rgba(0,0,0,0.12)
  `,
};

const whiteProfessionPreviewCardStyle = {
  border: "1px solid rgba(0,0,0,0.12)",
};

const professionPreviewSurfaceStyle = {
  position: "absolute",
  inset: 0,
  borderRadius: 10,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.03) 100%)",
  pointerEvents: "none",
};

const professionPreviewGlossStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "46%",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02), rgba(255,255,255,0))",
  pointerEvents: "none",
};

const professionPreviewBottomShadeStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: "28%",
  background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.08))",
  pointerEvents: "none",
};



const directCardContentStyle = {
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};









const simpleDirectFooterStyle = {
  display: "grid",
  gap: 10,
  marginTop: 4,
};

const addToCartLinkStyle = {
  marginTop: 2,
  fontSize: 12,
  fontWeight: 400,
  color: "#009846",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  width: "fit-content",
  transition: "transform 0.18s ease",
};

const addToCartArrowStyle = {
  fontSize: 18,
  lineHeight: 1,
};

const fieldLabelStyle = {
  display: "block",
  fontWeight: 400,
  marginBottom: 8,
  fontSize: 12,
  color: "#1f2937",
};
