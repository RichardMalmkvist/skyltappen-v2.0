const {roadSupplementSurface,roadSupplementError,roadSupplementStyle,roadSupplementFont}=require('../src/data/roadSupplement');
const {directionPanelSigns,directionSignError}=require('../src/data/directionSigns');
const {dibondSeparators,dibondSeparatorError}=require('../src/data/dibondSeparators');
const {outdoorSignError}=require('../src/data/outdoorBusinessSigns');
const {acrylicPocketError}=require('../src/data/acrylicPocket');
const PDFDocument=require('pdfkit'),SVGtoPDF=require('svg-to-pdfkit');
const {isFoldedAluminium}=require('../src/data/aluminiumArticles');
const {readDibondSymbolAsset}=require('./dibondSymbolAssets');
const {layoutDibond,dibondCornerRadius,dibondCornerRadiusError}=require('../src/data/dibondGeometry');
const {fonts,textCurves,measureText}=require('./productionText');
const {HEADER_MM,drawProductionLabel}=require('./productionLabel');
const BLEED_MM=3,FRAME_MM=4,mm=n=>n*72/25.4;
const isDibond=item=>item?.productType==='dibondskylt'||item?.previewType==='dibond_sign'||Boolean(item?.dibondSign||item?.configuration?.dibondSign);
const fail=message=>{throw new Error(message);};

function prepareDibond(product){
 const sign=product.dibondSign||product.configuration?.dibondSign;
 if(!sign||![sign.widthMm,sign.heightMm].every(n=>Number.isFinite(Number(n))&&Number(n)>=30&&Number(n)<=3000))fail('Dibondskyltens beställda mått saknas eller är ogiltiga.');
 if(sign.frameEnabled!==undefined&&typeof sign.frameEnabled!=='boolean')fail('Ogiltigt val f\u00f6r svart ram.');
 const outdoorError=outdoorSignError(sign);if(outdoorError)fail(outdoorError);
 const pocketError=acrylicPocketError(sign);if(pocketError)fail(pocketError);
 const radiusError=dibondCornerRadiusError(sign);if(radiusError)fail(radiusError);
 if(!Array.isArray(sign.lines)||sign.lines.length<1||sign.lines.length>30)fail('Dibondskylten måste ha 1–30 textblock.');
 for(const line of sign.lines){
  if(line.align!==undefined&&!['left','center','right'].includes(line.align))fail('Dibondskyltens textjustering är ogiltig.');
  if(typeof line.text!=='string'||line.text.length>200||!Number.isFinite(Number(line.sizeMm))||Number(line.sizeMm)<1||Number(line.sizeMm)>500||![line.offsetYMm??0,line.offsetXMm??0,line.lineGapMm??4].every(n=>Number.isFinite(Number(n)))||Number(line.lineGapMm??4)<0||Number(line.lineGapMm??4)>500||(line.firstLineBottomMm!=null&&!Number.isFinite(Number(line.firstLineBottomMm))))fail('Dibondskyltens textinställningar är ogiltiga.');
 }
 const directionalError=directionSignError(sign);if(directionalError)fail(directionalError);
 if(sign.outdoorSign?.kind==='direction')for(const panel of directionPanelSigns(sign))prepareDibond({...product,dibondSign:panel});
 const supplementError=roadSupplementError(sign);if(supplementError)fail(supplementError);
 const width=Number(sign.widthMm),height=Number(sign.heightMm),layout=layoutDibond(sign,sign.roadSupplement?roadSupplementFont(sign).measureTratex:measureText);
 const config=product.dibondConfig||product.configuration?.dibondConfig;
 if(config&&(width<Number(config.minWidthMm||30)||height<Number(config.minHeightMm||30)))fail('Skyltens m\u00e5tt understiger artikelns minimim\u00e5tt.');
 if(config&&(width>Number(config.maxWidthMm)||height>Number(config.maxHeightMm)))fail("Skyltens mått överstiger artikelns maxmått.");
 if(config?.fixedDimensions&&(width!==Number(config.defaultWidthMm)||height!==Number(config.defaultHeightMm)))fail("Skyltens mått avviker från artikelns fasta format.");
 if(!layout.fits)fail('Dibondskyltens text får inte plats innanför ramen. Kontrollera textstorlek och placering.');
 const symbols=sign.symbols||[];
 if(!Array.isArray(symbols)||symbols.length>20)fail('Dibondskylten har för många symboler.');
 for(const s of symbols){
  const size=Number(s.sizeMm),ratio=Number(s.aspectRatio||1),x=Number(s.xMm),y=Number(s.yMm);
  if(!/^\/api\/dibond-symbols\/images\/[a-f0-9-]{36}$/.test(String(s.image||''))||![size,ratio,x,y].every(Number.isFinite)||size<1||ratio<.05||ratio>20||x<FRAME_MM||y<FRAME_MM||x+size*ratio>width-FRAME_MM+.001||y+size>height-FRAME_MM+.001)fail('En dibondsymbol saknas eller ligger utanför ramen. Kontrollera orderns symbolval.');
 }
 if(!layout.lines.some(line=>line.text.trim())&&!symbols.length)fail('Dibondskylten saknar text och symboler.');
 const separatorY=height/2+Number(sign.separatorOffsetYMm??0);
 const separatorError=dibondSeparatorError(sign);if(separatorError)fail(separatorError);
 const separatorYs=dibondSeparators(sign).map(line=>height/2+Number(line.offsetYMm));
 let text='';
 for(const line of layout.lines){
  if(!line.text.trim())continue;
  if(sign.roadSupplement){text+=roadSupplementFont(sign).tratexCurves(line.text,Number(sign.lines[line.blockIndex].sizeMm),line.x,line.y);continue;}
  const curves=textCurves(line.text,line.bold?fonts.bold:fonts.regular,Number(sign.lines[line.blockIndex].sizeMm),line.x,line.y);
  if(curves.bbox[0]<FRAME_MM||curves.bbox[2]>width-FRAME_MM||curves.bbox[1]<FRAME_MM||curves.bbox[3]>height-FRAME_MM)fail('Dibondskyltens text hamnar i ramen. Kontrollera placeringen.');
  text+=curves.body;
 }
 return {sign,width,height,layout,symbols,separatorY,separatorYs,text,folded:isFoldedAluminium(product),frameEnabled:!isFoldedAluminium(product)&&sign.frameEnabled!==false,radius:isFoldedAluminium(product)?0:dibondCornerRadius(product,sign)};
}

