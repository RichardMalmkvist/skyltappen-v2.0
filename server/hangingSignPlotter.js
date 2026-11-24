const {getSignArtwork}=require('../src/data/signArtwork');
const {placedArtworkPdf}=require('./signArtworkPdf');
const {createSignArtworkStore}=require('./signArtwork');
const {hangingFaceAppearance}=require('../src/data/additionalHangingArticles');
const {createProjectSignFileStore}=require('./projectSignFiles');
const {hangingTargetLayout,hangingWithoutTextError}=require('../src/data/hangingTargetLayout');
const {isParking,makeParkingPdf}=require("./parkingProduction");
const fs=require('fs'),path=require('path'),sax=require('sax');
const PDFDocument=require('pdfkit'),SVGtoPDF=require('svg-to-pdfkit');
const {zipFiles}=require('./badgeProduction');
const {getHangingBackForm,isDoubleSidedHangingSign}=require('../src/data/hangingSignBackText');
const {fonts,textCurves}=require('./productionText');
const {vinylTextLayout}=require('./vinylTextProduction');
const {vinylTextSettings}=require('../src/data/vinylText');
const {greenTargetsEnabled,hangingSymbolKind}=require('../src/data/hangingTargetRules');
const {isDibond,makeDibondPdf,createDibondImageReader}=require('./dibondProduction');
const {isDoor,makeDoorPdf}=require('./doorProduction');
const {isOT,makeOTPdf}=require('./otBoardProduction');
const {HEADER_MM,productionLabel,labelLayer,drawProductionLabel}=require('./productionLabel');
const {hasProductionFile,productionFileFor,createArticleProductionStore,makeArticleProductionPdf}=require('./articleProduction');
const ASSETS=path.join(__dirname,'plotter-assets'),PUBLIC=path.join(__dirname,'../public');
const mm=n=>n*72/25.4;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const fail=message=>{throw new Error(message);};
const isHanging=item=>item?.productType==='pendlad_skylt'||item?.previewType==='hanging_sign'||Boolean(item?.hangingSignPreset);
const val=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;

