const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path'),express=require('express');
const {builtinDibondSymbols,withBuiltinDibondSymbols}=require('./dibondBuiltinSymbols');
const {readDibondSymbolAsset}=require('./dibondSymbolAssets');
const {installDibondSymbols}=require('./dibondSymbols');
const {makeDibondPdf}=require('./dibondProduction');

test('Both logos use the same opaque vector originals as badge production',async()=>{
 const symbols=builtinDibondSymbols();assert.equal(symbols.length,2);
 for(const symbol of symbols){
  const asset=await readDibondSymbolAsset(symbol.image.split('/').pop(),{directory:'nonexistent-folder',blobFor:async()=>{throw Error('Builtin logo must not depend on uploaded assets');}});
  assert.equal(asset.kind,'svg');assert.ok(asset.aspectRatio>3&&asset.aspectRatio<6);
  assert.match(asset.svg,/<path/);assert.match(asset.svg,/<linearGradient/);
  assert.doesNotMatch(asset.svg,/<(?:image|text)\b|mix-blend-mode|opacity|href=/i);
 }
 const saved=withBuiltinDibondSymbols([{...symbols[0],active:false},{id:'custom',name:'Egen symbol'}]);
 assert.equal(saved.find(value=>value.id===symbols[0].id).active,false);assert.ok(saved.some(value=>value.id==='custom'));
});

test('The authenticated symbol library includes both logos, preserves custom symbols and remembers deactivation',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-logo-test-'));
 const original=[{id:'custom',name:'Egen symbol',image:'/api/dibond-symbols/images/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',aspectRatio:1,active:true}];
 await fs.writeFile(path.join(directory,'dibond-symbols.json'),JSON.stringify(original));
 const app=express();app.use(express.json());installDibondSymbols(app,{accountSession:async req=>req.headers['x-test-role'],staffAccess:async req=>req.headers['x-test-role']==='admin',blobFor:async()=>null,directory});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/api/dibond-symbols')).status,401);
  const list=await (await fetch(base+'/api/dibond-symbols',{headers:{'x-test-role':'buyer'}})).json();assert.equal(list.symbols.length,3);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'dibond-symbols.json'),'utf8')),original);
  for(const symbol of list.symbols.filter(value=>value.builtin)){
   const response=await fetch(base+symbol.image);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/svg/);assert.match(await response.text(),/<path/);
  }
  const symbols=list.symbols.map(value=>({...value,active:value.builtin?false:value.active}));
  const save=await fetch(base+'/api/dibond-symbols',{method:'PUT',headers:{'Content-Type':'application/json','x-test-role':'admin'},body:JSON.stringify({symbols})});assert.equal(save.status,200);
  const next=await (await fetch(base+'/api/dibond-symbols',{headers:{'x-test-role':'buyer'}})).json();assert.ok(next.symbols.filter(value=>value.builtin).every(value=>value.active===false));
  const tampered=symbols.map(value=>value.builtin?{...value,image:'data:image/svg+xml;base64,AAAA'}:value);
  assert.equal((await fetch(base+'/api/dibond-symbols',{method:'PUT',headers:{'Content-Type':'application/json','x-test-role':'admin'},body:JSON.stringify({symbols:tampered})})).status,400);
  assert.equal((await fetch(base+symbols.find(value=>value.builtin).image)).status,200,'Old orders retain printable logos after deactivation');
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
});

test('Dibond and aluminium PDF exports keep both logos as opaque vectors with CutContour',async()=>{
 const symbols=builtinDibondSymbols().map((symbol,index)=>({...symbol,sizeMm:20,xMm:20,yMm:40+index*60}));
 for(const articleNumber of ['0705','1230']){
  const product={articleNumber,productType:'dibondskylt',previewType:'dibond_sign',dibondSign:{widthMm:300,heightMm:200,frameEnabled:false,lines:[{text:'',sizeMm:10}],symbols}};
  const pdf=(await makeDibondPdf(product,1,'Logotest')).toString('latin1');
  assert.match(pdf,/CutContour/);assert.match(pdf,/\/ShadingType 2/);
  assert.doesNotMatch(pdf,/\/BM\b|\/SMask\b|\/Subtype \/Image\b|\/Type \/Font\b/);
 }
});
