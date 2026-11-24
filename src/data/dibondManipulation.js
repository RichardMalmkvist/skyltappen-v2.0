import {DIBOND_TEXT_MARGIN_MM,dibondLayout,withDibondAbsolutePositions,DIBOND_MARGIN_MM,DIBOND_FRAME_MM} from './dibondHelpers';
import {dibondSeparators,setDibondSeparatorOffset} from './dibondSeparators';
import {A4_WIDTH_MM,A4_HEIGHT_MM} from './acrylicPocket';
import {artworkBounds,placeArtwork} from './signArtwork';
const clamp=(v,min,max)=>min>max?(min+max)/2:Math.max(min,Math.min(max,v));
const round=value=>Math.round(value*100)/100;
export function dibondItemBounds(sign,kind,index,layout) {
 if(kind==='artwork')return artworkBounds(sign);
 if(kind==='pocket'){const p=sign.acrylicPocket;return p?.enabled?{x:Number(p.xMm),y:Number(p.yMm),width:A4_WIDTH_MM,height:A4_HEIGHT_MM}:null;}
 if(kind==='separator'){
  const separator=dibondSeparators(sign).find(line=>line.index===index);if(!separator)return null;
  const edge=Math.max(DIBOND_MARGIN_MM,Number(sign.widthMm)*.08);
  return {x:edge,y:Number(sign.heightMm)/2+Number(separator.offsetYMm||0)-.5,width:Number(sign.widthMm)-2*edge,height:1};
 }
 if(kind==='symbol'){
  const s=sign.symbols?.[index];return s?{x:Number(s.xMm)||0,y:Number(s.yMm)||0,width:Number(s.sizeMm)*(Number(s.aspectRatio)||1),height:Number(s.sizeMm)}:null;
 }
 const lines=(layout||dibondLayout(sign)).lines.filter(line=>line.blockIndex===index&&line.text.trim());
 if(!lines.length)return null;
 const x=Math.min(...lines.map(l=>l.x)),y=Math.min(...lines.map(l=>l.y-l.ascent));
 return {x,y,width:Math.max(...lines.map(l=>l.x+l.width))-x,height:Math.max(...lines.map(l=>l.y+l.descent))-y};
}
export function moveDibondItem(sign,kind,index,dx,dy) {
 const bounds=dibondItemBounds(sign,kind,index);if(!bounds)return sign;
 if(kind==='artwork')return placeArtwork(sign,{xMm:bounds.x+dx,yMm:bounds.y+dy});
 if(kind==='separator'){
  const y=clamp(bounds.y+.5+dy,DIBOND_MARGIN_MM+.5,Number(sign.heightMm)-DIBOND_MARGIN_MM-.5);
  return setDibondSeparatorOffset(sign,index,round(y-Number(sign.heightMm)/2));
 }
 if(kind==='pocket')return {...sign,acrylicPocket:{...sign.acrylicPocket,xMm:round(clamp(bounds.x+dx,4,Number(sign.widthMm)-4-A4_WIDTH_MM)),yMm:round(clamp(bounds.y+dy,4,Number(sign.heightMm)-4-A4_HEIGHT_MM))}};
 const margin=kind==='symbol'?DIBOND_FRAME_MM+.05:DIBOND_TEXT_MARGIN_MM+.5;
 dx=clamp(dx,margin-bounds.x,Number(sign.widthMm)-margin-bounds.x-bounds.width);
 dy=clamp(dy,margin-bounds.y,Number(sign.heightMm)-margin-bounds.y-bounds.height);
 if(kind==='symbol')return {...sign,symbols:sign.symbols.map((s,i)=>i===index?{...s,xMm:round(bounds.x+dx),yMm:round(bounds.y+dy)}:s)};
 const absolute=withDibondAbsolutePositions(sign);
 return {...absolute,lines:absolute.lines.map((line,i)=>i===index?{...line,offsetXMm:round((Number(line.offsetXMm)||0)+dx),firstLineBottomMm:round(Number(line.firstLineBottomMm)+dy)}:line)};
}
export function resizeDibondItem(sign,kind,index,scale) {
 if(kind==='artwork'){const b=artworkBounds(sign);return placeArtwork(sign,{widthMm:Math.min(b.width*scale,Number(sign.widthMm)-b.x,(Number(sign.heightMm)-b.y)*b.width/b.height)});}
 if(kind==='pocket')return sign;
 const bounds=dibondItemBounds(sign,kind,index);if(!bounds)return sign;
 if(kind==='symbol'){
  const symbol=sign.symbols[index],ratio=Number(symbol.aspectRatio)||1;
  const max=Math.max(1,Math.min((Number(sign.widthMm)-4.05-bounds.x)/ratio,Number(sign.heightMm)-4.05-bounds.y));
  const size=Math.floor(clamp(Number(symbol.sizeMm)*scale,1,max)*100)/100;
  return {...sign,symbols:sign.symbols.map((s,i)=>i===index?{...s,sizeMm:size}:s)};
 }
 const absolute=withDibondAbsolutePositions(sign),old=absolute.lines[index];
 const candidate=size=>{
  let next={...absolute,lines:absolute.lines.map((l,i)=>i===index?{...l,sizeMm:size}:l)};
  const box=dibondItemBounds(next,kind,index);
  next={...next,lines:next.lines.map((l,i)=>i===index?{...l,offsetXMm:round((Number(l.offsetXMm)||0)+bounds.x-box.x),firstLineBottomMm:round(Number(l.firstLineBottomMm)+bounds.y-box.y)}:l)};
  return next;
 };
 let size=clamp(Number(old.sizeMm)*scale,1,500),next=candidate(size),box=dibondItemBounds(next,kind,index);
 if(box.x+box.width>Number(sign.widthMm)-DIBOND_TEXT_MARGIN_MM-.5||box.y+box.height>Number(sign.heightMm)-DIBOND_TEXT_MARGIN_MM-.5){
  let low=1,high=size;
  for(let i=0;i<24;i++){const mid=(low+high)/2,b=dibondItemBounds(candidate(mid),kind,index);if(b.x+b.width<=Number(sign.widthMm)-DIBOND_TEXT_MARGIN_MM-.5&&b.y+b.height<=Number(sign.heightMm)-DIBOND_TEXT_MARGIN_MM-.5)low=mid;else high=mid;}
  size=low;
 }
 // Round down so the displayed value cannot place the last pixels over the margin.
 return candidate(Math.floor(size*100)/100);
}
