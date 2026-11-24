const {test}=require('node:test'),assert=require('node:assert/strict');
const {outdoorArticles,outdoorInitialDetails}=require('../src/data/outdoorBusinessSigns');
const {makeDibondPdf,prepareDibond}=require('./dibondProduction');
const {buildProjectOrderItems}=require('./projectOrderGrouping');
const articles=outdoorArticles();
test('0901 keeps its article number, price and panel dimensions in production',async()=>{
 const {outdoorOtArticle}=require('../src/data/outdoorOtArticle');
 const article=outdoorOtArticle(),details={widthMm:1540,heightMm:1300,cornerRadiusMm:0,...outdoorInitialDetails(article)};
 details.lines[0].text='Sjukhuset';
 const [item]=buildProjectOrderItems([{id:'ot',articleId:article.id,quantity:1,configuration:{dibondSign:details}}],[article]);
 assert.equal(item.articleNumber,'0901');assert.equal(item.unitPrice,8800);assert.match(item.format,/1740.*2100/);
 const pdf=await makeDibondPdf(item,1,'OT',{label:'Art. 0901'}),pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;
 assert.equal(doc.numPages,1);const page=await doc.getPage(1);assert.ok(Math.abs(page.view[2]-1546*72/25.4)<.01);
 assert.ok(Math.abs(page.view[3]-1314*72/25.4)<.01);assert.match(pdf.toString('latin1'),/CutContour/);await task.destroy();
});
const sign=double=>({widthMm:1300,heightMm:470,cornerRadiusMm:0,...outdoorInitialDetails(articles[0]),lines:[{text:'Regionfastigheter',sizeMm:70,bold:true,firstLineBottomMm:150}],outdoorSign:{withPosts:true,doubleSided:double,totalHeightMm:1250}});
test('Project orders resolve double-sided variant, price and saved stand measurements',()=>{
 const [item]=buildProjectOrderItems([{id:'s',articleId:articles[0].id,quantity:2,configuration:{dibondSign:sign(true)}}],articles);
 assert.equal(item.articleNumber,'1002');assert.equal(item.unitPrice,8000);assert.equal(item.articleId,articles[1].id);assert.match(item.format,/1500 × 1250/);assert.equal(item.dibondSign.outdoorSign.doubleSided,true);
});
test('Production exports only the panel at 1:1, once or twice per ordered sign',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 for(const double of [false,true]){
 const product={...articles[double?1:0],dibondSign:sign(double)},pdf=await makeDibondPdf(product,2,'Outdoor',{label:'Art. '+product.articleNumber});
 const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;
 assert.equal(doc.numPages,double?4:2);const page=await doc.getPage(1);assert.ok(Math.abs(page.view[2]-(1306*72/25.4))<.01);assert.ok(Math.abs(page.view[3]-(484*72/25.4))<.01);
 assert.match(pdf.toString('latin1'),/CutContour/);await task.destroy();
 }
 assert.throws(()=>prepareDibond({...articles[0],dibondSign:{...sign(false),heightMm:1300}}),/stolparna/);
});

test('Replacement decal PDFs preserve custom dimensions and print two faces for 1006',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 for(const number of ['1005','1006']){
  const article=articles.find(a=>a.articleNumber===number);
  const custom={widthMm:1000,heightMm:400,cornerRadiusMm:0,...outdoorInitialDetails(article),symbols:[],lines:[{text:'Egen text',sizeMm:50,bold:true,firstLineBottomMm:120}],separatorEnabled:true,separatorOffsetYMm:0};
  const item={...article,dibondSign:custom};
  const pdf=await makeDibondPdf(item,2,'Replacement decal',{label:'Art. '+number});
  const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;
  assert.equal(doc.numPages,number==='1006'?4:2);
  const page=await doc.getPage(1);
  assert.equal(prepareDibond(item).sign.lines[0].text,'Egen text');
  assert.ok(pdf.length>1000);
  assert.ok(Math.abs(page.view[2]-(1006*72/25.4))<.01);
  assert.match(pdf.toString('latin1'),/CutContour/);
  await task.destroy();
 }
});
