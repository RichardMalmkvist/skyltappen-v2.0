const {withBuiltinDibondSymbols,builtinDibondSymbols}=require('./dibondBuiltinSymbols');
const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const {decodeSvgDataUrl}=require('./svgSymbol');
const {readDibondSymbolAsset}=require('./dibondSymbolAssets');
function installDibondSymbols(app,{accountSession,staffAccess,blobFor,directory}){
 const metaPath=path.join(directory,'dibond-symbols.json');
 async function readStored(){const blob=await blobFor('dibond-symbols-v1.json');if(blob){try{return JSON.parse(await blob.downloadToBuffer());}catch(e){if(e.statusCode!==404)throw e;return [];}}try{return JSON.parse(await fs.readFile(metaPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return [];}}
 async function read(){return withBuiltinDibondSymbols(await readStored());}
 async function write(items){const content=JSON.stringify(items),blob=await blobFor('dibond-symbols-v1.json');if(blob)await blob.upload(content,Buffer.byteLength(content),{blobHTTPHeaders:{blobContentType:'application/json'}});else{await fs.mkdir(directory,{recursive:true});const temp=metaPath+'.tmp';await fs.writeFile(temp,content);await fs.rename(temp,metaPath);}}
 const assetPath=(id,ext)=>path.join(directory,'dibond-symbol-assets',id+'.'+ext);
 let queue=Promise.resolve();
 app.get('/api/dibond-symbols',async(req,res)=>{try{if(!await accountSession(req))return res.status(401).json({message:'Logga in för att hämta symbolerna.'});res.set('Cache-Control','private, no-store').json({symbols:await read()});}catch{res.status(500).json({message:'Kunde inte hämta symbolerna.'});}});
 app.put('/api/dibond-symbols',async(req,res)=>{
  if(!await staffAccess(req))return res.status(403).json({message:'Du har inte behörighet att ändra symbolerna.'});
  const task=queue.then(async()=>{
   const input=req.body?.symbols;if(!Array.isArray(input)||input.length>200)throw Object.assign(new Error('Använd högst 200 symboler.'),{validation:true});
   const previous=await read(),ids=new Set(),assets=[];
   const items=input.map(symbol=>{
    const id=String(symbol.id||''),name=String(symbol.name||'').trim().slice(0,120);let ratio=Number(symbol.aspectRatio||1);
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||ids.has(id)||!name||!Number.isFinite(ratio)||ratio<.05||ratio>20)throw Object.assign(new Error('Ange ett namn och en giltig symbolbild.'),{validation:true});ids.add(id);
    let image=String(symbol.image||'');
    const builtin=builtinDibondSymbols().find(value=>value.id===id);
    if(builtin&&image!==builtin.image)throw Object.assign(new Error('Standardlogotypens original kan inte ersättas. Ladda upp en ny symbol i stället.'),{validation:true});
    if(image.startsWith('data:')){
     if(/^data:image\/svg\+xml/i.test(image)){
      const vector=decodeSvgDataUrl(image),assetId=crypto.randomUUID();ratio=vector.aspectRatio;
      assets.push({id:assetId,bytes:Buffer.from(vector.svg),ext:'svg',mime:'image/svg+xml'});image='/api/dibond-symbols/images/'+assetId;
     }else{
     const match=/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(image),bytes=match?Buffer.from(match[1],'base64'):null;
     if(!bytes||bytes.length>300*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Object.assign(new Error('Symbolbilden behöver vara PNG och högst 300 kB.'),{validation:true});
     const assetId=crypto.randomUUID();assets.push({id:assetId,bytes,ext:'png',mime:'image/png'});image='/api/dibond-symbols/images/'+assetId;
     }
    }else if(!previous.some(old=>old.id===id&&old.image===image))throw Object.assign(new Error('Symbolbilden hittades inte. Ladda upp bilden igen.'),{validation:true});
    return {id,name,image,aspectRatio:builtin?.aspectRatio??ratio,active:symbol.active!==false,...(builtin?{builtin:true}:{})};
   });
   for(const asset of assets){const blob=await blobFor('dibond-symbol-assets/'+asset.id+'.'+asset.ext);if(blob)await blob.uploadData(asset.bytes,{blobHTTPHeaders:{blobContentType:asset.mime}});else{await fs.mkdir(path.dirname(assetPath(asset.id,asset.ext)),{recursive:true});await fs.writeFile(assetPath(asset.id,asset.ext),asset.bytes);}}
   await write(items);return withBuiltinDibondSymbols(items);
  });queue=task.catch(()=>{});
  try{res.json({symbols:await task});}catch(e){res.status(e.validation?400:500).json({message:e.validation?e.message:'Kunde inte spara symbolerna.'});}
 });
 // SVG and PNG assets remain available to already saved signs after a symbol
 // is renamed, replaced, disabled or removed from the selectable library.
 app.get('/api/dibond-symbols/images/:id',async(req,res)=>{
  const id=req.params.id;if(!/^[a-f0-9-]{36}$/.test(id))return res.sendStatus(404);
  try{const asset=await readDibondSymbolAsset(id,{blobFor,directory});res.set({'Content-Type':asset.mime,'X-Content-Type-Options':'nosniff','Cache-Control':asset.kind==='svg'?'public, max-age=3600':'public, max-age=31536000, immutable','Content-Security-Policy':"default-src 'none'; style-src 'none'; sandbox"}).send(asset.data);}catch(e){res.sendStatus(e.code==='ENOENT'||e.statusCode===404?404:500);}
 });
}
module.exports={installDibondSymbols};
