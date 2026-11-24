import * as THREE from 'three';

export async function printTexture(source,width,height,signal){
 const original=source?.querySelector('svg');if(!original)throw new Error('Tryckytan är inte redo.');
 const svg=original.cloneNode(true);svg.querySelectorAll('[data-dibond-editor],[data-dibond-selection],[data-aluminium-surface],[data-parking-preview-outline],[data-acrylic-pocket]').forEach(node=>node.remove());
 svg.removeAttribute('style');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');if(original.querySelector('[data-direction-panel]'))svg.setAttribute('viewBox','0 0 '+width+' '+height);
 const w=Math.round(2048*Math.min(1,width/height)),h=Math.round(2048*Math.min(1,height/width));svg.setAttribute('width',w);svg.setAttribute('height',h);
 svg.querySelectorAll('[data-dibond-surface]').forEach(node=>{node.setAttribute('stroke','none');});
 await Promise.all([...svg.querySelectorAll('image')].map(async image=>{const href=image.getAttribute('href')||image.getAttributeNS('http://www.w3.org/1999/xlink','href');if(!href||href.startsWith('data:'))return;const response=await fetch(href,{signal});if(!response.ok)throw new Error('Symbolen kunde inte läsas.');const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});image.setAttribute('href',data);image.removeAttributeNS('http://www.w3.org/1999/xlink','href');}));
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();if(signal.aborted)throw new DOMException('Aborted','AbortError');const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);ctx.getImageData(0,0,1,1);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;}finally{URL.revokeObjectURL(url);}
}
