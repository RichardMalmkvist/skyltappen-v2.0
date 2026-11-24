const test=require('node:test'),assert=require('node:assert/strict');
const {faceLayout,exportOrder}=require('./hangingSignPlotter');
const {hangingTargetLayout}=require('../src/data/hangingTargetLayout');
const {largeHangingArrow}=require('../src/data/largeHangingArrow');
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100V100H0Z"/></svg>');
const symbols=Array.from({length:9},(_,i)=>({id:'target-'+i,name:'Målpunkt '+i,kind:'target',image}));

test('1500 mm production uses the supplied arrow geometry at 110 mm', async () => {
 const product={hangingSignSizeMm:1500,hangingSignHeightMm:140};
 const form={customText:'Reception',leftArrowDirection:'left',rightArrowDirection:'up'};
 const layout=faceLayout(product,form,new Map());
 assert.deepEqual(largeHangingArrow('left').viewBox,[0,0,110,80]);
 assert.deepEqual(largeHangingArrow('up').viewBox,[0,0,80,110]);
 assert.ok(layout.body.includes('translate(30 30) scale(1 1)'));
 assert.ok(layout.body.includes(largeHangingArrow('left').body));
 assert.ok(layout.body.includes(largeHangingArrow('up').body));
 const small=faceLayout({hangingSignSizeMm:1000,hangingSignHeightMm:93},form,new Map());
 assert.ok(!small.body.includes(largeHangingArrow('left').body));
 const result=await exportOrder({id:'large',cart:[{...product,...form,productType:'pendlad_skylt',quantity:1}]});
 assert.equal(result.type,'application/pdf');
});

for (const [width,singleHeight,doubleHeight,symbolHeight] of [[1000,93,186,70],[1500,140,260,117]]) {
 test(`${width} mm double-line signs use the same top offset as single-line signs`, () => {
  const single={hangingSignSizeMm:width,hangingSignHeightMm:singleHeight,hangingSignTextMode:'single'};
  const double={...single,hangingSignHeightMm:doubleHeight,hangingSignTextMode:'double'};
  const assets=[{id:'ordinary'},...symbols.slice(0,2)];
  const first=hangingTargetLayout(single,{},assets);
  const second=hangingTargetLayout(double,{},assets);
  assert.deepEqual(second.items.map(item=>item.y),first.items.map(item=>item.y));
  const twoRows=hangingTargetLayout(double,{hangingTargetRows:2,hangingTargetRowAssignments:{'target-1':2}},assets);
  assert.deepEqual(twoRows.items.map(item=>item.y),[11.5,11.5,11.5+symbolHeight+5]);
 });
}
for(const sides of [1,2])test('Nine targets export on a '+sides+'-sided 1000 mm hanging sign',async()=>{
 const form={hangingSignWithoutText:true,hangingTargetPosition:'left',hangingSignSymbols:symbols.map(s=>s.id),hangingSignSymbolAssets:symbols,arrowPlacement:'right',arrowDirection:'up'};
 const product={id:'test',articleNumber:sides===1?'0303':'0304',productType:'pendlad_skylt',previewType:'hanging_sign',hangingSignSides:sides,hangingSignSizeMm:1000,hangingSignHeightMm:93,hangingSignTextMode:'single',quantity:1,...form};
 const layout=faceLayout(product,form,new Map(symbols.map(s=>[s.id,s])));assert.equal(layout.width,1000);assert.equal((layout.body.match(/M0 0H100V100H0Z/g)||[]).length,9);
 const result=await exportOrder({id:'test',orderNumber:'TEST',cart:[product]});assert.equal(result.type,sides===1?'application/pdf':'application/zip');assert.ok(result.data.length>500);
 const overflowing={...form,hangingSignSymbols:Array.from({length:13},(_,i)=>'target-'+i)};const assets=new Map(Array.from({length:13},(_,i)=>['target-'+i,{...symbols[0],id:'target-'+i}]));assert.throws(()=>faceLayout(product,overflowing,assets),/bredd|överlappar/);
});

for(const width of [1000,1500])for(const sides of [1,2])test('Production enforces the row limit for '+width+' mm / '+sides+' faces',async()=>{const limit=width===1000?10:9,assets=Array.from({length:limit+1},(_,i)=>({...symbols[0],id:'target-'+i}));const form={hangingSignWithoutText:true,hangingTargetPosition:'left',hangingSignSymbols:assets.slice(0,limit).map(s=>s.id),hangingSignSymbolAssets:assets};const product={id:'limit',articleNumber:'0303',productType:'pendlad_skylt',previewType:'hanging_sign',hangingSignSides:sides,hangingSignSizeMm:width,hangingSignHeightMm:140,hangingSignTextMode:'single',quantity:1,...form};const result=await exportOrder({id:'limit',cart:[product]});assert.ok(result.data.length>500);await assert.rejects(()=>exportOrder({id:'limit',cart:[{...product,hangingSignSymbols:assets.map(s=>s.id)}]}),new RegExp('högst '+limit+' målpunkter'));});
