const {test}=require('node:test'),assert=require('node:assert/strict');
const {profileArticles}=require('../src/data/profileSigns'),{outdoorInitialDetails}=require('../src/data/outdoorBusinessSigns');
const {buildProjectOrderItems}=require('./projectOrderGrouping'),{makeDibondPdf}=require('./dibondProduction');
test('Profile articles keep panel sizes, reference prices, copies and sides in project orders and PDFs',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 for(const double of [false,true]){
 const articles=profileArticles(double);
 for(const product of articles){
  const sign=outdoorInitialDetails(product);sign.lines[0].text='Reception';sign.lines[0].sizeMm=35;
  for(const [index,panel] of sign.directionPanels.entries())panel.lines[0].text='Avdelning '+(index+1);
  const [item]=buildProjectOrderItems([{id:'profile',articleId:product.id,quantity:2,configuration:{dibondSign:sign}}],articles);
  assert.equal(item.articleNumber,product.articleNumber);assert.equal(item.unitPrice,product.unitPrice);
  const pdf=await makeDibondPdf(item,2,'Profile',{label:'Art. '+product.articleNumber});
  const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;
  const sides=sign.outdoorSign.doubleSided?2:1;assert.equal(doc.numPages,(sign.directionPanels.length+1)*2*sides);
  const page=await doc.getPage(1);assert.ok(Math.abs(page.view[2]-(sign.widthMm+6)*72/25.4)<.01);assert.match(pdf.toString('latin1'),/CutContour/);await task.destroy();
 }
 }
});
