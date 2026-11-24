export function getWhiteboardDemoArea(product={},heightMm=187.5){
 const article=String(product.articleNumber||'').padStart(4,'0');
 // 0608 has a paper insert and status hatch, despite its legacy layout-mode name.
 if(article==='0608')return null;
 if(product.doorSignPreviewImage){
  const fit=(area,imageWidth,imageHeight)=>{
   const photoWidth=Math.min(1,heightMm/192*imageWidth/imageHeight),photoHeight=Math.min(1,192/heightMm*imageHeight/imageWidth);
   return {x:(1-photoWidth)/2+area.x*photoWidth,y:(1-photoHeight)/2+area.y*photoHeight,width:area.width*photoWidth,height:area.height*photoHeight};
  };
  if(['0603','0604'].includes(article))return fit({x:18/540,y:279/616,width:504/540,height:240/616},540,616);
  if(article==='0607')return fit({x:28/860,y:863/1400,width:804/860,height:384/1400},860,1400);
  return null;
 }
 const mode=product.doorSignTextConfig?.layoutMode;
 const start={whiteboard:94.5,whiteboard_personal:94.5,dual_whiteboard:94.5,occupancy_whiteboard:117,occupancy_whiteboard_personal:186.5}[mode];
 if(start===undefined||heightMm<=start+4)return null;
 return {x:6/192,y:start/heightMm,width:180/192,height:(heightMm-3.525-start)/heightMm};
}
