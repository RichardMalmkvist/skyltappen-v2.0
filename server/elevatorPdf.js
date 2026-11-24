const {elevatorBoardLayout}=require('../src/data/elevatorBoardLayout');
const PDFDocument=require('pdfkit'),SVGtoPDF=require('svg-to-pdfkit');
const {fonts,textCurves,measureText}=require('./productionText');
const logo=require('./plotter-assets/elevator-logo.json');
const {HEADER_MM,labelLayer,drawProductionLabel}=require('./productionLabel');
const mm=value=>value*72/25.4;
const approximateWidth=value=>Array.from(String(value||'')).reduce((n,c)=>n+(c===' '?.3:/[ilI1.,:;]/.test(c)?.27:/[MW@]/.test(c)?.85:.56),0);
const fitText=(value,available,preferred)=>Math.min(preferred,available/Math.max(.1,approximateWidth(value)));

// Same paper geometry as ElevatorBoardPreview; all letters become Arial paths.
function elevatorArtwork(board,label,markerIndex=-1){
 const {width,height,margin,contentWidth,scale}=elevatorBoardLayout(board);
 const groups=board.floors.map(f=>({...f,lines:String(f.text||'').split(/\r?\n/)}));
 const capRatio=fonts.regular.capHeight/fonts.regular.unitsPerEm;
 const text=(value,x,y,size,bold=false,color='#161616',length)=>{
  if(!String(value).trim())return '';
  const measured=measureText(value,size*capRatio,bold).width;
  return '<g fill="'+color+'" transform="translate('+x+' '+y+') scale('+(length?length/Math.max(.001,measured):1)+' 1)">'+textCurves(value,bold?fonts.bold:fonts.regular,size*capRatio,0,0).body+'</g>';
 };
 let cursor=10,body='<rect x=".05" y=".05" width="'+(width-.1)+'" height="'+(height-.1)+'" fill="white" stroke="#444" stroke-width=".1"/>';
 groups.forEach((floor,index)=>{
  const top=cursor,barH=30*scale,lineH=28*scale,green=floor.highlightLine>=0&&floor.highlightLine<floor.lines.length;
  cursor+=barH+5*scale+floor.lines.length*lineH+(green?2*scale:0)+(index<groups.length-1?5*scale:0);
  body+='<rect x="'+margin+'" y="'+top+'" width="'+contentWidth+'" height="'+barH+'" rx="'+Math.min(2,barH*.15)+'" fill="#191919"/>';
  body+=text(floor.heading,margin+6,top+barH*.77,Math.min(24,barH*.75,fitText(floor.heading,contentWidth-14,24)),true,'#fff');
  if(index===markerIndex)body+='<circle data-elevator-marker="true" cx="'+(margin-8)+'" cy="'+(top+barH*.5)+'" r="'+Math.min(5.5,barH*.24)+'" fill="#0087b8"/>';
  floor.lines.forEach((line,i)=>{
   const highlighted=floor.highlightLine===i,y=top+barH+5*scale+i*lineH+(green&&i>=floor.highlightLine?2*scale:0);
   if(highlighted)body+='<rect x="'+margin+'" y="'+y+'" width="'+contentWidth+'" height="'+lineH+'" rx="'+Math.min(2,lineH*.15)+'" fill="#00b86b"/>';
   body+=text(line,margin+4,y+lineH*.79,Math.min(24,lineH*.77,fitText(line,contentWidth-9,24)),false,highlighted?'#fff':'#161616');
  });
 });
 const letter=String(board.liftLetter||label.match(/hiss\s*([a-z0-9]+)/i)?.[1]||'').toUpperCase().slice(0,5);
 const liftName='Hiss '+(letter||'–'),length=approximateWidth(liftName)*3,baseline=height-25.6,anchor=baseline-length-2-19.5;
 body+='<g transform="translate('+(width-2)+' '+anchor+') rotate(-90)"><g transform="translate(-19.5 -3) scale(0.023708 0.023337)">'+logo.map(p=>'<path fill="'+p.fill+'" d="'+p.d+'"/>').join('')+'</g></g>';
 body+='<g transform="translate('+(width-3.2)+' '+baseline+') rotate(-90)">'+text(liftName,0,0,3,false,'#171717',length)+'</g>';
 return {width,height,body};
}
async function makeElevatorPdf(board,floorCopies,cabinCopies,title,{label=title}={}){
 const total=floorCopies+cabinCopies;
 if(![floorCopies,cabinCopies].every(n=>Number.isSafeInteger(n)&&n>=0)||total<1||total>1000)throw new Error('Välj 1–1000 exemplar totalt.');
 const doc=new PDFDocument({autoFirstPage:false,pdfVersion:'1.6',info:{Title:title,Creator:'JSF Flow',Subject:'Hisstavla, pappersutskrift 1:1'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
 try{
  const print=labelLayer(doc);doc._root.data.OCProperties={OCGs:[print],D:{Order:[print],ON:[print]}};
  // Render one artwork per distinct plan; repeated copies reuse their geometry.
  const cache=new Map();
  for(let i=0;i<total;i++){
   const marker=i<floorCopies?i%board.floors.length:-1;
   if(!cache.has(marker))cache.set(marker,elevatorArtwork(board,title,marker));
   const {width,height,body}=cache.get(marker);
   doc.addPage({size:[mm(width),mm(height+HEADER_MM)],margin:0});
   doc.page.dictionary.data.TrimBox=[0,0,mm(width),mm(height)];
   doc.page.resources.data.Properties={PrintData:print};doc.addContent('/OC /PrintData BDC');
   const description=(label+' | '+(marker>=0?board.floors[marker].heading:'Hisskorg')).slice(0,260);
   drawProductionLabel(doc,description,width,{copy:i+1,quantity:total});
   doc.save().translate(0,mm(HEADER_MM));
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+mm(width)+'" height="'+mm(height)+'" viewBox="0 0 '+width+' '+height+'">'+body+'</svg>';
   SVGtoPDF(doc,svg,0,0,{assumePt:true,width:mm(width),height:mm(height),warningCallback:message=>{throw new Error('Kunde inte skapa hisstavlan: '+message);}});
   doc.restore();doc.addContent('EMC');
  }
  doc.end();return await done;
 }catch(error){doc.destroy(error);throw error;}
}
module.exports={elevatorArtwork,makeElevatorPdf};
