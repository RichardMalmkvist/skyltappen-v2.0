const PDFDocument=require('pdfkit'),SVGtoPDF=require('svg-to-pdfkit');
const {cleanOTBoard}=require('./otBoards');
const {fonts,textCurves,measureText}=require('./productionText');
const {HEADER_MM,labelLayer,drawProductionLabel}=require('./productionLabel');
const mm=value=>value*72/25.4;
const isOT=item=>Boolean(item?.otBoard||item?.configuration?.otBoard);

// Same geometry as OTBoardPreview. All lettering uses the production Arial curves.
function otArtwork(input){
 const b=cleanOTBoard(input),width=b.widthMm,height=b.heightMm,columns=b.columns;
 const capRatio=fonts.regular.capHeight/fonts.regular.unitsPerEm;
 const measure=(text,size,bold=false)=>measureText(text,size*capRatio,bold).width;
 const gap=columns===2?width*.024:0,cw=(width-gap)/columns,margin=cw*.045;
 const header=columns===2?24.5:width*.06,box=columns===2?Math.max(cw*.037,7/capRatio):cw*.037;
 const count=Math.max(1,Math.ceil(b.rows.length/columns));
 const floorWidth=b.showFloor?cw*.08:0,floorGap=b.showFloor?cw*.006:0;
 const floorRight=cw-cw*.02;
 const targetRight=(b.showFloor?floorRight:cw-margin)-floorWidth-floorGap,targetX=targetRight-box,available=targetX-margin-5-cw*.025;
 const preferred=columns===2?7/capRatio:cw*.038;
 const lineHeight=Math.min(columns===2?10.3:cw*.052,(height-header-(columns===2?11:margin*2))/count);
 const font=Math.min(preferred,columns===2?lineHeight*(7/10.3)/capRatio:lineHeight*.76);
 const heading=columns===2?7/capRatio:cw*.035,stroke=Math.max(.5,font*.075)/2,boxed=b.targetBackground;
 let body='<rect x=".05" y=".05" width="'+(width-.1)+'" height="'+(height-.1)+'" fill="white" stroke="#252525" stroke-width=".1"/><rect x=".05" y=".05" width="'+(width-.1)+'" height="'+header+'" fill="#171717"/>';
 function text(value,x,y,size,{bold=false,color='#171717',maxWidth=Infinity,anchor='start',central=true}={}){
  if(!String(value??'').trim())return '';
  const metrics=measureText(value,size*capRatio,bold),w=Math.min(metrics.width,maxWidth),scale=w/Math.max(metrics.width,.001);
  const left=x-(anchor==='end'?w:anchor==='middle'?w/2:0);
  const baseline=central?y+(metrics.ascent-metrics.descent)/2:y;
  return '<g fill="'+color+'" transform="translate('+left+' 0) scale('+scale+' 1)">'+textCurves(value,bold?fonts.bold:fonts.regular,size*capRatio,0,baseline).body+'</g>';
 }
 for(let col=0;col<columns;col++){
  body+='<g transform="translate('+(col*(cw+gap))+' 0)">';
  body+=text(b.title,margin,header/2,heading,{color:'white',maxWidth:b.showFloor?cw*.59:cw*.68});
  body+=text(b.targetTitle,targetRight,header/2,heading,{color:'white',maxWidth:cw*.2,anchor:'end'});
  if(b.showFloor)body+=text('Plan',floorRight,header/2,heading,{color:'white',maxWidth:floorWidth,anchor:'end'});
  b.rows.slice(col*count,(col+1)*count).forEach((row,index)=>{
   const rowFont=columns===2?font*Math.min(1,available/Math.max(measure(row.text,font),.1)):font;
   const cap=rowFont*capRatio,y=columns===2?header+5.5+lineHeight*index+font*capRatio/2:header+margin*.65+lineHeight*(index+.5);
   const textWidth=Math.min(measure(row.text,rowFont),available),size=Math.min(box,lineHeight*.82);
   const targetFont=columns===2&&!boxed?Math.min(font,box/Math.max(measure(row.target,1,true),.1)):Math.min(columns===2?font:Infinity,size*.9,(size*.84)/Math.max(measure(row.target,1,true),.1));
   const left=targetX+(box-size)/2,end=margin+textWidth+cw*.008,lineEnd=left-5-(b.lineStyle==='dotted'?stroke/2:0);
   body+=text(row.text,margin,columns===2?y+cap/2:y,rowFont,{maxWidth:available,central:columns!==2});
   if(row.text&&row.target&&end<lineEnd){
    const ly=columns===2?y+cap/2:y+font*.28;
    if(b.lineStyle==='dotted'){
     for(let x=lineEnd;x>=end;x-=font*.26)body+='<circle cx="'+x+'" cy="'+ly+'" r="'+stroke/2+'" fill="#171717"/>';
    }else body+='<line x1="'+lineEnd+'" x2="'+end+'" y1="'+ly+'" y2="'+ly+'" stroke="#171717" stroke-width="'+stroke+'"'+(b.lineStyle==='dashed'?' stroke-dasharray="'+font*.36+' '+font*.22+'"':'')+'/>';
   }
   if(row.target){
    if(boxed)body+='<rect x="'+left+'" y="'+(y-size/2)+'" width="'+size+'" height="'+size+'" rx="'+size*.12+'" fill="#171717"/>';
    body+=text(row.target,boxed?targetX+box/2:left,columns===2&&!boxed?y+targetFont*capRatio/2:y,targetFont,{bold:true,color:boxed?'white':'#171717',anchor:boxed?'middle':'start',central:columns!==2||boxed});
   }
   if(b.showFloor)body+=text(row.floor,floorRight-cw*.015,columns===2?y+cap/2:y,rowFont,{anchor:'end',maxWidth:floorWidth-cw*.015,central:columns!==2});
  });
  body+='</g>';
 }
 return {width,height,body,board:b};
}
async function makeOTPdf(product,quantity,title,{label=title,includeLabel=true}={}){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)throw new Error('Exportera 1–1000 exemplar per OT-tavla.');
 const layout=otArtwork(product.otBoard),{width,height}=layout,header=includeLabel?HEADER_MM:0;
 const doc=new PDFDocument({autoFirstPage:false,pdfVersion:'1.6',info:{Title:title,Creator:'JSF Flow',Subject:'OT-tavla, print, 1:1, '+quantity+' exemplar'}}),chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',part=>chunks.push(part));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});done.catch(()=>{});
 try{
  const print=labelLayer(doc);doc._root.data.OCProperties={OCGs:[print],D:{Order:[print],ON:[print]}};
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+mm(width)+'" height="'+mm(height)+'" viewBox="0 0 '+width+' '+height+'">'+layout.body+'</svg>';
  const description=label+' | '+(product.otBoardName||'OT-tavla').replace(/[\r\n]/g,' ').slice(0,80)+' | Antal '+quantity+' st';
  for(let copy=1;copy<=quantity;copy++){
   doc.addPage({size:[mm(width),mm(height+header)],margin:0});doc.page.dictionary.data.TrimBox=[0,0,mm(width),mm(height)];doc.page.resources.data.Properties={PrintData:print};
   doc.addContent('/OC /PrintData BDC');if(includeLabel)drawProductionLabel(doc,description,width,{copy,quantity});
   doc.save().translate(0,mm(header));SVGtoPDF(doc,svg,0,0,{assumePt:true,width:mm(width),height:mm(height),warningCallback:message=>{throw new Error('Kunde inte skapa OT-tavlan: '+message);}});doc.restore();doc.addContent('EMC');
  }
  doc.end();return await done;
 }catch(error){doc.destroy(error);throw error;}
}
module.exports={isOT,otArtwork,makeOTPdf};
