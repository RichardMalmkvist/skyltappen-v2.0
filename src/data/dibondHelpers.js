import {isRoadSupplement,roadSupplementError,roadSupplementFont} from './roadSupplement';
import {roadSignModel} from './roadSignModels';
import {signArtworkError} from './signArtwork';
import {directionPanelSigns,directionSignError} from './directionSigns';
import {outdoorSpec} from './outdoorBusinessSigns';
import {outdoorInitialDetails,outdoorSignError} from "./outdoorBusinessSigns";
import {dibondSeparatorError} from "./dibondSeparators";
import {supportsAcrylicPocket,newAcrylicPocket,acrylicPocketError} from "./acrylicPocket";
import {DIBOND_TEXT_MARGIN_MM,layoutDibond,dibondCornerRadius,dibondCornerRadiusError} from "./dibondGeometry";
export {DIBOND_TEXT_MARGIN_MM,dibondCornerRadius,dibondCornerRadiusError};
export const DIBOND_FRAME_MM=4;
export const DIBOND_MARGIN_MM=12;
export const DIBOND_SEPARATOR_MM=1;
const positive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
export function getDibondConfig(product={}){
  const c=product.dibondConfig||{};
  const maxWidthMm=positive(c.maxWidthMm,300),maxHeightMm=positive(c.maxHeightMm,300);
  return {minWidthMm:positive(c.minWidthMm,30),minHeightMm:positive(c.minHeightMm,30),maxWidthMm,maxHeightMm,fixedDimensions:Boolean(c.fixedDimensions),defaultWidthMm:Math.min(positive(c.defaultWidthMm,Math.min(300,maxWidthMm)),maxWidthMm),defaultHeightMm:Math.min(positive(c.defaultHeightMm,Math.min(200,maxHeightMm)),maxHeightMm),defaultTextSizeMm:positive(c.defaultTextSizeMm,15),defaultCornerRadiusMm:c.defaultCornerRadiusMm!==''&&c.defaultCornerRadiusMm!=null&&Number.isFinite(Number(c.defaultCornerRadiusMm))&&Number(c.defaultCornerRadiusMm)>=0?Number(c.defaultCornerRadiusMm):25};
}
export function newDibondSign(product={}){
  const c=getDibondConfig(product);
  return {...(isRoadSupplement(product)?{roadSupplement:true,roadSupplementVariant:product.roadSupplementVariant||'blue',roadSupplementCustomSize:product.roadSupplementCustomSize===true}:{}),...(product.defaultSignArtwork?{uploadedArtwork:{...product.defaultSignArtwork}}:{}),...(supportsAcrylicPocket(product)?{acrylicPocket:newAcrylicPocket({widthMm:c.defaultWidthMm,heightMm:c.defaultHeightMm})}:{}),frameEnabled:product.dibondConfig?.defaultFrameEnabled!==false,cornerRadiusAuto:true,cornerRadiusMm:c.defaultCornerRadiusMm,cornerRadiusBaseWidthMm:c.defaultWidthMm,cornerRadiusBaseHeightMm:c.defaultHeightMm,widthMm:c.defaultWidthMm,heightMm:c.defaultHeightMm,textOffsetYMm:0,separatorEnabled:false,separatorOffsetYMm:0,symbols:[],lines:[{text:"",sizeMm:c.defaultTextSizeMm,bold:false,offsetYMm:0,lineSpacingMode:"uniform",lineGapMm:4,...(supportsAcrylicPocket(product)?{firstLineBottomMm:80}:{})}],...outdoorInitialDetails(product)};
}
export function applyDibondPreset(article,maximum=300){
  return {...article,previewType:"dibond_sign",productType:"dibondskylt",productTypeLabel:"Dibondskylt",flowType:"form",directAddToCart:false,doorSignTextEnabled:false,hangingSignPreset:undefined,fields:{dibond:true,quantity:true},dibondConfig:{maxWidthMm:maximum,maxHeightMm:maximum,defaultWidthMm:maximum,defaultHeightMm:Math.round(maximum*2/3),defaultTextSizeMm:15},format:`Max ${maximum} × ${maximum} mm`};
}
export function dibondConfigError(article){
  const c=article.dibondConfig||{};
  if(![c.maxWidthMm,c.maxHeightMm].every(n=>Number.isFinite(Number(n))&&Number(n)>=30&&Number(n)<=3000))return "Ange maxbredd och maxhöjd mellan 30 och 3000 mm.";
  if(![c.defaultWidthMm,c.defaultHeightMm].every(n=>Number.isFinite(Number(n))&&Number(n)>=30)||Number(c.defaultWidthMm)>Number(c.maxWidthMm)||Number(c.defaultHeightMm)>Number(c.maxHeightMm))return "Förvalda mått måste vara minst 30 mm och rymmas inom artikelns maxmått.";
  if(!Number.isFinite(Number(c.defaultTextSizeMm))||Number(c.defaultTextSizeMm)<1||Number(c.defaultTextSizeMm)>500)return "Ange förvald texthöjd mellan 1 och 500 mm.";
  if(c.defaultCornerRadiusMm!=null&&(c.defaultCornerRadiusMm===''||!Number.isFinite(Number(c.defaultCornerRadiusMm))||Number(c.defaultCornerRadiusMm)<0||Number(c.defaultCornerRadiusMm)>Math.min(Number(c.defaultWidthMm),Number(c.defaultHeightMm))/2))return "Ange en f\u00f6rvald h\u00f6rnradie mellan 0 och halva skyltens kortaste f\u00f6rvalda sida.";
  return null;
}
let context;
function fontMetrics(text,sizeMm,bold){
  if(typeof document!=="undefined"&&!context)context=document.createElement("canvas").getContext("2d");
  let ratio=.716;
  if(context){context.font=`${bold?700:400} 1000px Arial`;const capital=context.measureText("H");if(capital.actualBoundingBoxAscent>0)ratio=capital.actualBoundingBoxAscent/1000;}
  const fontSize=sizeMm/ratio;
  if(context){context.font=`${bold?700:400} ${fontSize}px Arial`;const m=context.measureText(text||"H");return {fontSize,width:text?m.width:0,ascent:m.actualBoundingBoxAscent||sizeMm,descent:m.actualBoundingBoxDescent||0};}
  return {fontSize,width:String(text).length*fontSize*(bold ? .6 : .54),ascent:sizeMm,descent:fontSize*.22};
}
export function dibondLayout(sign){return layoutDibond(sign,sign?.roadSupplement?roadSupplementFont(sign).measureTratex:fontMetrics);}
// Absolute distance from the outer top edge to the actual bottom of the first printed line.
export function getDibondBlockBottoms(sign){
  const layout=dibondLayout(sign);
  return (sign?.lines||[]).map((_,index)=>{const first=layout.lines.find(line=>line.blockIndex===index);return first?first.y+first.descent:0;});
}
export function withDibondAbsolutePositions(sign){
  const bottoms=getDibondBlockBottoms(sign);
  return {...sign,textOffsetYMm:0,lines:sign.lines.map((line,index)=>({...line,offsetYMm:0,firstLineBottomMm:line.firstLineBottomMm??bottoms[index]}))};
}
export function validateDibondSign(product,sign){
  const c=getDibondConfig(product);
  const directionalError=directionSignError(sign);if(directionalError)return directionalError;
  if(sign?.outdoorSign?.kind==='direction')for(const [i,panel] of directionPanelSigns(sign).entries()){const issue=validateDibondSign(product,panel);if(issue)return 'Skyltfält '+(i+1)+': '+issue;}
  const outdoorError=outdoorSignError(sign);if(outdoorError)return outdoorError;
  if(!sign||![sign.widthMm,sign.heightMm].every(n=>Number.isFinite(Number(n)))||Number(sign.widthMm)<c.minWidthMm||Number(sign.heightMm)<c.minHeightMm||Number(sign.widthMm)>c.maxWidthMm||Number(sign.heightMm)>c.maxHeightMm)return `Ange skyltm\u00e5tt mellan ${c.minWidthMm} \u00d7 ${c.minHeightMm} och ${c.maxWidthMm} \u00d7 ${c.maxHeightMm} mm.`;
  if(c.fixedDimensions&&(Number(sign.widthMm)!==c.defaultWidthMm||Number(sign.heightMm)!==c.defaultHeightMm))return `Den här artikeln har fasta mått: ${c.defaultWidthMm} × ${c.defaultHeightMm} mm.`;
  const supplementError=roadSupplementError(sign);if(supplementError)return supplementError;
  if(roadSignModel(product)&&!isRoadSupplement(product)&&!sign.uploadedArtwork)return "Original saknas. Lägg till SVG eller PDF på artikeln under Artiklar.";
  if(sign.uploadedArtwork)return signArtworkError(sign.uploadedArtwork,sign.widthMm,sign.heightMm,sign.artworkPlacement);
  if(sign.frameEnabled!==undefined&&typeof sign.frameEnabled!=="boolean")return "V\u00e4lj om skylten ska ha svart ram.";
  const pocketError=acrylicPocketError(sign);if(pocketError)return pocketError;
  const radiusError=dibondCornerRadiusError(sign);if(radiusError)return radiusError;
  if(!Array.isArray(sign.lines)||!sign.lines.length||sign.lines.length>30)return "Använd 1–30 textrader.";
  if(!sign.lines.some(line=>String(line.text||"").trim())&&!sign.symbols?.length)return "Skriv minst en textrad eller lägg till en symbol på Dibondskylten.";
  if(sign.lines.some(line=>line.align!==undefined&&!['left','center','right'].includes(line.align)))return "Välj vänsterställd, centrerad eller högerställd text.";
  if(sign.lines.some(line=>String(line.text||"").length>200||!Number.isFinite(Number(line.sizeMm))||Number(line.sizeMm)<1||Number(line.sizeMm)>500))return "Varje rad får ha högst 200 tecken och en texthöjd mellan 1 och 500 mm.";
  if(sign.lines.some(line=>!Number.isFinite(Number(line.lineGapMm??4))||Number(line.lineGapMm??4)<0||Number(line.lineGapMm??4)>500))return "Ange radavstånd mellan 0 och 500 mm.";
  if(sign.symbols!==undefined&&(!Array.isArray(sign.symbols)||sign.symbols.length>20))return "Använd högst 20 symboler per skylt.";
  for(const symbol of sign.symbols||[]){
    const size=Number(symbol.sizeMm),ratio=Number(symbol.aspectRatio||1),x=Number(symbol.xMm),y=Number(symbol.yMm);
    if(!/^\/api\/dibond-symbols\/images\/[a-f0-9-]{36}$/.test(String(symbol.image||"")))return "Välj en bild från dibondskyltarnas symbolbibliotek.";
    if(![size,ratio,x,y].every(Number.isFinite)||size<1||ratio<.05||ratio>20||x<DIBOND_FRAME_MM||y<DIBOND_FRAME_MM||x+size*ratio>Number(sign.widthMm)-DIBOND_FRAME_MM+.001||y+size>Number(sign.heightMm)-DIBOND_FRAME_MM+.001)return "Symbolen får inte plats innanför ramen. Justera placering eller storlek.";
  }
  if(!Number.isFinite(Number(sign.textOffsetYMm??0)))return "Ange textens höjdplacering i millimeter.";
  if(sign.lines.some(line=>!Number.isFinite(Number(line.offsetYMm??0))))return "Ange höjdjustering i millimeter för varje textblock.";
  if(sign.lines.some(line=>!Number.isFinite(Number(line.offsetXMm??0))))return "Ange sidledsplacering i millimeter för varje textblock.";
  if(sign.lines.some(line=>line.firstLineBottomMm!=null&&!Number.isFinite(Number(line.firstLineBottomMm))))return "Ange måttet från ovankanten till första radens underkant i millimeter.";
  const separatorError=dibondSeparatorError(sign);if(separatorError)return separatorError;
  if(!dibondLayout(sign).fits)return "Texten får inte plats innanför ramen. Flytta texten närmare mitten, minska textstorleken eller öka skyltens mått.";
  return null;
}

