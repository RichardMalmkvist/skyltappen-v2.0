const test=require('node:test'),assert=require('node:assert/strict');
const {faceLayout,exportOrder}=require('./hangingSignPlotter');
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100V100H0Z"/></svg>');
const symbols=Array.from({length:9},(_,i)=>({id:'target-'+i,name:'Målpunkt '+i,kind:'target',image}));
for(const sides of [1,2])test('Nine targets export on a '+sides+'-sided 1000 mm hanging sign',async()=>{
 const form={hangingSignWithoutText:true,hangingTargetPosition:'left',hangingSignSymbols:symbols.map(s=>s.id),hangingSignSymbolAssets:symbols,arrowPlacement:'right',arrowDirection:'up'};
 const product={id:'test',articleNumber:sides===1?'0303':'0304',productType:'pendlad_skylt',previewType:'hanging_sign',hangingSignSides:sides,hangingSignSizeMm:1000,hangingSignHeightMm:93,hangingSignTextMode:'single',quantity:1,...form};
 const layout=faceLayout(product,form,new Map(symbols.map(s=>[s.id,s])));assert.equal(layout.width,1000);assert.equal((layout.body.match(/M0 0H100V100H0Z/g)||[]).length,9);
 const result=await exportOrder({id:'test',orderNumber:'TEST',cart:[product]});assert.equal(result.type,sides===1?'application/pdf':'application/zip');assert.ok(result.data.length>500);
 const overflowing={...form,hangingSignSymbols:Array.from({length:13},(_,i)=>'target-'+i)};const assets=new Map(Array.from({length:13},(_,i)=>['target-'+i,{...symbols[0],id:'target-'+i}]));assert.throws(()=>faceLayout(product,overflowing,assets),/bredd|överlappar/);
});

for(const width of [1000,1500])for(const sides of [1,2])test('Production enforces the row limit for '+width+' mm / '+sides+' faces',async()=>{const limit=width===1000?10:9,assets=Array.from({length:limit+1},(_,i)=>({...symbols[0],id:'target-'+i}));const form={hangingSignWithoutText:true,hangingTargetPosition:'left',hangingSignSymbols:assets.slice(0,limit).map(s=>s.id),hangingSignSymbolAssets:assets};const product={id:'limit',articleNumber:'0303',productType:'pendlad_skylt',previewType:'hanging_sign',hangingSignSides:sides,hangingSignSizeMm:width,hangingSignHeightMm:140,hangingSignTextMode:'single',quantity:1,...form};const result=await exportOrder({id:'limit',cart:[product]});assert.ok(result.data.length>500);await assert.rejects(()=>exportOrder({id:'limit',cart:[{...product,hangingSignSymbols:assets.map(s=>s.id)}]}),new RegExp('högst '+limit+' målpunkter'));});
