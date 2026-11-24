import {roadSignModel,withRoadSignModel} from '../../data/roadSignModels';
import {withParkingPole} from '../../data/parkingPole';
import {isRoadSupplement,withRoadSupplement} from '../../data/roadSupplement';
import RoadSignArticleFields from '../../components/products/RoadSignArticleFields';
import ProfessionArticleFields from '../../components/products/ProfessionArticleFields';
import {isProfessionArticle,professionArticleDefaults,prepareProfessionArticle} from '../../data/professionArticleAdmin';
import BraLivArticleFields from '../../components/products/BraLivArticleFields';
import {isBraLivBadge} from '../../data/braLivNameBadges';
import {SALES_UNITS,getSalesUnit} from "../../data/salesUnits";
import ParkingArticleFields from "../../components/products/ParkingArticleFields";
import {parkingConfigError,parkingConfig,parkingFormat} from "../../data/parkingSign";
import ArticleProductionFileField from "../../components/products/ArticleProductionFileField";
import {applyDestinationCubePreset,applyDestinationWallPreset} from "../../data/destinationCube";
import { isAreaPriced, isStripedDecor } from "../../data/areaPricing";
import DibondArticleFields from "../../components/products/DibondArticleFields";
import {applyDibondPreset,dibondConfigError} from "../../data/dibondHelpers";
import ElevatorBoardFields from "../../components/products/ElevatorBoardFields";
import {newElevatorBoard} from "../../components/orders/ElevatorBoardPreview";
import { getDoorSignExamples } from "../../data/doorSignExamples";
import { supportsDoorSymbol, getDoorSymbolConfig } from "../../data/doorSymbolHelpers";
import { getDoorSignPreviewDimensions, isPersonalDoorSign } from "../../data/doorSignDimensions";
import { useMemo, useState } from "react";
import { supportsDoorNumber, getDoorNumberConfig } from "../../data/doorNumberHelpers";
import PageContainer from "../../components/layout/PageContainer";
import { AdminLayout } from "../../components/admin/AdminNavigation";
import AdminCategoryTile from "../../components/admin/AdminCategoryTile";
import { getAllAdminCategories } from "../../data/categoryAdmin";
import { createAdminArticle, deleteAdminArticle, duplicateAdminArticle, getAdminArticles, saveAdminArticle, saveAdminArticleOrder } from "../../data/articleAdmin";
import { applyHangingSignPreset, HANGING_SIGN_PRESETS } from "../../data/hangingSignPresets";

const LINE="#e5e9e6", INK="#171d1a", GREEN="#2f8a63";
const FIELD_OPTIONS=[["destinationCube","Målpunkt och plan"],["name","Namn"],["title","Titel"],["titleLine2","Titel rad 2"],["orgLine1","Verksamhetsnamn rad 1"],["orgLine2","Verksamhetsnamn rad 2"],["customText","Egen text"],["customTextLine1","Textrad 1"],["customTextLine2","Textrad 2"],["doorHeading","Rubrik"],["doorNumber","Nummer på skylten (fet stil, vänster/höger)"],["doorSymbol","Symbol på skylten (vänster/höger)"],["doorName","Namn på dörrskylt"],["doorTitle","Titel på dörrskylt"],["doorExtra","Extra text på dörrskylt"],["arrowPlacement","Pilplacering"],["arrowDirection","Pilriktning"],["leftArrowDirection","Pil vänster sida"],["hangingSignSymbols","Symboler"],["rightArrowDirection","Pil höger sida"],["fastening","Fäste"],["extraMagnets","Extra magneter"],["quantity","Antal"]];
FIELD_OPTIONS.splice(FIELD_OPTIONS.findIndex(([key])=>key==='hangingSignSymbols')+1,0,['hangingSignTargets','Målpunkter']);
function fieldEnabled(fields,key){return Boolean(fields?.[key]);}
function isGreenHangingDraft(article){
  const key=String(article?.categoryId||article?.category||article?.group||"").toLowerCase();
  return article?.productType==="pendlad_skylt" && (key.includes("pendlade-gron")||key.includes("gron")||key.includes("grön")||key.includes("green"));
}
function normalizeHangingFieldsForCategory(article){
  if(!article) return article;
  if(!isGreenHangingDraft(article)) return article;
  const fields={...(article.fields||{})};
  delete fields.hangingSignSymbols;
  delete fields.hangingSignSymbol;
  return {...article,fields,hangingSignBackgroundColor:"#00843D",hangingSignForegroundColor:"#FFFFFF"};
}

function setHangingTextMode(article, mode){
  const nextMode=mode==="double"?"double":"single";
  const fields={...(article?.fields||{})};
  if(nextMode==="double"){
    delete fields.customText;
    fields.customTextLine1=fields.customTextLine1||{type:"text",label:"Textrad 1",placeholder:"Skriv text här",cartLabel:"Text rad 1"};
    fields.customTextLine2=fields.customTextLine2||{type:"text",label:"Textrad 2",placeholder:"Skriv text här",cartLabel:"Text rad 2"};
  }else{
    delete fields.customTextLine1;
    delete fields.customTextLine2;
    fields.customText=fields.customText||{type:"text",label:"Text",placeholder:"Skriv text här",cartLabel:"Text"};
  }
  return {...article,hangingSignTextMode:nextMode,fields};
}


const DEFAULT_DOOR_SIGN_TEXT_CONFIG = {
  lines: 1,
  placeholder: "Skriv text här",
  maxChars: 28,
  fontFamily: "Arial",
  fontWeight: 400,
  fontSize: 178,
  color: "#222222",
  uppercase: true,
  leftPct: 8.3,
  topPct: 13.7,
  widthPct: 73.6,
  lineGapPct: 27.5,
  canvasWidth: 1738,
  canvasHeight: 863,
  layoutMode: "simple",
  // Gemensam mm-baserad textplacering för alla dörrskyltmallar.
  // Värdena mäts från den vita skrivytans vänster-/överkant.
  line1TextHeightMm: 15.5,
  line1LeftMm: 15.85,
  line1BaselineMm: 27.5,
  line2TextHeightMm: 15.5,
  line2LeftMm: 15.85,
  line2BaselineMm: 47.5,
  nameTextHeightMm: 10.1,
  nameLeftMm: 15.85,
  nameBaselineMm: 59.8,
  titleTextHeightMm: 6.56,
  titleLeftMm: 15.85,
  titleBaselineMm: 72.5,
  titleItalic: true,
  brailleLeftMm: 15.85,
  brailleBaselineMm: 70.5,
  brailleFontSizeMm: 6.5,
  roomNumberTextHeightMm: 28,
  roomNumberLeftMm: 138,
  roomNumberBaselineMm: 66,
  // Äldre taktila fält behålls för bakåtkompatibilitet.
  tactileTextHeightMm: 15.5,
  tactileLine1BaselineMm: 27.5,
  tactileLine2BaselineMm: 47.5,
  tactileBrailleBaselineMm: 70.5,
  tactileBrailleFontSizeMm: 6.5,
};

function isDoorSignDraft(article){
  const key=String(article?.categoryId||article?.category||article?.group||"").toLowerCase();
  return article?.productType==="dorrskylt" || key.includes("dorrskylt") || key.includes("dörrskylt");
}

function getDoorSignTextConfig(article){
  const saved=article?.doorSignTextConfig||{};
  const config={...DEFAULT_DOOR_SIGN_TEXT_CONFIG,...saved};
  if(!config.layoutMode || config.layoutMode==="standard") config.layoutMode="simple";

  // Migrera tidigare taktila finjusteringar till de nya gemensamma mm-fälten
  // utan att skriva över nya värden om artikeln redan har dem sparade.
  if(saved.line1TextHeightMm==null && saved.tactileTextHeightMm!=null) config.line1TextHeightMm=Number(saved.tactileTextHeightMm);
  if(saved.line2TextHeightMm==null && saved.tactileTextHeightMm!=null) config.line2TextHeightMm=Number(saved.tactileTextHeightMm);
  if(saved.line1BaselineMm==null && saved.tactileLine1BaselineMm!=null) config.line1BaselineMm=Number(saved.tactileLine1BaselineMm);
  if(saved.line2BaselineMm==null && saved.tactileLine2BaselineMm!=null) config.line2BaselineMm=Number(saved.tactileLine2BaselineMm);
  if(saved.brailleBaselineMm==null && saved.tactileBrailleBaselineMm!=null) config.brailleBaselineMm=Number(saved.tactileBrailleBaselineMm);
  if(saved.brailleFontSizeMm==null && saved.tactileBrailleFontSizeMm!=null) config.brailleFontSizeMm=Number(saved.tactileBrailleFontSizeMm);
  return config;
}

