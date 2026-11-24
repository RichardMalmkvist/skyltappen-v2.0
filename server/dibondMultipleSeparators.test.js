const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepareDibond,makeDibondPdf}=require('./dibondProduction');
const sign={widthMm:420,heightMm:650,frameEnabled:false,lines:[{text:'Laboratoriet',sizeMm:20,firstLineBottomMm:80}],separatorEnabled:true,separatorOffsetYMm:-210,additionalSeparators:[{offsetYMm:-100},{offsetYMm:100}]};
const product={articleNumber:'0701',previewType:'dibond_sign',dibondSign:sign};
test('Every separator appears in production at the requested height, including old saved signs',async()=>{
 assert.deepEqual(prepareDibond(product).separatorYs,[115,225,425]);
 const {additionalSeparators,...legacy}=sign;assert.deepEqual(prepareDibond({...product,dibondSign:legacy}).separatorYs,[115]);
 const pdf=await makeDibondPdf(product,1,'Multiple strokes');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=pdfjs.getDocument({data:new Uint8Array(pdf),disableFontFace:true,isEvalSupported:false});const doc=await task.promise;const page=await doc.getPage(1),ops=await page.getOperatorList();
 const fills=ops.argsArray.filter((args,i)=>ops.fnArray[i]===pdfjs.OPS.constructPath&&args[0]===pdfjs.OPS.fill);
 for(const y of [117.5,227.5,427.5])assert.ok(fills.some(([,,bounds])=>bounds&&Math.abs(bounds[1]-y)<.001&&Math.abs(bounds[3]-y-1)<.001),'Missing printed separator at '+y);
 assert.match(pdf.toString('latin1'),/CutContour/);await task.destroy();
});
test('Invalid additional separators fail production rather than silently disappearing',()=>{
 for(const extra of [[{offsetYMm:9999}],[{offsetYMm:''}],{},Array(31).fill({offsetYMm:0})])assert.throws(()=>prepareDibond({...product,dibondSign:{...sign,additionalSeparators:extra}}),/streck/i);
});