// Stored coordinates remain the upper-left corner for compatibility with saved
// signs. All editable measurements refer to the centre of the symbol.
export function dibondSymbolCenter(symbol){
  const height=Number(symbol.sizeMm)||0,width=height*(Number(symbol.aspectRatio)||1);
  return {xMm:Number(symbol.xMm)+width/2,yMm:Number(symbol.yMm)+height/2};
}
export function positionDibondSymbolCenter(symbol,center){
  const current=dibondSymbolCenter(symbol),height=Number(symbol.sizeMm)||0,width=height*(Number(symbol.aspectRatio)||1);
  return {...symbol,xMm:Number(center.xMm??current.xMm)-width/2,yMm:Number(center.yMm??current.yMm)-height/2};
}
export function resizeDibondSymbol(symbol,sizeMm){return positionDibondSymbolCenter({...symbol,sizeMm},dibondSymbolCenter(symbol));}

// Anchor the current radius when upgrading a previously saved manual radius.
export function resizeDibondDimensions(product,sign,changes){
 const c=getDibondConfig(product);
 const automatic=Boolean(sign.cornerRadiusAuto);
 const heightDelta=(sign.outdoorSign||String(outdoorSpec(product)?.[0]||'').startsWith('11'))&&changes.heightMm!==undefined?Number(changes.heightMm)-Number(sign.heightMm):0;
 const anchored=heightDelta?{separatorOffsetYMm:Number(sign.separatorOffsetYMm||0)-heightDelta/2,additionalSeparators:(sign.additionalSeparators||[]).map(line=>({...line,offsetYMm:Number(line.offsetYMm)-heightDelta/2}))}:{};
 return {...sign,cornerRadiusAuto:true,cornerRadiusMm:automatic?(sign.cornerRadiusMm??c.defaultCornerRadiusMm):dibondCornerRadius(product,sign),
  cornerRadiusBaseWidthMm:sign.cornerRadiusBaseWidthMm||(automatic?c.defaultWidthMm:sign.widthMm),
  cornerRadiusBaseHeightMm:sign.cornerRadiusBaseHeightMm||(automatic?c.defaultHeightMm:sign.heightMm),...anchored,...changes};
}
