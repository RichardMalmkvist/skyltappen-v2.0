const {expandHangingStackMarkers}=require('../src/data/hangingStack');
const {projectSigns}=require('./projectSigns');
const {selectProofSigns,proofIdentity,freezeCustomSigns,proofSignLocations,seriesKey,compareVersion}=require('./projectProofSnapshot');
const {makeProjectProofPdf,validateProofArtwork,pdfHash}=require('./projectProofPdf');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const email=value=>String(value||'').trim().toLowerCase();
const clone=value=>JSON.parse(JSON.stringify(value));
const problem=(status,message)=>{throw Object.assign(new Error(message),{status});};
const staff=user=>['admin','personal'].includes(user?.role);
const recipient=(proof,user)=>proof.recipientAccountId?proof.recipientAccountId===user.id:email(proof.recipientEmail)===email(user.email);
const visible=(proof,user)=>staff(user)||(proof.status!=='draft'&&recipient(proof,user));
const publicMeta=proof=>{const {snapshot,...metadata}=proof;return metadata;};


function createProofStore({blobFor,directory}){
 async function read(name,fallback){
  const blob=await blobFor(name);
  if(blob){if(!await blob.exists())return clone(fallback);const response=await blob.download(),chunks=[];for await(const chunk of response.readableStreamBody)chunks.push(chunk);return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  const file=path.join(directory,name);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):clone(fallback);
 }
 async function write(name,value){
  const body=Buffer.from(JSON.stringify(value)),blob=await blobFor(name);
  if(blob)await blob.upload(body,body.length,{overwrite:true,blobHTTPHeaders:{blobContentType:'application/json'}});
  else {const file=path.join(directory,name);fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,body);fs.renameSync(temp,file);}
 }
 return {readState:()=>read('project-proof-workflow.json',{proofs:[],notifications:[]}),writeState:state=>write('project-proof-workflow.json',state),readDocument:id=>read('project-proofs/'+id+'.json',null),writeDocument:(id,doc)=>write('project-proofs/'+id+'.json',doc)};
}

