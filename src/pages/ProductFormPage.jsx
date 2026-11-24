import {isRoadSupplement} from '../data/roadSupplement';
import {roadSignModel} from '../data/roadSignModels';
import {product3DView} from '../data/product3DView';
import {supportsOutdoorStand3D} from '../data/outdoorStand3D';
import {newDibondSign} from '../data/dibondHelpers';
import {supportsHangingSign3D} from '../data/hangingSign3D';
import {supportsFlagSign3D} from '../data/flagSign3D';
import {supportsNameBadge3D} from '../data/nameBadge3D';
import {supportsBentMetal3D} from '../data/bentMetalModel';
import {getSalesUnit} from '../data/salesUnits';
import {decalArticleNumber} from '../data/customDecalArticles';
import SlidingRoomSignPreview from "../components/products/SlidingRoomSignPreview";
import {parkingFormat} from "../data/parkingSign";
import FittedProductPreview from "../components/products/FittedProductPreview";
import useEditorViewport from "../hooks/useEditorViewport";
import AreaPreview from "../components/products/AreaPreview";
import { isAreaPriced } from "../data/areaPricing";
import OTBoardConfigurator from "../components/products/OTBoardConfigurator";
import ElevatorBoardConfigurator from "../components/products/ElevatorBoardConfigurator";
import RevealImage from "../components/products/RevealImage";
import { getDoorSignExampleForm } from "../data/doorSignExamples";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { FieldErrorsContext } from "../components/forms/Field";
import { createCartItem, validateCurrentItem } from "../data/cartHelpers";
import { productErrorField, focusOrderField } from "../data/publicFormValidation";
import useCartFeedback from "../hooks/useCartFeedback";
import "../styles/landingCalm.css";
import "../styles/catalogCalm.css";
import "../styles/productStudio.css";
import AppHeader from "../components/layout/AppHeader";
import BadgePreview from "../components/products/BadgePreview";
import Field from "../components/forms/Field";
import PageContainer from "../components/layout/PageContainer";
import {
  hasBadgeField,
  isProfessionProductType,
} from "../data/productHelpers";
import { isProfessionFlowProduct, getRuntimeProducts } from "../data/products";
import { getFormPreviewConfig } from "../data/previewHelpers";
import {
  DEFAULT_FIELD_ORDER,
  renderConfiguredField,
} from "../data/formFieldHelpers";


function Unavailable3D({onUnavailable}){useEffect(()=>{onUnavailable?.();},[onUnavailable]);return null;}
const DoorSign3D = lazy(() => import('../components/products/DoorSign3D').catch(() => ({default:Unavailable3D})));

const NameBadge3D=lazy(()=>import('../components/products/NameBadge3D').catch(()=>({default:Unavailable3D})));
const HangingSign3D = lazy(() => import('../components/products/HangingSign3D').catch(() => ({default:Unavailable3D})));
const FlagSign3D = lazy(() => import('../components/products/FlagSign3D').catch(() => ({default:Unavailable3D})));
const ThinDecal3D = lazy(() => import('../components/products/ThinDecal3D').catch(() => ({default:Unavailable3D})));

const OutdoorStand3D=lazy(()=>import('../components/products/OutdoorStand3D').catch(()=>({default:Unavailable3D})));
const EditableDecal3D=lazy(()=>import('../components/products/EditableDecal3D').catch(()=>({default:Unavailable3D})));
const ParkingPole3D = lazy(()=>import("../components/products/ParkingPole3D"));
const BentMetal3D=lazy(()=>import('../components/products/BentMetal3D').catch(()=>({default:Unavailable3D})));

function getProductImages(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length) return product.images.filter(Boolean);
  return product.image ? [product.image] : [];
}

