import {getCatalogAccessHeaders} from './catalogStore';
let symbols=[];
export const dibondSymbolPreviewUrl=image=>/^\/api\/dibond-symbols\/images\/[a-f0-9-]{36}$/.test(String(image||''))?image+'?v=svg2':image;
export const getDibondSymbols=({includeInactive=false}={})=>includeInactive?symbols:symbols.filter(symbol=>symbol.active!==false);
function remember(items){symbols=Array.isArray(items)?items:[];window.dispatchEvent(new Event('jsf-dibond-symbols-changed'));return symbols;}
export async function fetchDibondSymbols(credential){const response=await fetch('/api/dibond-symbols',{headers:credential?{'x-admin-password':credential}:getCatalogAccessHeaders(),cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte hämta symbolerna.');return remember(data.symbols);}
export async function saveDibondSymbols(items,credential){const response=await fetch('/api/dibond-symbols',{method:'PUT',headers:{'Content-Type':'application/json','x-admin-password':credential||''},body:JSON.stringify({symbols:items})});const data=await response.json();if(!response.ok)throw new Error(data.message||'Kunde inte spara symbolerna.');return remember(data.symbols);}
export async function dibondSymbolImage(file){
 const isSvg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name||'');
 if(isSvg){
  if(file.size>1024*1024)throw new Error('SVG-symbolen får vara högst 1 MB.');
  const source=await file.text(),document=new DOMParser().parseFromString(source,'image/svg+xml'),root=document.documentElement;
  if(root.localName!=='svg'||document.getElementsByTagName('parsererror').length)throw new Error('SVG-filen kunde inte läsas.');
  const viewBox=String(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  const width=viewBox.length===4?viewBox[2]:parseFloat(root.getAttribute('width')),height=viewBox.length===4?viewBox[3]:parseFloat(root.getAttribute('height'));
  const aspectRatio=width/height;
  if(!(width>0&&height>0)||!Number.isFinite(aspectRatio)||aspectRatio<.05||aspectRatio>20)throw new Error('SVG-symbolen saknar giltiga mått.');
  const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('SVG-filen kunde inte läsas.'));reader.readAsDataURL(new Blob([source],{type:'image/svg+xml'}));});
  return {image,aspectRatio};
 }
 if(file.size>5*1024*1024||!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type))throw new Error('Välj PNG, JPG, WebP eller SVG på högst 5 MB.');
 const url=URL.createObjectURL(file);
 try{const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Kunde inte läsa symbolbilden.'));image.src=url;});const aspectRatio=img.naturalWidth/img.naturalHeight;if(aspectRatio<.05||aspectRatio>20)throw new Error('Symbolbildens proportioner är för extrema.');const scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const image=canvas.toDataURL('image/png');if(image.length>409600)throw new Error('Symbolbilden är för stor. Använd en enklare bild.');return {image,aspectRatio};}finally{URL.revokeObjectURL(url);}
}
