import DatePicker from '../components/forms/DatePicker';
import OrderPdfAttachments from "../components/orders/OrderPdfAttachments";
import BadgeCheckoutDetails from "../components/products/BadgeCheckoutDetails";
import {isBadgeItem,badgeAddressLines} from "../data/badgeProduction";
import ProfessionBadgePreview from "../components/products/ProfessionBadgePreview";
import AreaPreview from "../components/products/AreaPreview";
import DibondPreview from "../components/products/DibondPreview";
import OTBoardPreview from "../components/orders/OTBoardPreview";
import useAnimatedCartRemoval from "../hooks/useAnimatedCartRemoval";
import { useLayoutEffect, useRef, useState } from "react";
import CheckoutSteps from "../components/layout/CheckoutSteps";
import useModalFocus from "../hooks/useModalFocus";
import { checkoutFieldErrors, focusOrderField } from "../data/publicFormValidation";
import "./CartPage.css";
import "../styles/landingCalm.css";
import "../styles/cartCalm.css";
import AppHeader from "../components/layout/AppHeader";
import BadgePreview from "../components/products/BadgePreview";
import ElevatorBoardPreview from "../components/orders/ElevatorBoardPreview";
import PageContainer from "../components/layout/PageContainer";
import { getCartItemDisplayRows } from "../data/orderDisplayHelpers";
import { getCartPreviewConfig } from "../data/previewHelpers";

const HANGING_OPTION_LABEL = /^(Pilplacering|Pilriktning|Symbol)/i;
const CUSTOMER_TEXT_LABEL = /^(Skylttext|Textrad|Namn på skylt|Titel på skylt|Övrig skylttext|Text$|Namn$|Titel$|Titel rad|Verksamhetsnamn)/i;

// Checkout shows the board identity; the complete board stays on the cart item.
function getCheckoutDisplayRows(item) {
  const rows = getCartItemDisplayRows(item);
  return item.otBoard
    ? rows.filter(row => ["OT-tavla", "Placering", "Format", "Antal"].includes(row.label))
    : rows;
}

function CartBoardSummary({item,showQuantity=false}) {
  const board=item.otBoard||item.elevatorBoard;
  const location=item.otBoard?item.otBoardLocation:item.elevatorBoardLocation;
  const name=item.otBoard?(item.otBoardName||"OT-tavla"):(item.elevatorBoardName||"Hisstavla");
  return <div className="jsf-cart-elevator-summary"><div>{location?`${location} · `:""}{name}</div><div>{board.widthMm} × {board.heightMm} mm{showQuantity?` · ${item.quantity} st`:""}</div></div>;
}

