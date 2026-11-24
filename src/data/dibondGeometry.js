const DIBOND_TEXT_MARGIN_MM=6;
// Shared layout rules; the browser measures Arial and production measures its curves.
function layoutDibond(sign,measure){
  const positive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
  const lines=(sign?.lines||[]).flatMap((line,blockIndex)=>String(line.text||'').split(/\r\n|\r|\n/).map((text,rowIndex,rows)=>({...measure(text,positive(line.sizeMm,15),Boolean(line.bold)),text,bold:Boolean(line.bold),blockIndex,uniform:line.lineSpacingMode==='uniform',sizeMm:positive(line.sizeMm,15),offsetYMm:Number(line.offsetYMm??0),gapAfterMm:rowIndex<rows.length-1?Number(line.lineGapMm??4):4})));
  const blockWidths=new Map();
  for(const line of lines)blockWidths.set(line.blockIndex,Math.max(blockWidths.get(line.blockIndex)||0,line.width));
  // A fixed capital-height reference gives every row the same centre/baseline
  // pitch, regardless of accents or descenders. Existing saved blocks retain
  // their outline-based spacing until edited in the inspector.
  const advances=lines.slice(0,-1).map((line,index)=>line.uniform&&lines[index+1].blockIndex===line.blockIndex?line.sizeMm+line.gapAfterMm:line.descent+line.gapAfterMm+lines[index+1].ascent);
  const height=lines.length?lines[0].ascent+advances.reduce((sum,step)=>sum+step,0)+lines.at(-1).descent:0;
  const offset=Number(sign?.textOffsetYMm??0),availableOffset=(Number(sign?.heightMm)-height)/2-DIBOND_TEXT_MARGIN_MM;
  let cursor=(positive(sign?.heightMm,200)-height)/2+(Number.isFinite(offset)?offset:0)+(lines[0]?.ascent||0);
  const shifts=new Map();
  const positioned=lines.map((line,index)=>{
    const legacyY=cursor+line.offsetYMm;
    if(!shifts.has(line.blockIndex)){const bottom=sign.lines[line.blockIndex].firstLineBottomMm;shifts.set(line.blockIndex,bottom==null?0:Number(bottom)-(legacyY+line.descent));}
    const y=legacyY+shifts.get(line.blockIndex);cursor+=advances[index]||0;
    const offsetXMm=Number(sign.lines[line.blockIndex].offsetXMm??0);
    const alignment=sign.lines[line.blockIndex].align||'center',blockWidth=blockWidths.get(line.blockIndex);
    const blockLeft=(positive(sign?.widthMm,300)-blockWidth)/2+offsetXMm;
    const x=blockLeft+(alignment==='right'?blockWidth-line.width:alignment==='left'?0:(blockWidth-line.width)/2);
    return {...line,y,offsetXMm,alignment,centerX:x+line.width/2,x};
  });
  const fits=Number.isFinite(offset)&&positioned.every(line=>{
    if(!line.text.trim())return true;
    return Number.isFinite(line.y)&&Number.isFinite(line.offsetYMm)&&Number.isFinite(line.offsetXMm)&&line.y-line.ascent>=DIBOND_TEXT_MARGIN_MM&&line.y+line.descent<=Number(sign?.heightMm)-DIBOND_TEXT_MARGIN_MM&&line.x>=DIBOND_TEXT_MARGIN_MM-.001&&line.x+line.width<=Number(sign?.widthMm)-DIBOND_TEXT_MARGIN_MM+.001;
  });
  return {height,availableOffset,lines:positioned,fits};
}
// Finished outer corner radius, shared by the preview and production contour.
function dibondCornerRadius(product={},sign={}){
 const width=Number(sign.widthMm)||300,height=Number(sign.heightMm)||200;
 if(sign.cornerRadiusAuto){
  const config=product.dibondConfig||product.configuration?.dibondConfig||{};
  const baseWidth=Number(sign.cornerRadiusBaseWidthMm)||Number(config.defaultWidthMm)||Math.min(300,Number(config.maxWidthMm)||300);
  const baseHeight=Number(sign.cornerRadiusBaseHeightMm)||Number(config.defaultHeightMm)||Math.min(200,Number(config.maxHeightMm)||300);
  const value=sign.cornerRadiusMm??config.defaultCornerRadiusMm??25;
  const baseRadius=value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):25;
  const scale=Math.min(width/baseWidth,height/baseHeight,sign.cornerRadiusBaseWidthMm&&sign.cornerRadiusBaseHeightMm?Infinity:1);
  return Math.max(0,Math.min(baseRadius*scale,width/2,height/2));
 }
 if(sign.cornerRadiusMm!=null&&sign.cornerRadiusMm!=='')return Number(sign.cornerRadiusMm);
 // Keep the original outline on saved orders created before radius was editable.
 return Math.min(12,width*.05,height*.05)+2;
}
function dibondCornerRadiusError(sign){
 if(sign?.cornerRadiusMm==null)return null;
 if(sign.cornerRadiusAuto)return sign.cornerRadiusMm===''||!Number.isFinite(Number(sign.cornerRadiusMm))||Number(sign.cornerRadiusMm)<0?'Ange en giltig h\u00f6rnradie i millimeter.':null;
 const value=Number(sign.cornerRadiusMm),maximum=Math.min(Number(sign.widthMm),Number(sign.heightMm))/2;
 return sign.cornerRadiusMm===''||!Number.isFinite(value)||value<0||value>maximum?'Ange en h\u00f6rnradie mellan 0 och halva skyltens kortaste sida.':null;
}
module.exports={DIBOND_TEXT_MARGIN_MM,layoutDibond,dibondCornerRadius,dibondCornerRadiusError};
