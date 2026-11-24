const fs=require('fs/promises'),path=require('path'),crypto=require('crypto');
const {createArticleProductionStore}=require('./articleProduction');
const {createProjectSignFileStore,parseProjectFile}=require('./projectSignFiles');
const {getSignArtwork,signArtworkError}=require('../src/data/signArtwork');
const fail=message=>{throw Object.assign(new Error(message),{validation:true});};
function createSignArtworkStore(options={}){
 const {directory=__dirname,blobFor=async()=>null}=options,vector=createArticleProductionStore(options),files=createProjectSignFileStore(options);
 const key=id=>{if(!/^[a-f0-9-]{36}$/.test(String(id)))fail('Originalet hittades inte.');return 'sign-artworks/'+id+'.json';};
 async function read(id){const name=key(id);try{const blob=await blobFor(name);return JSON.parse((blob?await blob.downloadToBuffer():await fs.readFile(path.join(directory,name))).toString());}catch{fail('Originalet hittades inte. Ladda upp filen igen.');}}
 async function save(input){
  const pdf=/^data:application\/pdf;/i.test(String(input.dataUrl)),original=pdf?await files.save(input,true):await vector.save({...input,cutColor:null});
  // PDF previews are rasterized in the browser; the original PDF stays untouched.
  let preview;
  if(pdf){const parsed=await parseProjectFile({name:'preview.png',dataUrl:input.preview});if(parsed.mime!=='image/png'||parsed.bytes.length>2*1024*1024)fail('Kunde inte skapa förhandsvisningen.');preview='data:image/png;base64,'+parsed.bytes.toString('base64');}
  else{const asset=await vector.read(original.id);preview='data:image/svg+xml;base64,'+Buffer.from(asset.svg).toString('base64');}
  const id=crypto.randomUUID(),meta={id,original,preview},name=key(id),bytes=Buffer.from(JSON.stringify(meta)),blob=await blobFor(name);
  if(blob)await blob.uploadData(bytes,{blobHTTPHeaders:{blobContentType:'application/json'}});else{await fs.mkdir(path.dirname(path.join(directory,name)),{recursive:true});await fs.writeFile(path.join(directory,name),bytes);}
  return {id,name:original.name,mime:original.mime,widthMm:original.widthMm,heightMm:original.heightMm,preview:'/api/sign-artworks/'+id+'/preview'};
 }
 async function original(id){const meta=await read(id);return meta.original.mime==='application/pdf'?files.read(meta.original.id):vector.read(meta.original.id);}
 async function validate(item){const art=getSignArtwork(item);if(!art)return;const sign=item.dibondSign||item.otBoard||item.configuration?.dibondSign||item.configuration?.otBoard,error=signArtworkError(art,sign.widthMm,sign.heightMm,sign.artworkPlacement);if(error)fail(error);const meta=await read(art.id);if(meta.original.mime!==art.mime||Math.abs(meta.original.widthMm-art.widthMm)>.01||Math.abs(meta.original.heightMm-art.heightMm)>.01)fail('Originalfilens mått stämmer inte med skylten.');}
 return {save,read,original,validate};
}
function installSignArtwork(app,{accountSession,...options}){
 const store=createSignArtworkStore(options);
 app.post('/api/sign-artworks',async(req,res)=>{try{if(!await accountSession(req))return res.status(401).json({message:'Logga in för att ladda upp original.'});res.status(201).json({artwork:await store.save(req.body||{})});}catch(error){res.status(error.validation?400:500).json({message:error.validation?error.message:'Kunde inte spara originalet.'});}});
 // Opaque image URLs follow the symbol-image convention; no source files are exposed.
 app.get('/api/sign-artworks/:id/preview',async(req,res)=>{try{const {preview}=await store.read(req.params.id),match=/^data:([^;]+);base64,(.+)$/.exec(preview);res.set({'Content-Type':match[1],'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}).send(Buffer.from(match[2],'base64'));}catch{res.sendStatus(404);}});
 return store;
}
module.exports={createSignArtworkStore,installSignArtwork};
