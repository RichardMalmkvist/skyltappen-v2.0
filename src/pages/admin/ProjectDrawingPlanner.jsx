import ProjectProduct3DPreview from '../../components/projects/ProjectProduct3DPreview';
import OrderDeleteDialog from '../../components/orders/OrderDeleteDialog';
import OTBoardConfigurator from '../../components/products/OTBoardConfigurator';
import ElevatorBoardConfigurator from '../../components/products/ElevatorBoardConfigurator';
import SignDetails,{Original} from './ProjectSignDetails';
import {isStackable} from '../../data/hangingStack';
import {roadAssemblyLayout,roadAssemblyError} from '../../data/roadSignAssembly';
import {roadSignModel} from '../../data/roadSignModels';
import HangingStackFields from "../../components/products/HangingStackFields";
import {directionPanelSigns} from '../../data/directionSigns';
import {isHanging,hangingStackEntries,withoutHangingStack,validateProjectConfiguration} from "../../data/hangingStack";
import {validateCurrentItem} from "../../data/cartHelpers";
import QuantityInput from "../../components/forms/QuantityInput";
import useEditorViewport from "../../hooks/useEditorViewport";
import {decalArticleNumber} from '../../data/customDecalArticles';
import {hangingTargetError} from "../../data/hangingTargetLayout";
import {parkingError,parkingConfig} from "../../data/parkingSign";
import DatePicker from '../../components/forms/DatePicker';
import useModalFocus from "../../hooks/useModalFocus";
import {isDestinationCube,getDestinationCube,destinationCubeError} from "../../data/destinationCube";
import {getHangingSignSymbolAssets} from "../../data/hangingSignSymbols";
import {showFieldError} from "../../components/forms/InlineValidation";
import {productErrorField} from "../../data/publicFormValidation";
import SaveDrawingToLibraryDialog from "./SaveDrawingToLibraryDialog";
import DrawingDetailLayer from "./DrawingDetailLayer";
import { nameBadgeFormError } from "../../data/nameBadge0201";
import { hangingBackTextError } from "../../data/hangingSignBackText";
import AreaPreview from "../../components/products/AreaPreview";
import { isAreaPriced, areaDimensionsError, stripeSettingsError, calculateAreaPricing } from "../../data/areaPricing";
import {newDibondSign,validateDibondSign} from "../../data/dibondHelpers";
import { getDoorSignExampleForm } from "../../data/doorSignExamples";
import { isPersonalDoorSign } from "../../data/doorSignDimensions";
import "../../styles/projectSignCalm.css";
import "./ProjectDrawingPlanner.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import Field from "../../components/forms/Field";
import BadgePreview from "../../components/products/BadgePreview";
import {hasPhotographicDoorPreview} from "../../data/doorPhotoPreview";
import { getFormPreviewConfig } from "../../data/previewHelpers";
import { DEFAULT_FIELD_ORDER, renderConfiguredField } from "../../data/formFieldHelpers";
import { hasBadgeField } from "../../data/productHelpers";
import { getEmptyProductForm, getHangingSignInitialForm, getProfessionInitialForm } from "../../data/formDefaults";
import { openPdf } from "../../data/browserPdf";

const MIN_DRAWING_ZOOM = .1;
const MAX_DRAWING_ZOOM = 40;
const ELEVATOR_CATEGORY = "vaningsplans-och-hisstavlor";
const ELEVATOR_TITLE = "Våningsplans- och hisstavlor";


const label = marker => marker.position || "S???";

// Prefer the editable source fields over the legacy, pre-composed marker text.
export function configuredMarkerText(form={}) {
  if(form.dibondSign?.uploadedArtwork||form.otBoard?.uploadedArtwork)return (form.dibondSign?.uploadedArtwork||form.otBoard.uploadedArtwork).name;
  if(form.otBoard)return form.otBoardName||null;
  if(form.elevatorBoard)return form.elevatorBoardVariant?.name||null;
  if(Array.isArray(form.dibondSign?.lines))return directionPanelSigns(form.dibondSign).map(panel=>panel.lines?.map(line=>String(line.text||'').trim()).filter(Boolean).join(' / ')).filter(Boolean).join(' · ');
  if(form.hangingSignWithoutText)return '';
  const values=[form.doorHeading,form.doorExtra,form.doorName,form.doorTitle,form.customText,form.customTextLine1,form.customTextLine2,form.name,form.title];
  const text=[...new Set(values.filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()))].join(' / ');
  return text||null;
}
export function markerTextSummary(marker={}) {
  const config=marker.configuration||{};
  const front=configuredMarkerText(config);
  const back=config.hangingSignDifferentBackText?[config.backTextLine1,config.backTextLine2].filter(Boolean).join(' / '):'';
  return [...new Set([front??marker.text??marker.signText??'',back].filter(Boolean))].join(' · ');
}

