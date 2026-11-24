const {createArticleProductionStore}=require('./articleProduction');
const {createProjectSignFileStore}=require('./projectSignFiles');
function createProjectOrderAssetReader(options={}){
 const vectors=createArticleProductionStore(options),files=createProjectSignFileStore(options);
 return async function read(item,purpose='proof'){
  const proof=purpose==='proof';const meta=proof?(item.proofFile||(item.productionFile?.mime!=='application/pdf'?item.productionFile:null)):item.productionFile;
  if(!meta?.id)throw Object.assign(new Error(proof?'Skylten saknar separat korrekturbild.':'Produktionsfilen saknas.'),{status:404});
  if(meta.storage==='project')return files.read(meta.id);
  const asset=await vectors.read(meta.id);return {...asset,bytes:Buffer.from(asset.svg)};
 };
}
async function validateProjectOrderAssets(cart,read){
 for(const item of cart.filter(item=>item.projectOriginal)){
  try{await read(item,'production');if(item.proofFile)await read(item,'proof');}
  catch{throw Object.assign(new Error('Originalfilen eller korrekturbilden för '+(item.position||item.badgeName)+' kunde inte läsas. Kontrollera filerna i projektet.'),{status:400});}
 }
}
function installProjectOrderFiles(app,{readOrders,staffAccess,...storage}){
 const read=createProjectOrderAssetReader(storage);
 app.get('/api/orders/:id/project-original/:index/:purpose',async(req,res)=>{
  try{
   if(!await staffAccess(req))return res.status(403).json({message:'Åtkomst nekad.'});
   const order=(await readOrders()).find(order=>String(order.id)===String(req.params.id));if(!order)return res.status(404).json({message:'Ordern hittades inte.'});
   const index=Number(req.params.index),purpose=req.params.purpose;if(!Number.isInteger(index)||index<0||!['proof','production'].includes(purpose))return res.status(400).json({message:'Ogiltig artikelrad eller filtyp.'});
   const item=order.cart?.[index];if(!item?.projectOriginal)return res.status(404).json({message:'Artikelraden saknar eget original.'});
   const asset=await read(item,purpose);
   res.set({'Content-Type':asset.mime,'Content-Disposition':`attachment; filename="skyltoriginal"; filename*=UTF-8''${encodeURIComponent(asset.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}).send(asset.bytes);
  }catch(error){res.status(error.status||404).json({message:error.status?error.message:'Originalfilen kunde inte hämtas.'});}
 });
 return read;
}
module.exports={createProjectOrderAssetReader,validateProjectOrderAssets,installProjectOrderFiles};