function setDoorSignTextEnabled(article, enabled){
  const fields={...(article?.fields||{})};
  if(enabled){
    const config=getDoorSignTextConfig(article);
    const personalModes=isPersonalDoorSign({...article,doorSignTextEnabled:true,previewType:"door_sign",doorSignTextConfig:config})?[config.layoutMode]:[];
    if(personalModes.includes(config.layoutMode)){
      delete fields.customText; delete fields.customTextLine2;
      // Personalmallar: kunden väljer själv om andra textraden, namn och titel behövs.
      fields.doorHeading={type:"text",label:"Text",placeholder:"EXPEDITION",maxLength:40,cartLabel:"Text"};
      delete fields.doorName; delete fields.doorTitle; delete fields.doorExtra;
    }else{
      delete fields.doorHeading; delete fields.doorName; delete fields.doorTitle; delete fields.doorExtra;
      const label = config.layoutMode==="tactile" ? "Egen text" : "Text";
      fields.customText={type:"text",label,placeholder:config.placeholder,maxLength:config.maxChars,cartLabel:"Text"};
    }

    // Taktil skylt: huvudtext + kundstyrd extra textrad via specialrenderaren.
    if(config.layoutMode==="tactile" && !personalModes.includes(config.layoutMode)){
      delete fields.customTextLine2;
    }else if(!personalModes.includes(config.layoutMode) && Number(config.lines)===2){
      fields.customTextLine2={
        type:"text",
        label:"Textrad 2",
        placeholder:config.placeholder,
        maxLength:config.maxChars,
        cartLabel:"Text rad 2",
      };
    }else{
      delete fields.customTextLine2;
    }

    return {...article,doorSignTextEnabled:true,doorSignTextConfig:config,fields,productType:"dorrskylt",previewType:"door_sign",flowType:"form"};
  }
  delete fields.customText;
  delete fields.customTextLine2;
  delete fields.doorHeading; delete fields.doorName; delete fields.doorTitle; delete fields.doorExtra;
  return {...article,doorSignTextEnabled:false,fields,previewType:"image",flowType:"direct"};
}

function updateDoorSignTextConfig(article, patch){
  const config={...getDoorSignTextConfig(article),...patch};
  let next={...article,doorSignTextConfig:config};
  if(article?.doorSignTextEnabled){
    next=setDoorSignTextEnabled(next,true);
  }
  return next;
}

function getDoorTemplateDefaults(mode){
  const common={layoutMode:mode,color:"#222222",fontWeight:400};
  const presets={
    simple:{lines:1,line1TextHeightMm:15.5,line1LeftMm:15.85,line1BaselineMm:27.5,line2TextHeightMm:15.5,line2LeftMm:15.85,line2BaselineMm:47.5},
    tactile:{lines:1,line1TextHeightMm:15.5,line1LeftMm:15.85,line1BaselineMm:27.5,line2TextHeightMm:15.5,line2LeftMm:15.85,line2BaselineMm:47.5,brailleLeftMm:15.85,brailleBaselineMm:70.5,brailleFontSizeMm:6.5},
    expedition:{lines:1,line1TextHeightMm:15.5,line1LeftMm:15.85,line1BaselineMm:27.5,line2TextHeightMm:15.5,line2LeftMm:15.85,line2BaselineMm:47.5,nameTextHeightMm:10.1,nameLeftMm:15.85,nameBaselineMm:59.8,titleTextHeightMm:6.56,titleLeftMm:15.85,titleBaselineMm:72.5},
    occupancy_whiteboard_personal:{previewHeightMm:281.25,lines:1,line1TextHeightMm:15.5,line1LeftMm:15.85,line1BaselineMm:27.5,line2BaselineMm:47.5,nameTextHeightMm:10.1,nameLeftMm:15.85,nameBaselineMm:59.8,titleTextHeightMm:6.56,titleLeftMm:15.85,titleBaselineMm:72.5},
    whiteboard_personal:{lines:1,line1TextHeightMm:15.5,line1LeftMm:9,line1BaselineMm:24,line2TextHeightMm:11,line2LeftMm:9,line2BaselineMm:43,nameTextHeightMm:8.5,nameLeftMm:9,nameBaselineMm:38,titleTextHeightMm:5.2,titleLeftMm:9,titleBaselineMm:45},
    whiteboard:{lines:2,line1TextHeightMm:11.5,line1LeftMm:9,line1BaselineMm:20,line2TextHeightMm:11.5,line2LeftMm:9,line2BaselineMm:34,brailleLeftMm:9,brailleBaselineMm:49,brailleFontSizeMm:4.8},
    occupancy:{lines:2,line1TextHeightMm:9.5,line1LeftMm:9,line1BaselineMm:18,line2TextHeightMm:9.5,line2LeftMm:9,line2BaselineMm:31,roomNumberTextHeightMm:23,roomNumberLeftMm:139,roomNumberBaselineMm:47},
    occupancy_whiteboard:{lines:2,line1TextHeightMm:9.5,line1LeftMm:9,line1BaselineMm:18,line2TextHeightMm:9.5,line2LeftMm:9,line2BaselineMm:31,roomNumberTextHeightMm:23,roomNumberLeftMm:139,roomNumberBaselineMm:49},
    dual_whiteboard:{lines:2,line1TextHeightMm:11.5,line1LeftMm:9,line1BaselineMm:22,line2TextHeightMm:10,line2LeftMm:9,line2BaselineMm:82},
    room_number_status:{lines:2,line1TextHeightMm:9.5,line1LeftMm:9,line1BaselineMm:18,line2TextHeightMm:9.5,line2LeftMm:9,line2BaselineMm:31,brailleLeftMm:9,brailleBaselineMm:49,brailleFontSizeMm:4.6,roomNumberTextHeightMm:31,roomNumberLeftMm:26,roomNumberBaselineMm:107},
  };
  return {...common,...(presets[mode]||presets.simple)};
}

function getArticleCardImage(article){
  return article?.cardImage || article?.image || "";
}

function applyTemplateToDraft(draft, templateId){
  if(!templateId || templateId==="standard"){
    const next={...draft};
    delete next.hangingSignPreset; delete next.hangingSignRules; delete next.hangingSignSizeMm; delete next.hangingSignHeightMm; delete next.hangingSignSides;
    return next;
  }
  return applyHangingSignPreset(draft, templateId, draft?.hangingSignSides || 1);
}

