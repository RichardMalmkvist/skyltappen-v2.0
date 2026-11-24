const PDFDocument = require('pdfkit');
const { badgeKind, isBadgeOrder, badgeAddressLines } = require('../src/data/badgeProduction');

const clean = value => String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function itemDetails(item) {
  const fields = [['Namn', item.name], [badgeKind(item)==='profession'?'Text':'Titel', item.title], ['Titel rad 2', item.titleLine2], ['Verksamhetsnamn rad 1', item.orgLine1], ['Verksamhetsnamn rad 2', item.orgLine2], ['Fäste', item.fastening], ['Extra magnetfästen', number(item.extraMagnets)>0?item.extraMagnets:''], ['Format', item.format], ['Anteckningar', item.notes]];
  return fields.filter(([,value]) => clean(value)).map(([label,value]) => `${label}: ${clean(value)}`);
}

async function createOrderAcknowledgementPdf(order) {
  if (!order || !Array.isArray(order.cart) || !order.cart.length) throw new Error('Ordern saknar artikelrader.');
  const ref=clean(order.orderNumber||order.submissionNumber||order.id);
  const doc=new PDFDocument({size:'A4',margin:0,bufferPages:true,info:{Title:`Ordererkännande ${ref}`,Author:'Jönköpings Skyltfabrik',Creator:'JSF Flow'}});
  const chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  done.catch(()=>{});
  const left=48.2,width=498.9,right=left+width,bottom=736,green='#176b4a',ink='#171a18',muted='#747c77';
  const fs=require('fs'),path=require('path'),JsBarcode=require('jsbarcode');
  const logo=path.join(__dirname,'../public/jsf-logo.jpg');
  let y=0,tableActive=false;
  function text(value,x,top,{size=6.75,bold=false,color=ink,width:w=width,...options}={}) {
    doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(color)
      .text(clean(value),x,top,{width:w,lineBreak:false,...options});
  }
  function rule(top,dark=false){doc.moveTo(left,top).lineTo(right,top).lineWidth(dark ? 0.75 : 0.5).strokeColor(dark?'#263c32':'#dfe3e0').stroke();}
  function wrap(value,w,size=6.75,bold=false){
    doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size);
    const result=[];
    for(const paragraph of clean(value).split(/\r\n|\r|\n/)){
      let line='';
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        if(doc.widthOfString(line?line+' '+word:word)<=w){line=line?line+' '+word:word;continue;}
        if(line){result.push(line);line='';}
        for(const char of word){if(line&&doc.widthOfString(line+char)>w){result.push(line);line='';}line+=char;}
      }
      result.push(line);
    }
    return result;
  }
  function barcode(){
    const target={};
    JsBarcode(target,ref,{format:'CODE128',displayValue:false,margin:0});
    const bits=target.encodings.map(encoding=>encoding.data).join('');
    const x=212,w=136,unit=w/bits.length;
    doc.fillColor(ink);
    for(let i=0;i<bits.length;){if(bits[i]!=='1'){i++;continue;}const start=i;while(bits[i]==='1')i++;doc.rect(x+start*unit,74,(i-start)*unit,27).fill();}
  }
  function columns(){
    text('ART.NR',left,y,{size:6,bold:true,color:'#606963',characterSpacing:.3});
    text('BESKRIVNING',left+62,y,{size:6,bold:true,color:'#606963',characterSpacing:.3});
    text('ANTAL',left+399,y,{size:6,bold:true,color:'#606963',width:42,align:'center',characterSpacing:.3});
    text('LEV. ANTAL',left+441,y,{size:6,bold:true,color:'#606963',width:58,align:'right',characterSpacing:.3});
    rule(y+15,true);y+=26;
  }
  function page(continuation=false){
    if(continuation)doc.addPage();
    text('ORDERERKÄNNANDE',left,52,{size:6.75,bold:true,color:green,characterSpacing:1.08});
    text(ref,left,75,{size:20.25,bold:true,width:158});
    barcode();
    if(!fs.existsSync(logo))throw new Error('JSF-logotypen saknas: public/jsf-logo.jpg');
    doc.image(logo,right-147.4,55.5,{fit:[147.4,31.2],align:'right',valign:'center'});
    text('Jönköpings Skyltfabrik',right-164,96,{size:8.25,bold:true,width:164,align:'right'});
    text('Gammavägen 1',right-164,109,{size:6.75,width:164,align:'right'});
    text('556 52 Jönköping',right-164,120,{size:6.75,width:164,align:'right'});
    y=150;
    if(continuation){text('Fortsättning',left,y,{size:6,color:muted});y+=24;if(tableActive)columns();}
  }
  function ensure(height=12){if(y+height>bottom)page(true);}
  function lines(value,{size=6.75,bold=false,color=ink}={}){
    for(const line of wrap(value,width,size,bold)){ensure(size+3);text(line,left,y,{size,bold,color});y+=size+3;}
  }
  function purchaserCard(o){
    const fields=[['Namn',o.purchaserName||o.ordererName],['Telefon',o.purchaserPhone||o.ordererPhone],['Mejl',o.purchaserEmail||o.ordererEmail]].filter(([,v])=>clean(v));
    const x=383,w=164.1,top=143,pad=11.3;
    const prepared=fields.map(([label,value])=>({label,lines:wrap(value,w-pad*2,6.75)}));
    const height=Math.max(99,29+prepared.reduce((sum,f)=>sum+11+f.lines.length*9,0));
    doc.roundedRect(x,top,w,height,4.25).fillAndStroke('#f7f8f7','#e1e5e2');
    text('BESTÄLLARE',x+pad,top+10.5,{size:6,color:'#706b64',characterSpacing:.45,width:w-pad*2});
    let topLine=top+25;
    for(const field of prepared){
      text(field.label,x+pad,topLine,{size:5.25,color:'#7a756e',width:w-pad*2});topLine+=9;
      for(const line of field.lines){text(line,x+pad,topLine,{size:6.75,width:w-pad*2});topLine+=9;}
      topLine+=3;
    }
    return top+height;
  }
  function deliveryCard(o){
    const address=badgeAddressLines(order).flatMap(line=>line?wrap(line,width-28.4,6.6,true):['']);
    const accounts=o.accountNumber?wrap(o.accountNumber,width-28.4,6.6):[];
    // Exceptionally long imported addresses can continue in a subsequent card.
    const entries=[...address.map(line=>({line,bold:true})),...(accounts.length?[{line:'',gap:8},{line:'ANSVARSNUMMER',label:true},...accounts.map(line=>({line}))]:[])];
    let remaining=entries;
    while(remaining.length){
      ensure(122);const room=bottom-y;let count=0,contentHeight=0;
      while(count<remaining.length && contentHeight+(remaining[count].gap||9)<=room-43){contentHeight+=remaining[count].gap||9;count++;}
      const chunk=remaining.slice(0,count);remaining=remaining.slice(count);
      const h=Math.max(122,43+contentHeight);
      const top=y;
      doc.roundedRect(left,top,width,Math.min(h,bottom-top),8.5).fillAndStroke('#f7f8f7','#e1e5e2');
      text('LEVERANSADRESS',left+14.2,top+14.2,{size:6,bold:true,color:green,characterSpacing:.6});
      let cursor=top+31;
      for(const entry of chunk){if(entry.gap){cursor+=entry.gap;continue;}text(entry.line,left+14.2,cursor,{size:entry.label?5.25:6.6,bold:entry.bold||entry.label,color:entry.label?muted:ink,width:width-28.4,characterSpacing:entry.label ? 0.3 : 0});cursor+=9;}
      y=top+Math.min(h,bottom-top)+24;
      if(remaining.length)page(true);
    }
  }
  try{
    page();
    const date=new Date(order.approvedAt||order.createdAt||Date.now());
    const meta=[['ORDERDATUM',Number.isNaN(date.getTime())?'-':new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(date)],['ORDERNUMMER',ref]];
    const details=order.orderDetails||{};
    if(details.customerReference)meta.push(['KUNDENS REFERENS',details.customerReference]);
    if(order.productionPlan?.deliveryDate)meta.push(['LEVERANSDATUM',order.productionPlan.deliveryDate]);
    if(order.productionPlan?.installationDate)meta.push(['MONTAGEDATUM',order.productionPlan.installationDate]);
    let metaEnd=143;
    for(let i=0;i<meta.length;i++){
      const x=left+(i%2)*161,top=144+Math.floor(i/2)*31;
      text(meta[i][0],x,top,{size:6,bold:true,color:muted,characterSpacing:.4,width:150});
      const values=wrap(meta[i][1],150,7.5,true);let yy=top+13;
      for(const line of values){text(line,x,yy,{size:7.5,bold:true,width:150});yy+=10;}
      metaEnd=Math.max(metaEnd,yy);
    }
    const o=order.orderer||{};
    const purchaserEnd=purchaserCard(o);
    y=Math.max(267,purchaserEnd+25,metaEnd+25);
    deliveryCard(o);
    if(o.messageToSupplier){ensure(45);lines('MEDDELANDE',{size:6,bold:true,color:green});lines(o.messageToSupplier);y+=16;}
    ensure(65);tableActive=true;columns();
    for(const item of order.cart){
      const title=wrap(item.badgeName||item.productName||'Artikel',325,6.75,true);
      const detail=itemDetails(item).flatMap(value=>wrap(value,325,5.85));
      const article=wrap(item.articleNumber||'-',56,6.525);
      const heading=Math.max(title.length,article.length)*10;
      const rowHeight=heading+detail.length*9+25;
      ensure(rowHeight<530?rowHeight:38);
      const qty=Math.max(1,number(item.quantity)||1);
      text(qty,left+399,y,{size:6.525,width:42,align:'center'});
      text(qty,left+441,y,{size:6.525,width:58,align:'center'});
      for(let i=0;i<Math.max(title.length,article.length);i++){
        ensure(10);if(article[i])text(article[i],left,y,{size:6.525,width:56});if(title[i])text(title[i],left+62,y,{size:6.75,bold:true,width:325});y+=10;
      }
      for(const line of detail){ensure(9);text(line,left+62,y,{size:5.85,color:'#555e58',width:325});y+=9;}
      y+=10;ensure(3);rule(y);y+=16;
    }
    tableActive=false;ensure(66);y+=4;rule(y,true);y+=16;
    text('Totalt antal',left,y,{size:6,color:'#69716c'});y+=12;
    const qty=order.cart.reduce((sum,item)=>sum+Math.max(1,number(item.quantity)||1),0);
    text(`${qty} st`,left,y,{size:7.5,bold:true});
    const pages=doc.bufferedPageRange();
    for(let index=pages.start;index<pages.start+pages.count;index++){
      doc.switchToPage(index);rule(765);
      text('Jönköpings Skyltfabrik',left,779,{size:6.375,bold:true,color:'#353c38'});
      text(`Tack för er beställning.${pages.count>1?`  Sida ${index+1} av ${pages.count}`:''}`,left,790,{size:6,color:'#737b76'});
      text('Ordernummer',right-130,779,{size:6,color:'#737b76',width:130,align:'right'});
      text(ref,right-130,790,{size:6.375,bold:true,color:'#353c38',width:130,align:'right'});
      if(order.test)text('PROV - INGEN RIKTIG BESTÄLLNING',left,748,{size:6,color:'#97531c'});
    }
    doc.end();return await done;
  }catch(error){doc.destroy(error);throw error;}
}

async function createAcknowledgementAttachments(orders) {
  const attachments=[];
  for(const order of orders.filter(isBadgeOrder)) {
    const data=await createOrderAcknowledgementPdf(order);
    const ref=clean(order.orderNumber||order.submissionNumber||order.id).replace(/[^a-zA-Z0-9_-]/g,'_');
    attachments.push({name:`Ordererkannande_${ref}.pdf`,contentType:'application/pdf',contentInBase64:data.toString('base64')});
  }
  return attachments;
}
module.exports={createOrderAcknowledgementPdf,createAcknowledgementAttachments};
