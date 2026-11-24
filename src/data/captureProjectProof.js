// Capture the existing proof pages, including their fitted product previews.
// All images are embedded before rendering, so archived PDFs have no live URLs.
export async function captureProjectProof(root,headers={},onProgress=()=>{}) {
 if(document.fonts?.ready)await document.fonts.ready;
 const pages=[...root.querySelectorAll('.proof-page')],result=[],artwork=[],cache=new Map();let total=0;
 if(!pages.length)throw new Error('Korrekturet saknar sidor.');
 const inline=async url=>{
  if(String(url).startsWith('data:'))return url;
  const parsed=new URL(url,window.location.href);if(parsed.origin!==window.location.origin&&parsed.protocol!=='blob:')throw new Error('En korrekturbild ligger utanför webbplatsen. Ladda upp den igen.');
  if(!cache.has(url))cache.set(url,(async()=>{const response=await fetch(url,{headers});if(!response.ok)throw new Error('En bild kunde inte sparas i korrekturet.');const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Kunde inte läsa korrekturbilden.'));reader.readAsDataURL(blob);});})());
  return cache.get(url);
 };
 const localReferences=value=>value.replace(/url\(["']?([^"')]+)["']?\)/g,(match,url)=>{try{const parsed=new URL(url,window.location.href);return parsed.origin===window.location.origin&&parsed.pathname===window.location.pathname&&parsed.hash?`url(${parsed.hash})`:match;}catch{return match;}});
 async function copy(node){
  if(node.nodeType===Node.TEXT_NODE)return node.cloneNode();
  if(node.nodeType!==Node.ELEMENT_NODE)return document.createTextNode('');
  if(node.matches('script,button,[data-proof-no-export]'))return document.createTextNode('');
  if(node.tagName==='CANVAS'){const image=document.createElement('img');image.src=node.toDataURL('image/png');image.style.cssText=node.style.cssText;return image;}
  const clone=node.cloneNode(false),style=getComputedStyle(node);
  for(const property of style)clone.style.setProperty(property,localReferences(style.getPropertyValue(property)));
  if(node.tagName==='IMG')clone.setAttribute('src',await inline(node.currentSrc||node.src));
  if(node.localName==='image'){
   const source=node.getAttribute('href')||node.getAttribute('xlink:href');
   if(source){const value=await inline(source);clone.setAttribute('href',value);clone.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',value);}
  }
  if(style.backgroundImage&&style.backgroundImage!=='none'){
   let background=style.backgroundImage;
   for(const match of [...background.matchAll(/url\(["']?([^"')]+)["']?\)/g)])background=background.replace(match[0],`url("${await inline(match[1])}")`);
   clone.style.backgroundImage=background;
  }
  for(const child of node.childNodes)clone.appendChild(await copy(child));
  for(const pseudo of ['::before','::after']){
   const computed=getComputedStyle(node,pseudo);
   if(computed.content&& !['none','normal'].includes(computed.content)){
    const element=document.createElement('span');for(const property of computed)element.style.setProperty(property,computed.getPropertyValue(property));element.textContent=computed.content.replace(/^["']|["']$/g,'');clone.appendChild(element);
   }
  }
  return clone;
 }
 for(const [index,page] of pages.entries()){
  onProgress(`Sparar korrektursida ${index+1} av ${pages.length}…`);
  await Promise.all([...page.querySelectorAll('img')].map(image=>image.decode?image.decode():Promise.resolve()));
  const bounds=page.getBoundingClientRect();
  for(const card of page.querySelectorAll('.proof-product'))if(card.querySelector('.proof-product-info').getBoundingClientRect().height>card.getBoundingClientRect().height+1)throw new Error('Beskrivningstexten får inte plats. Korta anteckningarna och skapa en ny version.');
  const clone=await copy(page);Object.assign(clone.style,{margin:'0',boxShadow:'none',width:bounds.width+'px',height:bounds.height+'px'});
  const html=new XMLSerializer().serializeToString(clone);
  const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);await image.decode();
  const scale=3,canvas=document.createElement('canvas');canvas.width=Math.round(bounds.width*scale);canvas.height=Math.round(bounds.height*scale);
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const png=canvas.toDataURL('image/png');total+=png.length;
  result.push(png);
  for(const element of page.querySelectorAll('[data-proof-artwork]')){
   const rect=element.getBoundingClientRect(),crop=document.createElement('canvas');crop.width=Math.max(1,Math.round(rect.width*scale));crop.height=Math.max(1,Math.round(rect.height*scale));
   crop.getContext('2d').drawImage(canvas,Math.round((rect.left-bounds.left)*scale),Math.round((rect.top-bounds.top)*scale),crop.width,crop.height,0,0,crop.width,crop.height);
   const data=crop.toDataURL('image/png'),signKeys=JSON.parse(element.dataset.proofArtwork);total+=data.length;artwork.push({signKey:signKeys[0],signKeys,image:data});
  }
  if(total>29*1024*1024)throw new Error('Korrekturet är för stort. Välj färre skyltar per korrektur.');
 }
 return {pages:result,artwork};
}