function renderFloatingPreview(selectedBadge, productForm, onDibondChange, hatchPosition, onHatchChange, onOTBoardChange) {
  if(["0609","0614"].includes(String(selectedBadge?.articleNumber).padStart(4,"0")))return <div style={floatingPreviewAreaStyle} className="jsf-preview-stage-shell"><div style={floatingPreviewStageStyle} className="jsf-form-preview-stage"><SlidingRoomSignPreview key={selectedBadge.articleNumber} articleNumber={selectedBadge.articleNumber} position={hatchPosition} onPositionChange={onHatchChange}/></div></div>;
  if (isAreaPriced(selectedBadge)) return <div style={floatingPreviewAreaStyle} className="jsf-preview-stage-shell"><div style={floatingPreviewStageStyle} className="jsf-form-preview-stage"><AreaPreview product={selectedBadge} form={productForm}/></div></div>;
  // Before an elevator is selected, show the appropriate article's example image.
  // After selection, BadgePreview renders only the live board, never a second image layer.
  if (selectedBadge?.previewType === "elevator_board" && !productForm?.elevatorBoardId) {
    const articleNumber = productForm?.elevatorOrderMode === "complete" ? "0807" : "0808";
    const example = getRuntimeProducts().find(p => String(p.articleNumber) === articleNumber);
    const image = example?.cardImage || example?.image;
    return <div style={floatingPreviewAreaStyle} className="jsf-preview-stage-shell"><div style={floatingPreviewStageStyle} className="jsf-form-preview-stage">{image ? <img src={image} alt={articleNumber === "0807" ? "Exempel på komplett hisstavla" : "Exempel på pappersutskrift"} style={{maxWidth:"100%",maxHeight:440,objectFit:"contain"}}/> : <div style={{padding:40,color:"#777"}}>Välj hiss för att visa förhandsvisning</div>}</div></div>;
  }
  const config = getFormPreviewConfig(selectedBadge);

  if (
    config.previewType === "parking_sign" ||
    config.previewType === "destination_cube" ||
    config.previewType === "parking_pole" ||
    config.previewType === "dibond_sign" ||
    config.previewType === "ot_board" ||
    config.previewType === "elevator_board" ||
    config.previewType === "profession" ||
    config.previewType === "badge" ||
    config.previewType === "hanging_sign" ||
    config.previewType === "door_sign"
  ) {
    return (
      <div style={floatingPreviewAreaStyle} className="jsf-preview-stage-shell">
        <div style={floatingPreviewStageStyle} className="jsf-form-preview-stage">
          <BadgePreview
            interactiveWhiteboard
            onDibondChange={onDibondChange}
            onOTBoardChange={onOTBoardChange}
            badgeId={config.badgeId}
            productType={config.productType}
            productForm={getDoorSignExampleForm(selectedBadge, productForm)}
            product={selectedBadge}
            maxWidth={Math.min(config.maxWidth || 600, 600)}
          />
        </div>

        <div style={floatingPreviewShadowStyle} className="jsf-media-shadow" />
      </div>
    );
  }

  if (selectedBadge?.image) {
    return (
      <div style={floatingPreviewAreaStyle} className="jsf-preview-stage-shell">
        <div style={floatingPreviewStageStyle} className="jsf-form-preview-stage">
          <RevealImage
            className="jsf-form-product-image"
            src={selectedBadge.image}
            alt={selectedBadge.name || "Produktbild"}
            style={{
              width: "100%",
              maxWidth: config.maxWidth || 700,
              height: "auto",
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.10))",
            }}
          />
        </div>

        <div style={floatingPreviewShadowStyle} className="jsf-media-shadow" />
      </div>
    );
  }

  return null;
}

