const {createSignArtworkStore}=require('./signArtwork');
const {getSignArtwork}=require('../src/data/signArtwork');
const {projectSigns}=require('./projectSigns');
const {createArticleProductionStore}=require('./articleProduction');
const {createProjectSignFileStore}=require('./projectSignFiles');
const crypto=require('crypto');
const clone=value=>JSON.parse(JSON.stringify(value));
const problem=message=>{throw Object.assign(new Error(message),{status:400});};
const seriesKey=proof=>proof.seriesId||'legacy:'+proof.projectId;
const versionParts=value=>String(value).split('.').map(Number);
function compareVersion(a,b){const left=versionParts(a),right=versionParts(b);return left[0]-right[0]||(left[1]||0)-(right[1]||0);}
function nextVersion(value){const parts=String(value).split('.');return parts.length===1?`${Number(parts[0])}.2`:`${Number(parts[0])}.${Number(parts[1])+1}`;}
function selectProofSigns(project,keys){
 const all=projectSigns(project),selected=keys===undefined?all.map(sign=>sign.key):keys;
 if(!Array.isArray(selected)||!selected.length||selected.length>1000||selected.some(key=>typeof key!=='string')||new Set(selected).size!==selected.length)problem('Markera minst en skylt, högst 1000, utan dubbletter.');
 const found=new Set(all.map(sign=>sign.key));if(selected.some(key=>!found.has(key)))problem('Någon vald skylt har tagits bort. Uppdatera skyltlistan.');
 const chosen=new Set(selected),frozen=clone(project);
 frozen.signs=(frozen.signs||[]).filter(sign=>chosen.has(sign.id));
 frozen.drawings=(frozen.drawings||[]).map(drawing=>({...drawing,markers:(drawing.markers||[]).filter(sign=>chosen.has(`drawing:${drawing.id}:${sign.id}`))})).filter(drawing=>drawing.markers.length);
 return {project:frozen,keys:selected};
}
function proofIdentity(state,project,body){
 const base=body.baseProofId?state.proofs.find(proof=>proof.id===body.baseProofId&&proof.projectId===project.id):null;
 if(body.baseProofId&&!base)problem('Korrekturet som ska få en ny version hittades inte.');
 const fresh=body.newProof===true;if(fresh&&base)problem('Välj nytt korrektur eller ny version, inte båda.');
 let seriesId=fresh?crypto.randomUUID():base?seriesKey(base):null;
 const published=state.proofs.filter(proof=>proof.projectId===project.id&&proof.status!=='draft'&&(!seriesId||seriesKey(proof)===seriesId));
 const latest=published.sort((a,b)=>compareVersion(b.version,a.version))[0];
 if(!seriesId)seriesId=latest?seriesKey(latest):crypto.randomUUID();
 const related=state.proofs.filter(proof=>seriesKey(proof)===seriesId);
 const highest=related.sort((a,b)=>compareVersion(b.version,a.version))[0];
 const version=String(body.version||(fresh?'1.1':highest?nextVersion(highest.version):'1.1')).trim();
 if(!/^\d{1,4}(?:\.\d{1,4})?$/.test(version))problem('Ange version som exempelvis 1.1 eller 1.2.');
 if(related.some(proof=>proof.status!=='draft'&&proof.version===version)||(latest&&compareVersion(version,latest.version)<=0))throw Object.assign(new Error('Välj en version som är senare än det senast skickade korrekturet.'),{status:409});
 let proofNumber=base?.proofNumber||related.find(proof=>proof.proofNumber)?.proofNumber;
 if(!proofNumber){const year=new Date().getFullYear(),prefix=`KOR-${year}-`;const number=Math.max(0,...state.proofs.map(proof=>String(proof.proofNumber||'').startsWith(prefix)?Number(proof.proofNumber.slice(prefix.length))||0:0))+1;proofNumber=prefix+String(number).padStart(4,'0');}
 return {seriesId,proofNumber,version,baseProofId:base?.id||null,archiveRequired:true};
}
async function freezeCustomSigns(project,storage,articles=[]){
 const production=createArticleProductionStore(storage),files=createProjectSignFileStore(storage),assets=[];let total=0;const reserve=bytes=>{total+=bytes;if(total>60*1024*1024)problem('Originalen är större än 60 MB. Välj färre skyltar.');};
 for(const entry of projectSigns(project)){
  const sign=entry.drawingId?(project.drawings||[]).find(d=>d.id===entry.drawingId)?.markers?.find(s=>s.id===entry.id):(project.signs||[]).find(s=>s.id===entry.id);if(!sign)problem('Skylten hittades inte i korrekturet.');
  const uploaded=getSignArtwork(sign.configuration);
  if(uploaded){const store=createSignArtworkStore(storage);await store.validate(sign.configuration);const asset=await store.original(uploaded.id),bytes=asset.bytes||Buffer.from(asset.svg);reserve(bytes.length);assets.push({signKey:entry.key,production:{...uploaded,data:bytes.toString('base64')}});continue;}
  if(sign.kind!=='svg'){const file=articles.find(article=>String(article.id)===String(sign.articleId))?.productionFile;if(file){const asset=await production.read(file.id);reserve(Buffer.byteLength(asset.svg));assets.push({signKey:entry.key,production:{...file,data:Buffer.from(asset.svg).toString('base64')}});}continue;}
  let original,proof;
  try{
   if(sign.productionFile?.mime==='application/pdf')original=await files.read(sign.productionFile.id);
   else{const asset=await production.read(sign.productionFile?.id);original={...asset,bytes:Buffer.from(asset.svg)};}
   proof=sign.proofFile?await files.read(sign.proofFile.id):original.mime==='image/svg+xml'?original:null;
  }catch{problem(`Originalet till ${sign.position} kunde inte läsas. Ladda upp filen igen.`);}
  if(!proof)problem(`Ladda upp en korrekturbild för ${sign.position} innan du skapar korrekturet.`);
  reserve(original.bytes.length+proof.bytes.length);
  sign.proofImage=`data:${proof.mime};base64,${proof.bytes.toString('base64')}`;
  assets.push({signKey:entry.key,production:{...sign.productionFile,data:original.bytes.toString('base64')},proof:{...(sign.proofFile||sign.productionFile),data:proof.bytes.toString('base64')}});
 }
 return assets;
}
function proofSignLocations(project){return projectSigns(project).map(sign=>({signKey:sign.key,drawingId:sign.drawingId||'__standalone__',markerId:sign.id,position:sign.position||'Utan position',drawingName:sign.drawingName||'Utan ritning',text:String(sign.text||sign.name||sign.configuration?.customText||sign.configuration?.doorHeading||'').slice(0,300)}));}
module.exports={selectProofSigns,proofIdentity,freezeCustomSigns,proofSignLocations,seriesKey,compareVersion,nextVersion};
