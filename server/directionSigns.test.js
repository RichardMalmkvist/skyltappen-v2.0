const {test}=require('node:test'),assert=require('node:assert/strict');
const {directionArticles,newDirectionDetails}=require('../src/data/directionSigns');
const {makeDibondPdf,prepareDibond}=require('./dibondProduction');
const {buildProjectOrderItems}=require('./projectOrderGrouping');
const articles=directionArticles();
test('Replacement decals keep their variant, custom size and production sides',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 for(const number of ['1105','1106']){
  const product=articles.find(a=>a.articleNumber===number);
  assert.equal(product.productType,'dekal');assert.equal(product.isImplemented,false);
  const custom={...newDirectionDetails(product),widthMm:900,heightMm:200,lines:[{text:'Reception',sizeMm:40,firstLineBottomMm:85}],separatorEnabled:true,separatorOffsetYMm:0};
  const [item]=buildProjectOrderItems([{id:'decal',articleId:product.id,quantity:2,configuration:{dibondSign:custom}}],articles);
  assert.equal(item.articleNumber,number);assert.equal(item.dibondSign.widthMm,900);
  const opposite={...custom,outdoorSign:{...custom.outdoorSign,doubleSided:!custom.outdoorSign.doubleSided}};
  const [switched]=buildProjectOrderItems([{id:'decal',articleId:product.id,quantity:1,configuration:{dibondSign:opposite}}],articles);
  assert.equal(switched.articleNumber,number==='1105'?'1106':'1105');
  const pdf=await makeDibondPdf({...product,dibondSign:custom},2,'Direction decal',{label:'Art. '+number});
  const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;
  assert.equal(doc.numPages,number==='1106'?4:2);
  const page=await doc.getPage(1);assert.ok(Math.abs(page.view[2]-906*72/25.4)<.01);
  assert.match(pdf.toString('latin1'),/CutContour/);await task.destroy();
 }
});
function sign(double=false){const s=newDirectionDetails(articles[0]);s.outdoorSign.doubleSided=double;s.lines[0].text='Centraldepå';s.directionPanels[0].lines[0].text='Transportservice';s.directionPanels[0].heightMm=220;return s;}
test('Order retains all panels and resolves the double-sided article and price',()=>{const [item]=buildProjectOrderItems([{id:'s',articleId:articles[0].id,quantity:2,configuration:{dibondSign:sign(true)}}],articles);assert.equal(item.articleNumber,'1102');assert.equal(item.unitPrice,8000);assert.equal(item.dibondSign.directionPanels[0].heightMm,220);});
test('PDF exports every panel at its own 1:1 dimensions for every side and copy',async()=>{const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');for(const double of [false,true]){const pdf=await makeDibondPdf({...articles[0],dibondSign:sign(double)},2,'Direction',{label:'Art. 1101'});const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;assert.equal(doc.numPages,double?8:4);for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);assert.ok(Math.abs(page.view[2]-1506*72/25.4)<.01);assert.ok(Math.abs(page.view[3]-(i%2?184:234)*72/25.4)<.01);const ops=await page.getOperatorList();assert.ok(ops.fnArray.length>0);}assert.match(pdf.toString('latin1'),/CutContour/);await task.destroy();}});
test('Invalid child artwork or a stack exceeding the post height cannot be printed',()=>{let s=sign();s.directionPanels[0].lines[0].sizeMm=500;assert.throws(()=>prepareDibond({...articles[0],dibondSign:s}));s=sign();s.outdoorSign.totalHeightMm=400;assert.throws(()=>prepareDibond({...articles[0],dibondSign:s}),/stolparna/);});