function installProjectProofApprovals(app,{store,accountSession,readUsers,readProjects,readCatalog,getDrawing,buildQuote,assetStorage={},reserveOrderNumber}){
 let queue=Promise.resolve();
 const locked=action=>{const next=queue.then(action,action);queue=next.catch(()=>{});return next;};
 async function userFor(req){const session=await accountSession(req);if(!session)problem(401,'Logga in igen.');const user=(await readUsers()).find(user=>user.id===session.id&&user.status==='approved');if(!user)problem(403,'Åtkomst nekad.');return user;}
 const wrap=handler=>async(req,res)=>{try{await handler(req,res,await userFor(req));}catch(error){res.status(error.status||500).json({message:error.status?error.message:'Kunde inte hantera projektkorrekturet. Försök igen.'});}};
 const isEventRecipient=(event,user)=>event.recipientAccountId?event.recipientAccountId===user.id:email(event.recipientEmail)===email(user.email);
 async function notificationsFor(user){
  const state=await store.readState();return state.notifications.filter(event=>isEventRecipient(event,user)&&!event.dismissedAt&&(!event.readAt||Date.parse(event.readAt)>Date.now()-30*86400000)).map(event=>{const {recipientEmail,recipientAccountId,...safe}=event;return safe;});
 }
 async function markRead(user,id){return locked(async()=>{const state=await store.readState(),event=state.notifications.find(event=>event.id===id&&isEventRecipient(event,user));if(!event)return null;event.readAt=event.readAt||new Date().toISOString();await store.writeState(state);return event;});}
 async function clearRead(user){return locked(async()=>{const state=await store.readState(),ids=[];for(const event of state.notifications)if(isEventRecipient(event,user)&&event.readAt&&!event.dismissedAt){event.dismissedAt=new Date().toISOString();ids.push(event.id);}if(ids.length)await store.writeState(state);return ids;});}
 app.get('/api/project-proofs',wrap(async(req,res,user)=>{const state=await store.readState();res.set('Cache-Control','no-store').json({proofs:state.proofs.filter(proof=>visible(proof,user)&&(proof.status!=='draft'||(user.role==='admin'&&req.query.includeDrafts==='1'))).map(publicMeta)});}));
 app.post('/api/projects/:id/proofs/prepare',wrap(async(req,res,user)=>{
  if(user.role!=='admin')problem(403,'Bara admin kan skicka korrektur.');
  const result=await locked(async()=>{
   const project=(await readProjects()).find(project=>String(project.id)===req.params.id);if(!project)problem(404,'Projektet hittades inte.');
   if(!email(project.purchaserEmail)||!/^\S+@\S+\.\S+$/.test(email(project.purchaserEmail))||!String(project.purchaserName||'').trim())problem(400,'Fyll i beställarens namn och mejladress i projektet först.');
   if(!Object.hasOwn(req.body||{},'expectedUpdatedAt')||(req.body.expectedUpdatedAt||null)!==(project.updatedAt||null))problem(409,'Projektet har ändrats. Uppdatera projektsidan och skapa korrekturet igen.');
   const state=await store.readState();
   if(req.body.requestId){const existing=state.proofs.find(proof=>proof.projectId===project.id&&proof.requestId===req.body.requestId&&proof.authorId===user.id);if(existing)return {proof:publicMeta(existing)};}
   const identity=proofIdentity(state,project,req.body||{}),version=identity.version;
   const base=identity.baseProofId?state.proofs.find(proof=>proof.id===identity.baseProofId):null;
   const selected=selectProofSigns(project,req.body.selectedSignKeys??base?.selectedSignKeys);
   const frozenProject=selected.project,catalog=await readCatalog(),markers=projectSigns(frozenProject);
   const articles=[...new Set(expandHangingStackMarkers(markers,catalog.articles||[]).filter(marker=>marker.kind!=='svg').map(marker=>(catalog.articles||[]).find(article=>String(article.id)===String(marker.articleId)||String(article.articleNumber)===String(marker.articleNumber||marker.articleId))))];
   if(articles.some(article=>!article))problem(400,'Någon skylt saknar en artikel. Kontrollera projektets skyltlista.');
   if(markers.some(marker=>!Number.isSafeInteger(Number(marker.quantity??1))||Number(marker.quantity??1)<1))problem(400,'Någon skylt har ett ogiltigt antal.');
   const customAssets=await freezeCustomSigns(frozenProject,assetStorage,articles),drawings=[];let total=Buffer.byteLength(JSON.stringify(customAssets));
   if(total>60*1024*1024)problem(400,'Underlaget är större än 60 MB. Dela upp projektet.');
   // Originals are copied so a later replacement/deletion cannot change the reviewed plan.
   for(const drawing of frozenProject.drawings||[]){const source=await getDrawing(project.id,drawing.id);if(!source?.bytes)problem(400,`Kunde inte läsa ritningen ${drawing.name}.`);total+=source.bytes.length;if(total>60*1024*1024)problem(400,'Ritningsunderlaget är större än 60 MB. Dela upp projektet.');drawings.push({id:drawing.id,data:source.bytes.toString('base64')});}
   if(req.body.symbolAssets!==undefined&&!Array.isArray(req.body.symbolAssets))problem(400,'Ogiltiga symbolbilder.');
   const assets=req.body.symbolAssets||[];
   if(assets.length>500)problem(400,'För många symbolbilder.');
   for(const asset of assets){
    if(typeof asset.image!=='string'||asset.image.length>7*1024*1024||!/^data:image\/(svg\+xml|png|jpeg|webp)[;,]/i.test(asset.image))problem(400,'Ogiltig symbolbild i korrekturet.');
    const drawing=frozenProject.drawings.find(d=>d.id===asset.drawingId),marker=asset.drawingId==='__standalone__'?frozenProject.signs.find(m=>m.id===asset.markerId):drawing?.markers?.find(m=>m.id===asset.markerId);if(!marker)problem(400,'Symbolen saknar skyltposition.');
    marker.configuration={...(marker.configuration||{})};
    if(asset.kind==='hanging'){
     const saved={id:String(asset.symbolId||''),name:String(asset.name||''),kind:asset.symbolKind==='target'?'target':'symbol',image:asset.image};
     if(!saved.id)problem(400,'Symbolen saknar identitet.');
     marker.configuration.hangingSignSymbolAssets=[...(marker.configuration.hangingSignSymbolAssets||[]).filter(item=>item.id!==saved.id),saved];
    }else marker.configuration.doorSymbolImage=asset.image;
   }
   const quote=await buildQuote(frozenProject,catalog);
   const id=crypto.randomUUID(),now=new Date().toISOString();
   const known=(await readUsers()).find(account=>account.status==='approved'&&email(account.email)===email(project.purchaserEmail));
   if(known&&known.role!=='bestallare')problem(400,'Beställarens mejladress tillhör ett personal- eller adminkonto. Välj en beställare.');
   if(reserveOrderNumber){identity.proofNumber=await reserveOrderNumber(project);identity.orderNumber=identity.proofNumber;frozenProject.reservedOrderNumber=identity.proofNumber;}
   const proof={...identity,selectedSignKeys:selected.keys,requestId:String(req.body.requestId||'').slice(0,150),id,projectId:project.id,projectNumber:project.number,projectName:project.name,version,status:'draft',current:false,createdAt:now,sourceUpdatedAt:project.updatedAt||null,authorId:user.id,recipientEmail:email(project.purchaserEmail),recipientName:project.purchaserName,recipientAccountId:known?.id||null,showPrices:req.body.showPrices!==false};
   await store.writeDocument(id,{project:frozenProject,catalog:{articles:clone(articles),categories:clone(catalog.categories||[])},quote,drawings,assets:customAssets,createdAt:now});
   state.proofs.push(proof);await store.writeState(state);return {proof:publicMeta(proof)};
  });res.status(201).json(result);
 }));
 app.get('/api/project-proofs/:id',wrap(async(req,res,user)=>{
  const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id&&visible(proof,user));if(!proof)problem(404,'Korrekturet hittades inte för ditt konto.');
  const document=await store.readDocument(proof.id);if(!document)problem(404,'Korrekturunderlaget saknas.');
  const {drawings,assets,archivedPdf,...snapshot}=document;res.set('Cache-Control','no-store').json({proof:publicMeta(proof),snapshot});
 }));
 app.get('/api/project-proofs/:id/signs',wrap(async(req,res,user)=>{
  const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id&&visible(proof,user));if(!proof)problem(404,'Korrekturet hittades inte för ditt konto.');
  const document=await store.readDocument(proof.id);if(!document)problem(404,'Korrekturunderlaget saknas.');
  const signs=proofSignLocations(document.project||{});
  res.set('Cache-Control','no-store').json({signs});
 }));
 app.get('/api/project-proofs/:id/drawings/:drawingId/file',wrap(async(req,res,user)=>{
  const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id&&visible(proof,user));if(!proof)problem(404,'Korrekturet hittades inte för ditt konto.');
  const document=await store.readDocument(proof.id),drawing=document?.drawings.find(d=>d.id===req.params.drawingId);if(!drawing)problem(404,'Ritningen hittades inte.');
  res.set({'Content-Type':'application/pdf','Cache-Control':'private, no-store'}).send(Buffer.from(drawing.data,'base64'));
 }));
 app.get('/api/project-proofs/:id/files',wrap(async(req,res,user)=>{
  if(!staff(user))problem(403,'Bara personal kan hämta produktionsunderlag.');
  const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id);if(!proof)problem(404,'Korrekturet hittades inte.');
  const document=await store.readDocument(proof.id);if(!document)problem(404,'Korrekturunderlaget saknas.');
  const signs=proofSignLocations(document.project||{}),files=(document.assets||[]).flatMap(asset=>['production','proof'].filter(kind=>asset[kind]).map(kind=>({signKey:asset.signKey,kind,name:asset[kind].name,mime:asset[kind].mime,position:signs.find(sign=>sign.signKey===asset.signKey)?.position})));
  res.set('Cache-Control','private, no-store').json({files});
 }));
 app.get('/api/project-proofs/:id/files/:signKey/:kind',wrap(async(req,res,user)=>{
  if(!staff(user))problem(403,'Bara personal kan hämta produktionsunderlag.');
  const state=await store.readState();if(!state.proofs.some(proof=>proof.id===req.params.id))problem(404,'Korrekturet hittades inte.');
  if(!['production','proof'].includes(req.params.kind))problem(404,'Filen hittades inte.');
  const document=await store.readDocument(req.params.id),asset=document?.assets?.find(asset=>asset.signKey===req.params.signKey)?.[req.params.kind];if(!asset)problem(404,'Filen hittades inte i denna version.');
  res.set({'Content-Type':asset.mime,'Content-Disposition':"attachment; filename=\"skyltoriginal\"; filename*=UTF-8''"+encodeURIComponent(asset.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}).send(Buffer.from(asset.data,'base64'));
 }));
 app.post('/api/project-proofs/:id/pdf',wrap(async(req,res,user)=>{
  if(user.role!=='admin')problem(403,'Bara admin kan spara korrektur-PDF.');
  const result=await locked(async()=>{
   const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id);if(!proof)problem(404,'Korrekturet hittades inte.');
   const document=await store.readDocument(proof.id);if(!document)problem(404,'Korrekturunderlaget saknas.');
   if(document.archivedPdf){
    if(document.archivedPdf.meta.showPrices!==(req.body.showPrices!==false))problem(409,'PDF-filen är låst. Skapa en ny version för att ändra den.');
    if(!proof.pdf){proof.pdf=document.archivedPdf.meta;await store.writeState(state);}return {proof:publicMeta(proof)};
   }
   if(proof.status!=='draft')problem(409,'Ett skickat korrektur kan inte ändras.');
   if(JSON.stringify(req.body||{}).length>30*1024*1024)problem(413,'Korrekturet är för stort. Dela upp det i flera korrektur.');
   const artwork=validateProofArtwork(req.body.artwork||[],proof.selectedSignKeys||[]);
   const bytes=await makeProjectProofPdf(req.body.pages,proof);
   const meta={sha256:pdfHash(bytes),pageCount:req.body.pages.length,showPrices:req.body.showPrices!==false,savedAt:new Date().toISOString()};
   await store.writeDocument(proof.id,{...document,artwork,archivedPdf:{meta,data:bytes.toString('base64')}});
   proof.pdf=meta;proof.showPrices=meta.showPrices;await store.writeState(state);return {proof:publicMeta(proof)};
  });res.json(result);
 }));
 app.get('/api/project-proofs/:id/pdf',wrap(async(req,res,user)=>{
  const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id&&visible(proof,user));if(!proof)problem(404,'Korrekturet hittades inte för ditt konto.');
  const document=await store.readDocument(proof.id);if(!document?.archivedPdf)problem(404,'Denna version saknar sparad PDF.');
  const filename=`${proof.proofNumber||proof.projectNumber}_v${proof.version}.pdf`.replace(/[^a-zA-Z0-9._-]/g,'_');
  res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(Buffer.from(document.archivedPdf.data,'base64'));
 }));
 app.post('/api/project-proofs/:id/send',wrap(async(req,res,user)=>{
  if(user.role!=='admin')problem(403,'Bara admin kan skicka korrektur.');
  const proof=await locked(async()=>{
   const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id);if(!proof)problem(404,'Korrekturet hittades inte.');
   if(proof.status!=='draft')return publicMeta(proof);
   const project=(await readProjects()).find(project=>project.id===proof.projectId);if(!project)problem(404,'Projektet har tagits bort.');
   if((project.updatedAt||null)!==proof.sourceUpdatedAt||email(project.purchaserEmail)!==proof.recipientEmail)problem(409,'Projektet eller beställaren har ändrats. Skapa ett nytt korrektur.');
   if(state.proofs.some(other=>other.id!==proof.id&&other.projectId===proof.projectId&&other.status!=='draft'&&other.version===proof.version&&seriesKey(other)===seriesKey(proof)))problem(409,'Versionen har redan skickats. Skapa ett nytt korrektur.');
   const current=state.proofs.find(other=>other.projectId===proof.projectId&&other.current&&seriesKey(other)===seriesKey(proof));
   if(current&&compareVersion(proof.version,current.version)<=0)problem(409,'Ett senare korrektur har redan skickats. Skapa en ny version.');
   if(proof.archiveRequired&&!proof.pdf)problem(409,'Spara korrekturets PDF innan du skickar det.');
   if(proof.pdf&&proof.pdf.showPrices!==(req.body.showPrices!==false))problem(409,'Prisvisningen är låst till den sparade PDF-filen. Skapa en ny version för att ändra den.');
   const now=new Date().toISOString();
   for(const previous of state.proofs)if(previous.projectId===proof.projectId&&previous.current&&seriesKey(previous)===seriesKey(proof)){previous.current=false;if(previous.status==='pending')previous.status='superseded';for(const event of state.notifications)if(event.proofId===previous.id&&event.status==='proof_requested')event.dismissedAt=now;}
   Object.assign(proof,{status:'pending',current:true,sentAt:now,authorId:user.id,showPrices:req.body.showPrices!==false});
   state.notifications.push({id:'proof-event-'+crypto.randomUUID(),kind:'project-proof',status:'proof_requested',projectId:proof.projectId,projectNumber:proof.projectNumber,projectName:proof.projectName,proofId:proof.id,proofNumber:proof.proofNumber,version:proof.version,recipientEmail:proof.recipientEmail,recipientAccountId:proof.recipientAccountId,createdAt:now});
   await store.writeState(state);return publicMeta(proof);
  });res.json({proof});
 }));
 app.post('/api/project-proofs/:id/approve',wrap(async(req,res,user)=>{
  if(user.role!=='bestallare')problem(403,'Bara den tilldelade beställaren kan godkänna korrekturet.');
  const proof=await locked(async()=>{
   const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id&&recipient(proof,user)&&proof.status!=='draft');if(!proof)problem(404,'Korrekturet hittades inte för ditt konto.');
   if(req.body?.confirmed!==true||req.body.version!==proof.version)problem(400,'Bekräfta rätt korrekturversion innan du godkänner.');
   if(!proof.current)problem(409,'Korrekturet har ersatts av en ny version. Öppna det senaste korrekturet.');
   if(!(await readProjects()).some(project=>project.id===proof.projectId))problem(409,'Projektet har tagits bort. Kontakta avsändaren.');
   if(proof.status==='approved')return publicMeta(proof);
   if(proof.status!=='pending')problem(409,'Korrekturet kan inte godkännas nu.');
   const now=new Date().toISOString(),name=[user.firstName,user.lastName].filter(Boolean).join(' ')||user.email;
   Object.assign(proof,{status:'approved',approvedAt:now,approvedBy:{id:user.id,name,email:user.email},recipientAccountId:user.id});
   state.notifications.push({id:'proof-event-'+crypto.randomUUID(),kind:'project-proof',status:'proof_approved',projectId:proof.projectId,projectNumber:proof.projectNumber,projectName:proof.projectName,proofId:proof.id,proofNumber:proof.proofNumber,version:proof.version,recipientAccountId:proof.authorId,createdAt:now,approvedBy:name});
   for(const event of state.notifications)if(event.proofId===proof.id&&event.status==='proof_requested')event.readAt=event.readAt||now;
   await store.writeState(state);return publicMeta(proof);
  });res.json({proof});
 }));
 function feedback(kind){return wrap(async(req,res,user)=>{
  if(user.role!=='bestallare')problem(403,'Bara den tilldelade beställaren kan lämna återkoppling.');
  const result=await locked(async()=>{
   const state=await store.readState(),proof=state.proofs.find(proof=>proof.id===req.params.id&&recipient(proof,user)&&proof.status!=='draft');
   if(!proof)problem(404,'Korrekturet hittades inte för ditt konto.');
   if(req.body?.version!==proof.version)problem(400,'Kontrollera korrekturversionen.');
   if(!proof.current)problem(409,'Korrekturet har ersatts av en ny version. Öppna det senaste korrekturet.');
   if(!(await readProjects()).some(project=>project.id===proof.projectId))problem(409,'Projektet har tagits bort. Kontakta avsändaren.');
   const requestId=String(req.body.requestId||'').slice(0,100);
   if(requestId&&(proof.comments||[]).some(comment=>comment.requestId===requestId&&comment.author.id===user.id))return publicMeta(proof);
   if(!['pending','changes_requested'].includes(proof.status))problem(409,'Korrekturet är redan avslutat.');
   if(kind==='changes_requested'&&proof.status==='changes_requested')return publicMeta(proof);
   const changeType=req.body.changeType||'comment';
   if(!['comment','adjust','move'].includes(changeType))problem(400,'Välj om skylten ska justeras, flyttas eller kommenteras.');
   if(changeType!=='comment'&&!req.body.sign)problem(400,'Välj vilken skylt som ska ändras.');
   const effectiveKind=kind==='changes_requested'||(changeType!=='comment'&&proof.status==='pending')?'changes_requested':'comment';
   const message=typeof req.body.comment==='string'?req.body.comment.trim():'';
   if(!message||message.length>3000)problem(400,'Skriv en kommentar med 1–3000 tecken.');
   let sign=null;
   if(req.body.sign){
    if(typeof req.body.sign.drawingId!=='string'||typeof req.body.sign.markerId!=='string'||!req.body.sign.drawingId||!req.body.sign.markerId)problem(400,'Skyltens sparade position saknas. Kontakta avsändaren.');
    const document=await store.readDocument(proof.id);
    sign=proofSignLocations(document?.project||{}).find(location=>location.drawingId===req.body.sign.drawingId&&location.markerId===req.body.sign.markerId);
    if(!sign)problem(400,'Skylten finns inte i den sparade korrekturversionen.');
   }
   if((proof.comments||[]).length>=200)problem(400,'Det finns för många kommentarer på versionen. Kontakta avsändaren.');
   const now=new Date().toISOString(),name=[user.firstName,user.lastName].filter(Boolean).join(' ')||user.email;
   const author={id:user.id,name,email:user.email};
   proof.comments=[...(proof.comments||[]),{id:crypto.randomUUID(),requestId,kind:effectiveKind,changeType,message,createdAt:now,author,sign}];
   if(effectiveKind==='changes_requested'){
    Object.assign(proof,{status:'changes_requested',changesRequestedAt:now,changesRequestedBy:author});
    for(const event of state.notifications)if(event.proofId===proof.id&&event.status==='proof_requested')event.readAt=event.readAt||now;
   }
   state.notifications.push({id:'proof-event-'+crypto.randomUUID(),kind:'project-proof',status:effectiveKind==='changes_requested'?'proof_changes_requested':'proof_commented',projectId:proof.projectId,projectNumber:proof.projectNumber,projectName:proof.projectName,proofId:proof.id,proofNumber:proof.proofNumber,version:proof.version,recipientAccountId:proof.authorId,createdAt:now,comment:message,commentedBy:name,sign,changeType});
   await store.writeState(state);return publicMeta(proof);
  });res.json({proof:result});
 });}
 app.post('/api/project-proofs/:id/comments',feedback('comment'));
 app.post('/api/project-proofs/:id/request-changes',feedback('changes_requested'));
 return {notificationsFor,markRead,clearRead};
}
module.exports={createProofStore,installProjectProofApprovals};