// Import vector geometry only. No images, fonts, scripts or external references
// can be executed or fetched while creating production files.
function vectorAsset(source,label='Symbol') {
  if(typeof source!=='string'||source.length>400000)fail(label+': SVG-filen saknas eller är för stor.');
  if(/^data:image\/svg\+xml/i.test(source)){
    const comma=source.indexOf(',');source=/;base64/i.test(source.slice(0,comma))?Buffer.from(source.slice(comma+1),'base64').toString('utf8'):decodeURIComponent(source.slice(comma+1));
  }
  if(!/^\s*(?:<\?xml[^>]*>\s*)?(?:<!DOCTYPE[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i.test(source)||/<!ENTITY/i.test(source))fail(label+': använd en SVG med vektorkurvor, inte PNG/JPG.');
  const parser=sax.parser(true,{trim:false});let depth=0,skip=0,viewBox=null,body='',count=0;
  const groups=[];
  const shapes=new Set(['path','polygon','rect','circle','ellipse']);
  const shapeAttrs={path:['d'],polygon:['points'],rect:['x','y','width','height','rx','ry'],circle:['cx','cy','r'],ellipse:['cx','cy','rx','ry']};
  parser.onopentag=node=>{
    depth++;const tag=node.name.split(':').pop();
    if(['script','image','foreignObject','use','text','tspan','line','polyline'].includes(tag))fail(label+': SVG:n måste innehålla slutna kurvor. Omvandla text och linjer till kurvor i Corel först.');
    for(const [key,value] of Object.entries(node.attributes))if(/^on/i.test(key)||/url\s*\(|javascript:|https?:/i.test(value)&&!/^xmlns/.test(key))fail(label+': externa länkar stöds inte.');
    if(skip)return;
    if(['defs','metadata','style','title','desc','font'].includes(tag)){skip=depth;return;}
    if(depth===1){
      if(tag!=='svg')fail(label+': ogiltig SVG.');
      const parts=String(node.attributes.viewBox||'').trim().split(/[\s,]+/).map(Number);
      if(parts.length===4&&parts.every(Number.isFinite)&&parts[2]>0&&parts[3]>0)viewBox=parts;
      else{const w=parseFloat(node.attributes.width),h=parseFloat(node.attributes.height);if(w>0&&h>0)viewBox=[0,0,w,h];else fail(label+': SVG:n saknar giltiga mått.');}
      return;
    }
    if(!['g',...shapes].includes(tag))fail(label+': SVG-elementet '+tag+' stöds inte i plotterexporten.');
    let transform='';
    if(node.attributes.transform){const value=node.attributes.transform;if(!/^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([0-9eE+.,\s-]+\)\s*)+$/.test(value))fail(label+': ogiltig transformering.');transform=' transform="'+esc(value)+'"';}
    if(tag==='g'){body+='<g'+transform+'>';groups.push(depth);return;}
    const attrs=shapeAttrs[tag].filter(key=>node.attributes[key]!=null).map(key=>{
      const value=node.attributes[key];
      if(!/^[0-9a-zA-Z+.,\s-]+$/.test(value)||/nan|infinity/i.test(value))fail(label+': ogiltiga kurvdata.');
      if(key==='d'&&value.split(/(?=[Mm])/).filter(part=>part.trim()).some(part=>!/z\s*$/i.test(part)))fail(label+': en kurva är öppen. Slut kurvorna i Corel först.');
      return ' '+key+'="'+esc(value)+'"';
    }).join('');
    body+='<'+tag+transform+attrs+'/>';if(++count>5000)fail(label+': för många kurvor.');
  };
  parser.onclosetag=()=>{if(skip===depth)skip=0;else if(!skip&&groups.at(-1)===depth){body+='</g>';groups.pop();}depth--;};
  parser.onerror=()=>fail(label+': kunde inte läsa SVG-filen.');
  parser.write(source).close();
  if(!viewBox||!count)fail(label+': SVG:n innehåller inga skärbara kurvor.');
  return {viewBox,body};
}

function place(asset,x,y,w,h){
  const [vx,vy,vw,vh]=asset.viewBox;return '<g transform="translate('+x+' '+y+') scale('+(w/vw)+' '+(h/vh)+') translate('+(-vx)+' '+(-vy)+')">'+asset.body+'</g>';
}
const directions=new Set(['none','left','right','up','down']);
const mirror=d=>d==='left'?'right':d==='right'?'left':d;
function arrowValues(form){
  let left=form.leftArrowDirection||'none',right=form.rightArrowDirection||'none';
  if(left==='none'&&right==='none'&&form.arrowDirection){if(form.arrowPlacement==='left')left=form.arrowDirection;if(form.arrowPlacement==='right')right=form.arrowDirection;}
  if(!directions.has(left)||!directions.has(right))fail('Ordern har en okänd pilriktning.');
  return {left,right};
}
function idsFor(form){return Array.isArray(form.hangingSignSymbols)?form.hangingSignSymbols.filter(id=>id&&id!=='none'):form.hangingSignSymbol&&form.hangingSignSymbol!=='none'?[form.hangingSignSymbol]:[];}
function savedAssets(item,supplemental){
  const list=[...(supplemental||[]),...(item.configuration?.hangingSignSymbolAssets||[]),...(item.hangingSignSymbolAssets||[])];
  if(list.length>30)fail('För många symbolbilder i beställningen.');
  return new Map(list.map(asset=>[String(asset.id),asset]));
}
function resolveSymbol(id,assets){
  const asset=assets.get(String(id));
  if(asset?.image?.startsWith('data:image/svg+xml'))return vectorAsset(asset.image,asset.name||id);
  if(asset?.image==='/symbol-vantrum.svg'||id==='waiting-room')return vectorAsset(fs.readFileSync(path.join(PUBLIC,'symbol-vantrum.svg'),'utf8'),'Väntrum');
  if(id==='stairs-reference'||(!asset&&/^(?:trappa|stairs|staircase)$/i.test(String(id))))return vectorAsset(fs.readFileSync(path.join(ASSETS,'stairs.svg'),'utf8'),'Trappa');
  fail('Symbolen ”'+(asset?.name||id)+'” saknar sparad SVG. Lägg in vektorversionen under Symboler och försök igen.');
}
function faceLayout(product,form,assets,{back=false}={}){
  if(product.vinylText)return vinylTextLayout(product,form);
  const rules=product.hangingSignRules||{},width=val(product.hangingSignSizeMm,rules.widthMm),height=val(product.hangingSignHeightMm,rules.heightMm);
  if(![1000,1500].includes(width)||!height||height<60||height>500)fail('Skyltens produktionsmått saknas eller stöds inte. Spara en 1000/1500 mm-produktmall på artikeln först.');
  const large=width===1500,cap=large?70:40,font=large?fonts.regular:fonts.bold;
  const green=hangingFaceAppearance(product,back).isGreen;
  const double=(product.hangingSignTextMode||form.hangingSignTextMode)==='double';
  const lines=form.hangingSignWithoutText?[]:double?[form.customTextLine1||form.customText,form.customTextLine2]:[form.customText||form.customTextLine1];
  let {left,right}=arrowValues(form);
  if(product.hangingSignTextOnly){left='none';right='none';}
  if(back&&!product.hangingSignDifferentBackText){const front=arrowValues(product);left=mirror(front.right);right=mirror(front.left);}
  const ids=green?(greenTargetsEnabled(product)?idsFor(form).filter(id=>hangingSymbolKind(assets.get(String(id))||{id})==='target'):[]):idsFor(form);
  const missing=hangingWithoutTextError({...form,hangingSignSymbols:ids},[...assets.values()]);if(missing)fail(missing);
  const resolved=ids.map(id=>{const asset=resolveSymbol(id,assets);return {...asset,id,kind:hangingSymbolKind(assets.get(String(id))||{id}),ratio:asset.viewBox[2]/asset.viewBox[3]};});
  const symbols=hangingTargetLayout(product,form,resolved);
  let body=symbols.items.map(item=>place(item,item.x,item.y,item.width,item.height)).join('');
  const edge=val(rules.symbolRightMm,large?190:125);
  const arrowW=large?110:60,arrowH=large?80:50,arrowEdge=val(rules.arrowEdgeMm,30);
  let rightLimit=Math.min(symbols.textRight,width-(right!=='none'?arrowEdge+arrowW+10:10));
  if(symbols.items.some(item=>!item.left)&&right!=='none'&&width-edge>width-arrowEdge-arrowW)fail('Symbolerna överlappar högerpilen. Justera beställningens val.');
  const textX=symbols.textStart;
  const em=cap*font.unitsPerEm/font.capHeight;
  const lineHeight=em*(large?1.02:1.08)+(large?0:5);
  // The 0303 Corel reference has a 40 mm cap height and 63 mm baseline.
  const baseline=double?height/2-lineHeight/2+cap*.4125:height/2+cap*.4125;
  for(let i=0;i<lines.length;i++){
    const text=textCurves(lines[i],font,cap,textX,baseline+i*lineHeight);
    if(text.bbox[2]>rightLimit||text.bbox[0]<4||text.bbox[1]<0||text.bbox[3]>height)fail('Texten får inte plats i fasta produktionsmått. Korta texten eller justera artikelvalet; exporten krymper aldrig texten automatiskt.');
    body+=text.body;
  }
  for(const [side,direction] of [['left',left],['right',right]]){
    if(direction==='none')continue;
    const asset=vectorAsset(fs.readFileSync(path.join(PUBLIC,{'left':'pil-vanster.svg','right':'pil-hoger.svg','up':'pil-upp.svg','down':'pil-ner.svg'}[direction]),'utf8'),'Pil');
    const scale=Math.min(arrowW/asset.viewBox[2],arrowH/asset.viewBox[3]);const w=asset.viewBox[2]*scale,h=asset.viewBox[3]*scale;
    const refH=double?Math.min(height,large?140:93):height;
    const y=(refH-arrowH)/2+(double?8:0)+(arrowH-h)/2;
    const x=(side==='left'?arrowEdge:width-arrowEdge-arrowW)+(arrowW-w)/2;
    if(side==='left'&&x+w>textX)fail('Vänsterpilen överlappar texten.');
    if(symbols.items.some(item=>x<item.x+item.width&&x+w>item.x&&y<item.y+item.height&&y+h>item.y))fail('Pilen överlappar en målpunkt eller symbol.');
    body+=place(asset,x,y,w,h);
  }
  if(!green&&!product.hangingSignTextOnly){const stripe=val(rules.sideStripeMm,4);body+='<rect x="0" y="0" width="'+stripe+'" height="'+height+'"/><rect x="'+(width-stripe)+'" y="0" width="'+stripe+'" height="'+height+'"/>';}
  if(product.hangingSignDivider)body+='<rect x="0" y="'+(height/2-.5)+'" width="'+width+'" height="1"/>';
  return {width,height,body};
}
function makeSvg(layout,copies=1){
  const pitch=layout.height+10,h=layout.height*copies+10*(copies-1);let body='';
  for(let i=0;i<copies;i++)body+='<g transform="translate(0 '+(i*pitch)+')">'+layout.body+'</g>';
  return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="'+layout.width+'mm" height="'+h+'mm" viewBox="0 0 '+layout.width+' '+h+'"><title>CutContour - JSF Flow</title><g fill="none" stroke="#ec2a90" stroke-width="0.076" stroke-linejoin="round" stroke-linecap="round">'+body+'</g></svg>';
}
async function makePdf(svg,width,height,title,{label}={}){
  const doc=new PDFDocument({autoFirstPage:false,pdfVersion:'1.6',compress:true,info:{Title:title,Creator:'JSF Flow - GoSign',Subject:'CutContour, Hairline, 1:1 millimetres'}}),chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',d=>chunks.push(d));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
  try{
    const header=label?HEADER_MM:0;
    doc.addPage({size:[mm(width),mm(height+header)],margin:0});doc.page.dictionary.data.TrimBox=[0,0,mm(width),mm(height)];doc.addSpotColor('CutContour',0,100,0,0);
    if(label){
      const print=labelLayer(doc),cut=doc.ref({Type:'OCG',Name:new String('CutContour')});cut.end();
      doc._root.data.OCProperties={OCGs:[print,cut],D:{Order:[print,cut],ON:[print,cut]}};doc.page.resources.data.Properties={PrintData:print,CutContour:cut};
      doc.addContent('/OC /PrintData BDC');drawProductionLabel(doc,label,width);doc.addContent('EMC');doc.addContent('/OC /CutContour BDC');
    }
    doc.save().translate(0,mm(header));
    // PDF width zero is a device hairline. It remains zero through nested scales.
    const lineWidth=doc.lineWidth.bind(doc);doc.lineWidth=()=>lineWidth(0);
    // Unitless point viewport avoids the renderer's CSS millimetre (96 dpi) conversion.
    const pdfSvg=svg.replace(/width="[^"]+mm"/, 'width="'+mm(width)+'"').replace(/height="[^"]+mm"/, 'height="'+mm(height)+'"');
    SVGtoPDF(doc,pdfSvg,0,0,{width:mm(width),height:mm(height),assumePt:true,colorCallback:(color,raw)=>raw?.toLowerCase()==='#ec2a90'?['CutContour',1]:color,warningCallback:message=>fail('Kunde inte skapa plotterkurvor: '+message)});
    doc.lineWidth=lineWidth;doc.restore();if(label)doc.addContent('EMC');doc.end();return await done;
  }catch(error){doc.destroy(error);throw error;}
}
async function exportOrder(order,{itemIndex,productionKind='all',symbolAssets=[],doorSymbolAssets=[],readDibondImage,readProductionFile,readProjectFile,artworkStore}={},catalog={}){
  if(!['all','layout','original'].includes(productionKind))fail('Ogiltig typ av produktionsfil.');
  const cart=order.cart||[];
  if(itemIndex!==undefined&&(!Number.isInteger(itemIndex)||itemIndex<0||itemIndex>=cart.length))fail('Ogiltig artikelrad.');
  const selected=cart.map((item,index)=>({item,index})).filter(({item})=>isParking(item)||isHanging(item)||isDibond(item)||isDoor(item)||isOT(item)||hasProductionFile({productionFile:productionFileFor(item,catalog)})).map((entry,index)=>({...entry,sequence:index+1})).filter(({index})=>itemIndex===undefined||index===itemIndex);
  if(!selected.length)fail('Ordern innehåller inga skyltar som kan exporteras.');
  const files=[],ref=String(order.orderNumber||order.submissionNumber||order.id).replace(/[^a-zA-Z0-9_-]/g,'_');let size=0;
  for(const {item,index,sequence} of selected){
    const current=catalog.articles?.find(a=>String(a.id)===String(item.articleId||item.badgeId))||catalog.articles?.find(a=>a.articleNumber===item.articleNumber)||{};
    const product={...current,...item,...item.configuration};
    const label=productionLabel(order,sequence,item);
    const fixed=hasProductionFile({productionFile:productionFileFor(item,catalog)}),dynamic=isParking(product)||isDibond(product)||isDoor(product)||isHanging(product)||isOT(product);
    const baseStem=ref+'-'+String(sequence).padStart(2,'0');
    if(isDoor(product)&&!product.doorSignTextConfig)product.doorSignTextConfig=current.doorSignTextConfig;
    if(isDoor(product)&&!product.doorSymbolImage){const supplemental=doorSymbolAssets.find(asset=>asset.itemIndex===index&&asset.id===product.doorSymbol);if(supplemental)product.doorSymbolImage=supplemental.image;}
    const snapshots=savedAssets(item,symbolAssets),quantity=Number(item.quantity);
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)fail('Exportera 1–1000 exemplar per artikelrad.');
    const uploaded=getSignArtwork(product);
    if(uploaded){
      const store=artworkStore||createSignArtworkStore();await store.validate(product);const asset=await store.original(uploaded.id),copies=quantity*(product.dibondSign?.outdoorSign?.doubleSided?2:1);
      const sign=product.dibondSign||product.otBoard,pdf=await placedArtworkPdf(asset,sign,copies,baseStem,label);
      if(asset.mime==='application/pdf'&&pdf===asset.bytes)for(let copy=1;copy<=copies;copy++){files.push([baseStem+'-original-ex'+copy+'.pdf',pdf]);size+=pdf.length;if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Välj färre exemplar.');}
      else{files.push([baseStem+'.pdf',pdf]);size+=pdf.length;}
      if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Välj färre exemplar.');
      continue;
    }
    if(fixed&&productionKind!=='layout'){

      const meta=productionFileFor(item,catalog),stem=baseStem+(dynamic?'-produktionsoriginal':'');
      const read=readProductionFile||createArticleProductionStore().read;
      if(meta.mime==='application/pdf'){
        const asset=await (readProjectFile||createProjectSignFileStore().read)(meta.id);
        if(asset.mime!=='application/pdf'||asset.bytes.subarray(0,5).toString()!=='%PDF-')fail('Produktionsoriginalet är ingen giltig PDF.');
        // Keep Corel's vector artwork, spot colours and cut paths byte-for-byte.
        for(let copy=1;copy<=quantity;copy++){
          size+=asset.bytes.length;if(size>30*1024*1024||files.length>=100)fail('Exporten är för stor. Exportera färre exemplar eller artikelrader åt gången.');
          files.push([stem+'-original'+(quantity>1?'-ex'+String(copy).padStart(2,'0')+'-av'+quantity:'')+'.pdf',asset.bytes]);
        }
      }else{
        const original=await read(meta.id),pdf=await makeArticleProductionPdf(original,quantity,stem,{label:label+' | Produktionsoriginal'});
        files.push([stem+'.pdf',pdf]);size+=pdf.length;
      }
      if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Exportera färre artikelrader åt gången.');
    }
    if(productionKind==='original')continue;
    if(isParking(product)){const stem=baseStem+"-print";const pdf=await makeParkingPdf(product,quantity,stem,{label,readImage:readDibondImage});files.push([stem+".pdf",pdf]);size+=pdf.length;if(size>30*1024*1024||files.length>100)fail("Exporten är för stor.");continue;}
    if(isOT(product)){
      const stem=baseStem+(fixed?'-print':'');
      const pdf=await makeOTPdf(product,quantity,stem,{label});files.push([stem+'.pdf',pdf]);size+=pdf.length;
      if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Exportera färre artikelrader åt gången.');
      continue;
    }
    if(isDibond(product)){
      const stem=ref+'-'+String(sequence).padStart(2,'0');
      const pdf=await makeDibondPdf(product,quantity,stem,{readImage:readDibondImage,label});
      files.push([stem+'.pdf',pdf]);size+=pdf.length;
      if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Exportera färre artikelrader åt gången.');
      continue;
    }
    if(isDoor(product)){
      const stem=baseStem+(fixed?'-pappersutskrift':'');
      const pdf=await makeDoorPdf(product,quantity,stem,{label});files.push([stem+'.pdf',pdf]);size+=pdf.length;
      if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Exportera färre artikelrader åt gången.');
      continue;
    }
    if(!isHanging(product))continue;
    for(const back of isDoubleSidedHangingSign(product)?[false,true]:[false]){
      const form=back?getHangingBackForm(product):product;
      const layout=faceLayout(product,form,snapshots,{back});
      const perFile=Math.max(1,Math.floor(4900/(layout.height+10)));
      for(let start=0;start<quantity;start+=perFile){
        const count=Math.min(perFile,quantity-start),svg=makeSvg(layout,count),height=layout.height*count+10*(count-1);
        const stem=ref+'-'+String(sequence).padStart(2,'0')+(isDoubleSidedHangingSign(product)?(back?'-baksida':'-framsida'):'')+(quantity>perFile?'-del'+String(Math.floor(start/perFile)+1).padStart(2,'0'):'');
        const vinyl=product.vinylText?vinylTextSettings(product,product):null;
        const labelText=vinyl?label+' | '+vinyl.heightMm+' mm | Arial '+(vinyl.fontWeight===700?'Bold':'Regular'):label+' | '+(back?'Baksida':'Framsida');
        const pdf=await makePdf(svg,layout.width,height,stem,{label:labelText});files.push([stem+'.pdf',pdf]);size+=pdf.length;
        if(size>30*1024*1024||files.length>100)fail('Exporten är för stor. Exportera färre artikelrader åt gången.');
      }
    }
  }
  if(!files.length)fail('Det finns ingen produktionsfil av den valda typen på artikelraden.');
  return files.length===1?{name:files[0][0],data:files[0][1],type:'application/pdf'}:{name:ref+'-produktion.zip',data:zipFiles(files),type:'application/zip'};
}
function installHangingSignPlotter(app,{readOrders,readCatalog,staffAccess,blobFor,directory}){
  const readDibondImage=createDibondImageReader({blobFor,directory});
  const productionStore=createArticleProductionStore({blobFor,directory});
  const projectFileStore=createProjectSignFileStore({blobFor,directory});
  const artworkStore=createSignArtworkStore({blobFor,directory});
  app.post('/api/orders/:id/plotter-export',async(req,res)=>{
    try{
      if(!await staffAccess(req))return res.status(403).json({message:'Du har inte behörighet att hämta produktionsfiler.'});
      const order=(await readOrders()).find(o=>String(o.id)===String(req.params.id));
      if(!order)return res.status(404).json({message:'Ordern hittades inte.'});
      const {itemIndex,productionKind,symbolAssets,doorSymbolAssets}=req.body||{};
      if(symbolAssets!==undefined&&(!Array.isArray(symbolAssets)||symbolAssets.length>30))return res.status(400).json({message:'Ogiltiga symbolbilder.'});
      if(doorSymbolAssets!==undefined&&(!Array.isArray(doorSymbolAssets)||doorSymbolAssets.length>30||doorSymbolAssets.some(asset=>!asset||!Number.isInteger(asset.itemIndex)||typeof asset.image!=='string'||asset.image.length>7*1024*1024)))return res.status(400).json({message:'Ogiltiga dörrsymboler.'});
      const result=await exportOrder(order,{itemIndex,productionKind,symbolAssets,doorSymbolAssets,readDibondImage,readProductionFile:productionStore.read,readProjectFile:projectFileStore.read,artworkStore},await readCatalog());
      res.set({'Content-Type':result.type,'Content-Disposition':'attachment; filename="'+result.name+'"','Cache-Control':'private, no-store'}).send(result.data);
    }catch(error){res.status(400).json({message:error.message||'Kunde inte skapa plotterfilen.'});}
  });
}
module.exports={vectorAsset,textCurves,faceLayout,makeSvg,makePdf,exportOrder,installHangingSignPlotter};
