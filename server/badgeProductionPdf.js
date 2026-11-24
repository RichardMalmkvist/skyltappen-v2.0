const {BRA_LIV_LAYOUT,normalizeBraLivForm,isBraLivBadge,hasBraLivOrganization}=require('../src/data/braLivNameBadges');
const PDFDocument=require('pdfkit');
const SVGtoPDF=require('svg-to-pdfkit');
const path=require('path'),fs=require('fs');
const {badgeKind,addressForOrder,badgeAddressLines}=require('../src/data/badgeProduction');
const mm=n=>n*72/25.4;
const BADGE_CUT_INSET_MM=0.2;
const PRESETS={'0261':'braliv_0261','0262':'braliv_0262','0263':'braliv_0263','0264':'braliv_0264','0201':'rjl_0201','0202':'rjl_0202','0205':'rjl_0205','0207':'rjl_0207','0208':'ftv_0208','0209':'ftv_0209','0210':'ftv_0210','0211':'energy_0211','0250':'school_0250','0251':'school_0251','0252':'school_0252','0253':'school_0253','0310':'jlt_0310'};
const fonts=path.join(__dirname,'../src/assets/fonts');
const logos=path.join(__dirname,'../src/assets/logos');
function fitLine(doc,text,x,baseline,size,width,font,color){
 text=String(text || '').trim();if(!text)return;
 doc.font(font).fontSize(mm(size));const measured=doc.widthOfString(text);const finalSize=measured>mm(width)?size*mm(width)/measured*.995:size;
 // Match the fixed top edge used by the product preview when shrinking.
 const nextBaseline=baseline-size*.715+finalSize*.715;
 doc.fontSize(mm(finalSize)).fillColor(color).text(text,mm(x),mm(nextBaseline),{lineBreak:false,baseline:'alphabetic'});
}
function logo(doc,file,x,y,w,h){
 const printFile=({'ftv.svg':'ftv-print.svg','region.svg':'region-print.svg'})[file]||file;
 const f=path.join(logos,printFile);
 if(!fs.existsSync(f))throw new Error('Logotyp saknas: '+file);
 SVGtoPDF(doc,fs.readFileSync(f,'utf8'),mm(x),mm(y),{width:mm(w),height:mm(h),preserveAspectRatio:'xMidYMid meet'});
}
function region(doc,x,y,w,h){logo(doc,'region.svg',x,y,w,h);}

