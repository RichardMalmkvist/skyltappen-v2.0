const crypto=require('crypto');
const {projectSigns}=require('./projectSigns');
const {buildProjectOrderItems,groupProjectOrderItems}=require('./projectOrderGrouping');
const {snapshotProductionFiles,hasProductionFile}=require('./articleProduction');
const clone=value=>JSON.parse(JSON.stringify(value));
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
function buildProjectOrderCart(project,catalog={}){
 const signs=projectSigns(project);if(!signs.length)invalid('Lägg till minst en skylt i projektet först.');
 const items=signs.flatMap(sign=>{
  if(sign.kind!=='svg'){
   const rows=buildProjectOrderItems([sign],catalog.articles||[]);
   if(!rows.length||rows.some(row=>!row))invalid('Skylt '+sign.position+' saknar en giltig artikel eller ett giltigt pris.');
   return snapshotProductionFiles(rows.map(row=>({...row,position:row.position||sign.position||'',drawingName:sign.drawingName||''})),catalog);
  }
  const quantity=Number(sign.quantity??1),price=Number(sign.price??0),width=Number(sign.widthMm),height=Number(sign.heightMm);
  if(!hasProductionFile(sign))invalid('Produktionsfil saknas för '+sign.position+'.');
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>10000||!Number.isFinite(price)||price<0||![width,height].every(value=>Number.isFinite(value)&&value>=1&&value<=5000))invalid('Kontrollera antal, pris och mått för '+sign.position+'.');
  const productionFile={...sign.productionFile,storage:sign.productionFile.mime==='application/pdf'?'project':'article'};
  const proofFile=sign.proofFile?{...sign.proofFile,storage:'project'}:null;
  return [{id:crypto.randomUUID(),articleNumber:'Special',badgeName:sign.name||'Specialskylt',desc:sign.description||'',productType:'special_sign',productTypeLabel:'Specialskylt',previewType:'project_original',projectOriginal:true,
   widthMm:width,heightMm:height,format:width+' × '+height+' mm',quantity,unitPrice:price,lineTotal:Math.round(quantity*price*100)/100,currency:'SEK',salesUnit:'st',material:sign.material||'',notes:sign.notes||'',
   productionFile,proofFile,projectMarkerId:sign.id,position:sign.position||'',drawingName:sign.drawingName||'',configuration:{}}];
 });
 return clone(groupProjectOrderItems(items));
}
module.exports={buildProjectOrderCart};