function ProjectSignPreview({ product, formValues, preview, supported, onDibondChange, onOTBoardChange }) {
  const containerRef = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(220);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const measure = () => {
      const width = Math.floor(container.clientWidth);
      if (width > 0) setAvailableWidth(width);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(container);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return <div ref={containerRef} className="jsf-sign-preview-content">
    {isAreaPriced(product) ? <AreaPreview product={product} form={formValues} maxWidth={availableWidth}/> : (supported||hasPhotographicDoorPreview(product))
      ? <BadgePreview photographic onOTBoardChange={onOTBoardChange} onDibondChange={onDibondChange} badgeId={preview.badgeId} productType={preview.productType} productForm={getDoorSignExampleForm(product, formValues)} product={product} maxWidth={availableWidth} />
      : product.image ? <img src={product.image} alt={product.name} /> : <span>Ingen produktbild</span>}
  </div>;
}

export default function ProjectDrawingPlanner({ project, drawing, headers, catalog, onClose, onSaved, registerMode = false, registerUrl, onRegisterSave, readOnly = false, signOnly = false, initialSign = null }) {
  const [corelEditor,setCorelEditor]=useState(null);
  const plannerRef = useRef(null);
  const sidePanelId = useId();
  const [sideHidden, setSideHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const scrollRef = useRef(null);
  const zoomRef = useRef(1);
  const zoomAnchorRef = useRef(null);
  const touchGestureRef = useRef(null);
  const lastTouchMoveRef = useRef(0);
  const mousePanRef = useRef(null);
  const pdfRef = useRef(null);
  const renderRef = useRef(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pdfReady, setPdfReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [renderZoom, setRenderZoom] = useState(1);
  const [baseSize, setBaseSize] = useState({ width: 850, height: 1100 });
  const [markers, setMarkers] = useState((drawing.markers || []).map((m, i) => ({ ...m, position: m.position || `S${String(m.number || i + 1).padStart(3, "0")}`, articleId: m.articleId || (catalog?.articles || []).find(a => String(a.articleNumber) === String(m.articleNumber))?.id || "", text: m.text || m.signText || "" })));
  const [selected, setSelected] = useState(null);
  const [markerSearch, setMarkerSearch] = useState("");
  const [visibleGroups, setVisibleGroups] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [renderedPage, setRenderedPage] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [duplicateSource,setDuplicateSource]=useState(null);
  const [busy, setBusy] = useState(false);
  const [copyToLibrary,setCopyToLibrary]=useState(false);
  const [libraryCopyMessage,setLibraryCopyMessage]=useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ articleId: "", text: "", symbols: "", quantity: 1, notes: "" });
  const [dragged, setDragged] = useState(null);
  const markerDragRef=useRef(null);
  const suppressMarkerClickRef=useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [deleteError,setDeleteError]=useState('');
  const modalRef=useRef(null);
  function closeEditor(){if(!busy){setModalOpen(false);setSelected(null);if(signOnly)onClose();}}
  useModalFocus(modalOpen,modalRef,closeEditor);
  useEditorViewport(modalOpen,modalRef);
  const [panning, setPanning] = useState(false);

  function startMousePan(event) {
    if (event.pointerType !== "mouse" || event.button !== 0 || placing || modalOpen || dragged || event.target.closest(".jsf-marker")) return;
    const scroll = scrollRef.current;
    const rect = scroll.getBoundingClientRect();
    // Leave native scrollbars usable too.
    if (event.clientX >= rect.left + scroll.clientLeft + scroll.clientWidth || event.clientY >= rect.top + scroll.clientTop + scroll.clientHeight) return;
    event.preventDefault();
    scroll.setPointerCapture(event.pointerId);
    mousePanRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setPanning(true);
  }
  function endMousePan(event) {
    const pan = mousePanRef.current;
    if (!pan || (event?.pointerId != null && event.pointerId !== pan.pointerId)) return;
    mousePanRef.current = null;
    setPanning(false);
    const scroll = scrollRef.current;
    if (scroll?.hasPointerCapture(pan.pointerId)) scroll.releasePointerCapture(pan.pointerId);
  }
  function moveMousePan(event) {
    const pan = mousePanRef.current;
    if (!pan || event.pointerId !== pan.pointerId) return;
    if (!(event.buttons & 1)) { endMousePan(event); return; }
    event.preventDefault();
    scrollRef.current.scrollLeft -= event.clientX - pan.x;
    scrollRef.current.scrollTop -= event.clientY - pan.y;
    pan.x = event.clientX;
    pan.y = event.clientY;
  }

  useEffect(() => {
    const blur = () => {
      mousePanRef.current = null;
      setPanning(false);
    };
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, []);

  const changeZoom = useCallback((next, pointer = null) => {
    const value = Math.max(MIN_DRAWING_ZOOM, Math.min(MAX_DRAWING_ZOOM, next));
    if (value === zoomRef.current) return;
    const scroll = scrollRef.current;
    const stage = stageRef.current;
    if (scroll && stage) {
      const rect = stage.getBoundingClientRect();
      const viewport = scroll.getBoundingClientRect();
      const clientX = pointer?.clientX ?? viewport.left + scroll.clientLeft + scroll.clientWidth / 2;
      const clientY = pointer?.clientY ?? viewport.top + scroll.clientTop + scroll.clientHeight / 2;
      if (rect.width > 0 && rect.height > 0) {
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        zoomAnchorRef.current = { x, y, clientX: rect.left + x * rect.width, clientY: rect.top + y * rect.height };
      }
    }
    zoomRef.current = value;
    setZoom(value);
  }, []);

  function fitDrawing() {
    const scroll = scrollRef.current;
    if (!scroll || !baseSize.width || !baseSize.height) return;
    const style = window.getComputedStyle(scroll);
    const width = scroll.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = scroll.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const value = Math.max(.1, Math.min(1, width / baseSize.width, height / baseSize.height));
    zoomAnchorRef.current = null;
    zoomRef.current = value;
    setZoom(value);
    window.requestAnimationFrame(() => { if (scrollRef.current) { scrollRef.current.scrollLeft = 0; scrollRef.current.scrollTop = 0; } });
  }

  async function toggleFullscreen() {
    if (expanded) {
      if (document.fullscreenElement === plannerRef.current) {
        try { await document.exitFullscreen(); } catch (_) { /* The fixed workspace also works without the Fullscreen API. */ }
      }
      setExpanded(false);
      return;
    }
    setExpanded(true);
    try { await plannerRef.current?.requestFullscreen?.(); } catch (_) { /* iOS and embedded browsers use the fixed workspace instead. */ }
  }

  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === plannerRef.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  useEffect(() => {
    if (!expanded) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = event => { if (event.key === "Escape" && !document.fullscreenElement && !modalOpen) setExpanded(false); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", escape); };
  }, [expanded, modalOpen]);

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;
    const scroll = scrollRef.current;
    const stage = stageRef.current;
    if (!anchor || !scroll || !stage) return;
    const rect = stage.getBoundingClientRect();
    scroll.scrollLeft += rect.left + anchor.x * rect.width - anchor.clientX;
    scroll.scrollTop += rect.top + anchor.y * rect.height - anchor.clientY;
  }, [zoom]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return undefined;
    const wheel = event => {
      if (modalOpen || markerDragRef.current || dragged || event.shiftKey || event.deltaY === 0) return;
      // A native non-passive listener prevents page scrolling while zooming.
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroll.clientHeight : 1);
      const delta = Math.max(-100, Math.min(100, pixels));
      changeZoom(zoomRef.current * Math.exp(-delta * .002), event);
    };
    scroll.addEventListener("wheel", wheel, { passive: false });
    return () => scroll.removeEventListener("wheel", wheel);
  }, [changeZoom, modalOpen, dragged]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return undefined;
    const geometry = touches => {
      const first = touches[0], second = touches[1];
      return second
        ? { clientX: (first.clientX + second.clientX) / 2, clientY: (first.clientY + second.clientY) / 2, distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) }
        : { clientX: first.clientX, clientY: first.clientY, distance: 0 };
    };
    const start = event => {
      if (modalOpen || dragged || !event.touches.length) return;
      if (event.touches.length === 1 && (placing || event.target.closest(".jsf-marker"))) return;
      touchGestureRef.current = geometry(event.touches);
      if (event.touches.length > 1) { event.preventDefault(); lastTouchMoveRef.current = Date.now(); }
    };
    const move = event => {
      const previous = touchGestureRef.current;
      if (!previous || modalOpen || dragged || !event.touches.length) return;
      event.preventDefault();
      const next = geometry(event.touches);
      scroll.scrollLeft -= next.clientX - previous.clientX;
      scroll.scrollTop -= next.clientY - previous.clientY;
      if (next.distance > 0 && previous.distance > 0) changeZoom(zoomRef.current * next.distance / previous.distance, next);
      touchGestureRef.current = next;
      lastTouchMoveRef.current = Date.now();
    };
    const end = event => {
      touchGestureRef.current = touchGestureRef.current && event.touches.length ? geometry(event.touches) : null;
    };
    scroll.addEventListener("touchstart", start, { passive: false });
    scroll.addEventListener("touchmove", move, { passive: false });
    scroll.addEventListener("touchend", end);
    scroll.addEventListener("touchcancel", end);
    return () => {
      scroll.removeEventListener("touchstart", start);
      scroll.removeEventListener("touchmove", move);
      scroll.removeEventListener("touchend", end);
      scroll.removeEventListener("touchcancel", end);
      touchGestureRef.current = null;
    };
  }, [changeZoom, modalOpen, dragged, placing]);

  useEffect(() => {
    // Keep wheel movement immediate; sharpen the PDF after scrolling settles.
    const timer = setTimeout(() => setRenderZoom(zoom), 180);
    return () => clearTimeout(timer);
  }, [zoom]);
  const [categoryId, setCategoryId] = useState("");
  const [formValues, setFormValues] = useState(getEmptyProductForm());
  const articles = Array.isArray(catalog?.articles) ? catalog.articles : [];
  const selectedMarker = markers.find(m => m.id === selected);
  const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];
  const chosenArticle = articles.find(a => String(a.id) === String(draft.articleId));
  const availableArticles = articles.filter(a => !categoryId || String(a.categoryId) === String(categoryId));
  const isElevatorArticle = article => article.previewType === "elevator_board" || article.categoryId === ELEVATOR_CATEGORY;
  const elevatorEntry = availableArticles.find(article => article.previewType === "elevator_board" && article.elevatorBoards?.length)
    || availableArticles.find(article => article.previewType === "elevator_board");
  const pickerArticles = elevatorEntry ? availableArticles.filter(article => article === elevatorEntry || !isElevatorArticle(article)) : availableArticles;
  const isElevator = chosenArticle?.previewType === "elevator_board";
  const isOT = chosenArticle?.previewType === "ot_board";
  const elevatorVariant = isElevator && (formValues.elevatorBoardVariant?.id === formValues.elevatorBoardId
    ? formValues.elevatorBoardVariant : chosenArticle.elevatorBoards?.find(variant => variant.id === formValues.elevatorBoardId));
  const elevatorOption = elevatorVariant?.options?.[formValues.elevatorOrderMode || "print"];
  const categoryName = c => c.title || c.name || c.label || c.id;
  const preview = chosenArticle ? getFormPreviewConfig(chosenArticle) : null;
  const previewSupported = ["parking_pole", "parking_sign", "profession", "badge", "hanging_sign", "door_sign", "dibond_sign", "destination_cube", "ot_board", "elevator_board"].includes(preview?.previewType);
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #dbe5de", borderRadius: 8, boxSizing: "border-box", font: "inherit" };
  const updateFormValue = (key, value) => setFormValues(old => ({ ...old, [key]: value }));
  const updateBoardForm = useCallback(changes => {
    if (!readOnly) setFormValues(previous => ({...previous, ...changes}));
  }, [readOnly]);
  const selectArticle = article => {
    setDraft(d => ({ ...d, articleId: article.id }));
    const initial = article.previewType === "hanging_sign" || article.productType === "pendlad_skylt"
      ? getHangingSignInitialForm(article)
      : article.previewType === "profession" || article.productType === "yrkestitelsskylt"
        ? getProfessionInitialForm(article) : getEmptyProductForm();
    setFormValues({ ...initial, ...(isDestinationCube(article)?{destinationCube:getDestinationCube({},article)}:{}), quantity: 1 });
  };
  const openEditor = (marker = null) => {
    const article = articles.find(a => String(a.id) === String(marker?.articleId));
    setCategoryId(article?.categoryId || "");
    let configuration = {...(marker?.configuration||{})};
    if(!configuration.otBoard&&!configuration.elevatorBoard&&!Array.isArray(configuration.dibondSign?.lines)&&!configuration.hangingSignWithoutText&&![configuration.customText,configuration.customTextLine1,configuration.doorHeading,configuration.doorName].some(value=>String(value||"").trim())&&(marker?.text||marker?.signText))configuration.customText=marker.text||marker.signText;
    if (isPersonalDoorSign(article) && configuration?.customText && !configuration.doorHeading) {
      const roomNumber = configuration.doorExtra || "";
      configuration = { ...configuration, doorHeading: configuration.customText,
        doorUseLine2: Boolean(configuration.customTextLine2), doorExtra: configuration.customTextLine2 || "",
        doorUseNumber: Boolean(roomNumber), doorNumber: String(roomNumber).replace(/\D/g, ""),
        customText: "", customTextLine2: "" };
    }
    setFormValues({ ...getEmptyProductForm(), ...configuration, ...(isDestinationCube(article)?{destinationCube:getDestinationCube(configuration||{},article)}:{}), quantity: marker?.quantity ?? configuration.quantity ?? 1 });
    setModalOpen(true);
  };

  useEffect(() => {
    if(signOnly)return;
    let cancelled = false;
    setError(""); setPdfBytes(null); setPdfReady(false);
    (async () => {
      try {
        const response = await fetch(registerMode ? registerUrl : `/api/projects/${project.id}/drawings/${drawing.id}/file`, registerMode ? {} : { headers });
        if (!response.ok) throw new Error("Kunde inte hämta PDF-ritningen.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!cancelled) setPdfBytes(bytes);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [project.id, drawing.id, headers["x-admin-password"], registerMode, registerUrl, signOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pdfBytes) return undefined;
    let cancelled = false;
    const task = openPdf(pdfBytes.slice());
    task.promise.then(pdf => {
      if (cancelled) return;
      pdfRef.current = pdf;
      setPages(pdf.numPages);
      setPdfReady(true);
      setPage(1);
    }).catch(e => { if (!cancelled) setError(`Kunde inte läsa PDF: ${e.message}`); });
    return () => { cancelled = true; if (renderRef.current) renderRef.current.cancel(); task.destroy(); pdfRef.current = null; };
  }, [pdfBytes]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || !canvasRef.current) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(1.8, 1050 / viewport.width);
        const scaled = pdfPage.getViewport({ scale });
        setBaseSize({ width: scaled.width, height: scaled.height });
        setRenderedPage(page);
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (renderRef.current) { renderRef.current.cancel(); try { await renderRef.current.promise; } catch (_) {} }
        if (cancelled) return;
        // A bounded overview supports navigation; DrawingDetailLayer supplies sharp visible detail.
        const pixelRatio = Math.min(
          Math.max(1, Math.min(renderZoom,2)) * Math.min(window.devicePixelRatio || 1, 2),
          Math.sqrt(8 * 1024 * 1024 / (scaled.width * scaled.height)),
          4096 / Math.max(scaled.width, scaled.height)
        );
        canvas.width = Math.round(scaled.width * pixelRatio);
        canvas.height = Math.round(scaled.height * pixelRatio);
        canvas.style.width = `${scaled.width}px`;
        canvas.style.height = `${scaled.height}px`;
        const ctx = canvas.getContext("2d");
        const render = pdfPage.render({ canvasContext: ctx, viewport: scaled, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
        renderRef.current = render;
        await render.promise;
      } catch (e) { if (!cancelled && e.name !== "RenderingCancelledException") setError(`PDF-visning: ${e.message}`); }
    })();
    return () => { cancelled = true; if (renderRef.current) renderRef.current.cancel(); };
  }, [page, pdfReady, pdfBytes, renderZoom]);

  function coordinate(event) {
    const rect = stageRef.current.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }
  function selectMarker(marker) {
    if(marker.kind==='svg'&&!registerMode){setSelected(marker.id);setPlacing(false);setModalOpen(false);setCorelEditor({...marker,key:`drawing:${drawing.id}:${marker.id}`});return;}
    setSelected(marker.id); setPlacing(false);
    setDraft({ articleId: marker.articleId || "", text: marker.text || "", symbols: marker.symbols || "", quantity: marker.quantity || 1, notes: marker.notes || "", checkedAt: marker.checkedAt || "", unplaced:marker.unplaced===true });
    openEditor(marker);
  }
  function addUnplacedSign(){
    setSelected("new");setPlacing(false);
    setDraft({articleId:"",text:"",symbols:"",quantity:1,notes:"",checkedAt:"",unplaced:true,page:null,x:null,y:null});
    openEditor();
  }
  useEffect(()=>{if(signOnly){if(initialSign)selectMarker(initialSign);else addUnplacedSign();}},[]); // eslint-disable-line react-hooks/exhaustive-deps
  function startDuplicate(marker, configuration=marker.configuration||{}) {
    if(readOnly||busy||signOnly)return;
    setDuplicateSource(JSON.parse(JSON.stringify({...marker,configuration})));
    setError("");setModalOpen(false);setSelected(null);setMarkerSearch("");setVisibleGroups(null);setPlacing(true);
  }
  function cancelPlacement(){setPlacing(false);setDuplicateSource(null);}
  useEffect(()=>{
    if(!placing)return undefined;
    const escape=event=>{if(event.key==="Escape")cancelPlacement();};
    document.addEventListener("keydown",escape);
    return ()=>document.removeEventListener("keydown",escape);
  },[placing]);
  function clickStage(event) {
    if (Date.now() - lastTouchMoveRef.current < 350) return;
    if (readOnly || !placing || event.target.closest(".jsf-marker")) return;
    const coords = coordinate(event);
    setSelected("new"); setPlacing(false);
    if(duplicateSource){
      const copy=duplicateSource;
      if(copy.kind==='svg'&&!registerMode){setDuplicateSource(null);placeCorel(copy,{drawingId:drawing.id,page,...coords},true);return;}
      setDuplicateSource(null);
      setDraft({articleId:copy.articleId||"",text:copy.text||"",symbols:copy.symbols||"",quantity:copy.quantity||1,notes:copy.notes||"",checkedAt:"",unplaced:false,page,...coords});
      openEditor(copy);
    }else{
      setDraft({ articleId: "", text: "", symbols: "", quantity: 1, notes: "", checkedAt: "", page, ...coords });
      openEditor();
    }
  }
  async function placedCorel(data){const updated=(data.project?.drawings||[]).find(d=>d.id===drawing.id);if(updated)setMarkers(updated.markers||[]);setSelected(data.sign?.id||null);setModalOpen(false);await onSaved();}
  async function placeCorel(sign,placement={drawingId:drawing.id,page:draft.page,x:draft.x,y:draft.y},duplicate=false){setBusy(true);setError('');try{const key=sign.key||(duplicate&&markers.some(marker=>marker.id===sign.id)?`drawing:${drawing.id}:${sign.id}`:sign.id);const response=await fetch('/api/projects/'+encodeURIComponent(project.id)+'/signs/'+encodeURIComponent(key)+(duplicate?'/duplicate':'/place'),{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(duplicate?{placement}:placement)});const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte placera skylten.');await placedCorel(data);}catch(error){setError(error.message);}finally{setBusy(false);}}
  async function saveMarker(event) {
    event.preventDefault(); if (readOnly) return; setBusy(true); setError("");
    try {
      const isNew = selected === "new";
      const boardQuantity = elevatorVariant
        ? Number(elevatorVariant.floorCopies ?? 1) + Number(elevatorVariant.cabinCopies ?? 0)
        : Number(formValues.quantity);
      if (isElevator || isOT) {
        const issue = validateCurrentItem(chosenArticle, chosenArticle.productType, {...formValues,quantity:boardQuantity});
        if (issue) throw new Error(issue);
        if (elevatorVariant?.options && !articles.some(article => String(article.id) === String(elevatorOption?.articleId))) {
          throw new Error("Den valda hisstypen saknar en giltig artikel i artikelregistret.");
        }
      }
      if(formValues.hangingStack?.items?.length){
        for(const [index,entry] of hangingStackEntries(chosenArticle,formValues,articles).entries()){
          if(!entry.product||!isStackable(entry.product))throw new Error('Välj en pendlad artikel för skylt '+(index+1)+'.');
          const invalid=validateCurrentItem(entry.product,entry.product.productType,{...entry.form,quantity:1});if(invalid)throw new Error('Skylt '+(index+1)+': '+invalid);
        }
      }
      if(chosenArticle?.previewType==='parking_pole'){const issue=validateCurrentItem(chosenArticle,'stolpe',{...formValues,quantity:1});if(issue)throw new Error(issue);}
      if(roadSignModel(chosenArticle)&&formValues.hangingStack?.items?.length){const layout=roadAssemblyLayout(hangingStackEntries(chosenArticle,formValues,articles),formValues.hangingStack.gapMm,formValues.roadAssemblyTopMm??100);const poleIssue=roadAssemblyError(layout);if(poleIssue)throw new Error(poleIssue);if(!Number.isFinite(Number(formValues.roadAssemblyTopMm??100))||Number(formValues.roadAssemblyTopMm??100)<0||layout.panels.some(panel=>panel.y+panel.height>layout.height))throw new Error('Skyltarna måste rymmas på stolpens höjd.');}
      if(isDestinationCube(chosenArticle)){const error=destinationCubeError(formValues);if(error)throw new Error(error);}
      if(chosenArticle?.previewType==="parking_sign"){const error=parkingError(chosenArticle,formValues);if(error)throw new Error(error);}
      const badgeError=nameBadgeFormError(chosenArticle,formValues);
      if(badgeError) throw new Error(badgeError);
      const hangingAssets=getHangingSignSymbolAssets(formValues);
      if(chosenArticle.productType==='pendlad_skylt'){const targetError=hangingTargetError(chosenArticle,formValues,hangingAssets);if(targetError)throw new Error(targetError);}
      const backError = hangingBackTextError(chosenArticle, {...formValues,hangingSignSymbolAssets:hangingAssets});
      if (backError) throw new Error(backError);
      if(isAreaPriced(chosenArticle)){const error=areaDimensionsError(formValues)||stripeSettingsError(chosenArticle,formValues);if(error)throw new Error(error);}
      if(chosenArticle?.previewType==="dibond_sign"){const sign=formValues.dibondSign||newDibondSign(chosenArticle);const error=validateDibondSign(chosenArticle,sign);if(error)throw new Error(error);}
      const configuredText = isDestinationCube(chosenArticle) ? `Målpunkt ${getDestinationCube(formValues).target} · Plan ${getDestinationCube(formValues).floor}` : configuredMarkerText(formValues);
      const payload = { ...draft, text: formValues.hangingSignWithoutText?"":configuredText ?? draft.text ?? "", symbols: [formValues.arrowPlacement && formValues.arrowPlacement !== "none" ? `Pilplacering: ${formValues.arrowPlacement}` : "", formValues.arrowDirection ? `Pilriktning: ${formValues.arrowDirection}` : "", formValues.hangingSignSymbol && formValues.hangingSignSymbol !== "none" ? `Symbol: ${formValues.hangingSignSymbol}` : ""].filter(Boolean).join(", "), configuration: { ...formValues, ...(formValues.hangingSignWithoutText?{customText:"",customTextLine1:"",customTextLine2:""}:{}), ...(chosenArticle.previewType==="parking_sign"?{parkingSignConfig:{...parkingConfig(chosenArticle)}}:{}), ...(chosenArticle.previewType === "hanging_sign" || chosenArticle.productType === "pendlad_skylt" ? {hangingSignSymbolAssets:getHangingSignSymbolAssets(formValues)} : {}), ...(isAreaPriced(chosenArticle)?calculateAreaPricing(chosenArticle,formValues):{}), quantity: 1 }, quantity: 1, ...(isNew ? {} : { page: selectedMarker.page, x: selectedMarker.x, y: selectedMarker.y }) };
      if (isOT || isElevator) {
        payload.quantity = boardQuantity;
        payload.configuration.quantity = payload.quantity;
      }
      if (isOT && formValues.otBoardId) {
        const variant = chosenArticle.otBoards?.find(board => board.id === formValues.otBoardId);
        payload.configuration.otBoardName ||= variant?.name || "";
        payload.configuration.otBoardLocation ||= variant?.location || "";
        payload.text = payload.configuration.otBoardName || payload.text;
      }
      if (elevatorVariant) {
        const {board, ...selection} = elevatorVariant;
        payload.configuration.elevatorBoardVariant = selection;
        payload.configuration.elevatorBoard ||= board;
        payload.articleId = elevatorOption?.articleId || payload.articleId;
        payload.text = selection.name || payload.text;
      }
      if(payload.configuration.hangingStack){payload.configuration.hangingStack={...payload.configuration.hangingStack,items:payload.configuration.hangingStack.items.map(item=>({...item,configuration:{...withoutHangingStack(item.configuration),hangingSignSymbolAssets:getHangingSignSymbolAssets(item.configuration),quantity:1}}))};}
      validateProjectConfiguration(payload.configuration);
      if (signOnly) {
        const response=await fetch(`/api/projects/${encodeURIComponent(project.id)}/signs${isNew?"":"/"+encodeURIComponent(initialSign.key)}`,{method:isNew?"POST":"PATCH",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({...payload,quantity:isOT||isElevator?payload.quantity:Number(draft.quantity||1),...(isNew?{kind:"catalog"}:{})})});
        const data=await response.json();if(!response.ok)throw new Error(data.message||"Kunde inte spara skylten.");
        await onSaved();onClose();
      } else if (registerMode) {
        const nextNumber=Math.max(0,...markers.map(marker=>Number(String(marker.position||marker.number||"").replace(/\D/g,""))||0))+1;
        const nextMarker = { ...payload, id: isNew ? `${Date.now()}-${Math.random().toString(36).slice(2)}` : selected, position: isNew ? `S${String(nextNumber).padStart(3, "0")}` : selectedMarker.position, number: isNew ? nextNumber : selectedMarker.number, page: isNew ? draft.page : selectedMarker.page, x: isNew ? draft.x : selectedMarker.x, y: isNew ? draft.y : selectedMarker.y, articleNumber: elevatorOption?.articleNumber || chosenArticle?.articleNumber || "", signText: payload.text, checkedAt: draft.checkedAt || "" };
        const next = isNew ? [...markers, nextMarker] : markers.map(m => m.id === selected ? { ...m, ...nextMarker } : m);
        await onRegisterSave({ name: drawing.name, markers: next });
        setMarkers(next); setSelected(nextMarker.id); setModalOpen(false);
      } else {
        const response = await fetch(`/api/projects/${project.id}/drawings/${drawing.id}/markers${isNew ? "" : `/${selected}`}`, {
          method: isNew ? "POST" : "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Kunde inte spara skyltmarkeringen.");
        setMarkers(data.drawing.markers || []); setSelected(data.marker.id); setModalOpen(false); onSaved();
      }
    } catch (e) {
      const fieldId=productErrorField(e.message||"",chosenArticle);
      const field=fieldId?document.getElementById(fieldId):null;
      if(field){showFieldError(field,e.message);field.focus();field.scrollIntoView({block:"nearest"});}
      else setError(e.message);
    } finally { setBusy(false); }
  }
  async function deleteMarker() {
    if (readOnly || !deleteTarget || busy) return;
    setBusy(true); setDeleteError("");
    try {
      if (registerMode) {
        const next = markers.filter(m => m.id !== deleteTarget.id);
        await onRegisterSave({ name: drawing.name, markers: next });
        setMarkers(next); setSelected(null);
      } else {
        const response = await fetch(`/api/projects/${project.id}/drawings/${drawing.id}/markers/${deleteTarget.id}`, { method: "DELETE", headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Kunde inte ta bort markeringen.");
        setMarkers(data.drawing.markers || []); setSelected(null); onSaved();
      }
      setDeleteTarget(null);setModalOpen(false);
    } catch (e) { setDeleteError(e.message); } finally { setBusy(false); }
  }
  function startMarkerDrag(event,marker){
    if(readOnly||placing||event.button!==0)return;
    suppressMarkerClickRef.current=false;
    markerDragRef.current={id:marker.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:marker.x,originY:marker.y,start:coordinate(event),moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function markerDragPosition(event,gesture){
    const point=coordinate(event);
    return {x:Math.max(0,Math.min(1,gesture.originX+point.x-gesture.start.x)),y:Math.max(0,Math.min(1,gesture.originY+point.y-gesture.start.y))};
  }
  function moveMarkerDrag(event){
    const gesture=markerDragRef.current;
    if(!gesture||event.pointerId!==gesture.pointerId)return;
    if(!gesture.moved&&Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)<4)return;
    gesture.moved=true;suppressMarkerClickRef.current=true;setDragged(gesture.id);
    const coords=markerDragPosition(event,gesture);
    setMarkers(old=>old.map(m=>m.id===gesture.id?{...m,...coords}:m));
  }
  function cancelMarkerDrag(){
    const gesture=markerDragRef.current;markerDragRef.current=null;setDragged(null);
    if(gesture?.moved){suppressMarkerClickRef.current=true;setMarkers(old=>old.map(m=>m.id===gesture.id?{...m,x:gesture.originX,y:gesture.originY}:m));}
  }
  async function finishDrag(event) {
    const gesture=markerDragRef.current;
    if(!gesture||event.pointerId!==gesture.pointerId)return;
    markerDragRef.current=null;setDragged(null);
    if(readOnly||!gesture.moved)return;
    const coords=markerDragPosition(event,gesture);
    try {
      if (registerMode) {
        const next = markers.map(m => m.id === gesture.id ? { ...m, ...coords } : m);
        await onRegisterSave({ name: drawing.name, markers: next });
        setMarkers(next);
      } else {
        const response = await fetch(`/api/projects/${project.id}/drawings/${drawing.id}/markers/${gesture.id}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(coords) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Kunde inte flytta markeringen.");
        setMarkers(data.drawing.markers || []); onSaved();
      }
    } catch (e) {setMarkers(old=>old.map(m=>m.id===gesture.id?{...m,x:gesture.originX,y:gesture.originY}:m));setError(e.message);}
  }
  const markerGroup = marker => {
    if(marker.kind==='svg')return {id:'project-special',name:'Egna original'};
    const article = articles.find(article => String(article.id) === String(marker.articleId) || String(article.articleNumber) === String(marker.articleId));
    const type = String(article?.productType || marker.productType || "").toLowerCase();
    const previewType = article?.previewType || marker.configuration?.previewType;
    const categoryId = article?.categoryId || marker.categoryId || "";
    if (previewType === "door_sign" || type === "dorrskylt" || /d[oö]rrskylt/i.test(categoryId)) return { id: "door", name: "Dörrskyltar" };
    if (previewType === "hanging_sign" || /pendlad/.test(type) || /pendlad/i.test(categoryId)) return { id: "hanging", name: "Pendlade skyltar" };
    const category = categories.find(category => category.id === categoryId);
    return { id: categoryId || "other", name: category ? categoryName(category) : "Övriga skyltar" };
  };
  const groups = [...new Map(markers.map(markerGroup).map(group => [group.id, group])).values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  const filteredMarkers = visibleGroups === null ? markers : markers.filter(marker => visibleGroups.includes(markerGroup(marker).id));
  const current = filteredMarkers.filter(m => !m.unplaced && m.page === page);
  const toggleGroup = id => setVisibleGroups(old => old === null ? [id] : old.includes(id) ? old.filter(group => group !== id) : [...old, id]);
  const markerArticleInfo = marker => {
    if(marker.kind==='svg')return {articleNumber:'',name:marker.name||'Eget original'};
    const article = articles.find(article => String(article.id) === String(marker.articleId) || String(article.articleNumber) === String(marker.articleId));
    const articleNumber = article?.articleNumber || marker.articleNumber || "";
    const name = article?.name || article?.title || marker.articleName || "Artikel saknas";
    const pictogram = /piktogram/i.test(`${article?.categoryId || ""} ${article?.productType || ""} ${name}`) ? article?.desc : "";
    return {articleNumber,name:[name,pictogram].filter(Boolean).join(" · ")};
  };
  const normalizeSearch = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("sv-SE");
  const searchTerms = normalizeSearch(markerSearch).trim().split(/\s+/).filter(Boolean);
  const searchActive = searchTerms.length > 0;
  const markerText = markerTextSummary;
  const matchesSearch = marker => {
    const info = markerArticleInfo(marker);
    const config = marker.configuration || {};
    const text = normalizeSearch([label(marker), info.articleNumber, info.name, markerText(marker), marker.notes, marker.symbols, config.doorNumber, config.doorSymbolName, config.hangingSignSymbols, config.hangingSignSymbol].join(" "));
    return searchTerms.every(term => text.includes(term));
  };
  const results = searchActive ? filteredMarkers.filter(matchesSearch) : [...current,...filteredMarkers.filter(marker=>marker.unplaced)];
  const centerOnMarker = marker => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.scrollLeft = Math.max(0, marker.x * baseSize.width * zoom - scroll.clientWidth / 2);
    scroll.scrollTop = Math.max(0, marker.y * baseSize.height * zoom - scroll.clientHeight / 2);
  };
  const locateMarker = marker => {
    if(marker.unplaced)return;
    setSelected(marker.id); setPlacing(false);
    if (marker.page === page) centerOnMarker(marker);
    else { setPendingLocation(marker); setPage(marker.page); }
  };
  useLayoutEffect(() => {
    if (pendingLocation && pendingLocation.page === page && renderedPage === page) {
      centerOnMarker(pendingLocation);
      setPendingLocation(null);
    }
  }, [pendingLocation, page, renderedPage, baseSize, zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section ref={plannerRef} aria-label="Ritningsvy" className={`jsf-planner jsf-planner-workspace ${registerMode ? "jsf-drawing-register" : ""} ${sideHidden ? "is-side-hidden" : ""} ${expanded ? "is-expanded" : ""}`}>
    {!signOnly&&<><header className="jsf-planner-top">
      <div className="jsf-planner-heading"><button type="button" className="jsf-planner-back jsf-back-link" onClick={onClose}>{registerMode ? "← Till ritningslistan" : "← Tillbaka till projektet"}</button><small>{registerMode ? "RITNINGAR · BEFINTLIGA SKYLTAR" : `PROJEKT · ${project.number || project.name || ""}`}</small><h2 title={drawing.name}>{drawing.name}</h2><span>{markers.length} skyltar {registerMode ? "registrerade" : "i projektet"}</span></div>
      <div className="jsf-planner-actions">{!readOnly&&!registerMode&&<button type="button" className="project-secondary" disabled={busy||Boolean(dragged)} onClick={()=>{setLibraryCopyMessage("");setCopyToLibrary(true);}}>Spara i Ritningar</button>}<button type="button" className="project-secondary" aria-controls={sidePanelId} aria-expanded={!sideHidden} onClick={() => setSideHidden(value => !value)}>{sideHidden ? "Visa skyltlista" : "Dölj skyltlista"}</button>{!readOnly&&!registerMode&&<button type="button" className="project-secondary" disabled={busy} onClick={addUnplacedSign}>+ Skylt utan placering</button>}{!readOnly && <button type="button" className="project-primary" onClick={() => { setDuplicateSource(null);setPlacing(true); setSelected(null); }}>+ Placera skylt</button>}</div>
    </header>
    {copyToLibrary&&<SaveDrawingToLibraryDialog projectId={project.id} drawing={drawing} headers={headers} onClose={()=>setCopyToLibrary(false)} onSaved={item=>{setCopyToLibrary(false);setLibraryCopyMessage(`“${item.name}” har sparats i Ritningar med ${item.markers?.length||0} skyltar.`);}}/>}
    {libraryCopyMessage&&<div className="project-success" role="status">{libraryCopyMessage}</div>}
    {error && <div className="project-error" role="alert">{error}</div>}
    {placing&&<div className="project-success" role="status" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><span>{duplicateSource?`Kopia av ${label(duplicateSource)} – klicka på ritningen för att placera kopian.`:"Klicka på ritningen för att placera skylten."}</span><button type="button" className="project-secondary" onClick={cancelPlacement}>Avbryt placering</button></div>}
    <div className="jsf-planner-tools" role="toolbar" aria-label="Ritningsverktyg"><div className="jsf-planner-page-tools"><button type="button" aria-label="Föregående sida" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button><span>Sida {page} av {pages}</span><button type="button" aria-label="Nästa sida" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button></div><div className="jsf-planner-zoom-tools"><button type="button" aria-label="Zooma ut" disabled={zoom <= MIN_DRAWING_ZOOM} onClick={() => changeZoom(zoomRef.current > 2 ? zoomRef.current / 1.25 : zoomRef.current - .25)}>−</button><output aria-label="Zoomnivå">{Math.round(zoom * 100)} %</output><button type="button" aria-label="Zooma in" disabled={zoom >= MAX_DRAWING_ZOOM} onClick={() => changeZoom(zoomRef.current >= 2 ? zoomRef.current * 1.25 : zoomRef.current + .25)}>+</button></div><button type="button" className="jsf-planner-fit" disabled={!pdfReady || renderedPage !== page} onClick={fitDrawing}>Anpassa</button><span className="jsf-tools-spacer"/><button type="button" aria-pressed={expanded} onClick={toggleFullscreen}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/></svg><span>{expanded ? "Lämna helskärm" : "Helskärm"}</span></button></div>
    <div className="jsf-planner-body"><div ref={scrollRef} className="jsf-planner-scroll" style={{ touchAction: "none", cursor: placing ? "crosshair" : panning ? "grabbing" : "grab", userSelect: "none" }} onPointerDown={startMousePan} onPointerMove={moveMousePan} onPointerUp={endMousePan} onPointerCancel={endMousePan} onLostPointerCapture={endMousePan}><div className="jsf-planner-scale" style={{ width: baseSize.width * zoom, height: baseSize.height * zoom }}><div ref={stageRef} className={`jsf-planner-stage ${placing ? "is-placing" : ""}`} style={{ width: baseSize.width, height: baseSize.height, transform: `scale(${zoom})` }} onClick={clickStage} onPointerMove={moveMarkerDrag} onPointerUp={finishDrag} onPointerCancel={cancelMarkerDrag} onLostPointerCapture={cancelMarkerDrag}>
      <canvas ref={canvasRef}/><DrawingDetailLayer pdf={pdfReady?pdfRef.current:null} page={page} zoom={zoom} baseSize={baseSize} scrollRef={scrollRef} stageRef={stageRef}/>{current.map(m => <button type="button" key={m.id} className={`jsf-marker ${selected === m.id ? "selected" : ""} ${searchActive ? matchesSearch(m) ? "search-match" : "search-muted" : ""}`} style={{ zIndex:2, cursor:readOnly?"pointer":"grab", left: `${m.x * 100}%`, top: `${m.y * 100}%`, "--marker-inverse-zoom":1/zoom, transform: `translate(-50%, -50%) scale(${1 / zoom})` }} onClick={e => { e.stopPropagation(); if(suppressMarkerClickRef.current){suppressMarkerClickRef.current=false;return;}if(!placing)selectMarker(m); }} onPointerDown={e=>startMarkerDrag(e,m)} title={`${label(m)} – ${markerArticleInfo(m).articleNumber} ${markerArticleInfo(m).name}${m.text ? ` – ${m.text}` : ""}`}>{String(label(m)).replace(/^S/, "")}</button>)}
    </div></div></div>
    <aside id={sidePanelId} hidden={sideHidden} className="jsf-planner-side"><h3>{registerMode ? "Skyltregister" : "Skyltplanering"}</h3><fieldset className="jsf-marker-filters"><legend>Visa skyltgrupper</legend><label><input type="checkbox" checked={visibleGroups===null} onChange={e=>setVisibleGroups(e.target.checked?null:[])}/>Alla</label>{groups.map(group=><label key={group.id}><input type="checkbox" checked={visibleGroups?.includes(group.id)||false} onChange={()=>toggleGroup(group.id)}/>{group.name}</label>)}</fieldset><label className="jsf-marker-search"><span>Sök skyltar</span><input type="search" value={markerSearch} onChange={e=>setMarkerSearch(e.target.value)} placeholder="Artikelnummer, namn eller skylttext"/></label>{markerSearch&&<button type="button" className="jsf-marker-search-clear" onClick={()=>setMarkerSearch("")}>Rensa sökning</button>}<h4 aria-live="polite">{searchActive ? `${results.length} träffar` : markers.some(marker=>marker.unplaced)?"Skyltar på sidan och utan placering":"Skyltar på denna sida"}</h4><div className="jsf-marker-list-scroll" role="region" aria-label="Skyltar på denna sida" tabIndex={0}>{results.map(m => {const info=markerArticleInfo(m);return <div key={m.id} className="jsf-marker-result"><button className="jsf-marker-list" onClick={() => selectMarker(m)}>
      <div className="jsf-marker-list-heading"><span>{label(m)}{m.unplaced?" · Utan placering":searchActive?` · Sida ${m.page}`:""}</span>{info.articleNumber&&<span>Art. {info.articleNumber}</span>}</div>
      <div className="jsf-marker-list-article">{info.name}</div>
      {markerText(m)&&<div className="jsf-marker-list-text">{markerText(m)}</div>}
    </button>{!readOnly&&<button type="button" className="jsf-marker-locate" disabled={busy} aria-label={`Duplicera ${label(m)}`} onClick={()=>startDuplicate(m)}>Duplicera skylt</button>}{!m.unplaced&&<button type="button" className="jsf-marker-locate" aria-label={`Visa ${label(m)} på ritningen`} onClick={()=>locateMarker(m)}>Visa på ritningen →</button>}</div>})}{!results.length&&<p className="jsf-marker-no-results">{searchActive?"Inga skyltar matchar sökningen och valda grupper.":"Inga skyltar i valda grupper på denna sida."}</p>}</div></aside></div>
    
    </>}
    {corelEditor&&<SignDetails project={project} sign={corelEditor.new?null:corelEditor} placement={corelEditor.new&&!draft.unplaced?{drawingId:drawing.id,page:draft.page,x:draft.x,y:draft.y}:undefined} headers={headers} readOnly={readOnly} onClose={()=>setCorelEditor(null)} onSaved={placedCorel}/>}
    {modalOpen && <div className="jsf-sign-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) { closeEditor(); } }}>
      <div ref={modalRef} className="jsf-sign-modal jsf-calm-sign-editor" data-read-only={readOnly} data-configuring={Boolean(chosenArticle)} role="dialog" aria-modal="true" aria-label={readOnly?"Visa skylt":"Välj och anpassa skylt"}>
        <div className="jsf-sign-modal-header"><div><small>{selectedMarker?.position || "NY SKYLT"} · {draft.unplaced?"Utan placering":drawing.name}</small><h2>{readOnly?"Visa skylt":chosenArticle ? "Anpassa skylt" : "Välj skylt"}</h2></div><button type="button" onClick={() => { closeEditor(); }} aria-label="Stäng">✕</button></div>
        <div className="jsf-sign-modal-content">{error&&<p className="project-error" role="alert">{error}</p>}
          {readOnly&&!chosenArticle?<div className="jsf-sign-fields"><p>Artikeln saknas i artikelregistret.</p><p>Skylttext: {draft.text||"–"}</p><p>Anteckningar: {draft.notes||"–"}</p></div>:!chosenArticle ? <>{!registerMode&&!signOnly&&<section aria-label="Egna Corel-original" className="project-panel"><button type="button" className="project-secondary" onClick={()=>{setModalOpen(false);setCorelEditor({new:true});}}>Importera skylt från Corel</button>{!draft.unplaced&&(project.signs||[]).some(s=>s.kind==='svg')&&<><h3>Från projektets skyltlista</h3><div className="jsf-sign-products">{(project.signs||[]).filter(s=>s.kind==='svg').map(sign=><button key={sign.id} type="button" className="jsf-sign-product" disabled={busy} onClick={()=>placeCorel(sign)}><div className="jsf-sign-image"><Original project={project} sign={sign} headers={headers}/></div><strong>{sign.position} · {sign.name}</strong><span>{sign.widthMm} × {sign.heightMm} mm</span></button>)}</div></>}</section>}<div className="jsf-sign-categories"><button className={!categoryId ? "active" : ""} onClick={() => setCategoryId("")}>Alla artiklar</button>{categories.map(c => <button key={c.id} className={categoryId === c.id ? "active" : ""} onClick={() => setCategoryId(c.id)}>{categoryName(c)}</button>)}</div><div className="jsf-sign-products">{pickerArticles.map(a => <button type="button" key={a.id} className="jsf-sign-product" onClick={() => selectArticle(a)}><div className="jsf-sign-image">{a.image ? <img src={a.image} alt=""/> : <span>Ingen bild</span>}</div>{a!==elevatorEntry&&<small>Art. {a.articleNumber || a.number || "–"}</small>}<strong>{a===elevatorEntry?ELEVATOR_TITLE:a.name}</strong><span>{a===elevatorEntry?"Komplett hisstavla eller pappersutskrift":a.format || ""}</span></button>)}</div>{!availableArticles.length && <p>Inga artiklar i den valda gruppen.</p>}</> :
          <form id="jsf-sign-form" onSubmit={saveMarker} className="jsf-sign-config"><fieldset disabled={readOnly} style={{display:"contents"}}><div className="jsf-sign-config-top">{!readOnly&&<button type="button" onClick={() => setDraft(d => ({ ...d, articleId: "" }))}>← Byt artikel</button>}<div>{(!isElevator||elevatorOption?.articleNumber)&&<small>ARTIKEL {elevatorOption?.articleNumber || decalArticleNumber(chosenArticle,formValues)}</small>}<h3>{isElevator?ELEVATOR_TITLE:chosenArticle.name}</h3>{!isElevator&&<p>{chosenArticle.format || chosenArticle.desc || ""}</p>}</div></div><div className="jsf-sign-config-grid"><div className="jsf-sign-preview"><ProjectProduct3DPreview key={chosenArticle.id} product={chosenArticle} form={formValues} readOnly={readOnly} onChange={readOnly?undefined:changes=>setFormValues(previous=>({...previous,...changes}))}><ProjectSignPreview onOTBoardChange={readOnly?undefined:otBoard=>setFormValues(previous=>({...previous,otBoard,otBoardEdited:true}))} onDibondChange={readOnly?undefined:sign=>setFormValues(previous=>({...previous,dibondSign:sign}))} product={chosenArticle} formValues={formValues} preview={preview} supported={previewSupported}/></ProjectProduct3DPreview></div><div className="jsf-sign-fields" tabIndex={0} role="region" aria-label="Skyltens inställningar"><h3>Produktuppgifter</h3>{isElevator?<ElevatorBoardConfigurator key={chosenArticle.id} product={chosenArticle} form={formValues} articles={articles} credential={headers["x-admin-password"]} onChange={updateBoardForm}/>:isOT?<OTBoardConfigurator key={chosenArticle.id} product={chosenArticle} form={formValues} credential={headers["x-admin-password"]} onChange={updateBoardForm}/>:(isHanging(chosenArticle)||roadSignModel(chosenArticle))?<HangingStackFields key={selected||"new"} product={chosenArticle} form={formValues} setForm={setFormValues} articles={articles} onRootChange={(article,form)=>{setDraft(previous=>({...previous,articleId:article.id}));setFormValues(form);}} symbolCredential={headers["x-admin-password"]}/>:DEFAULT_FIELD_ORDER.filter(key => key !== "quantity" && hasBadgeField(chosenArticle, key)).map(key => renderConfiguredField(key, { Field, selectedBadge: chosenArticle, productForm: formValues, updateFormValue, setProductForm: setFormValues, inputStyle, hideHelp:true, symbolCredential:headers["x-admin-password"] }))}{signOnly&&!isOT&&!isElevator&&<div className="jsf-sign-extra"><label htmlFor="project-sign-quantity">Antal</label><QuantityInput id="project-sign-quantity" min={1} max={10000} required value={draft.quantity} onChange={value=>setDraft(d=>({...d,quantity:value}))}/></div>}{registerMode && <label className="jsf-sign-extra">Senast kontrollerad<DatePicker value={draft.checkedAt || ""} onChange={e => setDraft(d => ({ ...d, checkedAt: e.target.value }))}/></label>}<label className="jsf-sign-extra">Anteckningar<textarea rows="2" value={draft.notes || ""} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}/></label></div></div></fieldset></form>}
        </div><div className="jsf-sign-modal-footer">{readOnly?<button type="button" className="project-secondary" onClick={()=>{setModalOpen(false);setSelected(null);}}>Stäng</button>:<>{selectedMarker&&!signOnly&&chosenArticle&&<button type="button" className="project-secondary" disabled={busy} onClick={()=>startDuplicate({...selectedMarker,...draft},formValues)}>Duplicera skylt</button>}{selectedMarker && !signOnly && <button type="button" className="jsf-delete-marker" disabled={busy} onClick={() => {setDeleteError('');setDeleteTarget(selectedMarker);}}>Ta bort skylt</button>}<button type="button" className="project-secondary" onClick={() => { closeEditor(); }}>Avbryt</button>{chosenArticle && <button type="submit" form="jsf-sign-form" className="project-primary" disabled={busy}>{busy ? "Sparar..." : registerMode ? "Spara befintlig skylt" : "Spara skylt i projektet"}</button>}</>}</div>
      </div>
    </div>}
    {deleteTarget&&<OrderDeleteDialog entityLabel="skylt" contextLabel="SKYLT" reference={label(deleteTarget)} busy={busy} error={deleteError} onClose={()=>{if(!busy)setDeleteTarget(null);}} onConfirm={deleteMarker} description={<>Vill du ta bort <strong>{label(deleteTarget)}</strong>? Skylten och dess markering på ritningen tas bort. Redan sparade korrekturversioner finns kvar.</>}/>}
    <style>{`.jsf-sign-modal[data-read-only=true] #tactile-text-help{display:none}.jsf-sign-modal[data-read-only=true] :disabled{opacity:1;color:#353535;-webkit-text-fill-color:#353535;background:#fafafa;cursor:default}.jsf-drawing-register .jsf-marker{background:#1677b8;border-color:#fff;color:#fff}.jsf-drawing-register .jsf-marker.selected{background:#075a95;outline:3px solid #a7d9fa;outline-offset:2px}.jsf-drawing-register .jsf-marker.search-match{box-shadow:0 0 0 3px #a7d9fa,0 2px 8px #0005}.jsf-planner{margin-top:15px}.jsf-planner-top,.jsf-planner-tools{display:flex;align-items:center;gap:12px;margin-bottom:12px}.jsf-planner-top>div{flex:1;display:grid;gap:4px}.jsf-planner-top small{color:#75837b}.jsf-planner-tools{background:#fff;border:1px solid #e0e7e1;padding:10px;border-radius:10px}.jsf-planner-tools button{border:1px solid #dce4dd;border-radius:7px;background:white;padding:7px 12px;cursor:pointer}.jsf-planner-tools button:disabled{opacity:.4}.jsf-tools-spacer{flex:1}.jsf-planner-body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}.jsf-planner-scroll{background:#e8eeea;border:1px solid #d8e3da;border-radius:12px;overflow:auto;max-height:76vh;padding:22px}.jsf-planner-scale{position:relative;margin:auto}.jsf-planner-stage{position:relative;transform-origin:top left;background:white;box-shadow:0 5px 20px #12281b24;touch-action:none}.jsf-planner-stage.is-placing{cursor:crosshair}.jsf-marker{position:absolute;transform:translate(-50%,-50%);border-radius:100px;width:26px;min-width:26px;height:26px;padding:0;border:2px solid white;background:#15583e;color:white;font-size:9px;font-weight:800;box-shadow:0 2px 8px #0005;cursor:grab;touch-action:none;z-index:2}.jsf-marker.selected{outline:3px solid #f3ad3c;outline-offset:2px}.jsf-planner-side{background:white;border:1px solid #e0e7e1;border-radius:12px;padding:20px;position:sticky;top:10px}.jsf-planner-side h3{margin:0 0 18px;font-size:18px}.jsf-planner-side p{font-size:13px;color:#718078;line-height:1.7}.jsf-marker-form{display:grid;gap:13px}.jsf-marker-form label{display:grid;gap:5px;font-size:12px;font-weight:700}.jsf-marker-form input,.jsf-marker-form select,.jsf-marker-form textarea{width:100%;box-sizing:border-box;border:1px solid #d9e4db;border-radius:8px;padding:10px;font:inherit;font-size:13px}.jsf-delete-marker{border:0;background:#f9ecec;color:#9c2929;border-radius:8px;padding:10px;cursor:pointer}.jsf-marker-list{display:block;width:100%;text-align:left;background:#f5f8f6;border:0;border-radius:8px;padding:10px;margin:6px 0;cursor:pointer}@media(max-width:1000px){.jsf-planner-body{grid-template-columns:1fr}.jsf-planner-side{position:static}}.jsf-sign-modal-backdrop{position:fixed;inset:0;background:#0b2119a8;z-index:10000;display:flex;align-items:center;justify-content:center;padding:22px}.jsf-sign-modal{width:min(1100px,100%);max-height:92vh;display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 30px 80px #07170f55;overflow:hidden}.jsf-sign-modal-header,.jsf-sign-modal-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:18px 26px;border-bottom:1px solid #e4eae5}.jsf-sign-modal-header small,.jsf-sign-config-top small{font-size:10px;letter-spacing:.1em;color:#7c8980}.jsf-sign-modal-header h2{margin:3px 0;font-size:24px}.jsf-sign-modal-header>button{border:0;background:#f1f5f2;border-radius:8px;padding:9px 13px;cursor:pointer}.jsf-sign-modal-content{padding:22px 26px;overflow-y:auto;flex:1}.jsf-sign-modal-footer{border-bottom:0;border-top:1px solid #e4eae5;justify-content:flex-end}.jsf-sign-categories{display:flex;flex-wrap:wrap;gap:7px;margin:18px 0}.jsf-sign-categories button{padding:9px 12px;border:1px solid #dce6df;background:#fff;border-radius:9px;cursor:pointer}.jsf-sign-categories button.active{background:#164c37;color:white}.jsf-sign-products{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px}.jsf-sign-product{display:flex;flex-direction:column;gap:6px;padding:12px;text-align:left;border:1px solid #e1e8e2;border-radius:12px;background:#fff;cursor:pointer}.jsf-sign-product:hover{border-color:#5b9a79}.jsf-sign-image{height:120px;background:#f4f6f4;border-radius:8px;display:grid;place-items:center;overflow:hidden}.jsf-sign-image img{width:100%;height:100%;object-fit:contain}.jsf-sign-product small,.jsf-sign-product span{font-size:11px;color:#728178}.jsf-sign-product strong{font-size:13px}.jsf-sign-config-top{display:flex;align-items:center;gap:20px;margin-bottom:18px}.jsf-sign-config-top>button{border:1px solid #d9e3dc;background:#fff;padding:9px 12px;border-radius:8px;cursor:pointer}.jsf-sign-config-top h3{margin:3px 0}.jsf-sign-config-top p{margin:0;font-size:12px;color:#728178}.jsf-sign-config-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,1fr);gap:22px}.jsf-sign-config-grid>*{min-width:0}.jsf-sign-preview-content{width:100%;min-width:0;display:flex;align-items:center;justify-content:center}.jsf-sign-preview-content>img{width:100%;height:300px;object-fit:contain}.jsf-sign-preview{min-width:0;box-sizing:border-box;background:#f4f6f4;border-radius:12px;padding:25px;display:grid;place-items:center;align-self:start;min-height:230px;overflow:hidden}.jsf-sign-preview img{max-width:100%;max-height:300px;object-fit:contain}.jsf-sign-fields{display:grid;gap:10px}.jsf-sign-fields h3{margin:0 0 8px}.jsf-sign-fields input,.jsf-sign-fields select,.jsf-sign-fields textarea{max-width:100%;box-sizing:border-box}.jsf-sign-extra{display:grid;gap:6px;font-size:12px;font-weight:700}.jsf-sign-extra input,.jsf-sign-extra textarea{border:1px solid #dbe5de;border-radius:8px;padding:10px;font:inherit}@media(max-width:750px){.jsf-sign-config-grid{grid-template-columns:1fr}.jsf-sign-modal-backdrop{padding:6px}.jsf-sign-modal{max-height:98vh}.jsf-sign-modal-content{padding:15px}.jsf-sign-modal-header,.jsf-sign-modal-footer{padding:13px}}

      .jsf-planner .jsf-planner-side{display:flex;flex-direction:column;max-height:76vh;max-height:76dvh;min-height:0;box-sizing:border-box;overflow:hidden}
      .jsf-planner-side>h3,.jsf-planner-side>p,.jsf-planner-side>h4{flex-shrink:0}
      .jsf-marker-list-scroll{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:4px;touch-action:pan-y}
      .jsf-marker-list-scroll:focus-visible{outline:1px solid #aaa39a;outline-offset:3px}
      .jsf-marker-list-scroll>.jsf-marker-list:first-child{margin-top:0}
      .jsf-marker-list-scroll>.jsf-marker-list:last-child{margin-bottom:0}
      @media(max-width:1000px){.jsf-planner .jsf-planner-side{max-height:none}.jsf-marker-list-scroll{max-height:45vh;max-height:45dvh}}
      .jsf-planner .jsf-marker-list{display:grid;gap:5px;line-height:1.45;overflow-wrap:anywhere}
      .jsf-marker.search-match{background:#805a27;box-shadow:0 0 0 4px #efca83,0 2px 8px #0005;z-index:4}
      .jsf-marker.search-muted{opacity:.25}
      .jsf-marker.selected{z-index:5}
      .jsf-marker-filters{border:0;padding:0;margin:0 0 14px;display:flex;flex-wrap:wrap;gap:5px 12px;flex-shrink:0;min-width:0}
      .jsf-marker-filters legend{padding:0;margin-bottom:5px;font:400 12px Arial,sans-serif;color:#706b66}
      .jsf-marker-filters label{display:flex;align-items:center;gap:6px;min-height:30px;font:400 12px Arial,sans-serif;color:#353535;cursor:pointer}
      .jsf-marker-filters input{accent-color:#706b66;margin:0;width:15px;height:15px;flex-shrink:0}
      @media(pointer:coarse){.jsf-marker-filters label{min-height:44px}}
      .jsf-marker-search{display:grid;gap:6px;flex-shrink:0;font:400 12px Arial,sans-serif;color:#706b66}
      .jsf-marker-search input{width:100%;min-width:0;box-sizing:border-box;border:1px solid #dcd8d2;border-radius:3px;background:#fff;padding:11px;font:400 13px Arial,sans-serif;color:#353535}
      .jsf-marker-search-clear,.jsf-marker-locate{border:0;background:transparent;color:#706b66;text-align:left;font:400 11px Arial,sans-serif;padding:8px 0;cursor:pointer}
      .jsf-marker-search-clear{flex-shrink:0}
      .jsf-marker-result{border-bottom:1px solid #ede9e3;margin-bottom:8px}
      .jsf-marker-locate{min-height:36px;width:100%}
      .jsf-marker-locate:hover{color:#353535;text-decoration:underline}
      .jsf-marker-no-results{font:400 12px/1.5 Arial,sans-serif;color:#77716a}
      @media(pointer:coarse){.jsf-marker-search input{font-size:16px}.jsf-marker-locate,.jsf-marker-search-clear{min-height:44px}}
      .jsf-marker-list-heading{display:flex;justify-content:space-between;gap:8px;font:400 10px/1.4 Arial,sans-serif;color:#77716a}
      .jsf-marker-list-article{font:400 12px/1.45 Arial,sans-serif;color:#353535}
      .jsf-marker-list-text{font:400 11px/1.45 Arial,sans-serif;color:#706b66}
    `}</style>
  </section>;
}

