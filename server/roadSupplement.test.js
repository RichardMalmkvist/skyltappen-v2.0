const test=require('node:test'),assert=require('node:assert/strict');
const {withRoadSupplement,installRoadSupplement,roadSupplementSurface}=require('../src/data/roadSupplement');
const {measureTratex,tratexCurves}=require('../src/data/tratexVit');
const {makeDibondPdf,prepareDibond}=require('./dibondProduction');
const {installYellowRoadSupplement}=require('../src/data/roadSupplement');
test('separate colour and size articles install once, preserving the original price and existing proof sizes',()=>{
 const {installRoadSupplementSizes}=require('../src/data/roadSupplement');
 const source=installYellowRoadSupplement(installRoadSupplement({articles:[{id:'article-1794949481677',unitPrice:228,storefrontOrderable:false}]})),next=installRoadSupplementSizes(source);
 assert.equal(next.articles.length,6);assert.strictEqual(installRoadSupplementSizes(next),next);
 for(const variant of ['blue','yellow'])for(const height of [200,300,350]){
  const article=next.articles.find(a=>a.roadSupplementVariant===variant&&a.roadSignHeightMm===height);
  assert.ok(article);assert.equal(article.dibondConfig.defaultWidthMm,400);assert.equal(article.dibondConfig.defaultHeightMm,height);assert.match(article.name,new RegExp('400 × '+height));assert.equal(article.storefrontOrderable,false);
  if(height!==200){assert.equal(article.unitPrice,0);assert.equal(article.dibondConfig.fixedDimensions,true);}
 }
 const original=next.articles.find(a=>a.id==='article-1794949481677');assert.equal(original.unitPrice,228);
 const oldSign={roadSupplement:true,widthMm:400,heightMm:300,frameEnabled:false,cornerRadiusMm:0,lines:[{text:'Äldre korrektur',sizeMm:20}]};
 assert.equal(prepareDibond({...original,dibondSign:oldSign}).height,300);
 const custom=withRoadSupplement({...original,roadSignHeightMm:800});assert.equal(custom.dibondConfig.defaultHeightMm,800);assert.equal(custom.dibondConfig.fixedDimensions,true);
});
test('custom tall supplement keeps 15 mm border, exact print size and the E19 support model',async()=>{
 const {roadSignModel}=require('../src/data/roadSignModels'),{roadSupplementError}=require('../src/data/roadSupplement'),THREE=await import('three'),{resizeRoadSignGeometry}=require('../src/data/roadSignGeometry');
 const article=withRoadSupplement({roadSupplementVariant:'yellow',roadSupplementCustomSize:true,roadSignWidthMm:500,roadSignHeightMm:800}),spec=roadSignModel(article);
 assert.equal(spec.file,'road-sign-400x400.glb');
 const geometry=new THREE.BoxGeometry(.4,.4,.025);resizeRoadSignGeometry(geometry,spec);const size=geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-.5)<.000001);assert.ok(Math.abs(size.y-.8)<.000001);assert.ok(Math.abs(size.z-.025)<.000001);geometry.dispose();
 const sign={roadSupplement:true,roadSupplementVariant:'yellow',roadSupplementCustomSize:true,widthMm:500,heightMm:800,frameEnabled:false,cornerRadiusMm:0,lines:[{text:'Egen text',sizeMm:35}]};
 assert.equal(roadSupplementError(sign),null);const prepared=prepareDibond({...article,dibondSign:sign});assert.equal(prepared.width,500);assert.equal(prepared.height,800);
 assert.match(roadSupplementSurface(500,800,sign),/width="485" height="785"/);assert.match(roadSupplementSurface(500,800,sign),/stroke-width="15"/);
 const pdf=await makeDibondPdf({...article,dibondSign:sign},1,'Egen gul skylt');assert.match(pdf.toString('latin1'),/CutContour/);
});
test('supplement migration preserves price, proof-only access and unrelated articles',()=>{
 const source={articles:[{id:'article-1794949481677',unitPrice:123,storefrontOrderable:false,defaultSignArtwork:{id:'old'}},{id:'other'}]},next=installRoadSupplement(source);
 assert.equal(next.articles[0].unitPrice,123);assert.equal(next.articles[0].storefrontOrderable,false);assert.equal(next.articles[0].defaultSignArtwork,undefined);assert.strictEqual(next.articles[1],source.articles[1]);assert.strictEqual(installRoadSupplement(next),next);
});
test('yellow supplement preserves the Corel colours, uses actual Tratex svart curves and installs only once',async()=>{
 const {tratexCurves:svartCurves}=require('../src/data/tratexSvart'),catalog=installYellowRoadSupplement({articles:[]}),article=catalog.articles[0];
 assert.equal(article.roadSupplementVariant,'yellow');assert.equal(article.storefrontOrderable,false);assert.strictEqual(installYellowRoadSupplement(catalog),catalog);
 for(const heightMm of [200,300,350]){
  const sign={roadSupplement:true,roadSupplementVariant:'yellow',widthMm:400,heightMm,frameEnabled:false,cornerRadiusMm:0,lines:[{text:'Besökande',sizeMm:35}]},product={...article,dibondSign:sign},prepared=prepareDibond(product),line=prepared.layout.lines[0];
  assert.equal(prepared.text,svartCurves('Besökande',35,line.x,line.y));assert.notEqual(prepared.text,tratexCurves('Besökande',35,line.x,line.y));
  const svg=roadSupplementSurface(400,heightMm,sign);assert.match(svg,/#FFD100/);assert.match(svg,/#CE252B/);assert.match(svg,/stroke-width="15"/);assert.match(svg,new RegExp('height="'+(heightMm-15)+'"'));
  const bytes=await makeDibondPdf(product,1,'Gul Tratex svart');assert.match(bytes.toString('latin1'),/CutContour/);
 }
});
test('Tratex vit is exported as white curves with blue field and fixed-width keyline at all three heights',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 for(const heightMm of [200,300,350]){
  const sign={roadSupplement:true,widthMm:400,heightMm,frameEnabled:false,cornerRadiusMm:0,lines:[{text:'Besökande\n4 tim',sizeMm:35,lineSpacingMode:'uniform',lineGapMm:10}]},product={...withRoadSupplement({}),dibondSign:sign};
  const prepared=prepareDibond(product);assert.equal(prepared.height,heightMm);assert.equal(prepared.text,tratexCurves('Besökande',35,prepared.layout.lines[0].x,prepared.layout.lines[0].y)+tratexCurves('4 tim',35,prepared.layout.lines[1].x,prepared.layout.lines[1].y));
  assert.match(roadSupplementSurface(400,heightMm),new RegExp('height="'+(heightMm-15)+'"'));assert.match(roadSupplementSurface(400,heightMm),/x="7.5" y="7.5"/);assert.match(roadSupplementSurface(400,heightMm),/stroke-width="15"/);
  const bytes=await makeDibondPdf(product,2,'Tratex vit'),task=pdfjs.getDocument({data:new Uint8Array(bytes),disableFontFace:true,isEvalSupported:false}),doc=await task.promise;
  assert.equal(doc.numPages,2);const page=await doc.getPage(1);assert.ok(Math.abs(page.view[3]-(heightMm+6)*72/25.4)<.01);const ops=await page.getOperatorList();assert.ok(ops.fnArray.length>20);assert.match(bytes.toString('latin1'),/CutContour/);await task.destroy();
 }
 assert.equal(measureTratex('H',35).ascent,35);
 assert.throws(()=>prepareDibond({...withRoadSupplement({}),dibondSign:{roadSupplement:true,widthMm:400,heightMm:250,lines:[{text:'Test',sizeMm:35}]}}),/200, 300 eller 350/);
});
