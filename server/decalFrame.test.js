const {test}=require('node:test'),assert=require('node:assert/strict');
const {customDecalArticles}=require('../src/data/customDecalArticles');
const {prepareDibond,isDibond}=require('./dibondProduction');
const sign={widthMm:210,heightMm:148.5,lines:[{text:'Text',sizeMm:15}],cornerRadiusMm:10,cornerRadiusAuto:true,cornerRadiusBaseWidthMm:210,cornerRadiusBaseHeightMm:148.5};
test('Decal production supports both frame states, custom dimensions and rounded cut contours',()=>{
 const product=customDecalArticles()[0];assert.equal(isDibond(product),true);
 for(const frameEnabled of [true,false]){const prepared=prepareDibond({...product,dibondSign:{...sign,frameEnabled}});assert.equal(prepared.frameEnabled,frameEnabled);assert.equal(prepared.radius,10);assert.equal(prepared.width,210);assert.equal(prepared.height,148.5);}
 assert.throws(()=>prepareDibond({...product,dibondSign:{...sign,widthMm:3001}}));assert.throws(()=>prepareDibond({...product,dibondSign:{...sign,frameEnabled:'false'}}));
});
test('Existing signs retain their black frame; changing size scales a custom radius up and down',()=>{
 const product={previewType:'dibond_sign'};assert.equal(prepareDibond({...product,dibondSign:sign}).frameEnabled,true);
 assert.equal(prepareDibond({...product,dibondSign:{...sign,widthMm:420,heightMm:297}}).radius,20);
 assert.equal(prepareDibond({...product,dibondSign:{...sign,widthMm:105,heightMm:74.25}}).radius,5);
});

test('Production accepts text 6 mm from the edge while retaining the 4 mm frame',()=>{
 const product={previewType:'dibond_sign',dibondSign:{widthMm:100,heightMm:50,lines:[{text:'X',sizeMm:8,firstLineBottomMm:14}],symbols:[]}};
 const prepared=prepareDibond(product);assert.equal(prepared.layout.fits,true);assert.equal(prepared.frameEnabled,true);
 assert.throws(()=>prepareDibond({...product,dibondSign:{...product.dibondSign,lines:[{...product.dibondSign.lines[0],firstLineBottomMm:12}]}}));
});

test('Custom decal dimensions and spec numbers follow project orders and production labels',()=>{
 const {buildProjectOrderItems}=require('./projectOrderGrouping'),{productionLabel}=require('./productionLabel');
 const product=customDecalArticles()[0],changed={...sign,widthMm:200,heightMm:100};
 const [item]=buildProjectOrderItems([{id:'s',articleId:product.id,quantity:2,configuration:{dibondSign:changed}}],[product]);
 assert.equal(item.articleNumber,'0730 spec');assert.equal(item.articleId,product.id);assert.equal(item.format,'200 \u00d7 100 mm');assert.deepEqual(item.dibondSign,changed);
 assert.match(productionLabel({orderNumber:'0026001-00'},1,item),/Art\. 0730 spec$/);
 assert.match(productionLabel({orderNumber:'0026001-00'},1,{...item,articleNumber:'0730'}),/Art\. 0730 spec$/);
 assert.equal(prepareDibond(item).width,200);assert.equal(prepareDibond(item).height,100);
});
