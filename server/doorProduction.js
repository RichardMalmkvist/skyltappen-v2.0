const {isThreePanelDoor,doorPanelProduct,doorPanelForm}=require('../src/data/threePanelDoor');
const fs=require('fs/promises'),path=require('path');
const PDFDocument=require('pdfkit'),SVGtoPDF=require('svg-to-pdfkit');
const {getDoorTextConfig,getDoorSignPreviewValues}=require('../src/data/doorProductionLayout');
const {getDoorTextPlacement}=require('../src/data/doorTextReference');
const {fonts,textCurves}=require('./productionText');
const {sanitizeSvgSymbol,decodeSvgDataUrl}=require('./svgSymbol');
const {HEADER_MM,drawProductionLabel,labelLayer}=require('./productionLabel');
const {layoutBraille,brailleDotPath,doorBrailleText}=require('../src/data/tactileBraille');
const WIDTH_MM=180,HEIGHT_MM=89,CAP_RATIO=.715,mm=n=>n*72/25.4;
const isDoor=item=>item?.doorSignTextEnabled!==false&&(item?.previewType==='door_sign'||item?.productType==='dorrskylt'||item?.doorSignTextEnabled===true);
const fail=message=>{throw new Error(message);};
function textWidth(text,font,fontSize){let advance=0,previous='';for(const c of String(text).normalize('NFC')){const glyph=font.glyphs[c];if(!glyph)fail('Tecknet ”'+c+'” saknar produktionskurvor.');advance+=(font.kerning[previous+c]||0)+glyph.advance;previous=c;}return advance*fontSize/font.unitsPerEm;}
function fitGroup(lines){
 const measured=lines.map(line=>({...line,width:textWidth(line.text,line.font||fonts.regular,line.fontSize)}));
 const shrinking=measured.some(line=>line.width>(line.maxWidth??(172-line.x)));
 const common=shrinking?Math.min(...measured.map(line=>line.fontSize),...measured.filter(line=>line.width>0).map(line=>line.fontSize*(line.maxWidth??(172-line.x))/line.width*.995)):null;
 return measured.map(line=>{const fontSize=common==null?line.fontSize:Math.max(.1,common),y=line.y-line.fontSize*CAP_RATIO+fontSize*CAP_RATIO;return {...line,fontSize,y};});
}
function doorLayout(product){
 const c=getDoorTextConfig(product),form={...product,customText:product.customText||product.customTextLine1||''},v=getDoorSignPreviewValues(form,c),mode=c.layoutMode;
 if(!String(product.doorHeading||form.customText||'').trim()){v.heading='';v.textLine1='';}
 if(![product.doorHeading,product.customText,product.customTextLine1,product.doorUseName&&product.doorName,product.doorUseTitle&&product.doorTitle,product.doorUseNumber&&product.doorNumber].some(t=>String(t||'').trim()))fail('Dörrskylten saknar sparad egen text.');
 if(c.numberPanel){const font=fonts.regular,size=50/CAP_RATIO,value=String(product.doorHeading);const width=textWidth(value,font,size);if(width>170)fail('Siffran är för bred. Använd färre siffror.');const line={text:value,x:(180-width)/2,y:66,fontSize:size,font};const curves=textCurves(value,font,50,line.x,line.y);return {body:curves.body,lines:[line],symbol:null,tactile:false,braille:null,registrationLines:false,color:'#111111'};}
 const personal=mode!=='tactile'||['0602','0603','0604','0607','0608','0616','0620'].includes(String(product.articleNumber||'').trim());
 const lines=[];
 if(personal&&c.referenceVersion===1){
  const obstacles=[];
  if(product.doorUseNumber&&product.doorNumber){
   const n=product.doorNumberConfig||{},margin=Number(c.line1LeftMm)||14.5,height=Math.min(70,Math.max(3,Number(n.textHeightMm)||28));
   const left=Number(n.leftMm??margin),right=Number(n.rightMm??margin),top=Math.min(86.7-height,Math.max(0,Number(n.topMm??(product.doorUseLine2?50:43))));
   const width=Math.min(80,String(product.doorNumber).length*height/CAP_RATIO*.62);
   obstacles.push({x:product.doorNumberSide==='right'?186-right-width:6+left,y:3.525+top,width,height});
  }
  if(product.doorUseSymbol&&product.doorSymbolImage){
   const s=product.doorSymbolConfig||{},size=Number(s.sizeMm)||28;
   obstacles.push({x:product.doorSymbolSide==='left'?6+Number(s.leftMm??15.85):186-Number(s.rightMm??15.85)-size,y:3.525+Number(s.topMm??43),width:size,height:size});
  }
  const placement=getDoorTextPlacement(c,v,{obstacles,braille:['tactile','whiteboard'].includes(mode)});
  for(const group of [placement.heading,placement.names,placement.titles])if(group.length)lines.push(...fitGroup(group.map(line=>({...line,x:line.x-6,y:line.y-3.525,font:line.italic?fonts.italic:fonts.regular}))));
 }else if(personal){
  const headingFont=(Number(c.line1TextHeightMm)||15.5)/CAP_RATIO,nameFont=(Number(c.nameTextHeightMm)||10.1)/CAP_RATIO,titleFont=(Number(c.titleTextHeightMm)||6.56)/CAP_RATIO;
  const names=String(v.name||'').split(/\r?\n/).slice(0,2),nameGap=Number(c.nameLineGapMm)||(Number(c.nameTextHeightMm)||10.1)*1.25;
  const headings=[v.heading,v.extra].join('\n').split(/\r?\n/).slice(0,3);
  const first=Number(c.line1BaselineMm)||27.5,baseGap=(Number(c.line2BaselineMm)||47.5)-first,top=first-headingFont*CAP_RATIO;
  const bottom=Math.min(86.7-4,v.name?(Number(c.nameBaselineMm)||59.8)-(names.length-1)*nameGap-nameFont*CAP_RATIO-3:Infinity,v.title?(Number(c.titleBaselineMm)||72.5)-titleFont*CAP_RATIO-3:Infinity);
  const gap=headings.length===3?Math.min(baseGap,(bottom-top)/2.8):baseGap,size=headings.length===3?Math.min(headingFont,gap*.8/CAP_RATIO):headingFont;
  lines.push(...fitGroup(headings.map((text,index)=>({text,x:Number(c.line1LeftMm)||0,y:top+size*CAP_RATIO+index*gap,fontSize:size,maxWidth:Math.max(1,164-(Number(c.line1LeftMm)||0))}))));
  if(v.name)lines.push(...fitGroup(names.map((text,index)=>({text,x:Number(c.nameLeftMm)||0,y:(Number(c.nameBaselineMm)||59.8)+(index-names.length+1)*nameGap,fontSize:nameFont,maxWidth:Math.max(1,164-(Number(c.nameLeftMm)||0))}))));
  if(v.title)lines.push({text:v.title,x:Number(c.titleLeftMm)||0,y:Number(c.titleBaselineMm)||72.5,fontSize:titleFont,font:c.titleItalic!==false?fonts.italic:fonts.regular});
 }else{
  const size=(Number(c.line1TextHeightMm)||15.5)/CAP_RATIO,x=Number(c.line1LeftMm)||0;
  lines.push(...fitGroup([{text:v.textLine1,x,y:Number(c.line1BaselineMm)||27.5,fontSize:size},...(v.textLine2&&product.doorUseLine2?[{text:v.textLine2,x,y:Number(c.line2BaselineMm)||47.5,fontSize:size,maxWidth:Math.max(1,164-x)}]:[])]));
 }
 if(product.doorUseNumber&&product.doorNumber){
  const n=product.doorNumberConfig||{},margin=Number(c.line1LeftMm)||15.85,height=Math.min(70,Math.max(3,Number(n.textHeightMm)||28));
  const left=Math.min(170,Math.max(0,Number(n.leftMm??margin))),right=Math.min(170,Math.max(0,Number(n.rightMm??margin))),top=Math.min(86.7-height,Math.max(0,Number(n.topMm??(product.doorUseLine2?50:43))));
  const side=product.doorNumberSide==='right',x=side?180-right:left;
  lines.push(...fitGroup([{text:String(product.doorNumber),x,y:top+height,fontSize:height/CAP_RATIO,font:fonts.bold,textAnchor:side?'end':'start',maxWidth:Math.max(1,Math.min(80,172-(side?right:left)))}]));
 }
 let body='';
 for(const line of lines){
  if(!line.text.trim())continue;
  if(line.text.length>300||![line.x,line.y,line.fontSize].every(Number.isFinite)||line.fontSize<=0)fail('Dörrskyltens textinställningar är ogiltiga.');
  const font=line.font||fonts.regular,x=line.textAnchor==='end'?line.x-textWidth(line.text,font,line.fontSize):line.x;
  const curves=textCurves(line.text,font,line.fontSize*font.capHeight/font.unitsPerEm,x,line.y);
  if(curves.bbox[0]<-.1||curves.bbox[2]>WIDTH_MM+.1||curves.bbox[1]<-.1||curves.bbox[3]>HEIGHT_MM+.1)fail('Texten får inte plats på dörrskyltens produktionsyta. Kontrollera artikelns textplacering och titel.');
  body+=curves.body;
 }
 const symbol=product.doorUseSymbol?product.doorSymbolImage:null;
 if(product.doorUseSymbol&&!symbol)fail('Dörrskyltens symboloriginal saknas. Öppna från webbläsaren där symbolbiblioteket finns och försök igen.');
 const s=product.doorSymbolConfig||{},size=Math.min(70,Math.max(3,Number(s.sizeMm)||28));
 const left=Math.min(180-size,Math.max(0,Number(s.leftMm??15.85))),right=Math.min(180-size,Math.max(0,Number(s.rightMm??15.85))),top=Math.min(86.7-size,Math.max(0,Number(s.topMm??43)));
 const tactile=['tactile','whiteboard'].includes(mode);
 const braille=tactile?layoutBraille(doorBrailleText(product,v,{personal}),{leftMm:Number(c.brailleLeftMm)||0,bottomMm:Number(c.brailleBaselineMm)||70.5,fontSizeMm:Number(c.brailleFontSizeMm)||6.5}):null;
 if(braille){
  const sx=product.doorSymbolSide==='left'?left:180-right-size;
  if(symbol&&sx<braille.left+braille.width&&sx+size>braille.left&&top<braille.top+braille.height&&top+size>braille.top)fail('Symbolen överlappar punktskriften. Flytta symbolen eller justera punktskriftens placering.');
  for(const line of lines){
   if(!line.text.trim())continue;
   const font=line.font||fonts.regular,box=textCurves(line.text,font,line.fontSize*font.capHeight/font.unitsPerEm,line.x,line.y).bbox;
   if(box[0]<braille.left+braille.width&&box[2]>braille.left&&box[1]<braille.top+braille.height&&box[3]>braille.top)fail('Texten överlappar punktskriften. Justera artikelns textplacering.');
  }
  body+=braille.dots.map(dot=>'<path d="'+brailleDotPath(dot)+'"/>').join('');
 }
 return {body,lines,symbol,symbolBox:{x:product.doorSymbolSide==='left'?left:180-right-size,y:top,size},tactile,braille,registrationLines:mode==='tactile',color:/^#[0-9a-f]{3,6}$/i.test(c.color||'')?c.color:'#222222'};
}
async function doorImage(image){
 if(/^data:image\/svg\+xml/i.test(image))return {kind:'svg',...decodeSvgDataUrl(image)};
 const raster=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(String(image));
 if(raster){const data=Buffer.from(raster[2],'base64');if(data.length>5*1024*1024)fail('Dörrskyltens symbolbild är för stor.');return {kind:'image',data};}
 if(/^\/[a-zA-Z0-9_-]+\.svg$/.test(String(image)))return {kind:'svg',...sanitizeSvgSymbol(await fs.readFile(path.join(__dirname,'../public',image.slice(1))))};
 fail('Symbolformatet på dörrskylten stöds inte för produktion. Använd SVG, PNG eller JPG.');
}
async function makeDoorPdf(product,quantity,title,{label=title}={}){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)fail('Exportera 1–1000 exemplar per artikelrad.');
 let parts=[[product,'']];
 if(isThreePanelDoor(product)){
  const topProduct={...doorPanelProduct(product,'top'),...doorPanelForm(product,'top',product)};
  parts=[[topProduct,'Övre textyta']];
  if(String(product.articleNumber)==='0610'){
   if(!/^\d{1,4}$/.test(String(product.doorNumber||'')))fail('Skriv en siffra med högst fyra tecken i mittdelen.');
   parts.push([{...doorPanelProduct(product,'middle'),doorHeading:String(product.doorNumber),doorSignTextConfig:{...doorPanelProduct(product,'middle').doorSignTextConfig,line1TextHeightMm:50,line1LeftMm:0,line1BaselineMm:66,numberPanel:true}},'Siffra – mittdel']);
  }else parts.push([{...doorPanelProduct(product,'middle'),...doorPanelForm(product,'middle',product)},'Mittre textyta']);
  parts=parts.filter(([part])=>[part.doorHeading,part.customText,part.doorUseName&&part.doorName,part.doorUseTitle&&part.doorTitle].some(value=>String(value||'').trim()));
 }
 if(!parts.length)fail('Dörrskylten saknar sparad egen text.');
 const jobs=await Promise.all(parts.map(async([part,partLabel])=>{const layout=doorLayout(part);return {layout,image:layout.symbol?await doorImage(layout.symbol):null,label:label&&partLabel?label+' · '+partLabel:label};}));
 const header=label?HEADER_MM:0;
 const doc=new PDFDocument({autoFirstPage:false,pdfVersion:'1.6',info:{Title:title,Creator:'JSF Flow',Subject:'Dörrskylt, utskrift 180 x 89 mm, 1:1'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',part=>chunks.push(part));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
 try{
  const print=labelLayer(doc);doc._root.data.OCProperties={OCGs:[print],D:{Order:[print],ON:[print]}};
  for(const {layout,image,label} of jobs)for(let copy=1;copy<=quantity;copy++){
   doc.addPage({size:[mm(WIDTH_MM),mm(HEIGHT_MM+header)],margin:0});doc.page.dictionary.data.TrimBox=[0,0,mm(WIDTH_MM),mm(HEIGHT_MM)];doc.page.resources.data.Properties={PrintData:print};
   doc.addContent('/OC /PrintData BDC');if(label)drawProductionLabel(doc,label,WIDTH_MM,{copy,quantity});
   doc.save().translate(0,mm(header));doc.save().scale(mm(1)).lineWidth(.1).rect(.05,.05,WIDTH_MM-.1,HEIGHT_MM-.1).stroke([0,0,0,100]);
   if(layout.registrationLines)doc.lineWidth(.0762).lineCap('square').moveTo(.05,.45).lineTo(WIDTH_MM-.05,.45).moveTo(.05,HEIGHT_MM-.45).lineTo(WIDTH_MM-.05,HEIGHT_MM-.45).stroke([0,0,0,100]);
   if(image){const {x,y,size}=layout.symbolBox;if(image.kind==='svg'){const svg=image.svg.replace(/width="[^"]+"/,'width="'+size+'"').replace(/height="[^"]+"/,'height="'+size+'"');SVGtoPDF(doc,svg,x,y,{assumePt:true,width:size,height:size,warningCallback:message=>fail('Dörrsymbolen kunde inte skapas: '+message)});}else doc.image(image.data,x,y,{fit:[size,size],align:'center',valign:'center'});}
   doc.restore();
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+mm(WIDTH_MM)+'" height="'+mm(HEIGHT_MM)+'" viewBox="0 0 '+WIDTH_MM+' '+HEIGHT_MM+'"><g fill="'+layout.color+'">'+layout.body+'</g></svg>';
   SVGtoPDF(doc,svg,0,0,{assumePt:true,width:mm(WIDTH_MM),height:mm(HEIGHT_MM),warningCallback:message=>fail('Dörrtexten kunde inte skapas: '+message)});
   doc.restore();doc.addContent('EMC');
  }
  doc.end();return await done;
 }catch(error){doc.destroy(error);throw error;}
}
module.exports={WIDTH_MM,HEIGHT_MM,isDoor,doorLayout,makeDoorPdf};