function getImageStyle(item){
  const fit=item?.imageFit||"contain";
  const rawScale=Math.min(Math.max(Number(item?.imageScale)||100,50),140);
  if(fit==="cover") {
    return {
      width:"100%",
      height:"100%",
      objectFit:"cover",
      display:"block",
      transform:`scale(${rawScale/100})`,
      transformOrigin:"center"
    };
  }
  // I läget "Visa hela bilden" får bilden aldrig kapas.
  // Vi skalar en osynlig bildyta i både bredd och höjd och låter
  // object-fit: contain passa in originalets proportioner i den ytan.
  const scale=Math.min(rawScale,100);
  return {
    width:`${scale}%`,
    height:`${scale}%`,
    objectFit:"contain",
    display:"block"
  };
}

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function optimizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Filen är inte en bild."));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error("Bilden är för stor. Max 8 MB per bild."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kunde inte läsa bilden."));
    reader.onload = () => {
      const source = String(reader.result || "");
      if (file.type === "image/svg+xml") {
        resolve(source);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("Kunde inte öppna bilden."));
      img.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const usePng = file.type === "image/png" && source.length < 900000;
        resolve(canvas.toDataURL(usePng ? "image/png" : "image/webp", usePng ? undefined : 0.82));
      };
      img.src = source;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminArticlesPage({
  onOpenDashboard,onOpenBadgeOrders,onOpenOrders,onOpenStatistics,onOpenPlanning,onOpenArticles,onOpenArticleGroups,onOpenProjects,onOpenUsers,onOpenDrawings,onOpenSettings,onOpenPortal,onOpenSymbols,onOpenApprovalOrders,onOpenProfile,role,user,onLogout,
  adminPassword,onCatalogChanged
}){
  const [version,setVersion]=useState(0);
  const [orderIds,setOrderIds]=useState(null);
  const [savingOrder,setSavingOrder]=useState(false);
  const [orderNotice,setOrderNotice]=useState("");
  const [orderError,setOrderError]=useState("");
  const [draggedArticle,setDraggedArticle]=useState(null);
  const [search,setSearch]=useState("");
  const [selectedCategory,setSelectedCategory]=useState(null);
  const [view,setView]=useState("grid");
  const [draft,setDraft]=useState(null);
  const [imageMessage,setImageMessage]=useState("");
  const [saveMessage,setSaveMessage]=useState("");
  const [productionBusy,setProductionBusy]=useState(false);
  const [advancedJson,setAdvancedJson]=useState("");
  const [advancedDirty,setAdvancedDirty]=useState(false);
  const articles=getAdminArticles();
  const categories=getAllAdminCategories();
  void version;
  const categoryMap=useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);
  const counts=useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,articles.filter(a=>a.categoryId===c.id).length])),[categories,articles]);
  const activeCategory=selectedCategory || categories.find(c=>counts[c.id]>0)?.id || categories[0]?.id;
  const q=search.trim().toLowerCase();
  const visibleArticles=useMemo(()=>articles.filter(a=>{
    const matchesCategory=!activeCategory||a.categoryId===activeCategory;
    const hay=`${a.articleNumber||""} ${a.name||""} ${a.desc||""}`.toLowerCase();
    return matchesCategory && (!q||hay.includes(q));
  }),[articles,activeCategory,q]);
  function refresh(){setVersion(v=>v+1)}
  function startOrdering(){
    setSearch("");setOrderNotice("");setOrderError("");
    setOrderIds(articles.filter(a=>a.categoryId===activeCategory).map(a=>String(a.id)));
  }
  function moveArticle(id,position){
    if(savingOrder)return;
    setOrderIds(previous=>{
      if(!previous||!previous.includes(id))return previous;
      const next=previous.filter(value=>value!==id);
      next.splice(Math.max(0,Math.min(next.length,position)),0,id);
      return next;
    });
  }
  async function saveOrder(){
    if(savingOrder)return;
    setSavingOrder(true);setOrderError("");
    try{
      await saveAdminArticleOrder(activeCategory,orderIds,adminPassword);
      refresh();setOrderIds(null);setOrderNotice("Artikelordningen är sparad.");
      await onCatalogChanged?.();
    }catch(error){setOrderError(error.message||"Kunde inte spara ordningen. Försök igen.");}
    finally{setSavingOrder(false);}
  }
  function edit(a){
    setImageMessage("");
    setSaveMessage("");
    const next=JSON.parse(JSON.stringify(a));
    setDraft(next);
    setAdvancedJson(JSON.stringify(next,null,2));
    setAdvancedDirty(false);
  }
  function close(){if(productionBusy)return;setImageMessage("");setSaveMessage("");setDraft(null)}
  async function save(){
    if(productionBusy)return;
    try{
      let next={...draft,isImplemented:Boolean(draft.isImplemented)};
      if(advancedDirty && advancedJson.trim()){
        const parsed=JSON.parse(advancedJson);
        next={...next,...parsed,id:draft.id};
      }
      if(isProfessionArticle(next))next=prepareProfessionArticle(next);
      if(next.previewType==="destination_cube") next=next.destinationSignVariant==="wall"?applyDestinationWallPreset(next):applyDestinationCubePreset(next);
      if(next.previewType==="parking_sign"){const error=parkingConfigError(next);if(error)throw new Error(error);const c=parkingConfig(next);next={...next,parkingSignConfig:c,flowType:"form",directAddToCart:false,fields:{customTextLine1:{label:"Textrad 1",maxLength:80},customTextLine2:{label:"Textrad 2 (valfri)",maxLength:80},quantity:true},format:parkingFormat(next)};}
      if(next.roadSignCustomSize){if(![next.roadSignWidthMm,next.roadSignHeightMm].every(value=>Number(value)>=50&&Number(value)<=3000))throw new Error('Ange bredd och höjd mellan 50 och 3000 mm.');next=withRoadSignModel(next,next.roadSignModel);}
      if(isRoadSupplement(next)&&next.roadSupplementCustomSize){if(![next.roadSignWidthMm,next.roadSignHeightMm].every(value=>Number(value)>=50&&Number(value)<=3000))throw new Error('Ange bredd och höjd mellan 50 och 3000 mm.');next=withRoadSupplement(next);}
      if(roadSignModel(next)?.editableWidth&&(!Number.isFinite(Number(next.roadSignWidthMm))||Number(next.roadSignWidthMm)<50||Number(next.roadSignWidthMm)>3000))throw new Error('Ange en bredd mellan 50 och 3000 mm.');
      if(next.previewType==="dibond_sign"){const error=dibondConfigError(next);if(error)throw new Error(error);next={...next,flowType:"form",directAddToCart:false,fields:{dibond:true,quantity:true},format:isRoadSupplement(next)?withRoadSupplement(next).format:roadSignModel(next)?.shape==='circle'?`Ø ${next.dibondConfig.defaultWidthMm} mm`:next.roadSignModel?`${next.dibondConfig.defaultWidthMm} × ${next.dibondConfig.defaultHeightMm} mm`:`Max ${next.dibondConfig.maxWidthMm} × ${next.dibondConfig.maxHeightMm} mm`};}
      if(isAreaPriced(next)) next={...next,pricingMode:"area",flowType:"form",directAddToCart:false,fields:{...next.fields,areaDimensions:true,quantity:true}};
      if(String(next.articleNumber).trim()==='1503')next=withParkingPole(next);
      setSaveMessage("Sparar...");
      await saveAdminArticle(next,adminPassword);
      if(onCatalogChanged) await onCatalogChanged();
      refresh();
      setSaveMessage("Sparad");
      close();
    }catch(err){setSaveMessage("");setImageMessage(err?.message||"Kunde inte spara artikeln.");}
  }
  function addStripedDecor(){
    const source=articles.find(a=>a.categoryId==="etsfoliering"&&!isStripedDecor(a));
    const used=new Set(articles.map(a=>String(a.articleNumber)));
    let number=1702;while(used.has(String(number)))number++;
    const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><pattern id="s" width="600" height="80" patternUnits="userSpaceOnUse"><rect width="600" height="40" fill="#cbd0d0"/></pattern></defs><rect width="600" height="400" fill="url(#s)"/></svg>');
    edit(createAdminArticle({categoryId:"etsfoliering",isImplemented:true,name:"Randig dekor",articleNumber:String(number),desc:"Randig etsfoliering",pricingMode:"area",decorStyle:"striped",flowType:"form",previewType:"image",fields:{quantity:true,areaDimensions:true},unitPrice:Number(source?.unitPrice)||0,defaultStripeHeightMm:50,defaultStripeGapMm:50,image,images:[image]}));
  }
  function add(categoryId=activeCategory){
    const a=createAdminArticle({categoryId:categoryId||"namnbrickor"});
    edit(categoryId==='yrkestitelsskyltar'?professionArticleDefaults(a):a);
  }
  function duplicate(a){
    const copy=duplicateAdminArticle(a);
    edit(copy);
  }
  async function remove(a){
    if(!window.confirm(`Radera “${a.name}”? Artikeln tas bort från artikelregistret och beställningsportalen.`))return;
    try{
      await deleteAdminArticle(a,adminPassword);
      if(onCatalogChanged) await onCatalogChanged();
      refresh();
    }catch(err){window.alert(err?.message||"Kunde inte radera artikeln.");}
  }

  async function addImages(files){
    const selected=Array.from(files||[]);
    if(!selected.length||!draft)return;
    const current=Array.isArray(draft.images)&&draft.images.length?draft.images:(draft.image?[draft.image]:[]);
    const room=Math.max(0,MAX_IMAGES-current.length);
    if(!room){setImageMessage(`Max ${MAX_IMAGES} bilder per artikel.`);return;}
    try{
      const optimized=[];
      for(const file of selected.slice(0,room)) optimized.push(await optimizeImageFile(file));
      const images=[...current,...optimized];
      const primaryImageIndex=Math.min(Number(draft.primaryImageIndex)||0,Math.max(images.length-1,0));
      const cardImageIndex=Math.min(Number(draft.cardImageIndex ?? primaryImageIndex)||0,Math.max(images.length-1,0));
      setDraft({...draft,images,primaryImageIndex,cardImageIndex,image:images[primaryImageIndex]||"",cardImage:images[cardImageIndex]||images[primaryImageIndex]||""});
      setImageMessage(`${optimized.length} bild${optimized.length===1?"":"er"} tillagd${optimized.length===1?"":"a"}.`);
    }catch(err){setImageMessage(err?.message||"Kunde inte lägga till bilden.");}
  }
  function setPrimaryImage(index){
    const images=Array.isArray(draft?.images)?draft.images:[];
    if(!images[index])return;
    setDraft({...draft,primaryImageIndex:index,image:images[index]});
  }
  function setCardImage(index){
    const images=Array.isArray(draft?.images)?draft.images:[];
    if(!images[index])return;
    setDraft({...draft,cardImageIndex:index,cardImage:images[index]});
  }
  function removeImage(index){
    const images=(Array.isArray(draft?.images)?draft.images:[]).filter((_,i)=>i!==index);
    let primary=Number(draft?.primaryImageIndex)||0;
    let card=Number(draft?.cardImageIndex ?? primary)||0;
    if(index<primary) primary-=1; else if(index===primary) primary=0;
    if(index<card) card-=1; else if(index===card) card=0;
    primary=Math.min(Math.max(primary,0),Math.max(images.length-1,0));
    card=Math.min(Math.max(card,0),Math.max(images.length-1,0));
    setDraft({...draft,images,primaryImageIndex:primary,cardImageIndex:card,image:images[primary]||"",cardImage:images[card]||images[primary]||""});
  }

  async function setDoorSignPreviewImage(file){
    if(!file||!draft)return;
    try{
      const image=await optimizeImageFile(file);
      setDraft({...draft,doorSignPreviewImage:image});
      setImageMessage("Previewbilden för egen text är uppdaterad.");
    }catch(err){
      setImageMessage(err?.message||"Kunde inte lägga till previewbilden.");
    }
  }

  return <PageContainer><AdminLayout active="articles"
    onOpenDashboard={onOpenDashboard} onOpenBadgeOrders={onOpenBadgeOrders} onOpenOrders={onOpenOrders} onOpenStatistics={onOpenStatistics} onOpenPlanning={onOpenPlanning}
    onOpenArticles={onOpenArticles} onOpenArticleGroups={onOpenArticleGroups} onOpenProjects={onOpenProjects}
    onOpenUsers={onOpenUsers} onOpenDrawings={onOpenDrawings} onOpenSettings={onOpenSettings} onOpenPortal={onOpenPortal} onOpenSymbols={onOpenSymbols} onOpenApprovalOrders={onOpenApprovalOrders} onOpenProfile={onOpenProfile} role={role} user={user} onLogout={onLogout}>
    <main className="articles-main">
      <header className="articles-top">
        <div className="search"><span>⌕</span><input disabled={orderIds!==null} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sök i artiklar, artikelnummer eller beskrivning..."/></div>
        <div className="view-toggle"><button className={view==="grid"?"active":""} onClick={()=>setView("grid")}>▦ Kortvy</button><button className={view==="list"?"active":""} onClick={()=>setView("list")}>☷ Listvy</button></div>
        <button className="new-button" disabled={orderIds!==null} onClick={()=>add()}>＋ Ny artikel</button>
      </header>

      <section className="category-section">
        <div className="section-kicker">ALLA KATEGORIER</div>
        <h1>Välj kategori</h1>
        
        <fieldset className="article-category-lock" disabled={orderIds!==null}><div className="category-grid">
          {categories.map(c=><AdminCategoryTile key={c.id} title={c.title} count={counts[c.id]||0} status={c.status} active={activeCategory===c.id} onClick={()=>setSelectedCategory(c.id)}/>) }
        </div></fieldset>
      </section>

      {activeCategory && <section className="products-panel">
        <div className="panel-head"><div><h2>{categoryMap[activeCategory]?.title||activeCategory}</h2><span>{visibleArticles.length} {visibleArticles.length===1?"artikel":"artiklar"}</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{role==="admin"&&orderIds===null&&<button disabled={(counts[activeCategory]||0)<2} onClick={startOrdering}>Ändra ordning</button>}{orderIds===null&&<>{activeCategory==="etsfoliering"&&<button onClick={addStripedDecor}>＋ Randig dekor</button>}<button onClick={()=>add(activeCategory)}>＋ Ny artikel</button></>}</div></div>
        {orderNotice&&<p role="status" className="article-order-notice">{orderNotice}</p>}
        {orderError&&<p role="alert" className="article-order-error">{orderError}</p>}
        {orderIds!==null ? <div className="article-order-editor" aria-busy={savingOrder}>
          <div className="article-order-toolbar"><p>Dra artiklarna, använd pilarna eller välj en placering. Ordningen används även på beställningssidan inom respektive produktgrupp.</p><div><button type="button" disabled={savingOrder} onClick={()=>{setOrderIds(null);setOrderError("");}}>Avbryt</button><button type="button" className="article-order-save" disabled={savingOrder} onClick={saveOrder}>{savingOrder?"Sparar…":"Spara ordning"}</button></div></div>
          <ol className="article-order-list">{orderIds.map((id,index)=>{
            const article=articles.find(a=>String(a.id)===id);
            if(!article)return null;
            const label=[article.articleNumber,article.name].filter(Boolean).join(" · ");
            return <li key={id} className={draggedArticle===id?"is-dragging":""} draggable={!savingOrder}
              onDragStart={event=>{setDraggedArticle(id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",id);}}
              onDragOver={event=>{if(!savingOrder&&draggedArticle){event.preventDefault();event.dataTransfer.dropEffect="move";}}}
              onDrop={event=>{event.preventDefault();if(draggedArticle)moveArticle(draggedArticle,index);setDraggedArticle(null);}}
              onDragEnd={()=>setDraggedArticle(null)}>
              <span className="article-order-grip" aria-hidden="true">⠿</span><span className="article-order-number">{index+1}</span>
              {getArticleCardImage(article)&&<img src={getArticleCardImage(article)} alt="" draggable={false}/>}
              <div className="article-order-copy"><b>{article.articleNumber||"Utan art.nr"}</b><span>{article.name}</span></div>
              <div className="article-order-controls"><button type="button" aria-label={"Flytta upp "+label} disabled={savingOrder||index===0} onClick={()=>moveArticle(id,index-1)}>↑</button><button type="button" aria-label={"Flytta ned "+label} disabled={savingOrder||index===orderIds.length-1} onClick={()=>moveArticle(id,index+1)}>↓</button>
              <label>Placering<select aria-label={"Placering för "+label} value={index} disabled={savingOrder} onChange={event=>moveArticle(id,Number(event.target.value))}>{orderIds.map((_,position)=><option key={position} value={position}>{position+1}</option>)}</select></label></div>
            </li>;
          })}</ol>
        </div> : visibleArticles.length ? (
          <div className={view==="grid"?"product-grid":"product-list"}>
            {visibleArticles.map(a=>view==="grid" ? <article className="product-card" key={a.id} onClick={()=>edit(a)}>
              <div className="media">{getArticleCardImage(a)?<img src={getArticleCardImage(a)} alt={a.name||"Artikelbild"} style={getImageStyle(a)}/>:<span>◇</span>}<em className={a.isImplemented&&!a.adminArchived?"active":"inactive"}>{a.isImplemented&&!a.adminArchived?(a.storefrontOrderable===false?"Endast korrektur":"Aktiv"):"Inaktiv"}</em></div>
              <div className="info"><b>{a.articleNumber||"Utan art.nr"}</b><h3>{a.name||"Namnlös artikel"}</h3><p>{a.desc||"Ingen beskrivning"}</p><div className="price-line">{Number(a.unitPrice)>0?`${Number(a.unitPrice).toLocaleString("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2})} kr/${isAreaPriced(a)?"m²":getSalesUnit(a)}`:"Pris ej angivet"}</div></div>
              <div className="actions" onClick={e=>e.stopPropagation()}><button className="edit-action" onClick={()=>edit(a)}>Redigera</button><button onClick={()=>duplicate(a)}>Duplicera</button><button className="danger-action" onClick={()=>remove(a)}>Radera</button></div>
            </article> : <article className="product-row" key={a.id} onClick={()=>edit(a)}>
              <div className="thumb">{getArticleCardImage(a)?<img src={getArticleCardImage(a)} alt="" style={getImageStyle(a)}/>:<span>◇</span>}</div><div className="row-copy"><b>{a.articleNumber||"Utan art.nr"}</b><span>{a.name}</span><small>{a.desc}</small></div><span className={`row-status ${a.isImplemented&&!a.adminArchived?"active":"inactive"}`}>{a.isImplemented&&!a.adminArchived?(a.storefrontOrderable===false?"Endast korrektur":"Aktiv"):"Inaktiv"}</span><span className="row-arrow">›</span>
            </article>)}
          </div>
        ):<div className="empty">Inga artiklar i den här kategorin matchar sökningen.</div>}
      </section>}
      
    </main>

    {draft&&<div className="modal-bg" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="modal"><div className="modal-head"><div><span>ARTIKEL</span><h2>{String(draft.id||"").startsWith("article-")?"Ny artikel":"Redigera artikel"}</h2></div><button onClick={close}>×</button></div><div className="form-grid">
      <label><span>Artikelnummer</span><input value={draft.articleNumber||""} onChange={e=>setDraft({...draft,articleNumber:e.target.value})}/></label>
      <label><span>Artikelgrupp</span><select value={draft.categoryId||""} onChange={e=>setDraft(e.target.value==='yrkestitelsskyltar'?professionArticleDefaults({...draft,categoryId:e.target.value}):normalizeHangingFieldsForCategory({...draft,categoryId:e.target.value}))}>{categories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="wide"><span>Namn</span><input value={draft.name||""} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label className="wide"><span>Beskrivning</span><textarea value={draft.desc||""} onChange={e=>setDraft({...draft,desc:e.target.value})}/></label>
      {isProfessionArticle(draft)&&<ProfessionArticleFields article={draft} onChange={setDraft}/>}
      <label><span>{`Pris/${isAreaPriced(draft)?"m²":getSalesUnit(draft)} (SEK)`}</span><input type="number" min="0" step="0.01" value={draft.unitPrice ?? 0} onChange={e=>setDraft({...draft,unitPrice:Math.max(0,Number(e.target.value)||0),currency:"SEK"})}/></label>
      <label><span>Försäljningsenhet</span><select value={getSalesUnit(draft)} onChange={e=>setDraft({...draft,salesUnit:e.target.value})}>{SALES_UNITS.map(unit=><option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label>
      <label><span>Prissättning</span><select value={isAreaPriced(draft)?"area":"piece"} onChange={event=>setDraft({...draft,pricingMode:event.target.value,...(event.target.value==="area"?{flowType:"form",directAddToCart:false}: {})})}><option value="piece">Pris per försäljningsenhet</option><option value="area">Pris per m² – egna mått</option></select></label>
      {isAreaPriced(draft)&&<label><span>Dekor</span><select value={isStripedDecor(draft)?"striped":"solid"} onChange={e=>setDraft({...draft,decorStyle:e.target.value})}><option value="solid">Heltäckande dekor</option><option value="striped">Randig dekor</option></select></label>}
      <div className="wide image-manager"><div className="image-manager-head"><div><span>Produktbilder</span></div><label className="upload-button">＋ Lägg till bilder<input type="file" accept="image/*" multiple onChange={e=>{addImages(e.target.files);e.target.value="";}}/></label></div>
        <div className="image-grid">{((draft.images&&draft.images.length)?draft.images:(draft.image?[draft.image]:[])).map((src,index)=>{const isPrimary=index===(Number(draft.primaryImageIndex)||0);const isCard=index===(Number(draft.cardImageIndex ?? draft.primaryImageIndex)||0);return <div className={`image-item ${isPrimary?"primary":""} ${isCard?"card-selected":""}`} key={`${index}-${String(src).slice(0,16)}`}><div className="image-preview"><img src={src} alt={`Produktbild ${index+1}`} style={getImageStyle(draft)}/>{isCard&&<span className="card-image-badge">Kortbild</span>}</div><div className="image-controls"><button type="button" className={isPrimary?"primary-image-button":""} onClick={()=>setPrimaryImage(index)}>{isPrimary?"✓ Huvudbild":"Huvudbild"}</button><button type="button" className={isCard?"card-image-button active":"card-image-button"} onClick={()=>setCardImage(index)}>{isCard?"✓ Kortbild":"Kortbild"}</button><button type="button" className="remove-image" onClick={()=>removeImage(index)}>Ta bort</button></div></div>})}</div>
        {!((draft.images&&draft.images.length)||draft.image)&&<div className="image-empty">Ingen produktbild ännu.</div>}
        {imageMessage&&<div className="image-message">{imageMessage}</div>}
        <div className="image-display-settings"><label><span>Bildvisning</span><select value={draft.imageFit||"contain"} onChange={e=>{const imageFit=e.target.value;setDraft({...draft,imageFit,imageScale:imageFit==="contain"?Math.min(Number(draft.imageScale)||100,100):(Number(draft.imageScale)||100)});}}><option value="contain">Visa hela bilden</option><option value="cover">Fyll bildytan</option></select></label><label><span>Bildstorlek: {Math.min(Number(draft.imageScale)||100,(draft.imageFit||"contain")==="contain"?100:140)}%</span><input type="range" min="50" max={(draft.imageFit||"contain")==="contain"?"100":"140"} step="5" value={Math.min(Number(draft.imageScale)||100,(draft.imageFit||"contain")==="contain"?100:140)} onChange={e=>setDraft({...draft,imageScale:Number(e.target.value)})}/></label></div>
      </div>
      <div className="wide template-box"><div><span>Produktmall</span></div><select value={draft.hangingSignPreset||"standard"} onChange={e=>setDraft(applyTemplateToDraft(draft,e.target.value))}><option value="standard">Standardartikel</option>{Object.values(HANGING_SIGN_PRESETS).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>{draft.hangingSignPreset&&<select value={Number(draft.hangingSignSides)||1} onChange={e=>setDraft(applyHangingSignPreset(draft,draft.hangingSignPreset,Number(e.target.value)))}><option value={1}>Enkelsidig</option><option value={2}>Dubbelsidig</option></select>}</div>
      {draft.hangingSignPreset&&<>
        
        <label><span>Skyltens höjd (mm)</span><input type="number" min="50" max="1000" step="1" value={draft.hangingSignHeightMm || draft.hangingSignRules?.heightMm || ""} onChange={e=>setDraft({...draft,hangingSignHeightMm:Number(e.target.value)||0})}/></label>
        <label><span>Antal textrader</span><select value={draft.hangingSignTextMode||"single"} onChange={e=>setDraft(setHangingTextMode(draft,e.target.value))}><option value="single">1 textrad</option><option value="double">2 textrader</option></select></label>
      </>}
      <label><span>Flöde</span><select value={draft.flowType||"form"} onChange={e=>setDraft({...draft,flowType:e.target.value,directAddToCart:e.target.value==="direct"})}><option value="form">Formulär</option><option value="direct">Direktartikel</option><option value="profession">Yrkestitel</option></select></label>
      <label><span>Produkttyp</span><input value={draft.productType||""} onChange={e=>setDraft({...draft,productType:e.target.value})}/></label>
      <label><span>Preview-typ</span><input value={draft.previewType||""} onChange={e=>setDraft({...draft,previewType:e.target.value})}/></label>
      <label className="wide"><span>Skylt/dekal med egen text och valbar svart ram</span><input type="checkbox" checked={draft.previewType==="dibond_sign"} onChange={event=>setDraft(event.target.checked?applyDibondPreset(draft,300):{...draft,previewType:"image",fields:{quantity:true}})}/></label>
      {draft.previewType==="parking_sign"&&<ParkingArticleFields article={draft} onChange={setDraft}/>}
      {draft.previewType==="dibond_sign"&&<DibondArticleFields article={draft} onChange={setDraft}/>}
      <label className="wide"><span>Målpunktskub med redigerbar målpunkt och plan</span><input type="checkbox" checked={draft.previewType==="destination_cube"&&draft.destinationSignVariant!=="wall"} onChange={event=>setDraft(event.target.checked?applyDestinationCubePreset(draft):{...draft,previewType:"image",productType:"standard",fields:{quantity:true}})}/></label>
      <label className="wide"><span>Målpunktsskylt för vägg med redigerbar målpunkt och plan</span><input type="checkbox" checked={draft.previewType==="destination_cube"&&draft.destinationSignVariant==="wall"} onChange={event=>setDraft(event.target.checked?applyDestinationWallPreset(draft):{...draft,destinationSignVariant:undefined,previewType:"image",productType:"standard",fields:{quantity:true}})}/></label>
      <label className="wide"><span>Hisstavla med redigerbara plan</span><input type="checkbox" checked={draft.previewType==="elevator_board"} onChange={event=>setDraft({...draft,previewType:event.target.checked?"elevator_board":"image",productType:event.target.checked?"hisstavla":draft.productType,flowType:"form",fields:{...draft.fields,quantity:true},...(event.target.checked?{elevatorBoardConfig:draft.elevatorBoardConfig||newElevatorBoard()}:{})})}/></label>
      {draft.previewType==="elevator_board"&&<div className="wide">{!draft.elevatorBoards?.length&&<ElevatorBoardFields board={draft.elevatorBoardConfig||newElevatorBoard()} onChange={elevatorBoardConfig=>setDraft({...draft,elevatorBoardConfig})} allowStructure/>}</div>}

      <label><span>Grupp / variant</span><input value={draft.group||""} onChange={e=>setDraft({...draft,group:e.target.value})}/></label>
      <label><span>Format / mått</span><input value={draft.format||""} onChange={e=>setDraft({...draft,format:e.target.value})}/></label>
      <label><span>Produktetikett</span><input value={draft.productTypeLabel||""} onChange={e=>setDraft({...draft,productTypeLabel:e.target.value})}/></label>
      <label><span>Katalogbeteende</span><input value={draft.catalogBehavior||""} onChange={e=>setDraft({...draft,catalogBehavior:e.target.value})}/></label>
      {isBraLivBadge(draft)&&<BraLivArticleFields article={draft} onChange={setDraft}/>}
      {draft.previewType==='dibond_sign'&&<RoadSignArticleFields article={draft} onChange={setDraft} credential={adminPassword} onBusyChange={setProductionBusy}/>}
      <ArticleProductionFileField key={draft.id} value={draft.productionFile} credential={adminPassword} onBusyChange={setProductionBusy} onChange={file=>setDraft(previous=>({...previous,productionFile:file}))}/>
      {isDoorSignDraft(draft)&&<div className="wide door-text-settings">
        <div className="door-text-head"><div><b>Egen text på dörrskylt</b></div><label className="toggle"><input type="checkbox" checked={Boolean(draft.doorSignTextEnabled)} onChange={e=>setDraft(setDoorSignTextEnabled(draft,e.target.checked))}/> Tillåt egen text</label></div>
        {draft.doorSignTextEnabled&&(()=>{const c=getDoorSignTextConfig(draft);return <>
          <div className="door-preview-image-box">
            <div className="door-preview-image-copy"><b>Previewbild för egen text</b></div>
            <div className="door-preview-image-actions">
              {draft.doorSignPreviewImage?<div className="door-preview-thumb"><img src={draft.doorSignPreviewImage} alt="Tom previewbild för dörrskylt"/></div>:<div className="door-preview-empty">Ingen separat previewbild vald</div>}
              <label className="upload-button">＋ {draft.doorSignPreviewImage?"Byt previewbild":"Lägg till previewbild"}<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)setDoorSignPreviewImage(file);e.target.value="";}}/></label>
              {draft.doorSignPreviewImage&&<button type="button" className="door-preview-remove" onClick={()=>setDraft({...draft,doorSignPreviewImage:""})}>Ta bort</button>}
            </div>
          </div>
          <div className="door-text-grid">
          <label><span>Dörrskylt-mall</span><select value={c.layoutMode||"simple"} onChange={e=>{const mode=e.target.value;setDraft(updateDoorSignTextConfig(draft,getDoorTemplateDefaults(mode)))}}><option value="simple">Enkel rumsfunktion</option><option value="tactile">Taktil + punktskrift</option><option value="whiteboard">Text + whiteboard / pennhållare</option><option value="whiteboard_personal">Text + namn/titel + whiteboard</option><option value="occupancy">Text + UPPTAGET / LEDIGT</option><option value="occupancy_whiteboard_personal">Text + namn/titel + UPPTAGET / LEDIGT + whiteboard (3 delar)</option><option value="occupancy_whiteboard">Text + UPPTAGET / LEDIGT + whiteboard</option><option value="dual_whiteboard">Två textfält + whiteboard</option><option value="room_number_status">Rumsnummer + status / smitta</option><option value="expedition">Expedition / personalskylt</option></select></label>
          <label><span>Exempeltext på skylten</span><textarea rows={2} value={c.exampleHeading ?? getDoorSignExamples(draft).heading} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{exampleHeading:e.target.value.split(/\r?\n/).slice(0,2).join("\n")}))}/></label>
          {isPersonalDoorSign(draft)&&<>
            <label><span>Exempelnamn på skylten</span><textarea rows={2} value={c.exampleName ?? getDoorSignExamples(draft).name} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{exampleName:e.target.value.split(/\r?\n/).slice(0,2).join("\n")}))}/></label>
            <label><span>Exempeltitel på skylten</span><input value={c.exampleTitle ?? getDoorSignExamples(draft).title} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{exampleTitle:e.target.value}))}/></label>
          </>}
          <label><span>Preview – totalhöjd (mm)</span><input type="number" min="93.75" max="2000" step="0.01" value={getDoorSignPreviewDimensions(draft).heightMm} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{previewHeightMm:Math.min(2000,Math.max(93.75,Number(e.target.value)||93.75))}))}/></label>
          {!["expedition","whiteboard_personal","tactile","dual_whiteboard"].includes(c.layoutMode)&&<label><span>Antal textrader</span><select value={Number(c.lines)||1} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{lines:Number(e.target.value)}))}><option value={1}>1 textrad</option><option value={2}>2 textrader</option></select></label>}
          {!isPersonalDoorSign(draft)&&<label><span>Platshållare</span><input value={c.placeholder||""} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{placeholder:e.target.value}))}/></label>}
          {!isPersonalDoorSign(draft)&&<label><span>Max tecken / rad</span><input type="number" min="1" max="120" value={Number(c.maxChars)||28} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{maxChars:Math.max(1,Number(e.target.value)||1)}))}/></label>}
          {!isPersonalDoorSign(draft)&&<label><span>Typsnitt</span><select value={Number(c.fontWeight)||400} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{fontWeight:Number(e.target.value)}))}><option value={400}>Arial Regular</option><option value={700}>Arial Bold</option></select></label>}
          <label><span>Textstorlek</span><input type="number" min="20" max="400" value={Number(c.fontSize)||178} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{fontSize:Math.max(20,Number(e.target.value)||20)}))}/></label>
          <label><span>Textfärg</span><div className="color-row"><input type="color" value={c.color||"#222222"} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{color:e.target.value}))}/><input value={c.color||"#222222"} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{color:e.target.value}))}/></div></label>
          <label><span>Vänsterposition (%)</span><input type="number" min="0" max="95" step="0.1" value={Number(c.leftPct)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{leftPct:Number(e.target.value)||0}))}/></label>
          <label><span>Position uppifrån (%)</span><input type="number" min="0" max="90" step="0.1" value={Number(c.topPct)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{topPct:Number(e.target.value)||0}))}/></label>
          <label><span>Textbredd (%)</span><input type="number" min="5" max="100" step="0.1" value={Number(c.widthPct)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{widthPct:Math.max(5,Number(e.target.value)||5)}))}/></label>
          {Number(c.lines)===2&&<label><span>Avstånd rad 1 → rad 2 (%)</span><input type="number" min="5" max="60" step="0.1" value={Number(c.lineGapPct)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{lineGapPct:Math.max(5,Number(e.target.value)||5)}))}/></label>}
          <div className="tactile-tuning">
            <div className="tactile-tuning-head"><b>Textplacering och storlek (mm)</b></div>
            <label><span>{isPersonalDoorSign(draft)?"Rubrik – synlig höjd":"Rad 1 – synlig höjd"} (mm)</span><input type="number" min="3" max="40" step="0.01" value={Number(c.line1TextHeightMm ?? 15.5)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{line1TextHeightMm:Number(e.target.value)||15.5}))}/></label>
            <label><span>{isPersonalDoorSign(draft)?"Rubrik":"Rad 1"} – från vänster (mm)</span><input type="number" min="0" max="180" step="0.01" value={Number(c.line1LeftMm ?? 15.85)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{line1LeftMm:Number(e.target.value)||0}))}/></label>
            <label><span>{isPersonalDoorSign(draft)?"Rubrik":"Rad 1"} – underkant (mm)</span><input type="number" min="1" max="180" step="0.01" value={Number(c.line1BaselineMm ?? 27.5)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{line1BaselineMm:Number(e.target.value)||27.5}))}/></label>

            <label><span>Rad 2 – synlig höjd (mm)</span><input type="number" readOnly value={Number(c.line1TextHeightMm ?? 15.5)}/></label>
            <label><span>Rad 2 – från vänster (mm)</span><input type="number" readOnly value={Number(c.line1LeftMm ?? 15.85)}/></label>
            <label><span>Rad 2 – underkant (mm)</span><input type="number" min="1" max="180" step="0.01" value={Number(c.line2BaselineMm ?? 47.5)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{line2BaselineMm:Number(e.target.value)||47.5}))}/></label>

            {isPersonalDoorSign(draft)&&<>
              <label><span>Namn – synlig höjd (mm)</span><input type="number" min="3" max="30" step="0.01" value={Number(c.nameTextHeightMm ?? 10.1)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{nameTextHeightMm:Number(e.target.value)||10.1}))}/></label>
              <label><span>Namn – från vänster (mm)</span><input type="number" min="0" max="180" step="0.01" value={Number(c.nameLeftMm ?? 15.85)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{nameLeftMm:Number(e.target.value)||0}))}/></label>
              <label><span>Namn – underkant (mm)</span><input type="number" min="1" max="90" step="0.01" value={Number(c.nameBaselineMm ?? 59.8)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{nameBaselineMm:Number(e.target.value)||59.8}))}/></label>
              <label><span>Titel – synlig höjd (mm)</span><input type="number" min="2" max="20" step="0.01" value={Number(c.titleTextHeightMm ?? 6.56)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{titleTextHeightMm:Number(e.target.value)||6.56}))}/></label>
              <label><span>Titel – från vänster (mm)</span><input type="number" min="0" max="180" step="0.01" value={Number(c.titleLeftMm ?? 15.85)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{titleLeftMm:Number(e.target.value)||0}))}/></label>
              <label><span>Titel – underkant (mm)</span><input type="number" min="1" max="90" step="0.01" value={Number(c.titleBaselineMm ?? 72.5)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{titleBaselineMm:Number(e.target.value)||72.5}))}/></label>
              <label className="toggle"><input type="checkbox" checked={c.titleItalic!==false} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{titleItalic:e.target.checked}))}/> Titel kursiv</label>
            </>}

            {["occupancy","occupancy_whiteboard","room_number_status"].includes(c.layoutMode)&&<>
              <label><span>Rumsnummer – synlig höjd (mm)</span><input type="number" min="5" max="70" step="0.01" value={Number(c.roomNumberTextHeightMm ?? 28)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{roomNumberTextHeightMm:Number(e.target.value)||28}))}/></label>
              <label><span>Rumsnummer – från vänster (mm)</span><input type="number" min="0" max="180" step="0.01" value={Number(c.roomNumberLeftMm ?? 138)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{roomNumberLeftMm:Number(e.target.value)||0}))}/></label>
              <label><span>Rumsnummer – underkant (mm)</span><input type="number" min="1" max="180" step="0.01" value={Number(c.roomNumberBaselineMm ?? 66)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{roomNumberBaselineMm:Number(e.target.value)||66}))}/></label>
            </>}

            {c.layoutMode==="tactile"&&<>
              <label><span>Punktskrift – från vänster (mm)</span><input type="number" min="0" max="180" step="0.01" readOnly={String(draft.articleNumber||"").trim()==="0603"} value={Number(String(draft.articleNumber||"").trim()==="0603" ? (c.line1LeftMm ?? 15.85) : (c.brailleLeftMm ?? 15.85))} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{brailleLeftMm:Number(e.target.value)||0}))}/>{String(draft.articleNumber||"").trim()==="0603"&&null}</label>
              <label><span>Punktskrift – underkant/position (mm)</span><input type="number" min="1" max="90" step="0.01" value={Number(c.brailleBaselineMm ?? 70.5)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{brailleBaselineMm:Number(e.target.value)||70.5}))}/></label>
              <label><span>Punktskrift – storlek</span><input type="number" min="2" max="12" step="0.01" value={Number(c.brailleFontSizeMm ?? 6.5)} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{brailleFontSizeMm:Number(e.target.value)||6.5}))}/></label>
            </>}
          </div>
          <label className="toggle door-uppercase"><input type="checkbox" checked={c.uppercase!==false} onChange={e=>setDraft(updateDoorSignTextConfig(draft,{uppercase:e.target.checked}))}/> Visa text som VERSALER i preview</label>
        </div></>})()}
      </div>}
      <div className="wide field-box"><span>Kundens val / fält</span><div className="checks">{FIELD_OPTIONS.filter(([key])=>!(isGreenHangingDraft(draft)&&key==="hangingSignSymbols")&&(key!=='hangingSignTargets'||isGreenHangingDraft(draft))).map(([key,label])=><label key={key}><input type="checkbox" checked={key==="doorNumber"?supportsDoorNumber(draft):key==="doorSymbol"?supportsDoorSymbol(draft):fieldEnabled(draft.fields,key)} onChange={e=>{const fields={...(draft.fields||{})};if(e.target.checked) fields[key]=fields[key]||true; else if(key==="doorNumber"||key==="doorSymbol") fields[key]=false; else delete fields[key];setDraft({...draft,fields});}}/>{label}</label>)}</div></div>
      {supportsDoorNumber(draft)&&(()=>{const c=getDoorNumberConfig(draft);return <div className="wide door-text-settings">
        <div className="door-text-head"><div><b>Numrets placering och storlek (mm)</b></div></div>
        <div className="door-text-grid">
          {[["leftMm","Nummer – från vänster (mm)",0,170],["rightMm","Nummer – från höger (mm)",0,170],["topMm","Nummer – från ovankant (mm)",0,86.7-c.textHeightMm],["textHeightMm","Nummer – synlig texthöjd (mm)",3,70]].map(([key,label,min,max])=><label key={key}><span>{label}</span><input type="number" min={min} max={max} step="0.01" value={c[key]} onChange={e=>{const value=Math.min(max,Math.max(min,Number(e.target.value)||0));const doorNumberConfig=getDoorNumberConfig({...draft,doorNumberConfig:{...c,[key]:value}});setDraft({...draft,doorNumberConfig});}}/></label>)}
        </div>
      </div>})()}

      {supportsDoorSymbol(draft)&&(()=>{const c=getDoorSymbolConfig(draft);return <div className="wide door-text-settings">
        <div className="door-text-head"><div><b>Symbolens placering och storlek (mm)</b></div></div>
        <div className="door-text-grid">{[["leftMm","Symbol – från vänster (mm)",0,180-c.sizeMm],["rightMm","Symbol – från höger (mm)",0,180-c.sizeMm],["topMm","Symbol – från ovankant (mm)",0,86.7-c.sizeMm],["sizeMm","Symbol – storlek (mm)",3,70]].map(([key,label,min,max])=><label key={key}><span>{label}</span><input type="number" min={min} max={max} step="0.01" value={c[key]} onChange={e=>{const value=Math.min(max,Math.max(min,Number(e.target.value)||0));setDraft({...draft,doorSymbolConfig:getDoorSymbolConfig({...draft,doorSymbolConfig:{...c,[key]:value}})});}}/></label>)}</div>
      </div>})()}
      <label className="wide toggle"><input type="checkbox" checked={draft.storefrontOrderable!==false} onChange={e=>setDraft({...draft,storefrontOrderable:e.target.checked})}/><span>Kan beställas på beställningssidan</span></label>
      <p className="wide" style={{margin:0,fontSize:11,color:'#737373'}}>Avmarkera för artiklar som bara ska användas i Projekt &amp; Korrektur och ritningar.</p>
      <label className="wide toggle"><input type="checkbox" checked={Boolean(draft.isImplemented)} onChange={e=>setDraft({...draft,isImplemented:e.target.checked,adminArchived:false})}/><span>Aktiv artikel</span></label>
      <details className="wide advanced-box"><summary>Avancerade artikelinställningar</summary><textarea value={advancedJson} onChange={e=>{setAdvancedJson(e.target.value);setAdvancedDirty(true)}} spellCheck="false"/></details>
    </div><div className="modal-foot"><div>{saveMessage}</div><div/><button onClick={close}>Avbryt</button><button className="save" disabled={productionBusy} onClick={save}>Spara artikel</button></div></div></div>}

    <style>{`
      .article-category-lock{padding:0;margin:0;border:0;min-width:0}.article-category-lock:disabled{opacity:.6}.article-order-toolbar{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:16px 0}.article-order-toolbar p{font-size:12px;color:#617168;max-width:700px}.article-order-toolbar>div{display:flex;gap:8px;flex-shrink:0}.article-order-toolbar button,.article-order-controls button,.article-order-controls select{font:inherit;padding:8px 12px;border:1px solid #dce4de;border-radius:8px;background:white;cursor:pointer}.article-order-toolbar .article-order-save{background:#176b4a;color:white;border-color:#176b4a}.article-order-list{padding:0;list-style:none;display:grid;gap:8px}.article-order-list li{display:flex;align-items:center;gap:12px;background:white;padding:12px;border:1px solid #e0e6e2;border-radius:10px}.article-order-list li.is-dragging{opacity:.4}.article-order-grip{font-size:24px;cursor:grab;color:#7c8981}.article-order-number{font-size:12px;color:#6c7e71;width:24px}.article-order-list img{width:65px;height:55px;object-fit:contain}.article-order-copy{display:grid;gap:5px;flex:1;min-width:0;font-size:12px}.article-order-copy span{overflow-wrap:anywhere}.article-order-controls{display:flex;align-items:center;gap:8px}.article-order-controls label{display:flex;align-items:center;gap:6px;font-size:11px}.article-order-notice{color:#176b4a;font-size:12px}.article-order-error{color:#a32b25;font-size:12px}.article-order-editor button:disabled,.article-order-editor select:disabled{opacity:.4;cursor:default}@media(max-width:720px){.article-order-toolbar{align-items:stretch;flex-direction:column}.article-order-list li{flex-wrap:wrap}.article-order-controls{width:100%;justify-content:flex-end}}
      .articles-main{padding:18px 26px 48px;min-width:0;background:#f6f7f5;color:#171d1a;min-height:100vh}.articles-top{display:grid;grid-template-columns:minmax(280px,1fr) auto auto;gap:14px;align-items:center;padding-bottom:18px;border-bottom:1px solid #e2e6e3}
      .search{height:42px;background:#fff;border:1px solid #dfe4e1;border-radius:13px;display:flex;align-items:center;gap:10px;padding:0 14px;color:#75807a}.search input{width:100%;border:0;outline:0;background:transparent;color:#202723;font:inherit;font-size:12px}.search input::placeholder{color:#929b96}
      .view-toggle{display:flex;background:#ecefeb;border:1px solid #e0e4e1;border-radius:12px;padding:3px}.view-toggle button{border:0;background:transparent;color:#68736d;border-radius:9px;padding:9px 12px;font:inherit;font-size:11px;cursor:pointer}.view-toggle button.active{background:#fff;color:#17201c;box-shadow:0 1px 4px rgba(0,0,0,.06)}.new-button,.panel-head button{border:0;background:#3e9a70;color:#fff;border-radius:11px;padding:11px 15px;font:inherit;font-size:11px;font-weight:700;cursor:pointer;transition:.15s}.new-button:hover,.panel-head button:hover{background:#48a97c;transform:translateY(-1px)}
      .category-section{padding:22px 0 20px}.section-kicker{font-size:9px;letter-spacing:.16em;font-weight:800;color:#75817b}.category-section h1{font-size:31px;letter-spacing:-.035em;margin:5px 0 5px}.category-section>p{margin:0 0 18px;color:#6f7873;font-size:12px}.category-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:11px}
      .products-panel{border-top:1px solid #e1e5e2;padding-top:18px;margin-top:2px}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}.panel-head>div{display:flex;align-items:baseline;gap:12px}.panel-head h2{margin:0;font-size:20px}.panel-head span{font-size:11px;color:#78837d}
      .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:14px}.product-card{background:#fff;color:${INK};border-radius:16px;overflow:hidden;border:1px solid #e5e9e6;box-shadow:0 8px 24px rgba(16,35,27,.07);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.product-card:hover{transform:translateY(-3px);border-color:#d5ddd8;box-shadow:0 15px 34px rgba(16,35,27,.11)}.media{height:210px;background:#f2f4f1;display:grid;place-items:center;position:relative;overflow:hidden;padding:16px;box-sizing:border-box}.media img{object-fit:contain}.media>span{font-size:30px;color:#9ba39f}.media em{position:absolute;top:11px;right:11px;font-style:normal;font-size:9px;font-weight:700;padding:6px 9px;border-radius:999px;backdrop-filter:blur(8px)}.media em.active{background:rgba(234,244,238,.94);color:#347353}.media em.inactive{background:rgba(237,237,237,.94);color:#747b77}.info{padding:14px 14px 10px}.info>b{font-size:11px;color:#225f46;letter-spacing:.01em}.info h3{font-size:13px;margin:5px 0 6px;line-height:1.25}.info p{font-size:9.5px;color:#69716d;line-height:1.42;margin:0;min-height:27px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.price-line{margin-top:9px;font-size:9.5px;font-weight:750;color:#2f7655}.actions{display:flex;gap:7px;padding:4px 12px 12px;background:#fff}.actions button{border:1px solid #e1e6e3;background:#f7f8f6;padding:7px 9px;border-radius:9px;font:inherit;font-size:8.5px;font-weight:650;color:#515b55;cursor:pointer;transition:.15s}.actions button:hover{background:#eef2ef;border-color:#d3dbd6}.actions .edit-action{background:#eaf4ee;border-color:#d9eadf;color:#2f7655}.actions .edit-action:hover{background:#dff0e6}.actions .danger-action{margin-left:auto;color:#7e5a56}.actions .danger-action:hover{background:#f7eeee;border-color:#ead9d7;color:#8c4e48}
      .product-list{display:grid;gap:8px}.product-row{background:#f7f7f7;color:${INK};border-radius:12px;min-height:76px;padding:8px 12px;display:grid;grid-template-columns:64px minmax(0,1fr) auto 20px;align-items:center;gap:12px;cursor:pointer}.thumb{width:58px;height:58px;background:#eceeeb;border-radius:9px;display:grid;place-items:center;overflow:hidden}.thumb img{width:auto;height:auto;max-width:90%;max-height:90%;object-fit:contain;display:block}.row-copy{display:grid;gap:2px}.row-copy b{font-size:10px;color:#2d704f}.row-copy span{font-size:12px;font-weight:700}.row-copy small{font-size:9px;color:#747b77;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row-status{font-size:9px;padding:5px 8px;border-radius:999px}.row-status.active{background:#eaf4ee;color:#347353}.row-status.inactive{background:#eceeec;color:#747b77}.row-arrow{font-size:22px;color:#88918c}.empty{padding:35px;border:1px dashed #ccd3cf;border-radius:12px;color:#7b8680;text-align:center;font-size:11px}.dev-note{font-size:9px;color:#7b8680;margin:12px 0 0}
      .image-manager{border:1px solid #e2e7e4;border-radius:14px;padding:16px;background:#fafbf9}.image-manager-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.image-manager-head>div{display:grid;gap:3px}.image-manager-head span{font-size:11px;font-weight:800;color:#26302b}.image-manager-head small{font-size:9.5px;color:#7a847e;line-height:1.4}.upload-button{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;padding:9px 12px;border-radius:10px;background:#edf5f0;color:#2f7655;border:1px solid #d9e9df;font-size:10px!important;font-weight:750!important;cursor:pointer;white-space:nowrap;transition:.15s}.upload-button:hover{background:#e2f0e7;border-color:#cce2d4}.upload-button input{display:none}.image-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.image-item{border:1px solid #e2e6e3;border-radius:13px;background:#fff;overflow:hidden;transition:.15s}.image-item.primary{border-color:#9fc8b2;box-shadow:0 0 0 2px rgba(63,145,102,.08)}.image-item.card-selected{outline:2px solid rgba(47,138,99,.16);outline-offset:-2px}.image-preview{position:relative}.card-image-badge{position:absolute;top:10px;left:10px;background:#163d2f;color:#fff;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:800;letter-spacing:.04em}.image-preview{height:260px;background:#f1f3f0;display:grid;place-items:center;overflow:hidden;padding:14px;box-sizing:border-box}.image-preview img{object-fit:contain}.image-controls{display:flex;gap:7px;padding:10px}.image-controls button{flex:1;border:1px solid #e1e6e3;background:#f7f8f6;border-radius:9px;padding:8px 9px;font:inherit;font-size:8.5px;font-weight:700;color:#515b55;cursor:pointer;transition:.15s}.image-controls button:hover{background:#eef2ef;border-color:#d3dbd6}.image-controls .primary-image-button{background:#eaf4ee;border-color:#d6e8dc;color:#2f7655}.image-controls .card-image-button.active{background:#173d30;border-color:#173d30;color:#fff}.image-controls .remove-image{flex:0 0 auto;background:#fff;color:#8a5852}.image-controls .remove-image:hover{background:#f8eeee;border-color:#ead9d7}.image-empty{padding:24px;border:1px dashed #ccd4cf;border-radius:11px;text-align:center;color:#7c8781;font-size:10px;background:#fff}.image-message{margin-top:10px;padding:9px 11px;border-radius:9px;background:#edf5f0;color:#316f52;font-size:9.5px}.image-display-settings{display:grid;grid-template-columns:minmax(180px,240px) minmax(240px,1fr);gap:14px;margin-top:14px;padding-top:14px;border-top:1px solid #e5e9e6}.image-display-settings label{display:grid;gap:7px}.image-display-settings label>span{font-size:9.5px;font-weight:700;color:#66706b}.image-display-settings label>small{font-size:8.5px;color:#88918c;line-height:1.35}.image-display-settings select{border:1px solid #dde3df;border-radius:10px;padding:9px 10px;background:#fff;font:inherit;font-size:10px}.image-display-settings input[type="range"]{width:100%;accent-color:#3e9a70}.modal-bg{position:fixed;inset:0;z-index:100;background:rgba(4,10,8,.68);display:grid;place-items:center;padding:24px}.modal{width:min(920px,95vw);max-height:90vh;overflow:auto;background:#fff;color:${INK};border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.35)}.modal-head{padding:19px 21px 14px;border-bottom:1px solid ${LINE};display:flex;justify-content:space-between}.modal-head span{font-size:9px;letter-spacing:.15em;color:#84908a;font-weight:800}.modal-head h2{margin:4px 0 0;font-size:24px}.modal-head button{border:0;background:transparent;font-size:22px;cursor:pointer}.form-grid{padding:20px 21px;display:grid;grid-template-columns:1fr 1fr;gap:13px}.form-grid>label{display:grid;gap:6px}.form-grid label>span,.field-box>span{font-size:10px;font-weight:700;color:#626a66}.form-grid label>small{font-size:8.5px;color:#87908b;line-height:1.35}.form-grid input,.form-grid select,.form-grid textarea{border:1px solid ${LINE};border-radius:9px;padding:10px 11px;font:inherit;font-size:11px;background:#fff}.form-grid textarea{min-height:72px;resize:vertical}.wide{grid-column:1/-1}.field-box{border:1px solid ${LINE};border-radius:11px;padding:12px}.checks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.checks label,.toggle{display:flex!important;align-items:center;gap:6px;font-size:10px;color:#555d58}.modal-foot{padding:13px 21px;border-top:1px solid ${LINE};display:grid;grid-template-columns:auto 1fr auto auto;gap:8px}.modal-foot button{border:1px solid ${LINE};background:#fff;border-radius:8px;padding:9px 12px;font:inherit;font-size:10px;cursor:pointer}.modal-foot .save{background:${GREEN};color:#fff;border-color:${GREEN}}.template-box{border:1px solid #e2e7e4;border-radius:12px;padding:13px;background:#fafbf9;display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,260px) minmax(150px,200px);gap:12px;align-items:center}.template-box>div{display:grid;gap:4px}.template-box>div>span{font-size:10px;font-weight:800}.template-box small{font-size:9px;color:#7a847e}.template-box select{border:1px solid #dde3df;border-radius:10px;padding:9px 10px;background:#fff;font:inherit;font-size:10px}.hanging-rules{border:1px solid #dce8e1;background:#f2f7f4;border-radius:11px;padding:12px;display:grid;gap:4px}.hanging-rules b{font-size:10px;color:#275d45}.hanging-rules span{font-size:9px;color:#66736c;line-height:1.45}.door-text-settings{border:1px solid #dce8e1;background:#f7faf8;border-radius:12px;padding:14px}.door-text-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.door-text-head>div{display:grid;gap:4px}.door-text-head b{font-size:11px;color:#294f3e}.door-text-head small{font-size:9px;color:#77817b;line-height:1.45;max-width:560px}.door-preview-image-box{display:grid;grid-template-columns:minmax(220px,1fr) minmax(280px,auto);gap:16px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid #e1e8e4}.door-preview-image-copy{display:grid;gap:4px}.door-preview-image-copy b{font-size:10px;color:#294f3e}.door-preview-image-copy small{font-size:8.8px;color:#77817b;line-height:1.45;max-width:560px}.door-preview-image-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.door-preview-thumb{width:126px;height:74px;border:1px solid #dfe5e1;border-radius:9px;background:#fff;display:grid;place-items:center;overflow:hidden;padding:5px;box-sizing:border-box}.door-preview-thumb img{max-width:100%;max-height:100%;object-fit:contain;display:block}.door-preview-empty{font-size:8.8px;color:#89918d;border:1px dashed #d5ddd8;border-radius:9px;padding:10px 12px;background:#fff}.door-preview-remove{border:1px solid #e5d9d7;background:#fff;color:#8a5852;border-radius:9px;padding:9px 11px;font:inherit;font-size:9px;font-weight:700;cursor:pointer}.door-preview-remove:hover{background:#f8eeee}.door-text-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #e1e8e4}.door-text-grid label{display:grid;gap:6px}.door-text-grid label>span{font-size:9.5px;font-weight:700;color:#626a66}.door-text-grid input,.door-text-grid select{border:1px solid #dfe5e1;border-radius:9px;padding:9px 10px;background:#fff;font:inherit;font-size:10px}.door-text-grid small{font-size:8.5px;color:#87908b;line-height:1.35}.door-text-grid .door-uppercase{display:flex!important;align-items:center;align-self:end;padding-bottom:8px}.tactile-tuning{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:13px;border:1px solid #dbe7e0;border-radius:11px;background:#fff}.tactile-tuning-head{grid-column:1/-1;display:grid;gap:3px}.tactile-tuning-head b{font-size:10px;color:#28523f}.tactile-tuning-head small{font-size:8.5px;color:#7f8983}.tactile-tuning label{display:grid;gap:6px}.tactile-tuning label>span{font-size:9px;font-weight:700;color:#626a66}.tactile-tuning input{border:1px solid #dfe5e1;border-radius:9px;padding:9px 10px;background:#fff;font:inherit;font-size:10px}.color-row{display:grid;grid-template-columns:48px 1fr;gap:7px}.color-row input[type="color"]{padding:3px;height:38px;width:48px}.door-text-settings .toggle{white-space:nowrap}.advanced-box{border:1px solid #e3e7e4;border-radius:11px;padding:12px;background:#fafbf9}.advanced-box summary{cursor:pointer;font-size:10px;font-weight:800;color:#4d5852}.advanced-box p{font-size:9px;color:#78827c;margin:8px 0}.advanced-box textarea{width:100%;min-height:220px;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px;line-height:1.45}
      @media(max-width:1350px){.category-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:1050px){.category-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.articles-top{grid-template-columns:1fr auto}.new-button{grid-column:2}.view-toggle{grid-row:2;grid-column:1/3;justify-self:end}}
      @media(max-width:720px){.tactile-tuning{grid-template-columns:1fr 1fr}.door-preview-image-box{grid-template-columns:1fr}.door-preview-image-actions{justify-content:flex-start}.door-text-grid{grid-template-columns:1fr 1fr}.door-text-head{flex-direction:column}.template-box{grid-template-columns:1fr}.image-grid{grid-template-columns:1fr 1fr}.image-display-settings{grid-template-columns:1fr}.image-manager-head{align-items:flex-start;flex-direction:column}.articles-main{padding:14px}.articles-top{display:flex;flex-wrap:wrap}.search{width:100%}.category-grid{grid-template-columns:1fr 1fr}.product-grid{grid-template-columns:1fr 1fr}.form-grid{grid-template-columns:1fr}.wide{grid-column:1}.checks{grid-template-columns:1fr 1fr}}@media(max-width:480px){.tactile-tuning{grid-template-columns:1fr}.door-text-grid{grid-template-columns:1fr}.category-grid,.product-grid{grid-template-columns:1fr}}
    `}</style>
  </AdminLayout></PageContainer>
}