function renderDisplayRows(rows) {
  const details = rows.filter((row) => row.label && !CUSTOMER_TEXT_LABEL.test(row.label) && !HANGING_OPTION_LABEL.test(row.label));
  const options = rows.filter((row) => row.label && HANGING_OPTION_LABEL.test(row.label));
  const customerText = rows.filter((row) => row.label && CUSTOMER_TEXT_LABEL.test(row.label));
  return (
    <>
      {details.map((row, index) => (
        <div key={`${row.label}-${index}`} className="jsf-cart-detail-row">
          <span className="jsf-cart-detail-label">{row.label}</span>
          <span className="jsf-cart-detail-value">{row.value}</span>
        </div>
      ))}
      {(customerText.length > 0 || options.length > 0) && (
        <div className="jsf-cart-customer-text">
          {[...customerText, ...options].map((row, index) => (
            <div key={`${row.label}-${index}`} className="jsf-cart-customer-text-entry">
              <span className="jsf-cart-customer-text-label">{row.label === "Text" || row.label === "Textrad 1" ? "Skylttext" : row.label}</span>
              <span className="jsf-cart-customer-text-value">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function isProfessionCartItem(item) {
  return (
    item?.productType === "yrkestitelsskylt" ||
    item?.categoryId === "yrkestitelsskyltar"
  );
}







function renderProfessionCartPreview(item) {
  return <div style={professionPreviewWrapStyle}><ProfessionBadgePreview item={item} maxWidth={220}/></div>;
}

function ConfiguredCartPreview({ item, config }) {
  const container = useRef(null);
  const [width, setWidth] = useState(64);
  useLayoutEffect(() => {
    const element = container.current;
    const measure = () => { if (element?.clientWidth > 0) setWidth(element.clientWidth); };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return <div ref={container} style={badgePreviewWrapStyle}>
    <BadgePreview badgeId={config.badgeId} productType={config.productType} productForm={item}
      mini={config.mini} maxWidth={Math.min(config.maxWidth, width)} />
  </div>;
}

function renderCartPreview(item) {
  if (item?.pricingMode === "area") return <AreaPreview form={item} maxWidth={180} mini/>;
  if(item?.dibondSign||item?.configuration?.dibondSign)return <div style={{width:"100%",maxWidth:180,margin:"auto"}}><DibondPreview sign={item.dibondSign||item.configuration.dibondSign} label={item.badgeName||"Dibondskylt"}/></div>;
  if(item?.otBoard)return <div style={{width:"100%",maxWidth:180,margin:"auto"}}><OTBoardPreview board={item.otBoard} label={item.otBoardName||"OT-tavla"}/></div>;
  if (item?.elevatorBoard) {
    return <div style={{ width: "100%", maxWidth: 180, margin: "auto" }}><ElevatorBoardPreview board={item.elevatorBoard} label={item.elevatorBoardName || "Hisstavla"} mode={item.elevatorOrderMode || (/^0807$/.test(String(item.articleNumber)) ? "complete" : "print")} /></div>;
  }
  // Personalised previews must use the saved customer text before any catalogue image.
  if (isProfessionCartItem(item)) {
    return renderProfessionCartPreview(item);
  }

  const config = getCartPreviewConfig(item);

  if (
    config.previewType === "parking_sign" ||
    config.previewType === "destination_cube" ||
    config.previewType === "elevator_board" ||
    config.previewType === "badge" ||
    config.previewType === "profession" ||
    config.previewType === "hanging_sign" ||
    config.previewType === "door_sign"
  ) {
    return <ConfiguredCartPreview item={item} config={config} />;
  }

  if (typeof item?.image === "string" && item.image.trim()) {
    return (
      <div style={imagePreviewWrapStyle}>
        <img
          src={item.image}
          alt={item.badgeName || item.name || "Produktbild"}
          style={{ width: "100%", height: "100%", maxHeight: 180, objectFit: "contain", display: "block" }}
        />
      </div>
    );
  }

  if (config.previewType === "imageTall") {
    return config.image ? (
      <div style={imagePreviewWrapStyle}>
        <img
          src={config.image}
          alt={config.alt}
          style={{
            width: config.width,
            height: config.height,
            objectFit: "contain",
            display: "block",
            maxWidth: "100%",
          }}
        />
      </div>
    ) : (
      <div style={previewFallbackStyle}>Ingen förhandsvisning</div>
    );
  }

  if (config.previewType === "image") {
    return config.image ? (
      <div style={imagePreviewWrapStyle}>
        <img
          src={config.image}
          alt={config.alt}
          style={{
            width: config.width,
            height: config.height,
            objectFit: "contain",
            display: "block",
            maxWidth: "100%",
          }}
        />
      </div>
    ) : (
      <div style={previewFallbackStyle}>Ingen förhandsvisning</div>
    );
  }

  return <div style={previewFallbackStyle}>Ingen förhandsvisning</div>;
}

export default function CartPage({
  getHeaderProps,
  goBackToLanding,
  backButtonStyle,
  cart,
  inputStyle,
  updateCartQuantity,
  removeFromCart,
  orderer,
  signedInPurchaser = false,
  delivery = {},
  setDelivery,
  setOrderer,
  orderDetails,
  setOrderDetails,
  validateOrderDetails,
  setShowOrderSummary,
  secondaryButtonStyle,
  primaryButtonStyle,
  setStepToLanding,
  showOrderSummary,
  submitOrderToBackend,
  modalOverlayStyle,
  modalContentStyle,
  sectionTitleStyle,
}) {
  const { removeAnimated, removing } = useAnimatedCartRemoval(removeFromCart);
  const [attempted, setAttempted] = useState(false);
  const [attachmentsBusy,setAttachmentsBusy]=useState(false);
  const [checkoutStage, setCheckoutStage] = useState(0);
  const reviewRef = useRef(null);
  useModalFocus(showOrderSummary, reviewRef, () => setShowOrderSummary(false));
  const badgeOnly=cart.length>0&&cart.every(isBadgeItem);
  const fieldErrors = attempted ? checkoutFieldErrors(orderer, orderDetails,{badgeOnly,delivery}) : {};
  function fieldProps(id) {
    return { "aria-invalid": fieldErrors[id] ? true : undefined, "aria-describedby": fieldErrors[id] ? `${id}-error` : undefined };
  }
  function fieldError(id) {
    return fieldErrors[id] ? <p id={`${id}-error`} className="jsf-field-error" role="alert">{fieldErrors[id]}</p> : null;
  }
  function openReview() {
    if (Object.keys(removing).length || attachmentsBusy) return;
    setAttempted(true);
    const errors = checkoutFieldErrors(orderer, orderDetails,{badgeOnly,delivery});
    const first = Object.keys(errors)[0];
    if (first) { setCheckoutStage(1); focusOrderField(first); return; }
    if (!validateOrderDetails()) setShowOrderSummary(true);
  }
  function navigateCheckout(index) {
    if (index === 2) { openReview(); return; }
    setCheckoutStage(index);
    setShowOrderSummary(false);
    // Let the modal release focus and scroll lock before navigating to a section.
    setTimeout(() => {
      const section = document.getElementById(index === 0 ? "jsf-checkout-products" : "jsf-checkout-details");
      section?.scrollIntoView?.({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth" });
      section?.focus({ preventScroll: true });
    }, 0);
  }
  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const orderTotal = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0
  );
  const formatSek = (value) =>
    new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(value || 0);

  const orderError = showOrderSummary ? validateOrderDetails() : null;

  return (
    <PageContainer variant="public" className="jsf-calm-home-shell jsf-calm-cart-shell">
      <AppHeader {...getHeaderProps()} />

      <div style={pageStyle} className="jsf-cart jsf-new-cart jsf-cart-refresh">
        <button type="button" onClick={goBackToLanding} style={backButtonStyle} className="jsf-calm-cart-back jsf-back-link">
          ← Tillbaka
        </button>

        <section style={checkoutHeaderStyle} className="jsf-cart-page-intro">
          <div>
            <div style={heroEyebrowStyle} className="jsf-cart-kicker">Beställning</div>
            <h1 style={checkoutHeaderTitleStyle}>Din kundkorg</h1>
            <p style={checkoutHeaderTextStyle}>
              {totalItems === 0
                ? "Kundkorgen är tom. Lägg till produkter för att gå vidare."
                : `${cart.length} produkt${cart.length === 1 ? "" : "er"} · ${totalItems} st`}
            </p>
          </div>
        </section>

        {cart.length > 0 && !showOrderSummary && <CheckoutSteps current={checkoutStage} onNavigate={navigateCheckout}/>}

        {cart.length === 0 ? (
          <div style={emptyCardStyle} className="jsf-calm-cart-empty">
            <div style={emptyTitleStyle}>Ingen produkt i kundkorgen</div>
            <p style={emptyTextStyle}>
              Lägg till produkter innan du går vidare till beställning.
            </p>
            <button
              type="button"
              onClick={setStepToLanding}
              style={primaryButtonStyle}
            >
              Till startsidan
            </button>
          </div>
        ) : (
          <>
            <div style={checkoutGridStyle} className="jsf-cart-checkout-grid">
              <main style={checkoutMainStyle} className="jsf-cart-main">
                <section style={mainColumnStyle}>
                <div style={sectionHeadingWrapStyle}>
                  <div style={sectionEyebrowStyle} className="jsf-cart-kicker">Produkter</div>
                  <h2 style={sectionHeadingStyle}>Dina val</h2>
                </div>

                <div style={cartListStyle} className="jsf-cart-items" id="jsf-checkout-products" tabIndex={-1} onFocusCapture={() => setCheckoutStage(0)}>
                  {cart.map((item) => {
                    const rows = getCheckoutDisplayRows(item).filter(row => row.label !== "Antal");
                    const detailRows = rows.filter((row) => row.label !== "Antal");

                    return (
                      <div key={item.id} className="jsf-cart-exit-row" style={{ minWidth: 0 }}>
                      <div style={cartItemCardStyle} className="jsf-cart-item">
                        <div style={cartItemContentStyle} className="jsf-cart-item-content">
                          <div>
                            <div style={cartItemArticleStyle} className="jsf-calm-cart-article">
                              {item.articleNumber ? `ART.NR ${item.articleNumber}` : "PRODUKT"}
                            </div>
                            <div style={cartItemTitleStyle} className="jsf-calm-cart-product-title">
                              {item.badgeName || item.name || item.description || `Artikel ${item.articleNumber || ""}`}
                            </div> 

                            <div style={cartItemDetailsStyle}>
                              {item.otBoard || item.elevatorBoard ? <CartBoardSummary item={item}/> : renderDisplayRows(detailRows)}
                            </div>
                          </div>

                          <div style={cartItemActionsWrapStyle}>
                            <label
                              htmlFor={`qty-${item.id}`}
                              style={fieldLabelStyle}
                            >
                              Antal
                            </label>

                            <div style={quantityRowStyle}>
                              <input
                                id={`qty-${item.id}`}
                                readOnly={Boolean(item.elevatorBoard)}
                                disabled={Boolean(removing[item.id])}
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  if (!item.elevatorBoard) updateCartQuantity(item.id, e.target.value);
                                }}
                                style={{
                                  ...inputStyle,
                                  maxWidth: 120,
                                  marginTop: 0,
                                  ...(item.elevatorBoard ? { background: "#f4f4f4", cursor: "default" } : {}),
                                }}
                              />

                              <button
                                type="button"
                                onClick={event => removeAnimated(item.id, event.currentTarget.closest(".jsf-cart-exit-row"))}
                                disabled={Boolean(removing[item.id])}
                                aria-busy={Boolean(removing[item.id])}
                                className="jsf-cart-remove-minimal"
                                aria-label={`Ta bort ${item.badgeName || item.articleNumber || "artikel"}`}
                                title="Ta bort artikel"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div style={previewColumnStyle} className="jsf-cart-item-preview">
                          <div style={previewLabelStyle}>Förhandsvisning</div>

                          <div style={previewShellStyle}>
                            {renderCartPreview(item)}
                          </div>
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
                </section>

                <div style={formsStackStyle} className="jsf-cart-forms" id="jsf-checkout-details" tabIndex={-1} onFocusCapture={() => setCheckoutStage(1)}>
              {badgeOnly?<BadgeCheckoutDetails orderer={orderer} setOrderer={setOrderer} delivery={delivery} setDelivery={setDelivery} inputStyle={inputStyle} fieldProps={fieldProps} fieldError={fieldError}/>:<>
              <div style={{ ...formCardStyle, gridColumn: "1 / -1" }} className="jsf-cart-form-card">
                <div style={formHeaderStyle}>
                  <div style={sectionEyebrowStyle} className="jsf-cart-kicker">Beställningsuppgifter</div>
                  <div style={formTitleStyle} className="jsf-calm-cart-section-title">Kund och kontakt</div>
                </div>
                <div style={formFieldsGridStyle} className="jsf-cart-fields">
                  <div>
                    <label htmlFor="customerName" style={fieldLabelStyle}>Kund</label>
                    <input id="customerName" type="text" value={orderer.customer || orderDetails.customer || orderer.company || ""} onChange={(e) => { setOrderDetails((prev) => ({ ...prev, customer: e.target.value })); setOrderer((prev) => ({ ...prev, customer: e.target.value, company: e.target.value })); }} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="ordererName" style={fieldLabelStyle}>Kontakt</label>
                    <input id="ordererName" type="text" value={orderer.ordererName} onChange={(e) => setOrderer((prev) => ({ ...prev, ordererName: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="ordererEmail" style={fieldLabelStyle}>E-post</label>
                    <input {...fieldProps("ordererEmail")} id="ordererEmail" type="email" value={orderer.ordererEmail} onChange={(e) => setOrderer((prev) => ({ ...prev, ordererEmail: e.target.value }))} style={inputStyle} />
                    {fieldError("ordererEmail")}
                  </div>
                  <div>
                    <label htmlFor="ordererPhone" style={fieldLabelStyle}>Telefon</label>
                    <input id="ordererPhone" type="text" value={orderer.ordererPhone} onChange={(e) => setOrderer((prev) => ({ ...prev, ordererPhone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="accountNumber" style={fieldLabelStyle}>Ansvarsnummer</label>
                    <input {...fieldProps("accountNumber")} id="accountNumber" type="text" value={orderer.accountNumber} onChange={(e) => setOrderer((prev) => ({ ...prev, accountNumber: e.target.value }))} style={inputStyle} />
                    {fieldError("accountNumber")}
                  </div>
                </div>
                <div className="jsf-cart-form-subtitle">Beställare</div>
                <p style={{ fontSize: 12, color: "#77716a", margin: "0 0 14px", lineHeight: 1.5 }}>{signedInPurchaser ? "Uppgifterna är hämtade från ditt konto. Du kan ändra dem för den här beställningen." : "Fyll i uppgifter till personen som gör beställningen."}</p>
                <div style={formFieldsGridStyle} className="jsf-cart-fields">
                  <div><label htmlFor="purchaserName" style={fieldLabelStyle}>Beställare</label><input id="purchaserName" type="text" autoComplete="name" value={orderer.purchaserName || ""} onChange={event => setOrderer(previous => ({ ...previous, purchaserName: event.target.value }))} style={inputStyle}/></div>
                  <div><label htmlFor="purchaserPhone" style={fieldLabelStyle}>Beställarens telefonnummer</label><input id="purchaserPhone" type="tel" autoComplete="tel" value={orderer.purchaserPhone || ""} onChange={event => setOrderer(previous => ({ ...previous, purchaserPhone: event.target.value }))} style={inputStyle}/></div>
                  <div><label htmlFor="purchaserEmail" style={fieldLabelStyle}>Beställarens mejl</label><input {...fieldProps("purchaserEmail")} id="purchaserEmail" type="email" autoComplete="email" value={orderer.purchaserEmail || ""} onChange={event => setOrderer(previous => ({ ...previous, purchaserEmail: event.target.value }))} style={inputStyle}/>{fieldError("purchaserEmail")}</div>
                </div>
                {cart.some(isBadgeItem) && setDelivery && <><div className="jsf-cart-form-subtitle">Leveransadress för brickor och yrkestitlar</div><div style={formFieldsGridStyle} className="jsf-cart-fields">{Object.entries({recipient:"Mottagare",company:"Verksamhet",department:"Avdelning",address:"Gatuadress",postalCode:"Postnummer",city:"Ort"}).map(([key,label])=><div key={key}><label htmlFor={"badge-delivery-"+key} style={fieldLabelStyle}>{label}</label><input id={"badge-delivery-"+key} value={delivery[key] || ""} onChange={e=>setDelivery(previous=>({...previous,[key]:e.target.value}))} style={inputStyle}/></div>)}</div></>}
                <div className="jsf-cart-form-subtitle">Projekt och objekt</div>
                <div style={formFieldsGridStyle} className="jsf-cart-fields">
                  <div>
                    <label htmlFor="customerReference" style={fieldLabelStyle}>Kundens ordernummer / referens</label>
                    <input id="customerReference" type="text" value={orderDetails.customerReference} onChange={(e) => setOrderDetails((prev) => ({ ...prev, customerReference: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="projectName" style={fieldLabelStyle}>Projekt</label>
                    <input id="projectName" type="text" value={orderDetails.projectName} onChange={(e) => setOrderDetails((prev) => ({ ...prev, projectName: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="projectCode" style={fieldLabelStyle}>Projektkod</label>
                    <input id="projectCode" type="text" value={orderDetails.projectCode} onChange={(e) => setOrderDetails((prev) => ({ ...prev, projectCode: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="managementObject" style={fieldLabelStyle}>Förvaltningsobjekt</label>
                    <input id="managementObject" type="text" value={orderDetails.managementObject} onChange={(e) => setOrderDetails((prev) => ({ ...prev, managementObject: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="targetPoint" style={fieldLabelStyle}>Målpunkt</label>
                    <input id="targetPoint" type="text" value={orderDetails.targetPoint} onChange={(e) => setOrderDetails((prev) => ({ ...prev, targetPoint: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="property" style={fieldLabelStyle}>Fastighet</label>
                    <input id="property" type="text" value={orderDetails.property} onChange={(e) => setOrderDetails((prev) => ({ ...prev, property: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="building" style={fieldLabelStyle}>Byggnad / hus</label>
                    <input id="building" type="text" value={orderDetails.building} onChange={(e) => setOrderDetails((prev) => ({ ...prev, building: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="floor" style={fieldLabelStyle}>Plan</label>
                    <input id="floor" type="text" value={orderDetails.floor} onChange={(e) => setOrderDetails((prev) => ({ ...prev, floor: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="room" style={fieldLabelStyle}>Rum</label>
                    <input id="room" type="text" value={orderDetails.room} onChange={(e) => setOrderDetails((prev) => ({ ...prev, room: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              </div>
                </>}
                </div>
              </main>

              <aside style={summaryColumnStyle} className="jsf-cart-summary-column">
                <div style={summaryCardStyle} className="jsf-cart-summary-card">
                  <div style={summaryEyebrowStyle} className="jsf-cart-kicker">Sammanfattning</div>
                  <div style={summaryTitleStyle} className="jsf-calm-cart-section-title">Din order</div>

                  <div style={summaryLineStyle}><span>Produkter</span><strong>{cart.length}</strong></div>
                  <div style={summaryLineStyle}><span>Totalt antal</span><strong>{totalItems} st</strong></div>
                  <div style={summaryGrandTotalStyle}>
                    <span>Totalt</span>
                    <strong>{formatSek(orderTotal)}</strong>
                  </div>
                  {!badgeOnly&&<div className="jsf-cart-summary-extra">
                    <label htmlFor="orderPriority" style={fieldLabelStyle}>Prioritet</label>
                    <select id="orderPriority" value={orderDetails.priority || "planeringsbar"} onChange={(e) => setOrderDetails((prev) => ({ ...prev, priority: e.target.value, ...(e.target.value !== "datum" ? { requestedCompletionDate: "" } : {}) }))} style={inputStyle}>
                      <option value="planeringsbar">Planeringsbar</option>
                      <option value="snarast">Snarast</option>
                      <option value="datum">Önskat datum</option>
                    </select>
                  {(orderDetails.priority === "datum") && (<div className="jsf-cart-date-field">
                    <label htmlFor="requestedCompletionDate" style={fieldLabelStyle}>Önskat leverans-/utförandedatum</label>
                    <DatePicker {...fieldProps("requestedCompletionDate")} id="requestedCompletionDate" value={orderDetails.requestedCompletionDate || ""} onChange={(e) => setOrderDetails((prev) => ({ ...prev, requestedCompletionDate: e.target.value }))} style={inputStyle} />
                    {fieldError("requestedCompletionDate")}
                  </div>)}
                  <label htmlFor="requestedExecutionNote" style={fieldLabelStyle}>Önskemål om utförande / tid</label>
                  <input id="requestedExecutionNote" type="text" value={orderDetails.requestedExecutionNote} onChange={(e) => setOrderDetails((prev) => ({ ...prev, requestedExecutionNote: e.target.value }))} style={inputStyle} />
                  <label htmlFor="messageToSupplier" style={fieldLabelStyle}>Beskrivning</label>
                  <textarea id="messageToSupplier" value={orderer.messageToSupplier} onChange={(e) => setOrderer((prev) => ({ ...prev, messageToSupplier: e.target.value }))} style={{ ...inputStyle, minHeight: 100, maxWidth: "100%", resize: "vertical" }} />
                  </div>}
                  <OrderPdfAttachments files={orderer.pdfAttachments||[]} onChange={files=>setOrderer(previous=>({...previous,pdfAttachments:files}))} onBusyChange={setAttachmentsBusy}/>

                  <button
                    type="button"
                    onClick={openReview}
                    disabled={Object.keys(removing).length > 0 || attachmentsBusy}
                    style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 18 }}
                  >
                    Gå vidare till orderöversikt →
                  </button>

                  <button
                    type="button"
                    onClick={setStepToLanding}
                    style={{ ...secondaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 10 }}
                  >
                    Fortsätt handla
                  </button>

                  <div style={summaryHintStyle}>
                    Du får kontrollera hela beställningen innan den skickas.
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}

        {showOrderSummary && (
          <div style={modalOverlayStyle} className="jsf-calm-cart-overlay">
            <div
              ref={reviewRef} role="dialog" aria-modal="true" aria-labelledby="jsf-order-review-title" tabIndex={-1}
              className="jsf-calm-cart-modal"
              style={{
                ...modalContentStyle,
                borderRadius: 24,
                boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
              }}
            >
              <div style={summaryModalHeaderStyle} className="jsf-calm-cart-review-header">
                <div>
                  <div style={sectionEyebrowStyle} className="jsf-cart-kicker">Bekräfta</div>
                  <h2 id="jsf-order-review-title" style={summaryModalTitleStyle}>Orderöversikt</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOrderSummary(false)}
                  style={secondaryButtonStyle}
                >
                  Stäng
                </button>
              </div>

              <CheckoutSteps current={2} onNavigate={navigateCheckout}/>
              <div style={summaryModalSectionStyle}>
                <div style={sectionTitleStyle} className="jsf-calm-cart-section-title">Produkter</div>
                <div style={summaryItemsListStyle}>
                  {cart.map((item) => {
                    const rows = getCheckoutDisplayRows(item);

                    return (
                      <div key={item.id} style={summaryItemCardStyle} className="jsf-calm-cart-review-item">
                        <div style={summaryItemGridStyle} className="jsf-calm-cart-review-grid">
                          <div>
                            <div style={summaryItemTitleStyle} className="jsf-calm-cart-product-title">
                              {item.articleNumber
                                ? `Art.nr ${item.articleNumber}`
                                : item.badgeName || item.name || "Produkt"}
                            </div>
                            {item.otBoard || item.elevatorBoard ? <CartBoardSummary item={item}/> : renderDisplayRows(rows)}
                            {renderDisplayRows([{label:"Antal",value:`${item.quantity ?? 0} st`}])}
                          </div>

                          <div style={summaryPreviewColumnStyle} className="jsf-calm-cart-review-preview">
                            <div style={summaryPreviewLabelStyle}>
                              Förhandsvisning
                            </div>
                            <div style={summaryPreviewShellStyle}>
                              {renderCartPreview(item)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={summaryInfoGridStyle}>
                <div style={{ ...summaryInfoCardStyle, gridColumn: "1 / -1" }} className="jsf-calm-cart-review-info">
                  <div style={sectionTitleStyle} className="jsf-calm-cart-section-title">{badgeOnly?"Beställare och leveransadress":"Kund, kontakt och projekt"}</div>
                  <div style={summaryInfoTextStyle} className="jsf-calm-cart-review-text">
                    {badgeOnly?<>
                    <div><strong>Namn:</strong> {orderer.purchaserName || orderer.ordererName || "-"}</div>
                    <div><strong>E-post:</strong> {orderer.purchaserEmail || orderer.ordererEmail || "-"}</div>
                    <div><strong>Telefon:</strong> {orderer.purchaserPhone || orderer.ordererPhone || "-"}</div>
                    <div><strong>Ansvarsnummer:</strong> {orderer.accountNumber || "-"}</div>
                    <div><strong>Leveransadress:</strong> {badgeAddressLines({delivery:{organization:"Region Jönköpings län",country:"Sverige",...delivery,unit:delivery.company}}).filter(Boolean).join(" · ")}</div>
                    </>:<>
                    {cart.some(isBadgeItem) && delivery.address && <div><strong>Leveransadress:</strong> {[delivery.recipient,delivery.company,delivery.department,delivery.address,[delivery.postalCode,delivery.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>}
                    <div><strong>Kund / verksamhet:</strong> {orderer.customer || orderDetails.customer || orderer.company || "-"}</div>
                    <div><strong>Kontakt:</strong> {orderer.ordererName || "-"}</div>
                    <div><strong>E-post:</strong> {orderer.ordererEmail || "-"}</div>
                    <div><strong>Telefon:</strong> {orderer.ordererPhone || "-"}</div>
                    {(orderer.purchaserName || orderer.purchaserPhone || orderer.purchaserEmail) && <>
                      <div><strong>Beställare:</strong> {orderer.purchaserName || "-"}</div>
                      <div><strong>Beställarens telefonnummer:</strong> {orderer.purchaserPhone || "-"}</div>
                      <div><strong>Beställarens mejl:</strong> {orderer.purchaserEmail || "-"}</div>
                    </>}
                    <div><strong>Ansvarsnummer:</strong> {orderer.accountNumber || "-"}</div>
                    <div><strong>Kundens referens:</strong> {orderDetails.customerReference || "-"}</div>
                    <div><strong>Projekt:</strong> {orderDetails.projectName || "-"}</div>
                    <div><strong>Projektkod:</strong> {orderDetails.projectCode || "-"}</div>
                    <div><strong>Förvaltningsobjekt:</strong> {orderDetails.managementObject || "-"}</div>
                    <div><strong>Målpunkt:</strong> {orderDetails.targetPoint || "-"}</div>
                    <div><strong>Fastighet:</strong> {orderDetails.property || "-"}</div>
                    <div><strong>Byggnad / hus:</strong> {orderDetails.building || "-"}</div>
                    <div><strong>Plan:</strong> {orderDetails.floor || "-"}</div>
                    <div><strong>Rum:</strong> {orderDetails.room || "-"}</div>
                    <div><strong>Prioritet:</strong> {orderDetails.priority === "snarast" ? "Snarast" : orderDetails.priority === "datum" ? `Önskat datum${orderDetails.requestedCompletionDate ? `: ${orderDetails.requestedCompletionDate}` : ""}` : "Planeringsbar"}</div>
                    <div><strong>Utförande / tid:</strong> {orderDetails.requestedExecutionNote || "-"}</div>
                    </>}
                    <div style={{ gridColumn: "1 / -1" }}><strong>Beskrivning:</strong> {orderer.messageToSupplier || "-"}</div>
                    <div style={{gridColumn:"1 / -1"}}><OrderPdfAttachments files={orderer.pdfAttachments||[]}/></div>
                  </div>
                </div>
              </div>

              {orderError ? <div style={orderErrorStyle}>{orderError}</div> : null}

              <div style={summaryModalActionsStyle} className="jsf-calm-cart-review-actions">
                <button
                  type="button"
                  onClick={() => setShowOrderSummary(false)}
                  className="jsf-back-link"
                  style={secondaryButtonStyle}
                >
                  ← Tillbaka
                </button>

                <button
                  type="button"
                  onClick={submitOrderToBackend}
                  style={primaryButtonStyle}
                  disabled={Boolean(orderError)}
                >
                  Skicka beställning
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

const pageStyle = {
  maxWidth: 1280,
  margin: "0 auto",
  paddingBottom: 40,
};

const checkoutHeaderStyle = {
  padding: "10px 2px 22px",
  marginBottom: 18,
  borderBottom: "1px solid #e5e7eb",
};

const checkoutHeaderTitleStyle = {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.08,
  letterSpacing: "-0.035em",
  color: "#111111",
};

const checkoutHeaderTextStyle = {
  margin: "8px 0 0",
  fontSize: 15,
  color: "#66736d",
};



const heroEyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#176b4a",
  marginBottom: 10,
};



const emptyCardStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
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
  marginBottom: 20,
  lineHeight: 1.7,
  fontSize: 16,
};

const checkoutGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 330px",
  gap: 24,
  alignItems: "start",
  marginBottom: 28,
};

const checkoutMainStyle = {
  minWidth: 0,
  display: "grid",
  gap: 22,
};

const mainColumnStyle = {
  display: "grid",
  gap: 18,
};

const summaryColumnStyle = {
  display: "grid",
};

const sectionHeadingWrapStyle = {
  marginBottom: 2,
};

const sectionHeadingStyle = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  color: "#111111",
};

const sectionEyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 8,
};

const cartListStyle = {
  display: "grid",
  gap: 12,
};

const cartItemCardStyle = {
  background: "white",
  border: "1px solid #e6ebe8",
  borderRadius: 18,
  padding: 12,
  boxShadow: "0 4px 14px rgba(0,0,0,0.035)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 180px",
  gap: 20,
  alignItems: "center",
};

const cartItemContentStyle = {
  display: "grid",
  gap: 18,
};

const cartItemArticleStyle = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#176b4a",
  marginBottom: 5,
};

const cartItemTitleStyle = {
  fontWeight: 700,
  fontSize: 19,
  marginBottom: 10,
  lineHeight: 1.2,
  color: "#111111",
};

const cartItemDetailsStyle = {
  display: "grid",
  gap: 8,
  color: "#222222",
  lineHeight: 1.55,
  fontSize: 15,
};

const cartItemActionsWrapStyle = {
  marginTop: 4,
};

const quantityRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const previewColumnStyle = {
  display: "grid",
  gap: 10,
  alignSelf: "stretch",
};

const previewLabelStyle = {
  fontWeight: 700,
  fontSize: 16,
  color: "#111111",
};

const previewShellStyle = {
  minHeight: 120,
  background: "#f7f8f9",
  border: "1px solid #ececec",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
};

const badgePreviewWrapStyle = {
  width: "100%",
  minHeight: 140,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imagePreviewWrapStyle = {
  width: "100%",
  minHeight: 140,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const professionPreviewWrapStyle = {
  width: "100%",
  minHeight: 140,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};













const previewFallbackStyle = {
  color: "#6b7280",
  fontSize: 14,
};

const summaryCardStyle = {
  background: "white",
  border: "1px solid #e2e8e4",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 24px rgba(0,0,0,0.055)",
  position: "sticky",
  top: 20,
};

const summaryEyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 8,
};

const summaryTitleStyle = {
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  color: "#111111",
  marginBottom: 18,
};






const summaryLineStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  padding: "10px 0",
  borderBottom: "1px solid #edf0ee",
  color: "#4b5563",
  fontSize: 14,
};

const summaryGrandTotalStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 16,
  padding: "20px 0 8px",
  color: "#111111",
  fontSize: 18,
};

const summaryHintStyle = {
  marginTop: 16,
  paddingTop: 16,
  borderTop: "1px solid #edf0ee",
  color: "#6b7280",
  fontSize: 13,
  lineHeight: 1.55,
};


const formsStackStyle = {
  background: "white",
  border: "1px solid #e6ebe8",
  borderRadius: 20,
  boxShadow: "0 5px 18px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

const formCardStyle = {
  background: "white",
  border: 0,
  borderBottom: "1px solid #edf0ee",
  borderRadius: 0,
  padding: 24,
  boxShadow: "none",
  display: "grid",
  gap: 18,
};

const formHeaderStyle = {
  display: "grid",
  gap: 6,
};

const formTitleStyle = {
  fontSize: 23,
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  color: "#111111",
};

const formFieldsGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
};









const fieldLabelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: 8,
  fontSize: 14,
  color: "#1f2937",
};

const summaryModalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 24,
};

const summaryModalTitleStyle = {
  margin: 0,
  fontSize: 32,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
};

const summaryModalSectionStyle = {
  marginBottom: 24,
};

const summaryItemsListStyle = {
  display: "grid",
  gap: 14,
};

const summaryItemCardStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 16,
  padding: 16,
  background: "#fafafa",
};

const summaryItemGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 220px",
  gap: 18,
  alignItems: "start",
};

const summaryItemTitleStyle = {
  fontWeight: 700,
  marginBottom: 10,
  fontSize: 18,
  color: "#111111",
};

const summaryPreviewColumnStyle = {
  display: "grid",
  gap: 8,
};

const summaryPreviewLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const summaryPreviewShellStyle = {
  minHeight: 140,
  background: "#f7f8f9",
  border: "1px solid #ececec",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
};

const summaryInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  marginBottom: 24,
};

const summaryInfoCardStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 16,
  padding: 18,
  background: "#fafafa",
};

const summaryInfoTextStyle = {
  display: "grid",
  gap: 8,
  lineHeight: 1.6,
  color: "#222222",
};

const orderErrorStyle = {
  marginBottom: 20,
  padding: "14px 16px",
  borderRadius: 12,
  background: "#fff4e5",
  border: "1px solid #ffd59e",
  color: "#8a4b08",
  fontWeight: 700,
};

const summaryModalActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};