function createDibondImageReader({blobFor=async()=>null,directory=__dirname}={}){
 return async image=>{
  const match=/^\/api\/dibond-symbols\/images\/([a-f0-9-]{36})$/.exec(String(image));
  if(!match)fail('Dibondsymbolens bildadress är ogiltig.');
  try{
   const asset=await readDibondSymbolAsset(match[1],{blobFor,directory});
   return asset.kind==='svg'?asset:asset.data;
  }catch{fail('En symbolbild i dibondbeställningen kunde inte hämtas. Bilden måste finnas kvar för att skapa produktionsfilen.');}
 };
}

async function makeDibondPdf(product,quantity,title,{readImage=createDibondImageReader(),label}={}){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)fail('Exportera 1–1000 exemplar per artikelrad.');
 const root=prepareDibond(product),prepared=root.sign.outdoorSign?.kind==='direction'?directionPanelSigns(root.sign).map(sign=>prepareDibond({...product,dibondSign:sign})):[root],images=new Map();
 for(const symbol of prepared.flatMap(p=>p.symbols))if(!images.has(symbol.image))images.set(symbol.image,await readImage(symbol.image));
 const b=BLEED_MM,header=label?HEADER_MM:0;
 const doc=new PDFDocument({autoFirstPage:false,pdfVersion:'1.6',compress:true,info:{Title:title,Creator:'JSF Flow',Subject:'Print & cut; optional 4 mm frame; 3 mm bleed; CutContour; 1:1'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',part=>chunks.push(part));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
 try{
  const printLayer=doc.ref({Type:'OCG',Name:new String('Print Data')}),cutLayer=doc.ref({Type:'OCG',Name:new String('CutContour')});printLayer.end();cutLayer.end();
  doc._root.data.OCProperties={OCGs:[printLayer,cutLayer],D:{Order:[printLayer,cutLayer],ON:[printLayer,cutLayer],BaseState:'ON'}};
  doc.addSpotColor('CutContour',0,100,0,0);
  for(let printCopy=0,sides=root.sign.outdoorSign?.doubleSided?2:1;printCopy<quantity*sides;printCopy++){
   const copy=Math.floor(printCopy/sides),side=printCopy%sides+1;
   for(const [panelIndex,p] of prepared.entries()){
   const w=p.width,h=p.height,pageWidth=mm(w+2*b),pageHeight=mm(h+2*b+header);
   doc.addPage({size:[pageWidth,pageHeight],margin:0});
   doc.page.dictionary.data.TrimBox=[mm(b),mm(b),mm(b+w),mm(b+h)];
   doc.page.dictionary.data.BleedBox=[0,0,pageWidth,mm(h+2*b)];
   doc.page.resources.data.Properties={PrintData:printLayer,CutContour:cutLayer};
   doc.addContent('/OC /PrintData BDC');
   const panelLabel=label&&prepared.length>1?label+' | Skyltfält '+(panelIndex+1)+'/'+prepared.length:label;
   const sideLabel=panelLabel&&root.sign.outdoorSign?panelLabel+' | '+(root.sign.outdoorSign.doubleSided?'Sida '+side+'/2':'Enkelsidig'):panelLabel;
   drawProductionLabel(doc,sideLabel&&p.sign.acrylicPocket?.enabled?sideLabel+' | Akryl A4: x '+p.sign.acrylicPocket.xMm+' y '+p.sign.acrylicPocket.yMm+' mm':sideLabel,w+2*b,{copy:copy+1,quantity});doc.save().translate(0,mm(header));
   doc.save().scale(mm(1));
   if(p.sign.roadSupplement){
    const surface='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+roadSupplementSurface(w,h,p.sign)+'</svg>';
    doc.rect(0,0,w+2*b,h+2*b).fill(roadSupplementStyle(p.sign).background);SVGtoPDF(doc,surface,b,b,{assumePt:true,width:w,height:h});
   }else if(p.folded||!p.frameEnabled){
    doc.rect(0,0,w+2*b,h+2*b).fill([0,0,0,0]);
   }else{
    // Keep the customer's finished outline; extend black outwards by 3 mm.
    doc.roundedRect(0,0,w+2*b,h+2*b,p.radius+b).fill([0,0,0,100]);
    doc.roundedRect(b+FRAME_MM,b+FRAME_MM,w-2*FRAME_MM,h-2*FRAME_MM,Math.max(0,p.radius-FRAME_MM)).fill([0,0,0,0]);
   }
   for(const y of p.separatorYs){const edge=Math.max(12,w*.08);doc.rect(b+edge,b+y-.5,w-2*edge,1).fill([0,0,0,100]);}
   doc.save().rect(b+FRAME_MM,b+FRAME_MM,w-2*FRAME_MM,h-2*FRAME_MM).clip();
   for(const symbol of p.symbols){
    const sw=Number(symbol.sizeMm)*Number(symbol.aspectRatio||1),sh=Number(symbol.sizeMm),asset=images.get(symbol.image),x=b+Number(symbol.xMm),y=b+Number(symbol.yMm);
    if(asset?.kind==='svg'){
     const fitted=asset.svg.replace(/width="[^"]+"/,'width="'+sw+'"').replace(/height="[^"]+"/,'height="'+sh+'"');
     SVGtoPDF(doc,fitted,x,y,{assumePt:true,width:sw,height:sh,preserveAspectRatio:'xMidYMid meet',warningCallback:message=>fail('SVG-symbolen kunde inte skapas: '+message)});
    }else doc.image(asset,x,y,{fit:[sw,sh],align:'center',valign:'center'});
   }
   doc.restore();doc.restore();
   if(p.text){
    const artHeight=mm(h+2*b),svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+pageWidth+'" height="'+artHeight+'" viewBox="0 0 '+(w+2*b)+' '+(h+2*b)+'"><g fill="#000000" transform="translate('+b+' '+b+')">'+p.text+'</g></svg>';
    SVGtoPDF(doc,svg,0,0,{assumePt:true,width:pageWidth,height:artHeight,colorCallback:()=>[p.sign.roadSupplement&&roadSupplementStyle(p.sign).text==='#ffffff'?[0,0,0,0]:[0,0,0,100],1],warningCallback:message=>fail('Dibondtexten kunde inte skapas: '+message)});
   }
   doc.addContent('EMC');
   doc.addContent('/OC /CutContour BDC');
   doc.save().scale(mm(1)).lineWidth(0).strokeColor('CutContour');
   // Folded aluminium: cut the print 3 mm inside the finished metal edge.
   if(p.folded)doc.rect(b+3,b+3,w-6,h-6);else doc.roundedRect(b,b,w,h,p.radius);
   doc.stroke().restore();doc.restore();
   doc.addContent('EMC');
  }
  }
  doc.end();return await done;
 }catch(error){doc.destroy(error);throw error;}
}
module.exports={BLEED_MM,FRAME_MM,isDibond,prepareDibond,createDibondImageReader,makeDibondPdf};
