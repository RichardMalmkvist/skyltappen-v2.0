const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs/promises'),os=require('os'),path=require('path'),express=require('express'),zlib=require('zlib');
const {createProofStore,installProjectProofApprovals}=require('./projectProofApprovals');
const {createArticleProductionStore}=require('./articleProduction');
const {createProjectSignFileStore}=require('./projectSignFiles');
const {selectProofSigns,proofIdentity}=require('./projectProofSnapshot');
function png(w=297,h=210){
 const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const type=Buffer.from(name),result=Buffer.alloc(12+data.length);result.writeUInt32BE(data.length);type.copy(result,4);data.copy(result,8);result.writeUInt32BE(crc(Buffer.concat([type,data])),8+data.length);return result;};
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;
 const pixels=Buffer.alloc((w*3+1)*h,255);for(let row=0;row<h;row++)pixels[row*(w*3+1)]=0;
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
const page=png(),picture=png(20,20),clone=value=>JSON.parse(JSON.stringify(value));
async function fixture(run,{numbering=false}={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-proof-versions-')),storage={directory,blobFor:async()=>null};
 const production=createArticleProductionStore(storage),files=createProjectSignFileStore(storage),source='<svg xmlns="http://www.w3.org/2000/svg" width="280mm" height="69mm" viewBox="0 0 280 69"><path d="M0 0H280V69H0Z" fill="#ddcc00"/></svg>';
 const file=await production.save({name:'print.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(source).toString('base64')}),proofFile=await files.save({name:'proof.png',dataUrl:picture});
 let project={id:'p',number:'PRJ-1',name:'Akuten',customer:'Region',purchaserName:'Anna',purchaserEmail:'anna@example.test',updatedAt:'r1',drawings:[{id:'d',name:'Plan 1',markers:[{id:'m',articleId:'a',position:'S001',text:'Reception',quantity:2,page:1,x:.2,y:.3},{id:'other',articleId:'a',position:'S002',text:'Other',quantity:1,page:1,x:.5,y:.3}]}],signs:[{id:'s',kind:'svg',name:'Special',position:'S003',widthMm:280,heightMm:69,quantity:3,price:250,productionFile:file,proofFile},{id:'c',kind:'catalog',position:'S004',articleId:'a',text:'Entré',quantity:1,unplaced:true}]};
 let catalog={articles:[{id:'a',articleNumber:'0601',name:'Dörrskylt',price:100}],categories:[]};
 const users=[{id:'admin',role:'admin',status:'approved',email:'admin@example.test'},{id:'buyer',role:'bestallare',status:'approved',email:'anna@example.test'},{id:'other',role:'bestallare',status:'approved',email:'other@example.test'},{id:'staff',role:'personal',status:'approved'}];
 const store=createProofStore(storage),app=express();app.use(express.json({limit:'35mb'}));
 const numbers=require('./orderNumbers').createOrderNumbers({...storage,readOrders:async()=>[{orderNumber:'0026119-00'}],now:()=>new Date(2026,10,6)});
 installProjectProofApprovals(app,{...(numbering?{reserveOrderNumber:project=>numbers.reserve(`project:${project.id}`)}:{}),store,assetStorage:storage,accountSession:async req=>users.find(user=>user.id===req.headers.user),readUsers:async()=>clone(users),readProjects:async()=>project?[clone(project)]:[],readCatalog:async()=>clone(catalog),getDrawing:async()=>({bytes:Buffer.from('%PDF-frozen-plan')}),buildQuote:async selected=>({cart:clone(selected.signs),orderTotal:123})});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 async function api(method,route,body,user='admin'){const response=await fetch(base+route,{method,headers:{user,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:response.headers.get('Content-Type')?.includes('application/pdf')?Buffer.from(await response.arrayBuffer()):response.headers.get('Content-Type')?.includes('image/svg')?await response.text():response.headers.get('Content-Type')?.includes('image/')?Buffer.from(await response.arrayBuffer()):await response.json()};}
 const prepare=(extra={})=>api('POST','/api/projects/p/proofs/prepare',{expectedUpdatedAt:project.updatedAt,newProof:true,selectedSignKeys:['drawing:d:m','s','c'],...extra});
 const archive=async proof=>api('POST',`/api/project-proofs/${proof.id}/pdf`,{showPrices:true,pages:[page],artwork:proof.selectedSignKeys.map(signKey=>({signKey,signKeys:[signKey],image:picture}))});
 try{await run({api,prepare,archive,store,project,catalog,production,files,storage,numbers,setProject:value=>project=value});}finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'jsf-proof-versions-')));await fs.rm(directory,{recursive:true,force:true});}
}
test('selection freezes only chosen standard/custom signs, original bytes and quote without migrating live data',()=>fixture(async({prepare,api,store,project,catalog})=>{
 const before=clone(project),result=await prepare();assert.equal(result.status,201);const proof=result.data.proof;assert.match(proof.proofNumber,/^KOR-\d{4}-0001$/);assert.equal(proof.version,'1.1');
 const saved=await store.readDocument(proof.id);assert.equal(saved.project.drawings[0].markers.length,1);assert.equal(saved.project.signs.length,2);assert.equal(saved.assets.length,1);assert.equal(saved.assets[0].production.name,'print.svg');assert.match(saved.project.signs[0].proofImage,/^data:image\/png/);assert.equal(saved.quote.orderTotal,123);assert.deepEqual(project,before);
 project.signs[0].name='Changed';project.signs[0].productionFile={id:'deleted'};project.drawings[0].markers[0].text='Changed';catalog.articles[0].price=999;
 const read=await api('GET',`/api/project-proofs/${proof.id}`);assert.equal(read.data.snapshot.project.signs[0].name,'Special');assert.equal(read.data.snapshot.catalog.articles[0].price,100);assert.equal(read.data.snapshot.assets,undefined);
 const files=(await api('GET',`/api/project-proofs/${proof.id}/files`,null,'staff')).data.files;assert.equal(files.length,2);assert.equal(files[0].kind,'production');assert.match((await api('GET',`/api/project-proofs/${proof.id}/files/s/production`,null,'staff')).data,/#ddcc00/);assert.equal((await api('GET',`/api/project-proofs/${proof.id}/files`,null,'buyer')).status,403);
 assert.match(Buffer.from((await store.readDocument(proof.id)).assets[0].production.data,'base64').toString(),/#ddcc00/);
}));
test('separate proofs get unique numbers; draft reopen and request idempotency do not consume new numbers',()=>fixture(async({prepare,api})=>{
 const first=await prepare({requestId:'one'}),again=await prepare({requestId:'one'});assert.equal(first.data.proof.id,again.data.proof.id);
 const second=await prepare();assert.notEqual(second.data.proof.proofNumber,first.data.proof.proofNumber);
 assert.equal((await api('GET','/api/project-proofs')).data.proofs.length,0);
 assert.equal((await api('GET','/api/project-proofs?includeDrafts=1')).data.proofs.length,2);
 assert.equal((await api('GET','/api/project-proofs?includeDrafts=1',null,'buyer')).data.proofs.length,0);
 assert.equal((await api('GET',`/api/project-proofs/${first.data.proof.id}`,null,'buyer')).status,404);
}));
test('PDF must be archived before send; bytes and prices are immutable and download access follows proof recipient',()=>fixture(async({prepare,api,archive,project,setProject})=>{
 const proof=(await prepare()).data.proof;
 assert.equal((await api('POST',`/api/project-proofs/${proof.id}/send`,{})).status,409);
 assert.equal((await archive(proof)).status,200);const first=await api('GET',`/api/project-proofs/${proof.id}/pdf`);assert.equal(first.status,200);assert.equal(first.data.subarray(0,5).toString(),'%PDF-');
 assert.equal((await api('POST',`/api/project-proofs/${proof.id}/pdf`,{showPrices:false,pages:[page],artwork:[]})).status,409);
 assert.equal((await api('POST',`/api/project-proofs/${proof.id}/send`,{showPrices:false})).status,409);
 assert.equal((await api('POST',`/api/project-proofs/${proof.id}/send`,{showPrices:true})).status,200);
 project.updatedAt='r2';project.signs=[];setProject(null);
 assert.deepEqual((await api('GET',`/api/project-proofs/${proof.id}/pdf`,null,'buyer')).data,first.data);
 assert.equal((await api('GET',`/api/project-proofs/${proof.id}/pdf`,null,'other')).status,404);
 assert.equal((await api('POST',`/api/project-proofs/${proof.id}/pdf`,{showPrices:true,pages:[]})).status,200);
 assert.deepEqual((await api('GET',`/api/project-proofs/${proof.id}/pdf`)).data,first.data);
}));
test('new version replaces its own series only, keeps approved history, and validates exact approval version',()=>fixture(async({prepare,api,archive,store,project})=>{
 const a=(await prepare()).data.proof,b=(await prepare()).data.proof;
 for(const proof of [a,b]){await archive(proof);assert.equal((await api('POST',`/api/project-proofs/${proof.id}/send`,{showPrices:true})).status,200);}
 const approve=proof=>api('POST',`/api/project-proofs/${proof.id}/approve`,{version:proof.version,confirmed:true},'buyer');
 assert.equal((await approve(a)).status,200);
 project.updatedAt='r2';project.signs[0].quantity=9;
 const next=(await prepare({newProof:false,baseProofId:a.id,version:'2'})).data.proof;assert.equal(next.proofNumber,a.proofNumber);assert.deepEqual(next.selectedSignKeys,a.selectedSignKeys);
 await archive(next);await api('POST',`/api/project-proofs/${next.id}/send`,{showPrices:true});
 const state=await store.readState();assert.equal(state.proofs.find(proof=>proof.id===a.id).status,'approved');assert.equal(state.proofs.find(proof=>proof.id===a.id).current,false);assert.equal(state.proofs.find(proof=>proof.id===b.id).current,true);
 assert.equal((await approve(a)).status,409);assert.equal((await approve(b)).status,200);
 assert.equal((await api('POST',`/api/project-proofs/${next.id}/approve`,{version:'1',confirmed:true},'buyer')).status,400);
 assert.equal((await approve(next)).status,200);assert.equal((await store.readDocument(a.id)).project.signs[0].quantity,3);assert.equal((await store.readDocument(next.id)).project.signs[0].quantity,9);
}));
test('standalone sign feedback refers to the frozen sign and never a sign excluded from the proof',()=>fixture(async({prepare,api,archive})=>{
 const proof=(await prepare()).data.proof;await archive(proof);await api('POST',`/api/project-proofs/${proof.id}/send`,{showPrices:true});
 const signs=(await api('GET',`/api/project-proofs/${proof.id}/signs`,null,'buyer')).data.signs;assert.equal(signs.length,3);assert.equal(signs.find(sign=>sign.markerId==='s').drawingId,'__standalone__');
 const body={version:'1.1',comment:'Byt texten',changeType:'adjust',sign:{drawingId:'__standalone__',markerId:'s'},requestId:'feedback'};
 const result=await api('POST',`/api/project-proofs/${proof.id}/comments`,body,'buyer');assert.equal(result.status,200);assert.equal(result.data.proof.status,'changes_requested');assert.equal(result.data.proof.comments[0].sign.position,'S003');
 assert.equal((await api('POST',`/api/project-proofs/${proof.id}/comments`,{...body,requestId:'wrong',sign:{drawingId:'d',markerId:'other'}},'buyer')).status,400);
}));
test('legacy versions remain readable and approvable; a new version joins their existing series',()=>fixture(async({store,project,api,prepare,archive})=>{
 const legacy={id:'old',projectId:'p',version:'1.1',status:'pending',current:true,recipientEmail:project.purchaserEmail};
 await store.writeState({proofs:[legacy],notifications:[]});await store.writeDocument('old',{project:clone(project),catalog:{articles:[]},drawings:[]});
 assert.equal((await api('POST','/api/project-proofs/old/approve',{version:'1.1',confirmed:true},'buyer')).status,200);
 const next=(await prepare({newProof:false,baseProofId:'old'})).data.proof;assert.equal(next.version,'1.2');assert.equal(next.seriesId,'legacy:p');await archive(next);assert.equal((await api('POST',`/api/project-proofs/${next.id}/send`,{showPrices:true})).status,200);
 assert.equal((await store.readDocument('old')).project.name,'Akuten');
}));
test('selection, file prerequisites, stale revisions, authorization and incomplete PDF are validated',()=>fixture(async({prepare,api,archive,store,project})=>{
 for(const keys of [[],['missing'],['s','s']])assert.equal((await prepare({selectedSignKeys:keys})).status,400);
 assert.equal((await prepare({expectedUpdatedAt:'old'})).status,409);
 assert.equal((await prepare({baseProofId:'missing',newProof:false})).status,400);
 assert.equal((await api('POST','/api/projects/p/proofs/prepare',{},'staff')).status,403);
 const draft=(await prepare()).data.proof;
 assert.equal((await api('POST',`/api/project-proofs/${draft.id}/pdf`,{pages:[page],artwork:[],showPrices:true})).status,400);
 assert.equal((await api('POST',`/api/project-proofs/${draft.id}/pdf`,{pages:[page],artwork:[],showPrices:true},'buyer')).status,403);
 assert.equal((await archive(draft)).status,200);
 project.updatedAt='r2';assert.equal((await api('POST',`/api/project-proofs/${draft.id}/send`,{showPrices:true})).status,409);
 assert.equal((await store.readState()).notifications.length,0);
}));
test('selection adapter is nondestructive and rejects ambiguous new/continued proof identity',()=>{
 const source={id:'p',drawings:[{id:'d',markers:[{id:'m'},{id:'n'}]}],signs:[{id:'s'}]},before=clone(source);
 const selected=selectProofSigns(source,['s']);assert.equal(selected.project.drawings.length,0);assert.equal(selected.project.signs.length,1);assert.deepEqual(source,before);
 assert.throws(()=>proofIdentity({proofs:[{id:'a',projectId:'p',version:'1'}]},source,{newProof:true,baseProofId:'a'}));
});
test('a PDF production original needs its own proof image and is frozen as the original PDF bytes',()=>fixture(async({prepare,store,project,production,files})=>{
 const {makeArticleProductionPdf}=require('./articleProduction'),asset=await production.read(project.signs[0].productionFile.id),bytes=await makeArticleProductionPdf(asset,1,'Production');
 project.signs[0].productionFile=await files.save({name:'print.pdf',dataUrl:'data:application/pdf;base64,'+bytes.toString('base64')},true);
 const proofFile=project.signs[0].proofFile;delete project.signs[0].proofFile;
 const missing=await prepare();assert.equal(missing.status,400);assert.match(missing.data.message,/korrekturbild/);
 project.signs[0].proofFile=proofFile;const proof=(await prepare()).data.proof,snapshot=await store.readDocument(proof.id);
 assert.equal(snapshot.assets[0].production.mime,'application/pdf');assert.deepEqual(Buffer.from(snapshot.assets[0].production.data,'base64'),bytes);
}));
test('snapshot bundle with originals and archived PDF survives reopening the Azure store',async()=>{
 const files=new Map(),blobFor=async name=>({exists:async()=>files.has(name),upload:async bytes=>files.set(name,Buffer.from(bytes)),download:async()=>({readableStreamBody:(async function*(){yield files.get(name);})()})});
 const first=createProofStore({blobFor}),bundle={project:{id:'p'},assets:[{signKey:'s',production:{data:'ORIGINAL'}}],artwork:[{signKey:'s',image:'IMAGE'}],archivedPdf:{meta:{sha256:'frozen'},data:'PDF'}};
 await first.writeDocument('test',bundle);await first.writeState({proofs:[{id:'test',status:'approved',pdf:{sha256:'frozen'}}],notifications:[]});
 const reopened=createProofStore({blobFor});assert.deepEqual(await reopened.readDocument('test'),bundle);assert.equal((await reopened.readState()).proofs[0].status,'approved');
});


test('default versions begin at 1.1 and continue through 1.2 and 1.10',()=>{
 const {proofIdentity,nextVersion}=require('./projectProofSnapshot');
 const project={id:'p'};
 const first=proofIdentity({proofs:[]},project,{newProof:true});assert.equal(first.version,'1.1');
 const second=proofIdentity({proofs:[{...first,id:'one',projectId:'p',status:'pending'}]},project,{baseProofId:'one'});assert.equal(second.version,'1.2');
 assert.equal(nextVersion('1.9'),'1.10');assert.equal(nextVersion('1'),'1.2');
});


test('production numbering reserves one order number for a project across independent proofs and versions',()=>fixture(async({prepare,api,numbers})=>{
 const invalid=await prepare({selectedSignKeys:[]});assert.equal(invalid.status,400);assert.deepEqual(await numbers.reservations(),{});
 const first=(await prepare()).data.proof;assert.equal(first.proofNumber,'0026120-00');assert.equal(first.orderNumber,first.proofNumber);
 const other=(await prepare()).data.proof;assert.equal(other.proofNumber,first.proofNumber);
 const next=(await prepare({newProof:false,baseProofId:first.id})).data.proof;assert.equal(next.version,'1.2');assert.equal(next.proofNumber,first.proofNumber);
 const saved=(await api('GET',`/api/project-proofs/${next.id}`)).data;assert.equal(saved.snapshot.project.reservedOrderNumber,first.proofNumber);
 assert.equal(await numbers.reserve('ordinary-order'),'0026121-00');assert.equal(await numbers.reserve('project:p'),first.proofNumber);
},{numbering:true}));