function drawBadge(doc,item){
 const p=item.nameBadgePreset || PRESETS[String(item.articleNumber)];
 item=normalizeBraLivForm({...item,nameBadgePreset:p},item);
 const braLiv=isBraLivBadge({nameBadgePreset:p});
 if(item.nameBadgePreviewImage && !['/namnskylt-blank.jpg','/ftv tom.jpg'].includes(item.nameBadgePreviewImage))throw new Error('Artikel '+item.articleNumber+' har en egen bakgrundsbild. Produktionsmallen behöver kontrolleras före export.');
 if(!p)throw new Error('Produktionsmall saknas för artikel '+(item.articleNumber || item.badgeName)+'.');
 const ftv=p.startsWith('ftv_'),jlt=p==='jlt_0310',energy=p==='energy_0211',school=p.startsWith('school_'),tenhult=['school_0250','school_0252'].includes(p),nameOnly=['school_0252','school_0253'].includes(p);
 const height=ftv?26:30,color=jlt?'#761D39':'#171717';
 // No preview border or shadow in the artwork; only the separate cutting path.
 doc.fillColor(jlt?'#f2cfd3':'#ffffff').rect(0,0,mm(75),mm(height)).fill();
 if(braLiv){const l=BRA_LIV_LAYOUT.logo;logo(doc,'bra-liv.svg',l.x,l.y,l.width,l.height);}
 else if(jlt)logo(doc,'jlt.svg',57.4,20.15,14.3508,6.2834);
 else if(ftv)logo(doc,'ftv.svg',43.5,16.6,27.2101,5.3693);
 else {
  if(energy)logo(doc,'energik.svg',33.4,20.7,13.1862,5.462);
  if(school)logo(doc,tenhult?'tenhult.svg':'stora-segerstad.svg',tenhult?34.5:27.6,17.5,tenhult?15.9201:22.8485,8.709);
  region(doc,school?53:48.7,school?21.5:20.5,school?17.8:22.1,school?4.5:5.6);
 }
 fitLine(doc,item.name,jlt?2.5:energy?2.8:4.15,jlt?8.6:energy?8.2:8.05,jlt?6:energy?5.8:5.2,jlt?70:energy?69.4:66.7,'GothamMedium',color);
 if(!nameOnly){fitLine(doc,item.title,jlt?2.5:energy?3.1:4.3,jlt?13.8:12.85,jlt?3.7:3.15,jlt?70:66.55,'GothamLight',color);if(['rjl_0205','ftv_0209','braliv_0263'].includes(p))fitLine(doc,item.titleLine2,4.3,16.75,3.15,66.55,'GothamLight',color);}
 if(braLiv && hasBraLivOrganization({nameBadgePreset:p})){const two=Boolean(item.orgLine2 || p==='braliv_0264');fitLine(doc,'Bra Liv',4.3,two?22.1:26,BRA_LIV_LAYOUT.organizationFontSizeMm,BRA_LIV_LAYOUT.organizationWidthMm,'GothamMedium',color);if(two)fitLine(doc,item.orgLine2,4.3,26,BRA_LIV_LAYOUT.organizationFontSizeMm,BRA_LIV_LAYOUT.organizationWidthMm,'GothamMedium',color);}
 else if(['rjl_0202','rjl_0207','ftv_0208'].includes(p)){fitLine(doc,item.orgLine1,4.3,ftv?21.8:p==='rjl_0207'?22.1:26,3.15,ftv?37:42.2,'GothamMedium',color);if(p==='rjl_0207')fitLine(doc,item.orgLine2,4.3,26,3.15,42.2,'GothamMedium',color);}
 return {width:75,height,radius:2.9};
}
function contour(doc,width,height,radius,inset=0){
 // PDF /Separation colour at 100%; recognised by the existing ONYX Quick Set.
 doc.addSpotColor('CutContour',0,100,0,0);
 doc.strokeColor('CutContour').lineWidth(.216);
 const cutWidth=width-2*inset,cutHeight=height-2*inset,cutRadius=Math.max(0,radius-inset);
 if(radius)doc.roundedRect(mm(inset),mm(inset),mm(cutWidth),mm(cutHeight),mm(cutRadius)).stroke();else doc.rect(mm(inset),mm(inset),mm(cutWidth),mm(cutHeight)).stroke();
}
function makeLayout(entries,settings){
 // Sheet dimensions are packing limits; export only the occupied area.
 const margin=Math.min(settings.marginMm,20);
 const pages=[];let page={entries:[],width:0,height:0},x=margin,y=margin,row=0;
 for(const entry of entries){
  if(entry.width+margin*2>settings.sheetWidthMm)throw new Error('Arkbredden är för liten för den valda produkten.');
  if(entry.height+margin*2>settings.maxSheetHeightMm)throw new Error('Arkhöjden är för liten för den valda produkten.');
  if(x+entry.width>settings.sheetWidthMm-margin+.001){x=margin;y+=row+settings.gapMm;row=0;}
  if(y+entry.height>settings.maxSheetHeightMm-margin){if(page.entries.length)pages.push(page);page={entries:[],width:0,height:0};x=margin;y=margin;row=0;}
  page.entries.push({...entry,x,y});row=Math.max(row,entry.height);
  page.width=Math.max(page.width,x+entry.width+margin);
  page.height=Math.max(page.height,y+row+margin);x+=entry.width+settings.gapMm;
 }
 if(page.entries.length)pages.push(page);return pages;
}
async function createProductionPDF(orders,kind,settings,labelCounts={}){
 const entries=[];
 for(const order of orders){
  if(kind==='labels'){
   const address=addressForOrder(order);
   if(!address.recipient || !address.address || !address.postalCode || !address.city)throw new Error('Komplettera leveransadressen för '+(order.orderNumber || order.submissionNumber)+'.');
   const count=labelCounts[order.id] ?? 1;
   if(!Number.isSafeInteger(count)||count<1||count>100)throw new Error('Antal adresslappar måste vara 1–100.');
   for(let i=0;i<count;i++)entries.push({order,address,width:settings.labelWidthMm,height:settings.labelHeightMm});
  }else for(const item of order.cart || [])if(badgeKind(item)==='name'){
   const p=item.nameBadgePreset || PRESETS[String(item.articleNumber)];if(!p)throw new Error('Produktionsmall saknas för artikel '+item.articleNumber+'.');
   const count=Number(item.quantity);if(!Number.isSafeInteger(count)||count<1||count>5000||entries.length+count>5000)throw new Error('Välj högst 5 000 exemplar per export.');
   for(let i=0;i<count;i++)entries.push({order,item,width:75,height:p.startsWith('ftv_')?26:30});
  }
 }
 if(!entries.length)throw new Error('De valda ordrarna innehåller inga namnbrickor.');
 if(entries.length>5000)throw new Error('Välj högst 5 000 exemplar per export.');
 const doc=new PDFDocument({autoFirstPage:false,compress:true,info:{Title:kind==='labels'?'Adresslappar JSF Flow':'Namnbrickor JSF Flow',Creator:'JSF Flow'}});
 const chunks=[];const done=new Promise((resolve,reject)=>{doc.on('data',d=>chunks.push(d));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 doc.registerFont('GothamMedium',path.join(fonts,'gotham-narrow-medium.woff'));
 doc.registerFont('GothamLight',path.join(fonts,'gotham-light.woff'));
 try{
  for(const page of makeLayout(entries,settings)){
   doc.addPage({size:[mm(page.width),mm(page.height)],margin:0});
   for(const entry of page.entries){doc.save().translate(mm(entry.x),mm(entry.y));
    if(kind==='labels'){
     const a=entry.address;const lines=badgeAddressLines(entry.order);
     const text=lines.filter((s,i)=>s || i===3).join('\n');const fontSize=11;
     doc.font('Helvetica').fontSize(fontSize);const w=mm(entry.width-12),h=mm(entry.height-12);
     let size=fontSize;while(size>6 && (doc.heightOfString(text,{width:w})>h || lines.some(l=>doc.widthOfString(l)>w))){doc.fontSize(--size);}
     if(doc.heightOfString(text,{width:w})>h || lines.some(l=>doc.widthOfString(l)>w))throw new Error('Adresslappen är för liten för '+a.recipient+'. Öka måtten.');
     doc.fillColor('#111111').text(text,mm(6),mm(6),{width:w,height:h,lineGap:1});contour(doc,entry.width,entry.height,0);
    }else{const shape=drawBadge(doc,entry.item);contour(doc,shape.width,shape.height,shape.radius,BADGE_CUT_INSET_MM);}
    if(Math.min(settings.gapMm,settings.marginMm)>=3)doc.font('Helvetica').fontSize(5).fillColor('#555555').text(entry.order.orderNumber || entry.order.submissionNumber || '',0,mm(entry.height+.5),{lineBreak:false});
    doc.restore();
   }
  }doc.end();return await done;
 }catch(e){doc.on('error',()=>{});doc.destroy();throw e;}
}
module.exports={createProductionPDF,makeLayout};
