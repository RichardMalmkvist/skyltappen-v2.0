const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepareDibond}=require('./dibondProduction');
const product={previewType:'dibond_sign',dibondConfig:{maxWidthMm:600,maxHeightMm:400,defaultWidthMm:600,defaultHeightMm:400}};
const sign={widthMm:600,heightMm:400,cornerRadiusMm:25,cornerRadiusAuto:true,lines:[{text:'Test',sizeMm:15}],symbols:[]};
test('Production uses the same automatic and manual outer radius as the preview',()=>{
 assert.equal(prepareDibond({...product,dibondSign:sign}).radius,25);
 assert.equal(prepareDibond({...product,dibondSign:{...sign,widthMm:300,heightMm:200}}).radius,12.5);
 assert.equal(prepareDibond({...product,dibondSign:{...sign,cornerRadiusAuto:false,cornerRadiusMm:8}}).radius,8);
 assert.equal(prepareDibond({...product,dibondSign:{...sign,cornerRadiusAuto:false,cornerRadiusMm:0}}).radius,0);
 assert.equal(prepareDibond({...product,articleNumber:'1230',dibondSign:sign}).radius,0);
});
test('Production rejects invalid manual radii and preserves old order outlines',()=>{
 for(const value of [-1,201,'',NaN])assert.throws(()=>prepareDibond({...product,dibondSign:{...sign,cornerRadiusAuto:false,cornerRadiusMm:value}}));
 const {cornerRadiusAuto,cornerRadiusMm,...legacy}=sign;assert.equal(prepareDibond({...product,dibondSign:legacy}).radius,14);
});

test('Article default is used when no radius is saved, while saved automatic radii remain stable',()=>{
 const changed={...product,dibondConfig:{...product.dibondConfig,defaultCornerRadiusMm:10}};
 const {cornerRadiusMm,...automatic}=sign;
 assert.equal(prepareDibond({...changed,dibondSign:automatic}).radius,10);
 assert.equal(prepareDibond({...changed,dibondSign:{...automatic,widthMm:300,heightMm:200}}).radius,5);
 assert.equal(prepareDibond({...changed,dibondSign:sign}).radius,25);
 assert.equal(prepareDibond({...changed,dibondSign:{...automatic,cornerRadiusMm:0}}).radius,0);
});
