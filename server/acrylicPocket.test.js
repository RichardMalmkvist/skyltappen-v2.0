const {test}=require('node:test'),assert=require('node:assert/strict');
const {makeDibondPdf,prepareDibond}=require('./dibondProduction');
const product={articleNumber:'0701',previewType:'dibond_sign',dibondSign:{widthMm:420,heightMm:650,frameEnabled:false,cornerRadiusMm:25,lines:[{text:'Test',sizeMm:20,firstLineBottomMm:80}],acrylicPocket:{enabled:true,xMm:105,yMm:280}}};
test('Pocket placement is validated and removal permits smaller signs',()=>{
 assert.equal(prepareDibond(product).width,420);
 assert.throws(()=>prepareDibond({...product,dibondSign:{...product.dibondSign,acrylicPocket:{enabled:true,xMm:300,yMm:280}}}),/A4/);
 assert.equal(prepareDibond({...product,dibondSign:{...product.dibondSign,widthMm:200,heightMm:200,acrylicPocket:{enabled:false}}}).width,200);
});
test('Physical pocket never paints on production artwork; cut contour remains',async()=>{
 const pdf=await makeDibondPdf(product,1,'0701');
 const without=await makeDibondPdf({...product,dibondSign:{...product.dibondSign,acrylicPocket:{enabled:false}}},1,'0701');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const load=async buffer=>{const task=pdfjs.getDocument({data:new Uint8Array(buffer),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;const page=await doc.getPage(1);const ops=await page.getOperatorList();await task.destroy();return ops;};
 assert.deepEqual(await load(pdf),await load(without));assert.match(pdf.toString('latin1'),/CutContour/);
 const labeled=await makeDibondPdf(product,1,'0701',{label:'Order 123 | Art. 0701'});assert.ok(labeled.length>pdf.length);
});
