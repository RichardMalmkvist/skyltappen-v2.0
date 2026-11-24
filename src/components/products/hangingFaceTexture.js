import * as THREE from 'three';
// Use the laid-out 2D face as the source of truth for text and symbol positions.
// Reading its rectangles also retains the preview's fixed text height and spacing.
export async function hangingFaceTexture(source,side,{signal,widthMm=1000,heightMm=93,background='#fff',showEndStrips=true}={}){
 const face=source?.querySelector('[data-hanging-face="'+side+'"]');
 if(!face&&side==='front')throw new Error('Tryckytan är inte redo.');
 const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=Math.round(4096*heightMm/widthMm);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle=face?.style.backgroundColor||background;ctx.fillRect(0,0,canvas.width,canvas.height);
 if(face){
  const bounds=face.getBoundingClientRect();if(!bounds.width||!bounds.height)throw new Error('Tryckytan saknar mått.');const sx=canvas.width/bounds.width,sy=canvas.height/bounds.height,fontScale=canvas.height/parseFloat(getComputedStyle(face).height);
  for(const node of face.querySelectorAll('div')){
   const r=node.getBoundingClientRect(),style=getComputedStyle(node),x=(r.left-bounds.left)*sx,y=(r.top-bounds.top)*sy;
   if(node.hasAttribute('data-hanging-divider')){ctx.fillStyle=style.backgroundColor;ctx.fillRect(x,y,r.width*sx,r.height*sy);}
   else if(!node.children.length&&node.textContent.trim()){
    ctx.fillStyle=style.color;ctx.font=style.fontWeight+' '+parseFloat(style.fontSize)*fontScale+'px '+style.fontFamily;ctx.textBaseline='alphabetic';const metrics=ctx.measureText(node.textContent),a=metrics.fontBoundingBoxAscent??metrics.actualBoundingBoxAscent,d=metrics.fontBoundingBoxDescent??metrics.actualBoundingBoxDescent;ctx.fillText(node.textContent,x,y+(r.height*sy-a-d)/2+a);
   }
  }
  await Promise.all([...face.querySelectorAll('img')].map(async node=>{
   const image=new Image();image.crossOrigin='anonymous';image.src=node.currentSrc||node.src;await image.decode();if(signal?.aborted)return;
   const r=node.getBoundingClientRect(),scale=Math.min(r.width*sx/image.naturalWidth,r.height*sy/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
   ctx.save();if(getComputedStyle(node).filter.includes('invert'))ctx.filter='brightness(0) invert(1)';ctx.drawImage(image,(r.left-bounds.left)*sx+(r.width*sx-w)/2,(r.top-bounds.top)*sy+(r.height*sy-h)/2,w,h);ctx.restore();
  }));
 }
 // End strips are physical fittings on both faces, also on unprinted backs.
 if(showEndStrips){ctx.fillStyle='#111';const stripWidth=4/widthMm*canvas.width;ctx.fillRect(0,0,stripWidth,canvas.height);ctx.fillRect(canvas.width-stripWidth,0,stripWidth,canvas.height);}
 // Flush SVG image rasterization before WebGL uploads this canvas.
 ctx.getImageData(0,0,1,1);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
