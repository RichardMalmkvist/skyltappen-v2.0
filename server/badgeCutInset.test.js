const test=require('node:test'),assert=require('node:assert/strict');
const {createProductionPDF}=require('./badgeProductionPdf');
const {validSettings}=require('./badgeProduction');
const path=require('path');
const standardFontDataUrl=path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts')+'/';
const toMm=value=>value*25.4/72;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.00001,`${actual} != ${expected}`);
async function paths(bytes){
 const {getDocument,OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const loading=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,disableFontFace:true,standardFontDataUrl});
 try{const doc=await loading.promise,page=await doc.getPage(1),list=await page.getOperatorList();
  const paths=list.argsArray.filter((_,i)=>list.fnArray[i]===OPS.constructPath);
  const strokes=paths.filter(([paint])=>paint===OPS.stroke);
  const fills=paths.filter(([paint])=>paint===OPS.fill);
  return {strokes,fills,pageCount:doc.numPages};
 }finally{await loading.destroy();}
}
test('all 13 name badge models retain full print dimensions but cut 0.2 mm inside every edge',async()=>{
 for(const articleNumber of ['0201','0202','0205','0207','0208','0209','0210','0211','0250','0251','0252','0253','0310']){
  const ftv=['0208','0209','0210'].includes(articleNumber),height=ftv?26:30;
  const prefix=ftv?'ftv_':articleNumber==='0310'?'jlt_':articleNumber==='0211'?'energy_':articleNumber.startsWith('025')?'school_':'rjl_';
  const bytes=await createProductionPDF([{orderNumber:'TEST',cart:[{articleNumber,nameBadgePreset:prefix+articleNumber,name:'Test',title:'Titel',quantity:1}]}],'badges',validSettings());
  const {strokes,fills}=await paths(bytes),cut=strokes.at(-1);assert.ok(cut,articleNumber);
  const [left,top,right,bottom]=cut[2].map(toMm);near(left,.2);near(right,74.8);near(top,.2);near(bottom,height-.2);
  // An inward parallel offset reduces the corner radius by the same amount.
  near(toMm(cut[1][0][1]),2.9);near(toMm(cut[1][0][2]),.2);
  assert.ok(fills.some(([,,bounds])=>bounds?.[0]===0&&bounds[1]===0&&Math.abs(toMm(bounds[2])-75)<.00001&&Math.abs(toMm(bounds[3])-height)<.00001),'Full-size print background missing: '+articleNumber);
  assert.match(bytes.toString('latin1'),/CutContour/);
 }
});
test('each copy gets its own inset contour while address label cutting remains at the label edges',async()=>{
 const settings=validSettings(),badge={cart:[{articleNumber:'0201',nameBadgePreset:'rjl_0201',name:'Test',title:'Titel',quantity:2}]};
 const result=await paths(await createProductionPDF([badge],'badges',settings));assert.equal(result.strokes.length,2);for(const cut of result.strokes)near(toMm(cut[2][0]),.2);
 const order={delivery:{recipient:'Test',company:'Region',address:'Testgatan 1',postalCode:'551 11',city:'Jonkoping'}};
 const labels=await paths(await createProductionPDF([order],'labels',settings));assert.equal(labels.strokes.length,1);const [left,top,right,bottom]=labels.strokes[0][2].map(toMm);near(left,0);near(top,0);near(right,settings.labelWidthMm);near(bottom,settings.labelHeightMm);
});
