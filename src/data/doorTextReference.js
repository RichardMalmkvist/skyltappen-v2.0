// Calibrated against the supplied front views. All offsets are millimetres
// from the upper-left corner of the paper insert, rather than the whole photo.
const ARTICLES=['0601','0602','0603','0604','0607','0608'];
const REFERENCE={line1LeftMm:14.5,line2LeftMm:14.5,line1BaselineMm:28,line2BaselineMm:54,
 line1TextHeightMm:15.5,line2TextHeightMm:15.5,nameLeftMm:14.5,nameBaselineMm:59.8,nameTextHeightMm:10.1,
 titleLeftMm:14.5,titleBaselineMm:72.5,titleTextHeightMm:6.56,titleItalic:true};

function normalizeDoorTextReference(product={}) {
 const article=String(product.articleNumber||'').padStart(4,'0');
 if(!ARTICLES.includes(article)||product.doorTextReferenceVersion===1||product.doorSignTextConfig?.referenceVersion===1)return product;
 const tactile=['0601','0603'].includes(article);
 return {...product,doorTextReferenceVersion:1,doorSignTextConfig:{...product.doorSignTextConfig,...REFERENCE,referenceVersion:1,
  ...(tactile?{brailleLeftMm:14.5,brailleBaselineMm:74.5,brailleFontSizeMm:6.5}:{} )}};
}

function getDoorTextPlacement(config,preview,{obstacles=[],braille=false}={}) {
 const cap=.715,whiteX=6,whiteY=3.525;
 const n=(key,fallback)=>config[key]!=null&&config[key]!==''&&Number.isFinite(Number(config[key]))?Number(config[key]):fallback;
 const headingText=[preview.heading,preview.extra].join('\n').split(/\r?\n/).slice(0,3);
 while(headingText.length>1&&!headingText[headingText.length-1])headingText.pop();
 const headCap=n('line1TextHeightMm',15.5),headGap=n('line2BaselineMm',54)-n('line1BaselineMm',28);
 const heading=headingText.map((text,index)=>({text,x:whiteX+n(index?'line2LeftMm':'line1LeftMm',14.5),y:whiteY+n('line1BaselineMm',28)+index*headGap,fontSize:(index?n('line2TextHeightMm',headCap):headCap)/cap}));
 const lastHead=heading[heading.length-1]?.y||whiteY;
 const nameText=String(preview.name||'').split(/\r?\n/).filter(Boolean).slice(0,2),nameCap=n('nameTextHeightMm',10.1),nameGap=n('nameLineGapMm',nameCap*1.25);
 const firstName=Math.max(whiteY+n('nameBaselineMm',59.8)-(nameText.length-1)*nameGap,lastHead+5+nameCap);
 const names=nameText.map((text,index)=>({text,x:whiteX+n('nameLeftMm',14.5),y:firstName+index*nameGap,fontSize:nameCap/cap}));
 const titleCap=n('titleTextHeightMm',6.56);
 const titleY=Math.max(whiteY+n('titleBaselineMm',72.5),(names.length?names[names.length-1].y:lastHead)+4+titleCap);
 const titles=preview.title?[{text:preview.title,x:whiteX+n('titleLeftMm',14.5),y:titleY,fontSize:titleCap/cap,italic:config.titleItalic!==false}]:[];
 const all=[...heading,...names,...titles],top=heading[0].y-headCap;
 // Keep every combination above the divider/braille; preserve the first cap top.
 const bottom=whiteY+(braille?n('brailleBaselineMm',74.5)-6-4:82.7);
 const used=Math.max(...all.map(line=>line.y));
 if(used>bottom){const scale=Math.max(.1,(bottom-top)/(used-top));all.forEach(line=>{line.y=top+(line.y-top)*scale;line.fontSize*=scale;});}
 all.forEach(line=>{
  let right=178;
  for(const box of obstacles){
   if(line.y<box.y||line.y-line.fontSize*cap>box.y+box.height)continue;
   if(box.x<96)line.x=Math.max(line.x,box.x+box.width+5);else right=Math.min(right,box.x-5);
  }
  line.maxWidth=Math.max(1,right-line.x);
 });
 return {heading,names,titles};
}
module.exports={normalizeDoorTextReference,getDoorTextPlacement};