export default function ProductFormPage({
  getHeaderProps,
  goBackFromForm,
  backButtonStyle,
  selectedCategory,
  openCategory,
  selectedBadge,
  selectedProductType,
  successMessage,
  productForm,
  setProductForm,
  addCurrentItemToCart,
  inputStyle,
}) {
  const { isAdded, confirmAdded } = useCartFeedback();
  const feedbackId = selectedBadge?.id || selectedProductType?.id || "product";
  const editorRef = useEditorViewport(feedbackId);
  const [activeTab, setActiveTab] = useState("customize");
  const [activeImage, setActiveImage] = useState(0);
  const [threeUnavailable,setThreeUnavailable] = useState(null);
  const [hatchPosition,setHatchPosition] = useState(1);
  const frontRef = useRef(null);
  // The inspector and live preview must share one configuration from first
  // opening, including before the customer has typed or saved any changes.
  useEffect(()=>{
    if(selectedBadge?.previewType==='dibond_sign'&&!productForm.dibondSign){
      setProductForm(previous=>previous.dibondSign?previous:{...previous,dibondSign:newDibondSign(selectedBadge)});
    }
  },[selectedBadge,productForm.dibondSign,setProductForm]);
  const [frontViewRequest,setFrontViewRequest]=useState(0);
  const outdoorStand3D=supportsOutdoorStand3D(selectedBadge);
  const editableDecal=product3DView(selectedBadge,productForm)==='editable';
  const bentMetal=supportsBentMetal3D(selectedBadge);
  const nameBadge3D=supportsNameBadge3D(selectedBadge);
  const flagSign3D=supportsFlagSign3D(selectedBadge);
  const hangingSign3D=supportsHangingSign3D(selectedBadge,productForm);
  const supports3D = selectedBadge?.previewType==='parking_pole' || outdoorStand3D || editableDecal || hangingSign3D || flagSign3D || nameBadge3D || bentMetal || ["0601","0602","0603","0604","0607","0608","0609","0610","0614","0616","0737","0720","0721","0722","0723","0724"].includes(String(selectedBadge?.articleNumber || "").padStart(4,"0"));
  const view3D = supports3D && threeUnavailable!==feedbackId;
  const [attempted, setAttempted] = useState(false);
  const [nativeErrors, setNativeErrors] = useState({});
  const formRef = useRef(null);
  const validationMessage = attempted ? validateCurrentItem(selectedBadge, selectedProductType, productForm) : null;
  const errorField = validationMessage ? productErrorField(validationMessage, selectedBadge) : null;
  const fieldErrors = { ...nativeErrors, ...(errorField ? { [errorField]: validationMessage } : {}) };
  useEffect(() => { setAttempted(false); setNativeErrors({}); setActiveTab("customize"); setActiveImage(0); setThreeUnavailable(null); setHatchPosition(1); setFrontViewRequest(0); }, [feedbackId]);
  function submitProduct(event) {
    event.preventDefault();
    const message = validateCurrentItem(selectedBadge, selectedProductType, productForm);
    setAttempted(true);
    if (message) {
      const field = productErrorField(message, selectedBadge);
      if (field) requestAnimationFrame(() => focusOrderField(field));
      return;
    }
    const invalid = [...(formRef.current?.querySelectorAll("input, select, textarea") || [])].find(control => !control.validity.valid);
    if (invalid) {
      setNativeErrors({ [invalid.id]: invalid.validity.valueMissing ? "Fyll i detta fält." : "Kontrollera värdet i detta fält." });
      requestAnimationFrame(() => focusOrderField(invalid.id));
      return;
    }
    if (addCurrentItemToCart(formRef.current?.closest(".jsf-product-layout")?.querySelector(".jsf-product-preview")) === true) { confirmAdded(feedbackId); setAttempted(false); setNativeErrors({}); }
  }
  const isProfession =
    selectedBadge?.previewType === "profession" ||
    isProfessionFlowProduct(selectedBadge) ||
    isProfessionProductType(selectedProductType);

  const hasSelectedProduct = isProfession || Boolean(selectedBadge);

  function updateFormValue(key, value) {
    setProductForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const images = getProductImages(selectedBadge);
  let unitPrice = null;
  if (selectedBadge && selectedBadge.unitPrice != null) {
    try { unitPrice = createCartItem(selectedBadge, selectedProductType, productForm).unitPrice; } catch { /* A board or size may still need to be selected. */ }
  }
  const tabs = [{id:"customize",label:"Anpassa"},{id:"information",label:"Information"},{id:"dimensions",label:"Mått & utförande"}];
  const tabKey = String(feedbackId).replace(/[^a-z0-9_-]/gi,"-");
  function selectTab(event,index) {
    const next = event.key === "ArrowRight" ? (index+1)%tabs.length : event.key === "ArrowLeft" ? (index+tabs.length-1)%tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length-1 : null;
    if(next === null)return;
    event.preventDefault(); setActiveTab(tabs[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  }

  function renderProductFields() {
    if(selectedBadge?.previewType==="ot_board") return <OTBoardConfigurator product={selectedBadge} form={productForm} onChange={changes=>setProductForm(previous=>({...previous,...changes}))}/>;
    if(selectedBadge?.previewType==="elevator_board") return <ElevatorBoardConfigurator product={selectedBadge} form={productForm} onChange={changes=>setProductForm(previous=>({...previous,...changes}))}/>;
    if (!selectedBadge?.fields && !isAreaPriced(selectedBadge)) return null;

    return DEFAULT_FIELD_ORDER.map((fieldKey) => {
      if (!hasBadgeField(selectedBadge, fieldKey)) {
        return null;
      }

      return renderConfiguredField(fieldKey, {
        Field,
        selectedBadge,
        productForm,
        updateFormValue,
        setProductForm,
        inputStyle,
        editorView: activeTab === "dimensions" ? "settings" : "content",
        compactDoorFields: true,
      });
    });
  }

  return (
    <PageContainer variant="public" className="jsf-calm-home-shell jsf-calm-catalog-shell jsf-product-studio">
      <AppHeader {...getHeaderProps()} />

      <div style={pageStyle} className="jsf-product">
        <button type="button" onClick={goBackFromForm} style={backButtonStyle} className="jsf-calm-back jsf-back-link">
          ← Tillbaka
        </button>

        <div style={layoutStyle} className="jsf-public-content">

          <div key={feedbackId} style={{...contentColumnStyle, "--product-preview-width": `${Math.min(getFormPreviewConfig(selectedBadge).maxWidth || 600, 600)}px`}} className="jsf-product-layout">
            {!hasSelectedProduct ? (
              <div style={emptyStateCardStyle}>
                <h1 style={emptyTitleStyle}>Ingen produkt vald</h1>

                <p style={emptyTextStyle}>
                  Du har hamnat på formulärsidan utan att någon produkt är vald.
                  Gå tillbaka och välj en produkt i katalogen.
                </p>

                <button
                  type="button"
                  onClick={goBackFromForm}
                  style={fallbackActionStyle} className="jsf-back-link"
                >
                  ← Tillbaka till katalogen
                </button>
              </div>
            ) : (
              <>
                <header className="jsf-product-intro">
                  <div className="jsf-studio-breadcrumb"><button type="button" onClick={goBackFromForm}>Beställningsportal</button><span>/</span><span>{selectedCategory?.title || "Produkter"}</span>{selectedBadge?.articleNumber && <><span>/</span><span>{decalArticleNumber(selectedBadge,productForm)}</span></>}</div>
                  <h1>{selectedBadge?.previewType === "elevator_board" ? "Våningsplans- och hisstavlor" : (selectedBadge?.name || selectedProductType?.title || "Anpassa skylt")}</h1>
                  
                </header>

                {successMessage ? (
                  <div style={successStyle} className="jsf-calm-notice" role="status">{successMessage}</div>
                ) : null}

                <div ref={editorRef} className="jsf-product-workspace">
                <div className="jsf-editor-preview-column" onPointerDownCapture={()=>{if(activeTab==="dimensions")setActiveTab("customize");}}>
                <div style={previewShellStyle} className="jsf-product-preview" data-door-photo={supports3D || undefined}>
                  <div ref={frontRef} className="jsf-studio-live-preview" data-three={view3D} aria-hidden={view3D || undefined} hidden={activeImage !== 0}><FittedProductPreview align="center">{renderFloatingPreview(selectedBadge, productForm,sign=>setProductForm(previous=>({...previous,dibondSign:sign})),hatchPosition,setHatchPosition,otBoard=>setProductForm(previous=>({...previous,otBoard,otBoardEdited:true})))}</FittedProductPreview></div>
                  {(!roadSignModel(selectedBadge)||isRoadSupplement(selectedBadge))&&(outdoorStand3D||bentMetal||editableDecal)&&<button type="button" className="jsf-studio-3d-toggle" onClick={()=>{setFrontViewRequest(value=>value+1);setActiveTab("customize");}}>Redigera framifrån</button>}
                  {view3D && supports3D && <Suspense fallback={<p className="jsf-door-3d-status" role="status">Laddar 3D-vyn…</p>}>{selectedBadge.previewType==='parking_pole'?<ParkingPole3D form={productForm} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:outdoorStand3D?<OutdoorStand3D key={selectedBadge.id} product={selectedBadge} sourceRef={frontRef} form={productForm} frontViewRequest={frontViewRequest} onSignChange={sign=>setProductForm(previous=>({...previous,dibondSign:sign}))} onEditFront={()=>setActiveTab("customize")} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:hangingSign3D?<HangingSign3D key={selectedBadge.id} product={selectedBadge} sourceRef={frontRef} form={productForm} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:flagSign3D?<FlagSign3D key={selectedBadge.id} articleNumber={String(selectedBadge.articleNumber)} image={selectedBadge.image||images[0]} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:nameBadge3D?<NameBadge3D key={selectedBadge.id} product={selectedBadge} sourceRef={frontRef} form={productForm} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:editableDecal?<EditableDecal3D frontViewRequest={frontViewRequest} onSignChange={sign=>setProductForm(previous=>({...previous,dibondSign:sign}))} onEditFront={()=>setActiveTab("customize")} product={selectedBadge} articleNumber={String(selectedBadge.articleNumber)} sourceRef={frontRef} form={productForm} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:bentMetal?<BentMetal3D frontViewRequest={frontViewRequest} onSignChange={sign=>setProductForm(previous=>selectedBadge.previewType==='parking_sign'?({...previous,parkingSymbols:sign.symbols}):({...previous,dibondSign:sign}))} onEditFront={()=>setActiveTab("customize")} product={selectedBadge} articleNumber={String(selectedBadge.articleNumber)} sourceRef={frontRef} form={productForm} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:['0737','0720','0721','0722','0723','0724'].includes(String(selectedBadge.articleNumber))?<ThinDecal3D articleNumber={String(selectedBadge.articleNumber)} image={selectedBadge.image||images[0]} onUnavailable={()=>setThreeUnavailable(feedbackId)}/>:<DoorSign3D key={selectedBadge.articleNumber} articleNumber={String(selectedBadge.articleNumber).padStart(4,"0")} slidePosition={hatchPosition} onSlide={setHatchPosition} onUnavailable={()=>setThreeUnavailable(feedbackId)} sourceRef={frontRef} form={productForm} onEdit={()=>{setActiveTab("customize");requestAnimationFrame(()=>formRef.current?.querySelector('#doorHeading,#customText')?.focus());}}/>}</Suspense>}
                  {activeImage > 0 && !supports3D && <img className="jsf-studio-detail-image" src={images[activeImage-1]} alt={(selectedBadge?.name || "Produkt")+" – bild "+activeImage}/>}
                  {images.length > 0 && !supports3D && <><button type="button" className="jsf-studio-gallery-arrow jsf-studio-gallery-prev" aria-label="Föregående produktbild" onClick={()=>setActiveImage(previous=>(previous+images.length)%(images.length+1))}>‹</button><button type="button" className="jsf-studio-gallery-arrow jsf-studio-gallery-next" aria-label="Nästa produktbild" onClick={()=>setActiveImage(previous=>(previous+1)%(images.length+1))}>›</button></>}
                </div>
                {images.length > 0 && !supports3D && <div className="jsf-studio-thumbnails" aria-label="Produktbilder">
                  <button type="button" aria-label="Visa din anpassade skylt" aria-pressed={activeImage===0} onClick={()=>setActiveImage(0)}><span className="jsf-studio-live-icon" aria-hidden="true">✎</span><span>Din skylt</span></button>
                  {images.map((src,index)=><button type="button" key={src+index} aria-label={"Visa produktbild "+(index+1)} aria-pressed={activeImage===index+1} onClick={()=>setActiveImage(index+1)}><img src={String(selectedBadge?.articleNumber)==="0602" && index===0 ? `${process.env.PUBLIC_URL||''}/door-photo-0602.webp` : src} alt=""/></button>)}
                </div>}

                </div>
                <FieldErrorsContext.Provider value={fieldErrors}>
                <form ref={formRef} noValidate onChangeCapture={event => {
                  setActiveImage(0);
                  const id = event.target.id;
                  if (nativeErrors[id]) setNativeErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
                }}
                  onSubmit={submitProduct}
                  style={{...formCardStyle,...(isAreaPriced(selectedBadge)?{minWidth:0,gridTemplateColumns:"minmax(0,1fr)"}:{})}}
                  className="jsf-product-fields" tabIndex={0} aria-label="Produktens inställningar"
                >
                  <div className="jsf-studio-tabs" role="tablist" aria-label="Produktuppgifter">
                    {tabs.map((tab,index)=><button key={tab.id} type="button" role="tab" id={"studio-"+tabKey+"-"+tab.id} aria-controls={"studio-"+tabKey+"-"+tab.id+"-panel"} aria-selected={activeTab===tab.id} tabIndex={activeTab===tab.id?0:-1} onKeyDown={event=>selectTab(event,index)} onClick={()=>setActiveTab(tab.id)}>{tab.label}</button>)}
                  </div>
                  <div role="tabpanel" id={"studio-"+tabKey+"-"+(selectedBadge?.previewType === "dibond_sign" && activeTab === "dimensions" ? "dimensions" : "customize")+"-panel"} aria-labelledby={"studio-"+tabKey+"-"+(selectedBadge?.previewType === "dibond_sign" && activeTab === "dimensions" ? "dimensions" : "customize")} hidden={activeTab!=="customize" && !(selectedBadge?.previewType === "dibond_sign" && activeTab === "dimensions")} className="jsf-studio-customize">
                    <div style={{...fieldsWrapperStyle,...(isAreaPriced(selectedBadge)?{minWidth:0,gridTemplateColumns:"minmax(0,1fr)"}:{})}} className="jsf-product-field-list">{renderProductFields()}</div>
                  </div>
                  <section role="tabpanel" id={"studio-"+tabKey+"-information-panel"} aria-labelledby={"studio-"+tabKey+"-information"} hidden={activeTab!=="information"} className="jsf-studio-information">
                    <h2>Om produkten</h2><p>{selectedBadge?.desc || selectedBadge?.name || selectedProductType?.title}</p>
                    {selectedBadge?.articleNumber && <p>Artikelnummer: {decalArticleNumber(selectedBadge,productForm)}</p>}
                  </section>
                  {selectedBadge?.previewType !== "dibond_sign" && <section role="tabpanel" id={"studio-"+tabKey+"-dimensions-panel"} aria-labelledby={"studio-"+tabKey+"-dimensions"} hidden={activeTab!=="dimensions"} className="jsf-studio-information">
                    <h2>Mått & utförande</h2>
                {selectedBadge && (
                  <div style={productMetaStyle} className="jsf-product-meta">
                    <div style={productMetaTitleStyle} className="jsf-product-meta-name">{selectedBadge.previewType === "elevator_board" ? "Välj utförande och hiss" : selectedBadge.name}</div>
                    {selectedBadge.desc && selectedBadge.previewType !== "elevator_board" ? <div style={productMetaDescStyle}>{selectedBadge.desc}</div> : null}
                    {(selectedBadge.articleNumber || selectedBadge.format) ? (
                      <div style={productSpecsStyle} aria-label="Produktinformation">
                        <div style={productSpecsHeadingStyle} className="jsf-product-specs-heading">Produktinformation</div>
                        {selectedBadge.articleNumber && (selectedBadge.previewType!=="elevator_board" || productForm.elevatorBoardId) ? (
                          <div style={productSpecRowStyle}>
                            <span style={productSpecLabelStyle}>Artikelnummer</span>
                            <span>{selectedBadge.previewType==="elevator_board" ? ((productForm.elevatorBoardVariant?.id===productForm.elevatorBoardId?productForm.elevatorBoardVariant:selectedBadge.elevatorBoards?.find(v=>v.id===productForm.elevatorBoardId))?.options?.[productForm.elevatorOrderMode||"print"]?.articleNumber||"") : decalArticleNumber(selectedBadge,productForm)}</span>
                          </div>
                        ) : null}
                        {selectedBadge.format ? (
                          <div style={productSpecRowStyle}>
                            <span style={productSpecLabelStyle}>Format / mått</span>
                            <span>{selectedBadge.previewType==="parking_sign"?parkingFormat(selectedBadge):selectedBadge.productType==="dekal"&&productForm.dibondSign?`${productForm.dibondSign.widthMm} \u00d7 ${productForm.dibondSign.heightMm} mm`:selectedBadge.format}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}

                    {selectedBadge?.fasteningOptions?.length > 0 && <p>Fästen: {selectedBadge.fasteningOptions.join(", ")}</p>}
                  </section>}

                  {validationMessage && !errorField && <p className="jsf-field-error" role="alert">{validationMessage}</p>}
                  <div style={formActionsStyle} className="jsf-product-submit-bar">
                    {Number.isFinite(unitPrice) && <div className="jsf-studio-price"><span>Pris per {getSalesUnit(selectedBadge)}</span><strong>{unitPrice.toLocaleString("sv-SE",{maximumFractionDigits:2})} kr</strong><small>exkl. moms</small></div>}
                    <button
                      type="submit"
                      style={addToCartLinkStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.gap = "10px";
                        e.currentTarget.style.opacity = "0.8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.gap = "6px";
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      {isAdded(feedbackId) ? "✓ Tillagd" : "Lägg i kundkorg"}
                      <span aria-hidden="true" style={addToCartArrowStyle}>{isAdded(feedbackId) ? "" : "→"}</span>
                    </button>
                  </div>
                </form>
                </FieldErrorsContext.Provider>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

const pageStyle = {
  maxWidth: 1280,
  margin: "0 auto",
  paddingTop: 28,
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
  gap: 20,
  maxWidth: 920,
};















const productMetaStyle = {
  display: "grid",
  gap: 6,
  padding: "2px 2px 0",
};

const productMetaTitleStyle = {
  fontWeight: 700,
  fontSize: 22,
  color: "#111111",
  lineHeight: 1.2,
};

const productMetaDescStyle = {
  color: "#5f6368",
  lineHeight: 1.6,
  fontSize: 15,
};

const productSpecsStyle = {
  display: "grid",
  gap: 10,
  marginTop: 10,
  padding: "16px 18px",
  border: "1px solid #e6e9e7",
  borderRadius: 12,
  background: "#fafbfa",
  maxWidth: 560,
};
const productSpecsHeadingStyle = {
  color: "#506057",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const productSpecRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(125px, 40%) minmax(0, 1fr)",
  gap: 12,
  alignItems: "baseline",
  fontSize: 14,
  color: "#202a25",
};
const productSpecLabelStyle = { color: "#6b746e" };

const successStyle = {
  background: "#eef8f1",
  border: "1px solid #d7eddd",
  color: "#1b5e20",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 600,
};

const previewShellStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 24,
  padding: 0,
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
};

const floatingPreviewAreaStyle = {
  position: "relative",
  minHeight: 290,
  padding: "34px 28px 18px",
  background:
    "linear-gradient(180deg, #fbfbfc 0%, #f5f6f7 72%, #f2f3f4 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const floatingPreviewStageStyle = {
  width: "100%",
  minHeight: 210,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 2,
};

const floatingPreviewShadowStyle = {
  width: "52%",
  height: 18,
  marginTop: 10,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.12)",
  filter: "blur(14px)",
  transform: "translateY(-1px)",
};

const formCardStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
  display: "grid",
  gap: 22,
};

const fieldsWrapperStyle = {
  display: "grid",
  gap: 18,
};

const formActionsStyle = {
  paddingTop: 4,
};

const addToCartLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 16,
  fontWeight: 700,
  color: "#009846",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  transition: "all 0.18s ease",
  width: "fit-content",
};

const addToCartArrowStyle = {
  fontSize: 18,
  lineHeight: 1,
};

const fallbackActionStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 16,
  fontWeight: 700,
  color: "#009846",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  transition: "all 0.18s ease",
  width: "fit-content",
};

const emptyStateCardStyle = {
  background: "white",
  border: "1px solid #ececec",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const emptyTitleStyle = {
  fontSize: 36,
  marginTop: 0,
  marginBottom: 12,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
};

const emptyTextStyle = {
  color: "#5f6368",
  marginTop: 0,
  marginBottom: 20,
  lineHeight: 1.7,
  fontSize: 16,
};
