import {cleanDoorPhoto0608Url} from '../../data/cleanDoorPhoto0608';
import {getDoorPhotoProfile} from '../../data/doorPhotoPreview';
// Rasterize the existing text overlays over the blank photographic paper sample.
// The crop is the same paper rectangle used by the 2D door-sign renderer.
export async function doorPaperCanvas(source,{signal,articleNumber='0602'}={}){
 const panel=source.querySelector('[data-door-panel="top"]');if(panel)source=panel;
 const overlays=[...source.querySelectorAll('svg')].filter(svg=>Number(svg.getAttribute('viewBox')?.split(/[ ,]+/)[2])===192);
 if(!overlays.length)throw new Error('Textytan är inte redo.');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','2048');svg.setAttribute('height','987');svg.setAttribute('viewBox','6 3.525 180 86.7');
 const background=document.createElementNS(svg.namespaceURI,'rect');background.setAttribute('x','6');background.setAttribute('y','3.525');background.setAttribute('width','180');background.setAttribute('height','86.7');background.setAttribute('fill','white');svg.append(background);
 // Use the same unprinted strip as the photographic 2D preview.
 const profile=getDoorPhotoProfile({articleNumber})||getDoorPhotoProfile({articleNumber:'0602'});
 if(['0610','0616'].includes(articleNumber))articleNumber='0602';
 const paper=document.createElementNS(svg.namespaceURI,'svg');
 paper.setAttribute('x','6');paper.setAttribute('y','3.525');paper.setAttribute('width','180');paper.setAttribute('height','86.7');paper.setAttribute('viewBox',`${profile.sample} ${profile.paper[1]} 4 ${profile.paper[3]}`);paper.setAttribute('preserveAspectRatio','none');
 const photo=document.createElementNS(svg.namespaceURI,'image');photo.setAttribute('href',articleNumber==='0608'?cleanDoorPhoto0608Url:`${process.env.PUBLIC_URL||''}/door-photo-${articleNumber}.webp`);photo.setAttribute('width',profile.size[0]);photo.setAttribute('height',profile.size[1]);paper.append(photo);svg.append(paper);
 for(const overlay of overlays)for(const node of overlay.childNodes)svg.append(node.cloneNode(true));
 return rasterizePaperSvg(svg,{signal});
}

export async function rasterizePaperSvg(svg,{signal}={}){
 await Promise.all([...svg.querySelectorAll('image')].map(async image=>{
  const href=image.getAttribute('href')||image.getAttributeNS('http://www.w3.org/1999/xlink','href');if(!href||href.startsWith('data:'))return;
  const response=await fetch(href,{signal,credentials:'same-origin'});if(!response.ok)throw new Error('Kunde inte läsa symbolen.');
  const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  image.setAttribute('href',data);image.removeAttributeNS('http://www.w3.org/1999/xlink','href');
 }));
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
 try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Kunde inte skapa textytan.'));image.src=url;});
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=987;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Textytan stöds inte.');ctx.drawImage(image,0,0);return canvas;
 }finally{URL.revokeObjectURL(url);}
}
