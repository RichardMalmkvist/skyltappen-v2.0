const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {logoLayers}=require('./svgLogoPdf');
const {createProductionPDF}=require('./badgeProductionPdf');
const {validSettings}=require('./badgeProduction');
const source=fs.readFileSync(path.join(__dirname,'../src/assets/logos/ftv.svg'),'utf8');
test('Folktandvarden retains all four multiply shading overlays in the original vector paint order',()=>{
 const layers=logoLayers(source);assert.equal(layers.filter(layer=>layer.multiply).length,3);
 const paints=layers.map(layer=>(layer.svg.split('</defs>')[1].match(/<(?:path|polygon)\b/g)||[]).length);
 const original=(source.split('</defs>')[1].match(/<(?:path|polygon)\b/g)||[]).length;
 assert.equal(paints.reduce((n,count)=>n+count,0),original);
 assert.ok(layers.every(layer=>layer.svg.includes('linearGradient id="id0"')));
 assert.match(layers[0].svg,/<path class="fil0"/);
 assert.match(layers[1].svg,/<path class="fil1"/);assert.match(layers[1].svg,/<path class="fil2"/);
 assert.doesNotMatch(layers[0].svg,/<path class="fil1"/);
});
test('production PDF uses opaque vector gradients and retains CutContour for every FTV model',async()=>{
 for(const articleNumber of ['0208','0209','0210']){
  const item={articleNumber,nameBadgePreset:'ftv_'+articleNumber,name:'Test Person',title:'Tandskoterska',orgLine1:'Folktandvarden',quantity:1};
  const bytes=await createProductionPDF([{orderNumber:'0026127-00',cart:[item]}],'badges',validSettings());
  const pdf=bytes.toString('latin1');assert.doesNotMatch(pdf,/\/BM|JSFLogoMultiply|\/SMask/);assert.match(pdf,/\/ShadingType 2/);assert.match(pdf,/CutContour/);assert.doesNotMatch(pdf,/\/Subtype \/Image/);
 }
});
test('region badges use opaque outlined logos and CutContour without raster images or blend modes',async()=>{
 const region=fs.readFileSync(path.join(__dirname,'../src/assets/logos/region.svg'),'utf8');assert.doesNotMatch(region,/<(?:image|text)\b/);assert.match(region,/<path/);
 for(const articleNumber of ['0201','0202','0205','0207']){
  const bytes=await createProductionPDF([{cart:[{articleNumber,nameBadgePreset:'rjl_'+articleNumber,name:'Test',title:'Titel',orgLine1:'Regionen',quantity:1}]}],'badges',validSettings());
  const pdf=bytes.toString('latin1');assert.doesNotMatch(pdf,/\/BM|JSFLogoMultiply|\/SMask/);assert.match(pdf,/CutContour/);assert.doesNotMatch(pdf,/\/Subtype \/Image/);
 }
});

test('print assets contain only opaque gradients and outlined lettering',()=>{
 for(const file of ['ftv-print.svg','region-print.svg']){
  const svg=fs.readFileSync(path.join(__dirname,'../src/assets/logos',file),'utf8');
  assert.doesNotMatch(svg,/mix-blend-mode|opacity|<(?:image|text)\b/);assert.match(svg,/<linearGradient/);assert.match(svg,/<path/);
 }
});
