const crypto=require('crypto');
const {isBadgeOrder,BADGE_STATUSES,DEFAULT_BADGE_SETTINGS,addressForOrder,badgeKind}=require('../src/data/badgeProduction');
const {createProductionPDF}=require('./badgeProductionPdf');
function validSettings(value={}){
 const out={};const bounds={sheetWidthMm:[110,2000],marginMm:[1,30],gapMm:[1,30],labelWidthMm:[60,150],labelHeightMm:[30,100],maxSheetHeightMm:[150,2000]};
 for(const [key,[min,max]] of Object.entries(bounds)){const n=Number(value[key] ?? DEFAULT_BADGE_SETTINGS[key]);if(!Number.isFinite(n)||n<min||n>max)throw new Error('Ogiltigt mått: '+key);out[key]=n;}
 if(out.maxSheetHeightMm<Math.max(30,out.labelHeightMm)+2*out.marginMm)throw new Error('Arkhöjden är för liten för de valda måtten.');
 if(out.sheetWidthMm<out.labelWidthMm+2*out.marginMm)throw new Error('Arkbredden är för liten för adresslapparna.');return out;
}
function zipFiles(files){
 let offset=0;const locals=[],central=[];const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 for(const [name,data] of files){const n=Buffer.from(name);let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);c=(c^0xffffffff)>>>0;
 const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(c,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(n.length,26);locals.push(h,n,data);
 const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt32LE(c,16);ch.writeUInt32LE(data.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(n.length,28);ch.writeUInt32LE(offset,42);central.push(ch,n);offset+=h.length+n.length+data.length;
 }const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,cd,end]);
}
function attachBadgeProduction(app,{readOrders,writeOrders,readCatalog,readSettings,writeSettings,staffAccess,adminAccess,addOrderStatusNotification}){
 let pending=Promise.resolve();
 // Serialise production writes, including export history and batch changes.
 const exclusive=fn=>{const next=pending.then(fn,fn);pending=next.catch(()=>{});return next;};
 const route=(fn,write=false)=>async(req,res)=>{try{if(!await staffAccess(req))return res.status(401).json({message:'Obehörig'});if(write)await exclusive(()=>fn(req,res));else await fn(req,res);}catch(e){console.error('Brickproduktion:',e.message);if(!res.headersSent)res.status(400).json({message:e.message || 'Åtgärden kunde inte slutföras.'});}};
 const select=(orders,ids)=>{if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length)throw new Error('Välj 1–100 olika ordrar.');const result=ids.map(id=>orders.find(o=>o.id===id));if(result.some(o=>!o || !isBadgeOrder(o)))throw new Error('En vald order finns inte i brickkön. Uppdatera listan.');return result;};
 app.get('/api/badge-production/settings',route(async(req,res)=>{res.json({settings:validSettings(await readSettings())});}));
 app.put('/api/badge-production/settings',route(async(req,res)=>{if(!await adminAccess(req))return res.status(403).json({message:'Endast admin kan spara produktionsinställningar.'});const settings=validSettings(req.body);await writeSettings(settings);res.json({settings});},true));
 app.patch('/api/badge-production/status',route(async(req,res)=>{
  const {orderIds,status}=req.body || {};if(!Object.hasOwn(BADGE_STATUSES,status))throw new Error('Ogiltig status.');const orders=await readOrders();const selected=select(orders,orderIds);const now=new Date().toISOString();
  for(const order of selected){const previous={...order};order.status=status;order.updatedAt=now;order.deliveredAt=status==='levererad'?now:null;addOrderStatusNotification(previous,order);}
  await writeOrders(orders);res.json({orders:selected});
 },true));
 app.patch('/api/badge-production/:id/address',route(async(req,res)=>{
  const orders=await readOrders(),[order]=select(orders,[req.params.id]);const address={};for(const key of Object.keys(addressForOrder())){address[key]=String(req.body?.[key] || '').trim();if(address[key].length>300)throw new Error('Adressfältet är för långt.');}order.delivery={...order.delivery,...address};order.updatedAt=new Date().toISOString();await writeOrders(orders);res.json({order});
 },true));
 app.post('/api/badge-production/export',route(async(req,res)=>{
  const {orderIds,kind,labelCounts={}}=req.body || {};if(!['badges','labels','both'].includes(kind))throw new Error('Välj namnbrickor, adresslappar eller båda.');
  const orders=await readOrders(),selected=select(orders,orderIds),catalog=await readCatalog(),settings=validSettings(await readSettings());
  const date=new Date().toISOString().slice(0,10);const suffix=selected.length===1?String(selected[0].orderNumber || selected[0].submissionNumber || selected[0].id).replace(/[^a-zA-Z0-9_-]/g,'')+'-'+date:date;const files=[];
  // Resolve missing legacy preset by catalog identity; never replace saved order text.
  const resolved=selected.map(o=>({...o,cart:o.cart.map(i=>{const product=catalog.articles?.find(p=>String(p.id)===String(i.articleId || i.badgeId) || (i.articleNumber && p.articleNumber===i.articleNumber));return {...product,...i,nameBadgePreset:i.nameBadgePreset || product?.nameBadgePreset};})}));
  if(kind!=='labels')files.push(['namnbrickor-'+suffix+'.pdf',await createProductionPDF(resolved,'badges',settings)]);
  if(kind!=='badges')files.push(['adresslappar-'+suffix+'.pdf',await createProductionPDF(resolved,'labels',settings,labelCounts)]);
  const fileName=kind==='both'?'produktion-'+suffix+'.zip':files[0][0],data=kind==='both'?zipFiles(files):files[0][1];
  const event={id:crypto.randomUUID(),createdAt:new Date().toISOString(),kind,fileName,settings,orderIds:[...orderIds]};
  const latest=await readOrders(),exported=select(latest,orderIds);
  for(const order of exported){const snapshot=selected.find(o=>o.id===order.id);if(JSON.stringify(order.cart)!==JSON.stringify(snapshot.cart)||(kind!=='badges'&&JSON.stringify(addressForOrder(order))!==JSON.stringify(addressForOrder(snapshot))))throw new Error('Ordern ändrades under exporten. Försök igen.');}
  for(const order of exported){order.productionExports=[...(order.productionExports || []),{...event,labelCount:kind==='badges'?0:(labelCounts[order.id] ?? 1),items:kind==='labels'?[]:order.cart.filter(i=>badgeKind(i)==='name').map(i=>({id:i.id,articleNumber:i.articleNumber,quantity:i.quantity,name:i.name,title:i.title,titleLine2:i.titleLine2,orgLine1:i.orgLine1,orgLine2:i.orgLine2,nameBadgePreset:i.nameBadgePreset}))}];}
  await writeOrders(latest);
  res.set({'Content-Type':kind==='both'?'application/zip':'application/pdf','Content-Disposition':'attachment; filename="'+fileName+'"','Cache-Control':'no-store'});res.send(data);
 },true));
}
module.exports={attachBadgeProduction,validSettings,zipFiles};
