const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),fs=require('fs/promises'),os=require('os'),path=require('path');
const {installProjectSigns,projectSigns}=require('./projectSigns');
const {markerFields}=require('./projectMarkerFields');
const {createArticleProductionStore,makeArticleProductionPdf}=require('./articleProduction');
const {buildProjectOrderItems}=require('./projectOrderGrouping');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="280mm" height="69mm" viewBox="0 0 280 69"><path d="M10 10L30 10L30 40Z" fill="#111111"/><rect x="1" y="1" width="278" height="67" fill="none" stroke="#ff00ff"/></svg>';
const original=source=>({name:'Corel-skylt.svg',dataUrl:'data:image/svg+xml;base64,'+Buffer.from(source||svg).toString('base64'),cutColor:'#ff00ff'});
const catalog={articles:[{id:'a',articleNumber:'0602',name:'Skylt',price:100,fields:{customText:true}}]};
async function fixture(run){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jsf-project-signs-')),dataFile=path.join(directory,'projects.json');
 const originalProject={id:'p',number:'PRJ-1',name:'Entren',orderId:'historical-order',drawings:[{id:'d',name:'Plan 1',fileName:'existing.pdf',markers:[{id:'m',articleId:'a',position:'S001',quantity:1,text:'Old',configuration:{customText:'Old'},x:.3,y:.7,page:2}]}]};
 await fs.writeFile(dataFile,JSON.stringify([originalProject]));
 const readProjects=async()=>JSON.parse(await fs.readFile(dataFile,'utf8')),writeProjects=async data=>fs.writeFile(dataFile,JSON.stringify(data));
 const app=express();app.use(express.json({limit:'8mb'}));
 const service=installProjectSigns(app,{directory,readProjects,writeProjects,readCatalog:async()=>catalog,markerFields,readAccess:async req=>['admin','personal','bestallare'].includes(req.headers.role),adminAccess:async req=>req.headers.role==='admin'});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 async function api(method,route,body,role='admin'){
  const response=await fetch(base+route,{method,headers:{role,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,headers:response.headers,data:response.headers.get('Content-Type')?.includes('image/svg')?await response.text():/image\/|application\/pdf/.test(response.headers.get('Content-Type'))?Buffer.from(await response.arrayBuffer()):await response.json()};
 }
 try{await run({api,service,readProjects,directory,originalProject,writeProjects});}finally{await new Promise(resolve=>server.close(resolve));assert.ok(path.resolve(directory).startsWith(path.join(os.tmpdir(),'jsf-project-signs-')));await fs.rm(directory,{recursive:true,force:true});}
}
test('catalog signs need no drawing; mixed list reads existing markers without copying or migrating',()=>fixture(async({api,readProjects,originalProject,writeProjects})=>{
 const added=await api('POST','/api/projects/p/signs',{articleId:'a',configuration:{customText:'Reception'},text:'Reception',quantity:4,kind:'catalog',id:'forged',productionFile:{id:'fake'}});
 assert.equal(added.status,201);assert.notEqual(added.data.sign.id,'forged');assert.equal(added.data.sign.productionFile,undefined);assert.equal(added.data.sign.position,'S002');assert.equal(added.data.sign.quantity,4);
 const project=(await readProjects())[0];assert.deepEqual(project.drawings,originalProject.drawings);assert.equal(project.orderId,'historical-order');assert.equal(project.signs.length,1);
 const list=(await api('GET','/api/projects/p/signs')).data.signs;assert.equal(list.length,2);assert.equal(list[0].key,'drawing:d:m');assert.equal(list[1].drawingId,null);
 const empty={id:'empty',name:'Without drawing',drawings:[]};assert.equal(projectSigns(empty).length,0);
 await writeProjects([project,empty]);assert.equal((await api('POST','/api/projects/empty/signs',{articleId:'a',quantity:2})).status,201);
 const saved=(await readProjects()).find(project=>project.id==='empty');assert.equal(saved.signs.length,1);assert.equal(saved.drawings.length,0);
}));
test('common edits update the actual drawing marker and preserve placement, configuration and history links',()=>fixture(async({api,readProjects})=>{
 const result=await api('PATCH','/api/projects/p/signs/drawing%3Ad%3Am',{name:'Special room',quantity:5,material:'Aluminium',price:225,description:'Egen beskrivning',x:.99,y:0,page:1,unplaced:true,kind:'svg',id:'wrong'});
 assert.equal(result.status,200);const project=(await readProjects())[0],marker=project.drawings[0].markers[0];
 assert.equal(marker.quantity,5);assert.equal(marker.id,'m');assert.equal(marker.x,.3);assert.equal(marker.y,.7);assert.equal(marker.page,2);assert.equal(marker.unplaced,undefined);assert.deepEqual(marker.configuration,{customText:'Old'});assert.equal(project.orderId,'historical-order');assert.ok(project.updatedAt);
 const row=buildProjectOrderItems([marker],catalog.articles)[0];assert.equal(row.unitPrice,225);assert.equal(row.badgeName,'Special room');assert.equal(row.material,'Aluminium');assert.equal(row.desc,'Egen beskrivning');assert.equal(row.lineTotal,1125);
 const removed=await api('DELETE','/api/projects/p/signs/drawing%3Ad%3Am');assert.equal(removed.status,200);assert.equal(removed.data.project.drawings[0].markers.length,0);assert.equal(removed.data.project.drawings[0].fileName,'existing.pdf');
}));
test('SVG import is persistent, safe and independent of catalog; downloads require authentication',()=>fixture(async({api,directory,readProjects})=>{
 const result=await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Egen dekal',description:'Corel',material:'Vinyl',quantity:3,price:125,original:original()});
 assert.equal(result.status,201);const sign=result.data.sign;assert.equal(sign.widthMm,280);assert.equal(sign.heightMm,69);assert.equal(sign.productionFile.cutCount,1);assert.equal(sign.articleId,undefined);
 const reloaded=await createArticleProductionStore({directory}).read(sign.productionFile.id);assert.match(reloaded.svg,/<path/);assert.equal(reloaded.widthMm,280);assert.equal((await readProjects())[0].signs[0].productionFile.id,sign.productionFile.id);assert.equal(catalog.articles.length,1);
 const route=`/api/projects/p/signs/${sign.id}/original`;
 assert.equal((await api('GET',route,null,'none')).status,403);
 const download=await api('GET',route,null,'bestallare');assert.equal(download.status,200);assert.match(download.data,/width="280mm"/);assert.match(download.headers.get('Content-Security-Policy'),/sandbox/);assert.match(download.headers.get('Content-Disposition'),/attachment/);
 assert.equal((await api('GET',route.replace('/p/','/other/'))).status,404);
}));
test('replacement creates a new immutable original, and removal retains original bytes',()=>fixture(async({api,service})=>{
 const first=(await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Skylt',original:original()})).data.sign;
 const oldId=first.productionFile.id;
 const result=await api('PATCH',`/api/projects/p/signs/${first.id}`,{widthMm:300,heightMm:100,original:original(svg.replace('#111111','#222222')),productionFile:{id:'forged'},kind:'catalog'});
 assert.equal(result.status,200);assert.equal(result.data.sign.kind,'svg');assert.equal(result.data.sign.id,first.id);assert.equal(result.data.sign.widthMm,300);assert.notEqual(result.data.sign.productionFile.id,oldId);
 assert.match((await service.store.read(oldId)).svg,/#111111/);
 assert.equal((await api('DELETE',`/api/projects/p/signs/${first.id}`)).status,200);assert.ok(await service.store.read(oldId));assert.ok(await service.store.read(result.data.sign.productionFile.id));
}));
test('invalid amounts, oversized configurations, unknown articles and unsafe SVG cannot change project data',()=>fixture(async({api,readProjects})=>{
 const before=await readProjects();
 for(const body of [{articleId:'missing'},{articleId:'a',quantity:0},{articleId:'a',quantity:1.5},{articleId:'a',price:-1},{articleId:'a',configuration:{customText:'x'.repeat(13000)}}])assert.equal((await api('POST','/api/projects/p/signs',body)).status,400);
 for(const source of [svg.replace('<path','<script>alert(1)</script><path'),svg.replace('<path','<image href="https://example.test/a.png"/><path'),svg.replace('<path','<text>Unsafe</text><path')])assert.equal((await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Bad',original:original(source)})).status,400);
 for(const body of [{name:''},{name:'Bad',widthMm:0},{name:'Bad',heightMm:5001},{name:'Bad',price:-1}])assert.equal((await api('POST','/api/projects/p/signs',{kind:'svg',original:original(),...body})).status,400);
 assert.deepEqual(await readProjects(),before);
}));
test('only admins write; missing project/sign returns 404; concurrent adds get distinct positions',()=>fixture(async({api})=>{
 for(const role of ['personal','bestallare','none']){
  assert.equal((await api('POST','/api/projects/p/signs',{articleId:'a'},role)).status,403);
  assert.equal((await api('PATCH','/api/projects/p/signs/drawing%3Ad%3Am',{quantity:2},role)).status,403);
  assert.equal((await api('DELETE','/api/projects/p/signs/drawing%3Ad%3Am',null,role)).status,403);
 }
 assert.equal((await api('GET','/api/projects/p/signs',null,'personal')).status,200);
 assert.equal((await api('GET','/api/projects/p/signs',null,'none')).status,403);
 assert.equal((await api('POST','/api/projects/missing/signs',{articleId:'a'})).status,404);
 assert.equal((await api('PATCH','/api/projects/p/signs/missing',{quantity:2})).status,404);
 const results=await Promise.all([1,2,3].map(()=>api('POST','/api/projects/p/signs',{articleId:'a'})));
 assert.deepEqual(results.map(result=>result.status),[201,201,201]);assert.equal(new Set(results.map(result=>result.data.sign.position)).size,3);
}));
test('project SVG original renders with the existing vector PDF engine and CutContour layer',()=>fixture(async({api,service})=>{
 const sign=(await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Print',quantity:2,original:original()})).data.sign;
 const asset=await service.store.read(sign.productionFile.id),pdf=await makeArticleProductionPdf(asset,2,'Project original');
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.match(pdf.toString('latin1'),/CutContour/);assert.match(pdf.toString('latin1'),/\/Count 2/);assert.match(pdf.toString('latin1'),/\/MediaBox \[0 0 793\.700/);
}));
test('SVG original can be reopened from persistent Azure blob storage',async()=>{
 const files=new Map(),blobFor=async name=>({uploadData:async data=>files.set(name,Buffer.from(data)),downloadToBuffer:async()=>files.get(name)});
 const first=createArticleProductionStore({blobFor}),file=await first.save(original());
 const restored=await createArticleProductionStore({blobFor}).read(file.id);assert.equal(restored.widthMm,280);assert.equal(restored.cutColor,'#ff00ff');assert.match(restored.svg,/<path/);assert.equal(files.size,2);
});
const png={name:'korrektur.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6FGkAAAAASUVORK5CYII='};
test('proof image and production original persist independently; preview uses image and download retains SVG',()=>fixture(async({api,service,directory})=>{
 const result=await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Two files',original:original(),proofOriginal:png});assert.equal(result.status,201);
 const sign=result.data.sign;assert.equal(sign.proofFile.mime,'image/png');assert.notEqual(sign.proofFile.id,sign.productionFile.id);
 const route=`/api/projects/p/signs/${sign.id}`;
 const preview=await api('GET',route+'/preview');assert.equal(preview.status,200);assert.equal(preview.headers.get('Content-Type'),'image/png');assert.equal(preview.data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const production=await api('GET',route+'/original');assert.match(production.data,/stroke="#ff00ff"/);
 const {createProjectSignFileStore}=require('./projectSignFiles');assert.equal((await createProjectSignFileStore({directory}).read(sign.proofFile.id)).name,'korrektur.png');
 assert.equal((await api('GET',route+'/preview',null,'none')).status,403);
 const changed=await api('PATCH',route,{proofOriginal:{name:'new.svg',dataUrl:original(svg.replace('#111111','#333333')).dataUrl}});assert.equal(changed.status,200);assert.equal(changed.data.sign.productionFile.id,sign.productionFile.id);assert.notEqual(changed.data.sign.proofFile.id,sign.proofFile.id);
 assert.ok(await service.fileStore.read(sign.proofFile.id));
 const updated=await api('PATCH',route,{original:original(svg.replace('#111111','#444444'))});assert.equal(updated.data.sign.proofFile.id,changed.data.sign.proofFile.id);
 const reset=await api('PATCH',route,{removeProofFile:true});assert.equal(reset.data.sign.proofFile,undefined);assert.match((await api('GET',route+'/preview')).data,/#444444/);
}));
test('legacy SVG sign keeps its preview when no separate image exists; forged or unsafe images cannot overwrite it',()=>fixture(async({api,readProjects})=>{
 const sign=(await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Legacy',original:original()})).data.sign;
 const route=`/api/projects/p/signs/${sign.id}`;assert.match((await api('GET',route+'/preview')).data,/<path/);
 const before=await readProjects();
 const bad={name:'bad.png',dataUrl:'data:image/png;base64,'+Buffer.from('<script>bad</script>').toString('base64')};
 assert.equal((await api('PATCH',route,{proofOriginal:bad})).status,400);assert.deepEqual(await readProjects(),before);
 assert.equal((await api('PATCH',route,{proofOriginal:{name:'evil.svg',dataUrl:original(svg.replace('<path','<script>bad</script><path')).dataUrl}})).status,400);
 const updated=await api('PATCH',route,{proofFile:{id:'forged'}});assert.equal(updated.data.sign.proofFile,undefined);
}));
test('production PDF is persisted unchanged and kept separate from supplied sign dimensions and proof image',()=>fixture(async({api,service})=>{
 const asset=await service.store.save(original()),parsed=await service.store.read(asset.id),bytes=await makeArticleProductionPdf(parsed,1,'Print');
 const input={name:'print.pdf',dataUrl:'data:application/pdf;base64,'+bytes.toString('base64')};
 const result=await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'PDF production',original:input,proofOriginal:png});assert.equal(result.status,201);
 const sign=result.data.sign;assert.equal(sign.productionFile.mime,'application/pdf');assert.equal(sign.widthMm,280);assert.equal(sign.heightMm,69);
 const route=`/api/projects/p/signs/${sign.id}`;
 const production=await api('GET',route+'/original');assert.equal(production.headers.get('Content-Type'),'application/pdf');assert.deepEqual(production.data,bytes);
 assert.equal((await api('GET',route+'/preview')).headers.get('Content-Type'),'image/png');
 const pdfOnly=await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'PDF only',original:input});assert.equal(pdfOnly.status,201);assert.equal((await api('GET',`/api/projects/p/signs/${pdfOnly.data.sign.id}/preview`)).status,404);
 const multiple=await makeArticleProductionPdf(parsed,2,'Two pages');assert.equal((await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Bad',original:{...input,dataUrl:'data:application/pdf;base64,'+multiple.toString('base64')}})).status,400);
 assert.equal((await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Bad',original:{...input,dataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-broken').toString('base64')}})).status,400);
}));
test('proof image store also persists its bytes in Azure',async()=>{
 const {createProjectSignFileStore}=require('./projectSignFiles');const files=new Map(),blobFor=async name=>({uploadData:async data=>files.set(name,Buffer.from(data)),downloadToBuffer:async()=>files.get(name)});
 const meta=await createProjectSignFileStore({blobFor}).save(png),asset=await createProjectSignFileStore({blobFor}).read(meta.id);assert.equal(asset.mime,'image/png');assert.equal(asset.bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
});
test('sign dimensions come from proof SVG, never the production bleed, and a new proof resets the measurement',()=>fixture(async({api,service})=>{
 const print=original(svg.replace('280mm','285mm').replace('69mm','74mm'));
 const result=await api('POST','/api/projects/p/signs',{kind:'svg',name:'Finished size',original:print,proofOriginal:original()});assert.equal(result.status,201);
 const sign=result.data.sign;assert.equal(sign.widthMm,280);assert.equal(sign.heightMm,69);assert.equal(sign.productionFile.widthMm,285);assert.equal(sign.productionFile.heightMm,74);assert.equal(sign.proofFile.widthMm,280);
 const restored=await service.fileStore.read(sign.proofFile.id);assert.match(restored.bytes.toString(),/width="280mm"/);
 const next=await api('PATCH',`/api/projects/p/signs/${sign.id}`,{proofOriginal:original(svg.replace('280mm','400mm').replace('69mm','400mm'))});assert.equal(next.status,200);assert.equal(next.data.sign.widthMm,400);assert.equal(next.data.sign.heightMm,400);
 const newPrint=await api('PATCH',`/api/projects/p/signs/${sign.id}`,{original:print});assert.equal(newPrint.data.sign.widthMm,400);assert.equal(newPrint.data.sign.heightMm,400);
}));
test('a proof image without physical dimensions needs manual measurements; production size is not substituted',()=>fixture(async({api})=>{
 const missing=await api('POST','/api/projects/p/signs',{kind:'svg',name:'No physical size',original:original(),proofOriginal:png});assert.equal(missing.status,400);assert.match(missing.data.message,/bredd och höjd/);
 assert.equal((await api('POST','/api/projects/p/signs',{kind:'svg',name:'No proof',original:original()})).status,400);
 const manual=await api('POST','/api/projects/p/signs',{kind:'svg',name:'Manual',original:original(),proofOriginal:png,widthMm:400,heightMm:300});assert.equal(manual.status,201);assert.equal(manual.data.sign.widthMm,400);assert.equal(manual.data.sign.heightMm,300);
}));

test('duplicate standalone catalog sign retains dimensions/content and creates an independent identity without changing its source',()=>fixture(async({api,readProjects,writeProjects,originalProject})=>{
 const source={id:'standalone',position:'S010',kind:'catalog',articleId:'a',quantity:3,name:'Dekal',widthMm:300,heightMm:190,price:345,material:'Vinyl',notes:'Dörr 12',text:'Skyddskläder',configuration:{customText:'Skyddskläder',dibondSign:{widthMm:300,heightMm:190,lines:[{text:'Skyddskläder',sizeMm:20}],symbols:[{id:'logo',x:20}]}},createdAt:'2020-01-01',checkedAt:'2020-01-02',unplaced:true,x:null,y:null,page:null};
 await writeProjects([{...originalProject,signs:[source]}]);
 const result=await api('POST','/api/projects/p/signs/standalone/duplicate',{id:'forged',articleId:'missing',configuration:{customText:'Wrong'}});
 assert.equal(result.status,201);const copy=result.data.sign;assert.notEqual(copy.id,source.id);assert.notEqual(copy.id,'forged');assert.equal(copy.position,'S011');assert.deepEqual(copy.configuration,source.configuration);assert.equal(copy.widthMm,300);assert.equal(copy.heightMm,190);assert.equal(copy.quantity,3);assert.equal(copy.price,345);assert.equal(copy.notes,'Dörr 12');assert.equal(copy.checkedAt,undefined);assert.equal(copy.unplaced,true);assert.equal(copy.x,null);assert.equal(copy.page,null);
 const project=(await readProjects())[0];assert.deepEqual(project.signs[0],source);assert.deepEqual(project.drawings,originalProject.drawings);assert.equal(project.orderId,'historical-order');
 assert.equal((await api('PATCH',`/api/projects/p/signs/${copy.id}`,{configuration:{customText:'Ändrad kopia'},notes:'Dörr 13'})).status,200);
 assert.deepEqual((await readProjects())[0].signs[0],source);
}));
test('duplicate imported original reuses immutable proof/production assets and survives deletion of its source',()=>fixture(async({api,service})=>{
 const source=(await api('POST','/api/projects/p/signs',{widthMm:280,heightMm:69,kind:'svg',name:'Eget original',quantity:2,price:125,original:original(),proofOriginal:png})).data.sign;
 const result=await api('POST',`/api/projects/p/signs/${source.id}/duplicate`);assert.equal(result.status,201);const copy=result.data.sign;
 assert.deepEqual(copy.productionFile,source.productionFile);assert.deepEqual(copy.proofFile,source.proofFile);assert.equal(copy.widthMm,280);assert.equal(copy.quantity,2);
 await api('DELETE',`/api/projects/p/signs/${source.id}`);assert.equal((await api('GET',`/api/projects/p/signs/${copy.id}/original`)).status,200);assert.equal((await api('GET',`/api/projects/p/signs/${copy.id}/preview`)).status,200);
 assert.ok(await service.store.read(copy.productionFile.id));
}));
test('duplicating requires admin, a standalone source in the requested project, and serializes numbering',()=>fixture(async({api,readProjects})=>{
 const source=(await api('POST','/api/projects/p/signs',{articleId:'a',configuration:{customText:'Reception'}})).data.sign;
 const route=`/api/projects/p/signs/${source.id}/duplicate`;
 for(const role of ['personal','bestallare','none'])assert.equal((await api('POST',route,null,role)).status,403);
 assert.equal((await api('POST','/api/projects/other/signs/'+source.id+'/duplicate')).status,404);
 assert.equal((await api('POST','/api/projects/p/signs/missing/duplicate')).status,404);
 assert.equal((await api('POST','/api/projects/p/signs/drawing%3Ad%3Am/duplicate')).status,400);
 const copies=await Promise.all([1,2,3].map(()=>api('POST',route)));assert.ok(copies.every(copy=>copy.status===201));assert.equal(new Set(copies.map(copy=>copy.data.sign.position)).size,3);assert.equal((await readProjects())[0].signs.length,4);
}));

test('Corel original can be imported directly at a drawing location and retains files in proof/order',()=>fixture(async({api,readProjects,directory})=>{const result=await api('POST','/api/projects/p/signs',{kind:'svg',name:'Corel på ritning',widthMm:280,heightMm:69,quantity:2,price:125,original:original(),proofOriginal:png,placement:{drawingId:'d',page:2,x:.4,y:.6}});assert.equal(result.status,201);const sign=result.data.sign;assert.equal(sign.unplaced,false);const project=(await readProjects())[0];assert.equal((project.signs||[]).length,0);const saved=project.drawings[0].markers.find(m=>m.id===sign.id);assert.equal(saved.kind,'svg');assert.equal(saved.x,.4);const key='drawing:d:'+sign.id;assert.equal(projectSigns(project).find(s=>s.id===sign.id).kind,'svg');assert.equal((await api('GET','/api/projects/p/signs/'+encodeURIComponent(key)+'/preview')).status,200);const {freezeCustomSigns}=require('./projectProofSnapshot');const assets=await freezeCustomSigns(project,{directory});assert.equal(assets[0].signKey,key);assert.match(saved.proofImage,/^data:image/);const {buildProjectOrderCart}=require('./projectOrderItems');const cart=buildProjectOrderCart(project,catalog);const row=cart.find(r=>r.projectOriginal);assert.ok(row);assert.equal(row.productionFile.id,sign.productionFile.id);assert.equal(row.proofFile.id,sign.proofFile.id);assert.ok(row.drawingName);const edited=await api('PATCH','/api/projects/p/signs/'+encodeURIComponent(key),{name:'Ändrad'});assert.equal(edited.data.sign.x,.4);assert.equal(edited.data.sign.productionFile.id,sign.productionFile.id);}));
 test('Existing Corel sign moves from list to drawing once, validates placement and duplicates immutable files',()=>fixture(async({api,readProjects})=>{const sign=(await api('POST','/api/projects/p/signs',{kind:'svg',name:'Flytta',widthMm:280,heightMm:69,original:original()})).data.sign;const route='/api/projects/p/signs/'+sign.id+'/place';assert.equal((await api('POST',route,{drawingId:'missing',page:1,x:.2,y:.3})).status,404);assert.equal((await api('POST',route,{drawingId:'d',page:1,x:2,y:.3})).status,400);assert.equal((await api('POST',route,{drawingId:'d',page:1,x:.2,y:.3},'bestallare')).status,403);const moved=await api('POST',route,{drawingId:'d',page:1,x:.2,y:.3});assert.equal(moved.status,200);assert.equal(moved.data.project.signs.length,0);assert.equal(moved.data.project.drawings[0].markers.filter(m=>m.id===sign.id).length,1);assert.equal((await api('POST',route,{drawingId:'d',page:1,x:.2,y:.3})).status,404);const copy=await api('POST','/api/projects/p/signs/'+encodeURIComponent('drawing:d:'+sign.id)+'/duplicate',{placement:{drawingId:'d',page:2,x:.8,y:.9}});assert.equal(copy.status,201);assert.notEqual(copy.data.sign.id,sign.id);assert.equal(copy.data.sign.productionFile.id,sign.productionFile.id);assert.equal(copy.data.sign.unplaced,false);assert.equal(copy.data.sign.x,.8);assert.equal((await readProjects())[0].drawings[0].markers.length,3);}));
